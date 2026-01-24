use crate::db::DbPool;
use crate::error::{CocoError, Result};
use crate::types::{Contract, ContractWithChain, DecodedEvent, InterfaceType, Transaction, TransactionRun, TransactionStatus, TxStatus, Workspace};
use chrono::{DateTime, Utc};
use std::path::PathBuf;
use uuid::Uuid;
use walkdir::WalkDir;

pub struct WorkspaceService {
    db: DbPool,
}

impl WorkspaceService {
    pub fn new(db: DbPool) -> Self {
        Self { db }
    }

    // Workspace operations
    pub async fn list_workspaces(&self, chain_id: &str) -> Result<Vec<Workspace>> {
        let rows = sqlx::query_as::<_, WorkspaceRow>(
            r#"
            SELECT
                w.id, w.chain_id, w.name, w.path, w.framework, w.created_at, w.updated_at,
                (SELECT COUNT(*) FROM contracts WHERE workspace_id = w.id) as contract_count,
                (SELECT COUNT(*) FROM transactions WHERE workspace_id = w.id) as transaction_count
            FROM workspaces w
            WHERE w.chain_id = ?
            ORDER BY w.updated_at DESC
            "#
        )
        .bind(chain_id)
        .fetch_all(&self.db)
        .await
        .map_err(|e| CocoError::Database(e.to_string()))?;

        Ok(rows.into_iter().map(Workspace::from).collect())
    }

    pub async fn get_workspace(&self, workspace_id: &str) -> Result<Workspace> {
        let row = sqlx::query_as::<_, WorkspaceRow>(
            r#"
            SELECT
                w.id, w.chain_id, w.name, w.path, w.framework, w.created_at, w.updated_at,
                (SELECT COUNT(*) FROM contracts WHERE workspace_id = w.id) as contract_count,
                (SELECT COUNT(*) FROM transactions WHERE workspace_id = w.id) as transaction_count
            FROM workspaces w
            WHERE w.id = ?
            "#
        )
        .bind(workspace_id)
        .fetch_optional(&self.db)
        .await
        .map_err(|e| CocoError::Database(e.to_string()))?;

        row.map(Workspace::from)
            .ok_or_else(|| CocoError::NotFound(format!("Workspace not found: {}", workspace_id)))
    }

    pub async fn create_workspace(
        &self,
        chain_id: &str,
        name: &str,
        path: Option<&str>,
    ) -> Result<Workspace> {
        let (path_str, framework) = if let Some(p) = path {
            if !p.is_empty() {
                let path_buf = PathBuf::from(p);
                // Verify path exists if provided
                if !path_buf.exists() {
                    return Err(CocoError::Validation(format!(
                        "Path does not exist: {}",
                        p
                    )));
                }
                (p.to_string(), self.detect_framework(&path_buf))
            } else {
                (String::new(), None)
            }
        } else {
            (String::new(), None)
        };

        let now = Utc::now();
        let workspace = Workspace {
            id: Uuid::new_v4().to_string(),
            chain_id: chain_id.to_string(),
            name: name.to_string(),
            path: path_str,
            framework,
            created_at: now,
            updated_at: now,
            contract_count: 0,
            transaction_count: 0,
        };

        sqlx::query(
            r#"
            INSERT INTO workspaces (id, chain_id, name, path, framework, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            "#,
        )
        .bind(&workspace.id)
        .bind(&workspace.chain_id)
        .bind(&workspace.name)
        .bind(&workspace.path)
        .bind(&workspace.framework)
        .bind(workspace.created_at.to_rfc3339())
        .bind(workspace.updated_at.to_rfc3339())
        .execute(&self.db)
        .await
        .map_err(|e| CocoError::Database(e.to_string()))?;

        Ok(workspace)
    }

    pub async fn update_workspace(&self, workspace_id: &str, name: &str) -> Result<Workspace> {
        let now = Utc::now();
        let result = sqlx::query("UPDATE workspaces SET name = ?, updated_at = ? WHERE id = ?")
            .bind(name)
            .bind(now.to_rfc3339())
            .bind(workspace_id)
            .execute(&self.db)
            .await
            .map_err(|e| CocoError::Database(e.to_string()))?;

        if result.rows_affected() == 0 {
            return Err(CocoError::NotFound(format!(
                "Workspace not found: {}",
                workspace_id
            )));
        }

        self.get_workspace(workspace_id).await
    }

    pub async fn delete_workspace(&self, workspace_id: &str) -> Result<()> {
        let result = sqlx::query("DELETE FROM workspaces WHERE id = ?")
            .bind(workspace_id)
            .execute(&self.db)
            .await
            .map_err(|e| CocoError::Database(e.to_string()))?;

        if result.rows_affected() == 0 {
            return Err(CocoError::NotFound(format!(
                "Workspace not found: {}",
                workspace_id
            )));
        }

        Ok(())
    }

    // Contract operations
    pub async fn list_contracts(&self, workspace_id: &str) -> Result<Vec<Contract>> {
        let rows = sqlx::query_as::<_, ContractRow>(
            "SELECT id, workspace_id, name, path, interface_type, abi, idl, move_definition, bytecode, deployed_address, created_at FROM contracts WHERE workspace_id = ? ORDER BY name"
        )
        .bind(workspace_id)
        .fetch_all(&self.db)
        .await
        .map_err(|e| CocoError::Database(e.to_string()))?;

        Ok(rows.into_iter().map(Contract::from).collect())
    }

    /// List contracts from other chains of the same blockchain (for contract reuse feature)
    pub async fn list_reusable_contracts(&self, blockchain: &str, exclude_chain_id: &str) -> Result<Vec<ContractWithChain>> {
        let rows = sqlx::query_as::<_, ContractWithChainRow>(
            r#"
            SELECT c.id, c.workspace_id, c.name, c.path, c.interface_type, c.abi, c.idl, c.move_definition, c.bytecode, c.deployed_address, c.created_at,
                   ch.name as chain_name, w.name as workspace_name
            FROM contracts c
            INNER JOIN workspaces w ON c.workspace_id = w.id
            INNER JOIN chains ch ON w.chain_id = ch.id
            WHERE ch.blockchain = ? AND w.chain_id != ? AND (c.abi IS NOT NULL OR c.idl IS NOT NULL OR c.move_definition IS NOT NULL)
            ORDER BY c.name
            "#
        )
        .bind(blockchain)
        .bind(exclude_chain_id)
        .fetch_all(&self.db)
        .await
        .map_err(|e| CocoError::Database(e.to_string()))?;

        Ok(rows.into_iter().map(ContractWithChain::from).collect())
    }

    pub async fn discover_contracts(&self, workspace_id: &str) -> Result<Vec<Contract>> {
        let workspace = self.get_workspace(workspace_id).await?;
        let path = PathBuf::from(&workspace.path);

        let mut discovered = Vec::new();

        // Look for Solidity files in src/ directory (Foundry convention)
        let src_path = path.join("src");
        if src_path.exists() {
            for entry in WalkDir::new(&src_path)
                .into_iter()
                .filter_map(|e| e.ok())
                .filter(|e| e.path().extension().map_or(false, |ext| ext == "sol"))
            {
                let file_name = entry
                    .path()
                    .file_stem()
                    .and_then(|s| s.to_str())
                    .unwrap_or("Unknown")
                    .to_string();

                let contract = Contract {
                    id: Uuid::new_v4().to_string(),
                    workspace_id: workspace_id.to_string(),
                    name: file_name,
                    path: entry.path().to_string_lossy().to_string(),
                    interface_type: InterfaceType::Abi, // Discovered Solidity files use ABI
                    abi: None,
                    idl: None,
                    move_definition: None,
                    bytecode: None,
                    deployed_address: None,
                    created_at: Utc::now(),
                };

                // Insert into database
                sqlx::query(
                    "INSERT OR IGNORE INTO contracts (id, workspace_id, name, path, interface_type) VALUES (?, ?, ?, ?, ?)"
                )
                .bind(&contract.id)
                .bind(&contract.workspace_id)
                .bind(&contract.name)
                .bind(&contract.path)
                .bind(contract.interface_type.to_string())
                .execute(&self.db)
                .await
                .map_err(|e| CocoError::Database(e.to_string()))?;

                discovered.push(contract);
            }
        }

        Ok(discovered)
    }

    pub async fn add_contract(
        &self,
        workspace_id: &str,
        name: &str,
        address: Option<&str>,
        interface_type: &str,
        abi: Option<&str>,
        idl: Option<&str>,
        move_definition: Option<&str>,
    ) -> Result<Contract> {
        // Verify workspace exists
        self.get_workspace(workspace_id).await?;

        let contract = Contract {
            id: Uuid::new_v4().to_string(),
            workspace_id: workspace_id.to_string(),
            name: name.to_string(),
            path: String::new(),
            interface_type: InterfaceType::from(interface_type),
            abi: abi.map(|s| s.to_string()),
            idl: idl.map(|s| s.to_string()),
            move_definition: move_definition.map(|s| s.to_string()),
            bytecode: None,
            deployed_address: address.map(|s| s.to_string()),
            created_at: Utc::now(),
        };

        sqlx::query(
            r#"
            INSERT INTO contracts (id, workspace_id, name, path, interface_type, abi, idl, move_definition, deployed_address, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            "#,
        )
        .bind(&contract.id)
        .bind(&contract.workspace_id)
        .bind(&contract.name)
        .bind(&contract.path)
        .bind(contract.interface_type.to_string())
        .bind(&contract.abi)
        .bind(&contract.idl)
        .bind(&contract.move_definition)
        .bind(&contract.deployed_address)
        .bind(contract.created_at.to_rfc3339())
        .execute(&self.db)
        .await
        .map_err(|e| CocoError::Database(e.to_string()))?;

        Ok(contract)
    }

    pub async fn delete_contract(&self, contract_id: &str) -> Result<()> {
        let result = sqlx::query("DELETE FROM contracts WHERE id = ?")
            .bind(contract_id)
            .execute(&self.db)
            .await
            .map_err(|e| CocoError::Database(e.to_string()))?;

        if result.rows_affected() == 0 {
            return Err(CocoError::NotFound(format!(
                "Contract not found: {}",
                contract_id
            )));
        }

        Ok(())
    }

    pub async fn update_contract(
        &self,
        contract_id: &str,
        name: &str,
        address: Option<&str>,
        interface_type: &str,
        abi: Option<&str>,
        idl: Option<&str>,
        move_definition: Option<&str>,
    ) -> Result<Contract> {
        // Get the existing contract to preserve workspace_id and other fields
        let rows = sqlx::query_as::<_, ContractRow>(
            "SELECT id, workspace_id, name, path, interface_type, abi, idl, move_definition, bytecode, deployed_address, created_at FROM contracts WHERE id = ?"
        )
        .bind(contract_id)
        .fetch_optional(&self.db)
        .await
        .map_err(|e| CocoError::Database(e.to_string()))?;

        let existing = rows.ok_or_else(|| CocoError::NotFound(format!("Contract not found: {}", contract_id)))?;

        let result = sqlx::query(
            r#"
            UPDATE contracts
            SET name = ?, deployed_address = ?, interface_type = ?, abi = ?, idl = ?, move_definition = ?
            WHERE id = ?
            "#,
        )
        .bind(name)
        .bind(address)
        .bind(interface_type)
        .bind(abi)
        .bind(idl)
        .bind(move_definition)
        .bind(contract_id)
        .execute(&self.db)
        .await
        .map_err(|e| CocoError::Database(e.to_string()))?;

        if result.rows_affected() == 0 {
            return Err(CocoError::NotFound(format!(
                "Contract not found: {}",
                contract_id
            )));
        }

        // Return the updated contract
        Ok(Contract {
            id: contract_id.to_string(),
            workspace_id: existing.workspace_id,
            name: name.to_string(),
            path: existing.path.unwrap_or_default(),
            interface_type: InterfaceType::from(interface_type),
            abi: abi.map(|s| s.to_string()),
            idl: idl.map(|s| s.to_string()),
            move_definition: move_definition.map(|s| s.to_string()),
            bytecode: existing.bytecode,
            deployed_address: address.map(|s| s.to_string()),
            created_at: existing.created_at.parse::<DateTime<Utc>>().unwrap_or_else(|_| Utc::now()),
        })
    }

    // Transaction operations
    pub async fn list_transactions(&self, workspace_id: &str) -> Result<Vec<Transaction>> {
        let rows = sqlx::query_as::<_, TransactionRow>(
            "SELECT id, workspace_id, name, contract_id, function_name, args, value, status, tx_hash, created_at, executed_at FROM transactions WHERE workspace_id = ? ORDER BY created_at DESC"
        )
        .bind(workspace_id)
        .fetch_all(&self.db)
        .await
        .map_err(|e| CocoError::Database(e.to_string()))?;

        Ok(rows.into_iter().map(Transaction::from).collect())
    }

    pub async fn create_transaction(
        &self,
        workspace_id: &str,
        name: &str,
        contract_id: Option<&str>,
        function_name: Option<&str>,
    ) -> Result<Transaction> {
        // Verify workspace exists before creating transaction
        self.get_workspace(workspace_id).await?;

        let transaction = Transaction {
            id: Uuid::new_v4().to_string(),
            workspace_id: workspace_id.to_string(),
            name: Some(name.to_string()),
            contract_id: contract_id.map(|s| s.to_string()),
            function_name: function_name.map(|s| s.to_string()),
            args: vec![],
            value: None,
            status: TransactionStatus::Draft,
            tx_hash: None,
            created_at: Utc::now(),
            executed_at: None,
        };

        sqlx::query(
            r#"
            INSERT INTO transactions (id, workspace_id, name, contract_id, function_name, status)
            VALUES (?, ?, ?, ?, ?, ?)
            "#,
        )
        .bind(&transaction.id)
        .bind(&transaction.workspace_id)
        .bind(&transaction.name)
        .bind(&transaction.contract_id)
        .bind(&transaction.function_name)
        .bind("draft")
        .execute(&self.db)
        .await
        .map_err(|e| CocoError::Database(e.to_string()))?;

        Ok(transaction)
    }

    pub async fn get_transaction(&self, transaction_id: &str) -> Result<Transaction> {
        let row = sqlx::query_as::<_, TransactionRow>(
            "SELECT id, workspace_id, name, contract_id, function_name, args, value, status, tx_hash, created_at, executed_at FROM transactions WHERE id = ?"
        )
        .bind(transaction_id)
        .fetch_optional(&self.db)
        .await
        .map_err(|e| CocoError::Database(e.to_string()))?;

        row.map(Transaction::from)
            .ok_or_else(|| CocoError::NotFound(format!("Transaction not found: {}", transaction_id)))
    }

    pub async fn delete_transaction(&self, transaction_id: &str) -> Result<()> {
        let result = sqlx::query("DELETE FROM transactions WHERE id = ?")
            .bind(transaction_id)
            .execute(&self.db)
            .await
            .map_err(|e| CocoError::Database(e.to_string()))?;

        if result.rows_affected() == 0 {
            return Err(CocoError::NotFound(format!(
                "Transaction not found: {}",
                transaction_id
            )));
        }

        Ok(())
    }

    pub async fn update_transaction(
        &self,
        transaction_id: &str,
        name: Option<&str>,
        contract_id: Option<&str>,
        function_name: Option<&str>,
        args: Option<&str>,
    ) -> Result<Transaction> {
        // Verify transaction exists
        let existing = self.get_transaction(transaction_id).await?;

        // Build dynamic update query based on provided fields
        let mut updates = Vec::new();
        let mut bindings: Vec<String> = Vec::new();

        if let Some(n) = name {
            updates.push("name = ?");
            bindings.push(n.to_string());
        }
        if let Some(cid) = contract_id {
            updates.push("contract_id = ?");
            bindings.push(cid.to_string());
        }
        if let Some(fname) = function_name {
            updates.push("function_name = ?");
            bindings.push(fname.to_string());
        }
        if let Some(a) = args {
            updates.push("args = ?");
            bindings.push(a.to_string());
        }

        if updates.is_empty() {
            return Ok(existing);
        }

        let query = format!(
            "UPDATE transactions SET {} WHERE id = ?",
            updates.join(", ")
        );

        let mut query_builder = sqlx::query(&query);
        for binding in &bindings {
            query_builder = query_builder.bind(binding);
        }
        query_builder = query_builder.bind(transaction_id);

        query_builder
            .execute(&self.db)
            .await
            .map_err(|e| CocoError::Database(e.to_string()))?;

        // Return updated transaction
        self.get_transaction(transaction_id).await
    }

    pub async fn execute_transaction(
        &self,
        transaction_id: &str,
        payload: serde_json::Value,
        _wallet_id: &str,
    ) -> Result<TransactionRun> {
        // Get the transaction to verify it exists
        let _transaction = self.get_transaction(transaction_id).await?;

        let started_at = Utc::now();

        // For now, create a mock successful result
        // TODO: Implement actual blockchain transaction execution
        // This would involve:
        // 1. Getting the wallet's private key
        // 2. Getting the contract ABI and address
        // 3. Encoding the function call with payload
        // 4. Sending the transaction to the blockchain
        // 5. Waiting for confirmation

        let finished_at = Utc::now();
        let duration_ms = (finished_at - started_at).num_milliseconds() as u64;

        let run = TransactionRun {
            id: Uuid::new_v4().to_string(),
            transaction_id: transaction_id.to_string(),
            payload: Some(payload),
            result: None,
            tx_hash: Some(format!("0x{}", hex::encode(Uuid::new_v4().as_bytes()))),
            block_number: Some(12345678),
            gas_used: Some(21000),
            fee: Some("0.001".to_string()),
            status: TxStatus::Success,
            error_message: None,
            events: Some(vec![]),
            started_at,
            finished_at: Some(finished_at),
            duration_ms: Some(duration_ms),
        };

        Ok(run)
    }

    // Transaction run operations
    pub async fn save_transaction_run(&self, run: &TransactionRun) -> Result<TransactionRun> {
        // Verify transaction exists
        self.get_transaction(&run.transaction_id).await?;

        // Serialize events to JSON
        let events_json = run.events.as_ref().map(|e| serde_json::to_string(e).unwrap_or_default());

        // Serialize args/payload to JSON
        let args_json = run.payload.as_ref().map(|p| serde_json::to_string(p).unwrap_or_default());

        let status_str = match run.status {
            TxStatus::Pending => "pending",
            TxStatus::Success => "success",
            TxStatus::Failed => "failed",
        };

        sqlx::query(
            r#"
            INSERT INTO transaction_runs (id, transaction_id, status, tx_hash, block_number, gas_used, error, args, events, executed_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            "#,
        )
        .bind(&run.id)
        .bind(&run.transaction_id)
        .bind(status_str)
        .bind(&run.tx_hash)
        .bind(run.block_number.map(|n| n as i64))
        .bind(run.gas_used.map(|g| g.to_string()))
        .bind(&run.error_message)
        .bind(&args_json)
        .bind(&events_json)
        .bind(run.started_at.to_rfc3339())
        .execute(&self.db)
        .await
        .map_err(|e| CocoError::Database(e.to_string()))?;

        Ok(run.clone())
    }

    pub async fn list_transaction_runs(&self, transaction_id: &str) -> Result<Vec<TransactionRun>> {
        let rows = sqlx::query_as::<_, TransactionRunRow>(
            "SELECT id, transaction_id, status, tx_hash, block_number, gas_used, error, args, events, executed_at FROM transaction_runs WHERE transaction_id = ? ORDER BY executed_at DESC"
        )
        .bind(transaction_id)
        .fetch_all(&self.db)
        .await
        .map_err(|e| CocoError::Database(e.to_string()))?;

        Ok(rows.into_iter().map(TransactionRun::from).collect())
    }

    // Helper methods
    fn detect_framework(&self, path: &PathBuf) -> Option<String> {
        // Check for Foundry
        if path.join("foundry.toml").exists() {
            return Some("foundry".to_string());
        }

        // Check for Hardhat
        if path.join("hardhat.config.js").exists() || path.join("hardhat.config.ts").exists() {
            return Some("hardhat".to_string());
        }

        // Check for Anchor (Solana)
        if path.join("Anchor.toml").exists() {
            return Some("anchor".to_string());
        }

        // Check for Move.toml (Aptos)
        if path.join("Move.toml").exists() {
            return Some("move".to_string());
        }

        None
    }
}

impl Default for WorkspaceService {
    fn default() -> Self {
        panic!("WorkspaceService requires a database pool")
    }
}

// Helper structs for SQLx
#[derive(sqlx::FromRow)]
struct WorkspaceRow {
    id: String,
    chain_id: String,
    name: String,
    path: String,
    framework: Option<String>,
    created_at: String,
    updated_at: String,
    #[sqlx(default)]
    contract_count: i64,
    #[sqlx(default)]
    transaction_count: i64,
}

impl From<WorkspaceRow> for Workspace {
    fn from(row: WorkspaceRow) -> Self {
        Workspace {
            id: row.id,
            chain_id: row.chain_id,
            name: row.name,
            path: row.path,
            framework: row.framework,
            created_at: row
                .created_at
                .parse::<DateTime<Utc>>()
                .unwrap_or_else(|_| Utc::now()),
            updated_at: row
                .updated_at
                .parse::<DateTime<Utc>>()
                .unwrap_or_else(|_| Utc::now()),
            contract_count: row.contract_count as u32,
            transaction_count: row.transaction_count as u32,
        }
    }
}

#[derive(sqlx::FromRow)]
struct ContractRow {
    id: String,
    workspace_id: String,
    name: String,
    path: Option<String>,
    interface_type: Option<String>,
    abi: Option<String>,
    idl: Option<String>,
    move_definition: Option<String>,
    bytecode: Option<String>,
    deployed_address: Option<String>,
    created_at: String,
}

impl From<ContractRow> for Contract {
    fn from(row: ContractRow) -> Self {
        Contract {
            id: row.id,
            workspace_id: row.workspace_id,
            name: row.name,
            path: row.path.unwrap_or_default(),
            interface_type: row.interface_type
                .as_deref()
                .map(InterfaceType::from)
                .unwrap_or_default(),
            abi: row.abi,
            idl: row.idl,
            move_definition: row.move_definition,
            bytecode: row.bytecode,
            deployed_address: row.deployed_address,
            created_at: row
                .created_at
                .parse::<DateTime<Utc>>()
                .unwrap_or_else(|_| Utc::now()),
        }
    }
}

#[derive(sqlx::FromRow)]
struct ContractWithChainRow {
    id: String,
    workspace_id: String,
    name: String,
    path: Option<String>,
    interface_type: Option<String>,
    abi: Option<String>,
    idl: Option<String>,
    move_definition: Option<String>,
    bytecode: Option<String>,
    deployed_address: Option<String>,
    created_at: String,
    chain_name: String,
    workspace_name: String,
}

impl From<ContractWithChainRow> for ContractWithChain {
    fn from(row: ContractWithChainRow) -> Self {
        ContractWithChain {
            id: row.id,
            workspace_id: row.workspace_id,
            name: row.name,
            path: row.path.unwrap_or_default(),
            interface_type: row.interface_type
                .as_deref()
                .map(InterfaceType::from)
                .unwrap_or_default(),
            abi: row.abi,
            idl: row.idl,
            move_definition: row.move_definition,
            bytecode: row.bytecode,
            deployed_address: row.deployed_address,
            created_at: row
                .created_at
                .parse::<DateTime<Utc>>()
                .unwrap_or_else(|_| Utc::now()),
            chain_name: row.chain_name,
            workspace_name: row.workspace_name,
        }
    }
}

#[derive(sqlx::FromRow)]
struct TransactionRow {
    id: String,
    workspace_id: String,
    name: Option<String>,
    contract_id: Option<String>,
    function_name: Option<String>,
    args: Option<String>,
    value: Option<String>,
    status: String,
    tx_hash: Option<String>,
    created_at: String,
    executed_at: Option<String>,
}

impl From<TransactionRow> for Transaction {
    fn from(row: TransactionRow) -> Self {
        Transaction {
            id: row.id,
            workspace_id: row.workspace_id,
            name: row.name,
            contract_id: row.contract_id,
            function_name: row.function_name,
            args: row
                .args
                .and_then(|s| serde_json::from_str(&s).ok())
                .unwrap_or_default(),
            value: row.value,
            status: string_to_tx_status(&row.status),
            tx_hash: row.tx_hash,
            created_at: row
                .created_at
                .parse::<DateTime<Utc>>()
                .unwrap_or_else(|_| Utc::now()),
            executed_at: row.executed_at.and_then(|s| s.parse().ok()),
        }
    }
}

fn string_to_tx_status(s: &str) -> TransactionStatus {
    match s {
        "pending" => TransactionStatus::Pending,
        "success" => TransactionStatus::Success,
        "failed" => TransactionStatus::Failed,
        _ => TransactionStatus::Draft,
    }
}

#[derive(sqlx::FromRow)]
struct TransactionRunRow {
    id: String,
    transaction_id: String,
    status: String,
    tx_hash: Option<String>,
    block_number: Option<i64>,
    gas_used: Option<String>,
    error: Option<String>,
    args: Option<String>,
    events: Option<String>,
    executed_at: String,
}

impl From<TransactionRunRow> for TransactionRun {
    fn from(row: TransactionRunRow) -> Self {
        let status = match row.status.as_str() {
            "pending" => TxStatus::Pending,
            "success" => TxStatus::Success,
            "failed" => TxStatus::Failed,
            _ => TxStatus::Pending,
        };

        let events: Option<Vec<DecodedEvent>> = row
            .events
            .and_then(|s| serde_json::from_str(&s).ok());

        let payload: Option<serde_json::Value> = row
            .args
            .and_then(|s| serde_json::from_str(&s).ok());

        let started_at = row
            .executed_at
            .parse::<DateTime<Utc>>()
            .unwrap_or_else(|_| Utc::now());

        TransactionRun {
            id: row.id,
            transaction_id: row.transaction_id,
            payload,
            result: None,
            tx_hash: row.tx_hash,
            block_number: row.block_number.map(|n| n as u64),
            gas_used: row.gas_used.and_then(|s| s.parse().ok()),
            fee: None,
            status,
            error_message: row.error,
            events,
            started_at,
            finished_at: Some(started_at), // Use executed_at as finished time
            duration_ms: None,
        }
    }
}
