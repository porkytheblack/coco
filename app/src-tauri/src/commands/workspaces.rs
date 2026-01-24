use tauri::State;

use crate::types::{Contract, ContractWithChain, Transaction, TransactionRun, Workspace};
use crate::AppState;

#[tauri::command]
pub async fn list_workspaces(
    chain_id: String,
    state: State<'_, AppState>,
) -> Result<Vec<Workspace>, String> {
    state
        .workspace_service
        .list_workspaces(&chain_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_workspace(
    workspace_id: String,
    state: State<'_, AppState>,
) -> Result<Workspace, String> {
    state
        .workspace_service
        .get_workspace(&workspace_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn create_workspace(
    chain_id: String,
    name: String,
    path: Option<String>,
    state: State<'_, AppState>,
) -> Result<Workspace, String> {
    state
        .workspace_service
        .create_workspace(&chain_id, &name, path.as_deref())
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_workspace(
    workspace_id: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    state
        .workspace_service
        .delete_workspace(&workspace_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn list_contracts(
    workspace_id: String,
    state: State<'_, AppState>,
) -> Result<Vec<Contract>, String> {
    state
        .workspace_service
        .list_contracts(&workspace_id)
        .await
        .map_err(|e| e.to_string())
}

/// List contracts from other chains of the same blockchain (for contract reuse)
#[tauri::command(rename_all = "camelCase")]
pub async fn list_reusable_contracts(
    blockchain: String,
    exclude_chain_id: String,
    state: State<'_, AppState>,
) -> Result<Vec<ContractWithChain>, String> {
    state
        .workspace_service
        .list_reusable_contracts(&blockchain, &exclude_chain_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn discover_contracts(
    workspace_id: String,
    state: State<'_, AppState>,
) -> Result<Vec<Contract>, String> {
    state
        .workspace_service
        .discover_contracts(&workspace_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command(rename_all = "camelCase")]
pub async fn add_contract(
    workspace_id: String,
    name: String,
    address: Option<String>,
    interface_type: Option<String>,
    abi: Option<String>,
    idl: Option<String>,
    move_definition: Option<String>,
    state: State<'_, AppState>,
) -> Result<Contract, String> {
    state
        .workspace_service
        .add_contract(
            &workspace_id,
            &name,
            address.as_deref(),
            interface_type.as_deref().unwrap_or("abi"),
            abi.as_deref(),
            idl.as_deref(),
            move_definition.as_deref(),
        )
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_contract(
    contract_id: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    state
        .workspace_service
        .delete_contract(&contract_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command(rename_all = "camelCase")]
pub async fn update_contract(
    contract_id: String,
    name: String,
    address: Option<String>,
    interface_type: Option<String>,
    abi: Option<String>,
    idl: Option<String>,
    move_definition: Option<String>,
    state: State<'_, AppState>,
) -> Result<Contract, String> {
    state
        .workspace_service
        .update_contract(
            &contract_id,
            &name,
            address.as_deref(),
            interface_type.as_deref().unwrap_or("abi"),
            abi.as_deref(),
            idl.as_deref(),
            move_definition.as_deref(),
        )
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn list_transactions(
    workspace_id: String,
    state: State<'_, AppState>,
) -> Result<Vec<Transaction>, String> {
    state
        .workspace_service
        .list_transactions(&workspace_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn create_transaction(
    workspace_id: String,
    name: String,
    contract_id: Option<String>,
    function_name: Option<String>,
    state: State<'_, AppState>,
) -> Result<Transaction, String> {
    state
        .workspace_service
        .create_transaction(&workspace_id, &name, contract_id.as_deref(), function_name.as_deref())
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_transaction(
    transaction_id: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    state
        .workspace_service
        .delete_transaction(&transaction_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_transaction(
    transaction_id: String,
    name: Option<String>,
    contract_id: Option<String>,
    function_name: Option<String>,
    args: Option<String>,
    state: State<'_, AppState>,
) -> Result<Transaction, String> {
    state
        .workspace_service
        .update_transaction(
            &transaction_id,
            name.as_deref(),
            contract_id.as_deref(),
            function_name.as_deref(),
            args.as_deref(),
        )
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn execute_transaction(
    transaction_id: String,
    payload: serde_json::Value,
    wallet_id: String,
    state: State<'_, AppState>,
) -> Result<TransactionRun, String> {
    state
        .workspace_service
        .execute_transaction(&transaction_id, payload, &wallet_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn save_transaction_run(
    run: TransactionRun,
    state: State<'_, AppState>,
) -> Result<TransactionRun, String> {
    state
        .workspace_service
        .save_transaction_run(&run)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn list_transaction_runs(
    transaction_id: String,
    state: State<'_, AppState>,
) -> Result<Vec<TransactionRun>, String> {
    state
        .workspace_service
        .list_transaction_runs(&transaction_id)
        .await
        .map_err(|e| e.to_string())
}
