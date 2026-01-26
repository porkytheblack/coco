'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Play,
  CheckCircle,
  XCircle,
  Clock,
  ChevronRight,
  ChevronDown,
  Activity,
  RefreshCw,
  Bug,
  FileJson,
  Loader2,
  Code
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useWorkflowRuns, useWorkflow } from '@/hooks/use-workflows';
import { queryKeys } from '@/lib/react-query';
import type { WorkflowStepLog, WorkflowRunStatus } from '@/lib/workflow/types';
import { workflowEvents } from '@/lib/workflow/events';
import { clsx } from 'clsx';
import { Terminal } from '@/components/ui';

interface WorkflowRunsPanelProps {
  workflowId: string;
  onRunSelect?: (runId: string) => void;
}

interface ParsedWorkflowRun {
  id: string;
  workflowId: string;
  status: string;
  variables: Record<string, unknown>;
  stepLogs: WorkflowStepLog[];
  error?: string;
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
}

export function WorkflowRunsPanel({ workflowId, onRunSelect }: WorkflowRunsPanelProps) {
  const queryClient = useQueryClient();
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [showDebug, setShowDebug] = useState(false);
  const [liveStepLogs, setLiveStepLogs] = useState<WorkflowStepLog[]>([]);
  const [isLiveExecution, setIsLiveExecution] = useState(false);
  const { data: runsData = [], isLoading, refetch } = useWorkflowRuns(workflowId, true); // Polling enabled
  const { data: workflow } = useWorkflow(showDebug ? workflowId : undefined); // Fetch workflow only in debug

  // Subscribe to live execution events
  useEffect(() => {
    const handleRunStart = () => {
      setIsLiveExecution(true);
      setLiveStepLogs([]);
    };

    const handleLogsUpdate = (logs: WorkflowStepLog[]) => {
      setLiveStepLogs(logs);
    };

    const handleRunComplete = () => {
      setIsLiveExecution(false);
      // Refetch to get the final data from backend
      setTimeout(() => refetch(), 500);
    };

    const handleRunError = () => {
      setIsLiveExecution(false);
      setTimeout(() => refetch(), 500);
    };

    workflowEvents.on('run:start', handleRunStart);
    workflowEvents.on('logs:update', handleLogsUpdate);
    workflowEvents.on('run:complete', handleRunComplete);
    workflowEvents.on('run:error', handleRunError);

    return () => {
      workflowEvents.off('run:start', handleRunStart);
      workflowEvents.off('logs:update', handleLogsUpdate);
      workflowEvents.off('run:complete', handleRunComplete);
      workflowEvents.off('run:error', handleRunError);
    };
  }, [refetch]);

  const handleRefresh = useCallback(() => {
    refetch();
    // Also invalidate to be sure
    queryClient.invalidateQueries({ queryKey: queryKeys.workflowRuns(workflowId) });
  }, [refetch, queryClient, workflowId]);

  // Parse runs data
  const runs = useMemo(() => {
    return runsData.map(run => {
      let stepLogs: WorkflowStepLog[] = [];
      let variables: Record<string, unknown> = {};

      try {
        if (run.stepLogs) stepLogs = JSON.parse(run.stepLogs);
        if (run.variables) variables = JSON.parse(run.variables);
      } catch (e) {
        console.error('Failed to parse run data', e);
      }

      const start = new Date(run.startedAt).getTime();
      const end = run.completedAt ? new Date(run.completedAt).getTime() : Date.now();
      const durationMs = run.status === 'running' ? undefined : (end - start);

      return {
        ...run,
        stepLogs,
        variables,
        durationMs
      } as ParsedWorkflowRun;
    }).sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
  }, [runsData]);

  // For selected run, use live logs if execution is in progress
  const selectedRun = useMemo(() => {
    const run = selectedRunId ? runs.find(r => r.id === selectedRunId) : runs[0];
    if (isLiveExecution && run && run.status === 'running' && liveStepLogs.length > 0) {
      return { ...run, stepLogs: liveStepLogs };
    }
    return run;
  }, [runs, selectedRunId, isLiveExecution, liveStepLogs]);

  // Helper for date formatting
  const formatTime = (dateStr: string) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).format(new Date(dateStr));
  };
  
  const formatDate = (dateStr: string) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric'
    }).format(new Date(dateStr));
  };

  const formatFullDate = (dateStr: string) => {
    return new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
      timeStyle: 'medium'
    }).format(new Date(dateStr));
  };

  if (isLoading && runs.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-coco-text-tertiary">
        Loading runs...
      </div>
    );
  }

  if (runs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-40 text-coco-text-tertiary">
        <Activity className="w-8 h-8 mb-2 opacity-50" />
        <p className="text-sm">No runs yet</p>
      </div>
    );
  }

  return (
    <div className="flex h-full border-t border-coco-border-subtle bg-coco-bg-elevated">
      {/* Runs List */}
      <div className="w-64 border-r border-coco-border-subtle overflow-y-auto">
        <div className="p-2 sticky top-0 bg-coco-bg-elevated border-b border-coco-border-subtle flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-semibold text-coco-text-secondary uppercase tracking-wider">
              Execution History
            </h3>
            {isLiveExecution && (
              <span className="flex items-center gap-1 px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 text-[10px] font-semibold rounded animate-pulse">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                LIVE
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
                onClick={() => setShowDebug(!showDebug)}
                className={`p-1 rounded transition-colors ${showDebug ? 'text-coco-accent bg-coco-bg-tertiary' : 'text-coco-text-tertiary hover:text-coco-text-primary'}`}
                title="Toggle Debug View"
            >
                <Bug className="w-3 h-3" />
            </button>
            <button
                onClick={handleRefresh}
                className={clsx(
                  "p-1 hover:bg-coco-bg-tertiary rounded text-coco-text-tertiary hover:text-coco-text-primary transition-colors",
                  isLiveExecution && "animate-spin"
                )}
                title="Refresh runs"
                disabled={isLiveExecution}
            >
                <RefreshCw className="w-3 h-3" />
            </button>
          </div>
        </div>
        <div>
          {runs.map(run => (
            <button
              key={run.id}
              onClick={() => {
                setSelectedRunId(run.id);
                onRunSelect?.(run.id);
              }}
              className={clsx(
                "w-full text-left px-3 py-2 text-sm flex items-center justify-between hover:bg-coco-bg-tertiary transition-colors",
                ((selectedRunId === run.id) || (!selectedRunId && runs[0]?.id === run.id)) && "bg-coco-bg-tertiary border-l-2 border-coco-accent"
              )}
            >
              <div className="flex items-center gap-2">
                <StatusIcon status={run.status} className="w-4 h-4" />
                <div className="flex flex-col">
                  <span className="font-medium text-coco-text-primary">
                    {run.status === 'running' ? 'Running...' : formatTime(run.startedAt)}
                  </span>
                  <span className="text-xs text-coco-text-tertiary">
                    {formatDate(run.startedAt)}
                  </span>
                </div>
              </div>
              {run.durationMs !== undefined && (
                <span className="text-xs text-coco-text-tertiary font-mono">
                  {(run.durationMs / 1000).toFixed(1)}s
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Run Details */}
      {selectedRun && (
        <div className="flex-1 overflow-y-auto p-4 font-mono text-sm">
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-coco-border-subtle">
              <div className="flex items-center gap-3">
                <StatusIcon status={selectedRun.status} className="w-5 h-5" />
                <div>
                  <h2 className="font-semibold text-coco-text-primary">
                    Execution #{selectedRun.id.slice(-4)}
                  </h2>
                  <p className="text-xs text-coco-text-tertiary">
                    Started {formatFullDate(selectedRun.startedAt)}
                  </p>
                </div>
              </div>
              {selectedRun.durationMs !== undefined && (
                <div className="flex items-center gap-1 text-coco-text-secondary">
                  <Clock className="w-4 h-4" />
                  <span>{(selectedRun.durationMs / 1000).toFixed(2)}s</span>
                </div>
              )}
            </div>

            {/* Error Message */}
            {selectedRun.error && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-400">
                <p className="font-semibold">Error:</p>
                <p className="whitespace-pre-wrap">{selectedRun.error}</p>
              </div>
            )}

            {/* Step Logs */}
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-coco-text-secondary uppercase tracking-wider mb-2">
                Steps ({selectedRun.stepLogs.length})
              </h3>
              {selectedRun.stepLogs.length === 0 ? (
                <div className="p-4 bg-coco-bg-tertiary/20 rounded border border-coco-border-subtle border-dashed text-center">
                    <p className="text-coco-text-tertiary italic">No steps recorded</p>
                    <p className="text-xs text-coco-text-tertiary mt-1">If this run just started, click Refresh.</p>
                </div>
              ) : (
                selectedRun.stepLogs.map((log, index) => (
                  <StepLogItem key={index} log={log} />
                ))
              )}
            </div>

            {/* Debug View */}
            {showDebug && (
                <div className="mt-8 pt-4 border-t border-coco-border-subtle space-y-4">
                    <div>
                        <h3 className="text-xs font-semibold text-coco-text-secondary uppercase tracking-wider mb-2 flex items-center gap-2">
                            <Activity className="w-3 h-3" /> Run Data
                        </h3>
                        <pre className="text-xs bg-black/50 p-4 rounded overflow-auto h-40">
                            {JSON.stringify(selectedRun, null, 2)}
                        </pre>
                    </div>

                    {workflow && (
                        <div>
                            <h3 className="text-xs font-semibold text-coco-text-secondary uppercase tracking-wider mb-2 flex items-center gap-2">
                                <FileJson className="w-3 h-3" /> Workflow Definition (Backend)
                            </h3>
                            <div className="text-xs text-coco-text-tertiary mb-2">
                                Check if this matches your canvas. If empty/stale, Save didn't work.
                            </div>
                            <pre className="text-xs bg-black/50 p-4 rounded overflow-auto h-60">
                                {workflow.definition}
                            </pre>
                        </div>
                    )}
                </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StepLogItem({ log }: { log: WorkflowStepLog }) {
  const [isOpen, setIsOpen] = useState(false);

  // Check if this is a script node with output logs
  const isScriptNode = log.nodeType === 'script';
  const scriptOutput = isScriptNode && log.output
    ? (typeof log.output === 'object' && log.output !== null)
      ? (log.output as { output?: string }).output || ''
      : ''
    : '';

  // Get extracted values from script output for display
  const extractedValues: Record<string, string> | null = useMemo(() => {
    if (!isScriptNode || !log.output || typeof log.output !== 'object') return null;
    const output = log.output as Record<string, unknown>;
    const extracted: Record<string, string> = {};
    for (const [key, value] of Object.entries(output)) {
      if (key !== 'is_success' && key !== 'output' && key !== 'error') {
        extracted[key] = value === null || value === undefined
          ? 'null'
          : typeof value === 'object'
          ? JSON.stringify(value)
          : String(value);
      }
    }
    return Object.keys(extracted).length > 0 ? extracted : null;
  }, [isScriptNode, log.output]);

  return (
    <div className="border border-coco-border-subtle rounded-lg bg-coco-bg-primary overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-2 hover:bg-coco-bg-tertiary transition-colors"
      >
        <div className="flex items-center gap-2">
          {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          <StatusIcon status={log.status} className="w-4 h-4" />
          <span className="font-medium text-coco-text-primary">
            {log.nodeName || log.nodeType}
          </span>
          <span className="text-xs text-coco-text-tertiary bg-coco-bg-tertiary px-1.5 py-0.5 rounded">
            {log.nodeType}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {isScriptNode && scriptOutput && (
            <span title="Has script logs">
              <Code className="w-3 h-3 text-green-400" />
            </span>
          )}
          {log.error && <span className="text-xs text-rose-400">Failed</span>}
        </div>
      </button>

      {isOpen && (
        <div className="p-3 border-t border-coco-border-subtle space-y-3 bg-coco-bg-elevated">
          {log.error && (
            <div>
              <span className="text-xs font-semibold text-rose-400 block mb-1">Error</span>
              <pre className="text-xs bg-coco-bg-primary p-2 rounded text-rose-300 overflow-x-auto">
                {log.error}
              </pre>
            </div>
          )}

          {!!log.input && (
            <div>
              <span className="text-xs font-semibold text-coco-text-secondary block mb-1">Input</span>
              <pre className="text-xs bg-coco-bg-primary p-2 rounded text-coco-text-primary overflow-x-auto">
                {JSON.stringify(log.input, null, 2)}
              </pre>
            </div>
          )}

          {/* Script Terminal Output */}
          {isScriptNode && scriptOutput && (
            <div>
              <span className="text-xs font-semibold text-coco-text-secondary block mb-1 flex items-center gap-1.5">
                <Code className="w-3 h-3 text-green-400" />
                Script Logs
              </span>
              <Terminal
                lines={scriptOutput.split('\n')}
                showToolbar
                title={log.nodeName || 'Script Output'}
                status={log.status === 'completed' ? 'success' : log.status === 'failed' ? 'error' : 'idle'}
                maxHeight="200px"
                enableColors
              />
            </div>
          )}

          {/* Extracted Values */}
          {extractedValues !== null && <ExtractedValuesDisplay values={extractedValues} />}

          {/* Non-script output */}
          {!!log.output && !isScriptNode && (
            <div>
              <span className="text-xs font-semibold text-coco-text-secondary block mb-1">Output</span>
              <pre className="text-xs bg-coco-bg-primary p-2 rounded text-coco-text-primary overflow-x-auto">
                {JSON.stringify(log.output, null, 2)}
              </pre>
            </div>
          )}

          {/* Script success status */}
          {isScriptNode && !!log.output && typeof log.output === 'object' && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-coco-text-tertiary">Status:</span>
              {(log.output as { is_success?: boolean }).is_success ? (
                <span className="text-emerald-400 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  Success
                </span>
              ) : (
                <span className="text-rose-400 flex items-center gap-1">
                  <XCircle className="w-3 h-3" />
                  Failed
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ExtractedValuesDisplay({ values }: { values: Record<string, string> }) {
  return (
    <div>
      <span className="text-xs font-semibold text-emerald-400 block mb-1">Extracted Values</span>
      <div className="grid gap-1">
        {Object.entries(values).map(([key, val]) => (
          <div key={key} className="flex items-center gap-2 text-xs bg-emerald-500/10 px-2 py-1 rounded">
            <span className="font-mono text-emerald-300">{key}:</span>
            <span className="text-coco-text-primary font-mono truncate">{val}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusIcon({ status, className }: { status: string; className?: string }) {
  switch (status) {
    case 'completed':
    case 'success':
      return <CheckCircle className={clsx("text-emerald-400", className)} />;
    case 'failed':
      return <XCircle className={clsx("text-rose-400", className)} />;
    case 'running':
    case 'pending': // Handle pending effectively as waiting for run
      return <Activity className={clsx("text-blue-400", status === 'running' && "animate-pulse", className)} />;
    default:
      return <Clock className={clsx("text-coco-text-tertiary", className)} />;
  }
}
