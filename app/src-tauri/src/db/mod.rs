use sqlx::{sqlite::SqlitePoolOptions, Pool, Sqlite};
use std::path::PathBuf;

pub type DbPool = Pool<Sqlite>;

/// Initialize the SQLite database
pub async fn init_db(app_data_dir: PathBuf) -> Result<DbPool, sqlx::Error> {
    // Create the data directory if it doesn't exist
    std::fs::create_dir_all(&app_data_dir).ok();

    let db_path = app_data_dir.join("coco.db");
    let db_url = format!("sqlite:{}?mode=rwc", db_path.display());

    let pool = SqlitePoolOptions::new()
        .max_connections(5)
        .connect(&db_url)
        .await?;

    // Run migrations
    run_migrations(&pool).await?;

    // Seed default data
    seed_default_data(&pool).await?;

    Ok(pool)
}

/// Run database migrations
async fn run_migrations(pool: &DbPool) -> Result<(), sqlx::Error> {
    // IMPORTANT: Create tables FIRST before running migrations
    // This ensures tables exist on fresh install before we try to alter them
    create_tables(pool).await?;

    // Now run schema migrations for existing tables (add missing columns)
    // SQLite doesn't support ADD COLUMN IF NOT EXISTS, so we check manually

    // Migration: Add encrypted_private_key to wallets
    let columns: Vec<(String,)> = sqlx::query_as(
        "SELECT name FROM pragma_table_info('wallets') WHERE name = 'encrypted_private_key'"
    )
    .fetch_all(pool)
    .await?;

    if columns.is_empty() {
        sqlx::query("ALTER TABLE wallets ADD COLUMN encrypted_private_key BLOB")
            .execute(pool)
            .await
            .ok();
    }

    // Migration: Add explorer_api_url to chains
    let columns: Vec<(String,)> = sqlx::query_as(
        "SELECT name FROM pragma_table_info('chains') WHERE name = 'explorer_api_url'"
    )
    .fetch_all(pool)
    .await?;

    if columns.is_empty() {
        sqlx::query("ALTER TABLE chains ADD COLUMN explorer_api_url TEXT")
            .execute(pool)
            .await
            .ok();
    }

    // Migration: Add explorer_api_key to chains
    let columns: Vec<(String,)> = sqlx::query_as(
        "SELECT name FROM pragma_table_info('chains') WHERE name = 'explorer_api_key'"
    )
    .fetch_all(pool)
    .await?;

    if columns.is_empty() {
        sqlx::query("ALTER TABLE chains ADD COLUMN explorer_api_key TEXT")
            .execute(pool)
            .await
            .ok();
    }

    // Migration: Add blockchain field to chains
    let columns: Vec<(String,)> = sqlx::query_as(
        "SELECT name FROM pragma_table_info('chains') WHERE name = 'blockchain'"
    )
    .fetch_all(pool)
    .await?;

    if columns.is_empty() {
        sqlx::query("ALTER TABLE chains ADD COLUMN blockchain TEXT")
            .execute(pool)
            .await
            .ok();

        // Migrate existing data - infer blockchain from chain ID
        sqlx::query("UPDATE chains SET blockchain = 'ethereum' WHERE id LIKE 'ethereum%'")
            .execute(pool)
            .await
            .ok();
        sqlx::query("UPDATE chains SET blockchain = 'base' WHERE id LIKE 'base%'")
            .execute(pool)
            .await
            .ok();
        sqlx::query("UPDATE chains SET blockchain = 'polygon' WHERE id LIKE 'polygon%'")
            .execute(pool)
            .await
            .ok();
        sqlx::query("UPDATE chains SET blockchain = 'arbitrum' WHERE id LIKE 'arbitrum%'")
            .execute(pool)
            .await
            .ok();
        sqlx::query("UPDATE chains SET blockchain = 'optimism' WHERE id LIKE 'optimism%'")
            .execute(pool)
            .await
            .ok();
        sqlx::query("UPDATE chains SET blockchain = 'avalanche' WHERE id LIKE 'avalanche%'")
            .execute(pool)
            .await
            .ok();
        sqlx::query("UPDATE chains SET blockchain = 'bnb' WHERE id LIKE 'bnb%'")
            .execute(pool)
            .await
            .ok();
        sqlx::query("UPDATE chains SET blockchain = 'solana' WHERE ecosystem = 'solana'")
            .execute(pool)
            .await
            .ok();
        sqlx::query("UPDATE chains SET blockchain = 'aptos' WHERE ecosystem = 'aptos'")
            .execute(pool)
            .await
            .ok();
        // Set remaining to 'custom'
        sqlx::query("UPDATE chains SET blockchain = 'custom' WHERE blockchain IS NULL")
            .execute(pool)
            .await
            .ok();
    }

    // Migration: Add network_type field to chains
    let columns: Vec<(String,)> = sqlx::query_as(
        "SELECT name FROM pragma_table_info('chains') WHERE name = 'network_type'"
    )
    .fetch_all(pool)
    .await?;

    if columns.is_empty() {
        sqlx::query("ALTER TABLE chains ADD COLUMN network_type TEXT NOT NULL DEFAULT 'custom'")
            .execute(pool)
            .await
            .ok();

        // Migrate existing data based on is_testnet and id patterns
        sqlx::query("UPDATE chains SET network_type = 'mainnet' WHERE is_testnet = 0 AND id LIKE '%mainnet%'")
            .execute(pool)
            .await
            .ok();
        sqlx::query("UPDATE chains SET network_type = 'testnet' WHERE is_testnet = 1")
            .execute(pool)
            .await
            .ok();
        sqlx::query("UPDATE chains SET network_type = 'devnet' WHERE id LIKE '%devnet%'")
            .execute(pool)
            .await
            .ok();
    }

    // Migration: Add is_custom field to chains
    let columns: Vec<(String,)> = sqlx::query_as(
        "SELECT name FROM pragma_table_info('chains') WHERE name = 'is_custom'"
    )
    .fetch_all(pool)
    .await?;

    if columns.is_empty() {
        sqlx::query("ALTER TABLE chains ADD COLUMN is_custom INTEGER NOT NULL DEFAULT 0")
            .execute(pool)
            .await
            .ok();
    }

    // Migration: Add icon_id field to chains
    let columns: Vec<(String,)> = sqlx::query_as(
        "SELECT name FROM pragma_table_info('chains') WHERE name = 'icon_id'"
    )
    .fetch_all(pool)
    .await?;

    if columns.is_empty() {
        sqlx::query("ALTER TABLE chains ADD COLUMN icon_id TEXT")
            .execute(pool)
            .await
            .ok();

        // Set icon_id based on blockchain
        sqlx::query("UPDATE chains SET icon_id = blockchain WHERE icon_id IS NULL")
            .execute(pool)
            .await
            .ok();
    }

    // Migration: Add faucet_url field to chains
    let columns: Vec<(String,)> = sqlx::query_as(
        "SELECT name FROM pragma_table_info('chains') WHERE name = 'faucet_url'"
    )
    .fetch_all(pool)
    .await?;

    if columns.is_empty() {
        sqlx::query("ALTER TABLE chains ADD COLUMN faucet_url TEXT")
            .execute(pool)
            .await
            .ok();
    }

    // Migration: Add chain_id_numeric field to chains
    let columns: Vec<(String,)> = sqlx::query_as(
        "SELECT name FROM pragma_table_info('chains') WHERE name = 'chain_id_numeric'"
    )
    .fetch_all(pool)
    .await?;

    if columns.is_empty() {
        sqlx::query("ALTER TABLE chains ADD COLUMN chain_id_numeric INTEGER")
            .execute(pool)
            .await
            .ok();
    }

    // Migration: Add interface_type field to contracts (for Solana IDL / Aptos Move support)
    let columns: Vec<(String,)> = sqlx::query_as(
        "SELECT name FROM pragma_table_info('contracts') WHERE name = 'interface_type'"
    )
    .fetch_all(pool)
    .await?;

    if columns.is_empty() {
        sqlx::query("ALTER TABLE contracts ADD COLUMN interface_type TEXT NOT NULL DEFAULT 'abi'")
            .execute(pool)
            .await
            .ok();
    }

    // Migration: Add idl field to contracts (for Solana Anchor IDL)
    let columns: Vec<(String,)> = sqlx::query_as(
        "SELECT name FROM pragma_table_info('contracts') WHERE name = 'idl'"
    )
    .fetch_all(pool)
    .await?;

    if columns.is_empty() {
        sqlx::query("ALTER TABLE contracts ADD COLUMN idl TEXT")
            .execute(pool)
            .await
            .ok();
    }

    // Migration: Add move_definition field to contracts (for Aptos Move)
    let columns: Vec<(String,)> = sqlx::query_as(
        "SELECT name FROM pragma_table_info('contracts') WHERE name = 'move_definition'"
    )
    .fetch_all(pool)
    .await?;

    if columns.is_empty() {
        sqlx::query("ALTER TABLE contracts ADD COLUMN move_definition TEXT")
            .execute(pool)
            .await
            .ok();
    }

    // Migration: Add network_id to workspaces
    let columns: Vec<(String,)> = sqlx::query_as(
        "SELECT name FROM pragma_table_info('workspaces') WHERE name = 'network_id'"
    )
    .fetch_all(pool)
    .await?;

    if columns.is_empty() {
        sqlx::query("ALTER TABLE workspaces ADD COLUMN network_id TEXT")
            .execute(pool)
            .await
            .ok();
    }

    // Migration: Add network_id to contracts
    let columns: Vec<(String,)> = sqlx::query_as(
        "SELECT name FROM pragma_table_info('contracts') WHERE name = 'network_id'"
    )
    .fetch_all(pool)
    .await?;

    if columns.is_empty() {
        sqlx::query("ALTER TABLE contracts ADD COLUMN network_id TEXT")
            .execute(pool)
            .await
            .ok();
    }

    // Migration: Add network_id and wallet_id to transactions
    let columns: Vec<(String,)> = sqlx::query_as(
        "SELECT name FROM pragma_table_info('transactions') WHERE name = 'network_id'"
    )
    .fetch_all(pool)
    .await?;

    if columns.is_empty() {
        sqlx::query("ALTER TABLE transactions ADD COLUMN network_id TEXT")
            .execute(pool)
            .await
            .ok();
    }

    let columns: Vec<(String,)> = sqlx::query_as(
        "SELECT name FROM pragma_table_info('transactions') WHERE name = 'wallet_id'"
    )
    .fetch_all(pool)
    .await?;

    if columns.is_empty() {
        sqlx::query("ALTER TABLE transactions ADD COLUMN wallet_id TEXT")
            .execute(pool)
            .await
            .ok();
    }

    // Migration: Add description to workspaces
    let columns: Vec<(String,)> = sqlx::query_as(
        "SELECT name FROM pragma_table_info('workspaces') WHERE name = 'description'"
    )
    .fetch_all(pool)
    .await?;

    if columns.is_empty() {
        sqlx::query("ALTER TABLE workspaces ADD COLUMN description TEXT")
            .execute(pool)
            .await
            .ok();
    }

    // Run the chains -> blockchains + networks migration
    migrate_chains_to_blockchains(pool).await?;

    // Migration: Add runner column to scripts table
    let columns: Vec<(String,)> = sqlx::query_as(
        "SELECT name FROM pragma_table_info('scripts') WHERE name = 'runner'"
    )
    .fetch_all(pool)
    .await?;

    if columns.is_empty() {
        sqlx::query("ALTER TABLE scripts ADD COLUMN runner TEXT NOT NULL DEFAULT 'bash'")
            .execute(pool)
            .await
            .ok();
    }

    // Migration: Add command column to scripts table
    let columns: Vec<(String,)> = sqlx::query_as(
        "SELECT name FROM pragma_table_info('scripts') WHERE name = 'command'"
    )
    .fetch_all(pool)
    .await?;

    if columns.is_empty() {
        sqlx::query("ALTER TABLE scripts ADD COLUMN command TEXT")
            .execute(pool)
            .await
            .ok();
    }

    // Migration: Add working_directory column to scripts table
    let columns: Vec<(String,)> = sqlx::query_as(
        "SELECT name FROM pragma_table_info('scripts') WHERE name = 'working_directory'"
    )
    .fetch_all(pool)
    .await?;

    if columns.is_empty() {
        sqlx::query("ALTER TABLE scripts ADD COLUMN working_directory TEXT")
            .execute(pool)
            .await
            .ok();
    }

    // Migration: Add updated_at column to scripts table
    let columns: Vec<(String,)> = sqlx::query_as(
        "SELECT name FROM pragma_table_info('scripts') WHERE name = 'updated_at'"
    )
    .fetch_all(pool)
    .await?;

    if columns.is_empty() {
        sqlx::query("ALTER TABLE scripts ADD COLUMN updated_at TEXT NOT NULL DEFAULT (datetime('now'))")
            .execute(pool)
            .await
            .ok();

        // Update existing rows to have created_at as updated_at
        sqlx::query("UPDATE scripts SET updated_at = created_at WHERE updated_at IS NULL OR updated_at = ''")
            .execute(pool)
            .await
            .ok();
    }

    // Migration: Add missing columns to transaction_runs for result/output tracking
    let transaction_run_columns = [
        ("result", "TEXT"),
        ("fee", "TEXT"),
        ("finished_at", "TEXT"),
        ("duration_ms", "INTEGER"),
        ("ai_explanation", "TEXT"),
    ];

    for (col_name, col_type) in transaction_run_columns {
        let columns: Vec<(String,)> = sqlx::query_as(&format!(
            "SELECT name FROM pragma_table_info('transaction_runs') WHERE name = '{}'",
            col_name
        ))
        .fetch_all(pool)
        .await?;

        if columns.is_empty() {
            sqlx::query(&format!(
                "ALTER TABLE transaction_runs ADD COLUMN {} {}",
                col_name, col_type
            ))
            .execute(pool)
            .await
            .ok();
        }
    }

    Ok(())
}

/// Migrate old chains table to new blockchains + networks structure
async fn migrate_chains_to_blockchains(pool: &DbPool) -> Result<(), sqlx::Error> {
    // Check if migration is already done (blockchains table has data)
    let count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM blockchains")
        .fetch_one(pool)
        .await?;

    if count.0 > 0 {
        return Ok(());
    }

    // Check if there's any data in chains to migrate
    let chains_count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM chains")
        .fetch_one(pool)
        .await?;

    if chains_count.0 == 0 {
        // No chains to migrate, seed fresh data
        seed_blockchains_and_networks(pool).await?;
        return Ok(());
    }

    // Create blockchain entries from unique blockchain values in chains
    sqlx::query(
        r#"
        INSERT OR IGNORE INTO blockchains (id, name, ecosystem, icon_id)
        SELECT DISTINCT
            blockchain as id,
            CASE blockchain
                WHEN 'ethereum' THEN 'Ethereum'
                WHEN 'base' THEN 'Base'
                WHEN 'polygon' THEN 'Polygon'
                WHEN 'arbitrum' THEN 'Arbitrum'
                WHEN 'optimism' THEN 'Optimism'
                WHEN 'avalanche' THEN 'Avalanche'
                WHEN 'bnb' THEN 'BNB Chain'
                WHEN 'solana' THEN 'Solana'
                WHEN 'aptos' THEN 'Aptos'
                ELSE blockchain
            END as name,
            ecosystem,
            blockchain as icon_id
        FROM chains
        WHERE blockchain IS NOT NULL
        "#,
    )
    .execute(pool)
    .await?;

    // Migrate chains data to networks table
    sqlx::query(
        r#"
        INSERT OR IGNORE INTO networks (
            id, blockchain_id, name, network_type, rpc_url,
            chain_id_numeric, explorer_url, explorer_api_url,
            explorer_api_key, faucet_url, currency_symbol,
            currency_decimals, is_default
        )
        SELECT
            id,
            blockchain as blockchain_id,
            name,
            network_type,
            rpc_url,
            chain_id_numeric,
            explorer_url,
            explorer_api_url,
            explorer_api_key,
            faucet_url,
            currency_symbol,
            currency_decimals,
            CASE WHEN network_type = 'mainnet' THEN 1 ELSE 0 END as is_default
        FROM chains
        WHERE blockchain IS NOT NULL
        "#,
    )
    .execute(pool)
    .await?;

    // Update workspace network_id based on chain_id
    sqlx::query(
        r#"
        UPDATE workspaces
        SET network_id = chain_id
        WHERE network_id IS NULL AND chain_id IN (SELECT id FROM networks)
        "#,
    )
    .execute(pool)
    .await?;

    // Update contract network_id based on workspace's network
    sqlx::query(
        r#"
        UPDATE contracts
        SET network_id = (SELECT network_id FROM workspaces WHERE workspaces.id = contracts.workspace_id)
        WHERE network_id IS NULL
        "#,
    )
    .execute(pool)
    .await?;

    // Update transaction network_id based on workspace's network
    sqlx::query(
        r#"
        UPDATE transactions
        SET network_id = (SELECT network_id FROM workspaces WHERE workspaces.id = transactions.workspace_id)
        WHERE network_id IS NULL
        "#,
    )
    .execute(pool)
    .await?;

    Ok(())
}

/// Seed default blockchains and networks for fresh installs
async fn seed_blockchains_and_networks(pool: &DbPool) -> Result<(), sqlx::Error> {
    // Seed blockchains
    let blockchains = vec![
        ("ethereum", "Ethereum", "evm"),
        ("polygon", "Polygon", "evm"),
        ("base", "Base", "evm"),
        ("arbitrum", "Arbitrum", "evm"),
        ("optimism", "Optimism", "evm"),
        ("avalanche", "Avalanche", "evm"),
        ("bnb", "BNB Chain", "evm"),
        ("solana", "Solana", "solana"),
        ("aptos", "Aptos", "aptos"),
    ];

    for (id, name, ecosystem) in blockchains {
        sqlx::query(
            "INSERT OR IGNORE INTO blockchains (id, name, ecosystem, icon_id) VALUES (?, ?, ?, ?)",
        )
        .bind(id)
        .bind(name)
        .bind(ecosystem)
        .bind(id)
        .execute(pool)
        .await?;
    }

    // Seed networks (matching the old chains seed data)
    let networks = vec![
        // Ethereum
        ("ethereum-mainnet", "ethereum", "Mainnet", "mainnet", "https://eth.llamarpc.com", Some(1u64), Some("https://etherscan.io"), Some("https://api.etherscan.io/api"), None::<&str>, "ETH", 18, true),
        ("ethereum-sepolia", "ethereum", "Sepolia", "testnet", "https://rpc.sepolia.org", Some(11155111u64), Some("https://sepolia.etherscan.io"), Some("https://api-sepolia.etherscan.io/api"), Some("https://sepoliafaucet.com"), "ETH", 18, false),
        // Polygon
        ("polygon-mainnet", "polygon", "Mainnet", "mainnet", "https://polygon-rpc.com", Some(137u64), Some("https://polygonscan.com"), Some("https://api.polygonscan.com/api"), None, "MATIC", 18, true),
        ("polygon-amoy", "polygon", "Amoy", "testnet", "https://rpc-amoy.polygon.technology", Some(80002u64), Some("https://amoy.polygonscan.com"), Some("https://api-amoy.polygonscan.com/api"), Some("https://faucet.polygon.technology"), "MATIC", 18, false),
        // Base
        ("base-mainnet", "base", "Mainnet", "mainnet", "https://mainnet.base.org", Some(8453u64), Some("https://basescan.org"), Some("https://api.basescan.org/api"), None, "ETH", 18, true),
        ("base-sepolia", "base", "Sepolia", "testnet", "https://sepolia.base.org", Some(84532u64), Some("https://sepolia.basescan.org"), Some("https://api-sepolia.basescan.org/api"), Some("https://www.coinbase.com/faucets/base-ethereum-goerli-faucet"), "ETH", 18, false),
        // Arbitrum
        ("arbitrum-mainnet", "arbitrum", "One", "mainnet", "https://arb1.arbitrum.io/rpc", Some(42161u64), Some("https://arbiscan.io"), Some("https://api.arbiscan.io/api"), None, "ETH", 18, true),
        ("arbitrum-sepolia", "arbitrum", "Sepolia", "testnet", "https://sepolia-rollup.arbitrum.io/rpc", Some(421614u64), Some("https://sepolia.arbiscan.io"), Some("https://api-sepolia.arbiscan.io/api"), Some("https://faucet.quicknode.com/arbitrum/sepolia"), "ETH", 18, false),
        // Solana
        ("solana-mainnet", "solana", "Mainnet Beta", "mainnet", "https://api.mainnet-beta.solana.com", None, Some("https://explorer.solana.com"), None, None, "SOL", 9, true),
        ("solana-devnet", "solana", "Devnet", "devnet", "https://api.devnet.solana.com", None, Some("https://explorer.solana.com?cluster=devnet"), None, Some("https://faucet.solana.com"), "SOL", 9, false),
        // Aptos
        ("aptos-mainnet", "aptos", "Mainnet", "mainnet", "https://fullnode.mainnet.aptoslabs.com", None, Some("https://explorer.aptoslabs.com"), None, None, "APT", 8, true),
        ("aptos-testnet", "aptos", "Testnet", "testnet", "https://fullnode.testnet.aptoslabs.com", None, Some("https://explorer.aptoslabs.com?network=testnet"), None, Some("https://aptoslabs.com/testnet-faucet"), "APT", 8, false),
        ("aptos-devnet", "aptos", "Devnet", "devnet", "https://fullnode.devnet.aptoslabs.com", None, Some("https://explorer.aptoslabs.com?network=devnet"), None, Some("https://aptoslabs.com/devnet-faucet"), "APT", 8, false),
    ];

    for (id, blockchain_id, name, network_type, rpc_url, chain_id_numeric, explorer_url, explorer_api_url, faucet_url, symbol, decimals, is_default) in networks {
        sqlx::query(
            r#"
            INSERT OR IGNORE INTO networks (
                id, blockchain_id, name, network_type, rpc_url, chain_id_numeric,
                explorer_url, explorer_api_url, faucet_url, currency_symbol, currency_decimals, is_default
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            "#,
        )
        .bind(id)
        .bind(blockchain_id)
        .bind(name)
        .bind(network_type)
        .bind(rpc_url)
        .bind(chain_id_numeric.map(|n| n as i64))
        .bind(explorer_url)
        .bind(explorer_api_url)
        .bind(faucet_url)
        .bind(symbol)
        .bind(decimals)
        .bind(is_default)
        .execute(pool)
        .await?;
    }

    Ok(())
}

/// Create database tables (called before migrations)
async fn create_tables(pool: &DbPool) -> Result<(), sqlx::Error> {
    // Create legacy tables first (for backwards compatibility during migration)
    sqlx::query(
        r#"
        -- Chains table (legacy - will be migrated to blockchains + networks)
        CREATE TABLE IF NOT EXISTS chains (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            ecosystem TEXT NOT NULL,
            rpc_url TEXT NOT NULL,
            explorer_url TEXT,
            explorer_api_url TEXT,
            is_testnet INTEGER NOT NULL DEFAULT 0,
            currency_symbol TEXT NOT NULL,
            currency_decimals INTEGER NOT NULL DEFAULT 18,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        -- Wallets table
        CREATE TABLE IF NOT EXISTS wallets (
            id TEXT PRIMARY KEY,
            chain_id TEXT NOT NULL,
            name TEXT NOT NULL,
            address TEXT NOT NULL,
            public_key TEXT NOT NULL,
            encrypted_private_key BLOB,
            wallet_type TEXT NOT NULL DEFAULT 'local',
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (chain_id) REFERENCES chains(id) ON DELETE CASCADE
        );

        -- Workspaces table
        CREATE TABLE IF NOT EXISTS workspaces (
            id TEXT PRIMARY KEY,
            chain_id TEXT NOT NULL,
            name TEXT NOT NULL,
            path TEXT NOT NULL,
            framework TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (chain_id) REFERENCES chains(id) ON DELETE CASCADE
        );

        -- Contracts table
        CREATE TABLE IF NOT EXISTS contracts (
            id TEXT PRIMARY KEY,
            workspace_id TEXT NOT NULL,
            name TEXT NOT NULL,
            path TEXT,
            abi TEXT,
            bytecode TEXT,
            deployed_address TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
        );

        -- Transactions table
        CREATE TABLE IF NOT EXISTS transactions (
            id TEXT PRIMARY KEY,
            workspace_id TEXT NOT NULL,
            name TEXT,
            contract_id TEXT,
            function_name TEXT,
            args TEXT,
            value TEXT,
            status TEXT NOT NULL DEFAULT 'draft',
            tx_hash TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            executed_at TEXT,
            FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
            FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE SET NULL
        );

        -- Transaction runs table (execution history)
        CREATE TABLE IF NOT EXISTS transaction_runs (
            id TEXT PRIMARY KEY,
            transaction_id TEXT NOT NULL,
            status TEXT NOT NULL,
            tx_hash TEXT,
            block_number INTEGER,
            gas_used TEXT,
            error TEXT,
            args TEXT,
            events TEXT,
            executed_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE
        );

        -- Runs table (legacy build/test/deploy runs)
        CREATE TABLE IF NOT EXISTS runs (
            id TEXT PRIMARY KEY,
            workspace_id TEXT NOT NULL,
            run_type TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'running',
            exit_code INTEGER,
            error_message TEXT,
            started_at TEXT NOT NULL DEFAULT (datetime('now')),
            ended_at TEXT,
            FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
        );

        -- Run logs table
        CREATE TABLE IF NOT EXISTS run_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            run_id TEXT NOT NULL,
            line TEXT NOT NULL,
            log_order INTEGER NOT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (run_id) REFERENCES runs(id) ON DELETE CASCADE
        );

        -- Create indexes for legacy tables
        CREATE INDEX IF NOT EXISTS idx_wallets_chain_id ON wallets(chain_id);
        CREATE INDEX IF NOT EXISTS idx_workspaces_chain_id ON workspaces(chain_id);
        CREATE INDEX IF NOT EXISTS idx_contracts_workspace_id ON contracts(workspace_id);
        CREATE INDEX IF NOT EXISTS idx_transactions_workspace_id ON transactions(workspace_id);
        CREATE INDEX IF NOT EXISTS idx_transaction_runs_transaction_id ON transaction_runs(transaction_id);
        CREATE INDEX IF NOT EXISTS idx_runs_workspace_id ON runs(workspace_id);
        CREATE INDEX IF NOT EXISTS idx_run_logs_run_id ON run_logs(run_id);
        "#,
    )
    .execute(pool)
    .await?;

    // Create new v0.0.3 tables
    create_v003_tables(pool).await?;

    Ok(())
}

/// Create new tables for v0.0.3 schema
async fn create_v003_tables(pool: &DbPool) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"
        -- Blockchains table (parent entity for networks)
        CREATE TABLE IF NOT EXISTS blockchains (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            ecosystem TEXT NOT NULL,
            icon_id TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        -- Networks table (replaces chains with proper FK to blockchains)
        CREATE TABLE IF NOT EXISTS networks (
            id TEXT PRIMARY KEY,
            blockchain_id TEXT NOT NULL,
            name TEXT NOT NULL,
            network_type TEXT NOT NULL DEFAULT 'custom',
            rpc_url TEXT NOT NULL,
            chain_id_numeric INTEGER,
            explorer_url TEXT,
            explorer_api_url TEXT,
            explorer_api_key TEXT,
            faucet_url TEXT,
            currency_symbol TEXT NOT NULL,
            currency_decimals INTEGER NOT NULL DEFAULT 18,
            is_default INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (blockchain_id) REFERENCES blockchains(id) ON DELETE CASCADE
        );

        -- Scripts table (workspace sub-entity)
        CREATE TABLE IF NOT EXISTS scripts (
            id TEXT PRIMARY KEY,
            workspace_id TEXT NOT NULL,
            name TEXT NOT NULL,
            description TEXT,
            file_path TEXT NOT NULL,
            category TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
        );

        -- Script flags table
        CREATE TABLE IF NOT EXISTS script_flags (
            id TEXT PRIMARY KEY,
            script_id TEXT NOT NULL,
            flag_name TEXT NOT NULL,
            flag_type TEXT NOT NULL DEFAULT 'string',
            default_value TEXT,
            required INTEGER NOT NULL DEFAULT 0,
            description TEXT,
            FOREIGN KEY (script_id) REFERENCES scripts(id) ON DELETE CASCADE
        );

        -- Script runs table
        CREATE TABLE IF NOT EXISTS script_runs (
            id TEXT PRIMARY KEY,
            script_id TEXT NOT NULL,
            started_at TEXT NOT NULL DEFAULT (datetime('now')),
            finished_at TEXT,
            status TEXT NOT NULL DEFAULT 'running',
            exit_code INTEGER,
            flags_used TEXT,
            env_vars_used TEXT,
            logs TEXT,
            FOREIGN KEY (script_id) REFERENCES scripts(id) ON DELETE CASCADE
        );

        -- Environment variables table (encrypted values)
        CREATE TABLE IF NOT EXISTS environment_variables (
            id TEXT PRIMARY KEY,
            workspace_id TEXT NOT NULL,
            key TEXT NOT NULL,
            value BLOB NOT NULL,
            description TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
            UNIQUE(workspace_id, key)
        );

        -- Conversations table (can be workspace-specific or global)
        CREATE TABLE IF NOT EXISTS conversations (
            id TEXT PRIMARY KEY,
            workspace_id TEXT,
            title TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
        );

        -- Messages table
        CREATE TABLE IF NOT EXISTS messages (
            id TEXT PRIMARY KEY,
            conversation_id TEXT NOT NULL,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
        );

        -- Preferences table (global key-value store)
        CREATE TABLE IF NOT EXISTS preferences (
            id TEXT PRIMARY KEY,
            key TEXT NOT NULL UNIQUE,
            value TEXT NOT NULL,
            updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        -- Contract documentation table (per-function docs)
        CREATE TABLE IF NOT EXISTS contract_docs (
            id TEXT PRIMARY KEY,
            contract_id TEXT NOT NULL,
            function_name TEXT NOT NULL,
            description TEXT,
            notes TEXT,
            updated_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE,
            UNIQUE(contract_id, function_name)
        );

        -- Create indexes for new tables
        CREATE INDEX IF NOT EXISTS idx_networks_blockchain_id ON networks(blockchain_id);
        CREATE INDEX IF NOT EXISTS idx_scripts_workspace_id ON scripts(workspace_id);
        CREATE INDEX IF NOT EXISTS idx_script_flags_script_id ON script_flags(script_id);
        CREATE INDEX IF NOT EXISTS idx_script_runs_script_id ON script_runs(script_id);
        CREATE INDEX IF NOT EXISTS idx_environment_variables_workspace_id ON environment_variables(workspace_id);
        CREATE INDEX IF NOT EXISTS idx_conversations_workspace_id ON conversations(workspace_id);
        CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
        CREATE INDEX IF NOT EXISTS idx_contract_docs_contract_id ON contract_docs(contract_id);
        "#,
    )
    .execute(pool)
    .await?;

    Ok(())
}

/// Seed default data (chains)
async fn seed_default_data(pool: &DbPool) -> Result<(), sqlx::Error> {
    // Check if chains already exist
    let count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM chains")
        .fetch_one(pool)
        .await?;

    if count.0 > 0 {
        return Ok(());
    }

    // Insert default chains (id, name, ecosystem, rpc_url, explorer_url, explorer_api_url, is_testnet, symbol, decimals)
    let default_chains = vec![
        ("ethereum-mainnet", "Ethereum Mainnet", "evm", "https://eth.llamarpc.com", Some("https://etherscan.io"), Some("https://api.etherscan.io/api"), false, "ETH", 18),
        ("ethereum-sepolia", "Ethereum Sepolia", "evm", "https://rpc.sepolia.org", Some("https://sepolia.etherscan.io"), Some("https://api-sepolia.etherscan.io/api"), true, "ETH", 18),
        ("polygon-mainnet", "Polygon Mainnet", "evm", "https://polygon-rpc.com", Some("https://polygonscan.com"), Some("https://api.polygonscan.com/api"), false, "MATIC", 18),
        ("polygon-amoy", "Polygon Amoy", "evm", "https://rpc-amoy.polygon.technology", Some("https://amoy.polygonscan.com"), Some("https://api-amoy.polygonscan.com/api"), true, "MATIC", 18),
        ("arbitrum-mainnet", "Arbitrum One", "evm", "https://arb1.arbitrum.io/rpc", Some("https://arbiscan.io"), Some("https://api.arbiscan.io/api"), false, "ETH", 18),
        ("base-mainnet", "Base", "evm", "https://mainnet.base.org", Some("https://basescan.org"), Some("https://api.basescan.org/api"), false, "ETH", 18),
        ("base-sepolia", "Base Sepolia", "evm", "https://sepolia.base.org", Some("https://sepolia.basescan.org"), Some("https://api-sepolia.basescan.org/api"), true, "ETH", 18),
        ("solana-mainnet", "Solana Mainnet", "solana", "https://api.mainnet-beta.solana.com", Some("https://explorer.solana.com"), None, false, "SOL", 9),
        ("solana-devnet", "Solana Devnet", "solana", "https://api.devnet.solana.com", Some("https://explorer.solana.com?cluster=devnet"), None, true, "SOL", 9),
        ("aptos-mainnet", "Aptos Mainnet", "aptos", "https://fullnode.mainnet.aptoslabs.com", Some("https://explorer.aptoslabs.com"), None, false, "APT", 8),
        ("aptos-testnet", "Aptos Testnet", "aptos", "https://fullnode.testnet.aptoslabs.com", Some("https://explorer.aptoslabs.com?network=testnet"), None, true, "APT", 8),
        ("aptos-devnet", "Aptos Devnet", "aptos", "https://fullnode.devnet.aptoslabs.com", Some("https://explorer.aptoslabs.com?network=devnet"), None, true, "APT", 8),
    ];

    for (id, name, ecosystem, rpc_url, explorer_url, explorer_api_url, is_testnet, symbol, decimals) in default_chains {
        sqlx::query(
            r#"
            INSERT OR IGNORE INTO chains (id, name, ecosystem, rpc_url, explorer_url, explorer_api_url, is_testnet, currency_symbol, currency_decimals)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            "#,
        )
        .bind(id)
        .bind(name)
        .bind(ecosystem)
        .bind(rpc_url)
        .bind(explorer_url)
        .bind(explorer_api_url)
        .bind(is_testnet as i32)
        .bind(symbol)
        .bind(decimals)
        .execute(pool)
        .await?;
    }

    // Seed some dummy wallets for the Sepolia testnet
    let dummy_wallets = vec![
        ("wallet-1", "ethereum-sepolia", "Dev Wallet 1", "0x742d35Cc6634C0532925a3b844Bc454e4438f44E", "04abc123..."),
        ("wallet-2", "ethereum-sepolia", "Test Wallet", "0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199", "04def456..."),
        ("wallet-3", "base-sepolia", "Base Test", "0xdD2FD4581271e230360230F9337D5c0430Bf44C0", "04ghi789..."),
    ];

    for (id, chain_id, name, address, public_key) in dummy_wallets {
        sqlx::query(
            r#"
            INSERT OR IGNORE INTO wallets (id, chain_id, name, address, public_key, wallet_type)
            VALUES (?, ?, ?, ?, ?, 'local')
            "#,
        )
        .bind(id)
        .bind(chain_id)
        .bind(name)
        .bind(address)
        .bind(public_key)
        .execute(pool)
        .await?;
    }

    // Seed a dummy workspace pointing to the dummy-contracts directory
    sqlx::query(
        r#"
        INSERT OR IGNORE INTO workspaces (id, chain_id, name, path, framework)
        VALUES ('workspace-1', 'ethereum-sepolia', 'DummyContracts', './dummy-contracts', 'foundry')
        "#,
    )
    .execute(pool)
    .await?;

    // Seed some dummy contracts
    let dummy_contracts = vec![
        ("contract-1", "workspace-1", "Token", "src/Token.sol"),
        ("contract-2", "workspace-1", "NFT", "src/NFT.sol"),
        ("contract-3", "workspace-1", "Marketplace", "src/Marketplace.sol"),
    ];

    for (id, workspace_id, name, path) in dummy_contracts {
        sqlx::query(
            r#"
            INSERT OR IGNORE INTO contracts (id, workspace_id, name, path)
            VALUES (?, ?, ?, ?)
            "#,
        )
        .bind(id)
        .bind(workspace_id)
        .bind(name)
        .bind(path)
        .execute(pool)
        .await?;
    }

    // Seed some dummy transactions
    let dummy_transactions = vec![
        ("tx-1", "workspace-1", "Mint Tokens", Some("contract-1")),
        ("tx-2", "workspace-1", "Transfer", Some("contract-1")),
        ("tx-3", "workspace-1", "Deploy NFT", Some("contract-2")),
    ];

    for (id, workspace_id, name, contract_id) in dummy_transactions {
        sqlx::query(
            r#"
            INSERT OR IGNORE INTO transactions (id, workspace_id, name, contract_id, status)
            VALUES (?, ?, ?, ?, 'draft')
            "#,
        )
        .bind(id)
        .bind(workspace_id)
        .bind(name)
        .bind(contract_id)
        .execute(pool)
        .await?;
    }

    // Seed some dummy runs with logs
    let dummy_runs = vec![
        ("run-1", "workspace-1", "build", "success", Some(0)),
        ("run-2", "workspace-1", "test", "success", Some(0)),
        ("run-3", "workspace-1", "build", "failed", Some(1)),
    ];

    for (id, workspace_id, run_type, status, exit_code) in dummy_runs {
        sqlx::query(
            r#"
            INSERT OR IGNORE INTO runs (id, workspace_id, run_type, status, exit_code, ended_at)
            VALUES (?, ?, ?, ?, ?, datetime('now'))
            "#,
        )
        .bind(id)
        .bind(workspace_id)
        .bind(run_type)
        .bind(status)
        .bind(exit_code)
        .execute(pool)
        .await?;
    }

    // Add logs for the runs
    let build_logs = vec![
        "$ forge build",
        "",
        "[⠒] Compiling...",
        "[⠒] Compiling 3 files with Solc 0.8.19",
        "[⠒] Solc 0.8.19 finished in 1.23s",
        "",
        "Compiler run successful!",
    ];

    for (i, line) in build_logs.iter().enumerate() {
        sqlx::query(
            "INSERT OR IGNORE INTO run_logs (run_id, line, log_order) VALUES (?, ?, ?)",
        )
        .bind("run-1")
        .bind(*line)
        .bind(i as i32)
        .execute(pool)
        .await?;
    }

    let test_logs = vec![
        "$ forge test -vvv",
        "",
        "[⠒] Compiling...",
        "[⠒] Running tests...",
        "",
        "Running 2 tests for test/Token.t.sol:TokenTest",
        "[PASS] testMint() (gas: 47832)",
        "[PASS] testTransfer() (gas: 52341)",
        "",
        "Running 2 tests for test/NFT.t.sol:NFTTest",
        "[PASS] testMintNFT() (gas: 89234)",
        "[PASS] testTransferNFT() (gas: 61234)",
        "",
        "Test result: ok. 4 passed; 0 failed; finished in 0.89s",
    ];

    for (i, line) in test_logs.iter().enumerate() {
        sqlx::query(
            "INSERT OR IGNORE INTO run_logs (run_id, line, log_order) VALUES (?, ?, ?)",
        )
        .bind("run-2")
        .bind(*line)
        .bind(i as i32)
        .execute(pool)
        .await?;
    }

    let failed_build_logs = vec![
        "$ forge build",
        "",
        "[⠒] Compiling...",
        "[⠒] Compiling 3 files with Solc 0.8.19",
        "",
        "Error: ",
        "  --> src/Token.sol:25:5",
        "   |",
        "25 |     uint256 public totlSupply; // typo",
        "   |     ^^^^^^^^^^^^^^^^^^^^^^^^^",
        "   = note: undeclared identifier",
        "",
        "Compiler run failed!",
    ];

    for (i, line) in failed_build_logs.iter().enumerate() {
        sqlx::query(
            "INSERT OR IGNORE INTO run_logs (run_id, line, log_order) VALUES (?, ?, ?)",
        )
        .bind("run-3")
        .bind(*line)
        .bind(i as i32)
        .execute(pool)
        .await?;
    }

    Ok(())
}
