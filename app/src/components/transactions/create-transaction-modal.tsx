'use client';

import { useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Input, Modal } from '@/components/ui';
import { useCreateTransaction } from '@/hooks';
import type { Contract } from '@/types';

const createTransactionSchema = z.object({
  name: z.string().min(1, 'Transaction name is required').max(100, 'Name is too long'),
  contractId: z.string().optional(),
  functionName: z.string().optional(),
});

type CreateTransactionInput = z.infer<typeof createTransactionSchema>;

interface CreateTransactionModalProps {
  isOpen: boolean;
  contracts: Contract[];
  workspaceId?: string;
  onClose: () => void;
  onCreate?: (name: string, contractId?: string, functionName?: string) => Promise<void>;
}

export function CreateTransactionModal({
  isOpen,
  contracts,
  workspaceId,
  onClose,
  onCreate,
}: CreateTransactionModalProps) {
  const createTransaction = useCreateTransaction();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CreateTransactionInput>({
    resolver: zodResolver(createTransactionSchema),
    defaultValues: {
      name: '',
      contractId: '',
      functionName: '',
    },
  });

  const contractId = watch('contractId');

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      reset({
        name: '',
        contractId: '',
        functionName: '',
      });
    }
  }, [isOpen, reset]);

  // Get the selected contract and its functions
  const selectedContract = useMemo(() => {
    return contracts.find((c) => c.id === contractId);
  }, [contracts, contractId]);

  const availableFunctions = useMemo(() => {
    if (!selectedContract?.functions) return [];
    // Show all functions (both read/view and write)
    return selectedContract.functions;
  }, [selectedContract]);

  // Reset function when contract changes
  const handleContractChange = (newContractId: string) => {
    setValue('contractId', newContractId);
    setValue('functionName', '');
  };

  const onSubmit = async (data: CreateTransactionInput) => {
    try {
      if (onCreate) {
        await onCreate(
          data.name.trim(),
          data.contractId || undefined,
          data.functionName || undefined
        );
      } else if (workspaceId) {
        await createTransaction.mutateAsync({
          workspaceId,
          name: data.name.trim(),
          contractId: data.contractId || undefined,
          functionName: data.functionName || undefined,
        });
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

  const error = createTransaction.error?.message;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="New Transaction"
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit(onSubmit)}
            isLoading={isSubmitting || createTransaction.isPending}
          >
            Create
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Transaction Name"
          placeholder="mint-tokens"
          {...register('name')}
          error={errors.name?.message}
        />

        <div>
          <label className="block text-sm font-medium text-coco-text-primary mb-1.5">
            Contract
          </label>
          <select
            {...register('contractId')}
            onChange={(e) => handleContractChange(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-coco-bg-primary border border-coco-border-default rounded-md focus:outline-none focus:ring-2 focus:ring-coco-accent"
          >
            <option value="">Select a contract...</option>
            {contracts.map((contract) => (
              <option key={contract.id} value={contract.id}>
                {contract.name}
              </option>
            ))}
          </select>
        </div>

        {contractId && availableFunctions.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-coco-text-primary mb-1.5">
              Function
            </label>
            <select
              {...register('functionName')}
              className="w-full px-3 py-2 text-sm bg-coco-bg-primary border border-coco-border-default rounded-md focus:outline-none focus:ring-2 focus:ring-coco-accent"
            >
              <option value="">Select a function...</option>
              {availableFunctions.map((fn) => (
                <option key={fn.name} value={fn.name}>
                  {fn.name}({fn.inputs.map((i) => `${i.name}: ${i.type}`).join(', ')})
                  {fn.type === 'read' ? ' [view]' : ''}
                </option>
              ))}
            </select>
          </div>
        )}

        {contractId && availableFunctions.length === 0 && selectedContract && (
          <p className="text-xs text-coco-text-tertiary">
            No functions found in this contract.
          </p>
        )}

        <p className="text-xs text-coco-text-tertiary">
          Transactions are saved configurations that can be executed multiple times
          with different parameters.
        </p>

        {error && <p className="text-sm text-coco-error">{error}</p>}
      </form>
    </Modal>
  );
}
