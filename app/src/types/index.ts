export type Ecosystem = 'evm' | 'solana' | 'aptos';
export type TxStatus = 'pending' | 'success' | 'failed';
export type NetworkType = 'mainnet' | 'testnet' | 'devnet' | 'custom';
export type InterfaceType = 'abi' | 'idl' | 'move';

// Move Definition Types (for Aptos - no ABI/IDL available)
export type MoveVisibility = 'public' | 'entry' | 'private';
export type MoveType = 'u8' | 'u64' | 'u128' | 'u256' | 'bool' | 'address' | 'vector' | 'string' | 'signer' | string;

export interface MoveParam {
  name: string;
  type: MoveType;
}

export interface MoveFunction {
  name: string;
  visibility: MoveVisibility;
  params: MoveParam[];
  typeParams?: string[]; // Generic type parameters e.g. ["T", "CoinType"]
  returnType?: string[];
  isView?: boolean;
}

export interface MoveStruct {
  name: string;
  fields: { name: string; type: MoveType }[];
}

export interface MoveDefinition {
  moduleName: string;
  moduleAddress: string;
  functions: MoveFunction[];
  structs: MoveStruct[];
}

// PDA seed definition for Solana accounts
export interface PdaSeed {
  kind: 'const' | 'account' | 'arg';
  value?: string | number[];  // For const seeds
  path?: string;              // For account/arg references
}

// PDA definition for Solana accounts
export interface PdaDefinition {
  seeds: PdaSeed[];
  programId?: string;  // If not specified, uses the current program
}

// Account requirement for Solana instructions
export interface AccountRequirement {
  name: string;
  isMut: boolean;   // writable
  isSigner: boolean;
  description?: string;
  address?: string;  // Well-known address (e.g., system program)
  pda?: PdaDefinition;  // PDA derivation info
}

// Unified function representation (parsed from ABI/IDL/Move)
export interface ContractFunction {
  name: string;
  type: 'read' | 'write';
  inputs: { name: string; type: string }[];
  outputs?: { name: string; type: string }[];
  stateMutability?: string; // For EVM: view, pure, payable, nonpayable
  accounts?: AccountRequirement[]; // For Solana: required accounts
  typeParams?: string[]; // For Aptos: generic type parameters
}

export interface Chain {
  id: string;
  name: string;
  ecosystem: Ecosystem;
  rpcUrl: string;
  chainIdNumeric?: number;
  nativeCurrency: string;
  blockExplorerUrl?: string;
  blockExplorerApiUrl?: string;
  blockExplorerApiKey?: string;
  faucetUrl?: string;
  createdAt: string;
  walletCount?: number;
  workspaceCount?: number;
  // New fields for chain registry
  blockchain: string;        // 'ethereum' | 'base' | 'polygon' | 'solana' | 'aptos' | etc.
  networkType: NetworkType;  // 'mainnet' | 'testnet' | 'devnet' | 'custom'
  isCustom: boolean;         // true for user-created chains
  iconId?: string;           // Reference to icon component
}

export interface Wallet {
  id: string;
  chainId: string;
  name: string;
  address: string;
  publicKey: string;
  walletType?: string;
  createdAt: string;
}

export interface WalletWithChain extends Wallet {
  chainName: string;
}

export interface ContractWithChain {
  id: string;
  workspaceId: string;
  name: string;
  path: string;
  abi?: string;
  deployedAddress?: string;
  createdAt: string;
  chainName: string;
  workspaceName: string;
}

export interface WalletWithBalance extends Wallet {
  balance: Balance;
  transactionCount: number;
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

export interface WalletBalance {
  walletId: string;
  native: Balance;
  tokens: TokenBalance[];
}

export interface WalletTransaction {
  id: string;
  walletId: string;
  txHash: string;
  type: 'send' | 'receive' | 'contract_call' | 'contract_deploy';
  from: string;
  to?: string;
  value: string;
  gasUsed?: number;
  fee?: string;
  status: TxStatus;
  blockNumber?: number;
  timestamp: string;
  methodName?: string;
}

export interface Workspace {
  id: string;
  chainId: string;
  name: string;
  path?: string;
  createdAt: string;
  updatedAt: string;
  contractCount?: number;
  transactionCount?: number;
  lastActive?: string;
}

export interface Contract {
  id: string;
  workspaceId: string;
  name: string;
  address: string; // Required
  interfaceType: InterfaceType;

  // One of these based on interfaceType:
  abi?: object[]; // EVM ABI JSON
  idl?: object; // Solana Anchor IDL JSON
  moveDefinition?: MoveDefinition; // Aptos Move manual definition

  // Cached parsed functions for UI
  functions?: ContractFunction[];

  createdAt: string;
}

export interface Transaction {
  id: string;
  workspaceId: string;
  contractId?: string;
  walletId?: string;
  name?: string;
  functionName?: string; // The contract function to call
  args?: Record<string, string>; // Saved form parameter values
  createdAt: string;
  contract?: Contract;
  wallet?: Wallet;
  lastRun?: TransactionRun;
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

export interface DecodedEvent {
  name: string;
  args: Record<string, unknown>;
}

// Request types
export interface CreateChainRequest {
  id?: string; // Optional chain ID (uses network.id from registry)
  name: string;
  ecosystem: Ecosystem;
  rpcUrl: string;
  chainIdNumeric?: number;
  currencySymbol: string;
  currencyDecimals?: number;
  blockExplorerUrl?: string;
  blockExplorerApiUrl?: string;
  faucetUrl?: string;
  // New fields for chain registry
  blockchain: string;
  networkType: NetworkType | string;
  isCustom?: boolean;
  iconId?: string;
}

export interface CreateWalletRequest {
  chainId: string;
  name: string;
  ecosystem?: Ecosystem;
}

export interface ImportWalletRequest {
  chainId: string;
  name: string;
  address?: string; // For watch-only wallets
  privateKey?: string;
  mnemonic?: string;
  derivationPath?: string;
  ecosystem?: Ecosystem; // For validation and key derivation
}

export interface CreateWorkspaceRequest {
  chainId: string;
  name: string;
}

export interface AddContractRequest {
  workspaceId: string;
  name: string;
  address: string;
  interfaceType: InterfaceType;
  abi?: object[];
  idl?: object;
  moveDefinition?: MoveDefinition;
}

export interface UpdateContractRequest {
  contractId: string;
  name: string;
  address: string;
  interfaceType: InterfaceType;
  abi?: object[];
  idl?: object;
  moveDefinition?: MoveDefinition;
}

// UI State types
export interface ModalState {
  isOpen: boolean;
  type: 'settings' | 'addContract' | 'addChain' | 'addWallet' | null;
}

// AI Types
export type AIProvider = 'openrouter' | 'anthropic' | 'openai' | 'google' | 'ollama' | 'lmstudio';

export interface AIModelConfig {
  provider: AIProvider;
  modelId: string;
  modelName: string;
  apiKey?: string;
  baseUrl?: string; // For Ollama/LMStudio
}

export interface AIProviderConfig {
  provider: AIProvider;
  apiKey?: string;
  baseUrl?: string;
  selectedModel?: string;
}

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface AIConversation {
  id: string;
  messages: AIMessage[];
  context?: AIContext;
  createdAt: string;
}

export interface AIContext {
  ecosystem?: Ecosystem;
  chainId?: string;
  contractId?: string;
  transactionId?: string;
  errorMessage?: string;
  sourceCode?: string;
}

export interface AISettings {
  enabled: boolean;
  provider: AIProvider;
  providers: Record<AIProvider, AIProviderConfig>;
}
