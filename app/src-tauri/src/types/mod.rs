use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::hash::Hash;

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, Hash)]
#[serde(rename_all = "lowercase")]
pub enum Ecosystem {
    Evm,
    Solana,
    Aptos,
}

impl Default for Ecosystem {
    fn default() -> Self {
        Ecosystem::Evm
    }
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum WalletType {
    Local,
    Ledger,
    Imported,
}

impl Default for WalletType {
    fn default() -> Self {
        WalletType::Local
    }
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum RunType {
    Build,
    Test,
    Deploy,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum RunStatus {
    Running,
    Success,
    Failed,
    Cancelled,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum TransactionStatus {
    Draft,
    Pending,
    Success,
    Failed,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum NetworkType {
    Mainnet,
    Testnet,
    Devnet,
    Custom,
}

impl Default for NetworkType {
    fn default() -> Self {
        NetworkType::Custom
    }
}

impl From<&str> for NetworkType {
    fn from(s: &str) -> Self {
        match s.to_lowercase().as_str() {
            "mainnet" => NetworkType::Mainnet,
            "testnet" => NetworkType::Testnet,
            "devnet" => NetworkType::Devnet,
            _ => NetworkType::Custom,
        }
    }
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum InterfaceType {
    Abi,
    Idl,
    Move,
}

impl Default for InterfaceType {
    fn default() -> Self {
        InterfaceType::Abi
    }
}

impl std::fmt::Display for InterfaceType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            InterfaceType::Abi => write!(f, "abi"),
            InterfaceType::Idl => write!(f, "idl"),
            InterfaceType::Move => write!(f, "move"),
        }
    }
}

impl From<&str> for InterfaceType {
    fn from(s: &str) -> Self {
        match s.to_lowercase().as_str() {
            "idl" => InterfaceType::Idl,
            "move" => InterfaceType::Move,
            _ => InterfaceType::Abi,
        }
    }
}

// Chain configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Chain {
    pub id: String,
    pub name: String,
    pub ecosystem: Ecosystem,
    pub rpc_url: String,
    pub chain_id_numeric: Option<u64>,
    #[serde(rename = "blockExplorerUrl")]
    pub explorer_url: Option<String>,
    #[serde(rename = "blockExplorerApiUrl")]
    pub explorer_api_url: Option<String>,
    #[serde(rename = "blockExplorerApiKey")]
    pub explorer_api_key: Option<String>,
    pub faucet_url: Option<String>,
    pub is_testnet: bool,
    #[serde(rename = "nativeCurrency")]
    pub currency_symbol: String,
    pub currency_decimals: u8,
    // New fields for chain registry
    pub blockchain: String,
    pub network_type: NetworkType,
    pub is_custom: bool,
    pub icon_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Wallet {
    pub id: String,
    pub chain_id: String,
    pub name: String,
    pub address: String,
    pub wallet_type: WalletType,
    pub balance: Option<String>,
    pub created_at: DateTime<Utc>,
}

/// Wallet with chain name for display in reuse lists
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WalletWithChain {
    pub id: String,
    pub chain_id: String,
    pub name: String,
    pub address: String,
    pub wallet_type: WalletType,
    pub balance: Option<String>,
    pub created_at: DateTime<Utc>,
    pub chain_name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Workspace {
    pub id: String,
    pub chain_id: String,
    pub name: String,
    pub path: String,
    pub framework: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    #[serde(default)]
    pub contract_count: u32,
    #[serde(default)]
    pub transaction_count: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Contract {
    pub id: String,
    pub workspace_id: String,
    pub name: String,
    pub path: String,
    #[serde(default)]
    pub interface_type: InterfaceType,
    /// EVM ABI JSON (for EVM contracts)
    pub abi: Option<String>,
    /// Solana Anchor IDL JSON (for Solana programs)
    pub idl: Option<String>,
    /// Aptos Move definition JSON (for Aptos contracts)
    pub move_definition: Option<String>,
    pub bytecode: Option<String>,
    pub deployed_address: Option<String>,
    pub created_at: DateTime<Utc>,
}

/// Contract with chain info for display in reuse lists
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ContractWithChain {
    pub id: String,
    pub workspace_id: String,
    pub name: String,
    pub path: String,
    #[serde(default)]
    pub interface_type: InterfaceType,
    pub abi: Option<String>,
    pub idl: Option<String>,
    pub move_definition: Option<String>,
    pub bytecode: Option<String>,
    pub deployed_address: Option<String>,
    pub created_at: DateTime<Utc>,
    pub chain_name: String,
    pub workspace_name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Transaction {
    pub id: String,
    pub workspace_id: String,
    pub name: Option<String>,
    pub contract_id: Option<String>,
    pub function_name: Option<String>,
    pub args: Vec<serde_json::Value>,
    pub value: Option<String>,
    pub status: TransactionStatus,
    pub tx_hash: Option<String>,
    pub created_at: DateTime<Utc>,
    pub executed_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Run {
    pub id: String,
    pub workspace_id: String,
    pub run_type: RunType,
    pub status: RunStatus,
    pub started_at: DateTime<Utc>,
    pub ended_at: Option<DateTime<Utc>>,
    pub exit_code: Option<i32>,
    pub error_message: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RunDetail {
    pub run: Run,
    pub output: Vec<String>,
}

// Adapter types for chain interactions
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WalletData {
    pub address: String,
    pub public_key: String,
    pub private_key_encrypted: Option<Vec<u8>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Balance {
    pub native: String,
    pub native_decimals: u8,
    pub native_symbol: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TokenBalance {
    pub address: String,
    pub symbol: String,
    pub decimals: u8,
    pub balance: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TransactionRequest {
    pub to: Option<String>,
    pub value: Option<String>,
    pub data: Option<Vec<u8>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TransactionResult {
    pub hash: String,
    pub status: TransactionStatus,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TransactionData {
    pub hash: String,
    pub from: String,
    pub to: Option<String>,
    pub value: Option<String>,
    pub data: Option<Vec<u8>>,
    pub block_number: Option<u64>,
    pub timestamp: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TransactionReceipt {
    pub hash: String,
    pub status: bool,
    pub block_number: u64,
    pub gas_used: u64,
    pub events: Vec<DecodedEvent>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DecodedEvent {
    pub name: String,
    pub args: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AIExplanation {
    pub summary: String,
    pub details: String,
    pub suggestions: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TransactionRun {
    pub id: String,
    pub transaction_id: String,
    pub payload: Option<serde_json::Value>,
    pub result: Option<serde_json::Value>,
    pub tx_hash: Option<String>,
    pub block_number: Option<u64>,
    pub gas_used: Option<u64>,
    pub fee: Option<String>,
    pub status: TxStatus,
    pub error_message: Option<String>,
    pub events: Option<Vec<DecodedEvent>>,
    pub started_at: DateTime<Utc>,
    pub finished_at: Option<DateTime<Utc>>,
    pub duration_ms: Option<u64>,
    pub ai_explanation: Option<AIExplanation>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum TxStatus {
    Pending,
    Success,
    Failed,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FeeEstimate {
    pub gas_limit: u64,
    pub gas_price: String,
    pub total_fee: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SimulationResult {
    pub success: bool,
    pub return_data: Vec<u8>,
    pub gas_used: u64,
    pub logs: Vec<Log>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Log {
    pub address: String,
    pub topics: Vec<String>,
    pub data: Vec<u8>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContractArg {
    pub name: String,
    pub value: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContractCallResult {
    pub return_data: Vec<u8>,
    pub decoded: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeploymentResult {
    pub address: String,
    pub transaction_hash: String,
    pub block_number: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiscoveredContract {
    pub name: String,
    pub path: String,
    pub interface_type: InterfaceType,
    pub is_interface: bool,
    pub is_dependency: bool,
}

// Chain config for adapters
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChainConfig {
    pub id: String,
    pub name: String,
    pub ecosystem: Ecosystem,
    pub rpc_url: String,
    pub native_currency: String,
}

// ============================================================================
// v0.0.3 Types - New Schema
// ============================================================================

/// Blockchain entity (parent of networks)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Blockchain {
    pub id: String,
    pub name: String,
    pub ecosystem: Ecosystem,
    pub icon_id: Option<String>,
    pub created_at: DateTime<Utc>,
    #[serde(default)]
    pub networks: Vec<Network>,
}

/// Network entity (belongs to a blockchain)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Network {
    pub id: String,
    pub blockchain_id: String,
    pub name: String,
    pub network_type: NetworkType,
    pub rpc_url: String,
    pub chain_id_numeric: Option<u64>,
    #[serde(rename = "blockExplorerUrl")]
    pub explorer_url: Option<String>,
    #[serde(rename = "blockExplorerApiUrl")]
    pub explorer_api_url: Option<String>,
    #[serde(rename = "blockExplorerApiKey")]
    pub explorer_api_key: Option<String>,
    pub faucet_url: Option<String>,
    #[serde(rename = "nativeCurrency")]
    pub currency_symbol: String,
    pub currency_decimals: u8,
    pub is_default: bool,
    pub created_at: DateTime<Utc>,
}

/// Script runner type
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
pub enum ScriptRunner {
    Bash,
    Node,
    Bun,
    Python,
    Forge,       // forge script (for deployment scripts)
    ForgeTest,   // forge test
    ForgeBuild,  // forge build
    Npx,
    Custom,
}

impl Default for ScriptRunner {
    fn default() -> Self {
        ScriptRunner::Bash
    }
}

impl From<&str> for ScriptRunner {
    fn from(s: &str) -> Self {
        match s.to_lowercase().as_str() {
            "node" => ScriptRunner::Node,
            "bun" => ScriptRunner::Bun,
            "python" => ScriptRunner::Python,
            "forge" | "forge-script" => ScriptRunner::Forge,
            "forge-test" | "forgetest" => ScriptRunner::ForgeTest,
            "forge-build" | "forgebuild" => ScriptRunner::ForgeBuild,
            "npx" => ScriptRunner::Npx,
            "custom" => ScriptRunner::Custom,
            _ => ScriptRunner::Bash,
        }
    }
}

impl std::fmt::Display for ScriptRunner {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ScriptRunner::Bash => write!(f, "bash"),
            ScriptRunner::Node => write!(f, "node"),
            ScriptRunner::Bun => write!(f, "bun"),
            ScriptRunner::Python => write!(f, "python"),
            ScriptRunner::Forge => write!(f, "forge"),
            ScriptRunner::ForgeTest => write!(f, "forge-test"),
            ScriptRunner::ForgeBuild => write!(f, "forge-build"),
            ScriptRunner::Npx => write!(f, "npx"),
            ScriptRunner::Custom => write!(f, "custom"),
        }
    }
}

/// Script entity (belongs to a workspace)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Script {
    pub id: String,
    pub workspace_id: String,
    pub name: String,
    pub description: Option<String>,
    #[serde(default)]
    pub runner: ScriptRunner,
    pub file_path: String,
    pub command: Option<String>,
    pub working_directory: Option<String>,
    pub category: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    #[serde(default)]
    pub flags: Vec<ScriptFlag>,
}

/// Script flag definition
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScriptFlag {
    pub id: String,
    pub script_id: String,
    pub flag_name: String,
    pub flag_type: ScriptFlagType,
    pub default_value: Option<String>,
    pub required: bool,
    pub description: Option<String>,
}

/// Script flag type
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum ScriptFlagType {
    String,
    Boolean,
    Number,
}

impl Default for ScriptFlagType {
    fn default() -> Self {
        ScriptFlagType::String
    }
}

impl From<&str> for ScriptFlagType {
    fn from(s: &str) -> Self {
        match s.to_lowercase().as_str() {
            "boolean" | "bool" => ScriptFlagType::Boolean,
            "number" | "int" | "integer" => ScriptFlagType::Number,
            _ => ScriptFlagType::String,
        }
    }
}

/// Script run status
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum ScriptRunStatus {
    Running,
    Success,
    Failed,
    Cancelled,
}

impl Default for ScriptRunStatus {
    fn default() -> Self {
        ScriptRunStatus::Running
    }
}

impl From<&str> for ScriptRunStatus {
    fn from(s: &str) -> Self {
        match s.to_lowercase().as_str() {
            "success" => ScriptRunStatus::Success,
            "failed" => ScriptRunStatus::Failed,
            "cancelled" => ScriptRunStatus::Cancelled,
            _ => ScriptRunStatus::Running,
        }
    }
}

/// Script run entity
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScriptRun {
    pub id: String,
    pub script_id: String,
    pub started_at: DateTime<Utc>,
    pub finished_at: Option<DateTime<Utc>>,
    pub status: ScriptRunStatus,
    pub exit_code: Option<i32>,
    pub flags_used: Option<serde_json::Value>,
    pub env_vars_used: Option<serde_json::Value>,
    pub logs: Option<String>,
}

/// Environment variable entity (values are encrypted in DB)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EnvironmentVariable {
    pub id: String,
    pub workspace_id: String,
    pub key: String,
    // Note: value is not included in responses for security
    pub description: Option<String>,
    pub created_at: DateTime<Utc>,
}

/// Environment variable with decrypted value (for internal use only)
#[derive(Debug, Clone)]
pub struct EnvironmentVariableWithValue {
    pub id: String,
    pub workspace_id: String,
    pub key: String,
    pub value: String,
    pub description: Option<String>,
    pub created_at: DateTime<Utc>,
}

/// Conversation entity
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Conversation {
    pub id: String,
    pub workspace_id: Option<String>,
    pub title: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Message entity (belongs to a conversation)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Message {
    pub id: String,
    pub conversation_id: String,
    pub role: MessageRole,
    pub content: String,
    pub created_at: DateTime<Utc>,
}

/// Message role
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum MessageRole {
    User,
    Assistant,
    System,
}

impl From<&str> for MessageRole {
    fn from(s: &str) -> Self {
        match s.to_lowercase().as_str() {
            "assistant" => MessageRole::Assistant,
            "system" => MessageRole::System,
            _ => MessageRole::User,
        }
    }
}

/// Preference entity (global key-value store)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Preference {
    pub id: String,
    pub key: String,
    pub value: serde_json::Value,
    pub updated_at: DateTime<Utc>,
}

/// Contract documentation entity (per-function docs)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ContractDoc {
    pub id: String,
    pub contract_id: String,
    pub function_name: String,
    pub description: Option<String>,
    pub notes: Option<String>,
    pub updated_at: DateTime<Utc>,
}

// ============================================================================
// Input types for creating/updating entities
// ============================================================================

/// Input for creating a script
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateScriptInput {
    pub name: String,
    pub description: Option<String>,
    pub runner: Option<String>,
    pub file_path: String,
    pub command: Option<String>,
    pub working_directory: Option<String>,
    pub category: Option<String>,
    #[serde(default)]
    pub flags: Vec<CreateScriptFlagInput>,
}

/// Input for creating a script flag
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateScriptFlagInput {
    pub flag_name: String,
    pub flag_type: String,
    pub default_value: Option<String>,
    #[serde(default)]
    pub required: bool,
    pub description: Option<String>,
}

/// Input for running a script
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RunScriptInput {
    #[serde(default)]
    pub flags: std::collections::HashMap<String, String>,
    #[serde(default)]
    pub env_var_keys: Vec<String>,
}

/// Input for creating an environment variable
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateEnvVarInput {
    pub key: String,
    pub value: String,
    pub description: Option<String>,
}

/// Input for creating a conversation
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateConversationInput {
    pub workspace_id: Option<String>,
    pub title: Option<String>,
}

/// Input for creating a message
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateMessageInput {
    pub role: String,
    pub content: String,
}

/// Input for creating a network
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateNetworkInput {
    pub blockchain_id: String,
    pub name: String,
    pub network_type: String,
    pub rpc_url: String,
    pub chain_id_numeric: Option<u64>,
    pub explorer_url: Option<String>,
    pub explorer_api_url: Option<String>,
    pub explorer_api_key: Option<String>,
    pub faucet_url: Option<String>,
    pub currency_symbol: String,
    pub currency_decimals: Option<u8>,
    #[serde(default)]
    pub is_default: bool,
}

/// Input for updating a network
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateNetworkInput {
    pub name: Option<String>,
    pub rpc_url: Option<String>,
    pub explorer_url: Option<String>,
    pub explorer_api_url: Option<String>,
    pub explorer_api_key: Option<String>,
    pub faucet_url: Option<String>,
    pub is_default: Option<bool>,
}
