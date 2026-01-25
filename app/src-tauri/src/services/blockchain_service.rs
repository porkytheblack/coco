use crate::db::DbPool;
use crate::error::{CocoError, Result};
use crate::types::{
    Blockchain, CreateNetworkInput, Ecosystem, Network, NetworkType, UpdateNetworkInput,
};
use chrono::{DateTime, Utc};

pub struct BlockchainService {
    db: DbPool,
}

impl BlockchainService {
    pub fn new(db: DbPool) -> Self {
        Self { db }
    }

    // ========================================================================
    // Blockchain operations
    // ========================================================================

    /// List all blockchains with their networks
    pub async fn list_blockchains(&self) -> Result<Vec<Blockchain>> {
        let rows = sqlx::query_as::<_, BlockchainRow>(
            "SELECT id, name, ecosystem, icon_id, created_at FROM blockchains ORDER BY name",
        )
        .fetch_all(&self.db)
        .await
        .map_err(|e| CocoError::Database(e.to_string()))?;

        let mut blockchains: Vec<Blockchain> = rows.into_iter().map(Blockchain::from).collect();

        // Fetch networks for each blockchain
        for blockchain in &mut blockchains {
            blockchain.networks = self.list_networks(&blockchain.id).await?;
        }

        Ok(blockchains)
    }

    /// Get a single blockchain by ID
    pub async fn get_blockchain(&self, id: &str) -> Result<Blockchain> {
        let row = sqlx::query_as::<_, BlockchainRow>(
            "SELECT id, name, ecosystem, icon_id, created_at FROM blockchains WHERE id = ?",
        )
        .bind(id)
        .fetch_optional(&self.db)
        .await
        .map_err(|e| CocoError::Database(e.to_string()))?;

        let mut blockchain = row
            .map(Blockchain::from)
            .ok_or_else(|| CocoError::NotFound(format!("Blockchain not found: {}", id)))?;

        blockchain.networks = self.list_networks(&blockchain.id).await?;
        Ok(blockchain)
    }

    /// Create a new blockchain
    pub async fn create_blockchain(
        &self,
        id: &str,
        name: &str,
        ecosystem: Ecosystem,
        icon_id: Option<&str>,
    ) -> Result<Blockchain> {
        let created_at = Utc::now();

        sqlx::query(
            "INSERT INTO blockchains (id, name, ecosystem, icon_id, created_at) VALUES (?, ?, ?, ?, ?)",
        )
        .bind(id)
        .bind(name)
        .bind(ecosystem_to_string(&ecosystem))
        .bind(icon_id)
        .bind(created_at.to_rfc3339())
        .execute(&self.db)
        .await
        .map_err(|e| CocoError::Database(e.to_string()))?;

        Ok(Blockchain {
            id: id.to_string(),
            name: name.to_string(),
            ecosystem,
            icon_id: icon_id.map(String::from),
            created_at,
            networks: vec![],
        })
    }

    /// Delete a blockchain (cascades to networks)
    pub async fn delete_blockchain(&self, id: &str) -> Result<()> {
        let result = sqlx::query("DELETE FROM blockchains WHERE id = ?")
            .bind(id)
            .execute(&self.db)
            .await
            .map_err(|e| CocoError::Database(e.to_string()))?;

        if result.rows_affected() == 0 {
            return Err(CocoError::NotFound(format!("Blockchain not found: {}", id)));
        }

        Ok(())
    }

    // ========================================================================
    // Network operations
    // ========================================================================

    /// List networks for a blockchain
    pub async fn list_networks(&self, blockchain_id: &str) -> Result<Vec<Network>> {
        let rows = sqlx::query_as::<_, NetworkRow>(
            r#"
            SELECT id, blockchain_id, name, network_type, rpc_url, chain_id_numeric,
                   explorer_url, explorer_api_url, explorer_api_key, faucet_url,
                   currency_symbol, currency_decimals, is_default, created_at
            FROM networks
            WHERE blockchain_id = ?
            ORDER BY is_default DESC, name
            "#,
        )
        .bind(blockchain_id)
        .fetch_all(&self.db)
        .await
        .map_err(|e| CocoError::Database(e.to_string()))?;

        Ok(rows.into_iter().map(Network::from).collect())
    }

    /// Get a single network by ID
    pub async fn get_network(&self, id: &str) -> Result<Network> {
        let row = sqlx::query_as::<_, NetworkRow>(
            r#"
            SELECT id, blockchain_id, name, network_type, rpc_url, chain_id_numeric,
                   explorer_url, explorer_api_url, explorer_api_key, faucet_url,
                   currency_symbol, currency_decimals, is_default, created_at
            FROM networks
            WHERE id = ?
            "#,
        )
        .bind(id)
        .fetch_optional(&self.db)
        .await
        .map_err(|e| CocoError::Database(e.to_string()))?;

        row.map(Network::from)
            .ok_or_else(|| CocoError::NotFound(format!("Network not found: {}", id)))
    }

    /// Create a new network
    pub async fn create_network(&self, input: CreateNetworkInput) -> Result<Network> {
        let id = format!("{}-{}", input.blockchain_id, input.name.to_lowercase().replace(' ', "-"));
        let created_at = Utc::now();
        let currency_decimals = input.currency_decimals.unwrap_or(18);

        // If this is set as default, unset other defaults for this blockchain
        if input.is_default {
            sqlx::query("UPDATE networks SET is_default = 0 WHERE blockchain_id = ?")
                .bind(&input.blockchain_id)
                .execute(&self.db)
                .await
                .map_err(|e| CocoError::Database(e.to_string()))?;
        }

        sqlx::query(
            r#"
            INSERT INTO networks (
                id, blockchain_id, name, network_type, rpc_url, chain_id_numeric,
                explorer_url, explorer_api_url, explorer_api_key, faucet_url,
                currency_symbol, currency_decimals, is_default, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            "#,
        )
        .bind(&id)
        .bind(&input.blockchain_id)
        .bind(&input.name)
        .bind(&input.network_type)
        .bind(&input.rpc_url)
        .bind(input.chain_id_numeric.map(|n| n as i64))
        .bind(&input.explorer_url)
        .bind(&input.explorer_api_url)
        .bind(&input.explorer_api_key)
        .bind(&input.faucet_url)
        .bind(&input.currency_symbol)
        .bind(currency_decimals as i32)
        .bind(input.is_default)
        .bind(created_at.to_rfc3339())
        .execute(&self.db)
        .await
        .map_err(|e| CocoError::Database(e.to_string()))?;

        Ok(Network {
            id,
            blockchain_id: input.blockchain_id,
            name: input.name,
            network_type: NetworkType::from(input.network_type.as_str()),
            rpc_url: input.rpc_url,
            chain_id_numeric: input.chain_id_numeric,
            explorer_url: input.explorer_url,
            explorer_api_url: input.explorer_api_url,
            explorer_api_key: input.explorer_api_key,
            faucet_url: input.faucet_url,
            currency_symbol: input.currency_symbol,
            currency_decimals,
            is_default: input.is_default,
            created_at,
        })
    }

    /// Update a network
    pub async fn update_network(&self, id: &str, input: UpdateNetworkInput) -> Result<Network> {
        // Build dynamic update query
        let mut updates = Vec::new();
        let mut values: Vec<Box<dyn std::any::Any + Send>> = Vec::new();

        if let Some(ref name) = input.name {
            updates.push("name = ?");
            values.push(Box::new(name.clone()));
        }
        if let Some(ref rpc_url) = input.rpc_url {
            updates.push("rpc_url = ?");
            values.push(Box::new(rpc_url.clone()));
        }
        if let Some(ref explorer_url) = input.explorer_url {
            updates.push("explorer_url = ?");
            values.push(Box::new(explorer_url.clone()));
        }
        if let Some(ref explorer_api_url) = input.explorer_api_url {
            updates.push("explorer_api_url = ?");
            values.push(Box::new(explorer_api_url.clone()));
        }
        if let Some(ref explorer_api_key) = input.explorer_api_key {
            updates.push("explorer_api_key = ?");
            values.push(Box::new(explorer_api_key.clone()));
        }
        if let Some(ref faucet_url) = input.faucet_url {
            updates.push("faucet_url = ?");
            values.push(Box::new(faucet_url.clone()));
        }

        if updates.is_empty() && input.is_default.is_none() {
            return self.get_network(id).await;
        }

        // Handle is_default separately (needs to unset others)
        if let Some(is_default) = input.is_default {
            if is_default {
                // Get blockchain_id first
                let network = self.get_network(id).await?;
                sqlx::query("UPDATE networks SET is_default = 0 WHERE blockchain_id = ?")
                    .bind(&network.blockchain_id)
                    .execute(&self.db)
                    .await
                    .map_err(|e| CocoError::Database(e.to_string()))?;
            }
            updates.push("is_default = ?");
            values.push(Box::new(is_default));
        }

        // Build and execute query using simple string concatenation
        let query = format!("UPDATE networks SET {} WHERE id = ?", updates.join(", "));

        // Execute based on number of parameters
        let mut q = sqlx::query(&query);

        // Bind values - we need to handle this differently
        if let Some(name) = input.name {
            q = q.bind(name);
        }
        if let Some(rpc_url) = input.rpc_url {
            q = q.bind(rpc_url);
        }
        if let Some(explorer_url) = input.explorer_url {
            q = q.bind(explorer_url);
        }
        if let Some(explorer_api_url) = input.explorer_api_url {
            q = q.bind(explorer_api_url);
        }
        if let Some(explorer_api_key) = input.explorer_api_key {
            q = q.bind(explorer_api_key);
        }
        if let Some(faucet_url) = input.faucet_url {
            q = q.bind(faucet_url);
        }
        if let Some(is_default) = input.is_default {
            q = q.bind(is_default);
        }

        q.bind(id)
            .execute(&self.db)
            .await
            .map_err(|e| CocoError::Database(e.to_string()))?;

        self.get_network(id).await
    }

    /// Delete a network
    pub async fn delete_network(&self, id: &str) -> Result<()> {
        let result = sqlx::query("DELETE FROM networks WHERE id = ?")
            .bind(id)
            .execute(&self.db)
            .await
            .map_err(|e| CocoError::Database(e.to_string()))?;

        if result.rows_affected() == 0 {
            return Err(CocoError::NotFound(format!("Network not found: {}", id)));
        }

        Ok(())
    }

    /// Get the ecosystem for a blockchain
    pub async fn get_blockchain_ecosystem(&self, blockchain_id: &str) -> Result<Ecosystem> {
        let row: Option<(String,)> = sqlx::query_as(
            "SELECT ecosystem FROM blockchains WHERE id = ?",
        )
        .bind(blockchain_id)
        .fetch_optional(&self.db)
        .await
        .map_err(|e| CocoError::Database(e.to_string()))?;

        row.map(|(eco,)| string_to_ecosystem(&eco))
            .ok_or_else(|| CocoError::NotFound(format!("Blockchain not found: {}", blockchain_id)))
    }
}

// Helper structs for SQLx
#[derive(sqlx::FromRow)]
struct BlockchainRow {
    id: String,
    name: String,
    ecosystem: String,
    icon_id: Option<String>,
    created_at: String,
}

impl From<BlockchainRow> for Blockchain {
    fn from(row: BlockchainRow) -> Self {
        Blockchain {
            id: row.id,
            name: row.name,
            ecosystem: string_to_ecosystem(&row.ecosystem),
            icon_id: row.icon_id,
            created_at: row
                .created_at
                .parse::<DateTime<Utc>>()
                .unwrap_or_else(|_| Utc::now()),
            networks: vec![],
        }
    }
}

#[derive(sqlx::FromRow)]
struct NetworkRow {
    id: String,
    blockchain_id: String,
    name: String,
    network_type: String,
    rpc_url: String,
    chain_id_numeric: Option<i64>,
    explorer_url: Option<String>,
    explorer_api_url: Option<String>,
    explorer_api_key: Option<String>,
    faucet_url: Option<String>,
    currency_symbol: String,
    currency_decimals: i32,
    is_default: bool,
    created_at: String,
}

impl From<NetworkRow> for Network {
    fn from(row: NetworkRow) -> Self {
        Network {
            id: row.id,
            blockchain_id: row.blockchain_id,
            name: row.name,
            network_type: string_to_network_type(&row.network_type),
            rpc_url: row.rpc_url,
            chain_id_numeric: row.chain_id_numeric.map(|n| n as u64),
            explorer_url: row.explorer_url,
            explorer_api_url: row.explorer_api_url,
            explorer_api_key: row.explorer_api_key,
            faucet_url: row.faucet_url,
            currency_symbol: row.currency_symbol,
            currency_decimals: row.currency_decimals as u8,
            is_default: row.is_default,
            created_at: row
                .created_at
                .parse::<DateTime<Utc>>()
                .unwrap_or_else(|_| Utc::now()),
        }
    }
}

fn string_to_ecosystem(s: &str) -> Ecosystem {
    match s.to_lowercase().as_str() {
        "solana" => Ecosystem::Solana,
        "aptos" => Ecosystem::Aptos,
        _ => Ecosystem::Evm,
    }
}

fn ecosystem_to_string(e: &Ecosystem) -> &'static str {
    match e {
        Ecosystem::Evm => "evm",
        Ecosystem::Solana => "solana",
        Ecosystem::Aptos => "aptos",
    }
}

fn string_to_network_type(s: &str) -> NetworkType {
    match s.to_lowercase().as_str() {
        "mainnet" => NetworkType::Mainnet,
        "testnet" => NetworkType::Testnet,
        "devnet" => NetworkType::Devnet,
        _ => NetworkType::Custom,
    }
}
