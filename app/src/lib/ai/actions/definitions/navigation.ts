/**
 * Navigation Actions
 *
 * Actions for navigating within the app.
 * Note: These actions suggest navigation but actual navigation
 * needs to be handled by the UI layer.
 */

import type { RegisteredAction, ActionResult } from '../types';
import { useChainStore, useWorkspaceStore } from '@/stores';

export const navigationActions: RegisteredAction[] = [
  {
    definition: {
      id: 'navigate_to_chain',
      name: 'Navigate to Chain',
      description: 'Navigate to a specific blockchain chain dashboard',
      category: 'navigation',
      parameters: [
        { name: 'chainId', type: 'string', description: 'Chain ID to navigate to', required: true },
      ],
      returns: 'Navigation instruction',
      tags: ['navigation', 'chain', 'go'],
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
        message: `Navigate to chain: ${chain.name}`,
        data: {
          type: 'navigation',
          view: 'chain-dashboard',
          chainId: chain.id,
          chainName: chain.name,
        },
      };
    },
  },
  {
    definition: {
      id: 'navigate_to_workspace',
      name: 'Navigate to Workspace',
      description: 'Navigate to a specific workspace',
      category: 'navigation',
      parameters: [
        { name: 'workspaceId', type: 'string', description: 'Workspace ID to navigate to', required: true },
        { name: 'chainId', type: 'string', description: 'Chain ID (required for navigation)', required: true },
      ],
      returns: 'Navigation instruction',
      tags: ['navigation', 'workspace', 'go'],
    },
    execute: async (params): Promise<ActionResult> => {
      const { workspaces } = useWorkspaceStore.getState();
      const workspace = workspaces.find(w => w.id === params.workspaceId);

      if (!workspace) {
        return {
          success: false,
          message: `Workspace "${params.workspaceId}" not found`,
          error: 'Workspace not found',
        };
      }

      return {
        success: true,
        message: `Navigate to workspace: ${workspace.name}`,
        data: {
          type: 'navigation',
          view: 'workspace',
          workspaceId: workspace.id,
          chainId: params.chainId,
          workspaceName: workspace.name,
        },
      };
    },
  },
  {
    definition: {
      id: 'navigate_home',
      name: 'Navigate Home',
      description: 'Navigate to the home/chains selection screen',
      category: 'navigation',
      parameters: [],
      returns: 'Navigation instruction',
      tags: ['navigation', 'home', 'chains'],
    },
    execute: async (): Promise<ActionResult> => {
      return {
        success: true,
        message: 'Navigate to home screen',
        data: {
          type: 'navigation',
          view: 'chains',
        },
      };
    },
  },
];
