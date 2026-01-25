'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Input, Modal } from '@/components/ui';
import { useCreateWorkspace } from '@/hooks';
import { createWorkspaceSchema, type CreateWorkspaceInput } from '@/lib/validations';

interface CreateWorkspaceModalProps {
  isOpen: boolean;
  chainId: string;
  onClose: () => void;
  onCreate?: (request: CreateWorkspaceInput) => Promise<void>;
}

export function CreateWorkspaceModal({
  isOpen,
  chainId,
  onClose,
  onCreate,
}: CreateWorkspaceModalProps) {
  const createWorkspace = useCreateWorkspace();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateWorkspaceInput>({
    resolver: zodResolver(createWorkspaceSchema),
    defaultValues: {
      name: '',
      chainId,
    },
  });

  // Reset form when chainId changes or modal opens
  useEffect(() => {
    if (isOpen) {
      reset({ name: '', chainId });
    }
  }, [isOpen, chainId, reset]);

  const onSubmit = async (data: CreateWorkspaceInput) => {
    try {
      // Use the passed onCreate callback if provided (for backward compatibility)
      // Otherwise use the TanStack Query mutation
      if (onCreate) {
        await onCreate(data);
      } else {
        await createWorkspace.mutateAsync(data);
      }
      handleClose();
    } catch {
      // Error is handled by React Hook Form or mutation
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const error = errors.name?.message || createWorkspace.error?.message;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create Workspace"
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit(onSubmit)}
            isLoading={isSubmitting || createWorkspace.isPending}
          >
            Create Workspace
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Workspace Name"
          placeholder="MyContract"
          {...register('name')}
          error={errors.name?.message}
        />

        <p className="text-xs text-coco-text-tertiary">
          Create a workspace to organize contracts and transactions for this chain.
        </p>

        {error && <p className="text-sm text-coco-error">{error}</p>}
      </form>
    </Modal>
  );
}
