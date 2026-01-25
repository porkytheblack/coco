import { z } from 'zod';

// ============================================================================
// Workspace schemas
// ============================================================================

export const createWorkspaceSchema = z.object({
  name: z.string().min(1, 'Workspace name is required').max(100, 'Name is too long'),
  chainId: z.string().min(1, 'Chain is required'),
});

export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;

export const updateWorkspaceSchema = z.object({
  name: z.string().min(1, 'Workspace name is required').max(100, 'Name is too long'),
});

export type UpdateWorkspaceInput = z.infer<typeof updateWorkspaceSchema>;

// ============================================================================
// Wallet schemas
// ============================================================================

export const createWalletSchema = z.object({
  name: z.string().min(1, 'Wallet name is required').max(50, 'Name is too long'),
  chainId: z.string().min(1, 'Chain is required'),
  ecosystem: z.enum(['evm', 'solana', 'aptos']).optional(),
});

export type CreateWalletInput = z.infer<typeof createWalletSchema>;

export const importWalletSchema = z.object({
  name: z.string().min(1, 'Wallet name is required').max(50, 'Name is too long'),
  chainId: z.string().min(1, 'Chain is required'),
  privateKey: z.string().min(1, 'Private key is required'),
  address: z.string().optional(),
  ecosystem: z.enum(['evm', 'solana', 'aptos']).optional(),
});

export type ImportWalletInput = z.infer<typeof importWalletSchema>;

// ============================================================================
// Chain schemas
// ============================================================================

export const createChainSchema = z.object({
  name: z.string().min(1, 'Chain name is required').max(100, 'Name is too long'),
  ecosystem: z.enum(['evm', 'solana', 'aptos']),
  rpcUrl: z.string().url('Invalid RPC URL'),
  chainIdNumeric: z.number().int().positive().optional(),
  currencySymbol: z.string().min(1, 'Currency symbol is required'),
  blockExplorerUrl: z
    .string()
    .url('Invalid explorer URL')
    .optional()
    .or(z.literal('')),
  faucetUrl: z
    .string()
    .url('Invalid faucet URL')
    .optional()
    .or(z.literal('')),
  blockchain: z.string().min(1, 'Blockchain is required'),
  networkType: z.enum(['mainnet', 'testnet', 'devnet', 'custom']),
});

export type CreateChainInput = z.infer<typeof createChainSchema>;

export const updateChainSchema = z.object({
  name: z.string().min(1, 'Chain name is required').max(100, 'Name is too long'),
  rpcUrl: z.string().url('Invalid RPC URL'),
  chainIdNumeric: z.number().int().positive().optional(),
  explorerUrl: z
    .string()
    .url('Invalid explorer URL')
    .optional()
    .or(z.literal('')),
  explorerApiUrl: z
    .string()
    .url('Invalid API URL')
    .optional()
    .or(z.literal('')),
  explorerApiKey: z.string().optional(),
  faucetUrl: z
    .string()
    .url('Invalid faucet URL')
    .optional()
    .or(z.literal('')),
});

export type UpdateChainInput = z.infer<typeof updateChainSchema>;

// ============================================================================
// Contract schemas
// ============================================================================

export const addContractSchema = z.object({
  name: z.string().min(1, 'Contract name is required').max(100, 'Name is too long'),
  address: z.string().optional(),
  interfaceType: z.enum(['abi', 'idl', 'move']).optional(),
  abi: z.string().optional(),
  idl: z.string().optional(),
  moveDefinition: z.string().optional(),
});

export type AddContractInput = z.infer<typeof addContractSchema>;

export const updateContractSchema = addContractSchema;
export type UpdateContractInput = z.infer<typeof updateContractSchema>;

// ============================================================================
// Transaction schemas
// ============================================================================

export const createTransactionSchema = z.object({
  name: z.string().min(1, 'Transaction name is required').max(100, 'Name is too long'),
  contractId: z.string().optional(),
  functionName: z.string().optional(),
});

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;

export const updateTransactionSchema = z.object({
  name: z.string().min(1, 'Transaction name is required').max(100, 'Name is too long').optional(),
  contractId: z.string().optional(),
  functionName: z.string().optional(),
  args: z.string().optional(),
});

export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;

// ============================================================================
// Environment Variable schemas
// ============================================================================

export const createEnvVarSchema = z.object({
  key: z
    .string()
    .min(1, 'Key is required')
    .regex(/^[A-Z][A-Z0-9_]*$/, 'Key must be SCREAMING_SNAKE_CASE (e.g., MY_VAR)'),
  value: z.string().min(1, 'Value is required'),
  description: z.string().optional(),
});

export type CreateEnvVarInput = z.infer<typeof createEnvVarSchema>;

export const updateEnvVarSchema = z.object({
  key: z
    .string()
    .min(1, 'Key is required')
    .regex(/^[A-Z][A-Z0-9_]*$/, 'Key must be SCREAMING_SNAKE_CASE')
    .optional(),
  value: z.string().min(1, 'Value is required').optional(),
  description: z.string().optional(),
});

export type UpdateEnvVarInput = z.infer<typeof updateEnvVarSchema>;

// ============================================================================
// Script schemas
// ============================================================================

export const createScriptSchema = z.object({
  name: z.string().min(1, 'Script name is required').max(100, 'Name is too long'),
  description: z.string().optional(),
  runner: z.enum(['bash', 'node', 'python', 'bun', 'forge', 'forge-test', 'forge-build', 'npx', 'custom']),
  filePath: z.string().optional(),
  command: z.string().optional(),
  workingDirectory: z.string().optional(),
  category: z.string().optional(),
});

export type CreateScriptInput = z.infer<typeof createScriptSchema>;

export const updateScriptSchema = createScriptSchema.partial();
export type UpdateScriptInput = z.infer<typeof updateScriptSchema>;

// ============================================================================
// Send funds schema
// ============================================================================

export const sendFundsSchema = z.object({
  toAddress: z.string().min(1, 'Recipient address is required'),
  amount: z
    .string()
    .min(1, 'Amount is required')
    .refine((val) => {
      const num = parseFloat(val);
      return !isNaN(num) && num > 0;
    }, 'Amount must be a positive number'),
});

export type SendFundsInput = z.infer<typeof sendFundsSchema>;

// ============================================================================
// AI Settings schema
// ============================================================================

export const aiSettingsSchema = z.object({
  enabled: z.boolean(),
  provider: z.enum(['openai', 'anthropic', 'ollama']).optional(),
  apiKey: z.string().optional(),
  model: z.string().optional(),
  baseUrl: z.string().url().optional().or(z.literal('')),
});

export type AISettingsInput = z.infer<typeof aiSettingsSchema>;
