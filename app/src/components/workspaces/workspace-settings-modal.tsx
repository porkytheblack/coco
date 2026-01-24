'use client';

import { useState, useEffect } from 'react';
import { Trash2 } from 'lucide-react';
import { Button, Input, Modal } from '@/components/ui';
import type { Workspace } from '@/types';

interface WorkspaceSettingsModalProps {
  workspace: Workspace | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string) => Promise<void>;
  onDelete: () => Promise<void>;
  contractCount?: number;
  transactionCount?: number;
}

export function WorkspaceSettingsModal({
  workspace,
  isOpen,
  onClose,
  onSave,
  onDelete,
  contractCount,
  transactionCount,
}: WorkspaceSettingsModalProps) {
  const [name, setName] = useState(workspace?.name || '');
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset state when workspace changes
  useEffect(() => {
    if (workspace) {
      setName(workspace.name);
    }
  }, [workspace]);

  if (!workspace) return null;

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Workspace name is required');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await onSave(name.trim());
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete();
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Workspace Settings"
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave} isLoading={isLoading}>
            Save Changes
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input
          label="Workspace Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        {/* Info */}
        <div className="bg-coco-bg-secondary rounded-lg p-3 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-coco-text-tertiary">Contracts</span>
            <span className="text-coco-text-primary">{contractCount ?? workspace.contractCount ?? 0}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-coco-text-tertiary">Transactions</span>
            <span className="text-coco-text-primary">{transactionCount ?? workspace.transactionCount ?? 0}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-coco-text-tertiary">Created</span>
            <span className="text-coco-text-primary">
              {new Date(workspace.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>

        {/* Delete section */}
        <div className="pt-4 border-t border-coco-border-subtle">
          {!showDeleteConfirm ? (
            <Button
              variant="danger"
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Workspace
            </Button>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-coco-text-secondary text-center">
                Are you sure? This will delete all contracts and transactions.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  onClick={handleDelete}
                  isLoading={isDeleting}
                  className="flex-1"
                >
                  Delete
                </Button>
              </div>
            </div>
          )}
        </div>

        {error && <p className="text-sm text-coco-error">{error}</p>}
      </div>
    </Modal>
  );
}
