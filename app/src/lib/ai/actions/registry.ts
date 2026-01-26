/**
 * AI Action Registry
 *
 * Central registry for all available AI actions.
 * Actions are registered here and can be discovered/executed by the AI.
 */

import type { RegisteredAction, ActionDefinition, AITool, ActionContext, ActionResult } from './types';
import { actionToAITool, formatActionsForPrompt } from './types';

// Import action definitions
import { chainActions } from './definitions/chains';
import { walletActions } from './definitions/wallets';
import { workspaceActions } from './definitions/workspaces';
import { contractActions } from './definitions/contracts';
import { transactionActions } from './definitions/transactions';
import { navigationActions } from './definitions/navigation';
import { infoActions } from './definitions/info';

// ============================================================================
// Registry Implementation
// ============================================================================

class ActionRegistry {
  private actions: Map<string, RegisteredAction> = new Map();

  /**
   * Register an action
   */
  register(action: RegisteredAction): void {
    if (this.actions.has(action.definition.id)) {
      console.warn(`Action ${action.definition.id} is already registered, overwriting.`);
    }
    this.actions.set(action.definition.id, action);
  }

  /**
   * Register multiple actions
   */
  registerAll(actions: RegisteredAction[]): void {
    for (const action of actions) {
      this.register(action);
    }
  }

  /**
   * Get an action by ID
   */
  get(id: string): RegisteredAction | undefined {
    return this.actions.get(id);
  }

  /**
   * Get all registered actions
   */
  getAll(): RegisteredAction[] {
    return Array.from(this.actions.values());
  }

  /**
   * Get all action definitions
   */
  getDefinitions(): ActionDefinition[] {
    return this.getAll().map(a => a.definition);
  }

  /**
   * Get actions by category
   */
  getByCategory(category: string): RegisteredAction[] {
    return this.getAll().filter(a => a.definition.category === category);
  }

  /**
   * Search actions by tag or name
   */
  search(query: string): RegisteredAction[] {
    const q = query.toLowerCase();
    return this.getAll().filter(a =>
      a.definition.name.toLowerCase().includes(q) ||
      a.definition.description.toLowerCase().includes(q) ||
      a.definition.tags?.some(t => t.toLowerCase().includes(q))
    );
  }

  /**
   * Execute an action by ID
   */
  async execute(
    actionId: string,
    params: Record<string, unknown>,
    context: ActionContext
  ): Promise<ActionResult> {
    const action = this.actions.get(actionId);
    if (!action) {
      return {
        success: false,
        message: `Action "${actionId}" not found`,
        error: `Unknown action: ${actionId}`,
      };
    }

    try {
      // Validate required parameters
      for (const param of action.definition.parameters) {
        if (param.required && !(param.name in params)) {
          return {
            success: false,
            message: `Missing required parameter: ${param.name}`,
            error: `Parameter "${param.name}" is required for action "${actionId}"`,
          };
        }
      }

      return await action.execute(params, context);
    } catch (error) {
      return {
        success: false,
        message: `Action failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error: String(error),
      };
    }
  }

  /**
   * Convert all actions to AI tool format
   */
  toAITools(): AITool[] {
    return this.getDefinitions().map(actionToAITool);
  }

  /**
   * Format all actions as a prompt section for the AI
   */
  toPrompt(): string {
    return formatActionsForPrompt(this.getDefinitions());
  }
}

// ============================================================================
// Global Registry Instance
// ============================================================================

export const actionRegistry = new ActionRegistry();

/**
 * Initialize the registry with all actions
 * Call this once at app startup
 */
export function initializeActionRegistry(): void {
  actionRegistry.registerAll(chainActions);
  actionRegistry.registerAll(walletActions);
  actionRegistry.registerAll(workspaceActions);
  actionRegistry.registerAll(contractActions);
  actionRegistry.registerAll(transactionActions);
  actionRegistry.registerAll(navigationActions);
  actionRegistry.registerAll(infoActions);

  console.log(`AI Action Registry initialized with ${actionRegistry.getAll().length} actions`);
}

/**
 * Get the available actions prompt for the AI
 */
export function getActionsPrompt(): string {
  return actionRegistry.toPrompt();
}

/**
 * Execute an action from AI response
 */
export async function executeAIAction(
  actionId: string,
  params: Record<string, unknown>,
  context: ActionContext
): Promise<ActionResult> {
  return actionRegistry.execute(actionId, params, context);
}
