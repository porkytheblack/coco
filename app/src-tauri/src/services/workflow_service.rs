use crate::db::DbPool;
use crate::error::{CocoError, Result};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

// ============================================================================
// Types
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Workflow {
    pub id: String,
    pub workspace_id: String,
    pub name: String,
    pub description: Option<String>,
    pub definition: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkflowRun {
    pub id: String,
    pub workflow_id: String,
    pub status: String, // pending, running, completed, failed, cancelled, paused
    pub execution_mode: String, // full, single, upto
    pub target_node_id: Option<String>,
    pub current_node_id: Option<String>,
    pub variables: Option<String>,
    pub step_logs: Option<String>,
    pub error: Option<String>,
    pub started_at: String,
    pub completed_at: Option<String>,
    pub paused_at: Option<String>,
    pub resumed_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkflowStepExecution {
    pub id: String,
    pub run_id: String,
    pub node_id: String,
    pub node_type: String,
    pub status: String,
    pub input: Option<String>,
    pub output: Option<String>,
    pub error: Option<String>,
    pub started_at: Option<String>,
    pub completed_at: Option<String>,
    pub execution_order: i32,
}

/// Execution mode for workflow runs
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ExecutionMode {
    Full,
    Single { node_id: String },
    Upto { node_id: String },
    Resume { run_id: String },
}

// ============================================================================
// SQLx Row Types
// ============================================================================

#[derive(sqlx::FromRow)]
struct WorkflowRow {
    id: String,
    workspace_id: String,
    name: String,
    description: Option<String>,
    definition: String,
    created_at: String,
    updated_at: String,
}

impl From<WorkflowRow> for Workflow {
    fn from(row: WorkflowRow) -> Self {
        Self {
            id: row.id,
            workspace_id: row.workspace_id,
            name: row.name,
            description: row.description,
            definition: row.definition,
            created_at: row.created_at,
            updated_at: row.updated_at,
        }
    }
}

#[derive(sqlx::FromRow)]
struct WorkflowRunRow {
    id: String,
    workflow_id: String,
    status: String,
    execution_mode: String,
    target_node_id: Option<String>,
    current_node_id: Option<String>,
    variables: Option<String>,
    step_logs: Option<String>,
    error: Option<String>,
    started_at: String,
    completed_at: Option<String>,
    paused_at: Option<String>,
    resumed_at: Option<String>,
}

impl From<WorkflowRunRow> for WorkflowRun {
    fn from(row: WorkflowRunRow) -> Self {
        Self {
            id: row.id,
            workflow_id: row.workflow_id,
            status: row.status,
            execution_mode: row.execution_mode,
            target_node_id: row.target_node_id,
            current_node_id: row.current_node_id,
            variables: row.variables,
            step_logs: row.step_logs,
            error: row.error,
            started_at: row.started_at,
            completed_at: row.completed_at,
            paused_at: row.paused_at,
            resumed_at: row.resumed_at,
        }
    }
}

#[derive(sqlx::FromRow)]
struct WorkflowStepExecutionRow {
    id: String,
    run_id: String,
    node_id: String,
    node_type: String,
    status: String,
    input: Option<String>,
    output: Option<String>,
    error: Option<String>,
    started_at: Option<String>,
    completed_at: Option<String>,
    execution_order: i32,
}

impl From<WorkflowStepExecutionRow> for WorkflowStepExecution {
    fn from(row: WorkflowStepExecutionRow) -> Self {
        Self {
            id: row.id,
            run_id: row.run_id,
            node_id: row.node_id,
            node_type: row.node_type,
            status: row.status,
            input: row.input,
            output: row.output,
            error: row.error,
            started_at: row.started_at,
            completed_at: row.completed_at,
            execution_order: row.execution_order,
        }
    }
}

// ============================================================================
// Service
// ============================================================================

pub struct WorkflowService {
    db: DbPool,
}

impl WorkflowService {
    pub fn new(db: DbPool) -> Self {
        Self { db }
    }

    // ========================================================================
    // Workflow CRUD
    // ========================================================================

    pub async fn list_workflows(&self, workspace_id: &str) -> Result<Vec<Workflow>> {
        let rows = sqlx::query_as::<_, WorkflowRow>(
            "SELECT id, workspace_id, name, description, definition, created_at, updated_at FROM workflows WHERE workspace_id = ? ORDER BY updated_at DESC",
        )
        .bind(workspace_id)
        .fetch_all(&self.db)
        .await
        .map_err(|e| CocoError::Database(e.to_string()))?;

        Ok(rows.into_iter().map(Workflow::from).collect())
    }

    pub async fn get_workflow(&self, workflow_id: &str) -> Result<Workflow> {
        let row = sqlx::query_as::<_, WorkflowRow>(
            "SELECT id, workspace_id, name, description, definition, created_at, updated_at FROM workflows WHERE id = ?",
        )
        .bind(workflow_id)
        .fetch_optional(&self.db)
        .await
        .map_err(|e| CocoError::Database(e.to_string()))?;

        row.map(Workflow::from)
            .ok_or_else(|| CocoError::NotFound(format!("Workflow not found: {}", workflow_id)))
    }

    pub async fn create_workflow(
        &self,
        workspace_id: &str,
        name: &str,
        description: Option<&str>,
    ) -> Result<Workflow> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now().to_rfc3339();

        // Default definition with start and end nodes
        let default_definition = r#"{"nodes":[{"id":"start-1","type":"start","position":{"x":250,"y":50},"label":"Start"},{"id":"end-1","type":"end","position":{"x":250,"y":400},"label":"End","status":"success"}],"edges":[],"variables":[]}"#;

        sqlx::query(
            "INSERT INTO workflows (id, workspace_id, name, description, definition, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
        )
        .bind(&id)
        .bind(workspace_id)
        .bind(name)
        .bind(description)
        .bind(default_definition)
        .bind(&now)
        .bind(&now)
        .execute(&self.db)
        .await
        .map_err(|e| CocoError::Database(e.to_string()))?;

        self.get_workflow(&id).await
    }

    pub async fn update_workflow(
        &self,
        workflow_id: &str,
        name: Option<&str>,
        description: Option<&str>,
        definition: Option<&str>,
    ) -> Result<Workflow> {
        let now = Utc::now().to_rfc3339();
        let existing = self.get_workflow(workflow_id).await?;

        let new_name = name.unwrap_or(&existing.name);
        let new_description = description.or(existing.description.as_deref());
        let new_definition = definition.unwrap_or(&existing.definition);

        sqlx::query(
            "UPDATE workflows SET name = ?, description = ?, definition = ?, updated_at = ? WHERE id = ?",
        )
        .bind(new_name)
        .bind(new_description)
        .bind(new_definition)
        .bind(&now)
        .bind(workflow_id)
        .execute(&self.db)
        .await
        .map_err(|e| CocoError::Database(e.to_string()))?;

        self.get_workflow(workflow_id).await
    }

    pub async fn delete_workflow(&self, workflow_id: &str) -> Result<()> {
        sqlx::query("DELETE FROM workflows WHERE id = ?")
            .bind(workflow_id)
            .execute(&self.db)
            .await
            .map_err(|e| CocoError::Database(e.to_string()))?;

        Ok(())
    }

    // ========================================================================
    // Workflow Run CRUD
    // ========================================================================

    pub async fn list_workflow_runs(&self, workflow_id: &str) -> Result<Vec<WorkflowRun>> {
        let rows = sqlx::query_as::<_, WorkflowRunRow>(
            "SELECT id, workflow_id, status, execution_mode, target_node_id, current_node_id, variables, step_logs, error, started_at, completed_at, paused_at, resumed_at FROM workflow_runs WHERE workflow_id = ? ORDER BY started_at DESC",
        )
        .bind(workflow_id)
        .fetch_all(&self.db)
        .await
        .map_err(|e| CocoError::Database(e.to_string()))?;

        Ok(rows.into_iter().map(WorkflowRun::from).collect())
    }

    pub async fn get_workflow_run(&self, run_id: &str) -> Result<WorkflowRun> {
        let row = sqlx::query_as::<_, WorkflowRunRow>(
            "SELECT id, workflow_id, status, execution_mode, target_node_id, current_node_id, variables, step_logs, error, started_at, completed_at, paused_at, resumed_at FROM workflow_runs WHERE id = ?",
        )
        .bind(run_id)
        .fetch_optional(&self.db)
        .await
        .map_err(|e| CocoError::Database(e.to_string()))?;

        row.map(WorkflowRun::from)
            .ok_or_else(|| CocoError::NotFound(format!("Workflow run not found: {}", run_id)))
    }

    pub async fn create_workflow_run(
        &self,
        workflow_id: &str,
        execution_mode: &str,
        target_node_id: Option<&str>,
        variables: Option<&str>,
    ) -> Result<WorkflowRun> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now().to_rfc3339();

        sqlx::query(
            "INSERT INTO workflow_runs (id, workflow_id, status, execution_mode, target_node_id, variables, started_at) VALUES (?, ?, 'pending', ?, ?, ?, ?)",
        )
        .bind(&id)
        .bind(workflow_id)
        .bind(execution_mode)
        .bind(target_node_id)
        .bind(variables)
        .bind(&now)
        .execute(&self.db)
        .await
        .map_err(|e| CocoError::Database(e.to_string()))?;

        self.get_workflow_run(&id).await
    }

    pub async fn update_workflow_run_status(
        &self,
        run_id: &str,
        status: &str,
        current_node_id: Option<&str>,
        error: Option<&str>,
    ) -> Result<WorkflowRun> {
        let now = Utc::now().to_rfc3339();

        // Set completed_at if status is terminal
        let completed_at = if status == "completed" || status == "failed" || status == "cancelled" {
            Some(now.clone())
        } else {
            None
        };

        // Set paused_at if status is paused
        let paused_at = if status == "paused" {
            Some(now.clone())
        } else {
            None
        };

        sqlx::query(
            "UPDATE workflow_runs SET status = ?, current_node_id = ?, error = ?, completed_at = COALESCE(?, completed_at), paused_at = COALESCE(?, paused_at) WHERE id = ?",
        )
        .bind(status)
        .bind(current_node_id)
        .bind(error)
        .bind(completed_at)
        .bind(paused_at)
        .bind(run_id)
        .execute(&self.db)
        .await
        .map_err(|e| CocoError::Database(e.to_string()))?;

        self.get_workflow_run(run_id).await
    }

    pub async fn update_workflow_run_variables(
        &self,
        run_id: &str,
        variables: &str,
    ) -> Result<()> {
        sqlx::query("UPDATE workflow_runs SET variables = ? WHERE id = ?")
            .bind(variables)
            .bind(run_id)
            .execute(&self.db)
            .await
            .map_err(|e| CocoError::Database(e.to_string()))?;

        Ok(())
    }

    pub async fn update_workflow_run_step_logs(
        &self,
        run_id: &str,
        step_logs: &str,
    ) -> Result<()> {
        sqlx::query("UPDATE workflow_runs SET step_logs = ? WHERE id = ?")
            .bind(step_logs)
            .bind(run_id)
            .execute(&self.db)
            .await
            .map_err(|e| CocoError::Database(e.to_string()))?;

        Ok(())
    }

    pub async fn resume_workflow_run(&self, run_id: &str) -> Result<WorkflowRun> {
        let now = Utc::now().to_rfc3339();

        sqlx::query(
            "UPDATE workflow_runs SET status = 'running', resumed_at = ? WHERE id = ? AND status = 'paused'",
        )
        .bind(&now)
        .bind(run_id)
        .execute(&self.db)
        .await
        .map_err(|e| CocoError::Database(e.to_string()))?;

        self.get_workflow_run(run_id).await
    }

    pub async fn pause_workflow_run(&self, run_id: &str) -> Result<WorkflowRun> {
        self.update_workflow_run_status(run_id, "paused", None, None).await
    }

    pub async fn cancel_workflow_run(&self, run_id: &str) -> Result<WorkflowRun> {
        self.update_workflow_run_status(run_id, "cancelled", None, None).await
    }

    // ========================================================================
    // Step Execution Tracking
    // ========================================================================

    pub async fn get_step_executions(&self, run_id: &str) -> Result<Vec<WorkflowStepExecution>> {
        let rows = sqlx::query_as::<_, WorkflowStepExecutionRow>(
            "SELECT id, run_id, node_id, node_type, status, input, output, error, started_at, completed_at, execution_order FROM workflow_step_executions WHERE run_id = ? ORDER BY execution_order ASC",
        )
        .bind(run_id)
        .fetch_all(&self.db)
        .await
        .map_err(|e| CocoError::Database(e.to_string()))?;

        Ok(rows.into_iter().map(WorkflowStepExecution::from).collect())
    }

    pub async fn create_step_execution(
        &self,
        run_id: &str,
        node_id: &str,
        node_type: &str,
        execution_order: i32,
        input: Option<&str>,
    ) -> Result<WorkflowStepExecution> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now().to_rfc3339();

        sqlx::query(
            "INSERT INTO workflow_step_executions (id, run_id, node_id, node_type, status, input, execution_order, started_at) VALUES (?, ?, ?, ?, 'running', ?, ?, ?)",
        )
        .bind(&id)
        .bind(run_id)
        .bind(node_id)
        .bind(node_type)
        .bind(input)
        .bind(execution_order)
        .bind(&now)
        .execute(&self.db)
        .await
        .map_err(|e| CocoError::Database(e.to_string()))?;

        let row = sqlx::query_as::<_, WorkflowStepExecutionRow>(
            "SELECT id, run_id, node_id, node_type, status, input, output, error, started_at, completed_at, execution_order FROM workflow_step_executions WHERE id = ?",
        )
        .bind(&id)
        .fetch_one(&self.db)
        .await
        .map_err(|e| CocoError::Database(e.to_string()))?;

        Ok(WorkflowStepExecution::from(row))
    }

    pub async fn complete_step_execution(
        &self,
        step_id: &str,
        status: &str,
        output: Option<&str>,
        error: Option<&str>,
    ) -> Result<()> {
        let now = Utc::now().to_rfc3339();

        sqlx::query(
            "UPDATE workflow_step_executions SET status = ?, output = ?, error = ?, completed_at = ? WHERE id = ?",
        )
        .bind(status)
        .bind(output)
        .bind(error)
        .bind(&now)
        .bind(step_id)
        .execute(&self.db)
        .await
        .map_err(|e| CocoError::Database(e.to_string()))?;

        Ok(())
    }

    pub async fn get_last_completed_step(&self, run_id: &str) -> Result<Option<WorkflowStepExecution>> {
        let row = sqlx::query_as::<_, WorkflowStepExecutionRow>(
            "SELECT id, run_id, node_id, node_type, status, input, output, error, started_at, completed_at, execution_order FROM workflow_step_executions WHERE run_id = ? AND status = 'completed' ORDER BY execution_order DESC LIMIT 1",
        )
        .bind(run_id)
        .fetch_optional(&self.db)
        .await
        .map_err(|e| CocoError::Database(e.to_string()))?;

        Ok(row.map(WorkflowStepExecution::from))
    }
}

impl Default for WorkflowService {
    fn default() -> Self {
        panic!("WorkflowService requires a database pool")
    }
}
