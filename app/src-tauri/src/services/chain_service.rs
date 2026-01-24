use crate::adapters::AdapterRegistry;
use crate::db::DbPool;
use crate::error::{CocoError, Result};
use crate::types::{Chain, Ecosystem, NetworkType};
use std::sync::Arc;
use tokio::sync::RwLock;

pub struct ChainService {
    db: DbPool,
    adapter_registry: Arc<RwLock<AdapterRegistry>>,
}

impl ChainService {
    pub fn new(db: DbPool, adapter_registry: Arc<RwLock<AdapterRegistry>>) -> Self {
        Self {
            db,
            adapter_registry,
        }
    }

    pub async fn list_chains(&self) -> Result<Vec<Chain>> {
        let rows = sqlx::query_as::<_, ChainRow>(
            "SELECT id, name, ecosystem, rpc_url, chain_id_numeric, explorer_url, explorer_api_url, explorer_api_key, faucet_url, is_testnet, currency_symbol, currency_decimals, blockchain, network_type, is_custom, icon_id FROM chains ORDER BY name"
        )
        .fetch_all(&self.db)
        .await
        .map_err(|e| CocoError::Database(e.to_string()))?;

        Ok(rows.into_iter().map(Chain::from).collect())
    }

    pub async fn get_chain(&self, id: &str) -> Result<Chain> {
        let row = sqlx::query_as::<_, ChainRow>(
            "SELECT id, name, ecosystem, rpc_url, chain_id_numeric, explorer_url, explorer_api_url, explorer_api_key, faucet_url, is_testnet, currency_symbol, currency_decimals, blockchain, network_type, is_custom, icon_id FROM chains WHERE id = ?"
        )
        .bind(id)
        .fetch_optional(&self.db)
        .await
        .map_err(|e| CocoError::Database(e.to_string()))?;

        row.map(Chain::from)
            .ok_or_else(|| CocoError::NotFound(format!("Chain not found: {}", id)))
    }

    pub async fn create_chain(&self, chain: Chain) -> Result<Chain> {
        sqlx::query(
            r#"
            INSERT INTO chains (id, name, ecosystem, rpc_url, chain_id_numeric, explorer_url, explorer_api_url, explorer_api_key, faucet_url, is_testnet, currency_symbol, currency_decimals, blockchain, network_type, is_custom, icon_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            "#,
        )
        .bind(&chain.id)
        .bind(&chain.name)
        .bind(ecosystem_to_string(&chain.ecosystem))
        .bind(&chain.rpc_url)
        .bind(chain.chain_id_numeric.map(|v| v as i64))
        .bind(&chain.explorer_url)
        .bind(&chain.explorer_api_url)
        .bind(&chain.explorer_api_key)
        .bind(&chain.faucet_url)
        .bind(chain.is_testnet as i32)
        .bind(&chain.currency_symbol)
        .bind(chain.currency_decimals as i32)
        .bind(&chain.blockchain)
        .bind(network_type_to_string(&chain.network_type))
        .bind(chain.is_custom as i32)
        .bind(&chain.icon_id)
        .execute(&self.db)
        .await
        .map_err(|e| CocoError::Database(e.to_string()))?;

        Ok(chain)
    }

    pub async fn update_chain(&self, id: &str, updated: Chain) -> Result<Chain> {
        let result = sqlx::query(
            r#"
            UPDATE chains
            SET name = ?, ecosystem = ?, rpc_url = ?, chain_id_numeric = ?, explorer_url = ?, explorer_api_url = ?, explorer_api_key = ?, faucet_url = ?, is_testnet = ?, currency_symbol = ?, currency_decimals = ?, blockchain = ?, network_type = ?, is_custom = ?, icon_id = ?
            WHERE id = ?
            "#,
        )
        .bind(&updated.name)
        .bind(ecosystem_to_string(&updated.ecosystem))
        .bind(&updated.rpc_url)
        .bind(updated.chain_id_numeric.map(|v| v as i64))
        .bind(&updated.explorer_url)
        .bind(&updated.explorer_api_url)
        .bind(&updated.explorer_api_key)
        .bind(&updated.faucet_url)
        .bind(updated.is_testnet as i32)
        .bind(&updated.currency_symbol)
        .bind(updated.currency_decimals as i32)
        .bind(&updated.blockchain)
        .bind(network_type_to_string(&updated.network_type))
        .bind(updated.is_custom as i32)
        .bind(&updated.icon_id)
        .bind(id)
        .execute(&self.db)
        .await
        .map_err(|e| CocoError::Database(e.to_string()))?;

        if result.rows_affected() == 0 {
            return Err(CocoError::NotFound(format!("Chain not found: {}", id)));
        }

        Ok(updated)
    }

    pub async fn delete_chain(&self, id: &str) -> Result<()> {
        let result = sqlx::query("DELETE FROM chains WHERE id = ?")
            .bind(id)
            .execute(&self.db)
            .await
            .map_err(|e| CocoError::Database(e.to_string()))?;

        if result.rows_affected() == 0 {
            return Err(CocoError::NotFound(format!("Chain not found: {}", id)));
        }

        Ok(())
    }

    pub async fn get_adapter_for_chain(&self, chain_id: &str) -> Result<()> {
        let chain = self.get_chain(chain_id).await?;
        let registry = self.adapter_registry.read().await;

        registry
            .get_adapter(&chain.ecosystem)
            .ok_or_else(|| {
                CocoError::Adapter(format!("No adapter found for ecosystem: {:?}", chain.ecosystem))
            })?;

        Ok(())
    }
}

// Helper struct for SQLx
#[derive(sqlx::FromRow)]
struct ChainRow {
    id: String,
    name: String,
    ecosystem: String,
    rpc_url: String,
    chain_id_numeric: Option<i64>,
    explorer_url: Option<String>,
    explorer_api_url: Option<String>,
    explorer_api_key: Option<String>,
    faucet_url: Option<String>,
    is_testnet: i32,
    currency_symbol: String,
    currency_decimals: i32,
    blockchain: Option<String>,
    network_type: Option<String>,
    is_custom: Option<i32>,
    icon_id: Option<String>,
}

impl From<ChainRow> for Chain {
    fn from(row: ChainRow) -> Self {
        Chain {
            id: row.id.clone(),
            name: row.name,
            ecosystem: string_to_ecosystem(&row.ecosystem),
            rpc_url: row.rpc_url,
            chain_id_numeric: row.chain_id_numeric.map(|v| v as u64),
            explorer_url: row.explorer_url,
            explorer_api_url: row.explorer_api_url,
            explorer_api_key: row.explorer_api_key,
            faucet_url: row.faucet_url,
            is_testnet: row.is_testnet != 0,
            currency_symbol: row.currency_symbol,
            currency_decimals: row.currency_decimals as u8,
            blockchain: row.blockchain.unwrap_or_else(|| infer_blockchain_from_id(&row.id)),
            network_type: row.network_type.map(|s| string_to_network_type(&s)).unwrap_or(NetworkType::Custom),
            is_custom: row.is_custom.map(|v| v != 0).unwrap_or(false),
            icon_id: row.icon_id,
        }
    }
}

fn ecosystem_to_string(ecosystem: &Ecosystem) -> &'static str {
    match ecosystem {
        Ecosystem::Evm => "evm",
        Ecosystem::Solana => "solana",
        Ecosystem::Aptos => "aptos",
    }
}

fn string_to_ecosystem(s: &str) -> Ecosystem {
    match s {
        "solana" => Ecosystem::Solana,
        "aptos" => Ecosystem::Aptos,
        _ => Ecosystem::Evm,
    }
}

fn network_type_to_string(network_type: &NetworkType) -> &'static str {
    match network_type {
        NetworkType::Mainnet => "mainnet",
        NetworkType::Testnet => "testnet",
        NetworkType::Devnet => "devnet",
        NetworkType::Custom => "custom",
    }
}

fn string_to_network_type(s: &str) -> NetworkType {
    match s {
        "mainnet" => NetworkType::Mainnet,
        "testnet" => NetworkType::Testnet,
        "devnet" => NetworkType::Devnet,
        _ => NetworkType::Custom,
    }
}

fn infer_blockchain_from_id(id: &str) -> String {
    if id.starts_with("ethereum") {
        "ethereum".to_string()
    } else if id.starts_with("base") {
        "base".to_string()
    } else if id.starts_with("polygon") {
        "polygon".to_string()
    } else if id.starts_with("arbitrum") {
        "arbitrum".to_string()
    } else if id.starts_with("optimism") {
        "optimism".to_string()
    } else if id.starts_with("avalanche") {
        "avalanche".to_string()
    } else if id.starts_with("bnb") {
        "bnb".to_string()
    } else if id.starts_with("solana") {
        "solana".to_string()
    } else if id.starts_with("aptos") {
        "aptos".to_string()
    } else {
        "custom".to_string()
    }
}
