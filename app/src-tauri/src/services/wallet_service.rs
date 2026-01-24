use crate::adapters::AdapterRegistry;
use crate::db::DbPool;
use crate::error::{CocoError, Result};
use crate::types::{Ecosystem, Wallet, WalletType, WalletWithChain};
use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Nonce,
};
use chrono::{DateTime, Utc};
use rand::Rng;
use std::sync::Arc;
use tokio::sync::RwLock;
use uuid::Uuid;

// Simple encryption key derivation (in production, use proper key management)
// This is a placeholder - in a real app, derive from user password or secure enclave
fn get_encryption_key() -> [u8; 32] {
    // For now, use a static key - in production, derive from user credentials
    let mut key = [0u8; 32];
    key.copy_from_slice(b"coco_dev_key_32bytes_placeholder");
    key
}

fn encrypt_private_key(private_key: &str) -> Result<Vec<u8>> {
    let key = get_encryption_key();
    let cipher = Aes256Gcm::new_from_slice(&key)
        .map_err(|e| CocoError::Crypto(format!("Failed to create cipher: {}", e)))?;

    let mut rng = rand::thread_rng();
    let mut nonce_bytes = [0u8; 12];
    rng.fill(&mut nonce_bytes);
    let nonce = Nonce::from_slice(&nonce_bytes);

    let ciphertext = cipher
        .encrypt(nonce, private_key.as_bytes())
        .map_err(|e| CocoError::Crypto(format!("Encryption failed: {}", e)))?;

    // Prepend nonce to ciphertext
    let mut result = nonce_bytes.to_vec();
    result.extend(ciphertext);
    Ok(result)
}

fn decrypt_private_key(encrypted: &[u8]) -> Result<String> {
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

    String::from_utf8(plaintext)
        .map_err(|e| CocoError::Crypto(format!("Invalid UTF-8: {}", e)))
}

/// Validate wallet address format based on ecosystem
fn validate_address(address: &str, ecosystem: &Ecosystem) -> Result<()> {
    match ecosystem {
        Ecosystem::Evm => {
            // EVM addresses: 0x followed by 40 hex characters
            if !address.starts_with("0x") {
                return Err(CocoError::Validation(
                    "EVM address must start with 0x".to_string(),
                ));
            }
            let hex_part = &address[2..];
            if hex_part.len() != 40 || !hex_part.chars().all(|c| c.is_ascii_hexdigit()) {
                return Err(CocoError::Validation(
                    "Invalid EVM address format. Expected 0x followed by 40 hex characters".to_string(),
                ));
            }
        }
        Ecosystem::Solana => {
            // Solana addresses: base58 encoded, typically 32-44 characters
            if address.len() < 32 || address.len() > 44 {
                return Err(CocoError::Validation(
                    "Invalid Solana address length. Expected 32-44 base58 characters".to_string(),
                ));
            }
            // Basic base58 validation (alphanumeric without 0, O, I, l)
            let valid_base58 = address.chars().all(|c| {
                c.is_ascii_alphanumeric() && c != '0' && c != 'O' && c != 'I' && c != 'l'
            });
            if !valid_base58 {
                return Err(CocoError::Validation(
                    "Invalid Solana address. Must be base58 encoded".to_string(),
                ));
            }
        }
        Ecosystem::Aptos => {
            // Aptos addresses: 0x followed by up to 64 hex characters
            if !address.starts_with("0x") {
                return Err(CocoError::Validation(
                    "Aptos address must start with 0x".to_string(),
                ));
            }
            let hex_part = &address[2..];
            if hex_part.is_empty() || hex_part.len() > 64 || !hex_part.chars().all(|c| c.is_ascii_hexdigit()) {
                return Err(CocoError::Validation(
                    "Invalid Aptos address format. Expected 0x followed by up to 64 hex characters".to_string(),
                ));
            }
        }
    }
    Ok(())
}

pub struct WalletService {
    db: DbPool,
    adapter_registry: Arc<RwLock<AdapterRegistry>>,
}

impl WalletService {
    pub fn new(db: DbPool, adapter_registry: Arc<RwLock<AdapterRegistry>>) -> Self {
        Self {
            db,
            adapter_registry,
        }
    }

    pub async fn list_wallets(&self, chain_id: &str) -> Result<Vec<Wallet>> {
        let rows = sqlx::query_as::<_, WalletRow>(
            "SELECT id, chain_id, name, address, public_key, wallet_type, created_at FROM wallets WHERE chain_id = ? ORDER BY created_at DESC"
        )
        .bind(chain_id)
        .fetch_all(&self.db)
        .await
        .map_err(|e| CocoError::Database(e.to_string()))?;

        Ok(rows.into_iter().map(Wallet::from).collect())
    }

    /// List wallets by blockchain type (e.g., all Ethereum wallets across mainnet/testnet)
    /// Excludes wallets from the specified chain_id (current chain)
    pub async fn list_wallets_by_blockchain(&self, blockchain: &str, exclude_chain_id: &str) -> Result<Vec<WalletWithChain>> {
        let rows = sqlx::query_as::<_, WalletWithChainRow>(
            r#"
            SELECT w.id, w.chain_id, w.name, w.address, w.public_key, w.wallet_type, w.created_at, c.name as chain_name
            FROM wallets w
            INNER JOIN chains c ON w.chain_id = c.id
            WHERE c.blockchain = ? AND w.chain_id != ?
            ORDER BY w.created_at DESC
            "#
        )
        .bind(blockchain)
        .bind(exclude_chain_id)
        .fetch_all(&self.db)
        .await
        .map_err(|e| CocoError::Database(e.to_string()))?;

        Ok(rows.into_iter().map(WalletWithChain::from).collect())
    }

    pub async fn get_wallet(&self, _chain_id: &str, wallet_id: &str) -> Result<Wallet> {
        let row = sqlx::query_as::<_, WalletRow>(
            "SELECT id, chain_id, name, address, public_key, wallet_type, created_at FROM wallets WHERE id = ?"
        )
        .bind(wallet_id)
        .fetch_optional(&self.db)
        .await
        .map_err(|e| CocoError::Database(e.to_string()))?;

        row.map(Wallet::from)
            .ok_or_else(|| CocoError::NotFound(format!("Wallet not found: {}", wallet_id)))
    }

    pub async fn create_wallet(
        &self,
        chain_id: &str,
        name: &str,
        _wallet_type: WalletType,
        address: Option<&str>,
        private_key: Option<&str>,
        public_key: Option<&str>,
    ) -> Result<Wallet> {
        // Use provided address/keys from frontend SDK, or generate random (fallback)
        let (wallet_address, wallet_public_key) = if let (Some(addr), Some(pubkey)) = (address, public_key) {
            (addr.to_string(), pubkey.to_string())
        } else {
            // Fallback: Generate random bytes (not recommended - frontend should use SDK)
            let mut rng = rand::thread_rng();
            let mut address_bytes = [0u8; 20];
            let mut pubkey_bytes = [0u8; 32];
            rng.fill(&mut address_bytes);
            rng.fill(&mut pubkey_bytes);
            (
                format!("0x{}", hex::encode(address_bytes)),
                format!("04{}", hex::encode(pubkey_bytes)),
            )
        };

        // Encrypt private key if provided
        let encrypted_private_key = if let Some(pk) = private_key {
            Some(encrypt_private_key(pk)?)
        } else {
            None
        };

        let wallet = Wallet {
            id: Uuid::new_v4().to_string(),
            chain_id: chain_id.to_string(),
            name: name.to_string(),
            address: wallet_address.clone(),
            wallet_type: WalletType::Local,
            balance: None,
            created_at: Utc::now(),
        };

        sqlx::query(
            r#"
            INSERT INTO wallets (id, chain_id, name, address, public_key, wallet_type, encrypted_private_key)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            "#,
        )
        .bind(&wallet.id)
        .bind(&wallet.chain_id)
        .bind(&wallet.name)
        .bind(&wallet.address)
        .bind(&wallet_public_key)
        .bind("local")
        .bind(&encrypted_private_key)
        .execute(&self.db)
        .await
        .map_err(|e| CocoError::Database(e.to_string()))?;

        Ok(wallet)
    }

    pub async fn import_wallet(
        &self,
        chain_id: &str,
        name: &str,
        address: &str,
        private_key: Option<&str>,
        _wallet_type: WalletType,
        ecosystem: Ecosystem,
    ) -> Result<Wallet> {
        // Validate address format based on ecosystem
        validate_address(address, &ecosystem)?;

        // Generate random bytes first (before any awaits to avoid Send issues)
        let public_key = {
            let mut rng = rand::thread_rng();
            let mut pubkey_bytes = [0u8; 32];
            rng.fill(&mut pubkey_bytes);
            format!("04{}", hex::encode(pubkey_bytes))
        };

        // Encrypt private key if provided
        // For Solana, the key is base58 encoded; for EVM/Aptos, it's hex
        let encrypted_private_key = if let Some(pk) = private_key {
            Some(encrypt_private_key(pk)?)
        } else {
            None
        };

        let wallet = Wallet {
            id: Uuid::new_v4().to_string(),
            chain_id: chain_id.to_string(),
            name: name.to_string(),
            address: address.to_string(),
            wallet_type: WalletType::Imported,
            balance: None,
            created_at: Utc::now(),
        };

        sqlx::query(
            r#"
            INSERT INTO wallets (id, chain_id, name, address, public_key, wallet_type, encrypted_private_key)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            "#,
        )
        .bind(&wallet.id)
        .bind(&wallet.chain_id)
        .bind(&wallet.name)
        .bind(&wallet.address)
        .bind(&public_key)
        .bind("imported")
        .bind(&encrypted_private_key)
        .execute(&self.db)
        .await
        .map_err(|e| CocoError::Database(e.to_string()))?;

        Ok(wallet)
    }

    /// Get the decrypted private key for a wallet
    pub async fn get_wallet_private_key(&self, wallet_id: &str) -> Result<String> {
        let row: Option<(Option<Vec<u8>>,)> = sqlx::query_as(
            "SELECT encrypted_private_key FROM wallets WHERE id = ?"
        )
        .bind(wallet_id)
        .fetch_optional(&self.db)
        .await
        .map_err(|e| CocoError::Database(e.to_string()))?;

        match row {
            Some((Some(encrypted),)) => decrypt_private_key(&encrypted),
            Some((None,)) => Err(CocoError::NotFound(
                "Wallet does not have a stored private key".to_string(),
            )),
            None => Err(CocoError::NotFound(format!(
                "Wallet not found: {}",
                wallet_id
            ))),
        }
    }

    pub async fn update_wallet(
        &self,
        _chain_id: &str,
        wallet_id: &str,
        name: &str,
    ) -> Result<Wallet> {
        let result = sqlx::query("UPDATE wallets SET name = ? WHERE id = ?")
            .bind(name)
            .bind(wallet_id)
            .execute(&self.db)
            .await
            .map_err(|e| CocoError::Database(e.to_string()))?;

        if result.rows_affected() == 0 {
            return Err(CocoError::NotFound(format!(
                "Wallet not found: {}",
                wallet_id
            )));
        }

        self.get_wallet("", wallet_id).await
    }

    pub async fn delete_wallet(&self, _chain_id: &str, wallet_id: &str) -> Result<()> {
        let result = sqlx::query("DELETE FROM wallets WHERE id = ?")
            .bind(wallet_id)
            .execute(&self.db)
            .await
            .map_err(|e| CocoError::Database(e.to_string()))?;

        if result.rows_affected() == 0 {
            return Err(CocoError::NotFound(format!(
                "Wallet not found: {}",
                wallet_id
            )));
        }

        Ok(())
    }

    pub async fn refresh_balance(&self, chain_id: &str, wallet_id: &str) -> Result<Wallet> {
        let _registry = self.adapter_registry.read().await;

        // In production, this would query the chain adapter for actual balance
        // For now, return the wallet as-is
        self.get_wallet(chain_id, wallet_id).await
    }
}

// Helper struct for SQLx
#[derive(sqlx::FromRow)]
struct WalletRow {
    id: String,
    chain_id: String,
    name: String,
    address: String,
    #[allow(dead_code)]
    public_key: String,
    wallet_type: String,
    created_at: String,
}

impl From<WalletRow> for Wallet {
    fn from(row: WalletRow) -> Self {
        Wallet {
            id: row.id,
            chain_id: row.chain_id,
            name: row.name,
            address: row.address,
            wallet_type: string_to_wallet_type(&row.wallet_type),
            balance: None,
            created_at: row
                .created_at
                .parse::<DateTime<Utc>>()
                .unwrap_or_else(|_| Utc::now()),
        }
    }
}

fn string_to_wallet_type(s: &str) -> WalletType {
    match s {
        "imported" => WalletType::Imported,
        "ledger" => WalletType::Ledger,
        _ => WalletType::Local,
    }
}

// Helper struct for wallet with chain info
#[derive(sqlx::FromRow)]
struct WalletWithChainRow {
    id: String,
    chain_id: String,
    name: String,
    address: String,
    #[allow(dead_code)]
    public_key: String,
    wallet_type: String,
    created_at: String,
    chain_name: String,
}

impl From<WalletWithChainRow> for WalletWithChain {
    fn from(row: WalletWithChainRow) -> Self {
        WalletWithChain {
            id: row.id,
            chain_id: row.chain_id,
            name: row.name,
            address: row.address,
            wallet_type: string_to_wallet_type(&row.wallet_type),
            balance: None,
            created_at: row
                .created_at
                .parse::<DateTime<Utc>>()
                .unwrap_or_else(|_| Utc::now()),
            chain_name: row.chain_name,
        }
    }
}
