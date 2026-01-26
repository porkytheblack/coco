import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// ============================================================================
// Types
// ============================================================================

export type ActionType =
  | 'transaction_execute'
  | 'transaction_create'
  | 'contract_add'
  | 'contract_update'
  | 'contract_delete'
  | 'script_run'
  | 'script_create'
  | 'workflow_run'
  | 'workflow_create'
  | 'wallet_create'
  | 'wallet_send'
  | 'env_var_add'
  | 'workspace_create'
  | 'chain_add'
  | 'navigation'
  | 'error'
  | 'custom';

export interface TrackedAction {
  id: string;
  type: ActionType;
  timestamp: string;
  // Context about what happened
  summary: string;
  // Detailed information
  details?: Record<string, unknown>;
  // Result or outcome
  result?: {
    success: boolean;
    message?: string;
    data?: unknown;
  };
  // Related entity IDs
  entityIds?: {
    workspaceId?: string;
    chainId?: string;
    contractId?: string;
    transactionId?: string;
    walletId?: string;
    scriptId?: string;
    workflowId?: string;
  };
  // Tags for filtering
  tags?: string[];
}

interface ActionTrackingState {
  actions: TrackedAction[];
  maxActions: number;
  isEnabled: boolean;

  // Actions
  trackAction: (action: Omit<TrackedAction, 'id' | 'timestamp'>) => void;
  clearActions: () => void;
  setEnabled: (enabled: boolean) => void;
  getRecentActions: (limit?: number) => TrackedAction[];
  getActionsForContext: (context?: {
    workspaceId?: string;
    chainId?: string;
    types?: ActionType[];
  }) => TrackedAction[];
  getActionSummary: () => string;
}

// ============================================================================
// Store
// ============================================================================

const MAX_ACTIONS = 100;

export const useActionTrackingStore = create<ActionTrackingState>()(
  persist(
    (set, get) => ({
      actions: [],
      maxActions: MAX_ACTIONS,
      isEnabled: true,

      trackAction: (action) => {
        if (!get().isEnabled) return;

        const newAction: TrackedAction = {
          ...action,
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
        };

        set((state) => ({
          actions: [newAction, ...state.actions].slice(0, state.maxActions),
        }));
      },

      clearActions: () => set({ actions: [] }),

      setEnabled: (enabled) => set({ isEnabled: enabled }),

      getRecentActions: (limit = 20) => {
        return get().actions.slice(0, limit);
      },

      getActionsForContext: (context) => {
        const { actions } = get();
        let filtered = actions;

        if (context?.workspaceId) {
          filtered = filtered.filter(
            (a) => a.entityIds?.workspaceId === context.workspaceId
          );
        }

        if (context?.chainId) {
          filtered = filtered.filter(
            (a) => a.entityIds?.chainId === context.chainId
          );
        }

        if (context?.types && context.types.length > 0) {
          filtered = filtered.filter((a) => context.types!.includes(a.type));
        }

        return filtered.slice(0, 50);
      },

      getActionSummary: () => {
        const actions = get().getRecentActions(20);
        if (actions.length === 0) {
          return 'No recent actions recorded.';
        }

        const lines = actions.map((action) => {
          const time = new Date(action.timestamp).toLocaleTimeString();
          const result = action.result
            ? action.result.success
              ? '✓'
              : '✗'
            : '';
          return `[${time}] ${result} ${action.summary}`;
        });

        return `Recent user actions:\n${lines.join('\n')}`;
      },
    }),
    {
      name: 'coco-action-tracking',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        actions: state.actions.slice(0, 50), // Only persist last 50
        isEnabled: state.isEnabled,
      }),
    }
  )
);

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Track a transaction execution
 */
export function trackTransactionExecution(params: {
  transactionName: string;
  functionName: string;
  contractName?: string;
  success: boolean;
  txHash?: string;
  error?: string;
  workspaceId?: string;
  chainId?: string;
  transactionId?: string;
  contractId?: string;
}) {
  useActionTrackingStore.getState().trackAction({
    type: 'transaction_execute',
    summary: params.success
      ? `Executed transaction "${params.transactionName}" (${params.functionName}) - TX: ${params.txHash?.slice(0, 10)}...`
      : `Failed to execute "${params.transactionName}": ${params.error}`,
    details: {
      transactionName: params.transactionName,
      functionName: params.functionName,
      contractName: params.contractName,
    },
    result: {
      success: params.success,
      message: params.error,
      data: { txHash: params.txHash },
    },
    entityIds: {
      workspaceId: params.workspaceId,
      chainId: params.chainId,
      transactionId: params.transactionId,
      contractId: params.contractId,
    },
    tags: ['blockchain', params.success ? 'success' : 'error'],
  });
}

/**
 * Track a script run
 */
export function trackScriptRun(params: {
  scriptName: string;
  success: boolean;
  output?: string;
  error?: string;
  workspaceId?: string;
  scriptId?: string;
}) {
  useActionTrackingStore.getState().trackAction({
    type: 'script_run',
    summary: params.success
      ? `Ran script "${params.scriptName}" successfully`
      : `Script "${params.scriptName}" failed: ${params.error}`,
    details: {
      scriptName: params.scriptName,
      outputPreview: params.output?.slice(0, 200),
    },
    result: {
      success: params.success,
      message: params.error,
    },
    entityIds: {
      workspaceId: params.workspaceId,
      scriptId: params.scriptId,
    },
    tags: ['script', params.success ? 'success' : 'error'],
  });
}

/**
 * Track a workflow run
 */
export function trackWorkflowRun(params: {
  workflowName: string;
  status: string;
  stepsCompleted?: number;
  totalSteps?: number;
  error?: string;
  workspaceId?: string;
  workflowId?: string;
}) {
  const success = params.status === 'completed';
  useActionTrackingStore.getState().trackAction({
    type: 'workflow_run',
    summary: success
      ? `Workflow "${params.workflowName}" completed (${params.stepsCompleted}/${params.totalSteps} steps)`
      : `Workflow "${params.workflowName}" ${params.status}: ${params.error || ''}`,
    details: {
      workflowName: params.workflowName,
      status: params.status,
      stepsCompleted: params.stepsCompleted,
      totalSteps: params.totalSteps,
    },
    result: {
      success,
      message: params.error,
    },
    entityIds: {
      workspaceId: params.workspaceId,
      workflowId: params.workflowId,
    },
    tags: ['workflow', success ? 'success' : params.status],
  });
}

/**
 * Track a contract operation
 */
export function trackContractOperation(params: {
  operation: 'add' | 'update' | 'delete';
  contractName: string;
  interfaceType?: string;
  workspaceId?: string;
  contractId?: string;
}) {
  const typeMap = {
    add: 'contract_add',
    update: 'contract_update',
    delete: 'contract_delete',
  } as const;

  useActionTrackingStore.getState().trackAction({
    type: typeMap[params.operation],
    summary: `${params.operation === 'add' ? 'Added' : params.operation === 'update' ? 'Updated' : 'Deleted'} contract "${params.contractName}"${params.interfaceType ? ` (${params.interfaceType})` : ''}`,
    details: {
      operation: params.operation,
      contractName: params.contractName,
      interfaceType: params.interfaceType,
    },
    result: { success: true },
    entityIds: {
      workspaceId: params.workspaceId,
      contractId: params.contractId,
    },
    tags: ['contract', params.operation],
  });
}

/**
 * Track a wallet send
 */
export function trackWalletSend(params: {
  walletName: string;
  recipient: string;
  amount: string;
  symbol: string;
  success: boolean;
  txHash?: string;
  error?: string;
  chainId?: string;
  walletId?: string;
}) {
  useActionTrackingStore.getState().trackAction({
    type: 'wallet_send',
    summary: params.success
      ? `Sent ${params.amount} ${params.symbol} to ${params.recipient.slice(0, 8)}...`
      : `Failed to send: ${params.error}`,
    details: {
      walletName: params.walletName,
      recipient: params.recipient,
      amount: params.amount,
      symbol: params.symbol,
    },
    result: {
      success: params.success,
      message: params.error,
      data: { txHash: params.txHash },
    },
    entityIds: {
      chainId: params.chainId,
      walletId: params.walletId,
    },
    tags: ['wallet', 'transfer', params.success ? 'success' : 'error'],
  });
}

/**
 * Track an error
 */
export function trackError(params: {
  context: string;
  error: string;
  details?: Record<string, unknown>;
}) {
  useActionTrackingStore.getState().trackAction({
    type: 'error',
    summary: `Error in ${params.context}: ${params.error}`,
    details: params.details,
    result: {
      success: false,
      message: params.error,
    },
    tags: ['error'],
  });
}

/**
 * Track a navigation event
 */
export function trackNavigation(params: {
  from: string;
  to: string;
  entityIds?: TrackedAction['entityIds'];
}) {
  useActionTrackingStore.getState().trackAction({
    type: 'navigation',
    summary: `Navigated from ${params.from} to ${params.to}`,
    entityIds: params.entityIds,
    tags: ['navigation'],
  });
}
