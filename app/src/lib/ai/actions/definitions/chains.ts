/**
 * Chain Actions
 *
 * Actions for managing blockchain chains/networks in the app.
 */

import type { RegisteredAction, ActionResult, ActionContext } from '../types';
import { useChainStore } from '@/stores';

export const chainActions: RegisteredAction[] = [
  {
    definition: {
      id: 'list_chains',
      name: 'List Chains',
      description: 'Get all activated blockchain chains/networks',
      category: 'chains',
      parameters: [],
      returns: 'List of chains with their id, name, ecosystem, and network type',
      tags: ['chains', 'networks', 'list'],
    },
    execute: async (): Promise<ActionResult> => {
      const { chains } = useChainStore.getState();
      const chainList = chains.map(c => ({
        id: c.id,
        name: c.name,
        ecosystem: c.ecosystem,
        networkType: c.networkType,
        rpcUrl: c.rpcUrl,
      }));
      return {
        success: true,
        message: `Found ${chainList.length} chain(s)`,
        data: chainList,
      };
    },
  },
  {
    definition: {
      id: 'add_chain',
      name: 'Add Chain',
      description: 'Add a new blockchain chain/network to the app',
      category: 'chains',
      parameters: [
        { name: 'name', type: 'string', description: 'Display name for the chain', required: true },
        { name: 'ecosystem', type: 'enum', description: 'Blockchain ecosystem', required: true, enum: ['evm', 'solana', 'aptos'] },
        { name: 'rpcUrl', type: 'string', description: 'RPC endpoint URL', required: true },
        { name: 'chainIdNumeric', type: 'number', description: 'Chain ID (for EVM chains)', required: false },
        { name: 'currencySymbol', type: 'string', description: 'Native currency symbol (e.g., ETH)', required: false },
        { name: 'blockExplorerUrl', type: 'string', description: 'Block explorer URL', required: false },
        { name: 'networkType', type: 'enum', description: 'Network type', required: false, enum: ['mainnet', 'testnet', 'devnet', 'localnet'] },
      ],
      returns: 'The created chain object',
      requiresConfirmation: true,
      tags: ['chains', 'add', 'create', 'network'],
      examples: [
        'Add Ethereum Sepolia testnet',
        'Add a custom EVM chain with RPC URL',
      ],
    },
    execute: async (params): Promise<ActionResult> => {
      const { addChain } = useChainStore.getState();
      const ecosystem = params.ecosystem as 'evm' | 'solana' | 'aptos';
      try {
        const chain = await addChain({
          id: `custom-${Date.now()}`,
          name: params.name as string,
          ecosystem,
          rpcUrl: params.rpcUrl as string,
          chainIdNumeric: params.chainIdNumeric as number | undefined,
          currencySymbol: (params.currencySymbol as string) || (ecosystem === 'evm' ? 'ETH' : ecosystem === 'solana' ? 'SOL' : 'APT'),
          blockExplorerUrl: params.blockExplorerUrl as string | undefined,
          blockchain: ecosystem, // Use ecosystem as blockchain identifier for custom chains
          networkType: (params.networkType as 'mainnet' | 'testnet' | 'devnet' | 'localnet') || 'testnet',
          isCustom: true,
        });
        return {
          success: true,
          message: `Chain "${params.name}" added successfully`,
          data: chain,
        };
      } catch (error) {
        return {
          success: false,
          message: `Failed to add chain: ${error instanceof Error ? error.message : 'Unknown error'}`,
          error: String(error),
        };
      }
    },
  },
  {
    definition: {
      id: 'get_chain_info',
      name: 'Get Chain Info',
      description: 'Get detailed information about a specific chain',
      category: 'chains',
      parameters: [
        { name: 'chainId', type: 'string', description: 'The chain ID to get info for', required: true },
      ],
      returns: 'Detailed chain information including RPC, explorer, etc.',
      tags: ['chains', 'info', 'details'],
    },
    execute: async (params): Promise<ActionResult> => {
      const { chains } = useChainStore.getState();
      const chain = chains.find(c => c.id === params.chainId);
      if (!chain) {
        return {
          success: false,
          message: `Chain "${params.chainId}" not found`,
          error: 'Chain not found',
        };
      }
      return {
        success: true,
        message: `Found chain: ${chain.name}`,
        data: chain,
      };
    },
  },
  {
    definition: {
      id: 'delete_chain',
      name: 'Delete Chain',
      description: 'Remove a blockchain chain from the app',
      category: 'chains',
      parameters: [
        { name: 'chainId', type: 'string', description: 'The chain ID to delete', required: true },
      ],
      returns: 'Success confirmation',
      requiresConfirmation: true,
      tags: ['chains', 'delete', 'remove'],
    },
    execute: async (params): Promise<ActionResult> => {
      const { deleteChain, chains } = useChainStore.getState();
      const chain = chains.find(c => c.id === params.chainId);
      if (!chain) {
        return {
          success: false,
          message: `Chain "${params.chainId}" not found`,
          error: 'Chain not found',
        };
      }
      try {
        await deleteChain(params.chainId as string);
        return {
          success: true,
          message: `Chain "${chain.name}" deleted successfully`,
        };
      } catch (error) {
        return {
          success: false,
          message: `Failed to delete chain: ${error instanceof Error ? error.message : 'Unknown error'}`,
          error: String(error),
        };
      }
    },
  },
];
