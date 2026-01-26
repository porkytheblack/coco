'use client';

import { useState, useEffect } from 'react';
import { Play, Square, ChevronDown, ChevronUp, Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Drawer, Button, Input, Badge, Terminal } from '@/components/ui';
import {
  useScriptFlags,
  useScriptRun,
  useScriptRuns,
  useScriptRunLogs,
  useStartScriptAsync,
  useCancelScriptRun,
  useEnvVars,
} from '@/hooks';
import { useToastStore } from '@/stores';
import type { Script, ScriptFlag, ScriptRunStatus } from '@/types';

interface ScriptRunPanelProps {
  script: Script;
  workspaceId: string;
  onClose: () => void;
}

type BadgeVariant = 'wallet' | 'contract' | 'success' | 'error' | 'pending' | 'cancelled';

// Note: Backend returns 'success' not 'completed'
const statusConfig: Record<ScriptRunStatus, { icon: typeof CheckCircle; color: string; label: string; badge: BadgeVariant }> = {
  pending: { icon: Clock, color: 'text-yellow-500', label: 'Pending', badge: 'pending' },
  running: { icon: Loader2, color: 'text-blue-500', label: 'Running', badge: 'pending' },
  success: { icon: CheckCircle, color: 'text-green-500', label: 'Success', badge: 'success' },
  failed: { icon: XCircle, color: 'text-red-500', label: 'Failed', badge: 'error' },
  cancelled: { icon: Square, color: 'text-gray-500', label: 'Cancelled', badge: 'cancelled' },
};

export function ScriptRunPanel({ script, workspaceId, onClose }: ScriptRunPanelProps) {
  const [flagValues, setFlagValues] = useState<Record<string, string>>({});
  const [selectedEnvKeys, setSelectedEnvKeys] = useState<string[]>([]);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const { data: flags = [] } = useScriptFlags(script.id);
  const { data: runs = [] } = useScriptRuns(script.id);
  const { data: envVars = [] } = useEnvVars(workspaceId);

  // Get current run with polling when running
  const { data: currentRun } = useScriptRun(
    activeRunId ?? undefined,
    !!activeRunId // Enable polling when we have an active run
  );

  const isRunning = currentRun?.status === 'running' || currentRun?.status === 'pending';

  // Fetch logs - poll while running, fetch once more when completed
  const { data: logs = '', refetch: refetchLogs } = useScriptRunLogs(
    activeRunId ?? undefined,
    isRunning // Poll while running
  );

  // Refetch logs once when script completes to get final output
  useEffect(() => {
    if (activeRunId && currentRun && !isRunning) {
      refetchLogs();
    }
  }, [activeRunId, currentRun, isRunning, refetchLogs]);

  const startScript = useStartScriptAsync();
  const cancelScript = useCancelScriptRun();
  const { addToast } = useToastStore();

  // Initialize flag values with defaults
  useEffect(() => {
    const defaults: Record<string, string> = {};
    flags.forEach((flag) => {
      if (flag.defaultValue) {
        defaults[flag.flagName] = flag.defaultValue;
      }
    });
    setFlagValues((prev) => ({ ...defaults, ...prev }));
  }, [flags]);

  const handleRun = async () => {
    // Validate required flags
    const missingRequired = flags.filter(
      (f) => f.required && !flagValues[f.flagName]?.trim()
    );
    if (missingRequired.length > 0) {
      addToast({
        type: 'error',
        title: 'Missing required flags',
        message: `Please fill in: ${missingRequired.map((f) => f.flagName).join(', ')}`,
      });
      return;
    }

    try {
      const run = await startScript.mutateAsync({
        scriptId: script.id,
        flags: Object.keys(flagValues).length > 0 ? flagValues : undefined,
        envVarKeys: selectedEnvKeys.length > 0 ? selectedEnvKeys : undefined,
      });
      setActiveRunId(run.id);
      addToast({
        type: 'success',
        title: 'Script started',
        message: `"${script.name}" is now running`,
      });
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Failed to start script',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  const handleCancel = async () => {
    if (!activeRunId) return;

    try {
      await cancelScript.mutateAsync({ runId: activeRunId, scriptId: script.id });
      addToast({
        type: 'info',
        title: 'Script cancelled',
        message: `"${script.name}" has been cancelled`,
      });
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Failed to cancel script',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  const handleFlagChange = (flagName: string, value: string) => {
    setFlagValues((prev) => ({ ...prev, [flagName]: value }));
  };

  const toggleEnvKey = (key: string) => {
    setSelectedEnvKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const renderFlagInput = (flag: ScriptFlag) => {
    const value = flagValues[flag.flagName] || '';

    if (flag.flagType === 'boolean') {
      return (
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={value === 'true'}
            onChange={(e) => handleFlagChange(flag.flagName, e.target.checked ? 'true' : 'false')}
            className="w-4 h-4 rounded border-coco-border-default"
          />
          <span className="text-sm text-coco-text-primary">{flag.flagName}</span>
          {flag.required && <span className="text-red-500">*</span>}
        </label>
      );
    }

    return (
      <Input
        label={`${flag.flagName}${flag.required ? ' *' : ''}`}
        type={flag.flagType === 'number' ? 'number' : 'text'}
        value={value}
        onChange={(e) => handleFlagChange(flag.flagName, e.target.value)}
        placeholder={flag.description || `Enter ${flag.flagName}`}
        hint={flag.description}
      />
    );
  };

  // Build title with status indicator
  const titleContent = currentRun
    ? `${script.name} - ${statusConfig[currentRun.status].label}`
    : script.name;

  return (
    <Drawer
      isOpen={true}
      onClose={onClose}
      title={titleContent}
      footer={
        <div className="flex items-center justify-between">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          <div className="flex items-center gap-2">
            {isRunning ? (
              <Button
                variant="danger"
                onClick={handleCancel}
                disabled={cancelScript.isPending}
                className="flex items-center gap-2"
              >
                <Square className="w-4 h-4" />
                {cancelScript.isPending ? 'Cancelling...' : 'Cancel'}
              </Button>
            ) : (
              <Button
                variant="primary"
                onClick={handleRun}
                disabled={startScript.isPending}
                className="flex items-center gap-2"
              >
                <Play className="w-4 h-4" />
                {startScript.isPending ? 'Starting...' : 'Run Script'}
              </Button>
            )}
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Status Badge */}
        {currentRun && (
          <div className="flex items-center gap-2">
            <Badge variant={statusConfig[currentRun.status].badge}>
              {statusConfig[currentRun.status].label}
            </Badge>
            {currentRun.durationMs && (
              <span className="text-xs text-coco-text-tertiary">
                {(currentRun.durationMs / 1000).toFixed(1)}s
              </span>
            )}
          </div>
        )}

        {/* Script Info */}
        <div className="text-sm text-coco-text-secondary">
          <p className="font-mono bg-coco-bg-tertiary px-2 py-1 rounded">{script.filePath}</p>
          {script.description && <p className="mt-2">{script.description}</p>}
        </div>

        {/* Flags */}
        {flags.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-coco-text-primary">Flags</h3>
            {flags.map((flag) => (
              <div key={flag.id}>{renderFlagInput(flag)}</div>
            ))}
          </div>
        )}

        {/* Environment Variables */}
        {envVars.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-coco-text-primary">Environment Variables</h3>
            <div className="flex flex-wrap gap-2">
              {envVars.map((envVar) => (
                <button
                  key={envVar.id}
                  onClick={() => toggleEnvKey(envVar.key)}
                  className={`px-3 py-1 text-sm rounded-full transition-colors ${
                    selectedEnvKeys.includes(envVar.key)
                      ? 'bg-coco-accent text-white'
                      : 'bg-coco-bg-tertiary text-coco-text-secondary hover:bg-coco-bg-primary'
                  }`}
                >
                  {envVar.key}
                </button>
              ))}
            </div>
            <p className="text-xs text-coco-text-tertiary">
              Selected variables will be injected into the script environment
            </p>
          </div>
        )}

        {/* Logs */}
        {activeRunId && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-coco-text-primary">Output</h3>
            <Terminal
              lines={logs ? logs.split('\n') : []}
              showToolbar
              title={script.name}
              status={
                currentRun?.status === 'running' || currentRun?.status === 'pending'
                  ? 'running'
                  : currentRun?.status === 'success'
                  ? 'success'
                  : currentRun?.status === 'failed'
                  ? 'error'
                  : 'idle'
              }
              maxHeight="300px"
              enableColors
            />
          </div>
        )}

        {/* Run History */}
        {runs.length > 0 && (
          <div className="space-y-2">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="flex items-center gap-2 text-sm font-medium text-coco-text-primary hover:text-coco-accent transition-colors"
            >
              {showHistory ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              Run History ({runs.length})
            </button>
            {showHistory && (
              <div className="space-y-2">
                {runs.slice(0, 10).map((run) => {
                  const config = statusConfig[run.status];
                  const RunStatusIcon = config.icon;
                  return (
                    <button
                      key={run.id}
                      onClick={() => setActiveRunId(run.id)}
                      className={`w-full flex items-center justify-between p-3 rounded-lg border transition-colors ${
                        activeRunId === run.id
                          ? 'border-coco-accent bg-coco-accent/5'
                          : 'border-coco-border-subtle hover:border-coco-border-default'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <RunStatusIcon className={`w-4 h-4 ${run.status === 'running' ? 'animate-spin' : ''} ${config.color}`} />
                        <span className="text-sm text-coco-text-primary">{config.label}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-coco-text-tertiary">
                        {run.durationMs && (
                          <span>{(run.durationMs / 1000).toFixed(1)}s</span>
                        )}
                        <span>{new Date(run.startedAt).toLocaleString()}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </Drawer>
  );
}
