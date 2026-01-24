'use client';

import { Plus } from 'lucide-react';
import { WorkspaceCard, NewWorkspaceCard } from './workspace-card';
import type { Workspace } from '@/types';

interface WorkspaceGridProps {
  workspaces: Workspace[];
  onWorkspaceClick: (workspace: Workspace) => void;
  onNewWorkspace: () => void;
}

export function WorkspaceGrid({ workspaces, onWorkspaceClick, onNewWorkspace }: WorkspaceGridProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-coco-text-primary">Workspaces</h2>
        <button
          onClick={onNewWorkspace}
          className="text-sm text-coco-accent hover:text-coco-accent-hover flex items-center gap-1"
        >
          <Plus className="w-4 h-4" />
          New workspace
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {workspaces.map((workspace) => (
          <WorkspaceCard
            key={workspace.id}
            workspace={workspace}
            onClick={() => onWorkspaceClick(workspace)}
          />
        ))}
        <NewWorkspaceCard onClick={onNewWorkspace} />
      </div>
    </div>
  );
}
