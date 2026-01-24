use async_trait::async_trait;
use std::collections::HashMap;
use std::path::Path;
use std::sync::RwLock;

use crate::adapters::traits::*;
use crate::error::CocoError;
use crate::types::*;

/// Mock adapter for testing and development without real network calls
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
        wallets.insert(
            address.to_string(),
            MockWalletState { balance, nonce: 0 },
        );
    }

    /// Advances the mock block height
    pub fn advance_blocks(&self, count: u64) {
        let mut height = self.block_height.write().unwrap();
        *height += count;
    }
}

#[async_trait]
impl ChainAdapter for MockAdapter {
    fn ecosystem(&self) -> Ecosystem {
        self.config.ecosystem
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
        let balance = wallets.get(address).map(|w| w.balance).unwrap_or(0);

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
        } else {
            wallets.insert(
                address.to_string(),
                MockWalletState {
                    balance: 1_000_000_000_000_000_000,
                    nonce: 0,
                },
            );
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

#[async_trait]
impl TransactionAdapter for MockAdapter {
    async fn send_transaction(
        &self,
        wallet: &WalletData,
        tx: TransactionRequest,
    ) -> Result<TransactionResult, CocoError> {
        let hash = format!("0x{:064x}", rand::random::<u128>());

        let mut txs = self.transactions.write().unwrap();
        txs.insert(
            hash.clone(),
            MockTransaction {
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
            },
        );

        Ok(TransactionResult {
            hash,
            status: TransactionStatus::Pending,
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
        let tx = txs
            .get(hash)
            .ok_or_else(|| CocoError::NotFound("Transaction not found".into()))?;

        match &tx.status {
            MockTxStatus::Pending => {
                Err(CocoError::NotFound("Receipt not available yet".into()))
            }
            MockTxStatus::Confirmed => Ok(TransactionReceipt {
                hash: hash.to_string(),
                status: true,
                block_number: *self.block_height.read().unwrap(),
                gas_used: 21000,
                events: vec![],
            }),
            MockTxStatus::Failed(_) => Ok(TransactionReceipt {
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
    async fn deploy_contract(
        &self,
        _wallet: &WalletData,
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
        _abi: &[u8],
        _function: &str,
        _args: Vec<ContractArg>,
    ) -> Result<Vec<u8>, CocoError> {
        Ok(vec![0u8; 32])
    }

    fn decode_events(
        &self,
        _abi: &[u8],
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
        Ok(vec![DiscoveredContract {
            name: "MockToken".to_string(),
            path: "out/MockToken.sol/MockToken.json".to_string(),
            interface_type: InterfaceType::Abi,
            is_interface: false,
            is_dependency: false,
        }])
    }

    async fn fetch_contract_interface(
        &self,
        _address: &str,
    ) -> Result<Option<Vec<u8>>, CocoError> {
        Ok(None)
    }
}
