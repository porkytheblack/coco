/**
 * Contract Actions
 *
 * Actions for managing smart contracts in workspaces.
 */

import type { RegisteredAction, ActionResult } from '../types';
import { useWorkspaceStore, useChainStore } from '@/stores';

export const contractActions: RegisteredAction[] = [
  {
    definition: {
      id: 'list_contracts',
      name: 'List Contracts',
      description: 'Get all contracts in the current workspace',
      category: 'contracts',
      parameters: [],
      returns: 'List of contracts with id, name, address, and function count',
      tags: ['contracts', 'list', 'smart contracts'],
    },
    execute: async (): Promise<ActionResult> => {
      const { contracts, currentWorkspace } = useWorkspaceStore.getState();

      if (!currentWorkspace) {
        return {
          success: false,
          message: 'No workspace currently active',
          error: 'No active workspace',
        };
      }

      const contractList = contracts.map(c => ({
        id: c.id,
        name: c.name,
        address: c.address,
        interfaceType: c.interfaceType,
        functionCount: c.functions?.length || 0,
      }));

      return {
        success: true,
        message: `Found ${contractList.length} contract(s) in "${currentWorkspace.name}"`,
        data: contractList,
      };
    },
  },
  {
    definition: {
      id: 'get_contract_functions',
      name: 'Get Contract Functions',
      description: 'Get all functions available on a contract',
      category: 'contracts',
      parameters: [
        { name: 'contractId', type: 'string', description: 'The contract ID', required: true },
      ],
      returns: 'List of functions with name, inputs, and outputs',
      tags: ['contracts', 'functions', 'abi', 'methods'],
    },
    execute: async (params): Promise<ActionResult> => {
      const { contracts } = useWorkspaceStore.getState();
      const contract = contracts.find(c => c.id === params.contractId);

      if (!contract) {
        return {
          success: false,
          message: `Contract "${params.contractId}" not found`,
          error: 'Contract not found',
        };
      }

      const functions = contract.functions?.map(f => ({
        name: f.name,
        inputs: f.inputs,
        outputs: f.outputs,
        stateMutability: f.stateMutability,
        isView: f.stateMutability === 'view' || f.stateMutability === 'pure',
      })) || [];

      return {
        success: true,
        message: `Found ${functions.length} function(s) on "${contract.name}"`,
        data: {
          contractName: contract.name,
          contractAddress: contract.address,
          functions,
        },
      };
    },
  },
  {
    definition: {
      id: 'add_contract',
      name: 'Add Contract',
      description: 'Add a smart contract to the current workspace',
      category: 'contracts',
      parameters: [
        { name: 'name', type: 'string', description: 'Display name for the contract', required: true },
        { name: 'address', type: 'string', description: 'Contract address', required: true },
        { name: 'abi', type: 'string', description: 'Contract ABI (JSON string) or Move source code', required: false },
        { name: 'interfaceType', type: 'enum', description: 'Interface type', required: false, enum: ['abi', 'move'] },
      ],
      returns: 'The created contract object',
      tags: ['contracts', 'add', 'create', 'deploy'],
    },
    execute: async (params): Promise<ActionResult> => {
      const { addContract, currentWorkspace } = useWorkspaceStore.getState();
      const { selectedChain } = useChainStore.getState();

      if (!currentWorkspace) {
        return {
          success: false,
          message: 'No workspace currently active',
          error: 'No active workspace',
        };
      }

      try {
        // Parse ABI if provided
        let parsedAbi: object[] | undefined;
        if (params.abi) {
          try {
            parsedAbi = JSON.parse(params.abi as string);
          } catch {
            // If not valid JSON, it might be Move source code
          }
        }

        await addContract({
          name: params.name as string,
          address: params.address as string,
          interfaceType: (params.interfaceType as 'abi' | 'move') || (selectedChain?.ecosystem === 'aptos' ? 'move' : 'abi'),
          abi: parsedAbi,
          workspaceId: currentWorkspace.id,
        });

        return {
          success: true,
          message: `Contract "${params.name}" added successfully`,
          data: {
            name: params.name,
            address: params.address,
          },
        };
      } catch (error) {
        return {
          success: false,
          message: `Failed to add contract: ${error instanceof Error ? error.message : 'Unknown error'}`,
          error: String(error),
        };
      }
    },
  },
  {
    definition: {
      id: 'delete_contract',
      name: 'Delete Contract',
      description: 'Remove a contract from the workspace',
      category: 'contracts',
      parameters: [
        { name: 'contractId', type: 'string', description: 'The contract ID to delete', required: true },
      ],
      returns: 'Success confirmation',
      requiresConfirmation: true,
      tags: ['contracts', 'delete', 'remove'],
    },
    execute: async (params): Promise<ActionResult> => {
      const { contracts, deleteContract } = useWorkspaceStore.getState();
      const contract = contracts.find(c => c.id === params.contractId);

      if (!contract) {
        return {
          success: false,
          message: `Contract "${params.contractId}" not found`,
          error: 'Contract not found',
        };
      }

      try {
        await deleteContract(params.contractId as string);
        return {
          success: true,
          message: `Contract "${contract.name}" deleted successfully`,
        };
      } catch (error) {
        return {
          success: false,
          message: `Failed to delete contract: ${error instanceof Error ? error.message : 'Unknown error'}`,
          error: String(error),
        };
      }
    },
  },
];
