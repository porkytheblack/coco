pub mod adapters;
pub mod commands;
pub mod db;
pub mod error;
pub mod services;
pub mod types;

use adapters::AdapterRegistry;
use db::DbPool;
use services::{ChainService, RunService, WalletService, WorkspaceService};
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
}

impl AppState {
    pub async fn new(db_pool: DbPool) -> Self {
        // Create adapter registry
        let adapter_registry = Arc::new(RwLock::new(AdapterRegistry::new()));

        // Create services with database pool
        let chain_service = Arc::new(ChainService::new(db_pool.clone(), adapter_registry.clone()));
        let wallet_service = Arc::new(WalletService::new(db_pool.clone(), adapter_registry.clone()));
        let workspace_service = Arc::new(WorkspaceService::new(db_pool.clone()));
        let run_service = Arc::new(RunService::new(db_pool.clone()));

        Self {
            db_pool,
            chain_service,
            wallet_service,
            workspace_service,
            run_service,
            adapter_registry,
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
            // Chain commands
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
            // Run commands
            commands::runs::start_build,
            commands::runs::start_test,
            commands::runs::start_deploy,
            commands::runs::cancel_run,
            commands::runs::list_runs,
            commands::runs::get_run_detail,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
