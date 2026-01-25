use crate::adapters::postgres::{PostgresAdapter, PostgresConfig};
use crate::error::CocoError;
use serde_json::Value;

#[tauri::command(rename_all = "camelCase")]
pub async fn execute_adapter(
    adapter_id: String,
    operation: String,
    config: Value,
    input: Value,
) -> Result<Value, CocoError> {
    match adapter_id.as_str() {
        "postgres" => {
            let config: PostgresConfig = serde_json::from_value(config)
                .map_err(|e| CocoError::Validation(format!("Invalid postgres config: {}", e)))?;
            PostgresAdapter::execute(config, &operation, input).await
        },
        _ => Err(CocoError::Adapter(format!("Unknown adapter: {}", adapter_id))),
    }
}
