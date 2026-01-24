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
    // First, run schema migrations for existing tables (add missing columns)
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

    sqlx::query(
        r#"
        -- Chains table
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

        -- Runs table
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

        -- Create indexes
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
