'use client';

import { useState } from 'react';
import { Plus, FileCode } from 'lucide-react';
import { Button } from '@/components/ui';
import { ScriptCard } from './script-card';
import { AddScriptModal } from './add-script-modal';
import { ScriptRunPanel } from './script-run-panel';
import { useScripts, useDeleteScript } from '@/hooks';
import { useToastStore } from '@/stores';
import type { Script } from '@/types';

interface ScriptListProps {
  workspaceId: string;
}

export function ScriptList({ workspaceId }: ScriptListProps) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingScript, setEditingScript] = useState<Script | null>(null);
  const [runningScript, setRunningScript] = useState<Script | null>(null);

  const { data: scripts = [], isLoading } = useScripts(workspaceId);
  const deleteScript = useDeleteScript();
  const { addToast } = useToastStore();

  const handleRun = (script: Script) => {
    setRunningScript(script);
  };

  const handleEdit = (script: Script) => {
    setEditingScript(script);
    setIsAddModalOpen(true);
  };

  const handleDelete = async (script: Script) => {
    if (!confirm(`Are you sure you want to delete "${script.name}"?`)) {
      return;
    }

    try {
      await deleteScript.mutateAsync({ scriptId: script.id, workspaceId });
      addToast({
        type: 'success',
        title: 'Script deleted',
        message: `"${script.name}" has been deleted`,
      });
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Failed to delete script',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  const handleModalClose = () => {
    setIsAddModalOpen(false);
    setEditingScript(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48 text-coco-text-secondary">
        Loading scripts...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-coco-text-primary">Scripts</h2>
        <Button
          variant="primary"
          size="sm"
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Script
        </Button>
      </div>

      {scripts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-coco-text-secondary">
          <FileCode className="w-12 h-12 mb-4 opacity-50" />
          <p className="text-center">
            No scripts yet.
            <br />
            Add a script to automate your workflow.
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {scripts.map((script) => (
            <ScriptCard
              key={script.id}
              script={script}
              onRun={handleRun}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      <AddScriptModal
        isOpen={isAddModalOpen}
        onClose={handleModalClose}
        workspaceId={workspaceId}
        editingScript={editingScript}
      />

      {runningScript && (
        <ScriptRunPanel
          script={runningScript}
          workspaceId={workspaceId}
          onClose={() => setRunningScript(null)}
        />
      )}
    </div>
  );
}
