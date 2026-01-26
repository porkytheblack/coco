/**
 * Workspace Actions
 *
 * Actions for managing workspaces in the app.
 */

import type { RegisteredAction, ActionResult } from '../types';
import { useWorkspaceStore } from '@/stores';

export const workspaceActions: RegisteredAction[] = [
  {
    definition: {
      id: 'list_workspaces',
      name: 'List Workspaces',
      description: 'Get all workspaces for a specific chain',
      category: 'workspaces',
      parameters: [
        { name: 'chainId', type: 'string', description: 'Chain ID to list workspaces for', required: true },
      ],
      returns: 'List of workspaces with id, name, and contract count',
      tags: ['workspaces', 'list', 'projects'],
    },
    execute: async (params): Promise<ActionResult> => {
      const { loadWorkspaces, workspaces } = useWorkspaceStore.getState();
      await loadWorkspaces(params.chainId as string);

      const workspaceList = workspaces.map(w => ({
        id: w.id,
        name: w.name,
        chainId: w.chainId,
      }));

      return {
        success: true,
        message: `Found ${workspaceList.length} workspace(s)`,
        data: workspaceList,
      };
    },
  },
  {
    definition: {
      id: 'create_workspace',
      name: 'Create Workspace',
      description: 'Create a new workspace for a chain',
      category: 'workspaces',
      parameters: [
        { name: 'name', type: 'string', description: 'Name for the workspace', required: true },
        { name: 'chainId', type: 'string', description: 'Chain ID to create workspace on', required: true },
      ],
      returns: 'The created workspace object',
      tags: ['workspaces', 'create', 'new', 'project'],
    },
    execute: async (params): Promise<ActionResult> => {
      const { createWorkspace } = useWorkspaceStore.getState();
      try {
        const workspace = await createWorkspace({
          name: params.name as string,
          chainId: params.chainId as string,
        });
        return {
          success: true,
          message: `Workspace "${params.name}" created successfully`,
          data: {
            id: workspace.id,
            name: workspace.name,
            chainId: workspace.chainId,
          },
        };
      } catch (error) {
        return {
          success: false,
          message: `Failed to create workspace: ${error instanceof Error ? error.message : 'Unknown error'}`,
          error: String(error),
        };
      }
    },
  },
  {
    definition: {
      id: 'get_current_workspace',
      name: 'Get Current Workspace',
      description: 'Get information about the currently active workspace',
      category: 'workspaces',
      parameters: [],
      returns: 'Current workspace with contracts and transactions',
      tags: ['workspaces', 'current', 'active'],
    },
    execute: async (): Promise<ActionResult> => {
      const { currentWorkspace, contracts, transactions } = useWorkspaceStore.getState();

      if (!currentWorkspace) {
        return {
          success: false,
          message: 'No workspace currently active',
          error: 'No active workspace',
        };
      }

      return {
        success: true,
        message: `Current workspace: ${currentWorkspace.name}`,
        data: {
          workspace: {
            id: currentWorkspace.id,
            name: currentWorkspace.name,
            chainId: currentWorkspace.chainId,
          },
          contractCount: contracts.length,
          transactionCount: transactions.length,
          contracts: contracts.map(c => ({ id: c.id, name: c.name, address: c.address })),
          transactions: transactions.map(t => ({ id: t.id, name: t.name, functionName: t.functionName })),
        },
      };
    },
  },
  {
    definition: {
      id: 'delete_workspace',
      name: 'Delete Workspace',
      description: 'Delete a workspace and all its contents',
      category: 'workspaces',
      parameters: [
        { name: 'workspaceId', type: 'string', description: 'The workspace ID to delete', required: true },
      ],
      returns: 'Success confirmation',
      requiresConfirmation: true,
      tags: ['workspaces', 'delete', 'remove'],
    },
    execute: async (params): Promise<ActionResult> => {
      const { workspaces, deleteWorkspace } = useWorkspaceStore.getState();
      const workspace = workspaces.find(w => w.id === params.workspaceId);

      if (!workspace) {
        return {
          success: false,
          message: `Workspace "${params.workspaceId}" not found`,
          error: 'Workspace not found',
        };
      }

      try {
        await deleteWorkspace(params.workspaceId as string);
        return {
          success: true,
          message: `Workspace "${workspace.name}" deleted successfully`,
        };
      } catch (error) {
        return {
          success: false,
          message: `Failed to delete workspace: ${error instanceof Error ? error.message : 'Unknown error'}`,
          error: String(error),
        };
      }
    },
  },
];
