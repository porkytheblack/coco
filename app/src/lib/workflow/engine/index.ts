import { Effect, pipe } from 'effect';
import type {
  WorkflowDefinition,
  WorkflowNode,
  WorkflowEdge,
  WorkflowRun,
  WorkflowStepLog,
  PredicateExpression,
  TransactionNode,
  ScriptNode,
  PredicateNode,
  AdapterNode,
  TransformNode,
  LoggingNode,
} from '../types';
import {
  isStartNode,
  isEndNode,
  isTransactionNode,
  isScriptNode,
  isPredicateNode,
  isAdapterNode,
  isTransformNode,
  isLoggingNode,
} from '../types';
import type { RunEmitter } from '../events';

// ============================================================================
// Error Types
// ============================================================================

export class WorkflowExecutionError {
  readonly _tag = 'WorkflowExecutionError';
  constructor(
    public readonly nodeId: string,
    public readonly message: string,
    public readonly cause?: unknown
  ) {}
}

export class VariableResolutionError {
  readonly _tag = 'VariableResolutionError';
  constructor(
    public readonly variable: string,
    public readonly message: string
  ) {}
}

export class PredicateEvaluationError {
  readonly _tag = 'PredicateEvaluationError';
  constructor(
    public readonly expression: PredicateExpression,
    public readonly message: string
  ) {}
}

export type WorkflowError = 
  | WorkflowExecutionError 
  | VariableResolutionError 
  | PredicateEvaluationError;

// ============================================================================
// Execution Context
// ============================================================================

export interface ExecutionContext {
  workflowId: string;
  runId: string;
  definition: WorkflowDefinition;
  variables: Record<string, unknown>;
  stepLogs: WorkflowStepLog[];

  // External handlers (injected by the runtime)
  handlers: ExecutionHandlers;

  // Optional event emitter for real-time updates
  emitter?: RunEmitter;
}

export interface ExecutionHandlers {
  executeTransaction: (
    transactionId: string,
    walletId: string | undefined,
    args: Record<string, string>
  ) => Promise<{ success: boolean; data?: unknown; error?: string; txHash?: string }>;
  
  executeScript: (
    scriptId: string,
    flags?: Record<string, string>,
    envVarKeys?: string[]
  ) => Promise<{ success: boolean; output?: string; error?: string }>;
  
  executeAdapter: (
    adapterId: string,
    operation: string,
    config: Record<string, unknown>,
    input: Record<string, unknown>
  ) => Promise<{ success: boolean; data?: unknown; error?: string }>;
}

// ============================================================================
// Variable Resolution
// ============================================================================

const VARIABLE_PATTERN = /\{\{([^}]+)\}\}/g;

/**
 * Resolves variable references in a value.
 * Supports: {{varName}}, {{step1.result}}, {{step1.output.field}}
 */
export function resolveVariables(
  value: unknown,
  variables: Record<string, unknown>
): Effect.Effect<unknown, VariableResolutionError> {
  if (typeof value === 'string') {
    return Effect.try({
      try: () => {
        // Check if the entire string is a single variable reference
        const singleMatch = value.match(/^\{\{([^}]+)\}\}$/);
        if (singleMatch) {
          const path = singleMatch[1].trim();
          const resolved = getNestedValue(variables, path);
          if (resolved === undefined) {
            throw new Error(`Variable not found: ${path}`);
          }
          return resolved;
        }
        
        // Otherwise, do string interpolation
        return value.replace(VARIABLE_PATTERN, (_, path: string) => {
          const resolved = getNestedValue(variables, path.trim());
          if (resolved === undefined) {
            throw new Error(`Variable not found: ${path}`);
          }
          if (typeof resolved === 'object' && resolved !== null) {
            return JSON.stringify(resolved);
          }
          return String(resolved);
        });
      },
      catch: (e) => new VariableResolutionError(value, String(e)),
    });
  }
  
  if (Array.isArray(value)) {
    return Effect.all(value.map(v => resolveVariables(v, variables)));
  }
  
  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value);
    return pipe(
      Effect.all(
        entries.map(([k, v]) => 
          pipe(
            resolveVariables(v, variables),
            Effect.map(resolved => [k, resolved] as const)
          )
        )
      ),
      Effect.map(resolvedEntries => Object.fromEntries(resolvedEntries))
    );
  }
  
  return Effect.succeed(value);
}

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = obj;
  
  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }
    
    if (Array.isArray(current)) {
      const index = parseInt(part, 10);
      if (isNaN(index)) {
        return undefined;
      }
      current = current[index];
    } else if (typeof current === 'object') {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  
  return current;
}

/**
 * Sets a value in a nested object based on a dot-separated path.
 */
function setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.split('.');
  let current = obj;
  
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!(part in current) || typeof current[part] !== 'object' || current[part] === null) {
      current[part] = {};
    }
    current = current[part] as Record<string, unknown>;
  }
  
  current[parts[parts.length - 1]] = value;
}

/**
 * Slugifies a string for use as a variable name.
 * e.g., "Get User Result" -> "Get_User_Result"
 */
export function slugify(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^a-zA-Z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

/**
 * Resolves a record of values, replacing variable references.
 */
export function resolveRecord(
  record: Record<string, string> | undefined,
  variables: Record<string, unknown>
): Effect.Effect<Record<string, string>, VariableResolutionError> {
  if (!record) {
    return Effect.succeed({});
  }
  
  return pipe(
    Effect.all(
      Object.entries(record).map(([key, value]) =>
        pipe(
          resolveVariables(value, variables),
          Effect.map(resolved => {
            const finalValue = (typeof resolved === 'object' && resolved !== null) 
              ? JSON.stringify(resolved) 
              : String(resolved);
            return [key, finalValue] as const;
          })
        )
      )
    ),
    Effect.map(entries => Object.fromEntries(entries))
  );
}

// ============================================================================
// Predicate Evaluation
// ============================================================================

export function evaluatePredicate(
  expression: PredicateExpression,
  variables: Record<string, unknown>
): Effect.Effect<boolean, PredicateEvaluationError | VariableResolutionError> {
  return pipe(
    resolveVariables(expression.left, variables),
    Effect.flatMap((left) => {
      const right = expression.right;
      
      return Effect.try({
        try: () => {
          switch (expression.operator) {
            case 'eq':
              return left === right;
            case 'neq':
              return left !== right;
            case 'gt':
              return Number(left) > Number(right);
            case 'gte':
              return Number(left) >= Number(right);
            case 'lt':
              return Number(left) < Number(right);
            case 'lte':
              return Number(left) <= Number(right);
            case 'contains':
              if (typeof left === 'string' && typeof right === 'string') {
                return left.includes(right);
              }
              if (Array.isArray(left)) {
                return left.includes(right);
              }
              return false;
            case 'startsWith':
              return typeof left === 'string' && typeof right === 'string' && left.startsWith(right);
            case 'endsWith':
              return typeof left === 'string' && typeof right === 'string' && left.endsWith(right);
            case 'isEmpty':
              if (left === null || left === undefined) return true;
              if (typeof left === 'string') return left.length === 0;
              if (Array.isArray(left)) return left.length === 0;
              if (typeof left === 'object') return Object.keys(left).length === 0;
              return false;
            case 'isNotEmpty':
              if (left === null || left === undefined) return false;
              if (typeof left === 'string') return left.length > 0;
              if (Array.isArray(left)) return left.length > 0;
              if (typeof left === 'object') return Object.keys(left).length > 0;
              return true;
            default:
              throw new Error(`Unknown operator: ${expression.operator}`);
          }
        },
        catch: (e) => new PredicateEvaluationError(expression, String(e)),
      });
    })
  );
}

// ============================================================================
// Node Execution
// ============================================================================

function executeTransactionNode(
  node: TransactionNode,
  ctx: ExecutionContext
): Effect.Effect<unknown, WorkflowError> {
  return pipe(
    resolveRecord(node.config.args, ctx.variables),
    Effect.flatMap((resolvedArgs) =>
      Effect.tryPromise({
        try: async () => {
          const result = await ctx.handlers.executeTransaction(
            node.config.transactionId,
            node.config.walletId,
            resolvedArgs
          );
          
          if (!result.success) {
            throw new Error(result.error || 'Transaction failed');
          }
          
          return result;
        },
        catch: (e) => new WorkflowExecutionError(node.id, `Transaction execution failed: ${e}`),
      })
    ),
    Effect.tap((result) =>
      Effect.sync(() => {
        if (node.config.outputVariable) {
          ctx.variables[node.config.outputVariable] = result;
        }
        setNestedValue(ctx.variables, `${node.id}.result`, result);
        setNestedValue(ctx.variables, `${slugify(node.label || node.type)}.result`, result);
      })
    )
  );
}

function executeScriptNode(
  node: ScriptNode,
  ctx: ExecutionContext
): Effect.Effect<unknown, WorkflowError> {
  return pipe(
    resolveRecord(node.config.flags, ctx.variables),
    Effect.flatMap((resolvedFlags) =>
      Effect.tryPromise({
        try: async () => {
          const result = await ctx.handlers.executeScript(
            node.config.scriptId,
            resolvedFlags,
            node.config.envVarKeys
          );
          
          if (!result.success) {
            throw new Error(result.error || 'Script failed');
          }
          
          return result;
        },
        catch: (e) => new WorkflowExecutionError(node.id, `Script execution failed: ${e}`),
      })
    ),
    Effect.tap((result) =>
      Effect.sync(() => {
        if (node.config.outputVariable) {
          ctx.variables[node.config.outputVariable] = result;
        }
        setNestedValue(ctx.variables, `${node.id}.result`, result);
        setNestedValue(ctx.variables, `${slugify(node.label || node.type)}.result`, result);
      })
    )
  );
}

function executePredicateNode(
  node: PredicateNode,
  ctx: ExecutionContext
): Effect.Effect<boolean, WorkflowError> {
  return pipe(
    evaluatePredicate(node.config.expression, ctx.variables),
    Effect.tap((result) =>
      Effect.sync(() => {
        setNestedValue(ctx.variables, `${node.id}.result`, result);
        setNestedValue(ctx.variables, `${slugify(node.label || node.type)}.result`, result);
      })
    )
  );
}

function executeAdapterNode(
  node: AdapterNode,
  ctx: ExecutionContext
): Effect.Effect<unknown, WorkflowError> {
  return pipe(
    Effect.all({
      config: resolveVariables(node.config.config, ctx.variables) as Effect.Effect<Record<string, unknown>, VariableResolutionError>,
      input: resolveRecord(node.config.inputMappings, ctx.variables),
    }),
    Effect.flatMap(({ config, input }) =>
      Effect.tryPromise({
        try: async () => {
          const result = await ctx.handlers.executeAdapter(
            node.config.adapterId,
            node.config.operation,
            config,
            input
          );
          
          if (!result.success) {
            throw new Error(result.error || 'Adapter execution failed');
          }
          
          return result.data;
        },
        catch: (e) => new WorkflowExecutionError(node.id, `Adapter execution failed: ${e}`),
      })
    ),
    Effect.tap((result) =>
      Effect.sync(() => {
        if (node.config.outputVariable) {
          ctx.variables[node.config.outputVariable] = result;
        }
        setNestedValue(ctx.variables, `${node.id}.result`, result);
        setNestedValue(ctx.variables, `${slugify(node.label || node.type)}.result`, result);
      })
    )
  );
}

function executeTransformNode(
  node: TransformNode,
  ctx: ExecutionContext
): Effect.Effect<unknown, WorkflowError> {
  return pipe(
    Effect.all(
      node.config.mappings.map(mapping => 
        pipe(
          resolveVariables(mapping.expression, ctx.variables),
          Effect.map(resolved => ({ variable: mapping.outputVariable, value: resolved }))
        )
      )
    ),
    Effect.tap((results) =>
      Effect.sync(() => {
        results.forEach(({ variable, value }) => {
          ctx.variables[variable] = value;
          // Also set as nested just in case
          setNestedValue(ctx.variables, variable, value);
        });
        const finalResult = results.length === 1 ? results[0].value : results;
        setNestedValue(ctx.variables, `${node.id}.result`, finalResult);
        setNestedValue(ctx.variables, `${slugify(node.label || node.type)}.result`, finalResult);
      })
    )
  );
}

function executeLoggingNode(
  node: LoggingNode,
  ctx: ExecutionContext
): Effect.Effect<string, WorkflowError> {
  return pipe(
    resolveVariables(node.config.message, ctx.variables),
    Effect.map(resolved => {
        if (typeof resolved === 'object' && resolved !== null) {
            return JSON.stringify(resolved, null, 2);
        }
        return String(resolved);
    }),
    Effect.tap((message) =>
      Effect.sync(() => {
        // We can optionally store the log in a specific variable or just use the step log
        setNestedValue(ctx.variables, `${node.id}.result`, message);
        setNestedValue(ctx.variables, `${slugify(node.label || node.type)}.result`, message);
      })
    )
  );
}

// ============================================================================
// Main Execution Engine
// ============================================================================

function findStartNode(definition: WorkflowDefinition): WorkflowNode | undefined {
  return definition.nodes.find(isStartNode);
}

function findOutgoingEdges(nodeId: string, edges: WorkflowEdge[]): WorkflowEdge[] {
  return edges.filter(e => e.sourceId === nodeId);
}

function findNodeById(nodeId: string, nodes: WorkflowNode[]): WorkflowNode | undefined {
  return nodes.find(n => n.id === nodeId);
}

function logNodeStart(ctx: ExecutionContext, node: WorkflowNode): void {
  ctx.stepLogs.push({
    nodeId: node.id,
    nodeName: node.label,
    nodeType: node.type,
    status: 'running',
    startedAt: new Date().toISOString(),
  });

  // Emit event for real-time UI updates
  ctx.emitter?.emitStepStart(node.id, node.label || node.type, node.type);
  ctx.emitter?.emitLogsUpdate([...ctx.stepLogs]);
}

function logNodeComplete(ctx: ExecutionContext, node: WorkflowNode, output?: unknown): void {
  const log = ctx.stepLogs.find(l => l.nodeId === node.id && l.status === 'running');
  if (log) {
    log.status = 'completed';
    log.completedAt = new Date().toISOString();
    log.output = output;
  }

  // Emit event for real-time UI updates
  ctx.emitter?.emitStepComplete(node.id, output);
  ctx.emitter?.emitLogsUpdate([...ctx.stepLogs]);
}

function logNodeError(ctx: ExecutionContext, node: WorkflowNode, error: string): void {
  const log = ctx.stepLogs.find(l => l.nodeId === node.id && l.status === 'running');
  if (log) {
    log.status = 'failed';
    log.completedAt = new Date().toISOString();
    log.error = error;
  }

  // Emit event for real-time UI updates
  ctx.emitter?.emitStepError(node.id, error);
  ctx.emitter?.emitLogsUpdate([...ctx.stepLogs]);
}

/**
 * Execute a single node and return the next node(s) to execute.
 */
function executeNode(
  node: WorkflowNode,
  ctx: ExecutionContext
): Effect.Effect<string[], WorkflowError> {
  logNodeStart(ctx, node);
  
  if (isStartNode(node)) {
    // Start node just passes through
    logNodeComplete(ctx, node);
    const outgoing = findOutgoingEdges(node.id, ctx.definition.edges);
    return Effect.succeed(outgoing.map(e => e.targetId));
  }
  
  if (isEndNode(node)) {
    // End node terminates the workflow
    logNodeComplete(ctx, node);
    return Effect.succeed([]);
  }
  
  if (isTransactionNode(node)) {
    return pipe(
      executeTransactionNode(node, ctx),
      Effect.map((result) => {
        logNodeComplete(ctx, node, result);
        const outgoing = findOutgoingEdges(node.id, ctx.definition.edges);
        return outgoing.map(e => e.targetId);
      }),
      Effect.catchAll((error) => {
        logNodeError(ctx, node, error.message);
        return Effect.fail(error);
      })
    );
  }
  
  if (isScriptNode(node)) {
    return pipe(
      executeScriptNode(node, ctx),
      Effect.map((result) => {
        logNodeComplete(ctx, node, result);
        const outgoing = findOutgoingEdges(node.id, ctx.definition.edges);
        return outgoing.map(e => e.targetId);
      }),
      Effect.catchAll((error) => {
        logNodeError(ctx, node, error.message);
        return Effect.fail(error);
      })
    );
  }
  
  if (isPredicateNode(node)) {
    return pipe(
      executePredicateNode(node, ctx),
      Effect.map((result) => {
        logNodeComplete(ctx, node, result);
        const outgoing = findOutgoingEdges(node.id, ctx.definition.edges);
        // Filter edges based on predicate result (true/false handles)
        const matchingEdges = outgoing.filter(e => {
          if (e.sourceHandle === 'true') return result === true;
          if (e.sourceHandle === 'false') return result === false;
          return true; // No handle specified, always follow
        });
        return matchingEdges.map(e => e.targetId);
      }),
      Effect.catchAll((error) => {
        logNodeError(ctx, node, error.message);
        return Effect.fail(error);
      })
    );
  }
  
  if (isAdapterNode(node)) {
    return pipe(
      executeAdapterNode(node, ctx),
      Effect.map((result) => {
        logNodeComplete(ctx, node, result);
        const outgoing = findOutgoingEdges(node.id, ctx.definition.edges);
        return outgoing.map(e => e.targetId);
      }),
      Effect.catchAll((error) => {
        logNodeError(ctx, node, error.message);
        return Effect.fail(error);
      })
    );
  }
  
  if (isTransformNode(node)) {
    return pipe(
      executeTransformNode(node, ctx),
      Effect.map((result) => {
        logNodeComplete(ctx, node, result);
        const outgoing = findOutgoingEdges(node.id, ctx.definition.edges);
        return outgoing.map(e => e.targetId);
      }),
      Effect.catchAll((error) => {
        logNodeError(ctx, node, error.message);
        return Effect.fail(error);
      })
    );
  }

  if (isLoggingNode(node)) {
    return pipe(
      executeLoggingNode(node, ctx),
      Effect.map((result) => {
        logNodeComplete(ctx, node, result);
        const outgoing = findOutgoingEdges(node.id, ctx.definition.edges);
        return outgoing.map(e => e.targetId);
      }),
      Effect.catchAll((error) => {
        logNodeError(ctx, node, error.message);
        return Effect.fail(error);
      })
    );
  }
  
  // Unknown node type - this should be unreachable but TypeScript doesn't know
  const unknownNode = node as unknown as { id: string; type: string };
  return Effect.fail(new WorkflowExecutionError(unknownNode.id, `Unknown node type: ${unknownNode.type}`));
}

/**
 * Execute a workflow step by step.
 */
function executeWorkflowStep(
  nodeIds: string[],
  ctx: ExecutionContext,
  visited: Set<string>
): Effect.Effect<void, WorkflowError> {
  if (nodeIds.length === 0) {
    return Effect.void;
  }
  
  // Prevent infinite loops
  const uniqueNodeIds = nodeIds.filter(id => !visited.has(id));
  if (uniqueNodeIds.length === 0) {
    return Effect.void;
  }
  
  uniqueNodeIds.forEach(id => visited.add(id));
  
  // Execute all nodes in parallel (for branching support)
  return pipe(
    Effect.all(
      uniqueNodeIds.map(nodeId => {
        const node = findNodeById(nodeId, ctx.definition.nodes);
        if (!node) {
          return Effect.fail(new WorkflowExecutionError(nodeId, 'Node not found'));
        }
        return executeNode(node, ctx);
      })
    ),
    Effect.flatMap((results) => {
      // Flatten and dedupe next nodes
      const nextNodeIds = [...new Set(results.flat())];
      return executeWorkflowStep(nextNodeIds, ctx, visited);
    })
  );
}

/**
 * Execute a complete workflow.
 */
export function executeWorkflow(
  workflowId: string,
  runId: string,
  definition: WorkflowDefinition,
  initialVariables: Record<string, unknown>,
  handlers: ExecutionHandlers,
  emitter?: RunEmitter
): Effect.Effect<WorkflowRun, WorkflowError> {
  const startNode = findStartNode(definition);

  if (!startNode) {
    return Effect.fail(new WorkflowExecutionError('', 'No start node found in workflow'));
  }

  // Initialize global variables
  const variables: Record<string, unknown> = { ...initialVariables };
  if (definition.variables) {
    for (const v of definition.variables) {
      if (v.defaultValue !== undefined && !(v.name in variables)) {
        variables[v.name] = v.defaultValue;
      }
    }
  }

  const ctx: ExecutionContext = {
    workflowId,
    runId,
    definition,
    variables,
    stepLogs: [],
    handlers,
    emitter,
  };

  const startTime = new Date().toISOString();

  // Emit run start event
  emitter?.emitRunStart();

  return pipe(
    executeWorkflowStep([startNode.id], ctx, new Set()),
    Effect.map(() => {
      const result = {
        id: runId,
        workflowId,
        status: 'completed' as const,
        variables: ctx.variables,
        stepLogs: ctx.stepLogs,
        startedAt: startTime,
        completedAt: new Date().toISOString(),
      };
      emitter?.emitRunComplete('completed');
      return result;
    }),
    Effect.catchAll((error) => {
      const result = {
        id: runId,
        workflowId,
        status: 'failed' as const,
        variables: ctx.variables,
        stepLogs: ctx.stepLogs,
        error: error.message,
        startedAt: startTime,
        completedAt: new Date().toISOString(),
      };
      emitter?.emitRunError(error.message);
      return Effect.succeed(result);
    })
  );
}

// ============================================================================
// Enhanced Execution Modes
// ============================================================================

export type ExecutionMode = 
  | { type: 'full' }
  | { type: 'single'; nodeId: string }
  | { type: 'upto'; nodeId: string }
  | { type: 'resume'; fromNodeId: string; variables?: Record<string, unknown> };

export interface ExecuteWithModeOptions {
  workflowId: string;
  runId: string;
  definition: WorkflowDefinition;
  initialVariables: Record<string, unknown>;
  handlers: ExecutionHandlers;
  mode: ExecutionMode;
  existingStepLogs?: WorkflowStepLog[];
  emitter?: RunEmitter;
}

/**
 * Execute a single node without following edges.
 */
function executeSingleNode(
  nodeId: string,
  ctx: ExecutionContext
): Effect.Effect<WorkflowRun, WorkflowError> {
  const node = findNodeById(nodeId, ctx.definition.nodes);
  if (!node) {
    return Effect.fail(new WorkflowExecutionError(nodeId, 'Node not found'));
  }
  
  const startTime = new Date().toISOString();
  
  return pipe(
    executeNode(node, ctx),
    Effect.map(() => ({
      id: ctx.runId,
      workflowId: ctx.workflowId,
      status: 'completed' as const,
      variables: ctx.variables,
      stepLogs: ctx.stepLogs,
      startedAt: startTime,
      completedAt: new Date().toISOString(),
    })),
    Effect.catchAll((error) =>
      Effect.succeed({
        id: ctx.runId,
        workflowId: ctx.workflowId,
        status: 'failed' as const,
        variables: ctx.variables,
        stepLogs: ctx.stepLogs,
        error: error.message,
        startedAt: startTime,
        completedAt: new Date().toISOString(),
      })
    )
  );
}

/**
 * Execute workflow up to (and including) a specific node.
 */
function executeUptoNode(
  targetNodeId: string,
  ctx: ExecutionContext
): Effect.Effect<WorkflowRun, WorkflowError> {
  const startNode = findStartNode(ctx.definition);
  if (!startNode) {
    return Effect.fail(new WorkflowExecutionError('', 'No start node found'));
  }
  
  const startTime = new Date().toISOString();
  
  // Execute step by step, stopping when we've executed the target node
  const executeStepUntilTarget = (
    nodeIds: string[],
    visited: Set<string>
  ): Effect.Effect<boolean, WorkflowError> => {
    if (nodeIds.length === 0) {
      return Effect.succeed(false); // Target not reached
    }
    
    // Filter already visited nodes
    const unvisited = nodeIds.filter(id => !visited.has(id));
    if (unvisited.length === 0) {
      return Effect.succeed(false);
    }
    
    // Execute all current nodes
    return pipe(
      Effect.all(
        unvisited.map(nodeId => {
          const node = findNodeById(nodeId, ctx.definition.nodes);
          if (!node) {
            return Effect.fail(new WorkflowExecutionError(nodeId, 'Node not found'));
          }
          visited.add(nodeId);
          return executeNode(node, ctx);
        })
      ),
      Effect.flatMap((results) => {
        // Check if we hit the target
        if (unvisited.includes(targetNodeId)) {
          return Effect.succeed(true); // Target reached, stop
        }
        
        // Get next nodes and continue
        const nextNodeIds = [...new Set(results.flat())];
        return executeStepUntilTarget(nextNodeIds, visited);
      })
    );
  };
  
  return pipe(
    executeStepUntilTarget([startNode.id], new Set()),
    Effect.map(() => ({
      id: ctx.runId,
      workflowId: ctx.workflowId,
      status: 'completed' as const,
      variables: ctx.variables,
      stepLogs: ctx.stepLogs,
      startedAt: startTime,
      completedAt: new Date().toISOString(),
    })),
    Effect.catchAll((error) =>
      Effect.succeed({
        id: ctx.runId,
        workflowId: ctx.workflowId,
        status: 'failed' as const,
        variables: ctx.variables,
        stepLogs: ctx.stepLogs,
        error: error.message,
        startedAt: startTime,
        completedAt: new Date().toISOString(),
      })
    )
  );
}

/**
 * Resume workflow execution from a specific node.
 */
function executeFromNode(
  fromNodeId: string,
  ctx: ExecutionContext,
  resumedVariables?: Record<string, unknown>
): Effect.Effect<WorkflowRun, WorkflowError> {
  // Merge resumed variables if provided
  if (resumedVariables) {
    Object.assign(ctx.variables, resumedVariables);
  }
  
  const startTime = new Date().toISOString();
  
  return pipe(
    executeWorkflowStep([fromNodeId], ctx, new Set()),
    Effect.map(() => ({
      id: ctx.runId,
      workflowId: ctx.workflowId,
      status: 'completed' as const,
      variables: ctx.variables,
      stepLogs: ctx.stepLogs,
      startedAt: startTime,
      completedAt: new Date().toISOString(),
    })),
    Effect.catchAll((error) =>
      Effect.succeed({
        id: ctx.runId,
        workflowId: ctx.workflowId,
        status: 'failed' as const,
        variables: ctx.variables,
        stepLogs: ctx.stepLogs,
        error: error.message,
        startedAt: startTime,
        completedAt: new Date().toISOString(),
      })
    )
  );
}

/**
 * Execute a workflow with the specified execution mode.
 *
 * Modes:
 * - full: Execute from start to end
 * - single: Execute only the specified node
 * - upto: Execute from start up to (and including) the specified node
 * - resume: Resume from a specific node (useful after pause)
 */
export function executeWorkflowWithMode(
  options: ExecuteWithModeOptions
): Effect.Effect<WorkflowRun, WorkflowError> {
  const { workflowId, runId, definition, initialVariables, handlers, mode, existingStepLogs, emitter } = options;

  // Initialize global variables
  const variables: Record<string, unknown> = { ...initialVariables };
  if (definition.variables) {
    for (const v of definition.variables) {
      if (v.defaultValue !== undefined && !(v.name in variables)) {
        variables[v.name] = v.defaultValue;
      }
    }
  }

  const ctx: ExecutionContext = {
    workflowId,
    runId,
    definition,
    variables,
    stepLogs: existingStepLogs || [],
    handlers,
    emitter,
  };

  // Emit run start
  emitter?.emitRunStart();

  switch (mode.type) {
    case 'full':
      return executeWorkflow(workflowId, runId, definition, initialVariables, handlers, emitter);

    case 'single':
      return executeSingleNode(mode.nodeId, ctx);

    case 'upto':
      return executeUptoNode(mode.nodeId, ctx);

    case 'resume':
      return executeFromNode(mode.fromNodeId, ctx, mode.variables);

    default:
      return Effect.fail(new WorkflowExecutionError('', `Unknown execution mode: ${(mode as ExecutionMode).type}`));
  }
}

/**
 * Check if a workflow run can be resumed.
 */
export function canResumeWorkflow(run: WorkflowRun): boolean {
  return run.status === 'paused' || run.status === 'failed';
}

/**
 * Get the next resumable node from a failed or paused run.
 */
export function getResumeNodeId(
  run: WorkflowRun,
  definition: WorkflowDefinition
): string | null {
  if (run.stepLogs.length === 0) {
    const startNode = findStartNode(definition);
    return startNode?.id || null;
  }
  
  // Find the last successful step
  for (let i = run.stepLogs.length - 1; i >= 0; i--) {
    const log = run.stepLogs[i];
    if (log.status === 'completed') {
      // Get outgoing edges from this node
      const outgoing = findOutgoingEdges(log.nodeId, definition.edges);
      if (outgoing.length > 0) {
        return outgoing[0].targetId;
      }
    }
  }
  
  // If no completed steps, start from beginning
  const startNode = findStartNode(definition);
  return startNode?.id || null;
}

