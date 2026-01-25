use crate::db::DbPool;
use crate::error::{CocoError, Result};
use crate::types::ContractDoc;
use chrono::{DateTime, Utc};
use uuid::Uuid;

pub struct ContractDocService {
    db: DbPool,
}

impl ContractDocService {
    pub fn new(db: DbPool) -> Self {
        Self { db }
    }

    /// Get all documentation for a contract
    pub async fn get_docs(&self, contract_id: &str) -> Result<Vec<ContractDoc>> {
        let rows = sqlx::query_as::<_, ContractDocRow>(
            "SELECT id, contract_id, function_name, description, notes, updated_at FROM contract_docs WHERE contract_id = ? ORDER BY function_name",
        )
        .bind(contract_id)
        .fetch_all(&self.db)
        .await
        .map_err(|e| CocoError::Database(e.to_string()))?;

        Ok(rows.into_iter().map(ContractDoc::from).collect())
    }

    /// Get documentation for a specific function
    pub async fn get_function_doc(
        &self,
        contract_id: &str,
        function_name: &str,
    ) -> Result<Option<ContractDoc>> {
        let row = sqlx::query_as::<_, ContractDocRow>(
            "SELECT id, contract_id, function_name, description, notes, updated_at FROM contract_docs WHERE contract_id = ? AND function_name = ?",
        )
        .bind(contract_id)
        .bind(function_name)
        .fetch_optional(&self.db)
        .await
        .map_err(|e| CocoError::Database(e.to_string()))?;

        Ok(row.map(ContractDoc::from))
    }

    /// Create or update documentation for a function (upsert)
    pub async fn upsert_doc(
        &self,
        contract_id: &str,
        function_name: &str,
        description: Option<&str>,
        notes: Option<&str>,
    ) -> Result<ContractDoc> {
        let now = Utc::now();

        // Check if doc exists
        let existing = self.get_function_doc(contract_id, function_name).await?;

        if let Some(doc) = existing {
            // Update existing
            sqlx::query(
                "UPDATE contract_docs SET description = ?, notes = ?, updated_at = ? WHERE id = ?",
            )
            .bind(description)
            .bind(notes)
            .bind(now.to_rfc3339())
            .bind(&doc.id)
            .execute(&self.db)
            .await
            .map_err(|e| CocoError::Database(e.to_string()))?;

            Ok(ContractDoc {
                id: doc.id,
                contract_id: contract_id.to_string(),
                function_name: function_name.to_string(),
                description: description.map(String::from),
                notes: notes.map(String::from),
                updated_at: now,
            })
        } else {
            // Insert new
            let id = Uuid::new_v4().to_string();

            sqlx::query(
                "INSERT INTO contract_docs (id, contract_id, function_name, description, notes, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
            )
            .bind(&id)
            .bind(contract_id)
            .bind(function_name)
            .bind(description)
            .bind(notes)
            .bind(now.to_rfc3339())
            .execute(&self.db)
            .await
            .map_err(|e| CocoError::Database(e.to_string()))?;

            Ok(ContractDoc {
                id,
                contract_id: contract_id.to_string(),
                function_name: function_name.to_string(),
                description: description.map(String::from),
                notes: notes.map(String::from),
                updated_at: now,
            })
        }
    }

    /// Delete documentation for a function
    pub async fn delete_doc(&self, id: &str) -> Result<()> {
        let result = sqlx::query("DELETE FROM contract_docs WHERE id = ?")
            .bind(id)
            .execute(&self.db)
            .await
            .map_err(|e| CocoError::Database(e.to_string()))?;

        if result.rows_affected() == 0 {
            return Err(CocoError::NotFound(format!(
                "Contract documentation not found: {}",
                id
            )));
        }

        Ok(())
    }

    /// Delete documentation for a specific function by contract_id and function_name
    pub async fn delete_function_doc(
        &self,
        contract_id: &str,
        function_name: &str,
    ) -> Result<()> {
        let result = sqlx::query(
            "DELETE FROM contract_docs WHERE contract_id = ? AND function_name = ?",
        )
        .bind(contract_id)
        .bind(function_name)
        .execute(&self.db)
        .await
        .map_err(|e| CocoError::Database(e.to_string()))?;

        if result.rows_affected() == 0 {
            return Err(CocoError::NotFound(format!(
                "Contract documentation not found for function: {} in contract {}",
                function_name, contract_id
            )));
        }

        Ok(())
    }

    /// Delete all documentation for a contract
    pub async fn delete_all_docs(&self, contract_id: &str) -> Result<u64> {
        let result = sqlx::query("DELETE FROM contract_docs WHERE contract_id = ?")
            .bind(contract_id)
            .execute(&self.db)
            .await
            .map_err(|e| CocoError::Database(e.to_string()))?;

        Ok(result.rows_affected())
    }

    /// Check if documentation exists for a function
    pub async fn doc_exists(&self, contract_id: &str, function_name: &str) -> Result<bool> {
        let row: (i64,) = sqlx::query_as(
            "SELECT COUNT(*) FROM contract_docs WHERE contract_id = ? AND function_name = ?",
        )
        .bind(contract_id)
        .bind(function_name)
        .fetch_one(&self.db)
        .await
        .map_err(|e| CocoError::Database(e.to_string()))?;

        Ok(row.0 > 0)
    }
}

// Helper struct for SQLx
#[derive(sqlx::FromRow)]
struct ContractDocRow {
    id: String,
    contract_id: String,
    function_name: String,
    description: Option<String>,
    notes: Option<String>,
    updated_at: String,
}

impl From<ContractDocRow> for ContractDoc {
    fn from(row: ContractDocRow) -> Self {
        ContractDoc {
            id: row.id,
            contract_id: row.contract_id,
            function_name: row.function_name,
            description: row.description,
            notes: row.notes,
            updated_at: row
                .updated_at
                .parse::<DateTime<Utc>>()
                .unwrap_or_else(|_| Utc::now()),
        }
    }
}
