import { Effect, pipe } from 'effect';
import type { WorkflowAdapter, AdapterResult, AdapterRegistry } from './types';
import { AdapterError, validateConfig, validateOperationInput } from './types';
import { postgresAdapter } from './postgres';

// ============================================================================
// Adapter Registry Implementation
// ============================================================================

class AdapterRegistryImpl implements AdapterRegistry {
  private adapters: Map<string, WorkflowAdapter> = new Map();
  
  constructor() {
    // Register built-in adapters (cast to base type for storage)
    this.register(postgresAdapter as unknown as WorkflowAdapter);
  }
  
  register(adapter: WorkflowAdapter): void {
    this.adapters.set(adapter.id, adapter);
  }
  
  get(id: string): WorkflowAdapter | undefined {
    return this.adapters.get(id);
  }
  
  getAll(): WorkflowAdapter[] {
    return Array.from(this.adapters.values());
  }
  
  execute(
    adapterId: string,
    operation: string,
    config: Record<string, unknown>,
    input: Record<string, unknown>
  ): Effect.Effect<AdapterResult, AdapterError> {
    const adapter = this.adapters.get(adapterId);
    
    if (!adapter) {
      return Effect.fail(new AdapterError(
        adapterId,
        operation,
        `Adapter not found: ${adapterId}`
      ));
    }
    
    return pipe(
      // Validate configuration
      validateConfig(adapter, config),
      // Validate operation input
      Effect.flatMap((validConfig) =>
        pipe(
          validateOperationInput(adapter, operation, input),
          Effect.map((validInput) => ({ validConfig, validInput }))
        )
      ),
      // Execute the operation
      Effect.flatMap(({ validConfig, validInput }) =>
        adapter.execute(validConfig, operation, validInput)
      )
    );
  }
}

// ============================================================================
// Singleton Registry Instance
// ============================================================================

let registryInstance: AdapterRegistryImpl | null = null;

/**
 * Get the global adapter registry.
 * Creates the registry on first call and registers built-in adapters.
 */
export function getAdapterRegistry(): AdapterRegistry {
  if (!registryInstance) {
    registryInstance = new AdapterRegistryImpl();
  }
  return registryInstance;
}

/**
 * Register a custom adapter with the global registry.
 */
export function registerAdapter(adapter: WorkflowAdapter): void {
  getAdapterRegistry().register(adapter);
}

/**
 * Get an adapter by ID from the global registry.
 */
export function getAdapter(id: string): WorkflowAdapter | undefined {
  return getAdapterRegistry().get(id);
}

/**
 * Get all registered adapters.
 */
export function getAllAdapters(): WorkflowAdapter[] {
  return getAdapterRegistry().getAll();
}

/**
 * Execute an adapter operation.
 */
export function executeAdapter(
  adapterId: string,
  operation: string,
  config: Record<string, unknown>,
  input: Record<string, unknown>
): Effect.Effect<AdapterResult, AdapterError> {
  return getAdapterRegistry().execute(adapterId, operation, config, input);
}
