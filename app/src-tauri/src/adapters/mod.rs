use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;

use crate::error::CocoError;
use crate::types::{ChainConfig, Ecosystem};

pub mod mock;
pub mod traits;

pub use traits::*;

/// Registry that manages all chain adapters
pub struct AdapterRegistry {
    adapters: RwLock<HashMap<String, Arc<dyn FullAdapter>>>,
}

impl AdapterRegistry {
    pub fn new() -> Self {
        Self {
            adapters: RwLock::new(HashMap::new()),
        }
    }

    /// Registers a new chain adapter
    pub async fn register(&self, config: ChainConfig) -> Result<(), CocoError> {
        let adapter: Arc<dyn FullAdapter> = match config.ecosystem {
            Ecosystem::Evm => Arc::new(mock::MockAdapter::new(config.clone())),
            Ecosystem::Solana => Arc::new(mock::MockAdapter::new(config.clone())),
            Ecosystem::Aptos => Arc::new(mock::MockAdapter::new(config.clone())),
        };

        let mut adapters = self.adapters.write().await;
        adapters.insert(config.id.clone(), adapter);
        Ok(())
    }

    /// Gets an adapter by chain ID
    pub async fn get(&self, chain_id: &str) -> Option<Arc<dyn FullAdapter>> {
        let adapters = self.adapters.read().await;
        adapters.get(chain_id).cloned()
    }

    /// Gets an adapter by ecosystem type
    pub fn get_adapter(&self, _ecosystem: &Ecosystem) -> Option<Arc<dyn FullAdapter>> {
        // For now return None - adapters are registered per chain, not per ecosystem
        None
    }

    /// Removes an adapter
    pub async fn remove(&self, chain_id: &str) -> Option<Arc<dyn FullAdapter>> {
        let mut adapters = self.adapters.write().await;
        adapters.remove(chain_id)
    }

    /// Lists all registered chain IDs
    pub async fn list_chains(&self) -> Vec<String> {
        let adapters = self.adapters.read().await;
        adapters.keys().cloned().collect()
    }
}

impl Default for AdapterRegistry {
    fn default() -> Self {
        Self::new()
    }
}

/// Factory function for creating adapters (useful for testing)
pub fn create_adapter(
    config: ChainConfig,
    use_mock: bool,
) -> Result<Arc<dyn FullAdapter>, CocoError> {
    if use_mock {
        return Ok(Arc::new(mock::MockAdapter::new(config)));
    }

    // For now, always use mock adapter
    // Real implementations would be added here
    match config.ecosystem {
        Ecosystem::Evm => Ok(Arc::new(mock::MockAdapter::new(config))),
        Ecosystem::Solana => Ok(Arc::new(mock::MockAdapter::new(config))),
        Ecosystem::Aptos => Ok(Arc::new(mock::MockAdapter::new(config))),
    }
}
