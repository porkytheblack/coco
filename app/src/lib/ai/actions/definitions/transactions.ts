/**
 * Transaction Actions
 *
 * Actions for managing and executing transactions in workspaces.
 */

import type { RegisteredAction, ActionResult } from '../types';
import { useWorkspaceStore, useChainStore, useWalletStore } from '@/stores';

export const transactionActions: RegisteredAction[] = [
  {
    definition: {
      id: 'list_transactions',
      name: 'List Transactions',
      description: 'Get all saved transactions in the current workspace',
      category: 'transactions',
      parameters: [],
      returns: 'List of transactions with id, name, and function',
      tags: ['transactions', 'list'],
    },
    execute: async (): Promise<ActionResult> => {
      const { transactions, currentWorkspace, contracts } = useWorkspaceStore.getState();

      if (!currentWorkspace) {
        return {
          success: false,
          message: 'No workspace currently active',
          error: 'No active workspace',
        };
      }

      const txList = transactions.map(t => {
        const contract = contracts.find(c => c.id === t.contractId);
        return {
          id: t.id,
          name: t.name,
          functionName: t.functionName,
          contractName: contract?.name || 'Unknown',
          contractAddress: contract?.address,
        };
      });

      return {
        success: true,
        message: `Found ${txList.length} transaction(s)`,
        data: txList,
      };
    },
  },
  {
    definition: {
      id: 'create_transaction',
      name: 'Create Transaction',
      description: 'Create a new saved transaction for a contract function',
      category: 'transactions',
      parameters: [
        { name: 'name', type: 'string', description: 'Display name for the transaction', required: true },
        { name: 'contractId', type: 'string', description: 'Contract ID', required: true },
        { name: 'functionName', type: 'string', description: 'Function name to call', required: true },
      ],
      returns: 'The created transaction object',
      tags: ['transactions', 'create', 'new'],
    },
    execute: async (params): Promise<ActionResult> => {
      const { createTransaction, contracts, currentWorkspace } = useWorkspaceStore.getState();

      if (!currentWorkspace) {
        return {
          success: false,
          message: 'No workspace currently active',
          error: 'No active workspace',
        };
      }

      const contract = contracts.find(c => c.id === params.contractId);
      if (!contract) {
        return {
          success: false,
          message: `Contract "${params.contractId}" not found`,
          error: 'Contract not found',
        };
      }

      const func = contract.functions?.find(f => f.name === params.functionName);
      if (!func) {
        return {
          success: false,
          message: `Function "${params.functionName}" not found on contract "${contract.name}"`,
          error: 'Function not found',
        };
      }

      try {
        await createTransaction(
          params.name as string,
          params.contractId as string,
          params.functionName as string
        );
        return {
          success: true,
          message: `Transaction "${params.name}" created for ${contract.name}.${params.functionName}`,
          data: {
            name: params.name,
            contractName: contract.name,
            functionName: params.functionName,
          },
        };
      } catch (error) {
        return {
          success: false,
          message: `Failed to create transaction: ${error instanceof Error ? error.message : 'Unknown error'}`,
          error: String(error),
        };
      }
    },
  },
  {
    definition: {
      id: 'execute_transaction',
      name: 'Execute Transaction',
      description: 'Execute a saved transaction with specified parameters',
      category: 'transactions',
      parameters: [
        { name: 'transactionId', type: 'string', description: 'Transaction ID to execute', required: true },
        { name: 'params', type: 'object', description: 'Function parameters as key-value pairs', required: false },
        { name: 'walletId', type: 'string', description: 'Wallet ID to use (uses first wallet if not specified)', required: false },
      ],
      returns: 'Transaction result with hash and status',
      requiresConfirmation: true,
      tags: ['transactions', 'execute', 'run', 'call'],
    },
    execute: async (params): Promise<ActionResult> => {
      const { transactions, executeTransaction } = useWorkspaceStore.getState();
      const { selectedChain } = useChainStore.getState();
      const { wallets } = useWalletStore.getState();

      const tx = transactions.find(t => t.id === params.transactionId);
      if (!tx) {
        return {
          success: false,
          message: `Transaction "${params.transactionId}" not found`,
          error: 'Transaction not found',
        };
      }

      const walletId = (params.walletId as string) || wallets[0]?.id;
      if (!walletId) {
        return {
          success: false,
          message: 'No wallet available',
          error: 'Wallet required',
        };
      }

      try {
        const result = await executeTransaction(
          params.transactionId as string,
          (params.params as Record<string, string>) || {},
          walletId,
          selectedChain ? { chain: selectedChain } : undefined
        );

        if (result.status === 'success') {
          return {
            success: true,
            message: `Transaction executed successfully. Hash: ${result.txHash}`,
            data: {
              txHash: result.txHash,
              status: result.status,
              result: result.result,
            },
          };
        } else {
          return {
            success: false,
            message: `Transaction failed: ${result.errorMessage || 'Unknown error'}`,
            error: result.errorMessage,
          };
        }
      } catch (error) {
        return {
          success: false,
          message: `Failed to execute transaction: ${error instanceof Error ? error.message : 'Unknown error'}`,
          error: String(error),
        };
      }
    },
  },
  {
    definition: {
      id: 'delete_transaction',
      name: 'Delete Transaction',
      description: 'Delete a saved transaction',
      category: 'transactions',
      parameters: [
        { name: 'transactionId', type: 'string', description: 'The transaction ID to delete', required: true },
      ],
      returns: 'Success confirmation',
      requiresConfirmation: true,
      tags: ['transactions', 'delete', 'remove'],
    },
    execute: async (params): Promise<ActionResult> => {
      const { transactions, deleteTransaction } = useWorkspaceStore.getState();
      const tx = transactions.find(t => t.id === params.transactionId);

      if (!tx) {
        return {
          success: false,
          message: `Transaction "${params.transactionId}" not found`,
          error: 'Transaction not found',
        };
      }

      try {
        await deleteTransaction(params.transactionId as string);
        return {
          success: true,
          message: `Transaction "${tx.name}" deleted successfully`,
        };
      } catch (error) {
        return {
          success: false,
          message: `Failed to delete transaction: ${error instanceof Error ? error.message : 'Unknown error'}`,
          error: String(error),
        };
      }
    },
  },
];
