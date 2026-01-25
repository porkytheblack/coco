'use client';

import { Plus, GitBranch, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui';
import type { WorkflowData } from '@/lib/tauri/commands';

// ============================================================================
// Types
// ============================================================================

interface WorkflowListProps {
  workflows: WorkflowData[];
  onWorkflowClick: (workflow: WorkflowData) => void;
  onNewWorkflow: () => void;
}

// ============================================================================
// List Component
// ============================================================================

export function WorkflowList({ workflows, onWorkflowClick, onNewWorkflow }: WorkflowListProps) {
  if (workflows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="w-16 h-16 rounded-full bg-coco-bg-tertiary flex items-center justify-center mb-4">
          <GitBranch className="w-8 h-8 text-coco-text-tertiary" />
        </div>
        <h3 className="text-lg font-medium text-coco-text-primary mb-2">No workflows yet</h3>
        <p className="text-sm text-coco-text-secondary mb-4 text-center max-w-sm">
          Create workflows to automate repetitive tasks by connecting transactions, scripts, and external services.
        </p>
        <Button variant="primary" size="sm" onClick={onNewWorkflow}>
          <Plus className="w-4 h-4 mr-2" />
          Create Workflow
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-coco-text-primary">Workflows</h3>
        <Button variant="secondary" size="sm" onClick={onNewWorkflow}>
          <Plus className="w-4 h-4 mr-1" />
          New
        </Button>
      </div>

      {workflows.map(workflow => {
        const definition = workflow.definition ? JSON.parse(workflow.definition) : { nodes: [], edges: [] };
        const nodeCount = definition.nodes?.length || 0;
        const edgeCount = definition.edges?.length || 0;

        return (
          <button
            key={workflow.id}
            onClick={() => onWorkflowClick(workflow)}
            className="w-full flex items-center gap-3 p-3 rounded-lg bg-coco-bg-elevated border border-coco-border-subtle hover:border-coco-accent/50 transition-colors text-left group"
          >
            <div className="p-2 rounded-lg bg-coco-accent/10">
              <GitBranch className="w-5 h-5 text-coco-accent" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-coco-text-primary truncate">{workflow.name}</p>
              <p className="text-xs text-coco-text-tertiary">
                {nodeCount} nodes · {edgeCount} connections
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-coco-text-tertiary group-hover:text-coco-accent transition-colors" />
          </button>
        );
      })}
    </div>
  );
}
