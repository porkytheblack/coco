import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-shell';
import { ethers } from 'ethers';
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
  explorerUrl?: string,
  explorerApiUrl?: string,
  explorerApiKey?: string
): Promise<Chain> {
  if (!checkIsTauri()) throw new Error('Not running in Tauri');
  console.log('[updateChain] Invoking with:', { chainId, name, rpcUrl, explorerUrl, explorerApiUrl, explorerApiKey: explorerApiKey ? '***' : undefined });
  return invoke<Chain>('update_chain', {
    chainId,
    name,
    rpcUrl,
    explorerUrl,
    explorerApiUrl,
    explorerApiKey,
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
  return invoke<Wallet>('create_wallet', {
    chainId: request.chainId,
    name: request.name,
    walletType: 'local', // Default wallet type
  });
}

export async function importWallet(request: ImportWalletRequest): Promise<Wallet> {
  if (!checkIsTauri()) throw new Error('Not running in Tauri');

  // Backend expects: chainId, name, address, privateKey, walletType, ecosystem
  let address = request.address;
  let privateKey = request.privateKey;
  const ecosystem = request.ecosystem || 'evm';

  if (!address && privateKey) {
    // Derive address from private key based on ecosystem
    if (ecosystem === 'evm') {
      // EVM: Use ethers.js to derive address
      const pk = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;
      try {
        const wallet = new ethers.Wallet(pk);
        address = wallet.address;
        privateKey = pk; // Normalize with 0x prefix
      } catch (error) {
        throw new Error(`Invalid EVM private key: ${(error as Error).message}`);
      }
    } else if (ecosystem === 'solana') {
      // Solana: Private key is base58 encoded, address derivation happens on frontend adapter
      // For now, require address to be provided for Solana wallets
      // In future, we can derive from base58 keypair
      throw new Error('Solana wallets require an address. Please provide the public key as the address.');
    } else if (ecosystem === 'aptos') {
      // Aptos: Private key is hex encoded, address derivation similar to EVM
      // For now, require address to be provided
      throw new Error('Aptos wallets require an address. Please provide the account address.');
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
