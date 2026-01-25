import { z } from 'zod';
import { Effect } from 'effect';
import type { WorkflowAdapterWithUI, AdapterOperation, AdapterResult, AdapterConfigField } from './types';
import { AdapterError } from './types';

// ============================================================================
// PostgreSQL Adapter
// ============================================================================
// 
// This adapter provides integration with PostgreSQL databases, allowing workflows
// to execute queries, inserts, updates, and deletes as part of the pipeline.
//
// ## Configuration
// 
// The adapter requires a PostgreSQL connection string in the format:
// `postgresql://user:password@host:port/database`
//
// Optionally, you can enable SSL and configure connection pooling.
//
// ## Operations
//
// - **query**: Execute a SELECT query and return rows
// - **insert**: Insert one or more rows into a table
// - **update**: Update rows matching a condition
// - **delete**: Delete rows matching a condition
// - **execute**: Execute arbitrary SQL (for advanced use cases)
//
// ## Security Considerations
//
// - Connection strings are stored securely in Tauri's secure storage
// - Always use parameterized queries to prevent SQL injection
// - The adapter validates inputs before executing queries
//
// ## Example Usage in Workflow
//
// ```json
// {
//   "type": "adapter",
//   "config": {
//     "adapterId": "postgres",
//     "operation": "query",
//     "config": {
//       "connectionString": "postgresql://user:pass@localhost:5432/mydb"
//     },
//     "inputMappings": {
//       "query": "SELECT * FROM users WHERE id = $1",
//       "params": "{{userId}}"
//     },
//     "outputVariable": "userRecord"
//   }
// }
// ```
//
// ============================================================================

// ============================================================================
// Configuration Schema
// ============================================================================

export const PostgresConfigSchema = z.object({
  /**
   * PostgreSQL connection string.
   * Format: postgresql://[user]:[password]@[host]:[port]/[database]
   */
  connectionString: z.string().min(1, 'Connection string is required'),
  
  /**
   * Whether to use SSL for the connection.
   * @default false
   */
  ssl: z.boolean().optional().default(false),
  
  /**
   * SSL mode: 'require', 'prefer', 'verify-full', etc.
   */
  sslMode: z.enum(['disable', 'prefer', 'require', 'verify-ca', 'verify-full']).optional(),
  
  /**
   * Connection timeout in milliseconds.
   * @default 5000
   */
  connectionTimeout: z.number().int().positive().optional().default(5000),
  
  /**
   * Query timeout in milliseconds.
   * @default 30000
   */
  queryTimeout: z.number().int().positive().optional().default(30000),
});

export type PostgresConfig = z.infer<typeof PostgresConfigSchema>;

// ============================================================================
// Operation Input Schemas
// ============================================================================

export const QueryInputSchema = z.object({
  /**
   * SQL query to execute.
   * Use $1, $2, etc. for parameter placeholders.
   */
  query: z.string().min(1, 'Query is required'),
  
  /**
   * Parameters to bind to the query.
   * These replace $1, $2, etc. in the query string.
   */
  params: z.array(z.unknown()).optional().default([]),
});

export const InsertInputSchema = z.object({
  /**
   * Table name to insert into.
   */
  table: z.string().min(1, 'Table name is required'),
  
  /**
   * Data to insert. Can be a single object or an array of objects.
   */
  data: z.union([
    z.record(z.string(), z.unknown()),
    z.array(z.record(z.string(), z.unknown())),
  ]),
  
  /**
   * Columns to return after insert.
   * @default ['*']
   */
  returning: z.array(z.string()).optional(),
});

export const UpdateInputSchema = z.object({
  /**
   * Table name to update.
   */
  table: z.string().min(1, 'Table name is required'),
  
  /**
   * Data to set. Key-value pairs of column names and values.
   */
  data: z.record(z.string(), z.unknown()),
  
  /**
   * WHERE clause for the update.
   * Use $1, $2, etc. for parameter placeholders.
   */
  where: z.string().min(1, 'WHERE clause is required'),
  
  /**
   * Parameters for the WHERE clause.
   */
  whereParams: z.array(z.unknown()).optional().default([]),
  
  /**
   * Columns to return after update.
   */
  returning: z.array(z.string()).optional(),
});

export const DeleteInputSchema = z.object({
  /**
   * Table name to delete from.
   */
  table: z.string().min(1, 'Table name is required'),
  
  /**
   * WHERE clause for the delete.
   * Use $1, $2, etc. for parameter placeholders.
   */
  where: z.string().min(1, 'WHERE clause is required'),
  
  /**
   * Parameters for the WHERE clause.
   */
  whereParams: z.array(z.unknown()).optional().default([]),
  
  /**
   * Columns to return from deleted rows.
   */
  returning: z.array(z.string()).optional(),
});

export const ExecuteInputSchema = z.object({
  /**
   * SQL statement to execute.
   */
  sql: z.string().min(1, 'SQL is required'),
  
  /**
   * Parameters for the SQL statement.
   */
  params: z.array(z.unknown()).optional().default([]),
});

// ============================================================================
// Operations
// ============================================================================

const queryOperation: AdapterOperation = {
  id: 'query',
  name: 'Query',
  description: 'Execute a SELECT query and return rows',
  inputSchema: QueryInputSchema,
  examples: [
    {
      name: 'Simple Select',
      input: {
        query: 'SELECT * FROM users LIMIT 10',
        params: [],
      },
    },
    {
      name: 'Parameterized Query',
      input: {
        query: 'SELECT * FROM users WHERE id = $1 AND status = $2',
        params: [123, 'active'],
      },
    },
  ],
};

const insertOperation: AdapterOperation = {
  id: 'insert',
  name: 'Insert',
  description: 'Insert one or more rows into a table',
  inputSchema: InsertInputSchema,
  examples: [
    {
      name: 'Single Insert',
      input: {
        table: 'users',
        data: { name: 'John', email: 'john@example.com' },
        returning: ['id', 'created_at'],
      },
    },
    {
      name: 'Batch Insert',
      input: {
        table: 'users',
        data: [
          { name: 'John', email: 'john@example.com' },
          { name: 'Jane', email: 'jane@example.com' },
        ],
      },
    },
  ],
};

const updateOperation: AdapterOperation = {
  id: 'update',
  name: 'Update',
  description: 'Update rows matching a condition',
  inputSchema: UpdateInputSchema,
  examples: [
    {
      name: 'Update by ID',
      input: {
        table: 'users',
        data: { status: 'inactive', updated_at: 'NOW()' },
        where: 'id = $1',
        whereParams: [123],
        returning: ['*'],
      },
    },
  ],
};

const deleteOperation: AdapterOperation = {
  id: 'delete',
  name: 'Delete',
  description: 'Delete rows matching a condition',
  inputSchema: DeleteInputSchema,
  examples: [
    {
      name: 'Delete by ID',
      input: {
        table: 'users',
        where: 'id = $1',
        whereParams: [123],
      },
    },
  ],
};

const executeOperation: AdapterOperation = {
  id: 'execute',
  name: 'Execute SQL',
  description: 'Execute arbitrary SQL (for advanced use cases)',
  inputSchema: ExecuteInputSchema,
  examples: [
    {
      name: 'Create Table',
      input: {
        sql: 'CREATE TABLE IF NOT EXISTS logs (id SERIAL PRIMARY KEY, message TEXT)',
        params: [],
      },
    },
  ],
};

// ============================================================================
// Configuration Fields for UI
// ============================================================================

const configFields: AdapterConfigField[] = [
  {
    name: 'connectionString',
    label: 'Connection String',
    type: 'password',
    description: 'PostgreSQL connection string (postgresql://user:pass@host:port/db)',
    placeholder: 'postgresql://user:password@localhost:5432/database',
    required: true,
  },
  {
    name: 'ssl',
    label: 'Enable SSL',
    type: 'boolean',
    description: 'Use SSL/TLS for the database connection',
    required: false,
  },
  {
    name: 'sslMode',
    label: 'SSL Mode',
    type: 'select',
    description: 'SSL connection mode',
    options: [
      { label: 'Disable', value: 'disable' },
      { label: 'Prefer', value: 'prefer' },
      { label: 'Require', value: 'require' },
      { label: 'Verify CA', value: 'verify-ca' },
      { label: 'Verify Full', value: 'verify-full' },
    ],
    required: false,
  },
  {
    name: 'connectionTimeout',
    label: 'Connection Timeout (ms)',
    type: 'number',
    description: 'Timeout for establishing connection',
    placeholder: '5000',
    required: false,
  },
  {
    name: 'queryTimeout',
    label: 'Query Timeout (ms)',
    type: 'number',
    description: 'Timeout for query execution',
    placeholder: '30000',
    required: false,
  },
];

// ============================================================================
// Adapter Implementation
// ============================================================================

/**
 * PostgreSQL adapter for workflow integration.
 * 
 * This adapter allows workflows to interact with PostgreSQL databases,
 * enabling data lookups, inserts, updates, and deletes as part of the
 * automation pipeline.
 * 
 * ## Building Custom Adapters
 * 
 * To create a new adapter based on this implementation:
 * 
 * 1. Define a configuration schema using Zod
 * 2. Define operation input schemas for each operation
 * 3. Implement the execute function that handles each operation
 * 4. Optionally implement testConnection for configuration validation
 * 5. Register the adapter with the adapter registry
 * 
 * @see {@link WorkflowAdapterWithUI} for the full interface specification
 */
export const postgresAdapter: WorkflowAdapterWithUI<PostgresConfig> = {
  id: 'postgres',
  name: 'PostgreSQL',
  description: 'Execute queries and commands on a PostgreSQL database',
  icon: 'database',
  configSchema: PostgresConfigSchema,
  configFields,
  operations: {
    query: queryOperation,
    insert: insertOperation,
    update: updateOperation,
    delete: deleteOperation,
    execute: executeOperation,
  },
  
  execute: (config: PostgresConfig, operation: string, input: Record<string, unknown>) => {
    // NOTE: Actual PostgreSQL execution will be handled by Tauri backend
    // This adapter prepares the request and the backend handles the connection
    
    return Effect.tryPromise({
      try: async () => {
        // Validate the operation exists
        const op = postgresAdapter.operations[operation];
        if (!op) {
          throw new Error(`Unknown operation: ${operation}`);
        }
        
        // Validate input against schema
        const validatedInput = op.inputSchema.parse(input);
        
        // In production, this would call the Tauri backend
        // For now, we return a placeholder that the runtime will intercept
        const result: AdapterResult = {
          success: true,
          data: {
            _adapter: 'postgres',
            _operation: operation,
            _config: config,
            _input: validatedInput,
          },
          metadata: {
            timestamp: new Date().toISOString(),
          },
        };
        
        return result;
      },
      catch: (e) => new AdapterError(
        'postgres',
        operation,
        e instanceof Error ? e.message : String(e),
        e
      ),
    });
  },
  
  testConnection: (config: PostgresConfig) => {
    return Effect.tryPromise({
      try: async () => {
        // In production, this would call the Tauri backend to test the connection
        // For now, we just validate the config format
        PostgresConfigSchema.parse(config);
        return true;
      },
      catch: (e) => new AdapterError(
        'postgres',
        'testConnection',
        e instanceof Error ? e.message : String(e),
        e
      ),
    });
  },
};
