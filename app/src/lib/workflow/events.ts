// Workflow execution events for real-time UI updates

import { EventEmitter } from 'events';
import type { WorkflowStepLog, WorkflowRunStatus } from './types';

// Event types for workflow execution
export interface WorkflowExecutionEvents {
  'step:start': (nodeId: string, nodeName: string, nodeType: string) => void;
  'step:complete': (nodeId: string, output?: unknown) => void;
  'step:error': (nodeId: string, error: string) => void;
  'run:start': (runId: string) => void;
  'run:complete': (runId: string, status: WorkflowRunStatus) => void;
  'run:error': (runId: string, error: string) => void;
  'logs:update': (stepLogs: WorkflowStepLog[]) => void;
}

// Type-safe event emitter for workflow execution
class WorkflowEventEmitter extends EventEmitter {
  emit<K extends keyof WorkflowExecutionEvents>(
    event: K,
    ...args: Parameters<WorkflowExecutionEvents[K]>
  ): boolean {
    return super.emit(event, ...args);
  }

  on<K extends keyof WorkflowExecutionEvents>(
    event: K,
    listener: WorkflowExecutionEvents[K]
  ): this {
    return super.on(event, listener);
  }

  off<K extends keyof WorkflowExecutionEvents>(
    event: K,
    listener: WorkflowExecutionEvents[K]
  ): this {
    return super.off(event, listener);
  }

  once<K extends keyof WorkflowExecutionEvents>(
    event: K,
    listener: WorkflowExecutionEvents[K]
  ): this {
    return super.once(event, listener);
  }
}

// Singleton instance for workflow events
export const workflowEvents = new WorkflowEventEmitter();

// Helper to create a scoped emitter for a specific run
export function createRunEmitter(runId: string) {
  return {
    emitStepStart: (nodeId: string, nodeName: string, nodeType: string) => {
      workflowEvents.emit('step:start', nodeId, nodeName, nodeType);
    },
    emitStepComplete: (nodeId: string, output?: unknown) => {
      workflowEvents.emit('step:complete', nodeId, output);
    },
    emitStepError: (nodeId: string, error: string) => {
      workflowEvents.emit('step:error', nodeId, error);
    },
    emitRunStart: () => {
      workflowEvents.emit('run:start', runId);
    },
    emitRunComplete: (status: WorkflowRunStatus) => {
      workflowEvents.emit('run:complete', runId, status);
    },
    emitRunError: (error: string) => {
      workflowEvents.emit('run:error', runId, error);
    },
    emitLogsUpdate: (stepLogs: WorkflowStepLog[]) => {
      workflowEvents.emit('logs:update', stepLogs);
    },
  };
}

export type RunEmitter = ReturnType<typeof createRunEmitter>;
