use crate::error::CocoError;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use sqlx::postgres::PgPoolOptions;
use std::time::Duration;

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PostgresConfig {
    pub connection_string: String,
    pub ssl: Option<bool>,
    pub ssl_mode: Option<String>,
    pub connection_timeout: Option<u64>,
    pub query_timeout: Option<u64>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct QueryInput {
    pub query: String,
    pub params: Option<Value>, // Can be Array or String (if stringified)
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ExecuteInput {
    pub sql: String,
    pub params: Option<Value>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct InsertInput {
    pub table: String,
    pub columns: String, // Comma separated
    pub params: Option<Value>, // Array of values
}


pub struct PostgresAdapter;

impl PostgresAdapter {
    pub async fn execute(
        config: PostgresConfig,
        operation: &str,
        input: Value,
    ) -> Result<Value, CocoError> {
        let timeout = Duration::from_millis(config.connection_timeout.unwrap_or(5000));
        
        // Handle Env Var substitution in connection string if needed (though Frontend usually handles it)
        // If config.connection_string contains {{...}}, we assume it was NOT resolved.
        // But backend receives resolved config.
        
        let pool = PgPoolOptions::new()
            .acquire_timeout(timeout)
            .connect(&config.connection_string)
            .await
            .map_err(|e| CocoError::Adapter(format!("Failed to connect: {}", e)))?;

        let result = match operation {
             "query" => {
                let input: QueryInput = serde_json::from_value(input)
                    .map_err(|e| CocoError::Validation(format!("Invalid query input: {}", e)))?;
                let params = Self::parse_params(input.params)?;
                Self::execute_query(&pool, &input.query, params).await?
            },
            "execute" => {
                let input: ExecuteInput = serde_json::from_value(input)
                    .map_err(|e| CocoError::Validation(format!("Invalid execute input: {}", e)))?;
                let params = Self::parse_params(input.params)?;
                Self::execute_cmd(&pool, &input.sql, params).await?
            },
            "insert" => {
                 let input: InsertInput = serde_json::from_value(input)
                     .map_err(|e| CocoError::Validation(format!("Invalid insert input: {}", e)))?;
                 
                 // Generate SQL
                 // columns: "name, email" -> "name, email"
                 // values: ($1, $2, ...) based on params length
                 let params = Self::parse_params(input.params)?.unwrap_or_default();
                 
                 let placeholders: Vec<String> = (1..=params.len()).map(|i| format!("${}", i)).collect();
                 let sql = format!("INSERT INTO {} ({}) VALUES ({})", input.table, input.columns, placeholders.join(", "));
                 
                 Self::execute_cmd(&pool, &sql, Some(params)).await?
            },
            _ => return Err(CocoError::Adapter(format!("Unknown operation: {}", operation))),
        };

        pool.close().await;
        Ok(result)
    }
    
    fn parse_params(params: Option<Value>) -> Result<Option<Vec<Value>>, CocoError> {
        match params {
            Some(Value::Array(arr)) => Ok(Some(arr)),
            Some(Value::String(s)) => {
                let trimmed = s.trim();
                if trimmed.is_empty() {
                    return Ok(None);
                }
                if trimmed.starts_with('[') {
                     let arr: Vec<Value> = serde_json::from_str(trimmed)
                         .map_err(|e| CocoError::Validation(format!("Failed to parse params string: {}", e)))?;
                     Ok(Some(arr))
                } else {
                     Err(CocoError::Validation("Params must be a JSON array or stringified JSON array".to_string()))
                }
            },
            None => Ok(None),
            _ => Err(CocoError::Validation("Invalid params format".to_string())),
        }
    }

    async fn execute_query(
        pool: &sqlx::PgPool,
        sql: &str,
        params: Option<Vec<Value>>,
    ) -> Result<Value, CocoError> {
        use sqlx::{Column, Row, TypeInfo};
        let mut query_builder = sqlx::query(sql);

        if let Some(params) = params {
            for param in params {
                match param {
                    Value::String(s) => query_builder = query_builder.bind(s),
                    Value::Number(n) => {
                        if let Some(i) = n.as_i64() {
                            query_builder = query_builder.bind(i);
                        } else {
                            query_builder = query_builder.bind(n.as_f64().unwrap_or(0.0));
                        }
                    },
                    Value::Bool(b) => query_builder = query_builder.bind(b),
                    _ => query_builder = query_builder.bind(param.to_string()),
                }
            }
        }

        let rows = query_builder
            .fetch_all(pool)
            .await
            .map_err(|e| CocoError::Adapter(format!("Query failed: {}", e)))?;

        let mut json_rows = Vec::new();
        for row in rows {
            let mut map = serde_json::Map::new();
            for col in row.columns() {
                let name = col.name();
                let type_info = col.type_info();
                let type_name = type_info.name();

                let value = match type_name {
                    "BOOL" => row.try_get::<bool, _>(name).map(Value::Bool).unwrap_or(Value::Null),
                    "INT2" | "SMALLINT" | "SMALLSERIAL" => row.try_get::<i16, _>(name).map(|i| Value::Number(i.into())).unwrap_or(Value::Null),
                    "INT4" | "INTEGER" | "SERIAL" => row.try_get::<i32, _>(name).map(|i| Value::Number(i.into())).unwrap_or(Value::Null),
                    "INT8" | "BIGINT" | "BIGSERIAL" => row.try_get::<i64, _>(name).map(|i| Value::Number(i.into())).unwrap_or(Value::Null),
                    "FLOAT4" | "REAL" => row.try_get::<f32, _>(name).map(|f| serde_json::Number::from_f64(f as f64).map(Value::Number).unwrap_or(Value::Null)).unwrap_or(Value::Null),
                    "FLOAT8" | "DOUBLE PRECISION" => row.try_get::<f64, _>(name).map(|f| serde_json::Number::from_f64(f).map(Value::Number).unwrap_or(Value::Null)).unwrap_or(Value::Null),
                    "VARCHAR" | "TEXT" | "CHAR" | "BPCHAR" | "NAME" | "UNKNOWN" => row.try_get::<String, _>(name).map(Value::String).unwrap_or(Value::Null),
                    "JSON" | "JSONB" => row.try_get::<Value, _>(name).unwrap_or(Value::Null),
                    _ => {
                        // Fallback: try to get as string for dates, uuids, etc.
                        row.try_get::<String, _>(name).map(Value::String).unwrap_or_else(|_| {
                            // If string decoding fails, last resort is Null or raw bytes check (skipped for now)
                            Value::Null
                        })
                    }
                };
                map.insert(name.to_string(), value);
            }
            json_rows.push(Value::Object(map));
        }

        Ok(Value::Array(json_rows))
    }

    async fn execute_cmd(
        pool: &sqlx::PgPool,
        sql: &str,
        params: Option<Vec<Value>>,
    ) -> Result<Value, CocoError> {
        let mut query_builder = sqlx::query(sql);
        
        if let Some(params) = params {
             for param in params {
                match param {
                    Value::String(s) => query_builder = query_builder.bind(s),
                    Value::Number(n) => {
                        if let Some(i) = n.as_i64() {
                             query_builder = query_builder.bind(i);
                        } else {
                             query_builder = query_builder.bind(n.as_f64().unwrap_or(0.0));
                        }
                    },
                    Value::Bool(b) => query_builder = query_builder.bind(b),
                    _ => query_builder = query_builder.bind(param.to_string()),
                }
             }
        }

        let result = query_builder
            .execute(pool)
            .await
            .map_err(|e| CocoError::Adapter(format!("Execution failed: {}", e)))?;

        Ok(serde_json::json!({
            "rows_affected": result.rows_affected()
        }))
    }
}
