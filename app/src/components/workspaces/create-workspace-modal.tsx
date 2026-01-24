'use client';

import { useState } from 'react';
import { Button, Input, Modal } from '@/components/ui';
import type { CreateWorkspaceRequest } from '@/types';

interface CreateWorkspaceModalProps {
  isOpen: boolean;
  chainId: string;
  onClose: () => void;
  onCreate: (request: CreateWorkspaceRequest) => Promise<void>;
}

export function CreateWorkspaceModal({
  isOpen,
  chainId,
  onClose,
  onCreate,
}: CreateWorkspaceModalProps) {
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('Workspace name is required');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await onCreate({
        chainId,
        name: name.trim(),
      });
      handleClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setName('');
    setError(null);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create Workspace"
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} isLoading={isLoading}>
            Create Workspace
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input
          label="Workspace Name"
          placeholder="MyContract"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <p className="text-xs text-coco-text-tertiary">
          Create a workspace to organize contracts and transactions for this chain.
        </p>

        {error && <p className="text-sm text-coco-error">{error}</p>}
      </div>
    </Modal>
  );
}
