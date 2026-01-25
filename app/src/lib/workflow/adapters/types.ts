import { z } from 'zod';
import { Effect } from 'effect';

// ============================================================================
// Adapter Error Type
// ============================================================================

export class AdapterError {
  readonly _tag = 'AdapterError';
  constructor(
    public readonly adapterId: string,
    public readonly operation: string,
    public readonly message: string,
    public readonly cause?: unknown
  ) {}
}

// ============================================================================
// Adapter Result Type
// ============================================================================

export interface AdapterResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Adapter Interface
// ============================================================================

/**
 * Base interface for all workflow adapters.
 * Adapters provide integration with external services like databases, APIs, etc.
 * 
 * @template TConfig - The configuration schema for connecting to the service
 * @template TOperation - The operations this adapter supports
 * 
 * @example
 * ```typescript
 * const postgresAdapter: WorkflowAdapter = {
 *   id: 'postgres',
 *   name: 'PostgreSQL',
 *   description: 'Execute queries on a PostgreSQL database',
 *   configSchema: PostgresConfigSchema,
 *   operations: {
 *     query: { ... },
 *     insert: { ... },
 *   },
 *   execute: (config, operation, input) => { ... }
 * };
 * ```
 */
export interface WorkflowAdapter<
  TConfig = unknown,
  TOperations extends Record<string, AdapterOperation> = Record<string, AdapterOperation>
> {
  /** Unique identifier for this adapter */
  id: string;
  
  /** Human-readable name */
  name: string;
  
  /** Description of what this adapter does */
  description: string;
  
  /** Icon identifier for UI display */
  icon?: string;
  
  /** Zod schema for validating adapter configuration */
  configSchema: z.ZodSchema<TConfig>;
  
  /** Available operations for this adapter */
  operations: TOperations;
  
  /**
   * Execute an operation on this adapter.
   * 
   * @param config - Validated adapter configuration
   * @param operation - The operation to perform
   * @param input - Operation-specific input data
   * @returns Effect that resolves to the operation result
   */
  execute: (
    config: TConfig,
    operation: string,
    input: Record<string, unknown>
  ) => Effect.Effect<AdapterResult, AdapterError>;
  
  /**
   * Optional: Test the connection/configuration.
   * Used to validate configuration before running the workflow.
   */
  testConnection?: (config: TConfig) => Effect.Effect<boolean, AdapterError>;
}

// ============================================================================
// Adapter Operation Definition
// ============================================================================

/**
 * Definition of a single operation an adapter can perform.
 */
export interface AdapterOperation {
  /** Operation identifier */
  id: string;
  
  /** Human-readable name */
  name: string;
  
  /** Description of what this operation does */
  description: string;
  
  /** Schema for validating operation input */
  inputSchema: z.ZodSchema;
  
  /** Schema describing the output shape */
  outputSchema?: z.ZodSchema;
  
  /** Optional example inputs for documentation */
  examples?: {
    name: string;
    input: Record<string, unknown>;
    description?: string;
  }[];
}

// ============================================================================
// Adapter Configuration Field Types
// ============================================================================

/**
 * Represents a configuration field for the UI.
 */
export interface AdapterConfigField {
  name: string;
  label: string;
  type: 'text' | 'password' | 'number' | 'boolean' | 'select' | 'textarea';
  description?: string;
  placeholder?: string;
  required?: boolean;
  options?: { label: string; value: string }[]; // For select type
}

/**
 * Extended adapter interface with UI hints.
 */
export interface WorkflowAdapterWithUI<
  TConfig = unknown,
  TOperations extends Record<string, AdapterOperation> = Record<string, AdapterOperation>
> extends WorkflowAdapter<TConfig, TOperations> {
  /** Configuration fields for building the UI form */
  configFields: AdapterConfigField[];
}

// ============================================================================
// Adapter Registry Interface
// ============================================================================

export interface AdapterRegistry {
  /**
   * Register a new adapter.
   */
  register: (adapter: WorkflowAdapter) => void;
  
  /**
   * Get an adapter by ID.
   */
  get: (id: string) => WorkflowAdapter | undefined;
  
  /**
   * Get all registered adapters.
   */
  getAll: () => WorkflowAdapter[];
  
  /**
   * Execute an operation on an adapter.
   */
  execute: (
    adapterId: string,
    operation: string,
    config: Record<string, unknown>,
    input: Record<string, unknown>
  ) => Effect.Effect<AdapterResult, AdapterError>;
}

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Validate adapter configuration against its schema.
 */
export function validateConfig<TConfig>(
  adapter: WorkflowAdapter<TConfig>,
  config: unknown
): Effect.Effect<TConfig, AdapterError> {
  return Effect.try({
    try: () => adapter.configSchema.parse(config) as TConfig,
    catch: (e) => new AdapterError(
      adapter.id,
      'validateConfig',
      `Invalid configuration: ${e instanceof Error ? e.message : String(e)}`
    ),
  });
}

/**
 * Validate operation input against its schema.
 */
export function validateOperationInput(
  adapter: WorkflowAdapter,
  operationId: string,
  input: unknown
): Effect.Effect<Record<string, unknown>, AdapterError> {
  const operation = adapter.operations[operationId];
  if (!operation) {
    return Effect.fail(new AdapterError(
      adapter.id,
      operationId,
      `Unknown operation: ${operationId}`
    ));
  }
  
  return Effect.try({
    try: () => operation.inputSchema.parse(input) as Record<string, unknown>,
    catch: (e) => new AdapterError(
      adapter.id,
      operationId,
      `Invalid input: ${e instanceof Error ? e.message : String(e)}`
    ),
  });
}
