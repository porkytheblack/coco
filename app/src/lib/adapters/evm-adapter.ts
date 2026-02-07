import { ethers } from 'ethers';
import type { ChainAdapter, CallResult, WalletBalance } from './types';
import type { Contract, ContractFunction, TokenBalance, WalletTransaction } from '@/types';

/**
 * Safely normalize an Ethereum address to its EIP-55 checksummed form.
 * Handles addresses with incorrect mixed-case checksums by lowercasing first.
 */
function safeGetAddress(address: string): string {
  try {
    return ethers.getAddress(address);
  } catch {
    // If the checksum is invalid, lowercase it first then compute correct checksum
    return ethers.getAddress(address.toLowerCase());
  }
}

interface ABIItem {
  type: string;
  name?: string;
  inputs?: { name: string; type: string }[];
  outputs?: { name: string; type: string }[];
  stateMutability?: string;
}

export const evmAdapter: ChainAdapter = {
  ecosystem: 'evm',

  parseInterface(contract: Contract): ContractFunction[] {
    if (!contract.abi || !Array.isArray(contract.abi)) return [];

    return (contract.abi as ABIItem[])
      .filter((item) => item.type === 'function')
      .map((item) => ({
        name: item.name || '',
        type:
          item.stateMutability === 'view' || item.stateMutability === 'pure'
            ? 'read'
            : 'write',
        inputs:
          item.inputs?.map((i) => ({ name: i.name, type: i.type })) || [],
        outputs:
          item.outputs?.map((o) => ({ name: o.name, type: o.type })) || [],
        stateMutability: item.stateMutability,
      }));
  },

  async call(
    rpcUrl,
    contractAddress,
    functionName,
    args,
    contractInterface
  ): Promise<CallResult> {
    try {
      // Validate and normalize the contract address to prevent ENS resolution attempts
      if (!contractAddress || !ethers.isAddress(contractAddress)) {
        return { success: false, error: `Invalid contract address: ${contractAddress}` };
      }
      const normalizedAddress = safeGetAddress(contractAddress);

      // Validate and normalize any address arguments to prevent ENS resolution
      const normalizedArgs = normalizeAddressArgs(args, contractInterface as ethers.InterfaceAbi, functionName);

      const provider = new ethers.JsonRpcProvider(rpcUrl);
      const contract = new ethers.Contract(
        normalizedAddress,
        contractInterface as ethers.InterfaceAbi,
        provider
      );
      const result = await contract[functionName](...normalizedArgs);

      // Handle BigInt serialization
      const serializedResult = serializeResult(result);
      return { success: true, data: serializedResult };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  async sendTransaction(
    rpcUrl,
    contractAddress,
    functionName,
    args,
    contractInterface,
    privateKey,
    options
  ): Promise<CallResult> {
    try {
      // Validate and normalize the contract address to prevent ENS resolution attempts
      if (!contractAddress || !ethers.isAddress(contractAddress)) {
        return { success: false, error: `Invalid contract address: ${contractAddress}` };
      }
      const normalizedAddress = safeGetAddress(contractAddress);

      // Create provider and wait for network to be detected (ensures chain ID is set)
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      // Get the network to ensure the provider has the correct chain ID
      // This is required for EIP-155 transaction signing
      await provider.getNetwork();

      const wallet = new ethers.Wallet(privateKey, provider);
      const contract = new ethers.Contract(
        normalizedAddress,
        contractInterface as ethers.InterfaceAbi,
        wallet
      );

      // Validate and normalize any address arguments to prevent ENS resolution
      const normalizedArgs = normalizeAddressArgs(args, contractInterface as ethers.InterfaceAbi, functionName);

      const txOptions: Record<string, unknown> = {};
      if (options?.value) {
        txOptions.value = ethers.parseEther(options.value);
      }
      if (options?.gasLimit) {
        txOptions.gasLimit = BigInt(options.gasLimit);
      }

      const tx = await contract[functionName](...normalizedArgs, txOptions);
      const receipt = await tx.wait();

      const events = receipt.logs
        .map((log: ethers.Log) => {
          try {
            const parsed = contract.interface.parseLog({
              topics: log.topics as string[],
              data: log.data,
            });
            return {
              name: parsed?.name || 'Unknown',
              args: parsed?.args
                ? Object.fromEntries(
                    Object.entries(parsed.args).filter(
                      ([key]) => isNaN(Number(key))
                    )
                  )
                : {},
            };
          } catch {
            return null;
          }
        })
        .filter(Boolean);

      // Calculate transaction fee from gas used and gas price
      const gasPrice = receipt.gasPrice?.toString();
      const fee = receipt.gasPrice
        ? (receipt.gasUsed * receipt.gasPrice).toString()
        : undefined;

      return {
        success: true,
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        gasPrice,
        fee,
        events,
      };
    } catch (error) {
      // Extract detailed error information
      let errorMessage = (error as Error).message;

      // Try to get revert reason from ethers error
      const ethersError = error as {
        code?: string;
        reason?: string;
        data?: string;
        shortMessage?: string;
        info?: { error?: { message?: string; data?: string } };
      };

      if (ethersError.reason) {
        errorMessage = ethersError.reason;
      } else if (ethersError.shortMessage) {
        errorMessage = ethersError.shortMessage;
      }

      // Check for nested error info (common with ethers v6)
      if (ethersError.info?.error?.message) {
        errorMessage = ethersError.info.error.message;
      }

      // Add error code if available
      if (ethersError.code) {
        errorMessage = `[${ethersError.code}] ${errorMessage}`;
      }

      console.error('[evmAdapter.sendTransaction] Error:', error);
      return { success: false, error: errorMessage };
    }
  },

  isValidAddress(address: string): boolean {
    return ethers.isAddress(address);
  },

  async getBalance(rpcUrl: string, address: string, nativeSymbol: string): Promise<WalletBalance> {
    try {
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      // Use getAddress to normalize the address and prevent ENS resolution attempts
      // This ensures we always pass a valid checksummed address
      const checksummedAddress = safeGetAddress(address);
      const balance = await provider.getBalance(checksummedAddress);

      return {
        native: balance.toString(),
        nativeFormatted: ethers.formatEther(balance),
        nativeDecimals: 18,
        nativeSymbol,
      };
    } catch (error) {
      console.error('Failed to fetch balance:', error);
      return {
        native: '0',
        nativeFormatted: '0',
        nativeDecimals: 18,
        nativeSymbol,
      };
    }
  },

  async getTransactionHistory(
    rpcUrl: string,
    address: string,
    blockExplorerApiUrl?: string,
    blockExplorerApiKey?: string
  ): Promise<WalletTransaction[]> {
    // Normalize address to checksummed format for consistent comparison
    const checksummedAddress = safeGetAddress(address);

    // Use block explorer API (Etherscan-compatible)
    if (!blockExplorerApiUrl) {
      const apiUrl = detectBlockExplorerApi(rpcUrl);
      if (!apiUrl) {
        console.warn('[getTransactionHistory] No block explorer API available for RPC:', rpcUrl);
        return [];
      }
      blockExplorerApiUrl = apiUrl;
    }

    console.log('[getTransactionHistory] Using block explorer API:', blockExplorerApiUrl, 'with API key:', blockExplorerApiKey ? 'yes' : 'no');

    try {
      // Get chain ID from RPC for V2 API
      const chainId = await getChainId(rpcUrl);

      // Use Etherscan V2 unified API endpoint
      let url = `https://api.etherscan.io/v2/api?chainid=${chainId}&module=account&action=txlist&address=${checksummedAddress}&startblock=0&endblock=99999999&page=1&offset=50&sort=desc`;

      // Add API key if provided
      if (blockExplorerApiKey) {
        url += `&apikey=${blockExplorerApiKey}`;
      }

      console.log('[getTransactionHistory] Using V2 API with chainId:', chainId);

      const response = await fetch(url);
      const data = await response.json();

      console.log('[getTransactionHistory] Response status:', data.status, 'message:', data.message, 'result count:', Array.isArray(data.result) ? data.result.length : typeof data.result);

      if (data.status !== '1' || !data.result || !Array.isArray(data.result)) {
        // Common error: "NOTOK" with result containing error message
        // This usually means rate limiting or missing API key
        if (data.message === 'NOTOK' && typeof data.result === 'string') {
          console.warn('[getTransactionHistory] API error:', data.result);
        } else if (data.message) {
          console.warn('[getTransactionHistory] API returned:', data.message);
        }
        return [];
      }

      return data.result.map((tx: EtherscanTx) => ({
        id: tx.hash,
        walletId: '',
        txHash: tx.hash,
        type: getTransactionType(tx, checksummedAddress),
        from: tx.from,
        to: tx.to,
        value: tx.value,
        gasUsed: parseInt(tx.gasUsed, 10),
        fee: (BigInt(tx.gasUsed) * BigInt(tx.gasPrice)).toString(),
        status: tx.isError === '0' ? 'success' : 'failed',
        blockNumber: parseInt(tx.blockNumber, 10),
        timestamp: new Date(parseInt(tx.timeStamp, 10) * 1000).toISOString(),
        methodName: tx.functionName || undefined,
      }));
    } catch (error) {
      console.error('[getTransactionHistory] Failed to fetch:', error);
      return [];
    }
  },

  async getTokenBalances(
    rpcUrl: string,
    address: string,
    blockExplorerApiUrl?: string,
    blockExplorerApiKey?: string
  ): Promise<TokenBalance[]> {
    const checksummedAddress = safeGetAddress(address);

    if (!blockExplorerApiUrl) {
      const apiUrl = detectBlockExplorerApi(rpcUrl);
      if (!apiUrl) return [];
      blockExplorerApiUrl = apiUrl;
    }

    try {
      const chainId = await getChainId(rpcUrl);

      // Use Etherscan V2 API to list all ERC-20 tokens for the address
      let url = `https://api.etherscan.io/v2/api?chainid=${chainId}&module=account&action=tokenlist&address=${checksummedAddress}`;
      if (blockExplorerApiKey) {
        url += `&apikey=${blockExplorerApiKey}`;
      }

      const response = await fetch(url);
      const data = await response.json();

      if (data.status !== '1' || !data.result || !Array.isArray(data.result)) {
        // Fallback: try tokentx to discover tokens, then call balanceOf
        return await getTokenBalancesFallback(rpcUrl, checksummedAddress, chainId, blockExplorerApiKey);
      }

      return data.result
        .filter((token: EtherscanToken) => token.balance && token.balance !== '0')
        .map((token: EtherscanToken) => ({
          address: token.contractAddress,
          name: token.name || 'Unknown Token',
          symbol: token.symbol || '???',
          decimals: parseInt(token.decimals, 10) || 18,
          balance: token.balance,
          logoUrl: undefined,
        }));
    } catch (error) {
      console.error('[getTokenBalances] Failed to fetch:', error);
      return [];
    }
  },
};

// Etherscan token list response type
interface EtherscanToken {
  contractAddress: string;
  name: string;
  symbol: string;
  decimals: string;
  balance: string;
}

// Etherscan token transfer response type
interface EtherscanTokenTx {
  contractAddress: string;
  tokenName: string;
  tokenSymbol: string;
  tokenDecimal: string;
}

// Fallback: discover tokens via tokentx, then call balanceOf on each
async function getTokenBalancesFallback(
  rpcUrl: string,
  address: string,
  chainId: number,
  apiKey?: string
): Promise<TokenBalance[]> {
  try {
    let url = `https://api.etherscan.io/v2/api?chainid=${chainId}&module=account&action=tokentx&address=${address}&startblock=0&endblock=99999999&page=1&offset=100&sort=desc`;
    if (apiKey) url += `&apikey=${apiKey}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== '1' || !Array.isArray(data.result)) return [];

    // Dedupe by contract address
    const seen = new Set<string>();
    const tokens: { address: string; name: string; symbol: string; decimals: number }[] = [];
    for (const tx of data.result as EtherscanTokenTx[]) {
      const addr = tx.contractAddress.toLowerCase();
      if (!seen.has(addr)) {
        seen.add(addr);
        tokens.push({
          address: tx.contractAddress,
          name: tx.tokenName || 'Unknown Token',
          symbol: tx.tokenSymbol || '???',
          decimals: parseInt(tx.tokenDecimal, 10) || 18,
        });
      }
    }

    // Call balanceOf for each token
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const erc20Abi = ['function balanceOf(address) view returns (uint256)'];
    const results: TokenBalance[] = [];

    const balancePromises = tokens.map(async (token) => {
      try {
        const contract = new ethers.Contract(token.address, erc20Abi, provider);
        const balance: bigint = await contract.balanceOf(address);
        if (balance > 0n) {
          results.push({
            address: token.address,
            name: token.name,
            symbol: token.symbol,
            decimals: token.decimals,
            balance: balance.toString(),
          });
        }
      } catch {
        // Skip tokens that fail
      }
    });

    await Promise.all(balancePromises);
    return results;
  } catch (error) {
    console.error('[getTokenBalancesFallback] Failed:', error);
    return [];
  }
}

// Etherscan API response type
interface EtherscanTx {
  hash: string;
  from: string;
  to: string;
  value: string;
  gasUsed: string;
  gasPrice: string;
  isError: string;
  blockNumber: string;
  timeStamp: string;
  functionName?: string;
  input?: string;
}

function getTransactionType(
  tx: EtherscanTx,
  walletAddress: string
): 'send' | 'receive' | 'contract_call' | 'contract_deploy' {
  const isFromWallet = tx.from.toLowerCase() === walletAddress.toLowerCase();
  const isToWallet = tx.to?.toLowerCase() === walletAddress.toLowerCase();

  // Contract deployment (no 'to' address)
  if (!tx.to || tx.to === '') {
    return 'contract_deploy';
  }

  // Contract call (has input data beyond '0x')
  if (tx.input && tx.input !== '0x' && tx.input.length > 10) {
    return 'contract_call';
  }

  // Simple transfer
  if (isFromWallet) {
    return 'send';
  }

  if (isToWallet) {
    return 'receive';
  }

  return 'send';
}

// Get chain ID from RPC endpoint
async function getChainId(rpcUrl: string): Promise<number> {
  try {
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: 1,
        jsonrpc: '2.0',
        method: 'eth_chainId',
        params: [],
      }),
    });
    const data = await response.json();
    if (data.result) {
      return parseInt(data.result, 16);
    }
  } catch (error) {
    console.error('[getChainId] Failed to get chain ID:', error);
  }
  return 1; // Default to Ethereum mainnet
}

// Detect block explorer API URL from RPC URL
function detectBlockExplorerApi(rpcUrl: string): string | null {
  const url = rpcUrl.toLowerCase();

  // Check more specific chains FIRST before generic checks

  // Base Sepolia (check before generic Sepolia)
  if (url.includes('base') && url.includes('sepolia')) {
    return 'https://api-sepolia.basescan.org/api';
  }

  // Base Mainnet
  if (url.includes('base') || url.includes('mainnet.base.org')) {
    return 'https://api.basescan.org/api';
  }

  // Arbitrum Sepolia (check before generic Sepolia)
  if (url.includes('arbitrum') && url.includes('sepolia')) {
    return 'https://api-sepolia.arbiscan.io/api';
  }

  // Arbitrum One
  if (url.includes('arb1') || url.includes('arbitrum')) {
    return 'https://api.arbiscan.io/api';
  }

  // Optimism Sepolia (check before generic Sepolia)
  if (url.includes('optimism') && url.includes('sepolia')) {
    return 'https://api-sepolia-optimistic.etherscan.io/api';
  }

  // Optimism Mainnet
  if (url.includes('optimism')) {
    return 'https://api-optimistic.etherscan.io/api';
  }

  // Polygon Amoy (testnet)
  if (url.includes('amoy')) {
    return 'https://api-amoy.polygonscan.com/api';
  }

  // Polygon Mainnet
  if (url.includes('polygon')) {
    return 'https://api.polygonscan.com/api';
  }

  // Ethereum Sepolia (generic - check after all specific sepolia chains)
  if (url.includes('sepolia')) {
    return 'https://api-sepolia.etherscan.io/api';
  }

  // Goerli (deprecated but still used)
  if (url.includes('goerli')) {
    return 'https://api-goerli.etherscan.io/api';
  }

  // Ethereum Mainnet (last resort for eth/infura URLs)
  if (url.includes('mainnet') || url.includes('infura') || url.includes('eth.')) {
    return 'https://api.etherscan.io/api';
  }

  return null;
}

// Helper to validate and normalize address arguments
// This prevents ENS resolution attempts on networks that don't support it
function normalizeAddressArgs(args: unknown[], contractInterface: ethers.InterfaceAbi, functionName: string): unknown[] {
  try {
    const iface = new ethers.Interface(contractInterface);
    const fragment = iface.getFunction(functionName);
    if (!fragment) return args;

    return args.map((arg, index) => {
      const input = fragment.inputs[index];
      if (!input) return arg;

      // Check if the input type is an address
      if (input.type === 'address' && typeof arg === 'string') {
        // Validate and normalize the address
        if (!ethers.isAddress(arg)) {
          throw new Error(`Invalid address for parameter '${input.name || index}': ${arg}`);
        }
        return safeGetAddress(arg);
      }

      // Handle address arrays
      if (input.type === 'address[]' && Array.isArray(arg)) {
        return arg.map((addr, i) => {
          if (typeof addr === 'string') {
            if (!ethers.isAddress(addr)) {
              throw new Error(`Invalid address at index ${i} for parameter '${input.name || index}': ${addr}`);
            }
            return safeGetAddress(addr);
          }
          return addr;
        });
      }

      return arg;
    });
  } catch (error) {
    // If we can't parse the interface, return args as-is
    // The actual call will fail with a more specific error
    if ((error as Error).message?.includes('Invalid address')) {
      throw error;
    }
    return args;
  }
}

// Helper to serialize BigInt values
function serializeResult(value: unknown): unknown {
  if (typeof value === 'bigint') {
    return value.toString();
  }
  if (Array.isArray(value)) {
    return value.map(serializeResult);
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, serializeResult(v)])
    );
  }
  return value;
}
