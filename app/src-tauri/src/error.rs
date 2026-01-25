use thiserror::Error;
use serde::Serialize;

#[derive(Error, Debug, Serialize)]
pub enum CocoError {
    #[error("Not found: {0}")]
    NotFound(String),

    #[error("Validation error: {0}")]
    Validation(String),

    #[error("Adapter error: {0}")]
    Adapter(String),

    #[error("Process error: {0}")]
    Process(String),

    #[error("Database error: {0}")]
    Database(String),

    #[error("IO error: {0}")]
    Io(String),

    #[error("Serialization error: {0}")]
    Serialization(String),

    #[error("Crypto error: {0}")]
    Crypto(String),
}

impl From<std::io::Error> for CocoError {
    fn from(err: std::io::Error) -> Self {
        CocoError::Io(err.to_string())
    }
}

impl From<serde_json::Error> for CocoError {
    fn from(err: serde_json::Error) -> Self {
        CocoError::Serialization(err.to_string())
    }
}

impl From<sqlx::Error> for CocoError {
    fn from(err: sqlx::Error) -> Self {
        CocoError::Database(err.to_string())
    }
}

pub type Result<T> = std::result::Result<T, CocoError>;
