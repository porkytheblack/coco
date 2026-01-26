use crate::db::DbPool;
use crate::error::{CocoError, Result};
use crate::types::{
    CreateScriptFlagInput, CreateScriptInput, RunScriptInput, Script, ScriptFlag, ScriptFlagType,
    ScriptRun, ScriptRunStatus, ScriptRunner,
};
use chrono::{DateTime, Utc};
use std::collections::HashMap;
use std::process::Stdio;
use std::sync::Arc;
use tokio::io::AsyncReadExt;
use tokio::process::Command;
use tokio::sync::RwLock;
use uuid::Uuid;

pub struct ScriptService {
    db: DbPool,
    /// Cancellation tokens for active script runs - when removed, signals cancellation
    active_runs: Arc<RwLock<HashMap<String, tokio::sync::oneshot::Sender<()>>>>,
}

impl ScriptService {
    pub fn new(db: DbPool) -> Self {
        Self {
            db,
            active_runs: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    // ========================================================================
    // Script CRUD
    // ========================================================================

    /// List all scripts for a workspace
    pub async fn list_scripts(&self, workspace_id: &str) -> Result<Vec<Script>> {
        let rows = sqlx::query_as::<_, ScriptRow>(
            "SELECT id, workspace_id, name, description, runner, file_path, command, working_directory, category, created_at, updated_at FROM scripts WHERE workspace_id = ? ORDER BY name",
        )
        .bind(workspace_id)
        .fetch_all(&self.db)
        .await
        .map_err(|e| CocoError::Database(e.to_string()))?;

        let mut scripts: Vec<Script> = rows.into_iter().map(Script::from).collect();

        // Fetch flags for each script
        for script in &mut scripts {
            script.flags = self.list_flags(&script.id).await?;
        }

        Ok(scripts)
    }

    /// Get a single script by ID
    pub async fn get_script(&self, id: &str) -> Result<Script> {
        let row = sqlx::query_as::<_, ScriptRow>(
            "SELECT id, workspace_id, name, description, runner, file_path, command, working_directory, category, created_at, updated_at FROM scripts WHERE id = ?",
        )
        .bind(id)
        .fetch_optional(&self.db)
        .await
        .map_err(|e| CocoError::Database(e.to_string()))?;

        let mut script = row
            .map(Script::from)
            .ok_or_else(|| CocoError::NotFound(format!("Script not found: {}", id)))?;

        script.flags = self.list_flags(&script.id).await?;
        Ok(script)
    }

    /// Create a new script
    pub async fn create_script(&self, workspace_id: &str, input: CreateScriptInput) -> Result<Script> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now();

        let runner = input.runner.as_deref().map(ScriptRunner::from).unwrap_or_default();

        // Only validate file path for runners that require a specific file
        // Build/test/compile runners don't need a file path
        let requires_file = matches!(
            runner,
            ScriptRunner::Bash | ScriptRunner::Node | ScriptRunner::Bun |
            ScriptRunner::Python | ScriptRunner::Forge | ScriptRunner::Npx |
            ScriptRunner::Hardhat | ScriptRunner::Anchor
        );

        if requires_file && !input.file_path.is_empty() && input.file_path != "." {
            if !std::path::Path::new(&input.file_path).exists() {
                return Err(CocoError::Validation(format!(
                    "Script file not found: {}",
                    input.file_path
                )));
            }
        }

        sqlx::query(
            "INSERT INTO scripts (id, workspace_id, name, description, runner, file_path, command, working_directory, category, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        )
        .bind(&id)
        .bind(workspace_id)
        .bind(&input.name)
        .bind(&input.description)
        .bind(runner.to_string())
        .bind(&input.file_path)
        .bind(&input.command)
        .bind(&input.working_directory)
        .bind(&input.category)
        .bind(now.to_rfc3339())
        .bind(now.to_rfc3339())
        .execute(&self.db)
        .await
        .map_err(|e| CocoError::Database(e.to_string()))?;

        // Create flags
        let mut flags = Vec::new();
        for flag_input in input.flags {
            let flag = self.create_flag(&id, flag_input).await?;
            flags.push(flag);
        }

        Ok(Script {
            id,
            workspace_id: workspace_id.to_string(),
            name: input.name,
            description: input.description,
            runner,
            file_path: input.file_path,
            command: input.command,
            working_directory: input.working_directory,
            category: input.category,
            created_at: now,
            updated_at: now,
            flags,
        })
    }

    /// Update a script
    pub async fn update_script(
        &self,
        id: &str,
        name: Option<&str>,
        description: Option<&str>,
        runner: Option<&str>,
        file_path: Option<&str>,
        command: Option<&str>,
        working_directory: Option<&str>,
        category: Option<&str>,
    ) -> Result<Script> {
        // Validate file path if provided and not empty/placeholder
        if let Some(path) = file_path {
            if !path.is_empty() && path != "." && !std::path::Path::new(path).exists() {
                return Err(CocoError::Validation(format!(
                    "Script file not found: {}",
                    path
                )));
            }
        }

        let mut updates = Vec::new();
        if name.is_some() {
            updates.push("name = ?");
        }
        if description.is_some() {
            updates.push("description = ?");
        }
        if runner.is_some() {
            updates.push("runner = ?");
        }
        if file_path.is_some() {
            updates.push("file_path = ?");
        }
        if command.is_some() {
            updates.push("command = ?");
        }
        if working_directory.is_some() {
            updates.push("working_directory = ?");
        }
        if category.is_some() {
            updates.push("category = ?");
        }

        // Always update updated_at
        updates.push("updated_at = ?");

        if updates.len() == 1 {
            // Only updated_at, nothing else changed
            return self.get_script(id).await;
        }

        let query = format!("UPDATE scripts SET {} WHERE id = ?", updates.join(", "));
        let mut q = sqlx::query(&query);

        if let Some(n) = name {
            q = q.bind(n);
        }
        if let Some(d) = description {
            q = q.bind(d);
        }
        if let Some(r) = runner {
            q = q.bind(r);
        }
        if let Some(f) = file_path {
            q = q.bind(f);
        }
        if let Some(cmd) = command {
            q = q.bind(cmd);
        }
        if let Some(wd) = working_directory {
            q = q.bind(wd);
        }
        if let Some(c) = category {
            q = q.bind(c);
        }

        q = q.bind(Utc::now().to_rfc3339()); // updated_at

        q.bind(id)
            .execute(&self.db)
            .await
            .map_err(|e| CocoError::Database(e.to_string()))?;

        self.get_script(id).await
    }

    /// Delete a script
    pub async fn delete_script(&self, id: &str) -> Result<()> {
        let result = sqlx::query("DELETE FROM scripts WHERE id = ?")
            .bind(id)
            .execute(&self.db)
            .await
            .map_err(|e| CocoError::Database(e.to_string()))?;

        if result.rows_affected() == 0 {
            return Err(CocoError::NotFound(format!("Script not found: {}", id)));
        }

        Ok(())
    }

    // ========================================================================
    // Flag CRUD
    // ========================================================================

    /// List flags for a script
    pub async fn list_flags(&self, script_id: &str) -> Result<Vec<ScriptFlag>> {
        let rows = sqlx::query_as::<_, ScriptFlagRow>(
            "SELECT id, script_id, flag_name, flag_type, default_value, required, description FROM script_flags WHERE script_id = ? ORDER BY flag_name",
        )
        .bind(script_id)
        .fetch_all(&self.db)
        .await
        .map_err(|e| CocoError::Database(e.to_string()))?;

        Ok(rows.into_iter().map(ScriptFlag::from).collect())
    }

    /// Create a flag
    pub async fn create_flag(&self, script_id: &str, input: CreateScriptFlagInput) -> Result<ScriptFlag> {
        let id = Uuid::new_v4().to_string();

        sqlx::query(
            "INSERT INTO script_flags (id, script_id, flag_name, flag_type, default_value, required, description) VALUES (?, ?, ?, ?, ?, ?, ?)",
        )
        .bind(&id)
        .bind(script_id)
        .bind(&input.flag_name)
        .bind(&input.flag_type)
        .bind(&input.default_value)
        .bind(input.required)
        .bind(&input.description)
        .execute(&self.db)
        .await
        .map_err(|e| CocoError::Database(e.to_string()))?;

        Ok(ScriptFlag {
            id,
            script_id: script_id.to_string(),
            flag_name: input.flag_name,
            flag_type: ScriptFlagType::from(input.flag_type.as_str()),
            default_value: input.default_value,
            required: input.required,
            description: input.description,
        })
    }

    /// Update a flag
    pub async fn update_flag(
        &self,
        id: &str,
        flag_name: Option<&str>,
        flag_type: Option<&str>,
        default_value: Option<&str>,
        required: Option<bool>,
        description: Option<&str>,
    ) -> Result<ScriptFlag> {
        let mut updates = Vec::new();
        if flag_name.is_some() {
            updates.push("flag_name = ?");
        }
        if flag_type.is_some() {
            updates.push("flag_type = ?");
        }
        if default_value.is_some() {
            updates.push("default_value = ?");
        }
        if required.is_some() {
            updates.push("required = ?");
        }
        if description.is_some() {
            updates.push("description = ?");
        }

        if updates.is_empty() {
            return self.get_flag(id).await;
        }

        let query = format!("UPDATE script_flags SET {} WHERE id = ?", updates.join(", "));
        let mut q = sqlx::query(&query);

        if let Some(n) = flag_name {
            q = q.bind(n);
        }
        if let Some(t) = flag_type {
            q = q.bind(t);
        }
        if let Some(d) = default_value {
            q = q.bind(d);
        }
        if let Some(r) = required {
            q = q.bind(r);
        }
        if let Some(desc) = description {
            q = q.bind(desc);
        }

        q.bind(id)
            .execute(&self.db)
            .await
            .map_err(|e| CocoError::Database(e.to_string()))?;

        self.get_flag(id).await
    }

    /// Get a single flag by ID
    pub async fn get_flag(&self, id: &str) -> Result<ScriptFlag> {
        let row = sqlx::query_as::<_, ScriptFlagRow>(
            "SELECT id, script_id, flag_name, flag_type, default_value, required, description FROM script_flags WHERE id = ?",
        )
        .bind(id)
        .fetch_optional(&self.db)
        .await
        .map_err(|e| CocoError::Database(e.to_string()))?;

        row.map(ScriptFlag::from)
            .ok_or_else(|| CocoError::NotFound(format!("Flag not found: {}", id)))
    }

    /// Delete a flag
    pub async fn delete_flag(&self, id: &str) -> Result<()> {
        let result = sqlx::query("DELETE FROM script_flags WHERE id = ?")
            .bind(id)
            .execute(&self.db)
            .await
            .map_err(|e| CocoError::Database(e.to_string()))?;

        if result.rows_affected() == 0 {
            return Err(CocoError::NotFound(format!("Flag not found: {}", id)));
        }

        Ok(())
    }

    // ========================================================================
    // Script Execution
    // ========================================================================

    /// Start running a script asynchronously with log streaming
    pub async fn start_script(
        &self,
        script_id: &str,
        input: RunScriptInput,
        env_vars: HashMap<String, String>,
    ) -> Result<ScriptRun> {
        let script = self.get_script(script_id).await?;
        let run_id = Uuid::new_v4().to_string();
        let started_at = Utc::now();

        // Validate required flags
        for flag in &script.flags {
            if flag.required && !input.flags.contains_key(&flag.flag_name) {
                return Err(CocoError::Validation(format!(
                    "Required flag missing: {}",
                    flag.flag_name
                )));
            }
        }

        // Create run record
        let flags_used = serde_json::to_string(&input.flags).ok();
        let env_vars_used = serde_json::to_string(&input.env_var_keys).ok();

        sqlx::query(
            "INSERT INTO script_runs (id, script_id, started_at, status, flags_used, env_vars_used, logs) VALUES (?, ?, ?, ?, ?, ?, ?)",
        )
        .bind(&run_id)
        .bind(script_id)
        .bind(started_at.to_rfc3339())
        .bind("running")
        .bind(&flags_used)
        .bind(&env_vars_used)
        .bind("") // Initialize with empty logs
        .execute(&self.db)
        .await
        .map_err(|e| CocoError::Database(e.to_string()))?;

        // Build command based on runner type
        let mut cmd = build_command(&script, &input.flags);

        // Set working directory if specified
        if let Some(ref wd) = script.working_directory {
            cmd.current_dir(wd);
        }

        // Set environment variables
        for (key, value) in &env_vars {
            cmd.env(key, value);
        }

        cmd.stdout(Stdio::piped());
        cmd.stderr(Stdio::piped());

        // Spawn the process
        let mut child = cmd
            .spawn()
            .map_err(|e| CocoError::Process(format!("Failed to spawn script: {}", e)))?;

        // Take ownership of stdout and stderr
        let stdout = child.stdout.take();
        let stderr = child.stderr.take();

        // Create cancellation channel
        let (cancel_tx, cancel_rx) = tokio::sync::oneshot::channel::<()>();

        // Store cancellation token
        {
            let mut runs = self.active_runs.write().await;
            runs.insert(run_id.clone(), cancel_tx);
        }

        // Spawn background task to stream logs and wait for completion
        let db = self.db.clone();
        let run_id_clone = run_id.clone();
        let active_runs = self.active_runs.clone();

        tokio::spawn(async move {
            // Helper to append logs to database
            async fn append_logs(db: &DbPool, run_id: &str, text: &str) {
                let _ = sqlx::query("UPDATE script_runs SET logs = COALESCE(logs, '') || ? WHERE id = ?")
                    .bind(text)
                    .bind(run_id)
                    .execute(db)
                    .await;
            }

            // Create tasks for reading stdout and stderr as byte chunks
            let stdout_task = if let Some(mut stdout) = stdout {
                let db_clone = db.clone();
                let run_id_for_stdout = run_id_clone.clone();
                Some(tokio::spawn(async move {
                    let mut buffer = vec![0u8; 4096];
                    loop {
                        match stdout.read(&mut buffer).await {
                            Ok(0) => break, // EOF
                            Ok(n) => {
                                let text = String::from_utf8_lossy(&buffer[..n]);
                                append_logs(&db_clone, &run_id_for_stdout, &text).await;
                            }
                            Err(_) => break,
                        }
                    }
                }))
            } else {
                None
            };

            let stderr_task = if let Some(mut stderr) = stderr {
                let db_clone = db.clone();
                let run_id_for_stderr = run_id_clone.clone();
                Some(tokio::spawn(async move {
                    let mut buffer = vec![0u8; 4096];
                    loop {
                        match stderr.read(&mut buffer).await {
                            Ok(0) => break, // EOF
                            Ok(n) => {
                                let text = String::from_utf8_lossy(&buffer[..n]);
                                // Prefix each line with [stderr] for clarity
                                let prefixed: String = text
                                    .lines()
                                    .map(|line| format!("[stderr] {}\n", line))
                                    .collect();
                                append_logs(&db_clone, &run_id_for_stderr, &prefixed).await;
                            }
                            Err(_) => break,
                        }
                    }
                }))
            } else {
                None
            };

            // Wait for process completion or cancellation
            tokio::select! {
                result = child.wait() => {
                    // Wait for log streaming tasks to complete (they'll finish when pipes close)
                    if let Some(task) = stdout_task {
                        let _ = task.await;
                    }
                    if let Some(task) = stderr_task {
                        let _ = task.await;
                    }

                    // Determine final status
                    let (status, exit_code) = match result {
                        Ok(exit_status) => {
                            let code = exit_status.code();
                            let status = if exit_status.success() { "success" } else { "failed" };
                            (status, code)
                        }
                        Err(e) => {
                            append_logs(&db, &run_id_clone, &format!("\n[error] Process error: {}\n", e)).await;
                            ("failed", None)
                        }
                    };

                    // Update final status
                    let _ = sqlx::query(
                        "UPDATE script_runs SET status = ?, exit_code = ?, finished_at = ? WHERE id = ?"
                    )
                    .bind(status)
                    .bind(exit_code)
                    .bind(Utc::now().to_rfc3339())
                    .bind(&run_id_clone)
                    .execute(&db)
                    .await;
                }
                _ = cancel_rx => {
                    // Cancellation requested
                    let _ = child.kill().await;

                    // Update status to cancelled
                    let _ = sqlx::query(
                        "UPDATE script_runs SET status = ?, finished_at = ?, logs = COALESCE(logs, '') || ? WHERE id = ?"
                    )
                    .bind("cancelled")
                    .bind(Utc::now().to_rfc3339())
                    .bind("\n[cancelled] Script was cancelled by user\n")
                    .bind(&run_id_clone)
                    .execute(&db)
                    .await;
                }
            }

            // Remove from active runs
            let mut runs = active_runs.write().await;
            runs.remove(&run_id_clone);
        });

        Ok(ScriptRun {
            id: run_id,
            script_id: script_id.to_string(),
            started_at,
            finished_at: None,
            status: ScriptRunStatus::Running,
            exit_code: None,
            flags_used: Some(serde_json::json!(input.flags)),
            env_vars_used: Some(serde_json::json!(input.env_var_keys)),
            logs: Some(String::new()),
        })
    }

    /// Execute a script synchronously and return the completed run
    pub async fn execute_script(
        &self,
        script_id: &str,
        input: RunScriptInput,
        env_vars: HashMap<String, String>,
    ) -> Result<ScriptRun> {
        let script = self.get_script(script_id).await?;
        let run_id = Uuid::new_v4().to_string();
        let started_at = Utc::now();

        // Validate required flags
        for flag in &script.flags {
            if flag.required && !input.flags.contains_key(&flag.flag_name) {
                return Err(CocoError::Validation(format!(
                    "Required flag missing: {}",
                    flag.flag_name
                )));
            }
        }

        // Build command based on runner type
        let mut cmd = build_command(&script, &input.flags);

        // Set working directory if specified
        if let Some(ref wd) = script.working_directory {
            cmd.current_dir(wd);
        }

        // Set environment variables
        for (key, value) in &env_vars {
            cmd.env(key, value);
        }

        cmd.stdout(Stdio::piped());
        cmd.stderr(Stdio::piped());

        // Execute and collect output
        let output = cmd
            .output()
            .await
            .map_err(|e| CocoError::Process(format!("Failed to execute script: {}", e)))?;

        let finished_at = Utc::now();
        let exit_code = output.status.code();
        let status = if output.status.success() {
            ScriptRunStatus::Success
        } else {
            ScriptRunStatus::Failed
        };

        let stdout = String::from_utf8_lossy(&output.stdout);
        let stderr = String::from_utf8_lossy(&output.stderr);
        let logs = format!("{}{}", stdout, stderr);

        let flags_used = serde_json::to_string(&input.flags).ok();
        let env_vars_used = serde_json::to_string(&input.env_var_keys).ok();

        // Save run record
        sqlx::query(
            r#"
            INSERT INTO script_runs (id, script_id, started_at, finished_at, status, exit_code, flags_used, env_vars_used, logs)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            "#,
        )
        .bind(&run_id)
        .bind(script_id)
        .bind(started_at.to_rfc3339())
        .bind(finished_at.to_rfc3339())
        .bind(status_to_string(&status))
        .bind(exit_code)
        .bind(&flags_used)
        .bind(&env_vars_used)
        .bind(&logs)
        .execute(&self.db)
        .await
        .map_err(|e| CocoError::Database(e.to_string()))?;

        Ok(ScriptRun {
            id: run_id,
            script_id: script_id.to_string(),
            started_at,
            finished_at: Some(finished_at),
            status,
            exit_code,
            flags_used: Some(serde_json::json!(input.flags)),
            env_vars_used: Some(serde_json::json!(input.env_var_keys)),
            logs: Some(logs),
        })
    }

    /// Cancel a running script
    pub async fn cancel_script(&self, run_id: &str) -> Result<()> {
        let mut runs = self.active_runs.write().await;

        if let Some(cancel_tx) = runs.remove(run_id) {
            // Send cancellation signal - the background task will handle the rest
            let _ = cancel_tx.send(());
            Ok(())
        } else {
            Err(CocoError::NotFound(format!(
                "No active process for run: {}",
                run_id
            )))
        }
    }

    // ========================================================================
    // Script Runs
    // ========================================================================

    /// List runs for a script
    pub async fn list_runs(&self, script_id: &str) -> Result<Vec<ScriptRun>> {
        let rows = sqlx::query_as::<_, ScriptRunRow>(
            r#"
            SELECT id, script_id, started_at, finished_at, status, exit_code, flags_used, env_vars_used, logs
            FROM script_runs
            WHERE script_id = ?
            ORDER BY started_at DESC
            "#,
        )
        .bind(script_id)
        .fetch_all(&self.db)
        .await
        .map_err(|e| CocoError::Database(e.to_string()))?;

        Ok(rows.into_iter().map(ScriptRun::from).collect())
    }

    /// Get a single run by ID
    pub async fn get_run(&self, id: &str) -> Result<ScriptRun> {
        let row = sqlx::query_as::<_, ScriptRunRow>(
            r#"
            SELECT id, script_id, started_at, finished_at, status, exit_code, flags_used, env_vars_used, logs
            FROM script_runs
            WHERE id = ?
            "#,
        )
        .bind(id)
        .fetch_optional(&self.db)
        .await
        .map_err(|e| CocoError::Database(e.to_string()))?;

        row.map(ScriptRun::from)
            .ok_or_else(|| CocoError::NotFound(format!("Run not found: {}", id)))
    }

    /// Get logs for a run
    pub async fn get_run_logs(&self, id: &str) -> Result<String> {
        let row: Option<(Option<String>,)> =
            sqlx::query_as("SELECT logs FROM script_runs WHERE id = ?")
                .bind(id)
                .fetch_optional(&self.db)
                .await
                .map_err(|e| CocoError::Database(e.to_string()))?;

        match row {
            Some((Some(logs),)) => Ok(logs),
            Some((None,)) => Ok(String::new()),
            None => Err(CocoError::NotFound(format!("Run not found: {}", id))),
        }
    }

    /// Update run with logs (for streaming)
    pub async fn append_run_logs(&self, id: &str, new_logs: &str) -> Result<()> {
        sqlx::query("UPDATE script_runs SET logs = COALESCE(logs, '') || ? WHERE id = ?")
            .bind(new_logs)
            .bind(id)
            .execute(&self.db)
            .await
            .map_err(|e| CocoError::Database(e.to_string()))?;

        Ok(())
    }

    /// Finalize a run
    pub async fn finalize_run(
        &self,
        id: &str,
        status: ScriptRunStatus,
        exit_code: Option<i32>,
        logs: &str,
    ) -> Result<()> {
        sqlx::query(
            "UPDATE script_runs SET status = ?, exit_code = ?, finished_at = ?, logs = ? WHERE id = ?",
        )
        .bind(status_to_string(&status))
        .bind(exit_code)
        .bind(Utc::now().to_rfc3339())
        .bind(logs)
        .bind(id)
        .execute(&self.db)
        .await
        .map_err(|e| CocoError::Database(e.to_string()))?;

        Ok(())
    }
}

// Helper structs for SQLx
#[derive(sqlx::FromRow)]
struct ScriptRow {
    id: String,
    workspace_id: String,
    name: String,
    description: Option<String>,
    runner: Option<String>,
    file_path: String,
    command: Option<String>,
    working_directory: Option<String>,
    category: Option<String>,
    created_at: String,
    updated_at: Option<String>,
}

impl From<ScriptRow> for Script {
    fn from(row: ScriptRow) -> Self {
        let created_at = row
            .created_at
            .parse::<DateTime<Utc>>()
            .unwrap_or_else(|_| Utc::now());
        let updated_at = row
            .updated_at
            .and_then(|s| s.parse::<DateTime<Utc>>().ok())
            .unwrap_or(created_at);

        Script {
            id: row.id,
            workspace_id: row.workspace_id,
            name: row.name,
            description: row.description,
            runner: row.runner.map(|r| ScriptRunner::from(r.as_str())).unwrap_or_default(),
            file_path: row.file_path,
            command: row.command,
            working_directory: row.working_directory,
            category: row.category,
            created_at,
            updated_at,
            flags: vec![],
        }
    }
}

#[derive(sqlx::FromRow)]
struct ScriptFlagRow {
    id: String,
    script_id: String,
    flag_name: String,
    flag_type: String,
    default_value: Option<String>,
    required: bool,
    description: Option<String>,
}

impl From<ScriptFlagRow> for ScriptFlag {
    fn from(row: ScriptFlagRow) -> Self {
        ScriptFlag {
            id: row.id,
            script_id: row.script_id,
            flag_name: row.flag_name,
            flag_type: ScriptFlagType::from(row.flag_type.as_str()),
            default_value: row.default_value,
            required: row.required,
            description: row.description,
        }
    }
}

#[derive(sqlx::FromRow)]
struct ScriptRunRow {
    id: String,
    script_id: String,
    started_at: String,
    finished_at: Option<String>,
    status: String,
    exit_code: Option<i32>,
    flags_used: Option<String>,
    env_vars_used: Option<String>,
    logs: Option<String>,
}

impl From<ScriptRunRow> for ScriptRun {
    fn from(row: ScriptRunRow) -> Self {
        ScriptRun {
            id: row.id,
            script_id: row.script_id,
            started_at: row
                .started_at
                .parse::<DateTime<Utc>>()
                .unwrap_or_else(|_| Utc::now()),
            finished_at: row
                .finished_at
                .and_then(|s| s.parse::<DateTime<Utc>>().ok()),
            status: ScriptRunStatus::from(row.status.as_str()),
            exit_code: row.exit_code,
            flags_used: row.flags_used.and_then(|s| serde_json::from_str(&s).ok()),
            env_vars_used: row.env_vars_used.and_then(|s| serde_json::from_str(&s).ok()),
            logs: row.logs,
        }
    }
}

fn status_to_string(status: &ScriptRunStatus) -> &'static str {
    match status {
        ScriptRunStatus::Running => "running",
        ScriptRunStatus::Success => "success",
        ScriptRunStatus::Failed => "failed",
        ScriptRunStatus::Cancelled => "cancelled",
    }
}

/// Get the shell command and argument prefix for the current platform
/// Returns (shell_path, shell_arg) - e.g., ("/bin/sh", "-c") on Unix or ("cmd.exe", "/C") on Windows
fn get_shell_command() -> (&'static str, &'static str) {
    #[cfg(target_os = "windows")]
    {
        ("cmd.exe", "/C")
    }
    #[cfg(not(target_os = "windows"))]
    {
        ("/bin/sh", "-c")
    }
}

/// Build a command based on the script runner type
fn build_command(script: &Script, flags: &HashMap<String, String>) -> Command {
    let mut args: Vec<String> = Vec::new();

    // Build flag arguments
    for (name, value) in flags {
        let flag = script.flags.iter().find(|f| &f.flag_name == name);
        match flag.map(|f| f.flag_type) {
            Some(ScriptFlagType::Boolean) => {
                if value == "true" {
                    args.push(name.clone());
                }
            }
            _ => {
                args.push(name.clone());
                args.push(value.clone());
            }
        }
    }

    // Parse additional args from command field (for runners that support it)
    let extra_args: Vec<String> = script
        .command
        .as_deref()
        .unwrap_or("")
        .split_whitespace()
        .map(|s| s.to_string())
        .collect();

    match script.runner {
        ScriptRunner::Bash => {
            let (shell, shell_arg) = get_shell_command();
            let mut cmd = Command::new(shell);
            let mut cmd_str = script.file_path.clone();
            for arg in &args {
                cmd_str.push_str(&format!(" {}", arg));
            }
            cmd.arg(shell_arg).arg(cmd_str);
            cmd
        }
        ScriptRunner::Node => {
            let mut cmd = Command::new("node");
            cmd.arg(&script.file_path);
            for arg in args {
                cmd.arg(arg);
            }
            cmd
        }
        ScriptRunner::Bun => {
            let mut cmd = Command::new("bun");
            cmd.arg("run").arg(&script.file_path);
            for arg in args {
                cmd.arg(arg);
            }
            cmd
        }
        ScriptRunner::Python => {
            let mut cmd = Command::new("python3");
            cmd.arg(&script.file_path);
            for arg in args {
                cmd.arg(arg);
            }
            cmd
        }
        ScriptRunner::Npx => {
            let mut cmd = Command::new("npx");
            cmd.arg(&script.file_path);
            for arg in args {
                cmd.arg(arg);
            }
            cmd
        }
        ScriptRunner::Custom => {
            let (shell, shell_arg) = get_shell_command();
            let base_cmd = script.command.as_deref().unwrap_or("");
            let mut cmd = Command::new(shell);
            let mut cmd_str = base_cmd.to_string();
            if !script.file_path.is_empty() && script.file_path != "." {
                if !cmd_str.is_empty() {
                    cmd_str.push(' ');
                }
                cmd_str.push_str(&script.file_path);
            }
            for arg in &args {
                cmd_str.push_str(&format!(" {}", arg));
            }
            cmd.arg(shell_arg).arg(cmd_str);
            cmd
        }
        // =====================
        // Foundry (EVM/Hedera)
        // =====================
        ScriptRunner::Forge => {
            let mut cmd = Command::new("forge");
            cmd.arg("script").arg(&script.file_path);
            for arg in &extra_args {
                cmd.arg(arg);
            }
            for arg in args {
                cmd.arg(arg);
            }
            cmd
        }
        ScriptRunner::ForgeTest => {
            let mut cmd = Command::new("forge");
            cmd.arg("test");
            if !script.file_path.is_empty() && script.file_path != "." {
                cmd.arg("--match-path").arg(&script.file_path);
            }
            for arg in &extra_args {
                cmd.arg(arg);
            }
            for arg in args {
                cmd.arg(arg);
            }
            cmd
        }
        ScriptRunner::ForgeBuild => {
            let mut cmd = Command::new("forge");
            cmd.arg("build");
            for arg in &extra_args {
                cmd.arg(arg);
            }
            for arg in args {
                cmd.arg(arg);
            }
            cmd
        }
        // =====================
        // Hardhat (EVM/Hedera)
        // =====================
        ScriptRunner::Hardhat => {
            let mut cmd = Command::new("npx");
            cmd.arg("hardhat").arg("run").arg(&script.file_path);
            for arg in &extra_args {
                cmd.arg(arg);
            }
            for arg in args {
                cmd.arg(arg);
            }
            cmd
        }
        ScriptRunner::HardhatTest => {
            let mut cmd = Command::new("npx");
            cmd.arg("hardhat").arg("test");
            if !script.file_path.is_empty() && script.file_path != "." {
                cmd.arg(&script.file_path);
            }
            for arg in &extra_args {
                cmd.arg(arg);
            }
            for arg in args {
                cmd.arg(arg);
            }
            cmd
        }
        ScriptRunner::HardhatCompile => {
            let mut cmd = Command::new("npx");
            cmd.arg("hardhat").arg("compile");
            for arg in &extra_args {
                cmd.arg(arg);
            }
            for arg in args {
                cmd.arg(arg);
            }
            cmd
        }
        // =====================
        // Anchor (Solana)
        // =====================
        ScriptRunner::Anchor => {
            let mut cmd = Command::new("anchor");
            cmd.arg("run");
            if !script.file_path.is_empty() && script.file_path != "." {
                cmd.arg(&script.file_path);
            }
            for arg in &extra_args {
                cmd.arg(arg);
            }
            for arg in args {
                cmd.arg(arg);
            }
            cmd
        }
        ScriptRunner::AnchorTest => {
            let mut cmd = Command::new("anchor");
            cmd.arg("test");
            if !script.file_path.is_empty() && script.file_path != "." {
                cmd.arg(&script.file_path);
            }
            for arg in &extra_args {
                cmd.arg(arg);
            }
            for arg in args {
                cmd.arg(arg);
            }
            cmd
        }
        ScriptRunner::AnchorBuild => {
            let mut cmd = Command::new("anchor");
            cmd.arg("build");
            for arg in &extra_args {
                cmd.arg(arg);
            }
            for arg in args {
                cmd.arg(arg);
            }
            cmd
        }
        // =====================
        // Aptos Move
        // =====================
        ScriptRunner::AptosMoveCompile => {
            let mut cmd = Command::new("aptos");
            cmd.arg("move").arg("compile");
            for arg in &extra_args {
                cmd.arg(arg);
            }
            for arg in args {
                cmd.arg(arg);
            }
            cmd
        }
        ScriptRunner::AptosMoveTest => {
            let mut cmd = Command::new("aptos");
            cmd.arg("move").arg("test");
            if !script.file_path.is_empty() && script.file_path != "." {
                cmd.arg("--filter").arg(&script.file_path);
            }
            for arg in &extra_args {
                cmd.arg(arg);
            }
            for arg in args {
                cmd.arg(arg);
            }
            cmd
        }
        ScriptRunner::AptosMovePublish => {
            let mut cmd = Command::new("aptos");
            cmd.arg("move").arg("publish");
            for arg in &extra_args {
                cmd.arg(arg);
            }
            for arg in args {
                cmd.arg(arg);
            }
            cmd
        }
    }
}
