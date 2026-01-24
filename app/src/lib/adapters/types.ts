import type { Contract, ContractFunction, Ecosystem, WalletTransaction } from '@/types';

export interface CallResult {
  success: boolean;
  data?: unknown;
  error?: string;
  txHash?: string;
  blockNumber?: number;
  gasUsed?: string;
  events?: { name: string; args: Record<string, unknown> }[];
}

export interface WalletBalance {
  native: string; // Balance in wei/lamports/etc
  nativeFormatted: string; // Human-readable balance
  nativeDecimals: number;
  nativeSymbol: string;
}

export interface ChainAdapter {
  ecosystem: Ecosystem;

  // Parse interface to extract callable functions
  parseInterface(contract: Contract): ContractFunction[];

  // Execute a read-only call (view function)
  call(
    rpcUrl: string,
    contractAddress: string,
    functionName: string,
    args: unknown[],
    contractInterface: object[] | object | undefined
  ): Promise<CallResult>;

  // Execute a state-changing transaction
  sendTransaction(
    rpcUrl: string,
    contractAddress: string,
    functionName: string,
    args: unknown[],
    contractInterface: object[] | object | undefined,
    privateKey: string,
    options?: {
      value?: string;
      gasLimit?: string;
      gasPrice?: string;
    }
  ): Promise<CallResult>;

  // Validate contract address format
  isValidAddress(address: string): boolean;

  // Get wallet balance
  getBalance(rpcUrl: string, address: string, nativeSymbol: string): Promise<WalletBalance>;

  // Get transaction history for a wallet
  getTransactionHistory(
    rpcUrl: string,
    address: string,
    blockExplorerApiUrl?: string,
    blockExplorerApiKey?: string
  ): Promise<WalletTransaction[]>;
}
