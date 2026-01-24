'use client';

import { clsx } from 'clsx';
import { FolderOpen } from 'lucide-react';
import type { Workspace } from '@/types';

interface WorkspaceCardProps {
  workspace: Workspace;
  onClick: () => void;
}

export function WorkspaceCard({ workspace, onClick }: WorkspaceCardProps) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'w-full min-h-[160px] p-5 rounded-lg text-left',
        'bg-coco-bg-secondary border border-coco-border-subtle',
        'hover:bg-coco-bg-tertiary hover:border-coco-border-default',
        'transition-all duration-base cursor-pointer',
        'focus:outline-none focus:ring-2 focus:ring-coco-accent focus:ring-offset-2',
        'flex flex-col justify-between'
      )}
    >
      <div>
        <div className="flex items-start gap-3 mb-3">
          <div className="w-10 h-10 rounded-lg bg-coco-bg-tertiary flex items-center justify-center">
            <FolderOpen className="w-5 h-5 text-coco-text-secondary" />
          </div>
          <h3 className="text-base font-semibold text-coco-text-primary flex-1 truncate">
            {workspace.name}
          </h3>
        </div>
      </div>

      <div className="text-xs text-coco-text-tertiary space-y-1">
        <p>
          {workspace.contractCount || 0} contracts
          <span className="mx-1.5">·</span>
          {workspace.transactionCount || 0} transactions
        </p>
        {workspace.lastActive && (
          <p>Last active: {workspace.lastActive}</p>
        )}
      </div>
    </button>
  );
}

interface NewWorkspaceCardProps {
  onClick: () => void;
}

export function NewWorkspaceCard({ onClick }: NewWorkspaceCardProps) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'w-full min-h-[160px] p-5 rounded-lg',
        'border-2 border-dashed border-coco-border-default',
        'hover:border-coco-accent hover:bg-coco-bg-secondary',
        'transition-all duration-base cursor-pointer',
        'flex items-center justify-center',
        'focus:outline-none focus:ring-2 focus:ring-coco-accent focus:ring-offset-2'
      )}
    >
      <span className="text-sm text-coco-text-tertiary hover:text-coco-accent">
        + New workspace
      </span>
    </button>
  );
}
