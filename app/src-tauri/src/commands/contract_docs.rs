use tauri::State;

use crate::types::ContractDoc;
use crate::AppState;

#[tauri::command(rename_all = "camelCase")]
pub async fn get_contract_docs(
    contract_id: String,
    state: State<'_, AppState>,
) -> Result<Vec<ContractDoc>, String> {
    state
        .contract_doc_service
        .get_docs(&contract_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command(rename_all = "camelCase")]
pub async fn get_function_doc(
    contract_id: String,
    function_name: String,
    state: State<'_, AppState>,
) -> Result<Option<ContractDoc>, String> {
    state
        .contract_doc_service
        .get_function_doc(&contract_id, &function_name)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command(rename_all = "camelCase")]
pub async fn upsert_contract_doc(
    contract_id: String,
    function_name: String,
    description: Option<String>,
    notes: Option<String>,
    state: State<'_, AppState>,
) -> Result<ContractDoc, String> {
    state
        .contract_doc_service
        .upsert_doc(
            &contract_id,
            &function_name,
            description.as_deref(),
            notes.as_deref(),
        )
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command(rename_all = "camelCase")]
pub async fn delete_contract_doc(doc_id: String, state: State<'_, AppState>) -> Result<(), String> {
    state
        .contract_doc_service
        .delete_doc(&doc_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command(rename_all = "camelCase")]
pub async fn delete_function_doc(
    contract_id: String,
    function_name: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    state
        .contract_doc_service
        .delete_function_doc(&contract_id, &function_name)
        .await
        .map_err(|e| e.to_string())
}
