'use client';

import { useState, useEffect } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Modal, Input, Button } from '@/components/ui';
import { useCreateEnvVar, useUpdateEnvVar } from '@/hooks';
import { useToastStore } from '@/stores';
import type { EnvironmentVariable } from '@/types';

interface AddEnvVarModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  editingEnvVar: EnvironmentVariable | null;
}

export function AddEnvVarModal({
  isOpen,
  onClose,
  workspaceId,
  editingEnvVar,
}: AddEnvVarModalProps) {
  const [key, setKey] = useState('');
  const [value, setValue] = useState('');
  const [description, setDescription] = useState('');
  const [showValue, setShowValue] = useState(false);

  const createEnvVar = useCreateEnvVar();
  const updateEnvVar = useUpdateEnvVar();
  const { addToast } = useToastStore();

  const isEditing = !!editingEnvVar;

  useEffect(() => {
    if (editingEnvVar) {
      setKey(editingEnvVar.key);
      setValue(''); // Don't show existing value for security
      setDescription(editingEnvVar.description || '');
    } else {
      setKey('');
      setValue('');
      setDescription('');
    }
    setShowValue(false);
  }, [editingEnvVar, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!key.trim()) {
      addToast({
        type: 'error',
        title: 'Validation error',
        message: 'Key is required',
      });
      return;
    }

    if (!isEditing && !value.trim()) {
      addToast({
        type: 'error',
        title: 'Validation error',
        message: 'Value is required for new variables',
      });
      return;
    }

    try {
      if (isEditing) {
        await updateEnvVar.mutateAsync({
          envVarId: editingEnvVar.id,
          workspaceId,
          key: key.trim(),
          value: value.trim() || undefined, // Only update if provided
          description: description.trim() || undefined,
        });
        addToast({
          type: 'success',
          title: 'Variable updated',
          message: `"${key}" has been updated`,
        });
      } else {
        await createEnvVar.mutateAsync({
          workspaceId,
          key: key.trim(),
          value: value.trim(),
          description: description.trim() || undefined,
        });
        addToast({
          type: 'success',
          title: 'Variable created',
          message: `"${key}" has been added`,
        });
      }
      onClose();
    } catch (error) {
      addToast({
        type: 'error',
        title: isEditing ? 'Failed to update variable' : 'Failed to create variable',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  const isPending = createEnvVar.isPending || updateEnvVar.isPending;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Environment Variable' : 'Add Environment Variable'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={isPending || !key.trim() || (!isEditing && !value.trim())}
          >
            {isPending ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Variable'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Key"
          placeholder="API_KEY"
          value={key}
          onChange={(e) => setKey(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '_'))}
          hint="Use SCREAMING_SNAKE_CASE (e.g., API_KEY, DATABASE_URL)"
          required
        />

        <div className="relative">
          <Input
            label={isEditing ? 'New Value (leave empty to keep current)' : 'Value'}
            type={showValue ? 'text' : 'password'}
            placeholder={isEditing ? '••••••••' : 'secret-value-here'}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            hint="This value will be encrypted at rest"
            required={!isEditing}
          />
          <button
            type="button"
            onClick={() => setShowValue(!showValue)}
            className="absolute right-3 top-[34px] text-coco-text-tertiary hover:text-coco-text-secondary transition-colors"
          >
            {showValue ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>
        </div>

        <Input
          label="Description"
          placeholder="API key for external service"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          hint="Optional description for this variable"
        />

        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 text-sm text-yellow-600 dark:text-yellow-400">
          <strong>Security note:</strong> Environment variables are encrypted with AES-GCM
          encryption. The value is never stored in plain text.
        </div>
      </form>
    </Modal>
  );
}
