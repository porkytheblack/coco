pub mod adapters;
pub mod commands;
pub mod db;
pub mod error;
pub mod services;
pub mod types;

use adapters::AdapterRegistry;
use db::DbPool;
use services::{
    BlockchainService, ChainService, ContractDocService, ConversationService, EnvService,
    PreferenceService, RunService, ScriptService, WalletService, WorkspaceService,
};
use std::sync::Arc;
use tauri::Manager;
use tokio::sync::RwLock;

#[cfg(target_os = "macos")]
use tauri_plugin_decorum::WebviewWindowExt;

/// Application state that holds all services
pub struct AppState {
    pub db_pool: DbPool,
    pub chain_service: Arc<ChainService>,
    pub wallet_service: Arc<WalletService>,
    pub workspace_service: Arc<WorkspaceService>,
    pub run_service: Arc<RunService>,
    pub adapter_registry: Arc<RwLock<AdapterRegistry>>,
    // v0.0.3 services
    pub blockchain_service: Arc<BlockchainService>,
    pub script_service: Arc<ScriptService>,
    pub env_service: Arc<EnvService>,
    pub conversation_service: Arc<ConversationService>,
    pub preference_service: Arc<PreferenceService>,
    pub contract_doc_service: Arc<ContractDocService>,
}

impl AppState {
    pub async fn new(db_pool: DbPool) -> Self {
        // Create adapter registry
        let adapter_registry = Arc::new(RwLock::new(AdapterRegistry::new()));

        // Create legacy services with database pool
        let chain_service = Arc::new(ChainService::new(db_pool.clone(), adapter_registry.clone()));
        let wallet_service = Arc::new(WalletService::new(db_pool.clone(), adapter_registry.clone()));
        let workspace_service = Arc::new(WorkspaceService::new(db_pool.clone()));
        let run_service = Arc::new(RunService::new(db_pool.clone()));

        // Create v0.0.3 services
        let blockchain_service = Arc::new(BlockchainService::new(db_pool.clone()));
        let script_service = Arc::new(ScriptService::new(db_pool.clone()));
        let env_service = Arc::new(EnvService::new(db_pool.clone()));
        let conversation_service = Arc::new(ConversationService::new(db_pool.clone()));
        let preference_service = Arc::new(PreferenceService::new(db_pool.clone()));
        let contract_doc_service = Arc::new(ContractDocService::new(db_pool.clone()));

        Self {
            db_pool,
            chain_service,
            wallet_service,
            workspace_service,
            run_service,
            adapter_registry,
            blockchain_service,
            script_service,
            env_service,
            conversation_service,
            preference_service,
            contract_doc_service,
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_decorum::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            // Get app data directory
            let app_data_dir = app
                .path()
                .app_data_dir()
                .expect("Failed to get app data directory");

            // Initialize database and app state
            let rt = tokio::runtime::Runtime::new().expect("Failed to create runtime");
            let db_pool = rt.block_on(async {
                db::init_db(app_data_dir).await.expect("Failed to initialize database")
            });

            let app_state = rt.block_on(async {
                AppState::new(db_pool).await
            });

            app.manage(app_state);

            // Configure macOS window for transparent title bar
            #[cfg(target_os = "macos")]
            {
                let main_window = app.get_webview_window("main").unwrap();
                main_window.create_overlay_titlebar().unwrap();
                main_window.set_traffic_lights_inset(16.0, 20.0).unwrap();
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Chain commands (legacy)
            commands::chains::list_chains,
            commands::chains::get_chain,
            commands::chains::create_chain,
            commands::chains::update_chain,
            commands::chains::delete_chain,
            // Wallet commands
            commands::wallets::list_wallets,
            commands::wallets::list_reusable_wallets,
            commands::wallets::get_wallet,
            commands::wallets::create_wallet,
            commands::wallets::import_wallet,
            commands::wallets::delete_wallet,
            commands::wallets::refresh_balance,
            commands::wallets::get_wallet_private_key,
            // Workspace commands
            commands::workspaces::list_workspaces,
            commands::workspaces::get_workspace,
            commands::workspaces::create_workspace,
            commands::workspaces::delete_workspace,
            commands::workspaces::list_contracts,
            commands::workspaces::list_reusable_contracts,
            commands::workspaces::add_contract,
            commands::workspaces::update_contract,
            commands::workspaces::delete_contract,
            commands::workspaces::discover_contracts,
            commands::workspaces::list_transactions,
            commands::workspaces::create_transaction,
            commands::workspaces::update_transaction,
            commands::workspaces::delete_transaction,
            commands::workspaces::execute_transaction,
            commands::workspaces::save_transaction_run,
            commands::workspaces::list_transaction_runs,
            commands::workspaces::update_transaction_run_explanation,
            // Run commands (legacy)
            commands::runs::start_build,
            commands::runs::start_test,
            commands::runs::start_deploy,
            commands::runs::cancel_run,
            commands::runs::list_runs,
            commands::runs::get_run_detail,
            // v0.0.3: Blockchain/Network commands
            commands::blockchains::list_blockchains,
            commands::blockchains::get_blockchain,
            commands::blockchains::create_blockchain,
            commands::blockchains::delete_blockchain,
            commands::blockchains::list_networks,
            commands::blockchains::get_network,
            commands::blockchains::create_network,
            commands::blockchains::update_network,
            commands::blockchains::delete_network,
            commands::blockchains::get_blockchain_ecosystem,
            // v0.0.3: Script commands
            commands::scripts::list_scripts,
            commands::scripts::get_script,
            commands::scripts::create_script,
            commands::scripts::update_script,
            commands::scripts::delete_script,
            commands::scripts::list_script_flags,
            commands::scripts::create_script_flag,
            commands::scripts::update_script_flag,
            commands::scripts::delete_script_flag,
            commands::scripts::run_script,
            commands::scripts::start_script_async,
            commands::scripts::cancel_script_run,
            commands::scripts::list_script_runs,
            commands::scripts::get_script_run,
            commands::scripts::get_script_run_logs,
            // v0.0.3: Environment variable commands
            commands::env::list_env_vars,
            commands::env::get_env_var,
            commands::env::get_env_value,
            commands::env::create_env_var,
            commands::env::update_env_var,
            commands::env::delete_env_var,
            // v0.0.3: Conversation commands
            commands::conversations::list_conversations,
            commands::conversations::get_conversation,
            commands::conversations::create_conversation,
            commands::conversations::update_conversation,
            commands::conversations::delete_conversation,
            commands::conversations::list_messages,
            commands::conversations::get_message,
            commands::conversations::add_message,
            commands::conversations::delete_message,
            commands::conversations::clear_conversation_messages,
            // v0.0.3: Preference commands
            commands::preferences::get_preference,
            commands::preferences::set_preference,
            commands::preferences::delete_preference,
            commands::preferences::list_preferences,
            commands::preferences::get_theme,
            commands::preferences::set_theme,
            commands::preferences::get_ai_settings,
            commands::preferences::set_ai_settings,
            commands::preferences::get_active_workspace,
            commands::preferences::set_active_workspace,
            commands::preferences::get_active_network,
            commands::preferences::set_active_network,
            // v0.0.3: Contract documentation commands
            commands::contract_docs::get_contract_docs,
            commands::contract_docs::get_function_doc,
            commands::contract_docs::upsert_contract_doc,
            commands::contract_docs::delete_contract_doc,
            commands::contract_docs::delete_function_doc,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
