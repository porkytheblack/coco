use tauri::State;

use crate::types::EnvironmentVariable;
use crate::AppState;

#[tauri::command(rename_all = "camelCase")]
pub async fn list_env_vars(
    workspace_id: String,
    state: State<'_, AppState>,
) -> Result<Vec<EnvironmentVariable>, String> {
    state
        .env_service
        .list_env_vars(&workspace_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command(rename_all = "camelCase")]
pub async fn get_env_var(id: String, state: State<'_, AppState>) -> Result<EnvironmentVariable, String> {
    state
        .env_service
        .get_env_var(&id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command(rename_all = "camelCase")]
pub async fn get_env_value(
    workspace_id: String,
    key: String,
    state: State<'_, AppState>,
) -> Result<String, String> {
    state
        .env_service
        .get_env_value(&workspace_id, &key)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command(rename_all = "camelCase")]
pub async fn create_env_var(
    workspace_id: String,
    key: String,
    value: String,
    description: Option<String>,
    state: State<'_, AppState>,
) -> Result<EnvironmentVariable, String> {
    state
        .env_service
        .create_env_var(&workspace_id, &key, &value, description.as_deref())
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command(rename_all = "camelCase")]
pub async fn update_env_var(
    id: String,
    key: Option<String>,
    value: Option<String>,
    description: Option<String>,
    state: State<'_, AppState>,
) -> Result<EnvironmentVariable, String> {
    state
        .env_service
        .update_env_var(&id, key.as_deref(), value.as_deref(), description.as_deref())
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command(rename_all = "camelCase")]
pub async fn delete_env_var(id: String, state: State<'_, AppState>) -> Result<(), String> {
    state
        .env_service
        .delete_env_var(&id)
        .await
        .map_err(|e| e.to_string())
}
