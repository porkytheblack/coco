'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { ArrowLeft, Save, Play, History } from 'lucide-react';
import type { WorkflowDefinition, WorkflowNode, WorkflowEdge, WorkflowNodeType } from '@/lib/workflow/types';
import { WorkflowCanvas } from './workflow-canvas';
import { WorkflowPanel } from './workflow-panel';
import { WorkflowRunsPanel } from './workflow-runs-panel';
import { WorkflowToolbar, createNode } from './workflow-toolbar';
import { Button, IconButton } from '@/components/ui';
import { useToastStore } from '@/stores/toast-store';
import { useWorkflowRuns } from '@/hooks/use-workflows';
import type { WorkflowStepLog, WorkflowRunStatus } from '@/lib/workflow/types';
import { executeWorkflow, slugify, type ExecutionHandlers } from '@/lib/workflow/engine';
import { updateWorkflowRunStatus, updateWorkflowRunStepLogs, executeTransaction, runScript, getScriptRunLogs, executeAdapter, listEnvVarsWithValues } from '@/lib/tauri/commands';
import { useWorkspaceStore, useChainStore } from '@/stores';
import { Effect } from 'effect';

// ============================================================================
// Types
// ============================================================================

import type { Transaction, Contract } from '@/types';

interface WorkflowBuilderProps {
  workflow: {
    id: string;
    name: string;
    definition: WorkflowDefinition;
  };
  transactions: Transaction[];
  contracts: Contract[];
  scripts: { id: string; name: string }[];
  wallets: { id: string; name: string }[];
  onSave: (definition: WorkflowDefinition) => Promise<void> | void;
  onRun: () => Promise<any> | void;
  onBack: () => void;
  isSaving?: boolean;
  isRunning?: boolean;
}

// ============================================================================
// Builder Component
// ============================================================================

export function WorkflowBuilder({
  workflow,
  transactions,
  contracts,
  scripts,
  wallets,
  onSave,
  onRun,
  onBack,
  isSaving = false,
  isRunning = false,
}: WorkflowBuilderProps) {
  const { addToast } = useToastStore();
  const [definition, setDefinition] = useState<WorkflowDefinition>(workflow.definition);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [showRuns, setShowRuns] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [historyHeight, setHistoryHeight] = useState(300);
  const [isResizing, setIsResizing] = useState(false);
  const { currentWorkspace } = useWorkspaceStore();

  // Fetch runs for execution status visualization
  const { data: runsData = [] } = useWorkflowRuns(workflow.id, true);
  const latestRun = runsData[0]; // Assuming sorted by desc in backend or use sort

  const nodeStatus = useMemo(() => {
    if (!latestRun?.stepLogs) return {};
    try {
      const logs = JSON.parse(latestRun.stepLogs) as WorkflowStepLog[];
      const statusMap: Record<string, 'pending' | 'running' | 'completed' | 'failed' | 'skipped'> = {};
      logs.forEach(log => {
        statusMap[log.nodeId] = log.status;
      });
      return statusMap;
    } catch {
      return {};
    }
  }, [latestRun?.stepLogs]);

  // Get selected node
  const selectedNode = selectedNodeId 
    ? definition.nodes.find(n => n.id === selectedNodeId) || null
    : null;

  // Update definition helper
  const updateDefinition = useCallback((updater: (prev: WorkflowDefinition) => WorkflowDefinition) => {
    setDefinition(prev => {
      const next = updater(prev);
      setHasChanges(true);
      return next;
    });
  }, []);

  // Node handlers
  const handleNodeSelect = useCallback((nodeId: string | null) => {
    setSelectedNodeId(nodeId);
  }, []);

  const handleNodeMove = useCallback((nodeId: string, x: number, y: number) => {
    updateDefinition(prev => ({
      ...prev,
      nodes: prev.nodes.map(n => 
        n.id === nodeId ? { ...n, position: { x, y } } : n
      ),
    }));
  }, [updateDefinition]);

  const handleNodeAdd = useCallback((node: WorkflowNode) => {
    updateDefinition(prev => ({
      ...prev,
      nodes: [...prev.nodes, node],
    }));
    setSelectedNodeId(node.id);
  }, [updateDefinition]);

  const handleNodeUpdate = useCallback((node: WorkflowNode) => {
    updateDefinition(prev => ({
      ...prev,
      nodes: prev.nodes.map(n => n.id === node.id ? node : n),
    }));
  }, [updateDefinition]);

  const handleNodeDelete = useCallback((nodeId: string) => {
    updateDefinition(prev => ({
      ...prev,
      nodes: prev.nodes.filter(n => n.id !== nodeId),
      edges: prev.edges.filter(e => e.sourceId !== nodeId && e.targetId !== nodeId),
    }));
    setSelectedNodeId(null);
  }, [updateDefinition]);

  // Edge handlers
  const handleEdgeAdd = useCallback((edge: WorkflowEdge) => {
    updateDefinition(prev => ({
      ...prev,
      edges: [...prev.edges, edge],
    }));
  }, [updateDefinition]);

  const handleEdgeDelete = useCallback((edgeId: string) => {
    updateDefinition(prev => ({
      ...prev,
      edges: prev.edges.filter(e => e.id !== edgeId),
    }));
  }, [updateDefinition]);

  // Add node from toolbar
  const handleAddNodeFromToolbar = useCallback((type: WorkflowNodeType) => {
    // Find center of canvas (approximate)
    const x = 250;
    const y = 200 + definition.nodes.length * 80;
    const node = createNode(type, { x, y });
    handleNodeAdd(node);
  }, [definition.nodes.length, handleNodeAdd]);

  // Resizing logic
  const startResizing = useCallback(() => {
    setIsResizing(true);
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  const onResize = useCallback((e: MouseEvent) => {
    if (isResizing) {
      const newHeight = window.innerHeight - e.clientY;
      if (newHeight > 100 && newHeight < window.innerHeight * 0.8) {
        setHistoryHeight(newHeight);
      }
    }
  }, [isResizing]);

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', onResize);
      window.addEventListener('mouseup', stopResizing);
    } else {
      window.removeEventListener('mousemove', onResize);
      window.removeEventListener('mouseup', stopResizing);
    }
    return () => {
      window.removeEventListener('mousemove', onResize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [isResizing, onResize, stopResizing]);

  // Save handler
  const handleSave = useCallback(() => {
    onSave(definition);
    setHasChanges(false);
  }, [definition, onSave]);

  // Run handler wrapper
  const handleRunWrapper = useCallback(async () => {
    // Validate workflow before running
    
    // Validate labels uniqueness
    const slugifiedLabels = definition.nodes.map(n => slugify(n.label || n.type));
    const uniqueLabels = new Set(slugifiedLabels);
    if (uniqueLabels.size !== slugifiedLabels.length) {
      // Find duplicates
      const duplicates = slugifiedLabels.filter((item, index) => slugifiedLabels.indexOf(item) !== index);
      addToast({
        title: "Validation Error",
        message: `Node labels must be unique. Duplicate found: "${duplicates[0]}". Please rename your nodes.`,
        type: "error"
      });
      return;
    }

    const transactionNodes = definition.nodes.filter(n => n.type === 'transaction');
    const invalidTransaction = transactionNodes.find(n => 
      !n.config.transactionId || n.config.transactionId === ''
    );

    if (invalidTransaction) {
      addToast({
        title: "Validation Error",
        message: `Transaction node "${invalidTransaction.label}" has no transaction selected. Please select one in the right panel.`,
        type: "error"
      });
      // Select the invalid node to help user fix it
      setSelectedNodeId(invalidTransaction.id);
      return;
    }

    // Validate arguments
    for (const node of transactionNodes) {
      if (!node.config.transactionId) continue;
      
      const tx = transactions.find(t => t.id === node.config.transactionId);
      if (!tx) continue;

      const contract = contracts.find(c => c.id === tx.contractId);
      if (!contract) continue;

      const func = contract.functions?.find(f => f.name === tx.functionName);
      if (!func || !func.inputs) continue;

      const missingArg = func.inputs.find(input => {
        const value = node.config.args?.[input.name];
        return !value || value.trim() === '';
      });

      if (missingArg) {
        addToast({
          title: "Validation Error",
          message: `Transaction node "${node.label}" is missing required argument "${missingArg.name}".`,
          type: "error"
        });
        setSelectedNodeId(node.id);
        return;
      }
    }

    const scriptNodes = definition.nodes.filter(n => n.type === 'script');
    const invalidScript = scriptNodes.find(n => 
      !n.config.scriptId || n.config.scriptId === ''
    );

    if (invalidScript) {
      addToast({
        title: "Validation Error",
        message: `Script node "${invalidScript.label}" has no script selected.`,
        type: "error"
      });
      setSelectedNodeId(invalidScript.id);
      return;
    }

    // Auto-save before running to ensure backend has latest definition
    if (hasChanges) {
        await onSave(definition);
        setHasChanges(false);
    }
    setShowRuns(true);
    
    // Execute Workflow
    try {
        // 1. Create pending run in backend
        // Note: onRun() triggers mutation but we need the run object. 
        // We should change onRun to return Promise<WorkflowRun> or call mutation directly here if possible.
        // Accessing mutation from hook if passed via props?
        // Actually onRun prop is void. But page.tsx handles it.
        // Wait, if page.tsx handles onRun, it calls runWorkflowMutation.
        // We can't get the ID easily unless we change onRun signature.
        
        // Easier: Execute runWorkflowMutation HERE if we can access it, OR change onRun to return result.
        // For now, let's assume onRun just creates it. 
        // BUT we need the ID to update it.
        // So we MUST change onRun signature in WorkflowBuilderProps to return Promise<WorkflowRunData | void>.
        // Or pass the mutation function itself.
        
        // Let's assume user will refresh panel. But for execution we need ID.
        // So I will call onRun() and... I can't get ID.
        
        // CRITICAL: We need to change onRun signature or logic.
        // In page.tsx:
        // onRun={async () => { return await runWorkflowMutation.mutateAsync(...) }}
        
        const runData = await onRun();
        if (!runData || !runData.id) {
            return;
        }

        // Fetch Envs
        let envVars: Record<string, string> = {};
        if (currentWorkspace?.id) {
            try {
                envVars = await listEnvVarsWithValues(currentWorkspace.id);
            } catch (e) {
                console.error("Failed to fetch env vars", e);
            }
        }

        const initialVars: Record<string, any> = { env: {} };
        Object.entries(envVars).forEach(([key, value]) => {
            initialVars.env[key] = value;
        });

        // 2. Define Handlers
        const handlers: ExecutionHandlers = {
            executeTransaction: async (txId, walletId, args) => {
                // Determine wallet ID
                let activeWalletId = walletId;
                if (!activeWalletId || activeWalletId === '') {
                    // Try to find default wallet from props
                    if (wallets.length > 0) activeWalletId = wallets[0].id;
                    else throw new Error("No wallet selected and no default wallet found.");
                }

                // Use WorkspaceStore logic to align with Contracts Tab execution
                // This ensures we use the correct Adapter (EVM/Solana/Aptos) and handle signing params correctly
                const { executeTransaction: execTx, currentWorkspace } = useWorkspaceStore.getState();
                const { chains } = useChainStore.getState();

                if (!currentWorkspace) throw new Error("No workspace active");
                const chain = chains.find(c => c.id === currentWorkspace.chainId);
                if (!chain) throw new Error("Chain context not found");

                // Execute via Store (Frontend Adapter + Backend Key Fetch)
                const result = await execTx(txId, args, activeWalletId, { chain });
                
                return { 
                    success: result.status === 'success', 
                    data: result,
                    txHash: result.txHash,
                    error: result.errorMessage
                };
            },
            executeScript: async (scriptId) => {
                // Execute real script (sync wait)
                // Note: We currently don't support passing flags/env vars from the node config yet
                const run = await runScript(scriptId, { flags: {} });
                
                // Fetch logs to show as output
                let output = "";
                try {
                    output = await getScriptRunLogs(run.id);
                } catch (e) {
                    console.error("Failed to fetch script logs", e);
                }

                return { 
                    success: run.status === 'success', 
                    data: run, 
                    output: output || (run.status === 'success' ? "Script completed" : "Script failed")
                };
            },
            executeAdapter: async (adapterId, operation, config, input) => {
                try {
                    const result = await executeAdapter(adapterId, operation, config, input);
                    return { success: true, data: result };
                } catch (e) {
                    console.error("Adapter execution failed", e);
                    const errorMsg = typeof e === 'string' 
                        ? e 
                        : (typeof e === 'object' && e !== null)
                            ? JSON.stringify(e)
                            : String(e);
                    return { success: false, error: errorMsg };
                }
            }
        };

        // 3. Run Engine
        const program = executeWorkflow(
            workflow.id,
            runData.id,
            definition,
            initialVars,
            handlers
        );

        // Run the Effect
        const result = await Effect.runPromise(program);

        // 4. Update Backend
        await updateWorkflowRunStepLogs(runData.id, JSON.stringify(result.stepLogs));
        await updateWorkflowRunStatus(
            runData.id, 
            result.status, 
            undefined, // current node
            result.error
        );

    } catch (error) {
        console.error("Execution failed:", error);
        addToast({ title: "Execution Error", message: String(error), type: "error" });
    }

  }, [onRun, onSave, definition, hasChanges, addToast, transactions, contracts, workflow.id]);

  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-coco-border-subtle bg-coco-bg-elevated shrink-0">
        <div className="flex items-center gap-3">
          <IconButton
            icon={<ArrowLeft className="w-5 h-5" />}
            label="Back"
            onClick={onBack}
          />
          <div>
            <h1 className="text-lg font-semibold text-coco-text-primary">{workflow.name}</h1>
            <p className="text-xs text-coco-text-tertiary">
              {definition.nodes.length} nodes · {definition.edges.length} connections
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowRuns(!showRuns)}
            className={showRuns ? "bg-coco-bg-tertiary" : ""}
          >
            <History className="w-4 h-4 mr-2" />
            History
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
          >
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleRunWrapper}
            disabled={isRunning}
          >
            <Play className="w-4 h-4 mr-2" />
            {isRunning ? 'Running...' : 'Run'}
          </Button>
        </div>
      </div>

      {/* Main content wrapper */}
      <div className={`flex-1 flex flex-col overflow-hidden min-h-0 relative ${isResizing ? 'select-none' : ''}`}>
        {/* Resize Overlay */}
        {isResizing && (
          <div className="fixed inset-0 z-[100] cursor-ns-resize" />
        )}

        {/* Builder Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Toolbar */}
          <WorkflowToolbar 
            onAddNode={handleAddNodeFromToolbar} 
            isCollapsed={isSidebarCollapsed}
            onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          />

          {/* Canvas */}
          <div className="flex-1 h-full">
            <WorkflowCanvas
              definition={definition}
              selectedNodeId={selectedNodeId}
              onNodeSelect={handleNodeSelect}
              onNodeMove={handleNodeMove}
              onNodeAdd={handleNodeAdd}
              onEdgeAdd={handleEdgeAdd}
              onEdgeDelete={handleEdgeDelete}
              nodeStatus={nodeStatus}
            />
          </div>

          {/* Panel */}
          <WorkflowPanel
            node={selectedNode}
            transactions={transactions}
            contracts={contracts}
            scripts={scripts}
            wallets={wallets}
            onClose={() => setSelectedNodeId(null)}
            onUpdate={handleNodeUpdate}
            onDelete={handleNodeDelete}
            workspaceId={currentWorkspace?.id}
            definition={definition}
            onSave={handleSave}
            isSaving={isSaving}
          />
        </div>

        {/* Runs Panel */}
        {showRuns && (
          <div 
            style={{ height: historyHeight }} 
            className="border-t border-coco-border-subtle bg-coco-bg-elevated relative flex flex-col shrink-0 z-20"
          >
            {/* Resize Handle */}
            <div 
              onMouseDown={startResizing}
              className="absolute -top-1.5 left-0 w-full h-3 cursor-ns-resize hover:bg-coco-accent/20 z-[60] group transition-colors flex items-center justify-center"
            >
              <div className="w-16 h-1 rounded-full bg-coco-border-subtle group-hover:bg-coco-accent transition-colors opacity-30 group-hover:opacity-100" />
            </div>
            <div className="flex-1 overflow-hidden">
              <WorkflowRunsPanel workflowId={workflow.id} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
