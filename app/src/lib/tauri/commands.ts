import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-shell';
import { open as openDialog } from '@tauri-apps/plugin-dialog';
import type { ScriptRunner } from '@/types';
import { generateWallet, deriveWalletFromPrivateKey } from '@/lib/wallet/generator';
import type {
  Chain,
  Wallet,
  WalletWithChain,
  Workspace,
  Contract,
  Transaction,
  CreateChainRequest,
  CreateWalletRequest,
  ImportWalletRequest,
  CreateWorkspaceRequest,
  // New v0.0.3 types
  Blockchain,
  Network,
  Script,
  ScriptFlag,
  ScriptRun,
  EnvironmentVariable,
  Conversation,
  Message,
  Preference,
  ContractDoc,
  ScriptFlagType,
} from '@/types';

// Backend wallet type (differs from frontend - has optional balance string)
interface BackendWallet extends Wallet {
  balance?: string;
}

// Check if running in Tauri by looking for the __TAURI_INTERNALS__ object
export function checkIsTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

// Open external URL in default browser
export async function openExternal(url: string): Promise<void> {
  if (checkIsTauri()) {
    await open(url);
  } else {
    window.open(url, '_blank');
  }
}

// For backward compatibility
export const isTauri = typeof window !== 'undefined';

// ============================================================================
// File Dialog commands
// ============================================================================

export interface FileFilter {
  name: string;
  extensions: string[];
}

// Pick a file using the native file dialog
export async function pickFile(options?: {
  title?: string;
  defaultPath?: string;
  filters?: FileFilter[];
  multiple?: boolean;
}): Promise<string | string[] | null> {
  if (!checkIsTauri()) return null;
  const result = await openDialog({
    title: options?.title,
    defaultPath: options?.defaultPath,
    filters: options?.filters,
    multiple: options?.multiple || false,
    directory: false,
  });
  return result;
}

// Pick a directory using the native file dialog
export async function pickDirectory(options?: {
  title?: string;
  defaultPath?: string;
}): Promise<string | null> {
  if (!checkIsTauri()) return null;
  const result = await openDialog({
    title: options?.title,
    defaultPath: options?.defaultPath,
    directory: true,
    multiple: false,
  });
  return result as string | null;
}

// File filters for common script types
export const SCRIPT_FILE_FILTERS: FileFilter[] = [
  { name: 'Shell Scripts', extensions: ['sh', 'bash', 'zsh'] },
  { name: 'JavaScript/TypeScript', extensions: ['js', 'ts', 'mjs', 'mts'] },
  { name: 'Python', extensions: ['py'] },
  { name: 'Solidity', extensions: ['sol'] },
  { name: 'All Files', extensions: ['*'] },
];

// Chain commands
export async function listChains(): Promise<Chain[]> {
  if (!checkIsTauri()) return [];
  return invoke<Chain[]>('list_chains');
}

export async function getChain(chainId: string): Promise<Chain> {
  if (!checkIsTauri()) throw new Error('Not running in Tauri');
  return invoke<Chain>('get_chain', { chainId });
}

export async function createChain(request: CreateChainRequest): Promise<Chain> {
  if (!checkIsTauri()) throw new Error('Not running in Tauri');
  return invoke<Chain>('create_chain', { request });
}

export async function updateChain(
  chainId: string,
  name: string,
  rpcUrl: string,
  chainIdNumeric?: number,
  explorerUrl?: string,
  explorerApiUrl?: string,
  explorerApiKey?: string,
  faucetUrl?: string
): Promise<Chain> {
  if (!checkIsTauri()) throw new Error('Not running in Tauri');
  console.log('[updateChain] Invoking with:', { chainId, name, rpcUrl, chainIdNumeric, explorerUrl, explorerApiUrl, explorerApiKey: explorerApiKey ? '***' : undefined, faucetUrl });
  return invoke<Chain>('update_chain', {
    chainId,
    name,
    rpcUrl,
    chainIdNumeric,
    explorerUrl,
    explorerApiUrl,
    explorerApiKey,
    faucetUrl,
  });
}

export async function deleteChain(chainId: string): Promise<void> {
  if (!checkIsTauri()) throw new Error('Not running in Tauri');
  return invoke<void>('delete_chain', { chainId });
}

// Wallet commands
export async function listWallets(chainId: string): Promise<Wallet[]> {
  if (!checkIsTauri()) return [];
  return invoke<Wallet[]>('list_wallets', { chainId });
}

/// List wallets from other chains of the same blockchain (for wallet reuse)
export async function listReusableWallets(blockchain: string, excludeChainId: string): Promise<WalletWithChain[]> {
  if (!checkIsTauri()) return [];
  return invoke<WalletWithChain[]>('list_reusable_wallets', { blockchain, excludeChainId });
}

export async function getWallet(walletId: string): Promise<Wallet> {
  if (!checkIsTauri()) throw new Error('Not running in Tauri');
  return invoke<Wallet>('get_wallet', { walletId });
}

export async function createWallet(request: CreateWalletRequest): Promise<Wallet> {
  if (!checkIsTauri()) throw new Error('Not running in Tauri');

  // Generate wallet using the appropriate SDK based on ecosystem
  const ecosystem = request.ecosystem || 'evm';
  const generated = generateWallet(ecosystem);

  return invoke<Wallet>('create_wallet', {
    chainId: request.chainId,
    name: request.name,
    walletType: 'local',
    address: generated.address,
    privateKey: generated.privateKey,
    publicKey: generated.publicKey,
  });
}

export async function importWallet(request: ImportWalletRequest): Promise<Wallet> {
  if (!checkIsTauri()) throw new Error('Not running in Tauri');

  // Backend expects: chainId, name, address, privateKey, walletType, ecosystem
  let address = request.address;
  let privateKey = request.privateKey;
  const ecosystem = request.ecosystem || 'evm';

  if (!address && privateKey) {
    // Derive address from private key using the appropriate SDK
    try {
      const derived = deriveWalletFromPrivateKey(privateKey, ecosystem);
      address = derived.address;
      privateKey = derived.privateKey; // Normalized format
    } catch (error) {
      throw new Error(`Invalid ${ecosystem.toUpperCase()} private key: ${(error as Error).message}`);
    }
  }

  if (!address) {
    throw new Error('Either address or privateKey is required');
  }

  return invoke<Wallet>('import_wallet', {
    chainId: request.chainId,
    name: request.name,
    address,
    privateKey, // Pass private key to backend for encrypted storage
    walletType: 'imported',
    ecosystem,
  });
}

export async function getWalletPrivateKey(walletId: string): Promise<string> {
  if (!checkIsTauri()) throw new Error('Not running in Tauri');
  return invoke<string>('get_wallet_private_key', { walletId });
}

export async function deleteWallet(chainId: string, walletId: string): Promise<void> {
  if (!checkIsTauri()) throw new Error('Not running in Tauri');
  return invoke<void>('delete_wallet', { chainId, walletId });
}

export async function refreshBalance(chainId: string, walletId: string): Promise<string> {
  if (!checkIsTauri()) throw new Error('Not running in Tauri');
  const wallet = await invoke<BackendWallet>('refresh_balance', { chainId, walletId });
  return wallet.balance || '0';
}

// Workspace commands
export async function listWorkspaces(chainId: string): Promise<Workspace[]> {
  if (!checkIsTauri()) return [];
  return invoke<Workspace[]>('list_workspaces', { chainId });
}

export async function getWorkspace(workspaceId: string): Promise<Workspace> {
  if (!checkIsTauri()) throw new Error('Not running in Tauri');
  return invoke<Workspace>('get_workspace', { workspaceId });
}

export async function createWorkspace(request: CreateWorkspaceRequest): Promise<Workspace> {
  if (!checkIsTauri()) throw new Error('Not running in Tauri');
  return invoke<Workspace>('create_workspace', {
    chainId: request.chainId,
    name: request.name,
  });
}

export async function deleteWorkspace(workspaceId: string): Promise<void> {
  if (!checkIsTauri()) throw new Error('Not running in Tauri');
  return invoke<void>('delete_workspace', { workspaceId });
}

// Contract commands
export async function listContracts(workspaceId: string): Promise<Contract[]> {
  if (!checkIsTauri()) return [];
  return invoke<Contract[]>('list_contracts', { workspaceId });
}

/// List contracts from other chains of the same blockchain (for contract reuse)
export async function listReusableContracts(blockchain: string, excludeChainId: string): Promise<import('@/types').ContractWithChain[]> {
  if (!checkIsTauri()) return [];
  return invoke<import('@/types').ContractWithChain[]>('list_reusable_contracts', { blockchain, excludeChainId });
}

export async function addContract(
  workspaceId: string,
  name: string,
  address?: string,
  interfaceType?: string,
  abi?: string,
  idl?: string,
  moveDefinition?: string
): Promise<Contract> {
  if (!checkIsTauri()) throw new Error('Not running in Tauri');
  return invoke<Contract>('add_contract', {
    workspaceId,
    name,
    address,
    interfaceType,
    abi,
    idl,
    moveDefinition,
  });
}

export async function deleteContract(contractId: string): Promise<void> {
  if (!checkIsTauri()) throw new Error('Not running in Tauri');
  return invoke<void>('delete_contract', { contractId });
}

export async function updateContract(
  contractId: string,
  name: string,
  address?: string,
  interfaceType?: string,
  abi?: string,
  idl?: string,
  moveDefinition?: string
): Promise<Contract> {
  if (!checkIsTauri()) throw new Error('Not running in Tauri');
  return invoke<Contract>('update_contract', {
    contractId,
    name,
    address,
    interfaceType,
    abi,
    idl,
    moveDefinition,
  });
}

// Transaction commands
export async function listTransactions(workspaceId: string): Promise<Transaction[]> {
  if (!checkIsTauri()) return [];
  return invoke<Transaction[]>('list_transactions', { workspaceId });
}

export async function createTransaction(
  workspaceId: string,
  name: string,
  contractId?: string,
  functionName?: string
): Promise<Transaction> {
  if (!checkIsTauri()) throw new Error('Not running in Tauri');
  return invoke<Transaction>('create_transaction', {
    workspaceId,
    name,
    contractId,
    functionName,
  });
}

export async function deleteTransaction(transactionId: string): Promise<void> {
  if (!checkIsTauri()) throw new Error('Not running in Tauri');
  return invoke<void>('delete_transaction', { transactionId });
}

export async function updateTransaction(
  transactionId: string,
  updates: {
    name?: string;
    contractId?: string;
    functionName?: string;
    args?: string; // JSON string of the payload
  }
): Promise<import('@/types').Transaction> {
  if (!checkIsTauri()) throw new Error('Not running in Tauri');
  return invoke<import('@/types').Transaction>('update_transaction', {
    transactionId,
    ...updates,
  });
}

export async function executeTransaction(
  transactionId: string,
  payload: Record<string, string>,
  walletId: string
): Promise<import('@/types').TransactionRun> {
  if (!checkIsTauri()) throw new Error('Not running in Tauri');
  return invoke<import('@/types').TransactionRun>('execute_transaction', {
    transactionId,
    payload,
    walletId,
  });
}

export async function saveTransactionRun(
  run: import('@/types').TransactionRun
): Promise<import('@/types').TransactionRun> {
  if (!checkIsTauri()) throw new Error('Not running in Tauri');
  return invoke<import('@/types').TransactionRun>('save_transaction_run', { run });
}

export async function listTransactionRuns(
  transactionId: string
): Promise<import('@/types').TransactionRun[]> {
  if (!checkIsTauri()) return [];
  return invoke<import('@/types').TransactionRun[]>('list_transaction_runs', { transactionId });
}

export async function updateTransactionRunExplanation(
  runId: string,
  aiExplanation: import('@/types').AIExplanation
): Promise<void> {
  if (!checkIsTauri()) throw new Error('Not running in Tauri');
  return invoke<void>('update_transaction_run_explanation', { runId, aiExplanation });
}

// ============================================================================
// Blockchain & Network commands (v0.0.3)
// ============================================================================

export async function listBlockchains(): Promise<Blockchain[]> {
  if (!checkIsTauri()) return [];
  return invoke<Blockchain[]>('list_blockchains');
}

export async function getBlockchain(blockchainId: string): Promise<Blockchain> {
  if (!checkIsTauri()) throw new Error('Not running in Tauri');
  return invoke<Blockchain>('get_blockchain', { blockchainId });
}

export async function listNetworks(blockchainId: string): Promise<Network[]> {
  if (!checkIsTauri()) return [];
  return invoke<Network[]>('list_networks', { blockchainId });
}

export async function listAllNetworks(): Promise<Network[]> {
  if (!checkIsTauri()) return [];
  return invoke<Network[]>('list_all_networks');
}

export async function getNetwork(networkId: string): Promise<Network> {
  if (!checkIsTauri()) throw new Error('Not running in Tauri');
  return invoke<Network>('get_network', { networkId });
}

export async function createNetwork(
  blockchainId: string,
  name: string,
  networkType: string,
  rpcUrl: string,
  nativeCurrency: string,
  chainIdNumeric?: number,
  blockExplorerUrl?: string,
  blockExplorerApiUrl?: string,
  blockExplorerApiKey?: string,
  faucetUrl?: string,
  isCustom?: boolean
): Promise<Network> {
  if (!checkIsTauri()) throw new Error('Not running in Tauri');
  return invoke<Network>('create_network', {
    blockchainId,
    name,
    networkType,
    rpcUrl,
    nativeCurrency,
    chainIdNumeric,
    blockExplorerUrl,
    blockExplorerApiUrl,
    blockExplorerApiKey,
    faucetUrl,
    isCustom,
  });
}

export async function updateNetwork(
  networkId: string,
  name?: string,
  rpcUrl?: string,
  chainIdNumeric?: number,
  blockExplorerUrl?: string,
  blockExplorerApiUrl?: string,
  blockExplorerApiKey?: string,
  faucetUrl?: string
): Promise<Network> {
  if (!checkIsTauri()) throw new Error('Not running in Tauri');
  return invoke<Network>('update_network', {
    networkId,
    name,
    rpcUrl,
    chainIdNumeric,
    blockExplorerUrl,
    blockExplorerApiUrl,
    blockExplorerApiKey,
    faucetUrl,
  });
}

export async function deleteNetwork(networkId: string): Promise<void> {
  if (!checkIsTauri()) throw new Error('Not running in Tauri');
  return invoke<void>('delete_network', { networkId });
}

// ============================================================================
// Script commands (v0.0.3)
// ============================================================================

export async function listScripts(workspaceId: string): Promise<Script[]> {
  if (!checkIsTauri()) return [];
  return invoke<Script[]>('list_scripts', { workspaceId });
}

export async function getScript(scriptId: string): Promise<Script> {
  if (!checkIsTauri()) throw new Error('Not running in Tauri');
  return invoke<Script>('get_script', { scriptId });
}

export async function createScript(
  workspaceId: string,
  input: {
    name: string;
    description?: string;
    runner: ScriptRunner;
    filePath: string;
    command?: string;
    workingDirectory?: string;
    category?: string;
  }
): Promise<Script> {
  if (!checkIsTauri()) throw new Error('Not running in Tauri');
  return invoke<Script>('create_script', { workspaceId, input });
}

export async function updateScript(
  scriptId: string,
  updates: {
    name?: string;
    description?: string;
    runner?: ScriptRunner;
    filePath?: string;
    command?: string;
    workingDirectory?: string;
    category?: string;
  }
): Promise<Script> {
  if (!checkIsTauri()) throw new Error('Not running in Tauri');
  return invoke<Script>('update_script', { scriptId, ...updates });
}

export async function deleteScript(scriptId: string): Promise<void> {
  if (!checkIsTauri()) throw new Error('Not running in Tauri');
  return invoke<void>('delete_script', { scriptId });
}

// Script flags
export async function listScriptFlags(scriptId: string): Promise<ScriptFlag[]> {
  if (!checkIsTauri()) return [];
  return invoke<ScriptFlag[]>('list_script_flags', { scriptId });
}

export async function createScriptFlag(
  scriptId: string,
  input: {
    flagName: string;
    flagType: ScriptFlagType;
    defaultValue?: string;
    required: boolean;
    description?: string;
  }
): Promise<ScriptFlag> {
  if (!checkIsTauri()) throw new Error('Not running in Tauri');
  return invoke<ScriptFlag>('create_script_flag', { scriptId, input });
}

export async function updateScriptFlag(
  flagId: string,
  flagName?: string,
  flagType?: string,
  defaultValue?: string,
  required?: boolean,
  description?: string
): Promise<ScriptFlag> {
  if (!checkIsTauri()) throw new Error('Not running in Tauri');
  return invoke<ScriptFlag>('update_script_flag', {
    flagId,
    flagName,
    flagType,
    defaultValue,
    required,
    description,
  });
}

export async function deleteScriptFlag(flagId: string): Promise<void> {
  if (!checkIsTauri()) throw new Error('Not running in Tauri');
  return invoke<void>('delete_script_flag', { flagId });
}

// Script execution
export async function runScript(
  scriptId: string,
  input: { flags?: Record<string, string>; envVarKeys?: string[] }
): Promise<ScriptRun> {
  if (!checkIsTauri()) throw new Error('Not running in Tauri');
  return invoke<ScriptRun>('run_script', { scriptId, input });
}

export async function startScriptAsync(
  scriptId: string,
  input: { flags?: Record<string, string>; envVarKeys?: string[] }
): Promise<ScriptRun> {
  if (!checkIsTauri()) throw new Error('Not running in Tauri');
  return invoke<ScriptRun>('start_script_async', { scriptId, input });
}

export async function cancelScriptRun(runId: string): Promise<void> {
  if (!checkIsTauri()) throw new Error('Not running in Tauri');
  return invoke<void>('cancel_script_run', { runId });
}

export async function listScriptRuns(scriptId: string): Promise<ScriptRun[]> {
  if (!checkIsTauri()) return [];
  return invoke<ScriptRun[]>('list_script_runs', { scriptId });
}

export async function getScriptRun(runId: string): Promise<ScriptRun> {
  if (!checkIsTauri()) throw new Error('Not running in Tauri');
  return invoke<ScriptRun>('get_script_run', { runId });
}

export async function getScriptRunLogs(runId: string): Promise<string> {
  if (!checkIsTauri()) throw new Error('Not running in Tauri');
  return invoke<string>('get_script_run_logs', { runId });
}

// ============================================================================
// Environment Variable commands (v0.0.3)
// ============================================================================

export async function listEnvVars(workspaceId: string): Promise<EnvironmentVariable[]> {
  if (!checkIsTauri()) return [];
  return invoke<EnvironmentVariable[]>('list_env_vars', { workspaceId });
}

export async function getEnvVar(envVarId: string): Promise<EnvironmentVariable> {
  if (!checkIsTauri()) throw new Error('Not running in Tauri');
  return invoke<EnvironmentVariable>('get_env_var', { envVarId });
}

export async function createEnvVar(
  workspaceId: string,
  key: string,
  value: string,
  description?: string
): Promise<EnvironmentVariable> {
  if (!checkIsTauri()) throw new Error('Not running in Tauri');
  return invoke<EnvironmentVariable>('create_env_var', { workspaceId, key, value, description });
}

export async function updateEnvVar(
  envVarId: string,
  key?: string,
  value?: string,
  description?: string
): Promise<EnvironmentVariable> {
  if (!checkIsTauri()) throw new Error('Not running in Tauri');
  return invoke<EnvironmentVariable>('update_env_var', { envVarId, key, value, description });
}

export async function deleteEnvVar(envVarId: string): Promise<void> {
  if (!checkIsTauri()) throw new Error('Not running in Tauri');
  return invoke<void>('delete_env_var', { envVarId });
}

export async function getEnvValue(workspaceId: string, key: string): Promise<string> {
  if (!checkIsTauri()) throw new Error('Not running in Tauri');
  return invoke<string>('get_env_value', { workspaceId, key });
}

// ============================================================================
// Conversation commands (v0.0.3)
// ============================================================================

export async function listConversations(workspaceId?: string): Promise<Conversation[]> {
  if (!checkIsTauri()) return [];
  return invoke<Conversation[]>('list_conversations', { workspaceId });
}

export async function getConversation(conversationId: string): Promise<Conversation> {
  if (!checkIsTauri()) throw new Error('Not running in Tauri');
  return invoke<Conversation>('get_conversation', { conversationId });
}

export async function createConversation(
  workspaceId?: string,
  title?: string
): Promise<Conversation> {
  if (!checkIsTauri()) throw new Error('Not running in Tauri');
  return invoke<Conversation>('create_conversation', { workspaceId, title });
}

export async function updateConversation(
  conversationId: string,
  title?: string
): Promise<Conversation> {
  if (!checkIsTauri()) throw new Error('Not running in Tauri');
  return invoke<Conversation>('update_conversation', { conversationId, title });
}

export async function deleteConversation(conversationId: string): Promise<void> {
  if (!checkIsTauri()) throw new Error('Not running in Tauri');
  return invoke<void>('delete_conversation', { conversationId });
}

// Messages
export async function listMessages(conversationId: string): Promise<Message[]> {
  if (!checkIsTauri()) return [];
  return invoke<Message[]>('list_messages', { conversationId });
}

export async function getMessage(messageId: string): Promise<Message> {
  if (!checkIsTauri()) throw new Error('Not running in Tauri');
  return invoke<Message>('get_message', { messageId });
}

export async function addMessage(
  conversationId: string,
  role: string,
  content: string
): Promise<Message> {
  if (!checkIsTauri()) throw new Error('Not running in Tauri');
  return invoke<Message>('add_message', { conversationId, role, content });
}

export async function deleteMessage(messageId: string): Promise<void> {
  if (!checkIsTauri()) throw new Error('Not running in Tauri');
  return invoke<void>('delete_message', { messageId });
}

export async function clearConversationMessages(conversationId: string): Promise<void> {
  if (!checkIsTauri()) throw new Error('Not running in Tauri');
  return invoke<void>('clear_conversation_messages', { conversationId });
}

// ============================================================================
// Preference commands (v0.0.3)
// ============================================================================

export async function getPreference(key: string): Promise<unknown | null> {
  if (!checkIsTauri()) return null;
  return invoke<unknown | null>('get_preference', { key });
}

export async function setPreference(key: string, value: unknown): Promise<void> {
  if (!checkIsTauri()) throw new Error('Not running in Tauri');
  return invoke<void>('set_preference', { key, value });
}

export async function deletePreference(key: string): Promise<void> {
  if (!checkIsTauri()) throw new Error('Not running in Tauri');
  return invoke<void>('delete_preference', { key });
}

export async function listPreferences(): Promise<Preference[]> {
  if (!checkIsTauri()) return [];
  return invoke<Preference[]>('list_preferences');
}

// Convenience preference functions
export async function getTheme(): Promise<string> {
  if (!checkIsTauri()) return 'dark';
  return invoke<string>('get_theme');
}

export async function setTheme(theme: string): Promise<void> {
  if (!checkIsTauri()) throw new Error('Not running in Tauri');
  return invoke<void>('set_theme', { theme });
}

export async function getAiSettings(): Promise<unknown | null> {
  if (!checkIsTauri()) return null;
  return invoke<unknown | null>('get_ai_settings');
}

export async function setAiSettings(settings: unknown): Promise<void> {
  if (!checkIsTauri()) throw new Error('Not running in Tauri');
  return invoke<void>('set_ai_settings', { settings });
}

export async function getActiveWorkspace(): Promise<string | null> {
  if (!checkIsTauri()) return null;
  return invoke<string | null>('get_active_workspace');
}

export async function setActiveWorkspace(workspaceId?: string): Promise<void> {
  if (!checkIsTauri()) throw new Error('Not running in Tauri');
  return invoke<void>('set_active_workspace', { workspaceId });
}

export async function getActiveNetwork(): Promise<string | null> {
  if (!checkIsTauri()) return null;
  return invoke<string | null>('get_active_network');
}

export async function setActiveNetwork(networkId?: string): Promise<void> {
  if (!checkIsTauri()) throw new Error('Not running in Tauri');
  return invoke<void>('set_active_network', { networkId });
}

// ============================================================================
// Contract Documentation commands (v0.0.3)
// ============================================================================

export async function getContractDocs(contractId: string): Promise<ContractDoc[]> {
  if (!checkIsTauri()) return [];
  return invoke<ContractDoc[]>('get_contract_docs', { contractId });
}

export async function getFunctionDoc(
  contractId: string,
  functionName: string
): Promise<ContractDoc | null> {
  if (!checkIsTauri()) return null;
  return invoke<ContractDoc | null>('get_function_doc', { contractId, functionName });
}

export async function upsertContractDoc(
  contractId: string,
  functionName: string,
  description?: string,
  notes?: string
): Promise<ContractDoc> {
  if (!checkIsTauri()) throw new Error('Not running in Tauri');
  return invoke<ContractDoc>('upsert_contract_doc', {
    contractId,
    functionName,
    description,
    notes,
  });
}

export async function deleteContractDoc(docId: string): Promise<void> {
  if (!checkIsTauri()) throw new Error('Not running in Tauri');
  return invoke<void>('delete_contract_doc', { docId });
}

export async function deleteFunctionDoc(
  contractId: string,
  functionName: string
): Promise<void> {
  if (!checkIsTauri()) throw new Error('Not running in Tauri');
  return invoke<void>('delete_function_doc', { contractId, functionName });
}
