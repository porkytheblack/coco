import { Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk';
import type { ChainAdapter, CallResult, WalletBalance } from './types';
import type { Chain, Contract, ContractFunction, MoveFunction, WalletTransaction } from '@/types';

const OCTAS_PER_APT = 100_000_000;

export function getNetworkFromRPC(rpcUrl: string) {
  console.log("rpcUrl::", rpcUrl);
  return rpcUrl.includes("mainnet") ? Network.MAINNET : rpcUrl.includes("devnet") ? Network.DEVNET : Network.TESTNET
}

export function getExplorerUrl(selectedChain: Chain, address: string){

  let blockExplorerUrl = selectedChain.blockExplorerUrl ?? ""
  let rpcUrl = selectedChain.rpcUrl
  const network = rpcUrl.includes("testnet") ? "testnet" : rpcUrl.includes("devnet") ? "devnet" : "mainnet"

      // Determine environment based on URL
      let environment: 'aptos' | 'solana' | 'evm' = 'evm';
      if (blockExplorerUrl.includes('aptos')) {
        environment = 'aptos';
      } else if (blockExplorerUrl.includes('solana')) {
        environment = 'solana';
      }

      // Build the appropriate URL based on environment
      let explorerUrl = blockExplorerUrl;
      if (environment === 'aptos') {
        explorerUrl = `${blockExplorerUrl}/account/${address}${network == "testnet" ? '?network=testnet' : ''}`;
      } else if (environment === 'solana') {
        explorerUrl = `${blockExplorerUrl}/address/${address}${network == "devnet" ? '?cluster=devnet' : ''}`;
      } else {
        explorerUrl = `${blockExplorerUrl}/address/${address}`;
      }

      return explorerUrl
}

export function formatPriv(priv: string) {
  return priv.startsWith("ed25519-priv-") ? priv : ("ed25519-priv-" + priv)
}

export const aptosAdapter: ChainAdapter = {
  ecosystem: 'aptos',

  parseInterface(contract: Contract): ContractFunction[] {
    if (!contract.moveDefinition) return [];

    return contract.moveDefinition.functions.map((fn: MoveFunction) => ({
      name: fn.name,
      type: fn.isView ? 'read' : 'write',
      inputs: fn.params.map((p) => ({
        name: p.name,
        type: p.type,
      })),
      outputs:
        fn.returnType?.map((t, i) => ({ name: `return_${i}`, type: t })) || [],
      typeParams: fn.typeParams, // Include type parameters for generic functions
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
      const network = getNetworkFromRPC(rpcUrl)
      const config = new AptosConfig({ network });
      const aptos = new Aptos(config);

      // Extract type arguments if present (passed as JSON in first arg)
      let typeArguments: string[] = [];
      let functionArgs = [...args];
      if (functionArgs.length > 0 && typeof functionArgs[0] === 'string') {
        try {
          const parsed = JSON.parse(functionArgs[0] as string);
          if (parsed.__aptos_type_args__) {
            typeArguments = parsed.__aptos_type_args__;
            functionArgs.shift();
          }
        } catch {
          // Not JSON, continue normally
        }
      }

      // Build the function path from Move definition
      // Aptos functions use format: deployer_address::module_name::function_name
      let functionPath: string;
      const moveDef = contractInterface as import('@/types').MoveDefinition | undefined;

      if (moveDef?.moduleAddress && moveDef?.moduleName) {
        // Use Move definition if available
        functionPath = `${moveDef.moduleAddress}::${moveDef.moduleName}::${functionName}`;
      } else if (contractAddress.includes('::')) {
        // If address already includes module path, append function
        functionPath = contractAddress.includes(functionName)
          ? contractAddress
          : `${contractAddress}::${functionName}`;
      } else {
        // Fallback: use address as module address
        functionPath = `${contractAddress}::${functionName}`;
      }

      // For view functions, use the view API
      const result = await aptos.view({
        payload: {
          function: functionPath as `${string}::${string}::${string}`,
          typeArguments: typeArguments as [],
          functionArguments: functionArgs as string[],
        },
      });

      return { success: true, data: result };
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
    _options
  ): Promise<CallResult> {
    try {
      const config = new AptosConfig({ network: getNetworkFromRPC(rpcUrl) });
      const aptos = new Aptos(config);

      // Import Account dynamically to handle the private key
      const { Account, Ed25519PrivateKey } = await import('@aptos-labs/ts-sdk');

      const account = Account.fromPrivateKey({
        privateKey: new Ed25519PrivateKey(formatPriv(privateKey)),
      });

      // Extract type arguments if present (passed as JSON in first arg)
      let typeArguments: string[] = [];
      let functionArgs = [...args];
      if (functionArgs.length > 0 && typeof functionArgs[0] === 'string') {
        try {
          const parsed = JSON.parse(functionArgs[0] as string);
          if (parsed.__aptos_type_args__) {
            typeArguments = parsed.__aptos_type_args__;
            functionArgs.shift();
          }
        } catch {
          // Not JSON, continue normally
        }
      }

      // Build the function path from Move definition
      // Aptos functions use format: deployer_address::module_name::function_name
      let functionPath: string;
      const moveDef = contractInterface as import('@/types').MoveDefinition | undefined;

      if (moveDef?.moduleAddress && moveDef?.moduleName) {
        // Use Move definition if available
        functionPath = `${moveDef.moduleAddress}::${moveDef.moduleName}::${functionName}`;
      } else if (contractAddress.includes('::')) {
        // If address already includes module path, append function
        functionPath = contractAddress.includes(functionName)
          ? contractAddress
          : `${contractAddress}::${functionName}`;
      } else {
        // Fallback: use address as module address
        functionPath = `${contractAddress}::${functionName}`;
      }

      console.log('[Aptos] Sending transaction:', {
        function: functionPath,
        typeArguments,
        functionArguments: functionArgs,
      });

      // Build transaction
      const transaction = await aptos.transaction.build.simple({
        sender: account.accountAddress,
        data: {
          function: functionPath as `${string}::${string}::${string}`,
          typeArguments: typeArguments as [],
          functionArguments: functionArgs as string[],
        },
      });

      // Sign and submit
      const pendingTx = await aptos.signAndSubmitTransaction({
        signer: account,
        transaction,
      });

      // Wait for confirmation
      const committedTx = await aptos.waitForTransaction({
        transactionHash: pendingTx.hash,
      });

      // Calculate fee from gas_used and gas_unit_price
      const gasUsed = (committedTx as { gas_used?: string }).gas_used;
      const gasUnitPrice = (committedTx as { gas_unit_price?: string }).gas_unit_price;
      const fee = gasUsed && gasUnitPrice
        ? String(Number(gasUsed) * Number(gasUnitPrice))
        : undefined;

      return {
        success: true,
        txHash: pendingTx.hash,
        blockNumber: Number((committedTx as { version?: string }).version || 0),
        gasUsed: String(gasUsed || '0'),
        gasPrice: gasUnitPrice,
        fee,
      };
    } catch (error) {
      console.error('[Aptos sendTransaction] Error:', error);
      return { success: false, error: (error as Error).message };
    }
  },

  isValidAddress(address: string): boolean {
    // Aptos addresses are 64 hex characters (32 bytes) with optional 0x prefix
    const cleanAddress = address.startsWith('0x') ? address.slice(2) : address;
    return /^[a-fA-F0-9]{1,64}$/.test(cleanAddress);
  },

  async getBalance(rpcUrl: string, address: string, nativeSymbol: string): Promise<WalletBalance> {
    try {
      const config = new AptosConfig({ network: getNetworkFromRPC(rpcUrl) });
      const aptos = new Aptos(config);

      // Get account resources to find APT balance
      const balance = await aptos.getAccountAPTAmount({
        accountAddress: address
      })

      return {
        native: balance.toString(),
        nativeFormatted: (balance / OCTAS_PER_APT).toFixed(8),
        nativeDecimals: 8,
        nativeSymbol,
      };
    } catch (error) {
      console.error('Failed to fetch Aptos balance:', error);
      return {
        native: '0',
        nativeFormatted: '0',
        nativeDecimals: 8,
        nativeSymbol,
      };
    }
  },

  async getTransactionHistory(
    rpcUrl: string,
    address: string,
    _blockExplorerApiUrl?: string
  ): Promise<WalletTransaction[]> {
    try {
      const config = new AptosConfig({ network: getNetworkFromRPC(rpcUrl) });
      const aptos = new Aptos(config);

      // Get recent transactions for the account
      const transactions = await aptos.getAccountTransactions({
        accountAddress: address,
        options: { limit: 20 },
      });

      // Convert to WalletTransaction format
      const results: WalletTransaction[] = [];

      for (let index = 0; index < transactions.length; index++) {
        const tx = transactions[index];

        // Type guard for committed transactions
        if ('timestamp' in tx && 'version' in tx) {
          const committedTx = tx as {
            hash: string;
            timestamp: string;
            version: string;
            success: boolean;
            gas_used: string;
            gas_unit_price?: string;
          };

          results.push({
            id: `apt-tx-${index}-${committedTx.hash.slice(0, 8)}`,
            walletId: '', // Will be set by the caller
            txHash: committedTx.version,
            type: 'contract_call' as const,
            from: address,
            to: undefined,
            value: '0',
            timestamp: new Date(Number(committedTx.timestamp) / 1000).toISOString(),
            status: committedTx.success ? ('success' as const) : ('failed' as const),
            blockNumber: Number(committedTx.version),
            gasUsed: Number(committedTx.gas_used),
            fee: committedTx.gas_unit_price
              ? String(Number(committedTx.gas_used) * Number(committedTx.gas_unit_price))
              : undefined,
          });
        } else {
          // Pending transaction - use basic info
          results.push({
            id: `apt-tx-${index}-${tx.hash.slice(0, 8)}`,
            walletId: '',
            txHash: tx.hash,
            type: 'contract_call' as const,
            from: address,
            to: undefined,
            value: '0',
            timestamp: new Date().toISOString(),
            status: 'pending' as const,
          });
        }
      }

      return results;
    } catch (error) {
      console.error('Failed to fetch Aptos transaction history:', error);
      return [];
    }
  },
};
