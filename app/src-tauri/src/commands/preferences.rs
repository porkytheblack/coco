use tauri::State;

use crate::types::Preference;
use crate::AppState;

#[tauri::command(rename_all = "camelCase")]
pub async fn get_preference(
    key: String,
    state: State<'_, AppState>,
) -> Result<Option<serde_json::Value>, String> {
    state
        .preference_service
        .get(&key)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command(rename_all = "camelCase")]
pub async fn set_preference(
    key: String,
    value: serde_json::Value,
    state: State<'_, AppState>,
) -> Result<(), String> {
    state
        .preference_service
        .set(&key, value)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command(rename_all = "camelCase")]
pub async fn delete_preference(key: String, state: State<'_, AppState>) -> Result<(), String> {
    state
        .preference_service
        .delete(&key)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn list_preferences(state: State<'_, AppState>) -> Result<Vec<Preference>, String> {
    state
        .preference_service
        .list_all()
        .await
        .map_err(|e| e.to_string())
}

// Convenience commands for common preferences

#[tauri::command]
pub async fn get_theme(state: State<'_, AppState>) -> Result<String, String> {
    state
        .preference_service
        .get_theme()
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command(rename_all = "camelCase")]
pub async fn set_theme(theme: String, state: State<'_, AppState>) -> Result<(), String> {
    state
        .preference_service
        .set_theme(&theme)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_ai_settings(
    state: State<'_, AppState>,
) -> Result<Option<serde_json::Value>, String> {
    state
        .preference_service
        .get_ai_settings()
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command(rename_all = "camelCase")]
pub async fn set_ai_settings(
    settings: serde_json::Value,
    state: State<'_, AppState>,
) -> Result<(), String> {
    state
        .preference_service
        .set_ai_settings(settings)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_active_workspace(state: State<'_, AppState>) -> Result<Option<String>, String> {
    state
        .preference_service
        .get_active_workspace()
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command(rename_all = "camelCase")]
pub async fn set_active_workspace(
    workspace_id: Option<String>,
    state: State<'_, AppState>,
) -> Result<(), String> {
    state
        .preference_service
        .set_active_workspace(workspace_id.as_deref())
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_active_network(state: State<'_, AppState>) -> Result<Option<String>, String> {
    state
        .preference_service
        .get_active_network()
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command(rename_all = "camelCase")]
pub async fn set_active_network(
    network_id: Option<String>,
    state: State<'_, AppState>,
) -> Result<(), String> {
    state
        .preference_service
        .set_active_network(network_id.as_deref())
        .await
        .map_err(|e| e.to_string())
}
