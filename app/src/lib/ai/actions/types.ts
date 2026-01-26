/**
 * AI Action System Types
 *
 * This module defines the types for the in-app AI action adapter.
 * Actions are like "tools" that the AI can invoke to perform operations
 * within the app, using the existing stores and functions.
 */

// ============================================================================
// Parameter Types
// ============================================================================

export type ParameterType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'array'
  | 'object'
  | 'enum';

export interface ActionParameter {
  name: string;
  type: ParameterType;
  description: string;
  required: boolean;
  default?: unknown;
  enum?: string[]; // For enum type
  items?: ActionParameter; // For array type
  properties?: ActionParameter[]; // For object type
}

// ============================================================================
// Action Definition
// ============================================================================

export interface ActionDefinition {
  id: string;
  name: string;
  description: string;
  category: ActionCategory;
  parameters: ActionParameter[];
  // Returns description of what the action returns
  returns: string;
  // Example usage for the AI
  examples?: string[];
  // Whether this action requires confirmation
  requiresConfirmation?: boolean;
  // Tags for filtering/searching
  tags?: string[];
}

export type ActionCategory =
  | 'chains'
  | 'wallets'
  | 'workspaces'
  | 'contracts'
  | 'transactions'
  | 'scripts'
  | 'workflows'
  | 'env'
  | 'navigation'
  | 'info';

// ============================================================================
// Action Execution
// ============================================================================

export interface ActionContext {
  // Current state references
  currentChainId?: string;
  currentWorkspaceId?: string;
  currentWalletId?: string;
  // Store access (these will be populated at runtime)
  stores?: {
    chain: unknown;
    wallet: unknown;
    workspace: unknown;
    toast: unknown;
  };
}

export interface ActionResult {
  success: boolean;
  message: string;
  data?: unknown;
  error?: string;
}

export type ActionExecutor = (
  params: Record<string, unknown>,
  context: ActionContext
) => Promise<ActionResult>;

// ============================================================================
// Action Registry Entry
// ============================================================================

export interface RegisteredAction {
  definition: ActionDefinition;
  execute: ActionExecutor;
}

// ============================================================================
// AI Tool Format (for AI providers)
// ============================================================================

export interface AITool {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, {
      type: string;
      description: string;
      enum?: string[];
      items?: { type: string };
    }>;
    required: string[];
  };
}

/**
 * Convert an ActionDefinition to AI tool format
 */
export function actionToAITool(action: ActionDefinition): AITool {
  const properties: AITool['parameters']['properties'] = {};
  const required: string[] = [];

  for (const param of action.parameters) {
    properties[param.name] = {
      type: param.type === 'enum' ? 'string' : param.type,
      description: param.description,
    };

    if (param.enum) {
      properties[param.name].enum = param.enum;
    }

    if (param.type === 'array' && param.items) {
      properties[param.name].items = { type: param.items.type };
    }

    if (param.required) {
      required.push(param.name);
    }
  }

  return {
    name: action.id,
    description: `${action.description}\n\nReturns: ${action.returns}`,
    parameters: {
      type: 'object',
      properties,
      required,
    },
  };
}

/**
 * Format all actions as a system prompt section for the AI
 */
export function formatActionsForPrompt(actions: ActionDefinition[]): string {
  const lines = ['## Available Actions', '', 'You can execute the following actions in the app:'];

  const byCategory = new Map<ActionCategory, ActionDefinition[]>();
  for (const action of actions) {
    const list = byCategory.get(action.category) || [];
    list.push(action);
    byCategory.set(action.category, list);
  }

  const categoryNames: Record<ActionCategory, string> = {
    chains: 'Blockchain Chains',
    wallets: 'Wallets',
    workspaces: 'Workspaces',
    contracts: 'Contracts',
    transactions: 'Transactions',
    scripts: 'Scripts',
    workflows: 'Workflows',
    env: 'Environment Variables',
    navigation: 'Navigation',
    info: 'Information',
  };

  for (const [category, categoryActions] of byCategory) {
    lines.push('', `### ${categoryNames[category]}`, '');
    for (const action of categoryActions) {
      const params = action.parameters
        .map(p => `${p.name}${p.required ? '' : '?'}: ${p.type}`)
        .join(', ');
      lines.push(`- **${action.id}**(${params}): ${action.description}`);
    }
  }

  lines.push('', 'To execute an action, respond with a JSON block like:', '```json', '{', '  "action": "action_id",', '  "params": { ... }', '}', '```');

  return lines.join('\n');
}
