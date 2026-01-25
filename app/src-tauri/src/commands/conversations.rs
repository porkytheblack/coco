use tauri::State;

use crate::types::{Conversation, Message};
use crate::AppState;

// ============================================================================
// Conversation commands
// ============================================================================

#[tauri::command(rename_all = "camelCase")]
pub async fn list_conversations(
    workspace_id: Option<String>,
    state: State<'_, AppState>,
) -> Result<Vec<Conversation>, String> {
    state
        .conversation_service
        .list_conversations(workspace_id.as_deref())
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command(rename_all = "camelCase")]
pub async fn get_conversation(
    conversation_id: String,
    state: State<'_, AppState>,
) -> Result<Conversation, String> {
    state
        .conversation_service
        .get_conversation(&conversation_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command(rename_all = "camelCase")]
pub async fn create_conversation(
    workspace_id: Option<String>,
    title: Option<String>,
    state: State<'_, AppState>,
) -> Result<Conversation, String> {
    state
        .conversation_service
        .create_conversation(workspace_id.as_deref(), title.as_deref())
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command(rename_all = "camelCase")]
pub async fn update_conversation(
    conversation_id: String,
    title: Option<String>,
    state: State<'_, AppState>,
) -> Result<Conversation, String> {
    state
        .conversation_service
        .update_conversation(&conversation_id, title.as_deref())
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command(rename_all = "camelCase")]
pub async fn delete_conversation(
    conversation_id: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    state
        .conversation_service
        .delete_conversation(&conversation_id)
        .await
        .map_err(|e| e.to_string())
}

// ============================================================================
// Message commands
// ============================================================================

#[tauri::command(rename_all = "camelCase")]
pub async fn list_messages(
    conversation_id: String,
    state: State<'_, AppState>,
) -> Result<Vec<Message>, String> {
    state
        .conversation_service
        .list_messages(&conversation_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command(rename_all = "camelCase")]
pub async fn get_message(message_id: String, state: State<'_, AppState>) -> Result<Message, String> {
    state
        .conversation_service
        .get_message(&message_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command(rename_all = "camelCase")]
pub async fn add_message(
    conversation_id: String,
    role: String,
    content: String,
    state: State<'_, AppState>,
) -> Result<Message, String> {
    state
        .conversation_service
        .add_message(&conversation_id, &role, &content)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command(rename_all = "camelCase")]
pub async fn delete_message(message_id: String, state: State<'_, AppState>) -> Result<(), String> {
    state
        .conversation_service
        .delete_message(&message_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command(rename_all = "camelCase")]
pub async fn clear_conversation_messages(
    conversation_id: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    state
        .conversation_service
        .clear_messages(&conversation_id)
        .await
        .map_err(|e| e.to_string())
}
