# Coco Architecture Document

## Overview

Coco is a local-first blockchain development workstation built with Tauri (Rust backend) and Next.js (React frontend). The architecture prioritizes composability, testability, and extensibility across multiple blockchain ecosystems.

---

## Design Principles

1. **Adapter Pattern for Chains** — Each blockchain ecosystem implements a common interface. Adding a new chain means implementing one adapter, not touching core logic.

2. **Local-First** — All data lives on the user's machine. SQLite for structured data, filesystem for scripts and artifacts.

3. **Composable & Testable** — Every component can be tested in isolation. Mock adapters enable full integration testing without real networks.

4. **Process Isolation** — CLI tools (Forge, Anchor, Aptos CLI) run as spawned processes with captured stdout/stderr. Coco wraps, never replaces.

5. **Type Safety End-to-End** — Rust types generate TypeScript types. No runtime type mismatches between frontend and backend.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND (Next.js)                             │
│                                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   Pages     │  │ Components  │  │   Stores    │  │   Hooks     │        │
│  │             │  │             │  │  (Zustand)  │  │             │        │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘        │
│         │                │                │                │                │
│         └────────────────┴────────────────┴────────────────┘                │
│                                    │                                        │
│                          ┌─────────▼─────────┐                              │
│                          │   Tauri Bridge    │                              │
│                          │   (IPC Client)    │                              │
│                          └─────────┬─────────┘                              │
└────────────────────────────────────┼────────────────────────────────────────┘
                                     │ IPC (invoke / events)
┌────────────────────────────────────┼────────────────────────────────────────┐
│                              BACKEND (Tauri/Rust)                           │
│                          ┌─────────▼─────────┐                              │
│                          │   Command Layer   │                              │
│                          │   (Tauri Commands)│                              │
│                          └─────────┬─────────┘                              │
│                                    │                                        │
│         ┌──────────────────────────┼──────────────────────────┐             │
│         │                          │                          │             │
│  ┌──────▼──────┐  ┌────────────────▼────────────────┐  ┌──────▼──────┐     │
│  │   Services  │  │        Chain Adapters           │  │   Process   │     │
│  │             │  │                                 │  │   Manager   │     │
│  │ • Wallet    │  │  ┌─────┐  ┌─────┐  ┌─────┐     │  │             │     │
│  │ • Workspace │  │  │ EVM │  │ Sol │  │ Apt │     │  │ • Forge     │     │
│  │ • Script    │  │  └─────┘  └─────┘  └─────┘     │  │ • Anchor    │     │
│  │ • Run       │  │                                 │  │ • Aptos CLI │     │
│  └──────┬──────┘  └────────────────┬────────────────┘  └──────┬──────┘     │
│         │                          │                          │             │
│         └──────────────────────────┼──────────────────────────┘             │
│                                    │                                        │
│                          ┌─────────▼─────────┐                              │
│                          │   Data Layer      │                              │
│                          │   (SQLite + FS)   │                              │
│                          └───────────────────┘                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Directory Structure

```
coco/
├── src-tauri/                    # Rust backend
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   └── src/
│       ├── main.rs               # Entry point
│       ├── lib.rs                # Library root
│       ├── commands/             # Tauri command handlers
│       │   ├── mod.rs
│       │   ├── chains.rs
│       │   ├── wallets.rs
│       │   ├── workspaces.rs
│       │   ├── contracts.rs
│       │   ├── transactions.rs
│       │   ├── scripts.rs
│       │   └── runs.rs
│       ├── services/             # Business logic
│       │   ├── mod.rs
│       │   ├── wallet_service.rs
│       │   ├── workspace_service.rs
│       │   ├── script_service.rs
│       │   ├── run_service.rs
│       │   └── discovery_service.rs
│       ├── adapters/             # Chain adapters
│       │   ├── mod.rs
│       │   ├── traits.rs         # Adapter interfaces
│       │   ├── evm/
│       │   │   ├── mod.rs
│       │   │   ├── adapter.rs
│       │   │   ├── types.rs
│       │   │   └── abi.rs
│       │   ├── solana/
│       │   │   ├── mod.rs
│       │   │   ├── adapter.rs
│       │   │   ├── types.rs
│       │   │   └── idl.rs
│       │   ├── aptos/
│       │   │   ├── mod.rs
│       │   │   ├── adapter.rs
│       │   │   ├── types.rs
│       │   │   └── move_module.rs
│       │   └── mock/             # Mock adapter for testing
│       │       ├── mod.rs
│       │       └── adapter.rs
│       ├── process/              # CLI process management
│       │   ├── mod.rs
│       │   ├── manager.rs
│       │   ├── forge.rs
│       │   ├── anchor.rs
│       │   └── aptos_cli.rs
│       ├── db/                   # Database layer
│       │   ├── mod.rs
│       │   ├── migrations/
│       │   ├── models.rs
│       │   ├── schema.rs
│       │   └── repository.rs
│       ├── crypto/               # Key management
│       │   ├── mod.rs
│       │   ├── keystore.rs
│       │   └── encryption.rs
│       ├── types/                # Shared types
│       │   ├── mod.rs
│       │   ├── chain.rs
│       │   ├── wallet.rs
│       │   ├── workspace.rs
│       │   ├── contract.rs
│       │   ├── transaction.rs
│       │   ├── script.rs
│       │   └── run.rs
│       └── error.rs              # Error types
│
├── src/                          # Next.js frontend
│   ├── app/                      # App router pages
│   │   ├── layout.tsx
│   │   ├── page.tsx              # Chain selection
│   │   ├── chains/
│   │   │   └── [chainId]/
│   │   │       ├── page.tsx      # Chain dashboard
│   │   │       ├── wallets/
│   │   │       │   └── [walletId]/
│   │   │       │       └── page.tsx
│   │   │       └── workspaces/
│   │   │           └── [workspaceId]/
│   │   │               ├── page.tsx
│   │   │               └── scripts/
│   │   │                   └── [scriptId]/
│   │   │                       └── page.tsx
│   │   └── settings/
│   │       └── page.tsx
│   ├── components/
│   │   ├── ui/                   # Base components
│   │   │   ├── badge.tsx
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── drawer.tsx
│   │   │   ├── modal.tsx
│   │   │   ├── input.tsx
│   │   │   └── terminal.tsx
│   │   ├── chains/
│   │   │   ├── chain-card.tsx
│   │   │   └── chain-selector.tsx
│   │   ├── wallets/
│   │   │   ├── wallet-card.tsx
│   │   │   ├── wallet-list.tsx
│   │   │   └── wallet-detail.tsx
│   │   ├── workspaces/
│   │   │   ├── workspace-card.tsx
│   │   │   ├── workspace-grid.tsx
│   │   │   └── workspace-settings.tsx
│   │   ├── contracts/
│   │   │   ├── contract-list.tsx
│   │   │   ├── add-contract-modal.tsx
│   │   │   └── contract-discovery.tsx
│   │   ├── transactions/
│   │   │   ├── transaction-sidebar.tsx
│   │   │   ├── transaction-detail.tsx
│   │   │   └── run-history.tsx
│   │   ├── scripts/
│   │   │   ├── script-editor.tsx
│   │   │   ├── payload-form.tsx
│   │   │   └── interface-panel.tsx
│   │   └── runs/
│   │       ├── run-drawer.tsx
│   │       ├── run-list.tsx
│   │       ├── run-detail.tsx
│   │       └── terminal-output.tsx
│   ├── lib/
│   │   ├── tauri/                # Tauri IPC client
│   │   │   ├── index.ts
│   │   │   ├── chains.ts
│   │   │   ├── wallets.ts
│   │   │   ├── workspaces.ts
│   │   │   ├── contracts.ts
│   │   │   ├── transactions.ts
│   │   │   ├── scripts.ts
│   │   │   └── runs.ts
│   │   ├── hooks/
│   │   │   ├── use-chain.ts
│   │   │   ├── use-wallet.ts
│   │   │   ├── use-workspace.ts
│   │   │   ├── use-runs.ts
│   │   │   └── use-terminal.ts
│   │   └── utils/
│   │       ├── format.ts
│   │       └── validation.ts
│   ├── stores/                   # Zustand stores
│   │   ├── chain-store.ts
│   │   ├── wallet-store.ts
│   │   ├── workspace-store.ts
│   │   ├── ui-store.ts
│   │   └── theme-store.ts
│   └── styles/
│       ├── globals.css
│       └── tokens.css            # Design tokens
│
├── scripts/                      # Build scripts
│   └── generate-types.ts         # Rust → TS type generation
│
├── tests/                        # Integration tests
│   ├── adapters/
│   ├── services/
│   └── e2e/
│
└── package.json
```

---

## Chain Adapter Architecture

The adapter pattern allows Coco to support multiple blockchains through a common interface. Each chain implements the same traits, and the core services work against these abstractions.

### Core Traits

```rust
// src-tauri/src/adapters/traits.rs

use async_trait::async_trait;
use crate::types::*;
use crate::error::CocoError;

/// Core adapter trait that all chain implementations must satisfy
#[async_trait]
pub trait ChainAdapter: Send + Sync {
    /// Returns the chain ecosystem type
    fn ecosystem(&self) -> Ecosystem;
    
    /// Returns the chain identifier
    fn chain_id(&self) -> &str;
    
    /// Validates a chain connection
    async fn validate_connection(&self) -> Result<bool, CocoError>;
    
    /// Gets the current block height
    async fn get_block_height(&self) -> Result<u64, CocoError>;
}

#[async_trait]
pub trait WalletAdapter: ChainAdapter {
    /// Generates a new wallet
    async fn generate_wallet(&self) -> Result<WalletData, CocoError>;
    
    /// Imports a wallet from private key
    async fn import_wallet(&self, private_key: &str) -> Result<WalletData, CocoError>;
    
    /// Imports a wallet from mnemonic
    async fn import_from_mnemonic(
        &self, 
        mnemonic: &str, 
        derivation_path: Option<&str>
    ) -> Result<WalletData, CocoError>;
    
    /// Gets the balance of an address
    async fn get_balance(&self, address: &str) -> Result<Balance, CocoError>;
    
    /// Gets token balances for an address
    async fn get_token_balances(&self, address: &str) -> Result<Vec<TokenBalance>, CocoError>;
    
    /// Requests funds from faucet (testnet only)
    async fn request_faucet(&self, address: &str) -> Result<String, CocoError>;
    
    /// Signs a message
    async fn sign_message(
        &self, 
        wallet: &WalletData, 
        message: &[u8]
    ) -> Result<Vec<u8>, CocoError>;
}

#[async_trait]
pub trait TransactionAdapter: ChainAdapter {
    /// Sends a transaction
    async fn send_transaction(
        &self,
        wallet: &WalletData,
        tx: TransactionRequest,
    ) -> Result<TransactionResult, CocoError>;
    
    /// Gets a transaction by hash
    async fn get_transaction(&self, hash: &str) -> Result<TransactionData, CocoError>;
    
    /// Gets transaction receipt/confirmation
    async fn get_transaction_receipt(&self, hash: &str) -> Result<TransactionReceipt, CocoError>;
    
    /// Estimates gas/fees for a transaction
    async fn estimate_fees(&self, tx: &TransactionRequest) -> Result<FeeEstimate, CocoError>;
    
    /// Simulates a transaction without sending
    async fn simulate_transaction(
        &self,
        tx: &TransactionRequest,
    ) -> Result<SimulationResult, CocoError>;
}

#[async_trait]
pub trait ContractAdapter: ChainAdapter {
    /// The contract interface type for this chain (ABI, IDL, etc.)
    type ContractInterface;
    
    /// Parses a contract interface from bytes
    fn parse_interface(&self, data: &[u8]) -> Result<Self::ContractInterface, CocoError>;
    
    /// Deploys a contract
    async fn deploy_contract(
        &self,
        wallet: &WalletData,
        bytecode: &[u8],
        constructor_args: Option<Vec<u8>>,
    ) -> Result<DeploymentResult, CocoError>;
    
    /// Calls a read-only contract function
    async fn call_contract(
        &self,
        address: &str,
        function: &str,
        args: Vec<ContractArg>,
    ) -> Result<ContractCallResult, CocoError>;
    
    /// Encodes a contract call for transaction
    fn encode_call(
        &self,
        interface: &Self::ContractInterface,
        function: &str,
        args: Vec<ContractArg>,
    ) -> Result<Vec<u8>, CocoError>;
    
    /// Decodes contract events/logs
    fn decode_events(
        &self,
        interface: &Self::ContractInterface,
        logs: &[Log],
    ) -> Result<Vec<DecodedEvent>, CocoError>;
}

#[async_trait]
pub trait DiscoveryAdapter: ChainAdapter {
    /// Discovers contracts in a project directory
    async fn discover_contracts(
        &self,
        project_path: &Path,
    ) -> Result<Vec<DiscoveredContract>, CocoError>;
    
    /// Fetches contract interface from a deployed address (if verified)
    async fn fetch_contract_interface(
        &self,
        address: &str,
    ) -> Result<Option<Vec<u8>>, CocoError>;
}

/// Combined adapter that implements all capabilities
pub trait FullAdapter: 
    WalletAdapter + 
    TransactionAdapter + 
    ContractAdapter + 
    DiscoveryAdapter 
{}

// Blanket implementation
impl<T> FullAdapter for T 
where 
    T: WalletAdapter + TransactionAdapter + ContractAdapter + DiscoveryAdapter 
{}
```

### Adapter Registry

```rust
// src-tauri/src/adapters/mod.rs

use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;

use crate::types::{ChainConfig, Ecosystem};
use crate::error::CocoError;

mod traits;
mod evm;
mod solana;
mod aptos;
mod mock;

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
            Ecosystem::Evm => Arc::new(evm::EvmAdapter::new(config)?),
            Ecosystem::Solana => Arc::new(solana::SolanaAdapter::new(config)?),
            Ecosystem::Aptos => Arc::new(aptos::AptosAdapter::new(config)?),
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

/// Factory function for creating adapters (useful for testing)
pub fn create_adapter(
    config: ChainConfig,
    use_mock: bool,
) -> Result<Arc<dyn FullAdapter>, CocoError> {
    if use_mock {
        return Ok(Arc::new(mock::MockAdapter::new(config)));
    }
    
    match config.ecosystem {
        Ecosystem::Evm => Ok(Arc::new(evm::EvmAdapter::new(config)?)),
        Ecosystem::Solana => Ok(Arc::new(solana::SolanaAdapter::new(config)?)),
        Ecosystem::Aptos => Ok(Arc::new(aptos::AptosAdapter::new(config)?)),
    }
}
```

### EVM Adapter Implementation

```rust
// src-tauri/src/adapters/evm/adapter.rs

use async_trait::async_trait;
use ethers::prelude::*;
use std::sync::Arc;

use crate::adapters::traits::*;
use crate::types::*;
use crate::error::CocoError;

pub struct EvmAdapter {
    config: ChainConfig,
    provider: Arc<Provider<Http>>,
}

impl EvmAdapter {
    pub fn new(config: ChainConfig) -> Result<Self, CocoError> {
        let provider = Provider::<Http>::try_from(&config.rpc_url)
            .map_err(|e| CocoError::ConnectionError(e.to_string()))?;
        
        Ok(Self {
            config,
            provider: Arc::new(provider),
        })
    }
}

#[async_trait]
impl ChainAdapter for EvmAdapter {
    fn ecosystem(&self) -> Ecosystem {
        Ecosystem::Evm
    }
    
    fn chain_id(&self) -> &str {
        &self.config.id
    }
    
    async fn validate_connection(&self) -> Result<bool, CocoError> {
        self.provider
            .get_block_number()
            .await
            .map(|_| true)
            .map_err(|e| CocoError::ConnectionError(e.to_string()))
    }
    
    async fn get_block_height(&self) -> Result<u64, CocoError> {
        self.provider
            .get_block_number()
            .await
            .map(|n| n.as_u64())
            .map_err(|e| CocoError::ConnectionError(e.to_string()))
    }
}

#[async_trait]
impl WalletAdapter for EvmAdapter {
    async fn generate_wallet(&self) -> Result<WalletData, CocoError> {
        let wallet = LocalWallet::new(&mut rand::thread_rng());
        
        Ok(WalletData {
            address: format!("{:?}", wallet.address()),
            public_key: hex::encode(wallet.signer().verifying_key().to_encoded_point(false).as_bytes()),
            private_key_encrypted: None, // Encrypted by caller
            ecosystem: Ecosystem::Evm,
        })
    }
    
    async fn import_wallet(&self, private_key: &str) -> Result<WalletData, CocoError> {
        let wallet: LocalWallet = private_key
            .parse()
            .map_err(|e: WalletError| CocoError::InvalidKey(e.to_string()))?;
        
        Ok(WalletData {
            address: format!("{:?}", wallet.address()),
            public_key: hex::encode(wallet.signer().verifying_key().to_encoded_point(false).as_bytes()),
            private_key_encrypted: None,
            ecosystem: Ecosystem::Evm,
        })
    }
    
    async fn import_from_mnemonic(
        &self,
        mnemonic: &str,
        derivation_path: Option<&str>,
    ) -> Result<WalletData, CocoError> {
        let path = derivation_path.unwrap_or("m/44'/60'/0'/0/0");
        let wallet = MnemonicBuilder::<English>::default()
            .phrase(mnemonic)
            .derivation_path(path)
            .map_err(|e| CocoError::InvalidKey(e.to_string()))?
            .build()
            .map_err(|e| CocoError::InvalidKey(e.to_string()))?;
        
        Ok(WalletData {
            address: format!("{:?}", wallet.address()),
            public_key: hex::encode(wallet.signer().verifying_key().to_encoded_point(false).as_bytes()),
            private_key_encrypted: None,
            ecosystem: Ecosystem::Evm,
        })
    }
    
    async fn get_balance(&self, address: &str) -> Result<Balance, CocoError> {
        let address: Address = address
            .parse()
            .map_err(|_| CocoError::InvalidAddress(address.to_string()))?;
        
        let balance = self.provider
            .get_balance(address, None)
            .await
            .map_err(|e| CocoError::RpcError(e.to_string()))?;
        
        Ok(Balance {
            native: balance.to_string(),
            native_decimals: 18,
            native_symbol: self.config.native_currency.clone(),
        })
    }
    
    async fn get_token_balances(&self, address: &str) -> Result<Vec<TokenBalance>, CocoError> {
        // Implementation would use multicall or indexer
        // Simplified for brevity
        Ok(vec![])
    }
    
    async fn request_faucet(&self, address: &str) -> Result<String, CocoError> {
        // Implementation depends on the specific testnet
        // Could integrate with common faucets or use a custom endpoint
        Err(CocoError::NotSupported("Faucet not configured for this chain".into()))
    }
    
    async fn sign_message(
        &self,
        wallet: &WalletData,
        message: &[u8],
    ) -> Result<Vec<u8>, CocoError> {
        // Would need decrypted private key
        // Implementation details depend on key management
        unimplemented!()
    }
}

#[async_trait]
impl TransactionAdapter for EvmAdapter {
    async fn send_transaction(
        &self,
        wallet: &WalletData,
        tx: TransactionRequest,
    ) -> Result<TransactionResult, CocoError> {
        // Convert to ethers transaction and send
        // Implementation would use wallet signing
        unimplemented!()
    }
    
    async fn get_transaction(&self, hash: &str) -> Result<TransactionData, CocoError> {
        let hash: H256 = hash
            .parse()
            .map_err(|_| CocoError::InvalidHash(hash.to_string()))?;
        
        let tx = self.provider
            .get_transaction(hash)
            .await
            .map_err(|e| CocoError::RpcError(e.to_string()))?
            .ok_or_else(|| CocoError::NotFound("Transaction not found".into()))?;
        
        Ok(TransactionData::from_evm_transaction(tx))
    }
    
    async fn get_transaction_receipt(&self, hash: &str) -> Result<TransactionReceipt, CocoError> {
        let hash: H256 = hash
            .parse()
            .map_err(|_| CocoError::InvalidHash(hash.to_string()))?;
        
        let receipt = self.provider
            .get_transaction_receipt(hash)
            .await
            .map_err(|e| CocoError::RpcError(e.to_string()))?
            .ok_or_else(|| CocoError::NotFound("Receipt not found".into()))?;
        
        Ok(TransactionReceipt::from_evm_receipt(receipt))
    }
    
    async fn estimate_fees(&self, tx: &TransactionRequest) -> Result<FeeEstimate, CocoError> {
        // Implementation for gas estimation
        unimplemented!()
    }
    
    async fn simulate_transaction(
        &self,
        tx: &TransactionRequest,
    ) -> Result<SimulationResult, CocoError> {
        // Use eth_call for simulation
        unimplemented!()
    }
}

#[async_trait]
impl ContractAdapter for EvmAdapter {
    type ContractInterface = ethers::abi::Abi;
    
    fn parse_interface(&self, data: &[u8]) -> Result<Self::ContractInterface, CocoError> {
        serde_json::from_slice(data)
            .map_err(|e| CocoError::ParseError(e.to_string()))
    }
    
    async fn deploy_contract(
        &self,
        wallet: &WalletData,
        bytecode: &[u8],
        constructor_args: Option<Vec<u8>>,
    ) -> Result<DeploymentResult, CocoError> {
        // Implementation for contract deployment
        unimplemented!()
    }
    
    async fn call_contract(
        &self,
        address: &str,
        function: &str,
        args: Vec<ContractArg>,
    ) -> Result<ContractCallResult, CocoError> {
        // Implementation for eth_call
        unimplemented!()
    }
    
    fn encode_call(
        &self,
        interface: &Self::ContractInterface,
        function: &str,
        args: Vec<ContractArg>,
    ) -> Result<Vec<u8>, CocoError> {
        // ABI encoding
        unimplemented!()
    }
    
    fn decode_events(
        &self,
        interface: &Self::ContractInterface,
        logs: &[Log],
    ) -> Result<Vec<DecodedEvent>, CocoError> {
        // Event decoding using ABI
        unimplemented!()
    }
}

#[async_trait]
impl DiscoveryAdapter for EvmAdapter {
    async fn discover_contracts(
        &self,
        project_path: &Path,
    ) -> Result<Vec<DiscoveredContract>, CocoError> {
        // Look in out/ directory for Forge artifacts
        let out_dir = project_path.join("out");
        if !out_dir.exists() {
            return Ok(vec![]);
        }
        
        let mut contracts = vec![];
        
        // Walk the out directory and find .json files
        for entry in walkdir::WalkDir::new(&out_dir)
            .into_iter()
            .filter_map(|e| e.ok())
            .filter(|e| e.path().extension().map_or(false, |ext| ext == "json"))
        {
            if let Ok(content) = std::fs::read_to_string(entry.path()) {
                if let Ok(artifact) = serde_json::from_str::<ForgeArtifact>(&content) {
                    // Filter out interfaces and dependencies
                    if artifact.bytecode.object.len() > 2 { // "0x" minimum
                        contracts.push(DiscoveredContract {
                            name: entry.path()
                                .file_stem()
                                .and_then(|s| s.to_str())
                                .unwrap_or("Unknown")
                                .to_string(),
                            path: entry.path().to_path_buf(),
                            interface_type: InterfaceType::Abi,
                            is_interface: false,
                            is_dependency: entry.path()
                                .to_string_lossy()
                                .contains("lib/"),
                        });
                    }
                }
            }
        }
        
        Ok(contracts)
    }
    
    async fn fetch_contract_interface(
        &self,
        address: &str,
    ) -> Result<Option<Vec<u8>>, CocoError> {
        // Would fetch from Etherscan/Sourcify
        // Requires API key configuration
        Ok(None)
    }
}
```

### Mock Adapter for Testing

```rust
// src-tauri/src/adapters/mock/adapter.rs

use async_trait::async_trait;
use std::collections::HashMap;
use std::sync::RwLock;

use crate::adapters::traits::*;
use crate::types::*;
use crate::error::CocoError;

/// Mock adapter for testing without real network calls
pub struct MockAdapter {
    config: ChainConfig,
    wallets: RwLock<HashMap<String, MockWalletState>>,
    transactions: RwLock<HashMap<String, MockTransaction>>,
    block_height: RwLock<u64>,
}

struct MockWalletState {
    balance: u128,
    nonce: u64,
}

struct MockTransaction {
    hash: String,
    status: MockTxStatus,
    data: TransactionData,
}

enum MockTxStatus {
    Pending,
    Confirmed,
    Failed(String),
}

impl MockAdapter {
    pub fn new(config: ChainConfig) -> Self {
        Self {
            config,
            wallets: RwLock::new(HashMap::new()),
            transactions: RwLock::new(HashMap::new()),
            block_height: RwLock::new(1000),
        }
    }
    
    /// Sets up initial wallet state for testing
    pub fn seed_wallet(&self, address: &str, balance: u128) {
        let mut wallets = self.wallets.write().unwrap();
        wallets.insert(address.to_string(), MockWalletState {
            balance,
            nonce: 0,
        });
    }
    
    /// Advances the mock block height
    pub fn advance_blocks(&self, count: u64) {
        let mut height = self.block_height.write().unwrap();
        *height += count;
    }
    
    /// Sets a transaction to confirmed
    pub fn confirm_transaction(&self, hash: &str) {
        let mut txs = self.transactions.write().unwrap();
        if let Some(tx) = txs.get_mut(hash) {
            tx.status = MockTxStatus::Confirmed;
        }
    }
    
    /// Fails a transaction
    pub fn fail_transaction(&self, hash: &str, reason: &str) {
        let mut txs = self.transactions.write().unwrap();
        if let Some(tx) = txs.get_mut(hash) {
            tx.status = MockTxStatus::Failed(reason.to_string());
        }
    }
}

#[async_trait]
impl ChainAdapter for MockAdapter {
    fn ecosystem(&self) -> Ecosystem {
        self.config.ecosystem.clone()
    }
    
    fn chain_id(&self) -> &str {
        &self.config.id
    }
    
    async fn validate_connection(&self) -> Result<bool, CocoError> {
        Ok(true)
    }
    
    async fn get_block_height(&self) -> Result<u64, CocoError> {
        Ok(*self.block_height.read().unwrap())
    }
}

#[async_trait]
impl WalletAdapter for MockAdapter {
    async fn generate_wallet(&self) -> Result<WalletData, CocoError> {
        let address = format!("0x{:040x}", rand::random::<u64>());
        
        self.seed_wallet(&address, 0);
        
        Ok(WalletData {
            address,
            public_key: "mock_public_key".to_string(),
            private_key_encrypted: None,
            ecosystem: self.config.ecosystem.clone(),
        })
    }
    
    async fn import_wallet(&self, private_key: &str) -> Result<WalletData, CocoError> {
        // Mock: derive address from private key hash
        let address = format!("0x{:040x}", private_key.len() as u64 * 12345);
        
        self.seed_wallet(&address, 0);
        
        Ok(WalletData {
            address,
            public_key: "mock_public_key".to_string(),
            private_key_encrypted: None,
            ecosystem: self.config.ecosystem.clone(),
        })
    }
    
    async fn import_from_mnemonic(
        &self,
        mnemonic: &str,
        _derivation_path: Option<&str>,
    ) -> Result<WalletData, CocoError> {
        self.import_wallet(mnemonic).await
    }
    
    async fn get_balance(&self, address: &str) -> Result<Balance, CocoError> {
        let wallets = self.wallets.read().unwrap();
        let balance = wallets
            .get(address)
            .map(|w| w.balance)
            .unwrap_or(0);
        
        Ok(Balance {
            native: balance.to_string(),
            native_decimals: 18,
            native_symbol: self.config.native_currency.clone(),
        })
    }
    
    async fn get_token_balances(&self, _address: &str) -> Result<Vec<TokenBalance>, CocoError> {
        Ok(vec![])
    }
    
    async fn request_faucet(&self, address: &str) -> Result<String, CocoError> {
        let mut wallets = self.wallets.write().unwrap();
        if let Some(wallet) = wallets.get_mut(address) {
            wallet.balance += 1_000_000_000_000_000_000; // 1 ETH equivalent
        }
        Ok("mock_faucet_tx_hash".to_string())
    }
    
    async fn sign_message(
        &self,
        _wallet: &WalletData,
        message: &[u8],
    ) -> Result<Vec<u8>, CocoError> {
        // Return mock signature
        Ok(format!("mock_signature_{}", hex::encode(message)).into_bytes())
    }
}

// Implement other traits similarly...
#[async_trait]
impl TransactionAdapter for MockAdapter {
    async fn send_transaction(
        &self,
        wallet: &WalletData,
        tx: TransactionRequest,
    ) -> Result<TransactionResult, CocoError> {
        let hash = format!("0x{:064x}", rand::random::<u128>());
        
        let mut txs = self.transactions.write().unwrap();
        txs.insert(hash.clone(), MockTransaction {
            hash: hash.clone(),
            status: MockTxStatus::Pending,
            data: TransactionData {
                hash: hash.clone(),
                from: wallet.address.clone(),
                to: tx.to.clone(),
                value: tx.value.clone(),
                data: tx.data.clone(),
                block_number: None,
                timestamp: chrono::Utc::now(),
            },
        });
        
        Ok(TransactionResult {
            hash,
            status: TxStatus::Pending,
        })
    }
    
    async fn get_transaction(&self, hash: &str) -> Result<TransactionData, CocoError> {
        let txs = self.transactions.read().unwrap();
        txs.get(hash)
            .map(|t| t.data.clone())
            .ok_or_else(|| CocoError::NotFound("Transaction not found".into()))
    }
    
    async fn get_transaction_receipt(&self, hash: &str) -> Result<TransactionReceipt, CocoError> {
        let txs = self.transactions.read().unwrap();
        let tx = txs.get(hash)
            .ok_or_else(|| CocoError::NotFound("Transaction not found".into()))?;
        
        match &tx.status {
            MockTxStatus::Pending => Err(CocoError::NotFound("Receipt not available yet".into())),
            MockTxStatus::Confirmed => Ok(TransactionReceipt {
                hash: hash.to_string(),
                status: true,
                block_number: *self.block_height.read().unwrap(),
                gas_used: 21000,
                events: vec![],
            }),
            MockTxStatus::Failed(reason) => Ok(TransactionReceipt {
                hash: hash.to_string(),
                status: false,
                block_number: *self.block_height.read().unwrap(),
                gas_used: 21000,
                events: vec![],
            }),
        }
    }
    
    async fn estimate_fees(&self, _tx: &TransactionRequest) -> Result<FeeEstimate, CocoError> {
        Ok(FeeEstimate {
            gas_limit: 21000,
            gas_price: "1000000000".to_string(), // 1 gwei
            total_fee: "21000000000000".to_string(),
        })
    }
    
    async fn simulate_transaction(
        &self,
        _tx: &TransactionRequest,
    ) -> Result<SimulationResult, CocoError> {
        Ok(SimulationResult {
            success: true,
            return_data: vec![],
            gas_used: 21000,
            logs: vec![],
        })
    }
}

#[async_trait]
impl ContractAdapter for MockAdapter {
    type ContractInterface = serde_json::Value;
    
    fn parse_interface(&self, data: &[u8]) -> Result<Self::ContractInterface, CocoError> {
        serde_json::from_slice(data)
            .map_err(|e| CocoError::ParseError(e.to_string()))
    }
    
    async fn deploy_contract(
        &self,
        wallet: &WalletData,
        _bytecode: &[u8],
        _constructor_args: Option<Vec<u8>>,
    ) -> Result<DeploymentResult, CocoError> {
        let address = format!("0x{:040x}", rand::random::<u64>());
        let tx_hash = format!("0x{:064x}", rand::random::<u128>());
        
        Ok(DeploymentResult {
            address,
            transaction_hash: tx_hash,
            block_number: *self.block_height.read().unwrap(),
        })
    }
    
    async fn call_contract(
        &self,
        _address: &str,
        _function: &str,
        _args: Vec<ContractArg>,
    ) -> Result<ContractCallResult, CocoError> {
        Ok(ContractCallResult {
            return_data: vec![],
            decoded: serde_json::json!({}),
        })
    }
    
    fn encode_call(
        &self,
        _interface: &Self::ContractInterface,
        _function: &str,
        _args: Vec<ContractArg>,
    ) -> Result<Vec<u8>, CocoError> {
        Ok(vec![0u8; 32])
    }
    
    fn decode_events(
        &self,
        _interface: &Self::ContractInterface,
        _logs: &[Log],
    ) -> Result<Vec<DecodedEvent>, CocoError> {
        Ok(vec![])
    }
}

#[async_trait]
impl DiscoveryAdapter for MockAdapter {
    async fn discover_contracts(
        &self,
        _project_path: &Path,
    ) -> Result<Vec<DiscoveredContract>, CocoError> {
        // Return mock contracts for testing
        Ok(vec![
            DiscoveredContract {
                name: "MockToken".to_string(),
                path: PathBuf::from("out/MockToken.sol/MockToken.json"),
                interface_type: InterfaceType::Abi,
                is_interface: false,
                is_dependency: false,
            },
        ])
    }
    
    async fn fetch_contract_interface(
        &self,
        _address: &str,
    ) -> Result<Option<Vec<u8>>, CocoError> {
        Ok(None)
    }
}
```

---

## Service Layer

Services contain business logic and orchestrate between adapters, database, and process management.

### Wallet Service

```rust
// src-tauri/src/services/wallet_service.rs

use std::sync::Arc;

use crate::adapters::{AdapterRegistry, WalletAdapter};
use crate::crypto::Keystore;
use crate::db::Repository;
use crate::types::*;
use crate::error::CocoError;

pub struct WalletService {
    registry: Arc<AdapterRegistry>,
    keystore: Arc<Keystore>,
    repository: Arc<Repository>,
}

impl WalletService {
    pub fn new(
        registry: Arc<AdapterRegistry>,
        keystore: Arc<Keystore>,
        repository: Arc<Repository>,
    ) -> Self {
        Self {
            registry,
            keystore,
            repository,
        }
    }
    
    pub async fn create_wallet(
        &self,
        chain_id: &str,
        name: &str,
    ) -> Result<Wallet, CocoError> {
        let adapter = self.registry
            .get(chain_id)
            .await
            .ok_or_else(|| CocoError::ChainNotFound(chain_id.to_string()))?;
        
        let wallet_data = adapter.generate_wallet().await?;
        
        // Encrypt private key
        let encrypted_key = self.keystore
            .encrypt(&wallet_data.private_key_encrypted.unwrap_or_default())?;
        
        // Save to database
        let wallet = Wallet {
            id: uuid::Uuid::new_v4().to_string(),
            chain_id: chain_id.to_string(),
            name: name.to_string(),
            address: wallet_data.address,
            public_key: wallet_data.public_key,
            encrypted_key,
            created_at: chrono::Utc::now(),
        };
        
        self.repository.save_wallet(&wallet).await?;
        
        Ok(wallet)
    }
    
    pub async fn get_wallet(&self, wallet_id: &str) -> Result<Wallet, CocoError> {
        self.repository
            .get_wallet(wallet_id)
            .await?
            .ok_or_else(|| CocoError::NotFound("Wallet not found".into()))
    }
    
    pub async fn list_wallets(&self, chain_id: &str) -> Result<Vec<Wallet>, CocoError> {
        self.repository.list_wallets_by_chain(chain_id).await
    }
    
    pub async fn get_balance(&self, wallet_id: &str) -> Result<WalletBalance, CocoError> {
        let wallet = self.get_wallet(wallet_id).await?;
        
        let adapter = self.registry
            .get(&wallet.chain_id)
            .await
            .ok_or_else(|| CocoError::ChainNotFound(wallet.chain_id.clone()))?;
        
        let balance = adapter.get_balance(&wallet.address).await?;
        let token_balances = adapter.get_token_balances(&wallet.address).await?;
        
        Ok(WalletBalance {
            wallet_id: wallet_id.to_string(),
            native: balance,
            tokens: token_balances,
        })
    }
    
    pub async fn fund_from_faucet(&self, wallet_id: &str) -> Result<String, CocoError> {
        let wallet = self.get_wallet(wallet_id).await?;
        
        let adapter = self.registry
            .get(&wallet.chain_id)
            .await
            .ok_or_else(|| CocoError::ChainNotFound(wallet.chain_id.clone()))?;
        
        adapter.request_faucet(&wallet.address).await
    }
    
    pub async fn delete_wallet(&self, wallet_id: &str) -> Result<(), CocoError> {
        // Check if wallet is assigned to any workspaces
        let assignments = self.repository
            .get_wallet_workspace_assignments(wallet_id)
            .await?;
        
        if !assignments.is_empty() {
            return Err(CocoError::WalletInUse(
                assignments.iter().map(|a| a.workspace_name.clone()).collect()
            ));
        }
        
        self.repository.delete_wallet(wallet_id).await
    }
}
```

### Run Service (CLI Process Management)

```rust
// src-tauri/src/services/run_service.rs

use std::sync::Arc;
use tokio::sync::mpsc;
use tokio::process::Command;
use tokio::io::{AsyncBufReadExt, BufReader};

use crate::db::Repository;
use crate::process::ProcessManager;
use crate::types::*;
use crate::error::CocoError;

pub struct RunService {
    repository: Arc<Repository>,
    process_manager: Arc<ProcessManager>,
}

impl RunService {
    pub fn new(
        repository: Arc<Repository>,
        process_manager: Arc<ProcessManager>,
    ) -> Self {
        Self {
            repository,
            process_manager,
        }
    }
    
    /// Starts a build run
    pub async fn start_build(
        &self,
        workspace_id: &str,
        output_tx: mpsc::Sender<RunOutput>,
    ) -> Result<Run, CocoError> {
        let workspace = self.repository
            .get_workspace(workspace_id)
            .await?
            .ok_or_else(|| CocoError::NotFound("Workspace not found".into()))?;
        
        let run = Run {
            id: uuid::Uuid::new_v4().to_string(),
            workspace_id: workspace_id.to_string(),
            run_type: RunType::Build,
            status: RunStatus::Running,
            started_at: chrono::Utc::now(),
            finished_at: None,
            duration_ms: None,
            exit_code: None,
        };
        
        self.repository.save_run(&run).await?;
        
        // Spawn the build process
        let run_id = run.id.clone();
        let repo = self.repository.clone();
        let pm = self.process_manager.clone();
        
        tokio::spawn(async move {
            let result = pm.run_build(&workspace, output_tx.clone()).await;
            
            let (status, exit_code) = match result {
                Ok(code) => {
                    if code == 0 {
                        (RunStatus::Success, Some(code))
                    } else {
                        (RunStatus::Failed, Some(code))
                    }
                }
                Err(e) => {
                    let _ = output_tx.send(RunOutput::Error(e.to_string())).await;
                    (RunStatus::Failed, None)
                }
            };
            
            // Update run status
            let _ = repo.update_run_status(&run_id, status, exit_code).await;
        });
        
        Ok(run)
    }
    
    /// Starts a test run
    pub async fn start_test(
        &self,
        workspace_id: &str,
        test_filter: Option<&str>,
        output_tx: mpsc::Sender<RunOutput>,
    ) -> Result<Run, CocoError> {
        // Similar to start_build but with test command
        let workspace = self.repository
            .get_workspace(workspace_id)
            .await?
            .ok_or_else(|| CocoError::NotFound("Workspace not found".into()))?;
        
        let run = Run {
            id: uuid::Uuid::new_v4().to_string(),
            workspace_id: workspace_id.to_string(),
            run_type: RunType::Test,
            status: RunStatus::Running,
            started_at: chrono::Utc::now(),
            finished_at: None,
            duration_ms: None,
            exit_code: None,
        };
        
        self.repository.save_run(&run).await?;
        
        let run_id = run.id.clone();
        let repo = self.repository.clone();
        let pm = self.process_manager.clone();
        let filter = test_filter.map(String::from);
        
        tokio::spawn(async move {
            let result = pm.run_test(&workspace, filter.as_deref(), output_tx.clone()).await;
            
            let (status, exit_code) = match result {
                Ok(code) => {
                    if code == 0 {
                        (RunStatus::Success, Some(code))
                    } else {
                        (RunStatus::Failed, Some(code))
                    }
                }
                Err(e) => {
                    let _ = output_tx.send(RunOutput::Error(e.to_string())).await;
                    (RunStatus::Failed, None)
                }
            };
            
            let _ = repo.update_run_status(&run_id, status, exit_code).await;
        });
        
        Ok(run)
    }
    
    /// Cancels a running process
    pub async fn cancel_run(&self, run_id: &str) -> Result<(), CocoError> {
        self.process_manager.cancel(run_id).await?;
        self.repository
            .update_run_status(run_id, RunStatus::Cancelled, None)
            .await
    }
    
    /// Gets run history for a workspace
    pub async fn list_runs(
        &self,
        workspace_id: &str,
        run_type: Option<RunType>,
        limit: usize,
    ) -> Result<Vec<Run>, CocoError> {
        self.repository
            .list_runs(workspace_id, run_type, limit)
            .await
    }
    
    /// Gets full run details including output
    pub async fn get_run(&self, run_id: &str) -> Result<RunDetail, CocoError> {
        let run = self.repository
            .get_run(run_id)
            .await?
            .ok_or_else(|| CocoError::NotFound("Run not found".into()))?;
        
        let output = self.repository.get_run_output(run_id).await?;
        
        Ok(RunDetail { run, output })
    }
}
```

### Process Manager

```rust
// src-tauri/src/process/manager.rs

use std::collections::HashMap;
use std::path::Path;
use std::sync::Arc;
use tokio::process::{Child, Command};
use tokio::sync::{mpsc, RwLock};
use tokio::io::{AsyncBufReadExt, BufReader};

use crate::types::*;
use crate::error::CocoError;

pub struct ProcessManager {
    running: RwLock<HashMap<String, RunningProcess>>,
    cli_paths: RwLock<CliPaths>,
}

struct RunningProcess {
    child: Child,
    run_id: String,
}

#[derive(Clone)]
pub struct CliPaths {
    pub forge: String,
    pub anchor: String,
    pub aptos: String,
}

impl Default for CliPaths {
    fn default() -> Self {
        Self {
            forge: "forge".to_string(),
            anchor: "anchor".to_string(),
            aptos: "aptos".to_string(),
        }
    }
}

pub enum RunOutput {
    Stdout(String),
    Stderr(String),
    Error(String),
    Exit(i32),
}

impl ProcessManager {
    pub fn new() -> Self {
        Self {
            running: RwLock::new(HashMap::new()),
            cli_paths: RwLock::new(CliPaths::default()),
        }
    }
    
    pub async fn set_cli_paths(&self, paths: CliPaths) {
        let mut current = self.cli_paths.write().await;
        *current = paths;
    }
    
    pub async fn run_build(
        &self,
        workspace: &Workspace,
        output_tx: mpsc::Sender<RunOutput>,
    ) -> Result<i32, CocoError> {
        let paths = self.cli_paths.read().await;
        
        let (cmd, args) = match workspace.ecosystem {
            Ecosystem::Evm => (&paths.forge, vec!["build"]),
            Ecosystem::Solana => (&paths.anchor, vec!["build"]),
            Ecosystem::Aptos => (&paths.aptos, vec!["move", "compile"]),
        };
        
        self.run_command(cmd, &args, &workspace.project_path, output_tx).await
    }
    
    pub async fn run_test(
        &self,
        workspace: &Workspace,
        filter: Option<&str>,
        output_tx: mpsc::Sender<RunOutput>,
    ) -> Result<i32, CocoError> {
        let paths = self.cli_paths.read().await;
        
        let (cmd, mut args) = match workspace.ecosystem {
            Ecosystem::Evm => (&paths.forge, vec!["test", "-vvv"]),
            Ecosystem::Solana => (&paths.anchor, vec!["test"]),
            Ecosystem::Aptos => (&paths.aptos, vec!["move", "test"]),
        };
        
        if let Some(f) = filter {
            match workspace.ecosystem {
                Ecosystem::Evm => {
                    args.push("--match-test");
                    args.push(f);
                }
                _ => {} // Other ecosystems handle differently
            }
        }
        
        self.run_command(cmd, &args, &workspace.project_path, output_tx).await
    }
    
    pub async fn run_deploy(
        &self,
        workspace: &Workspace,
        script_path: &str,
        output_tx: mpsc::Sender<RunOutput>,
    ) -> Result<i32, CocoError> {
        let paths = self.cli_paths.read().await;
        
        let (cmd, args) = match workspace.ecosystem {
            Ecosystem::Evm => (
                &paths.forge,
                vec!["script", script_path, "--broadcast"],
            ),
            Ecosystem::Solana => (
                &paths.anchor,
                vec!["deploy"],
            ),
            Ecosystem::Aptos => (
                &paths.aptos,
                vec!["move", "publish"],
            ),
        };
        
        self.run_command(cmd, &args, &workspace.project_path, output_tx).await
    }
    
    async fn run_command(
        &self,
        cmd: &str,
        args: &[&str],
        working_dir: &Path,
        output_tx: mpsc::Sender<RunOutput>,
    ) -> Result<i32, CocoError> {
        let mut child = Command::new(cmd)
            .args(args)
            .current_dir(working_dir)
            .stdout(std::process::Stdio::piped())
            .stderr(std::process::Stdio::piped())
            .spawn()
            .map_err(|e| CocoError::ProcessError(e.to_string()))?;
        
        let stdout = child.stdout.take().unwrap();
        let stderr = child.stderr.take().unwrap();
        
        let tx1 = output_tx.clone();
        let tx2 = output_tx.clone();
        
        // Stream stdout
        let stdout_handle = tokio::spawn(async move {
            let reader = BufReader::new(stdout);
            let mut lines = reader.lines();
            while let Ok(Some(line)) = lines.next_line().await {
                let _ = tx1.send(RunOutput::Stdout(line)).await;
            }
        });
        
        // Stream stderr
        let stderr_handle = tokio::spawn(async move {
            let reader = BufReader::new(stderr);
            let mut lines = reader.lines();
            while let Ok(Some(line)) = lines.next_line().await {
                let _ = tx2.send(RunOutput::Stderr(line)).await;
            }
        });
        
        // Wait for process
        let status = child.wait().await
            .map_err(|e| CocoError::ProcessError(e.to_string()))?;
        
        // Wait for output streams to finish
        let _ = stdout_handle.await;
        let _ = stderr_handle.await;
        
        let code = status.code().unwrap_or(-1);
        let _ = output_tx.send(RunOutput::Exit(code)).await;
        
        Ok(code)
    }
    
    pub async fn cancel(&self, run_id: &str) -> Result<(), CocoError> {
        let mut running = self.running.write().await;
        if let Some(mut process) = running.remove(run_id) {
            process.child.kill().await
                .map_err(|e| CocoError::ProcessError(e.to_string()))?;
        }
        Ok(())
    }
}
```

---

## Tauri Commands

Commands expose service functionality to the frontend via IPC.

```rust
// src-tauri/src/commands/wallets.rs

use tauri::State;
use crate::services::WalletService;
use crate::types::*;
use crate::error::CocoError;

#[tauri::command]
pub async fn create_wallet(
    chain_id: String,
    name: String,
    wallet_service: State<'_, WalletService>,
) -> Result<Wallet, CocoError> {
    wallet_service.create_wallet(&chain_id, &name).await
}

#[tauri::command]
pub async fn list_wallets(
    chain_id: String,
    wallet_service: State<'_, WalletService>,
) -> Result<Vec<Wallet>, CocoError> {
    wallet_service.list_wallets(&chain_id).await
}

#[tauri::command]
pub async fn get_wallet_balance(
    wallet_id: String,
    wallet_service: State<'_, WalletService>,
) -> Result<WalletBalance, CocoError> {
    wallet_service.get_balance(&wallet_id).await
}

#[tauri::command]
pub async fn fund_wallet(
    wallet_id: String,
    wallet_service: State<'_, WalletService>,
) -> Result<String, CocoError> {
    wallet_service.fund_from_faucet(&wallet_id).await
}

#[tauri::command]
pub async fn delete_wallet(
    wallet_id: String,
    wallet_service: State<'_, WalletService>,
) -> Result<(), CocoError> {
    wallet_service.delete_wallet(&wallet_id).await
}
```

```rust
// src-tauri/src/commands/runs.rs

use tauri::{State, Window};
use tokio::sync::mpsc;

use crate::services::RunService;
use crate::process::RunOutput;
use crate::types::*;
use crate::error::CocoError;

#[tauri::command]
pub async fn start_build(
    workspace_id: String,
    window: Window,
    run_service: State<'_, RunService>,
) -> Result<Run, CocoError> {
    let (tx, mut rx) = mpsc::channel::<RunOutput>(100);
    
    let run = run_service.start_build(&workspace_id, tx).await?;
    
    // Forward output to frontend via events
    let run_id = run.id.clone();
    tokio::spawn(async move {
        while let Some(output) = rx.recv().await {
            let event_name = format!("run-output-{}", run_id);
            let payload = match output {
                RunOutput::Stdout(line) => serde_json::json!({
                    "type": "stdout",
                    "data": line
                }),
                RunOutput::Stderr(line) => serde_json::json!({
                    "type": "stderr",
                    "data": line
                }),
                RunOutput::Error(err) => serde_json::json!({
                    "type": "error",
                    "data": err
                }),
                RunOutput::Exit(code) => serde_json::json!({
                    "type": "exit",
                    "data": code
                }),
            };
            let _ = window.emit(&event_name, payload);
        }
    });
    
    Ok(run)
}

#[tauri::command]
pub async fn cancel_run(
    run_id: String,
    run_service: State<'_, RunService>,
) -> Result<(), CocoError> {
    run_service.cancel_run(&run_id).await
}

#[tauri::command]
pub async fn list_runs(
    workspace_id: String,
    run_type: Option<RunType>,
    limit: Option<usize>,
    run_service: State<'_, RunService>,
) -> Result<Vec<Run>, CocoError> {
    run_service.list_runs(&workspace_id, run_type, limit.unwrap_or(20)).await
}

#[tauri::command]
pub async fn get_run(
    run_id: String,
    run_service: State<'_, RunService>,
) -> Result<RunDetail, CocoError> {
    run_service.get_run(&run_id).await
}
```

---

## Frontend Architecture

### Tauri IPC Client

```typescript
// src/lib/tauri/runs.ts

import { invoke } from '@tauri-apps/api/core';
import { listen, UnlistenFn } from '@tauri-apps/api/event';
import { Run, RunDetail, RunType, RunOutput } from '@/types';

export async function startBuild(workspaceId: string): Promise<Run> {
  return invoke('start_build', { workspaceId });
}

export async function startTest(
  workspaceId: string,
  testFilter?: string
): Promise<Run> {
  return invoke('start_test', { workspaceId, testFilter });
}

export async function startDeploy(
  workspaceId: string,
  scriptPath: string
): Promise<Run> {
  return invoke('start_deploy', { workspaceId, scriptPath });
}

export async function cancelRun(runId: string): Promise<void> {
  return invoke('cancel_run', { runId });
}

export async function listRuns(
  workspaceId: string,
  runType?: RunType,
  limit?: number
): Promise<Run[]> {
  return invoke('list_runs', { workspaceId, runType, limit });
}

export async function getRun(runId: string): Promise<RunDetail> {
  return invoke('get_run', { runId });
}

export function subscribeToRunOutput(
  runId: string,
  onOutput: (output: RunOutput) => void
): Promise<UnlistenFn> {
  return listen<RunOutput>(`run-output-${runId}`, (event) => {
    onOutput(event.payload);
  });
}
```

### Zustand Store

```typescript
// src/stores/workspace-store.ts

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import * as api from '@/lib/tauri';
import { 
  Workspace, 
  Contract, 
  Transaction, 
  Run, 
  RunType,
  RunOutput 
} from '@/types';

interface WorkspaceState {
  // State
  currentWorkspace: Workspace | null;
  contracts: Contract[];
  transactions: Transaction[];
  runs: Run[];
  activeRun: Run | null;
  runOutput: string[];
  
  // UI state
  isLoading: boolean;
  drawerOpen: boolean;
  drawerType: 'build' | 'test' | 'deploy' | null;
  selectedTransaction: Transaction | null;
  
  // Actions
  loadWorkspace: (workspaceId: string) => Promise<void>;
  loadContracts: () => Promise<void>;
  loadTransactions: () => Promise<void>;
  loadRuns: (runType?: RunType) => Promise<void>;
  
  startBuild: () => Promise<void>;
  startTest: (filter?: string) => Promise<void>;
  startDeploy: (scriptPath: string) => Promise<void>;
  cancelRun: () => Promise<void>;
  
  openDrawer: (type: 'build' | 'test' | 'deploy') => void;
  closeDrawer: () => void;
  selectTransaction: (transaction: Transaction | null) => void;
}

export const useWorkspaceStore = create<WorkspaceState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    currentWorkspace: null,
    contracts: [],
    transactions: [],
    runs: [],
    activeRun: null,
    runOutput: [],
    isLoading: false,
    drawerOpen: false,
    drawerType: null,
    selectedTransaction: null,
    
    // Actions
    loadWorkspace: async (workspaceId: string) => {
      set({ isLoading: true });
      try {
        const workspace = await api.getWorkspace(workspaceId);
        set({ currentWorkspace: workspace });
        
        // Load related data
        await Promise.all([
          get().loadContracts(),
          get().loadTransactions(),
        ]);
      } finally {
        set({ isLoading: false });
      }
    },
    
    loadContracts: async () => {
      const { currentWorkspace } = get();
      if (!currentWorkspace) return;
      
      const contracts = await api.listContracts(currentWorkspace.id);
      set({ contracts });
    },
    
    loadTransactions: async () => {
      const { currentWorkspace } = get();
      if (!currentWorkspace) return;
      
      const transactions = await api.listTransactions(currentWorkspace.id);
      set({ transactions });
    },
    
    loadRuns: async (runType?: RunType) => {
      const { currentWorkspace } = get();
      if (!currentWorkspace) return;
      
      const runs = await api.listRuns(currentWorkspace.id, runType);
      set({ runs });
    },
    
    startBuild: async () => {
      const { currentWorkspace } = get();
      if (!currentWorkspace) return;
      
      set({ runOutput: [], activeRun: null });
      
      const run = await api.startBuild(currentWorkspace.id);
      set({ activeRun: run });
      
      // Subscribe to output
      const unlisten = await api.subscribeToRunOutput(run.id, (output) => {
        set((state) => {
          if (output.type === 'exit') {
            return {
              runOutput: state.runOutput,
              activeRun: state.activeRun 
                ? { ...state.activeRun, status: output.data === 0 ? 'success' : 'failed' }
                : null
            };
          }
          return {
            runOutput: [...state.runOutput, output.data as string]
          };
        });
      });
      
      // Clean up listener when run completes
      // (In practice, you'd track this and clean up properly)
    },
    
    startTest: async (filter?: string) => {
      const { currentWorkspace } = get();
      if (!currentWorkspace) return;
      
      set({ runOutput: [], activeRun: null });
      
      const run = await api.startTest(currentWorkspace.id, filter);
      set({ activeRun: run });
      
      // Similar output subscription as startBuild
    },
    
    startDeploy: async (scriptPath: string) => {
      const { currentWorkspace } = get();
      if (!currentWorkspace) return;
      
      set({ runOutput: [], activeRun: null });
      
      const run = await api.startDeploy(currentWorkspace.id, scriptPath);
      set({ activeRun: run });
      
      // Similar output subscription
    },
    
    cancelRun: async () => {
      const { activeRun } = get();
      if (!activeRun) return;
      
      await api.cancelRun(activeRun.id);
      set((state) => ({
        activeRun: state.activeRun 
          ? { ...state.activeRun, status: 'cancelled' }
          : null
      }));
    },
    
    openDrawer: (type) => {
      set({ drawerOpen: true, drawerType: type });
      // Load runs for this type
      get().loadRuns(type as RunType);
    },
    
    closeDrawer: () => {
      set({ drawerOpen: false, drawerType: null });
    },
    
    selectTransaction: (transaction) => {
      set({ selectedTransaction: transaction });
    },
  }))
);
```

### React Component Example

```tsx
// src/components/runs/run-drawer.tsx

import { useEffect } from 'react';
import { useWorkspaceStore } from '@/stores/workspace-store';
import { RunList } from './run-list';
import { TerminalOutput } from './terminal-output';
import { Button } from '@/components/ui/button';
import { X, Play, Square } from 'lucide-react';

export function RunDrawer() {
  const {
    drawerOpen,
    drawerType,
    runs,
    activeRun,
    runOutput,
    closeDrawer,
    startBuild,
    startTest,
    startDeploy,
    cancelRun,
    loadRuns,
  } = useWorkspaceStore();
  
  useEffect(() => {
    if (drawerOpen && drawerType) {
      loadRuns(drawerType);
    }
  }, [drawerOpen, drawerType, loadRuns]);
  
  if (!drawerOpen || !drawerType) return null;
  
  const title = {
    build: 'Build History',
    test: 'Test History',
    deploy: 'Deploy History',
  }[drawerType];
  
  const handleRun = () => {
    switch (drawerType) {
      case 'build':
        startBuild();
        break;
      case 'test':
        startTest();
        break;
      case 'deploy':
        // Would need script selection
        break;
    }
  };
  
  const isRunning = activeRun?.status === 'running';
  
  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/20 dark:bg-black/50 z-40"
        onClick={closeDrawer}
      />
      
      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 w-1/2 bg-coco-bg-elevated border-l border-coco-border-subtle shadow-drawer z-50 flex flex-col animate-slide-in">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-coco-border-subtle">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button 
            onClick={closeDrawer}
            className="p-2 hover:bg-coco-bg-tertiary rounded-md"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {activeRun && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">
                  {drawerType.charAt(0).toUpperCase() + drawerType.slice(1)} #{runs.length + 1}
                </span>
                <RunStatus status={activeRun.status} />
              </div>
              <TerminalOutput lines={runOutput} />
            </div>
          )}
          
          <RunList 
            runs={runs} 
            onSelect={(run) => {
              // Load run details
            }}
          />
        </div>
        
        {/* Footer */}
        <div className="p-4 border-t border-coco-border-subtle">
          {isRunning ? (
            <Button 
              variant="danger" 
              onClick={cancelRun}
              className="w-full"
            >
              <Square className="w-4 h-4 mr-2" />
              Cancel
            </Button>
          ) : (
            <Button 
              variant="primary" 
              onClick={handleRun}
              className="w-full"
            >
              <Play className="w-4 h-4 mr-2" />
              {drawerType.charAt(0).toUpperCase() + drawerType.slice(1)}
            </Button>
          )}
        </div>
      </div>
    </>
  );
}
```

---

## Data Models

### Database Schema

```sql
-- migrations/001_initial.sql

-- Chains
CREATE TABLE chains (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    ecosystem TEXT NOT NULL CHECK (ecosystem IN ('evm', 'solana', 'aptos')),
    rpc_url TEXT NOT NULL,
    chain_id_numeric INTEGER,
    native_currency TEXT NOT NULL,
    block_explorer_url TEXT,
    faucet_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Wallets
CREATE TABLE wallets (
    id TEXT PRIMARY KEY,
    chain_id TEXT NOT NULL REFERENCES chains(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    public_key TEXT NOT NULL,
    encrypted_key BLOB NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(chain_id, address)
);

-- Workspaces
CREATE TABLE workspaces (
    id TEXT PRIMARY KEY,
    chain_id TEXT NOT NULL REFERENCES chains(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    project_path TEXT,
    ecosystem TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Workspace-Wallet assignments
CREATE TABLE workspace_wallets (
    workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    wallet_id TEXT NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
    PRIMARY KEY (workspace_id, wallet_id)
);

-- Contracts
CREATE TABLE contracts (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    address TEXT,
    interface_type TEXT NOT NULL CHECK (interface_type IN ('abi', 'idl', 'move')),
    interface_data BLOB,
    bytecode BLOB,
    source_path TEXT,
    deployed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Scripts
CREATE TABLE scripts (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    payload_interface TEXT,
    result_interface TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Transactions
CREATE TABLE transactions (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    script_id TEXT REFERENCES scripts(id) ON DELETE SET NULL,
    contract_id TEXT REFERENCES contracts(id) ON DELETE SET NULL,
    wallet_id TEXT REFERENCES wallets(id) ON DELETE SET NULL,
    name TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Transaction Runs
CREATE TABLE transaction_runs (
    id TEXT PRIMARY KEY,
    transaction_id TEXT NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    payload TEXT,
    result TEXT,
    tx_hash TEXT,
    block_number INTEGER,
    gas_used INTEGER,
    fee TEXT,
    status TEXT NOT NULL CHECK (status IN ('pending', 'success', 'failed')),
    error_message TEXT,
    events TEXT,
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    finished_at DATETIME,
    duration_ms INTEGER
);

-- Build/Test/Deploy Runs
CREATE TABLE runs (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    run_type TEXT NOT NULL CHECK (run_type IN ('build', 'test', 'deploy')),
    status TEXT NOT NULL CHECK (status IN ('running', 'success', 'failed', 'cancelled')),
    exit_code INTEGER,
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    finished_at DATETIME,
    duration_ms INTEGER
);

-- Run Output (stored separately for large outputs)
CREATE TABLE run_outputs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id TEXT NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
    line_number INTEGER NOT NULL,
    stream TEXT NOT NULL CHECK (stream IN ('stdout', 'stderr')),
    content TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_wallets_chain ON wallets(chain_id);
CREATE INDEX idx_workspaces_chain ON workspaces(chain_id);
CREATE INDEX idx_contracts_workspace ON contracts(workspace_id);
CREATE INDEX idx_transactions_workspace ON transactions(workspace_id);
CREATE INDEX idx_transaction_runs_transaction ON transaction_runs(transaction_id);
CREATE INDEX idx_runs_workspace ON runs(workspace_id);
CREATE INDEX idx_run_outputs_run ON run_outputs(run_id);
```

### TypeScript Types

```typescript
// src/types/index.ts

export type Ecosystem = 'evm' | 'solana' | 'aptos';
export type RunType = 'build' | 'test' | 'deploy';
export type RunStatus = 'running' | 'success' | 'failed' | 'cancelled';
export type TxStatus = 'pending' | 'success' | 'failed';

export interface Chain {
  id: string;
  name: string;
  ecosystem: Ecosystem;
  rpcUrl: string;
  chainIdNumeric?: number;
  nativeCurrency: string;
  blockExplorerUrl?: string;
  faucetUrl?: string;
  createdAt: string;
}

export interface Wallet {
  id: string;
  chainId: string;
  name: string;
  address: string;
  publicKey: string;
  createdAt: string;
}

export interface WalletBalance {
  walletId: string;
  native: Balance;
  tokens: TokenBalance[];
}

export interface Balance {
  native: string;
  nativeDecimals: number;
  nativeSymbol: string;
}

export interface TokenBalance {
  address: string;
  symbol: string;
  decimals: number;
  balance: string;
}

export interface Workspace {
  id: string;
  chainId: string;
  name: string;
  projectPath?: string;
  ecosystem: Ecosystem;
  createdAt: string;
  updatedAt: string;
}

export interface Contract {
  id: string;
  workspaceId: string;
  name: string;
  address?: string;
  interfaceType: 'abi' | 'idl' | 'move';
  sourcePath?: string;
  deployedAt?: string;
  createdAt: string;
}

export interface Script {
  id: string;
  workspaceId: string;
  name: string;
  filePath: string;
  payloadInterface?: string;
  resultInterface?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  id: string;
  workspaceId: string;
  scriptId?: string;
  contractId?: string;
  walletId?: string;
  name?: string;
  createdAt: string;
}

export interface TransactionRun {
  id: string;
  transactionId: string;
  payload?: Record<string, unknown>;
  result?: Record<string, unknown>;
  txHash?: string;
  blockNumber?: number;
  gasUsed?: number;
  fee?: string;
  status: TxStatus;
  errorMessage?: string;
  events?: DecodedEvent[];
  startedAt: string;
  finishedAt?: string;
  durationMs?: number;
}

export interface Run {
  id: string;
  workspaceId: string;
  runType: RunType;
  status: RunStatus;
  exitCode?: number;
  startedAt: string;
  finishedAt?: string;
  durationMs?: number;
}

export interface RunDetail {
  run: Run;
  output: string[];
}

export interface RunOutput {
  type: 'stdout' | 'stderr' | 'error' | 'exit';
  data: string | number;
}

export interface DecodedEvent {
  name: string;
  args: Record<string, unknown>;
}

export interface DiscoveredContract {
  name: string;
  path: string;
  interfaceType: 'abi' | 'idl' | 'move';
  isInterface: boolean;
  isDependency: boolean;
}
```

---

## Testing Strategy

### Unit Tests (Rust)

```rust
// src-tauri/src/adapters/evm/tests.rs

#[cfg(test)]
mod tests {
    use super::*;
    use crate::adapters::mock::MockAdapter;
    
    fn create_test_config() -> ChainConfig {
        ChainConfig {
            id: "test-chain".to_string(),
            name: "Test Chain".to_string(),
            ecosystem: Ecosystem::Evm,
            rpc_url: "http://localhost:8545".to_string(),
            native_currency: "ETH".to_string(),
            ..Default::default()
        }
    }
    
    #[tokio::test]
    async fn test_generate_wallet() {
        let adapter = MockAdapter::new(create_test_config());
        
        let wallet = adapter.generate_wallet().await.unwrap();
        
        assert!(!wallet.address.is_empty());
        assert!(wallet.address.starts_with("0x"));
    }
    
    #[tokio::test]
    async fn test_get_balance() {
        let adapter = MockAdapter::new(create_test_config());
        let address = "0x1234567890123456789012345678901234567890";
        
        // Seed wallet with balance
        adapter.seed_wallet(address, 1_000_000_000_000_000_000);
        
        let balance = adapter.get_balance(address).await.unwrap();
        
        assert_eq!(balance.native, "1000000000000000000");
    }
    
    #[tokio::test]
    async fn test_faucet() {
        let adapter = MockAdapter::new(create_test_config());
        let address = "0x1234567890123456789012345678901234567890";
        
        adapter.seed_wallet(address, 0);
        
        let _ = adapter.request_faucet(address).await.unwrap();
        
        let balance = adapter.get_balance(address).await.unwrap();
        assert_ne!(balance.native, "0");
    }
    
    #[tokio::test]
    async fn test_send_transaction() {
        let adapter = MockAdapter::new(create_test_config());
        
        let wallet = adapter.generate_wallet().await.unwrap();
        adapter.seed_wallet(&wallet.address, 1_000_000_000_000_000_000);
        
        let tx = TransactionRequest {
            to: Some("0x0000000000000000000000000000000000000001".to_string()),
            value: Some("1000000000000000".to_string()),
            data: None,
        };
        
        let result = adapter.send_transaction(&wallet, tx).await.unwrap();
        
        assert!(!result.hash.is_empty());
        assert_eq!(result.status, TxStatus::Pending);
        
        // Confirm the transaction
        adapter.confirm_transaction(&result.hash);
        
        let receipt = adapter.get_transaction_receipt(&result.hash).await.unwrap();
        assert!(receipt.status);
    }
}
```

### Integration Tests

```rust
// tests/integration/workspace_flow.rs

use coco::adapters::{create_adapter, AdapterRegistry};
use coco::services::{WalletService, WorkspaceService, RunService};
use coco::db::Repository;
use coco::process::ProcessManager;
use std::sync::Arc;

async fn setup_test_env() -> TestEnv {
    let db = Repository::in_memory().await.unwrap();
    let registry = Arc::new(AdapterRegistry::new());
    let process_manager = Arc::new(ProcessManager::new());
    
    // Register mock adapter
    let config = ChainConfig {
        id: "test-evm".to_string(),
        ecosystem: Ecosystem::Evm,
        ..Default::default()
    };
    let adapter = create_adapter(config, true).unwrap(); // use_mock = true
    registry.register_adapter("test-evm", adapter).await;
    
    TestEnv {
        db: Arc::new(db),
        registry,
        process_manager,
    }
}

#[tokio::test]
async fn test_full_workspace_flow() {
    let env = setup_test_env().await;
    
    let wallet_service = WalletService::new(
        env.registry.clone(),
        env.keystore.clone(),
        env.db.clone(),
    );
    
    let workspace_service = WorkspaceService::new(
        env.registry.clone(),
        env.db.clone(),
    );
    
    // Create chain
    let chain = workspace_service
        .create_chain(CreateChainRequest {
            name: "Test EVM".to_string(),
            ecosystem: Ecosystem::Evm,
            rpc_url: "http://localhost:8545".to_string(),
            native_currency: "ETH".to_string(),
        })
        .await
        .unwrap();
    
    // Create wallets
    let deployer = wallet_service
        .create_wallet(&chain.id, "deployer")
        .await
        .unwrap();
    
    let user = wallet_service
        .create_wallet(&chain.id, "user")
        .await
        .unwrap();
    
    // Fund wallets
    wallet_service.fund_from_faucet(&deployer.id).await.unwrap();
    wallet_service.fund_from_faucet(&user.id).await.unwrap();
    
    // Create workspace
    let workspace = workspace_service
        .create_workspace(CreateWorkspaceRequest {
            chain_id: chain.id.clone(),
            name: "Test Project".to_string(),
            project_path: Some("/tmp/test-project".into()),
        })
        .await
        .unwrap();
    
    // Assign wallets
    workspace_service
        .assign_wallet(&workspace.id, &deployer.id)
        .await
        .unwrap();
    
    workspace_service
        .assign_wallet(&workspace.id, &user.id)
        .await
        .unwrap();
    
    // Verify setup
    let wallets = workspace_service
        .list_assigned_wallets(&workspace.id)
        .await
        .unwrap();
    
    assert_eq!(wallets.len(), 2);
}
```

### Frontend Tests

```typescript
// src/__tests__/stores/workspace-store.test.ts

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useWorkspaceStore } from '@/stores/workspace-store';
import * as api from '@/lib/tauri';

vi.mock('@/lib/tauri');

describe('WorkspaceStore', () => {
  beforeEach(() => {
    useWorkspaceStore.setState({
      currentWorkspace: null,
      contracts: [],
      transactions: [],
      runs: [],
      isLoading: false,
    });
  });
  
  it('loads workspace and related data', async () => {
    const mockWorkspace = {
      id: 'ws-1',
      name: 'Test Workspace',
      chainId: 'chain-1',
      ecosystem: 'evm',
    };
    
    const mockContracts = [
      { id: 'c-1', name: 'Token', workspaceId: 'ws-1' },
    ];
    
    vi.mocked(api.getWorkspace).mockResolvedValue(mockWorkspace);
    vi.mocked(api.listContracts).mockResolvedValue(mockContracts);
    vi.mocked(api.listTransactions).mockResolvedValue([]);
    
    await useWorkspaceStore.getState().loadWorkspace('ws-1');
    
    const state = useWorkspaceStore.getState();
    expect(state.currentWorkspace).toEqual(mockWorkspace);
    expect(state.contracts).toEqual(mockContracts);
    expect(state.isLoading).toBe(false);
  });
  
  it('handles build start and output', async () => {
    const mockRun = {
      id: 'run-1',
      workspaceId: 'ws-1',
      runType: 'build',
      status: 'running',
    };
    
    useWorkspaceStore.setState({
      currentWorkspace: { id: 'ws-1', name: 'Test', chainId: 'c-1', ecosystem: 'evm' },
    });
    
    vi.mocked(api.startBuild).mockResolvedValue(mockRun);
    vi.mocked(api.subscribeToRunOutput).mockResolvedValue(() => {});
    
    await useWorkspaceStore.getState().startBuild();
    
    const state = useWorkspaceStore.getState();
    expect(state.activeRun).toEqual(mockRun);
    expect(state.runOutput).toEqual([]);
  });
});
```

### E2E Tests

```typescript
// tests/e2e/workspace.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Workspace Flow', () => {
  test('creates workspace and runs build', async ({ page }) => {
    await page.goto('/');
    
    // Select chain
    await page.click('[data-testid="chain-card-sepolia"]');
    
    // Create workspace
    await page.click('[data-testid="new-workspace-button"]');
    await page.fill('[data-testid="workspace-name-input"]', 'Test Project');
    await page.click('[data-testid="create-workspace-submit"]');
    
    // Should be in workspace view
    await expect(page.locator('[data-testid="workspace-title"]'))
      .toHaveText('Test Project');
    
    // Click build
    await page.click('[data-testid="build-button"]');
    
    // Drawer should open
    await expect(page.locator('[data-testid="run-drawer"]')).toBeVisible();
    
    // Start build
    await page.click('[data-testid="start-build-button"]');
    
    // Should see terminal output
    await expect(page.locator('[data-testid="terminal-output"]')).toBeVisible();
    
    // Wait for completion (mock adapter completes quickly)
    await expect(page.locator('[data-testid="run-status-success"]'))
      .toBeVisible({ timeout: 10000 });
  });
});
```

---

## Security Considerations

### Key Management

```rust
// src-tauri/src/crypto/keystore.rs

use aes_gcm::{Aes256Gcm, Key, Nonce};
use aes_gcm::aead::{Aead, NewAead};
use argon2::{Argon2, PasswordHasher};
use rand::RngCore;

pub struct Keystore {
    master_key: Key<Aes256Gcm>,
}

impl Keystore {
    /// Creates a new keystore with a master password
    pub fn new(password: &str) -> Result<Self, CocoError> {
        let salt = Self::generate_salt();
        let master_key = Self::derive_key(password, &salt)?;
        
        Ok(Self { master_key })
    }
    
    /// Encrypts a private key
    pub fn encrypt(&self, private_key: &str) -> Result<Vec<u8>, CocoError> {
        let cipher = Aes256Gcm::new(&self.master_key);
        let nonce = Self::generate_nonce();
        
        let ciphertext = cipher
            .encrypt(&nonce, private_key.as_bytes())
            .map_err(|_| CocoError::EncryptionError)?;
        
        // Prepend nonce to ciphertext
        let mut result = nonce.to_vec();
        result.extend(ciphertext);
        
        Ok(result)
    }
    
    /// Decrypts a private key
    pub fn decrypt(&self, encrypted: &[u8]) -> Result<String, CocoError> {
        if encrypted.len() < 12 {
            return Err(CocoError::DecryptionError);
        }
        
        let (nonce_bytes, ciphertext) = encrypted.split_at(12);
        let nonce = Nonce::from_slice(nonce_bytes);
        
        let cipher = Aes256Gcm::new(&self.master_key);
        let plaintext = cipher
            .decrypt(nonce, ciphertext)
            .map_err(|_| CocoError::DecryptionError)?;
        
        String::from_utf8(plaintext)
            .map_err(|_| CocoError::DecryptionError)
    }
    
    fn derive_key(password: &str, salt: &[u8]) -> Result<Key<Aes256Gcm>, CocoError> {
        let argon2 = Argon2::default();
        let mut key = [0u8; 32];
        
        argon2
            .hash_password_into(password.as_bytes(), salt, &mut key)
            .map_err(|_| CocoError::KeyDerivationError)?;
        
        Ok(Key::from_slice(&key).clone())
    }
    
    fn generate_salt() -> [u8; 16] {
        let mut salt = [0u8; 16];
        rand::thread_rng().fill_bytes(&mut salt);
        salt
    }
    
    fn generate_nonce() -> Nonce<typenum::U12> {
        let mut nonce = [0u8; 12];
        rand::thread_rng().fill_bytes(&mut nonce);
        *Nonce::from_slice(&nonce)
    }
}
```

---

## Configuration

### Tauri Configuration

```json
// src-tauri/tauri.conf.json
{
  "productName": "Coco",
  "version": "0.1.0",
  "identifier": "com.coco.app",
  "build": {
    "beforeBuildCommand": "npm run build",
    "beforeDevCommand": "npm run dev",
    "frontendDist": "../out",
    "devUrl": "http://localhost:3000"
  },
  "app": {
    "windows": [
      {
        "title": "Coco",
        "width": 1280,
        "height": 800,
        "minWidth": 900,
        "minHeight": 600,
        "resizable": true,
        "fullscreen": false
      }
    ],
    "security": {
      "csp": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'"
    }
  },
  "bundle": {
    "active": true,
    "targets": "all",
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/128x128@2x.png",
      "icons/icon.icns",
      "icons/icon.ico"
    ]
  }
}
```

---

## Summary

Coco's architecture is built on three pillars:

1. **Chain Adapters** — A trait-based abstraction that allows each blockchain ecosystem (EVM, Solana, Aptos) to be supported through a common interface. Mock adapters enable comprehensive testing without network calls.

2. **Process Management** — CLI tools (Forge, Anchor, Aptos CLI) are wrapped rather than replaced. Output is streamed in real-time to the frontend via Tauri events.

3. **Local-First Data** — SQLite stores structured data, the filesystem stores scripts and artifacts. Private keys are encrypted with AES-256-GCM using a master password.

The Tauri + Next.js stack provides a native desktop experience with a modern React frontend. Type safety flows from Rust to TypeScript, and the service layer keeps business logic testable and isolated from I/O concerns.
