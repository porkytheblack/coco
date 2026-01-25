use crate::db::DbPool;
use crate::error::{CocoError, Result};
use crate::types::EnvironmentVariable;
use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Nonce,
};
use chrono::{DateTime, Utc};
use rand::Rng;
use std::collections::HashMap;
use uuid::Uuid;

// Reuse the same encryption key derivation as wallet_service
// In production, this would use proper key management
fn get_encryption_key() -> [u8; 32] {
    let mut key = [0u8; 32];
    key.copy_from_slice(b"coco_dev_key_32bytes_placeholder");
    key
}

fn encrypt_value(value: &str) -> Result<Vec<u8>> {
    let key = get_encryption_key();
    let cipher = Aes256Gcm::new_from_slice(&key)
        .map_err(|e| CocoError::Crypto(format!("Failed to create cipher: {}", e)))?;

    let mut rng = rand::thread_rng();
    let mut nonce_bytes = [0u8; 12];
    rng.fill(&mut nonce_bytes);
    let nonce = Nonce::from_slice(&nonce_bytes);

    let ciphertext = cipher
        .encrypt(nonce, value.as_bytes())
        .map_err(|e| CocoError::Crypto(format!("Encryption failed: {}", e)))?;

    // Prepend nonce to ciphertext
    let mut result = nonce_bytes.to_vec();
    result.extend(ciphertext);
    Ok(result)
}

fn decrypt_value(encrypted: &[u8]) -> Result<String> {
    if encrypted.len() < 12 {
        return Err(CocoError::Crypto("Invalid encrypted data".to_string()));
    }

    let key = get_encryption_key();
    let cipher = Aes256Gcm::new_from_slice(&key)
        .map_err(|e| CocoError::Crypto(format!("Failed to create cipher: {}", e)))?;

    let nonce = Nonce::from_slice(&encrypted[..12]);
    let ciphertext = &encrypted[12..];

    let plaintext = cipher
        .decrypt(nonce, ciphertext)
        .map_err(|e| CocoError::Crypto(format!("Decryption failed: {}", e)))?;

    String::from_utf8(plaintext).map_err(|e| CocoError::Crypto(format!("Invalid UTF-8: {}", e)))
}

pub struct EnvService {
    db: DbPool,
}

impl EnvService {
    pub fn new(db: DbPool) -> Self {
        Self { db }
    }

    /// List all environment variables for a workspace (without values)
    pub async fn list_env_vars(&self, workspace_id: &str) -> Result<Vec<EnvironmentVariable>> {
        let rows = sqlx::query_as::<_, EnvVarRow>(
            "SELECT id, workspace_id, key, description, created_at FROM environment_variables WHERE workspace_id = ? ORDER BY key",
        )
        .bind(workspace_id)
        .fetch_all(&self.db)
        .await
        .map_err(|e| CocoError::Database(e.to_string()))?;

        Ok(rows.into_iter().map(EnvironmentVariable::from).collect())
    }

    /// Get a single environment variable (without value)
    pub async fn get_env_var(&self, id: &str) -> Result<EnvironmentVariable> {
        let row = sqlx::query_as::<_, EnvVarRow>(
            "SELECT id, workspace_id, key, description, created_at FROM environment_variables WHERE id = ?",
        )
        .bind(id)
        .fetch_optional(&self.db)
        .await
        .map_err(|e| CocoError::Database(e.to_string()))?;

        row.map(EnvironmentVariable::from)
            .ok_or_else(|| CocoError::NotFound(format!("Environment variable not found: {}", id)))
    }

    /// Get a single environment variable by key (without value)
    pub async fn get_env_var_by_key(
        &self,
        workspace_id: &str,
        key: &str,
    ) -> Result<EnvironmentVariable> {
        let row = sqlx::query_as::<_, EnvVarRow>(
            "SELECT id, workspace_id, key, description, created_at FROM environment_variables WHERE workspace_id = ? AND key = ?",
        )
        .bind(workspace_id)
        .bind(key)
        .fetch_optional(&self.db)
        .await
        .map_err(|e| CocoError::Database(e.to_string()))?;

        row.map(EnvironmentVariable::from).ok_or_else(|| {
            CocoError::NotFound(format!(
                "Environment variable not found: {} in workspace {}",
                key, workspace_id
            ))
        })
    }

    /// Get the decrypted value for an environment variable
    pub async fn get_env_value(&self, workspace_id: &str, key: &str) -> Result<String> {
        let row: Option<(Vec<u8>,)> = sqlx::query_as(
            "SELECT value FROM environment_variables WHERE workspace_id = ? AND key = ?",
        )
        .bind(workspace_id)
        .bind(key)
        .fetch_optional(&self.db)
        .await
        .map_err(|e| CocoError::Database(e.to_string()))?;

        match row {
            Some((encrypted,)) => decrypt_value(&encrypted),
            None => Err(CocoError::NotFound(format!(
                "Environment variable not found: {} in workspace {}",
                key, workspace_id
            ))),
        }
    }

    /// Get decrypted values for multiple keys (for script execution)
    pub async fn get_env_values(
        &self,
        workspace_id: &str,
        keys: &[String],
    ) -> Result<HashMap<String, String>> {
        let mut result = HashMap::new();

        for key in keys {
            match self.get_env_value(workspace_id, key).await {
                Ok(value) => {
                    result.insert(key.clone(), value);
                }
                Err(CocoError::NotFound(_)) => {
                    // Skip missing keys
                    continue;
                }
                Err(e) => return Err(e),
            }
        }

        Ok(result)
    }

    /// Get all decrypted values for a workspace (internal use only)
    pub async fn get_all_env_values(&self, workspace_id: &str) -> Result<HashMap<String, String>> {
        let rows: Vec<(String, Vec<u8>)> = sqlx::query_as(
            "SELECT key, value FROM environment_variables WHERE workspace_id = ?",
        )
        .bind(workspace_id)
        .fetch_all(&self.db)
        .await
        .map_err(|e| CocoError::Database(e.to_string()))?;

        let mut result = HashMap::new();
        for (key, encrypted) in rows {
            let value = decrypt_value(&encrypted)?;
            result.insert(key, value);
        }

        Ok(result)
    }

    /// Create a new environment variable
    pub async fn create_env_var(
        &self,
        workspace_id: &str,
        key: &str,
        value: &str,
        description: Option<&str>,
    ) -> Result<EnvironmentVariable> {
        // Validate key format (alphanumeric + underscore, starts with letter or underscore)
        if !is_valid_env_key(key) {
            return Err(CocoError::Validation(format!(
                "Invalid environment variable key: {}. Must start with letter or underscore, and contain only alphanumeric characters and underscores.",
                key
            )));
        }

        let id = Uuid::new_v4().to_string();
        let created_at = Utc::now();
        let encrypted_value = encrypt_value(value)?;

        sqlx::query(
            "INSERT INTO environment_variables (id, workspace_id, key, value, description, created_at) VALUES (?, ?, ?, ?, ?, ?)",
        )
        .bind(&id)
        .bind(workspace_id)
        .bind(key)
        .bind(&encrypted_value)
        .bind(description)
        .bind(created_at.to_rfc3339())
        .execute(&self.db)
        .await
        .map_err(|e| {
            if e.to_string().contains("UNIQUE constraint failed") {
                CocoError::Validation(format!(
                    "Environment variable '{}' already exists in this workspace",
                    key
                ))
            } else {
                CocoError::Database(e.to_string())
            }
        })?;

        Ok(EnvironmentVariable {
            id,
            workspace_id: workspace_id.to_string(),
            key: key.to_string(),
            description: description.map(String::from),
            created_at,
        })
    }

    /// Update an environment variable
    pub async fn update_env_var(
        &self,
        id: &str,
        key: Option<&str>,
        value: Option<&str>,
        description: Option<&str>,
    ) -> Result<EnvironmentVariable> {
        // Validate key if provided
        if let Some(k) = key {
            if !is_valid_env_key(k) {
                return Err(CocoError::Validation(format!(
                    "Invalid environment variable key: {}",
                    k
                )));
            }
        }

        let mut updates = Vec::new();
        let mut has_key = false;
        let mut has_value = false;
        let mut has_desc = false;

        if key.is_some() {
            updates.push("key = ?");
            has_key = true;
        }
        if value.is_some() {
            updates.push("value = ?");
            has_value = true;
        }
        if description.is_some() {
            updates.push("description = ?");
            has_desc = true;
        }

        if updates.is_empty() {
            return self.get_env_var(id).await;
        }

        let query = format!(
            "UPDATE environment_variables SET {} WHERE id = ?",
            updates.join(", ")
        );

        let mut q = sqlx::query(&query);

        if has_key {
            q = q.bind(key.unwrap());
        }
        if has_value {
            let encrypted = encrypt_value(value.unwrap())?;
            q = q.bind(encrypted);
        }
        if has_desc {
            q = q.bind(description.unwrap());
        }

        q.bind(id)
            .execute(&self.db)
            .await
            .map_err(|e| CocoError::Database(e.to_string()))?;

        self.get_env_var(id).await
    }

    /// Delete an environment variable
    pub async fn delete_env_var(&self, id: &str) -> Result<()> {
        let result = sqlx::query("DELETE FROM environment_variables WHERE id = ?")
            .bind(id)
            .execute(&self.db)
            .await
            .map_err(|e| CocoError::Database(e.to_string()))?;

        if result.rows_affected() == 0 {
            return Err(CocoError::NotFound(format!(
                "Environment variable not found: {}",
                id
            )));
        }

        Ok(())
    }

    /// Delete an environment variable by key
    pub async fn delete_env_var_by_key(&self, workspace_id: &str, key: &str) -> Result<()> {
        let result = sqlx::query(
            "DELETE FROM environment_variables WHERE workspace_id = ? AND key = ?",
        )
        .bind(workspace_id)
        .bind(key)
        .execute(&self.db)
        .await
        .map_err(|e| CocoError::Database(e.to_string()))?;

        if result.rows_affected() == 0 {
            return Err(CocoError::NotFound(format!(
                "Environment variable not found: {} in workspace {}",
                key, workspace_id
            )));
        }

        Ok(())
    }
}

/// Validate environment variable key format
fn is_valid_env_key(key: &str) -> bool {
    if key.is_empty() {
        return false;
    }

    let mut chars = key.chars();

    // First character must be letter or underscore
    match chars.next() {
        Some(c) if c.is_ascii_alphabetic() || c == '_' => {}
        _ => return false,
    }

    // Rest must be alphanumeric or underscore
    chars.all(|c| c.is_ascii_alphanumeric() || c == '_')
}

// Helper struct for SQLx
#[derive(sqlx::FromRow)]
struct EnvVarRow {
    id: String,
    workspace_id: String,
    key: String,
    description: Option<String>,
    created_at: String,
}

impl From<EnvVarRow> for EnvironmentVariable {
    fn from(row: EnvVarRow) -> Self {
        EnvironmentVariable {
            id: row.id,
            workspace_id: row.workspace_id,
            key: row.key,
            description: row.description,
            created_at: row
                .created_at
                .parse::<DateTime<Utc>>()
                .unwrap_or_else(|_| Utc::now()),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_valid_env_keys() {
        assert!(is_valid_env_key("MY_VAR"));
        assert!(is_valid_env_key("_PRIVATE"));
        assert!(is_valid_env_key("API_KEY_123"));
        assert!(is_valid_env_key("a"));
        assert!(is_valid_env_key("A"));
        assert!(is_valid_env_key("_"));
    }

    #[test]
    fn test_invalid_env_keys() {
        assert!(!is_valid_env_key(""));
        assert!(!is_valid_env_key("123_VAR")); // starts with number
        assert!(!is_valid_env_key("MY-VAR")); // contains hyphen
        assert!(!is_valid_env_key("MY VAR")); // contains space
        assert!(!is_valid_env_key("my.var")); // contains dot
    }
}
