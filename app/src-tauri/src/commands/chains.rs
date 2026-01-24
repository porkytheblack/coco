use tauri::State;

use crate::types::{Chain, Ecosystem, NetworkType};
use crate::AppState;

#[tauri::command]
pub async fn list_chains(state: State<'_, AppState>) -> Result<Vec<Chain>, String> {
    state
        .chain_service
        .list_chains()
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_chain(chain_id: String, state: State<'_, AppState>) -> Result<Chain, String> {
    state
        .chain_service
        .get_chain(&chain_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command(rename_all = "camelCase")]
pub async fn create_chain(
    request: CreateChainRequest,
    state: State<'_, AppState>,
) -> Result<Chain, String> {
    let chain = Chain {
        id: request.id.unwrap_or_else(|| format!("{}-{}", request.blockchain, request.network_type)),
        name: request.name,
        ecosystem: request.ecosystem,
        rpc_url: request.rpc_url,
        explorer_url: request.explorer_url,
        explorer_api_url: request.explorer_api_url,
        explorer_api_key: None,
        is_testnet: request.network_type != "mainnet",
        currency_symbol: request.currency_symbol,
        currency_decimals: request.currency_decimals.unwrap_or(18),
        blockchain: request.blockchain,
        network_type: string_to_network_type(&request.network_type),
        is_custom: request.is_custom.unwrap_or(true),
        icon_id: request.icon_id,
    };

    state
        .chain_service
        .create_chain(chain)
        .await
        .map_err(|e| e.to_string())
}

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateChainRequest {
    pub id: Option<String>,
    pub name: String,
    pub ecosystem: Ecosystem,
    pub rpc_url: String,
    pub chain_id_numeric: Option<u64>,
    pub currency_symbol: String,
    pub currency_decimals: Option<u8>,
    pub explorer_url: Option<String>,
    pub explorer_api_url: Option<String>,
    pub faucet_url: Option<String>,
    pub blockchain: String,
    pub network_type: String,
    pub is_custom: Option<bool>,
    pub icon_id: Option<String>,
}

fn string_to_network_type(s: &str) -> NetworkType {
    match s {
        "mainnet" => NetworkType::Mainnet,
        "testnet" => NetworkType::Testnet,
        "devnet" => NetworkType::Devnet,
        _ => NetworkType::Custom,
    }
}

#[tauri::command(rename_all = "camelCase")]
pub async fn update_chain(
    chain_id: String,
    name: String,
    rpc_url: String,
    explorer_url: Option<String>,
    explorer_api_url: Option<String>,
    explorer_api_key: Option<String>,
    state: State<'_, AppState>,
) -> Result<Chain, String> {
    // Get existing chain to preserve ecosystem and other fields
    let existing = state
        .chain_service
        .get_chain(&chain_id)
        .await
        .map_err(|e| e.to_string())?;

    let updated = Chain {
        id: chain_id.clone(),
        name,
        ecosystem: existing.ecosystem,
        rpc_url,
        explorer_url,
        explorer_api_url,
        explorer_api_key,
        is_testnet: existing.is_testnet,
        currency_symbol: existing.currency_symbol,
        currency_decimals: existing.currency_decimals,
        blockchain: existing.blockchain,
        network_type: existing.network_type,
        is_custom: existing.is_custom,
        icon_id: existing.icon_id,
    };

    state
        .chain_service
        .update_chain(&chain_id, updated)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command(rename_all = "camelCase")]
pub async fn delete_chain(chain_id: String, state: State<'_, AppState>) -> Result<(), String> {
    state
        .chain_service
        .delete_chain(&chain_id)
        .await
        .map_err(|e| e.to_string())
}
