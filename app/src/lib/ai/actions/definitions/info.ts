/**
 * Information Actions
 *
 * Actions for getting information about the app state.
 */

import type { RegisteredAction, ActionResult } from '../types';
import { useChainStore, useWalletStore, useWorkspaceStore, useActionTrackingStore } from '@/stores';

export const infoActions: RegisteredAction[] = [
  {
    definition: {
      id: 'get_app_state',
      name: 'Get App State',
      description: 'Get a summary of the current app state',
      category: 'info',
      parameters: [],
      returns: 'Current chain, workspace, wallet, and counts',
      tags: ['info', 'state', 'summary', 'context'],
    },
    execute: async (): Promise<ActionResult> => {
      const { chains, selectedChain } = useChainStore.getState();
      const { wallets, selectedWallet } = useWalletStore.getState();
      const { currentWorkspace, contracts, transactions } = useWorkspaceStore.getState();

      return {
        success: true,
        message: 'Current app state',
        data: {
          totalChains: chains.length,
          currentChain: selectedChain ? {
            id: selectedChain.id,
            name: selectedChain.name,
            ecosystem: selectedChain.ecosystem,
          } : null,
          totalWallets: wallets.length,
          currentWallet: selectedWallet ? {
            id: selectedWallet.id,
            name: selectedWallet.name,
            address: selectedWallet.address,
          } : null,
          currentWorkspace: currentWorkspace ? {
            id: currentWorkspace.id,
            name: currentWorkspace.name,
            contractCount: contracts.length,
            transactionCount: transactions.length,
          } : null,
        },
      };
    },
  },
  {
    definition: {
      id: 'get_recent_activity',
      name: 'Get Recent Activity',
      description: 'Get recent user actions and activity in the app',
      category: 'info',
      parameters: [
        { name: 'limit', type: 'number', description: 'Number of recent actions to return (default 10)', required: false },
      ],
      returns: 'List of recent actions',
      tags: ['info', 'activity', 'history', 'actions'],
    },
    execute: async (params): Promise<ActionResult> => {
      const { getRecentActions } = useActionTrackingStore.getState();
      const limit = (params.limit as number) || 10;
      const actions = getRecentActions(limit);

      return {
        success: true,
        message: `Found ${actions.length} recent action(s)`,
        data: actions.map(a => ({
          type: a.type,
          summary: a.summary,
          timestamp: a.timestamp,
          success: a.result?.success,
        })),
      };
    },
  },
  {
    definition: {
      id: 'search_actions',
      name: 'Search Available Actions',
      description: 'Search for available AI actions by keyword',
      category: 'info',
      parameters: [
        { name: 'query', type: 'string', description: 'Search query', required: true },
      ],
      returns: 'List of matching actions',
      tags: ['info', 'search', 'help', 'actions'],
    },
    execute: async (params): Promise<ActionResult> => {
      // This will be implemented by the registry
      return {
        success: true,
        message: `Search for actions matching "${params.query}"`,
        data: {
          query: params.query,
          note: 'Use the action registry to search for available actions',
        },
      };
    },
  },
  {
    definition: {
      id: 'explain_ecosystem',
      name: 'Explain Ecosystem',
      description: 'Get information about a blockchain ecosystem',
      category: 'info',
      parameters: [
        { name: 'ecosystem', type: 'enum', description: 'Ecosystem to explain', required: true, enum: ['evm', 'solana', 'aptos'] },
      ],
      returns: 'Ecosystem information and key concepts',
      tags: ['info', 'ecosystem', 'help', 'learn'],
    },
    execute: async (params): Promise<ActionResult> => {
      const ecosystem = params.ecosystem as string;

      const ecosystemInfo: Record<string, { description: string; keyFeatures: string[]; contractLanguage: string }> = {
        evm: {
          description: 'Ethereum Virtual Machine - the runtime for Ethereum and compatible chains like Polygon, BSC, Arbitrum',
          keyFeatures: [
            'Smart contracts written in Solidity',
            'Uses ABI for contract interfaces',
            'Gas-based transaction fees',
            'Account-based model',
          ],
          contractLanguage: 'Solidity',
        },
        solana: {
          description: 'High-performance blockchain with parallel transaction processing',
          keyFeatures: [
            'Programs written in Rust',
            'Uses IDL for program interfaces',
            'Low transaction fees',
            'Account-based model with unique ownership',
          ],
          contractLanguage: 'Rust',
        },
        aptos: {
          description: 'Layer 1 blockchain using Move language for safe smart contracts',
          keyFeatures: [
            'Contracts written in Move',
            'Resource-oriented programming',
            'Entry functions and view functions',
            'Strong type safety and asset handling',
          ],
          contractLanguage: 'Move',
        },
      };

      const info = ecosystemInfo[ecosystem];
      if (!info) {
        return {
          success: false,
          message: `Unknown ecosystem: ${ecosystem}`,
          error: 'Invalid ecosystem',
        };
      }

      return {
        success: true,
        message: `Information about ${ecosystem.toUpperCase()}`,
        data: {
          ecosystem,
          ...info,
        },
      };
    },
  },
];
