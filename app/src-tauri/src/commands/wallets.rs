use tauri::State;

use crate::types::{Ecosystem, Wallet, WalletType, WalletWithChain};
use crate::AppState;

#[tauri::command]
pub async fn list_wallets(
    chain_id: String,
    state: State<'_, AppState>,
) -> Result<Vec<Wallet>, String> {
    state
        .wallet_service
        .list_wallets(&chain_id)
        .await
        .map_err(|e| e.to_string())
}

/// List wallets from other chains of the same blockchain (for wallet reuse feature)
#[tauri::command(rename_all = "camelCase")]
pub async fn list_reusable_wallets(
    blockchain: String,
    exclude_chain_id: String,
    state: State<'_, AppState>,
) -> Result<Vec<WalletWithChain>, String> {
    state
        .wallet_service
        .list_wallets_by_blockchain(&blockchain, &exclude_chain_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_wallet(
    chain_id: String,
    wallet_id: String,
    state: State<'_, AppState>,
) -> Result<Wallet, String> {
    state
        .wallet_service
        .get_wallet(&chain_id, &wallet_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn create_wallet(
    chain_id: String,
    name: String,
    wallet_type: WalletType,
    address: Option<String>,
    private_key: Option<String>,
    public_key: Option<String>,
    state: State<'_, AppState>,
) -> Result<Wallet, String> {
    state
        .wallet_service
        .create_wallet(&chain_id, &name, wallet_type, address.as_deref(), private_key.as_deref(), public_key.as_deref())
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn import_wallet(
    chain_id: String,
    name: String,
    address: String,
    private_key: Option<String>,
    wallet_type: WalletType,
    ecosystem: Option<Ecosystem>,
    state: State<'_, AppState>,
) -> Result<Wallet, String> {
    state
        .wallet_service
        .import_wallet(
            &chain_id,
            &name,
            &address,
            private_key.as_deref(),
            wallet_type,
            ecosystem.unwrap_or(Ecosystem::Evm),
        )
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_wallet_private_key(
    wallet_id: String,
    state: State<'_, AppState>,
) -> Result<String, String> {
    state
        .wallet_service
        .get_wallet_private_key(&wallet_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_wallet(
    chain_id: String,
    wallet_id: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    state
        .wallet_service
        .delete_wallet(&chain_id, &wallet_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn refresh_balance(
    chain_id: String,
    wallet_id: String,
    state: State<'_, AppState>,
) -> Result<Wallet, String> {
    state
        .wallet_service
        .refresh_balance(&chain_id, &wallet_id)
        .await
        .map_err(|e| e.to_string())
}
