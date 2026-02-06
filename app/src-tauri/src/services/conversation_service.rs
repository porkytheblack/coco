use crate::db::DbPool;
use crate::error::{CocoError, Result};
use crate::types::{Conversation, Message, MessageRole};
use chrono::{DateTime, Utc};
use uuid::Uuid;

pub struct ConversationService {
    db: DbPool,
}

impl ConversationService {
    pub fn new(db: DbPool) -> Self {
        Self { db }
    }

    // ========================================================================
    // Conversation operations
    // ========================================================================

    /// List all conversations, optionally filtered by workspace.
    /// When workspace_id is None, returns ALL conversations across all workspaces.
    pub async fn list_conversations(&self, workspace_id: Option<&str>) -> Result<Vec<Conversation>> {
        let rows = if let Some(ws_id) = workspace_id {
            sqlx::query_as::<_, ConversationRow>(
                "SELECT id, workspace_id, title, created_at, updated_at FROM conversations WHERE workspace_id = ? ORDER BY updated_at DESC",
            )
            .bind(ws_id)
            .fetch_all(&self.db)
            .await
        } else {
            sqlx::query_as::<_, ConversationRow>(
                "SELECT id, workspace_id, title, created_at, updated_at FROM conversations ORDER BY updated_at DESC",
            )
            .fetch_all(&self.db)
            .await
        }
        .map_err(|e| CocoError::Database(e.to_string()))?;

        Ok(rows.into_iter().map(Conversation::from).collect())
    }

    /// Get a single conversation by ID
    pub async fn get_conversation(&self, id: &str) -> Result<Conversation> {
        let row = sqlx::query_as::<_, ConversationRow>(
            "SELECT id, workspace_id, title, created_at, updated_at FROM conversations WHERE id = ?",
        )
        .bind(id)
        .fetch_optional(&self.db)
        .await
        .map_err(|e| CocoError::Database(e.to_string()))?;

        row.map(Conversation::from)
            .ok_or_else(|| CocoError::NotFound(format!("Conversation not found: {}", id)))
    }

    /// Create a new conversation
    pub async fn create_conversation(
        &self,
        workspace_id: Option<&str>,
        title: Option<&str>,
    ) -> Result<Conversation> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now();

        sqlx::query(
            "INSERT INTO conversations (id, workspace_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
        )
        .bind(&id)
        .bind(workspace_id)
        .bind(title)
        .bind(now.to_rfc3339())
        .bind(now.to_rfc3339())
        .execute(&self.db)
        .await
        .map_err(|e| CocoError::Database(e.to_string()))?;

        Ok(Conversation {
            id,
            workspace_id: workspace_id.map(String::from),
            title: title.map(String::from),
            created_at: now,
            updated_at: now,
        })
    }

    /// Update a conversation
    pub async fn update_conversation(&self, id: &str, title: Option<&str>) -> Result<Conversation> {
        let now = Utc::now();

        sqlx::query("UPDATE conversations SET title = ?, updated_at = ? WHERE id = ?")
            .bind(title)
            .bind(now.to_rfc3339())
            .bind(id)
            .execute(&self.db)
            .await
            .map_err(|e| CocoError::Database(e.to_string()))?;

        self.get_conversation(id).await
    }

    /// Delete a conversation (cascades to messages)
    pub async fn delete_conversation(&self, id: &str) -> Result<()> {
        let result = sqlx::query("DELETE FROM conversations WHERE id = ?")
            .bind(id)
            .execute(&self.db)
            .await
            .map_err(|e| CocoError::Database(e.to_string()))?;

        if result.rows_affected() == 0 {
            return Err(CocoError::NotFound(format!(
                "Conversation not found: {}",
                id
            )));
        }

        Ok(())
    }

    /// Touch a conversation's updated_at timestamp
    pub async fn touch_conversation(&self, id: &str) -> Result<()> {
        sqlx::query("UPDATE conversations SET updated_at = ? WHERE id = ?")
            .bind(Utc::now().to_rfc3339())
            .bind(id)
            .execute(&self.db)
            .await
            .map_err(|e| CocoError::Database(e.to_string()))?;

        Ok(())
    }

    // ========================================================================
    // Message operations
    // ========================================================================

    /// List all messages in a conversation
    pub async fn list_messages(&self, conversation_id: &str) -> Result<Vec<Message>> {
        let rows = sqlx::query_as::<_, MessageRow>(
            "SELECT id, conversation_id, role, content, created_at FROM messages WHERE conversation_id = ? ORDER BY created_at ASC",
        )
        .bind(conversation_id)
        .fetch_all(&self.db)
        .await
        .map_err(|e| CocoError::Database(e.to_string()))?;

        Ok(rows.into_iter().map(Message::from).collect())
    }

    /// Get a single message by ID
    pub async fn get_message(&self, id: &str) -> Result<Message> {
        let row = sqlx::query_as::<_, MessageRow>(
            "SELECT id, conversation_id, role, content, created_at FROM messages WHERE id = ?",
        )
        .bind(id)
        .fetch_optional(&self.db)
        .await
        .map_err(|e| CocoError::Database(e.to_string()))?;

        row.map(Message::from)
            .ok_or_else(|| CocoError::NotFound(format!("Message not found: {}", id)))
    }

    /// Add a message to a conversation
    pub async fn add_message(
        &self,
        conversation_id: &str,
        role: &str,
        content: &str,
    ) -> Result<Message> {
        let id = Uuid::new_v4().to_string();
        let created_at = Utc::now();

        sqlx::query(
            "INSERT INTO messages (id, conversation_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)",
        )
        .bind(&id)
        .bind(conversation_id)
        .bind(role)
        .bind(content)
        .bind(created_at.to_rfc3339())
        .execute(&self.db)
        .await
        .map_err(|e| CocoError::Database(e.to_string()))?;

        // Update conversation's updated_at
        self.touch_conversation(conversation_id).await?;

        Ok(Message {
            id,
            conversation_id: conversation_id.to_string(),
            role: MessageRole::from(role),
            content: content.to_string(),
            created_at,
        })
    }

    /// Delete a message
    pub async fn delete_message(&self, id: &str) -> Result<()> {
        // Get conversation_id first to update its timestamp
        let message = self.get_message(id).await?;

        let result = sqlx::query("DELETE FROM messages WHERE id = ?")
            .bind(id)
            .execute(&self.db)
            .await
            .map_err(|e| CocoError::Database(e.to_string()))?;

        if result.rows_affected() == 0 {
            return Err(CocoError::NotFound(format!("Message not found: {}", id)));
        }

        // Update conversation's updated_at
        self.touch_conversation(&message.conversation_id).await?;

        Ok(())
    }

    /// Get message count for a conversation
    pub async fn get_message_count(&self, conversation_id: &str) -> Result<u32> {
        let row: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM messages WHERE conversation_id = ?")
            .bind(conversation_id)
            .fetch_one(&self.db)
            .await
            .map_err(|e| CocoError::Database(e.to_string()))?;

        Ok(row.0 as u32)
    }

    /// Clear all messages in a conversation
    pub async fn clear_messages(&self, conversation_id: &str) -> Result<()> {
        sqlx::query("DELETE FROM messages WHERE conversation_id = ?")
            .bind(conversation_id)
            .execute(&self.db)
            .await
            .map_err(|e| CocoError::Database(e.to_string()))?;

        // Update conversation's updated_at
        self.touch_conversation(conversation_id).await?;

        Ok(())
    }
}

// Helper structs for SQLx
#[derive(sqlx::FromRow)]
struct ConversationRow {
    id: String,
    workspace_id: Option<String>,
    title: Option<String>,
    created_at: String,
    updated_at: String,
}

impl From<ConversationRow> for Conversation {
    fn from(row: ConversationRow) -> Self {
        Conversation {
            id: row.id,
            workspace_id: row.workspace_id,
            title: row.title,
            created_at: row
                .created_at
                .parse::<DateTime<Utc>>()
                .unwrap_or_else(|_| Utc::now()),
            updated_at: row
                .updated_at
                .parse::<DateTime<Utc>>()
                .unwrap_or_else(|_| Utc::now()),
        }
    }
}

#[derive(sqlx::FromRow)]
struct MessageRow {
    id: String,
    conversation_id: String,
    role: String,
    content: String,
    created_at: String,
}

impl From<MessageRow> for Message {
    fn from(row: MessageRow) -> Self {
        Message {
            id: row.id,
            conversation_id: row.conversation_id,
            role: MessageRole::from(row.role.as_str()),
            content: row.content,
            created_at: row
                .created_at
                .parse::<DateTime<Utc>>()
                .unwrap_or_else(|_| Utc::now()),
        }
    }
}
