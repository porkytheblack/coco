use crate::db::DbPool;
use crate::error::{CocoError, Result};
use crate::types::Preference;
use chrono::{DateTime, Utc};
use uuid::Uuid;

pub struct PreferenceService {
    db: DbPool,
}

impl PreferenceService {
    pub fn new(db: DbPool) -> Self {
        Self { db }
    }

    /// Get a preference by key
    pub async fn get(&self, key: &str) -> Result<Option<serde_json::Value>> {
        let row: Option<(String,)> =
            sqlx::query_as("SELECT value FROM preferences WHERE key = ?")
                .bind(key)
                .fetch_optional(&self.db)
                .await
                .map_err(|e| CocoError::Database(e.to_string()))?;

        match row {
            Some((value,)) => {
                let parsed = serde_json::from_str(&value)
                    .map_err(|e| CocoError::Serialization(e.to_string()))?;
                Ok(Some(parsed))
            }
            None => Ok(None),
        }
    }

    /// Get a preference with a default value if not found
    pub async fn get_or_default(
        &self,
        key: &str,
        default: serde_json::Value,
    ) -> Result<serde_json::Value> {
        match self.get(key).await? {
            Some(value) => Ok(value),
            None => Ok(default),
        }
    }

    /// Set a preference (insert or update)
    pub async fn set(&self, key: &str, value: serde_json::Value) -> Result<()> {
        let value_str =
            serde_json::to_string(&value).map_err(|e| CocoError::Serialization(e.to_string()))?;

        let now = Utc::now().to_rfc3339();

        // Use upsert (INSERT OR REPLACE)
        sqlx::query(
            r#"
            INSERT INTO preferences (id, key, value, updated_at)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(key) DO UPDATE SET
                value = excluded.value,
                updated_at = excluded.updated_at
            "#,
        )
        .bind(Uuid::new_v4().to_string())
        .bind(key)
        .bind(&value_str)
        .bind(&now)
        .execute(&self.db)
        .await
        .map_err(|e| CocoError::Database(e.to_string()))?;

        Ok(())
    }

    /// Delete a preference
    pub async fn delete(&self, key: &str) -> Result<()> {
        let result = sqlx::query("DELETE FROM preferences WHERE key = ?")
            .bind(key)
            .execute(&self.db)
            .await
            .map_err(|e| CocoError::Database(e.to_string()))?;

        if result.rows_affected() == 0 {
            return Err(CocoError::NotFound(format!("Preference not found: {}", key)));
        }

        Ok(())
    }

    /// List all preferences
    pub async fn list_all(&self) -> Result<Vec<Preference>> {
        let rows = sqlx::query_as::<_, PreferenceRow>(
            "SELECT id, key, value, updated_at FROM preferences ORDER BY key",
        )
        .fetch_all(&self.db)
        .await
        .map_err(|e| CocoError::Database(e.to_string()))?;

        rows.into_iter()
            .map(|row| {
                let value: serde_json::Value = serde_json::from_str(&row.value)
                    .map_err(|e| CocoError::Serialization(e.to_string()))?;

                Ok(Preference {
                    id: row.id,
                    key: row.key,
                    value,
                    updated_at: row
                        .updated_at
                        .parse::<DateTime<Utc>>()
                        .unwrap_or_else(|_| Utc::now()),
                })
            })
            .collect()
    }

    /// Check if a preference exists
    pub async fn exists(&self, key: &str) -> Result<bool> {
        let row: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM preferences WHERE key = ?")
            .bind(key)
            .fetch_one(&self.db)
            .await
            .map_err(|e| CocoError::Database(e.to_string()))?;

        Ok(row.0 > 0)
    }

    // ========================================================================
    // Convenience methods for common preferences
    // ========================================================================

    /// Get theme preference
    pub async fn get_theme(&self) -> Result<String> {
        let value = self
            .get_or_default("theme", serde_json::json!("dark"))
            .await?;

        value
            .as_str()
            .map(String::from)
            .ok_or_else(|| CocoError::Serialization("Invalid theme value".to_string()))
    }

    /// Set theme preference
    pub async fn set_theme(&self, theme: &str) -> Result<()> {
        self.set("theme", serde_json::json!(theme)).await
    }

    /// Get AI settings
    pub async fn get_ai_settings(&self) -> Result<Option<serde_json::Value>> {
        self.get("ai_settings").await
    }

    /// Set AI settings
    pub async fn set_ai_settings(&self, settings: serde_json::Value) -> Result<()> {
        self.set("ai_settings", settings).await
    }

    /// Get active workspace ID (for restoring state)
    pub async fn get_active_workspace(&self) -> Result<Option<String>> {
        let value = self.get("active_workspace").await?;
        Ok(value.and_then(|v| v.as_str().map(String::from)))
    }

    /// Set active workspace ID
    pub async fn set_active_workspace(&self, workspace_id: Option<&str>) -> Result<()> {
        match workspace_id {
            Some(id) => self.set("active_workspace", serde_json::json!(id)).await,
            None => {
                // Delete the preference if no workspace is active
                self.delete("active_workspace").await.or(Ok(()))
            }
        }
    }

    /// Get active network ID (for restoring state)
    pub async fn get_active_network(&self) -> Result<Option<String>> {
        let value = self.get("active_network").await?;
        Ok(value.and_then(|v| v.as_str().map(String::from)))
    }

    /// Set active network ID
    pub async fn set_active_network(&self, network_id: Option<&str>) -> Result<()> {
        match network_id {
            Some(id) => self.set("active_network", serde_json::json!(id)).await,
            None => self.delete("active_network").await.or(Ok(())),
        }
    }
}

// Helper struct for SQLx
#[derive(sqlx::FromRow)]
struct PreferenceRow {
    id: String,
    key: String,
    value: String,
    updated_at: String,
}
