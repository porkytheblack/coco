import { z } from 'zod';

// ============================================================================
// Node Position and Styling
// ============================================================================

export const NodePositionSchema = z.object({
  x: z.number(),
  y: z.number(),
});

export type NodePosition = z.infer<typeof NodePositionSchema>;

// ============================================================================
// Predicate Expressions (for branching logic)
// ============================================================================

export const PredicateOperatorSchema = z.enum([
  'eq',      // equals
  'neq',     // not equals
  'gt',      // greater than
  'gte',     // greater than or equal
  'lt',      // less than
  'lte',     // less than or equal
  'contains', // string/array contains
  'startsWith',
  'endsWith',
  'isEmpty',
  'isNotEmpty',
]);

export type PredicateOperator = z.infer<typeof PredicateOperatorSchema>;

export const PredicateExpressionSchema = z.object({
  left: z.string(),  // Variable reference like "{{step1.result}}" or literal
  operator: PredicateOperatorSchema,
  right: z.union([z.string(), z.number(), z.boolean(), z.null()]).optional(), // Optional for unary operators
});

export type PredicateExpression = z.infer<typeof PredicateExpressionSchema>;

// ============================================================================
// Workflow Variables
// ============================================================================

export const WorkflowVariableTypeSchema = z.enum([
  'string',
  'number',
  'boolean',
  'object',
  'array',
]);

export type WorkflowVariableType = z.infer<typeof WorkflowVariableTypeSchema>;

export const WorkflowVariableSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: WorkflowVariableTypeSchema,
  defaultValue: z.unknown().optional(),
  description: z.string().optional(),
});

export type WorkflowVariable = z.infer<typeof WorkflowVariableSchema>;

// ============================================================================
// Node Types - Base
// ============================================================================

const BaseNodeSchema = z.object({
  id: z.string(),
  position: NodePositionSchema,
  label: z.string().optional(),
});

// ============================================================================
// Start Node
// ============================================================================

export const StartNodeSchema = BaseNodeSchema.extend({
  type: z.literal('start'),
});

export type StartNode = z.infer<typeof StartNodeSchema>;

// ============================================================================
// End Node
// ============================================================================

export const EndNodeSchema = BaseNodeSchema.extend({
  type: z.literal('end'),
  status: z.enum(['success', 'failure']).optional(),
});

export type EndNode = z.infer<typeof EndNodeSchema>;

// ============================================================================
// Transaction Node
// ============================================================================

export const TransactionNodeConfigSchema = z.object({
  transactionId: z.string(),
  walletId: z.string().optional(),
  args: z.record(z.string(), z.string()).optional(), // Can reference variables: "{{var}}"
  outputVariable: z.string().optional(), // Variable to store result
});

export type TransactionNodeConfig = z.infer<typeof TransactionNodeConfigSchema>;

export const TransactionNodeSchema = BaseNodeSchema.extend({
  type: z.literal('transaction'),
  config: TransactionNodeConfigSchema,
});

export type TransactionNode = z.infer<typeof TransactionNodeSchema>;

// ============================================================================
// Script Node
// ============================================================================

// Output extraction from script logs using regex
export const ScriptOutputExtractionSchema = z.object({
  name: z.string(), // Variable name to store the extracted value
  pattern: z.string(), // Regex pattern with capturing group
  matchGroup: z.number().default(1), // Which capture group to use (default: 1)
  type: z.enum(['string', 'number', 'boolean', 'json']).default('string'), // Type coercion
});

export type ScriptOutputExtraction = z.infer<typeof ScriptOutputExtractionSchema>;

export const ScriptNodeConfigSchema = z.object({
  scriptId: z.string(),
  flags: z.record(z.string(), z.string()).optional(), // Can reference variables
  envVarKeys: z.array(z.string()).optional(),
  outputVariable: z.string().optional(),
  // Output extractions - extract values from script output logs using regex
  extractions: z.array(ScriptOutputExtractionSchema).optional(),
});

export type ScriptNodeConfig = z.infer<typeof ScriptNodeConfigSchema>;

export const ScriptNodeSchema = BaseNodeSchema.extend({
  type: z.literal('script'),
  config: ScriptNodeConfigSchema,
});

export type ScriptNode = z.infer<typeof ScriptNodeSchema>;

// ============================================================================
// Predicate Node (Branching)
// ============================================================================

export const PredicateNodeConfigSchema = z.object({
  expression: PredicateExpressionSchema,
});

export type PredicateNodeConfig = z.infer<typeof PredicateNodeConfigSchema>;

export const PredicateNodeSchema = BaseNodeSchema.extend({
  type: z.literal('predicate'),
  config: PredicateNodeConfigSchema,
});

export type PredicateNode = z.infer<typeof PredicateNodeSchema>;

// ============================================================================
// Adapter Node
// ============================================================================

export const AdapterNodeConfigSchema = z.object({
  adapterId: z.string(), // e.g., 'postgres', 'http', 'slack'
  operation: z.string(), // e.g., 'query', 'insert', 'notify'
  config: z.record(z.string(), z.unknown()), // Adapter-specific config
  inputMappings: z.record(z.string(), z.string()).optional(), // Map workflow vars to adapter inputs
  outputVariable: z.string().optional(),
});

export type AdapterNodeConfig = z.infer<typeof AdapterNodeConfigSchema>;

export const AdapterNodeSchema = BaseNodeSchema.extend({
  type: z.literal('adapter'),
  config: AdapterNodeConfigSchema,
});

export type AdapterNode = z.infer<typeof AdapterNodeSchema>;

// ============================================================================
// Transform Node (Data transformation)
// ============================================================================

export const TransformNodeConfigSchema = z.object({
  mappings: z.array(z.object({
    expression: z.string(),
    outputVariable: z.string(),
  })),
});

export type TransformNodeConfig = z.infer<typeof TransformNodeConfigSchema>;

export const TransformNodeSchema = BaseNodeSchema.extend({
  type: z.literal('transform'),
  config: TransformNodeConfigSchema,
});

export type TransformNode = z.infer<typeof TransformNodeSchema>;

// ============================================================================
// Logging Node
// ============================================================================

export const LoggingNodeConfigSchema = z.object({
  message: z.string(), // Template like "Calculated value: {{result}}"
  level: z.enum(['info', 'warn', 'error']).default('info'),
});

export type LoggingNodeConfig = z.infer<typeof LoggingNodeConfigSchema>;

export const LoggingNodeSchema = BaseNodeSchema.extend({
  type: z.literal('logging'),
  config: LoggingNodeConfigSchema,
});

export type LoggingNode = z.infer<typeof LoggingNodeSchema>;

// ============================================================================
// Union of All Node Types
// ============================================================================

export const WorkflowNodeSchema = z.discriminatedUnion('type', [
  StartNodeSchema,
  EndNodeSchema,
  TransactionNodeSchema,
  ScriptNodeSchema,
  PredicateNodeSchema,
  AdapterNodeSchema,
  TransformNodeSchema,
  LoggingNodeSchema,
]);

export type WorkflowNode = z.infer<typeof WorkflowNodeSchema>;

// Node type literals for type guards
export type WorkflowNodeType = WorkflowNode['type'];

// ============================================================================
// Workflow Edges (Connections)
// ============================================================================

export const WorkflowEdgeSchema = z.object({
  id: z.string(),
  sourceId: z.string(),
  targetId: z.string(),
  sourceHandle: z.string().optional(), // For predicate nodes: 'true' | 'false'
  targetHandle: z.string().optional(),
  label: z.string().optional(),
});

export type WorkflowEdge = z.infer<typeof WorkflowEdgeSchema>;

// ============================================================================
// Workflow Definition
// ============================================================================

export const WorkflowDefinitionSchema = z.object({
  nodes: z.array(WorkflowNodeSchema),
  edges: z.array(WorkflowEdgeSchema),
  variables: z.array(WorkflowVariableSchema).optional(),
});

export type WorkflowDefinition = z.infer<typeof WorkflowDefinitionSchema>;

// ============================================================================
// Workflow Entity (stored in database)
// ============================================================================

export const WorkflowSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  name: z.string(),
  description: z.string().optional(),
  definition: WorkflowDefinitionSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Workflow = z.infer<typeof WorkflowSchema>;

// ============================================================================
// Workflow Run (execution instance)
// ============================================================================

export const WorkflowRunStatusSchema = z.enum([
  'pending',
  'running',
  'completed',
  'failed',
  'cancelled',
  'paused',
]);

export type WorkflowRunStatus = z.infer<typeof WorkflowRunStatusSchema>;

export const WorkflowStepLogSchema = z.object({
  nodeId: z.string(),
  nodeName: z.string().optional(),
  nodeType: z.string(),
  status: z.enum(['pending', 'running', 'completed', 'failed', 'skipped']),
  startedAt: z.string().optional(),
  completedAt: z.string().optional(),
  input: z.unknown().optional(),
  output: z.unknown().optional(),
  error: z.string().optional(),
});

export type WorkflowStepLog = z.infer<typeof WorkflowStepLogSchema>;

export const WorkflowRunSchema = z.object({
  id: z.string(),
  workflowId: z.string(),
  status: WorkflowRunStatusSchema,
  variables: z.record(z.string(), z.unknown()).optional(), // Runtime variable values
  stepLogs: z.array(WorkflowStepLogSchema).default([]),
  error: z.string().optional(),
  startedAt: z.string(),
  completedAt: z.string().optional(),
});

export type WorkflowRun = z.infer<typeof WorkflowRunSchema>;

// ============================================================================
// Helper Types
// ============================================================================

export type CreateWorkflowRequest = {
  workspaceId: string;
  name: string;
  description?: string;
};

export type UpdateWorkflowRequest = {
  name?: string;
  description?: string;
  definition?: WorkflowDefinition;
};

// ============================================================================
// Default Workflow (new workflow template)
// ============================================================================

export function createDefaultWorkflow(): WorkflowDefinition {
  return {
    nodes: [
      {
        id: 'start-1',
        type: 'start',
        position: { x: 250, y: 50 },
        label: 'Start',
      },
      {
        id: 'end-1',
        type: 'end',
        position: { x: 250, y: 400 },
        label: 'End',
        status: 'success',
      },
    ],
    edges: [],
    variables: [],
  };
}

// ============================================================================
// Type Guards
// ============================================================================

export function isStartNode(node: WorkflowNode): node is StartNode {
  return node.type === 'start';
}

export function isEndNode(node: WorkflowNode): node is EndNode {
  return node.type === 'end';
}

export function isTransactionNode(node: WorkflowNode): node is TransactionNode {
  return node.type === 'transaction';
}

export function isScriptNode(node: WorkflowNode): node is ScriptNode {
  return node.type === 'script';
}

export function isPredicateNode(node: WorkflowNode): node is PredicateNode {
  return node.type === 'predicate';
}

export function isAdapterNode(node: WorkflowNode): node is AdapterNode {
  return node.type === 'adapter';
}

export function isTransformNode(node: WorkflowNode): node is TransformNode {
  return node.type === 'transform';
}

export function isLoggingNode(node: WorkflowNode): node is LoggingNode {
  return node.type === 'logging';
}
