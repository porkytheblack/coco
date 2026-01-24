use async_trait::async_trait;
use std::path::Path;

use crate::error::CocoError;
use crate::types::*;

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
        derivation_path: Option<&str>,
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
        message: &[u8],
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
        abi: &[u8],
        function: &str,
        args: Vec<ContractArg>,
    ) -> Result<Vec<u8>, CocoError>;

    /// Decodes contract events/logs
    fn decode_events(
        &self,
        abi: &[u8],
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
    WalletAdapter + TransactionAdapter + ContractAdapter + DiscoveryAdapter
{
}

// Blanket implementation
impl<T> FullAdapter for T where
    T: WalletAdapter + TransactionAdapter + ContractAdapter + DiscoveryAdapter
{
}
