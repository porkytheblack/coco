use crate::db::DbPool;
use crate::error::{CocoError, Result};
use crate::types::{Run, RunStatus, RunType};
use chrono::{DateTime, Utc};
use std::collections::HashMap;
use std::path::PathBuf;
use std::process::Stdio;
use std::sync::Arc;
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::{Child, Command};
use tokio::sync::{mpsc, RwLock};
use uuid::Uuid;

pub struct RunService {
    db: DbPool,
    // Keep in-memory cache for active runs and their logs
    active_runs: Arc<RwLock<HashMap<String, Run>>>,
    run_logs: Arc<RwLock<HashMap<String, Vec<String>>>>,
    active_processes: Arc<RwLock<HashMap<String, Child>>>,
}

impl RunService {
    pub fn new(db: DbPool) -> Self {
        Self {
            db,
            active_runs: Arc::new(RwLock::new(HashMap::new())),
            run_logs: Arc::new(RwLock::new(HashMap::new())),
            active_processes: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    pub async fn get_run_logs(&self, run_id: &str) -> Result<Vec<String>> {
        // First check in-memory cache
        {
            let logs = self.run_logs.read().await;
            if let Some(cached_logs) = logs.get(run_id) {
                return Ok(cached_logs.clone());
            }
        }

        // Otherwise fetch from database
        let rows: Vec<(String,)> = sqlx::query_as(
            "SELECT line FROM run_logs WHERE run_id = ? ORDER BY log_order"
        )
        .bind(run_id)
        .fetch_all(&self.db)
        .await
        .map_err(|e| CocoError::Database(e.to_string()))?;

        Ok(rows.into_iter().map(|(line,)| line).collect())
    }

    pub async fn list_runs(&self, workspace_id: &str, run_type: Option<RunType>) -> Result<Vec<Run>> {
        let query = match run_type {
            Some(rt) => {
                let rt_str = run_type_to_string(&rt);
                sqlx::query_as::<_, RunRow>(
                    "SELECT id, workspace_id, run_type, status, exit_code, error_message, started_at, ended_at FROM runs WHERE workspace_id = ? AND run_type = ? ORDER BY started_at DESC"
                )
                .bind(workspace_id)
                .bind(rt_str)
                .fetch_all(&self.db)
                .await
            }
            None => {
                sqlx::query_as::<_, RunRow>(
                    "SELECT id, workspace_id, run_type, status, exit_code, error_message, started_at, ended_at FROM runs WHERE workspace_id = ? ORDER BY started_at DESC"
                )
                .bind(workspace_id)
                .fetch_all(&self.db)
                .await
            }
        };

        let rows = query.map_err(|e| CocoError::Database(e.to_string()))?;
        Ok(rows.into_iter().map(Run::from).collect())
    }

    pub async fn get_run(&self, run_id: &str) -> Result<Run> {
        // Check active runs first
        {
            let active = self.active_runs.read().await;
            if let Some(run) = active.get(run_id) {
                return Ok(run.clone());
            }
        }

        // Otherwise fetch from database
        let row = sqlx::query_as::<_, RunRow>(
            "SELECT id, workspace_id, run_type, status, exit_code, error_message, started_at, ended_at FROM runs WHERE id = ?"
        )
        .bind(run_id)
        .fetch_optional(&self.db)
        .await
        .map_err(|e| CocoError::Database(e.to_string()))?;

        row.map(Run::from)
            .ok_or_else(|| CocoError::NotFound(format!("Run not found: {}", run_id)))
    }

    pub async fn start_build(
        &self,
        workspace_id: &str,
        workspace_path: &str,
        output_tx: mpsc::Sender<String>,
    ) -> Result<Run> {
        let run = self.create_run(workspace_id, RunType::Build).await?;

        let path = PathBuf::from(workspace_path);
        let command = self.get_build_command(&path)?;

        self.execute_command(run.id.clone(), workspace_id, workspace_path, command, output_tx)
            .await?;

        Ok(run)
    }

    pub async fn start_test(
        &self,
        workspace_id: &str,
        workspace_path: &str,
        output_tx: mpsc::Sender<String>,
    ) -> Result<Run> {
        let run = self.create_run(workspace_id, RunType::Test).await?;

        let path = PathBuf::from(workspace_path);
        let command = self.get_test_command(&path)?;

        self.execute_command(run.id.clone(), workspace_id, workspace_path, command, output_tx)
            .await?;

        Ok(run)
    }

    pub async fn start_deploy(
        &self,
        workspace_id: &str,
        workspace_path: &str,
        script_path: &str,
        output_tx: mpsc::Sender<String>,
    ) -> Result<Run> {
        let run = self.create_run(workspace_id, RunType::Deploy).await?;

        let path = PathBuf::from(workspace_path);
        let command = self.get_deploy_command(&path, script_path)?;

        self.execute_command(run.id.clone(), workspace_id, workspace_path, command, output_tx)
            .await?;

        Ok(run)
    }

    pub async fn cancel_run(&self, run_id: &str) -> Result<()> {
        let mut processes = self.active_processes.write().await;

        if let Some(mut child) = processes.remove(run_id) {
            child.kill().await.map_err(|e| {
                CocoError::Process(format!("Failed to kill process: {}", e))
            })?;
        }

        // Update run status in database
        sqlx::query("UPDATE runs SET status = ?, ended_at = ? WHERE id = ?")
            .bind("cancelled")
            .bind(Utc::now().to_rfc3339())
            .bind(run_id)
            .execute(&self.db)
            .await
            .map_err(|e| CocoError::Database(e.to_string()))?;

        // Also update in-memory cache
        let mut active = self.active_runs.write().await;
        if let Some(run) = active.get_mut(run_id) {
            run.status = RunStatus::Cancelled;
            run.ended_at = Some(Utc::now());
        }

        Ok(())
    }

    async fn create_run(&self, workspace_id: &str, run_type: RunType) -> Result<Run> {
        let run = Run {
            id: Uuid::new_v4().to_string(),
            workspace_id: workspace_id.to_string(),
            run_type,
            status: RunStatus::Running,
            started_at: Utc::now(),
            ended_at: None,
            exit_code: None,
            error_message: None,
        };

        // Insert into database
        sqlx::query(
            "INSERT INTO runs (id, workspace_id, run_type, status, started_at) VALUES (?, ?, ?, ?, ?)"
        )
        .bind(&run.id)
        .bind(&run.workspace_id)
        .bind(run_type_to_string(&run.run_type))
        .bind("running")
        .bind(run.started_at.to_rfc3339())
        .execute(&self.db)
        .await
        .map_err(|e| CocoError::Database(e.to_string()))?;

        // Also store in memory for quick access
        let mut active = self.active_runs.write().await;
        active.insert(run.id.clone(), run.clone());

        Ok(run)
    }

    async fn execute_command(
        &self,
        run_id: String,
        workspace_id: &str,
        workspace_path: &str,
        command: Vec<String>,
        output_tx: mpsc::Sender<String>,
    ) -> Result<()> {
        if command.is_empty() {
            return Err(CocoError::Process("Empty command".to_string()));
        }

        let mut cmd = Command::new(&command[0]);
        cmd.args(&command[1..])
            .current_dir(workspace_path)
            .stdout(Stdio::piped())
            .stderr(Stdio::piped());

        let mut child = cmd.spawn().map_err(|e| {
            CocoError::Process(format!("Failed to spawn process: {}", e))
        })?;

        let stdout = child.stdout.take();
        let stderr = child.stderr.take();

        // Store the child process
        {
            let mut processes = self.active_processes.write().await;
            processes.insert(run_id.clone(), child);
        }

        // Initialize log storage for this run
        {
            let mut logs = self.run_logs.write().await;
            logs.insert(run_id.clone(), Vec::new());
        }

        // Clone references for the spawned tasks
        let run_logs_stdout = self.run_logs.clone();
        let run_logs_stderr = self.run_logs.clone();
        let run_id_stdout = run_id.clone();
        let run_id_stderr = run_id.clone();

        // Spawn task to read stdout
        if let Some(stdout) = stdout {
            let tx = output_tx.clone();
            tokio::spawn(async move {
                let reader = BufReader::new(stdout);
                let mut lines = reader.lines();
                while let Ok(Some(line)) = lines.next_line().await {
                    // Store the log
                    {
                        let mut logs = run_logs_stdout.write().await;
                        if let Some(log_vec) = logs.get_mut(&run_id_stdout) {
                            log_vec.push(line.clone());
                        }
                    }
                    let _ = tx.send(line).await;
                }
            });
        }

        // Spawn task to read stderr
        if let Some(stderr) = stderr {
            let tx = output_tx.clone();
            tokio::spawn(async move {
                let reader = BufReader::new(stderr);
                let mut lines = reader.lines();
                while let Ok(Some(line)) = lines.next_line().await {
                    let formatted = format!("[stderr] {}", line);
                    // Store the log
                    {
                        let mut logs = run_logs_stderr.write().await;
                        if let Some(log_vec) = logs.get_mut(&run_id_stderr) {
                            log_vec.push(formatted.clone());
                        }
                    }
                    let _ = tx.send(formatted).await;
                }
            });
        }

        // Spawn task to wait for completion and persist results
        let db = self.db.clone();
        let active_runs = self.active_runs.clone();
        let run_logs_final = self.run_logs.clone();
        let processes = self.active_processes.clone();
        let run_id_clone = run_id.clone();
        let _workspace_id = workspace_id.to_string();

        tokio::spawn(async move {
            let exit_status = {
                let mut procs = processes.write().await;
                if let Some(mut child) = procs.remove(&run_id_clone) {
                    child.wait().await.ok()
                } else {
                    None
                }
            };

            let ended_at = Utc::now();
            let (status, exit_code) = if let Some(es) = exit_status {
                let code = es.code();
                let status = if es.success() {
                    RunStatus::Success
                } else {
                    RunStatus::Failed
                };
                (status, code)
            } else {
                (RunStatus::Failed, None)
            };

            // Update database
            let _ = sqlx::query("UPDATE runs SET status = ?, exit_code = ?, ended_at = ? WHERE id = ?")
                .bind(run_status_to_string(&status))
                .bind(exit_code)
                .bind(ended_at.to_rfc3339())
                .bind(&run_id_clone)
                .execute(&db)
                .await;

            // Persist logs to database
            {
                let logs = run_logs_final.read().await;
                if let Some(log_lines) = logs.get(&run_id_clone) {
                    for (i, line) in log_lines.iter().enumerate() {
                        let _ = sqlx::query(
                            "INSERT INTO run_logs (run_id, line, log_order) VALUES (?, ?, ?)"
                        )
                        .bind(&run_id_clone)
                        .bind(line)
                        .bind(i as i32)
                        .execute(&db)
                        .await;
                    }
                }
            }

            // Update in-memory state
            let mut active = active_runs.write().await;
            if let Some(run) = active.get_mut(&run_id_clone) {
                run.status = status;
                run.exit_code = exit_code;
                run.ended_at = Some(ended_at);
            }

            // Clean up in-memory logs after some time (keep for 5 minutes)
            let run_logs_cleanup = run_logs_final.clone();
            let run_id_cleanup = run_id_clone.clone();
            tokio::spawn(async move {
                tokio::time::sleep(std::time::Duration::from_secs(300)).await;
                let mut logs = run_logs_cleanup.write().await;
                logs.remove(&run_id_cleanup);
            });
        });

        Ok(())
    }

    fn get_build_command(&self, path: &PathBuf) -> Result<Vec<String>> {
        // Detect framework and return appropriate command
        if path.join("foundry.toml").exists() {
            Ok(vec!["forge".to_string(), "build".to_string()])
        } else if path.join("Anchor.toml").exists() {
            Ok(vec!["anchor".to_string(), "build".to_string()])
        } else if path.join("Move.toml").exists() {
            Ok(vec!["aptos".to_string(), "move".to_string(), "compile".to_string()])
        } else if path.join("hardhat.config.js").exists() || path.join("hardhat.config.ts").exists() {
            Ok(vec!["npx".to_string(), "hardhat".to_string(), "compile".to_string()])
        } else {
            Err(CocoError::Validation("Unknown project framework".to_string()))
        }
    }

    fn get_test_command(&self, path: &PathBuf) -> Result<Vec<String>> {
        if path.join("foundry.toml").exists() {
            Ok(vec!["forge".to_string(), "test".to_string(), "-vvv".to_string()])
        } else if path.join("Anchor.toml").exists() {
            Ok(vec!["anchor".to_string(), "test".to_string()])
        } else if path.join("Move.toml").exists() {
            Ok(vec!["aptos".to_string(), "move".to_string(), "test".to_string()])
        } else if path.join("hardhat.config.js").exists() || path.join("hardhat.config.ts").exists() {
            Ok(vec!["npx".to_string(), "hardhat".to_string(), "test".to_string()])
        } else {
            Err(CocoError::Validation("Unknown project framework".to_string()))
        }
    }

    fn get_deploy_command(&self, path: &PathBuf, script_path: &str) -> Result<Vec<String>> {
        if path.join("foundry.toml").exists() {
            Ok(vec![
                "forge".to_string(),
                "script".to_string(),
                script_path.to_string(),
                "--broadcast".to_string(),
            ])
        } else if path.join("Anchor.toml").exists() {
            Ok(vec!["anchor".to_string(), "deploy".to_string()])
        } else if path.join("Move.toml").exists() {
            Ok(vec![
                "aptos".to_string(),
                "move".to_string(),
                "publish".to_string(),
            ])
        } else if path.join("hardhat.config.js").exists() || path.join("hardhat.config.ts").exists() {
            Ok(vec![
                "npx".to_string(),
                "hardhat".to_string(),
                "run".to_string(),
                script_path.to_string(),
            ])
        } else {
            Err(CocoError::Validation("Unknown project framework".to_string()))
        }
    }
}

impl Default for RunService {
    fn default() -> Self {
        panic!("RunService requires a database pool")
    }
}

// Helper struct for SQLx
#[derive(sqlx::FromRow)]
struct RunRow {
    id: String,
    workspace_id: String,
    run_type: String,
    status: String,
    exit_code: Option<i32>,
    error_message: Option<String>,
    started_at: String,
    ended_at: Option<String>,
}

impl From<RunRow> for Run {
    fn from(row: RunRow) -> Self {
        Run {
            id: row.id,
            workspace_id: row.workspace_id,
            run_type: string_to_run_type(&row.run_type),
            status: string_to_run_status(&row.status),
            exit_code: row.exit_code,
            error_message: row.error_message,
            started_at: row
                .started_at
                .parse::<DateTime<Utc>>()
                .unwrap_or_else(|_| Utc::now()),
            ended_at: row.ended_at.and_then(|s| s.parse().ok()),
        }
    }
}

fn run_type_to_string(rt: &RunType) -> &'static str {
    match rt {
        RunType::Build => "build",
        RunType::Test => "test",
        RunType::Deploy => "deploy",
    }
}

fn string_to_run_type(s: &str) -> RunType {
    match s {
        "test" => RunType::Test,
        "deploy" => RunType::Deploy,
        _ => RunType::Build,
    }
}

fn run_status_to_string(status: &RunStatus) -> &'static str {
    match status {
        RunStatus::Running => "running",
        RunStatus::Success => "success",
        RunStatus::Failed => "failed",
        RunStatus::Cancelled => "cancelled",
    }
}

fn string_to_run_status(s: &str) -> RunStatus {
    match s {
        "success" => RunStatus::Success,
        "failed" => RunStatus::Failed,
        "cancelled" => RunStatus::Cancelled,
        _ => RunStatus::Running,
    }
}
