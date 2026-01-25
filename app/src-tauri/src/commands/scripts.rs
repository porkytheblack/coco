use tauri::State;

use crate::types::{
    CreateScriptFlagInput, CreateScriptInput, RunScriptInput, Script, ScriptFlag, ScriptRun,
};
use crate::AppState;

// ============================================================================
// Script CRUD commands
// ============================================================================

#[tauri::command(rename_all = "camelCase")]
pub async fn list_scripts(
    workspace_id: String,
    state: State<'_, AppState>,
) -> Result<Vec<Script>, String> {
    state
        .script_service
        .list_scripts(&workspace_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command(rename_all = "camelCase")]
pub async fn get_script(script_id: String, state: State<'_, AppState>) -> Result<Script, String> {
    state
        .script_service
        .get_script(&script_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command(rename_all = "camelCase")]
pub async fn create_script(
    workspace_id: String,
    input: CreateScriptInput,
    state: State<'_, AppState>,
) -> Result<Script, String> {
    state
        .script_service
        .create_script(&workspace_id, input)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command(rename_all = "camelCase")]
pub async fn update_script(
    script_id: String,
    name: Option<String>,
    description: Option<String>,
    runner: Option<String>,
    file_path: Option<String>,
    command: Option<String>,
    working_directory: Option<String>,
    category: Option<String>,
    state: State<'_, AppState>,
) -> Result<Script, String> {
    state
        .script_service
        .update_script(
            &script_id,
            name.as_deref(),
            description.as_deref(),
            runner.as_deref(),
            file_path.as_deref(),
            command.as_deref(),
            working_directory.as_deref(),
            category.as_deref(),
        )
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command(rename_all = "camelCase")]
pub async fn delete_script(script_id: String, state: State<'_, AppState>) -> Result<(), String> {
    state
        .script_service
        .delete_script(&script_id)
        .await
        .map_err(|e| e.to_string())
}

// ============================================================================
// Script flag commands
// ============================================================================

#[tauri::command(rename_all = "camelCase")]
pub async fn list_script_flags(
    script_id: String,
    state: State<'_, AppState>,
) -> Result<Vec<ScriptFlag>, String> {
    state
        .script_service
        .list_flags(&script_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command(rename_all = "camelCase")]
pub async fn create_script_flag(
    script_id: String,
    input: CreateScriptFlagInput,
    state: State<'_, AppState>,
) -> Result<ScriptFlag, String> {
    state
        .script_service
        .create_flag(&script_id, input)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command(rename_all = "camelCase")]
pub async fn update_script_flag(
    flag_id: String,
    flag_name: Option<String>,
    flag_type: Option<String>,
    default_value: Option<String>,
    required: Option<bool>,
    description: Option<String>,
    state: State<'_, AppState>,
) -> Result<ScriptFlag, String> {
    state
        .script_service
        .update_flag(
            &flag_id,
            flag_name.as_deref(),
            flag_type.as_deref(),
            default_value.as_deref(),
            required,
            description.as_deref(),
        )
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command(rename_all = "camelCase")]
pub async fn delete_script_flag(flag_id: String, state: State<'_, AppState>) -> Result<(), String> {
    state
        .script_service
        .delete_flag(&flag_id)
        .await
        .map_err(|e| e.to_string())
}

// ============================================================================
// Script execution commands
// ============================================================================

#[tauri::command(rename_all = "camelCase")]
pub async fn run_script(
    script_id: String,
    input: RunScriptInput,
    state: State<'_, AppState>,
) -> Result<ScriptRun, String> {
    // Get the script to find its workspace
    let script = state
        .script_service
        .get_script(&script_id)
        .await
        .map_err(|e| e.to_string())?;

    // Get environment variable values for the selected keys
    let env_vars = state
        .env_service
        .get_env_values(&script.workspace_id, &input.env_var_keys)
        .await
        .map_err(|e| e.to_string())?;

    // Execute the script synchronously
    state
        .script_service
        .execute_script(&script_id, input, env_vars)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command(rename_all = "camelCase")]
pub async fn start_script_async(
    script_id: String,
    input: RunScriptInput,
    state: State<'_, AppState>,
) -> Result<ScriptRun, String> {
    // Get the script to find its workspace
    let script = state
        .script_service
        .get_script(&script_id)
        .await
        .map_err(|e| e.to_string())?;

    // Get environment variable values for the selected keys
    let env_vars = state
        .env_service
        .get_env_values(&script.workspace_id, &input.env_var_keys)
        .await
        .map_err(|e| e.to_string())?;

    // Start the script (returns immediately with running status)
    state
        .script_service
        .start_script(&script_id, input, env_vars)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command(rename_all = "camelCase")]
pub async fn cancel_script_run(run_id: String, state: State<'_, AppState>) -> Result<(), String> {
    state
        .script_service
        .cancel_script(&run_id)
        .await
        .map_err(|e| e.to_string())
}

// ============================================================================
// Script run commands
// ============================================================================

#[tauri::command(rename_all = "camelCase")]
pub async fn list_script_runs(
    script_id: String,
    state: State<'_, AppState>,
) -> Result<Vec<ScriptRun>, String> {
    state
        .script_service
        .list_runs(&script_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command(rename_all = "camelCase")]
pub async fn get_script_run(run_id: String, state: State<'_, AppState>) -> Result<ScriptRun, String> {
    state
        .script_service
        .get_run(&run_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command(rename_all = "camelCase")]
pub async fn get_script_run_logs(
    run_id: String,
    state: State<'_, AppState>,
) -> Result<String, String> {
    state
        .script_service
        .get_run_logs(&run_id)
        .await
        .map_err(|e| e.to_string())
}
