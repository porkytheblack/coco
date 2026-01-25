import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Query keys for type-safe cache management
export const queryKeys = {
  // Blockchains & Networks
  blockchains: ['blockchains'] as const,
  blockchain: (id: string) => ['blockchains', id] as const,
  networks: (blockchainId: string) => ['networks', blockchainId] as const,
  network: (id: string) => ['networks', 'detail', id] as const,
  allNetworks: ['networks', 'all'] as const,

  // Chains (legacy, for migration)
  chains: ['chains'] as const,
  chain: (id: string) => ['chains', id] as const,

  // Wallets
  wallets: (chainId: string) => ['wallets', chainId] as const,
  wallet: (id: string) => ['wallets', 'detail', id] as const,
  reusableWallets: (blockchain: string, excludeChainId: string) =>
    ['wallets', 'reusable', blockchain, excludeChainId] as const,

  // Workspaces
  workspaces: (chainId: string) => ['workspaces', chainId] as const,
  workspace: (id: string) => ['workspaces', 'detail', id] as const,
  allWorkspaces: ['workspaces', 'all'] as const,

  // Contracts
  contracts: (workspaceId: string) => ['contracts', workspaceId] as const,
  contract: (id: string) => ['contracts', 'detail', id] as const,
  contractDocs: (contractId: string) => ['contract-docs', contractId] as const,
  functionDoc: (contractId: string, functionName: string) =>
    ['contract-docs', contractId, functionName] as const,

  // Transactions
  transactions: (workspaceId: string) => ['transactions', workspaceId] as const,
  transaction: (id: string) => ['transactions', 'detail', id] as const,
  transactionRuns: (transactionId: string) => ['transaction-runs', transactionId] as const,

  // Scripts
  scripts: (workspaceId: string) => ['scripts', workspaceId] as const,
  script: (id: string) => ['scripts', 'detail', id] as const,
  scriptFlags: (scriptId: string) => ['script-flags', scriptId] as const,
  scriptRuns: (scriptId: string) => ['script-runs', scriptId] as const,
  scriptRun: (runId: string) => ['script-runs', 'detail', runId] as const,
  scriptRunLogs: (runId: string) => ['script-runs', 'logs', runId] as const,

  // Environment Variables
  envVars: (workspaceId: string) => ['env-vars', workspaceId] as const,
  envVar: (id: string) => ['env-vars', 'detail', id] as const,

  // Conversations
  conversations: (workspaceId?: string) => ['conversations', workspaceId ?? 'all'] as const,
  conversation: (id: string) => ['conversations', 'detail', id] as const,
  messages: (conversationId: string) => ['messages', conversationId] as const,

  // Preferences
  preferences: ['preferences'] as const,
  preference: (key: string) => ['preferences', key] as const,
  theme: ['preferences', 'theme'] as const,
  aiSettings: ['preferences', 'ai-settings'] as const,
  activeWorkspace: ['preferences', 'active-workspace'] as const,
  activeNetwork: ['preferences', 'active-network'] as const,
} as const;
