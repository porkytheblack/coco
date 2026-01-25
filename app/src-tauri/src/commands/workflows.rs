use tauri::State;
use crate::AppState;
use crate::services::{Workflow, WorkflowRun, WorkflowStepExecution};

// ============================================================================
// Workflow Commands
// ============================================================================

#[tauri::command(rename_all = "camelCase")]
pub async fn list_workflows(
    workspace_id: String,
    state: State<'_, AppState>,
) -> Result<Vec<Workflow>, String> {
    state
        .workflow_service
        .list_workflows(&workspace_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command(rename_all = "camelCase")]
pub async fn get_workflow(
    workflow_id: String,
    state: State<'_, AppState>,
) -> Result<Workflow, String> {
    state
        .workflow_service
        .get_workflow(&workflow_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command(rename_all = "camelCase")]
pub async fn create_workflow(
    workspace_id: String,
    name: String,
    description: Option<String>,
    state: State<'_, AppState>,
) -> Result<Workflow, String> {
    state
        .workflow_service
        .create_workflow(&workspace_id, &name, description.as_deref())
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command(rename_all = "camelCase")]
pub async fn update_workflow(
    workflow_id: String,
    name: Option<String>,
    description: Option<String>,
    definition: Option<String>,
    state: State<'_, AppState>,
) -> Result<Workflow, String> {
    state
        .workflow_service
        .update_workflow(
            &workflow_id,
            name.as_deref(),
            description.as_deref(),
            definition.as_deref(),
        )
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command(rename_all = "camelCase")]
pub async fn delete_workflow(
    workflow_id: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    state
        .workflow_service
        .delete_workflow(&workflow_id)
        .await
        .map_err(|e| e.to_string())
}

// ============================================================================
// Workflow Run Commands
// ============================================================================

#[tauri::command(rename_all = "camelCase")]
pub async fn list_workflow_runs(
    workflow_id: String,
    state: State<'_, AppState>,
) -> Result<Vec<WorkflowRun>, String> {
    state
        .workflow_service
        .list_workflow_runs(&workflow_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command(rename_all = "camelCase")]
pub async fn get_workflow_run(
    run_id: String,
    state: State<'_, AppState>,
) -> Result<WorkflowRun, String> {
    state
        .workflow_service
        .get_workflow_run(&run_id)
        .await
        .map_err(|e| e.to_string())
}

/// Start a workflow run with the specified execution mode
/// 
/// execution_mode: "full" | "single" | "upto" | "resume"
/// target_node_id: Required for "single" and "upto" modes
#[tauri::command(rename_all = "camelCase")]
pub async fn run_workflow(
    workflow_id: String,
    execution_mode: Option<String>,
    target_node_id: Option<String>,
    variables: Option<String>,
    state: State<'_, AppState>,
) -> Result<WorkflowRun, String> {
    let mode = execution_mode.as_deref().unwrap_or("full");
    
    state
        .workflow_service
        .create_workflow_run(&workflow_id, mode, target_node_id.as_deref(), variables.as_deref())
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command(rename_all = "camelCase")]
pub async fn pause_workflow_run(
    run_id: String,
    state: State<'_, AppState>,
) -> Result<WorkflowRun, String> {
    state
        .workflow_service
        .pause_workflow_run(&run_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command(rename_all = "camelCase")]
pub async fn resume_workflow_run(
    run_id: String,
    state: State<'_, AppState>,
) -> Result<WorkflowRun, String> {
    state
        .workflow_service
        .resume_workflow_run(&run_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command(rename_all = "camelCase")]
pub async fn cancel_workflow_run(
    run_id: String,
    state: State<'_, AppState>,
) -> Result<WorkflowRun, String> {
    state
        .workflow_service
        .cancel_workflow_run(&run_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command(rename_all = "camelCase")]
pub async fn get_workflow_step_executions(
    run_id: String,
    state: State<'_, AppState>,
) -> Result<Vec<WorkflowStepExecution>, String> {
    state
        .workflow_service
        .get_step_executions(&run_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command(rename_all = "camelCase")]
pub async fn update_workflow_run_status(
    run_id: String,
    status: String,
    current_node_id: Option<String>,
    error: Option<String>,
    state: State<'_, AppState>,
) -> Result<WorkflowRun, String> {
    state
        .workflow_service
        .update_workflow_run_status(
            &run_id,
            &status,
            current_node_id.as_deref(),
            error.as_deref(),
        )
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command(rename_all = "camelCase")]
pub async fn update_workflow_run_step_logs(
    run_id: String,
    step_logs: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    state
        .workflow_service
        .update_workflow_run_step_logs(&run_id, &step_logs)
        .await
        .map_err(|e| e.to_string())
}
