'use client';

import { useState } from 'react';
import { Plus, Key } from 'lucide-react';
import { Button } from '@/components/ui';
import { EnvVarCard } from './env-var-card';
import { AddEnvVarModal } from './add-env-var-modal';
import { useEnvVars, useDeleteEnvVar } from '@/hooks';
import { useToastStore } from '@/stores';
import type { EnvironmentVariable } from '@/types';

interface EnvVarListProps {
  workspaceId: string;
}

export function EnvVarList({ workspaceId }: EnvVarListProps) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingEnvVar, setEditingEnvVar] = useState<EnvironmentVariable | null>(null);

  const { data: envVars = [], isLoading } = useEnvVars(workspaceId);
  const deleteEnvVar = useDeleteEnvVar();
  const { addToast } = useToastStore();

  const handleEdit = (envVar: EnvironmentVariable) => {
    setEditingEnvVar(envVar);
    setIsAddModalOpen(true);
  };

  const handleDelete = async (envVar: EnvironmentVariable) => {
    if (!confirm(`Are you sure you want to delete "${envVar.key}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await deleteEnvVar.mutateAsync({ envVarId: envVar.id, workspaceId });
      addToast({
        type: 'success',
        title: 'Variable deleted',
        message: `"${envVar.key}" has been deleted`,
      });
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Failed to delete variable',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  const handleModalClose = () => {
    setIsAddModalOpen(false);
    setEditingEnvVar(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48 text-coco-text-secondary">
        Loading environment variables...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-coco-text-primary">Environment Variables</h2>
        <Button
          variant="primary"
          size="sm"
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Variable
        </Button>
      </div>

      {envVars.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-coco-text-secondary">
          <Key className="w-12 h-12 mb-4 opacity-50" />
          <p className="text-center">
            No environment variables yet.
            <br />
            Add secrets like API keys, database URLs, etc.
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {envVars.map((envVar) => (
            <EnvVarCard
              key={envVar.id}
              envVar={envVar}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      <AddEnvVarModal
        isOpen={isAddModalOpen}
        onClose={handleModalClose}
        workspaceId={workspaceId}
        editingEnvVar={editingEnvVar}
      />
    </div>
  );
}
