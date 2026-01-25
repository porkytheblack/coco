use tauri::State;

use crate::types::{Blockchain, CreateNetworkInput, Ecosystem, Network, UpdateNetworkInput};
use crate::AppState;

// ============================================================================
// Blockchain commands
// ============================================================================

#[tauri::command]
pub async fn list_blockchains(state: State<'_, AppState>) -> Result<Vec<Blockchain>, String> {
    state
        .blockchain_service
        .list_blockchains()
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command(rename_all = "camelCase")]
pub async fn get_blockchain(
    blockchain_id: String,
    state: State<'_, AppState>,
) -> Result<Blockchain, String> {
    state
        .blockchain_service
        .get_blockchain(&blockchain_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command(rename_all = "camelCase")]
pub async fn create_blockchain(
    id: String,
    name: String,
    ecosystem: Ecosystem,
    icon_id: Option<String>,
    state: State<'_, AppState>,
) -> Result<Blockchain, String> {
    state
        .blockchain_service
        .create_blockchain(&id, &name, ecosystem, icon_id.as_deref())
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command(rename_all = "camelCase")]
pub async fn delete_blockchain(
    blockchain_id: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    state
        .blockchain_service
        .delete_blockchain(&blockchain_id)
        .await
        .map_err(|e| e.to_string())
}

// ============================================================================
// Network commands
// ============================================================================

#[tauri::command(rename_all = "camelCase")]
pub async fn list_networks(
    blockchain_id: String,
    state: State<'_, AppState>,
) -> Result<Vec<Network>, String> {
    state
        .blockchain_service
        .list_networks(&blockchain_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command(rename_all = "camelCase")]
pub async fn get_network(network_id: String, state: State<'_, AppState>) -> Result<Network, String> {
    state
        .blockchain_service
        .get_network(&network_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command(rename_all = "camelCase")]
pub async fn create_network(
    input: CreateNetworkInput,
    state: State<'_, AppState>,
) -> Result<Network, String> {
    state
        .blockchain_service
        .create_network(input)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command(rename_all = "camelCase")]
pub async fn update_network(
    network_id: String,
    input: UpdateNetworkInput,
    state: State<'_, AppState>,
) -> Result<Network, String> {
    state
        .blockchain_service
        .update_network(&network_id, input)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command(rename_all = "camelCase")]
pub async fn delete_network(network_id: String, state: State<'_, AppState>) -> Result<(), String> {
    state
        .blockchain_service
        .delete_network(&network_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command(rename_all = "camelCase")]
pub async fn get_blockchain_ecosystem(
    blockchain_id: String,
    state: State<'_, AppState>,
) -> Result<Ecosystem, String> {
    state
        .blockchain_service
        .get_blockchain_ecosystem(&blockchain_id)
        .await
        .map_err(|e| e.to_string())
}
