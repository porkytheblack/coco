'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Input, Modal } from '@/components/ui';
import { useCreateChain } from '@/hooks';
import type { Ecosystem, CreateChainRequest } from '@/types';
import type { BlockchainDefinition } from '@/data/chain-registry';

interface AddChainModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd?: (request: CreateChainRequest) => Promise<void>;
  /** Optional blockchain context for adding a custom network to an existing blockchain */
  blockchain?: BlockchainDefinition | null;
}

const ecosystemOptions: { value: Ecosystem; label: string; currency: string }[] = [
  { value: 'evm', label: 'EVM (Ethereum, Polygon, etc.)', currency: 'ETH' },
  { value: 'solana', label: 'Solana', currency: 'SOL' },
  { value: 'aptos', label: 'Aptos', currency: 'APT' },
];

// Create schema with conditional chainId validation
const addChainSchema = z.object({
  name: z.string().min(1, 'Chain name is required').max(100, 'Name is too long'),
  ecosystem: z.enum(['evm', 'solana', 'aptos']),
  rpcUrl: z.string().min(1, 'RPC URL is required').url('Invalid RPC URL'),
  chainId: z.string().optional(),
  blockExplorerUrl: z.string().url('Invalid URL').optional().or(z.literal('')),
}).refine(
  (data) => data.ecosystem !== 'evm' || (data.chainId && data.chainId.trim() !== ''),
  { message: 'Chain ID is required for EVM chains', path: ['chainId'] }
).refine(
  (data) => {
    if (data.ecosystem !== 'evm' || !data.chainId) return true;
    const num = parseInt(data.chainId, 10);
    return !isNaN(num) && num > 0;
  },
  { message: 'Chain ID must be a positive number', path: ['chainId'] }
);

type AddChainInput = z.infer<typeof addChainSchema>;

export function AddChainModal({ isOpen, onClose, onAdd, blockchain }: AddChainModalProps) {
  const createChain = useCreateChain();

  // When blockchain context is provided, pre-populate and lock the ecosystem
  const isBlockchainContext = !!blockchain;

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<AddChainInput>({
    resolver: zodResolver(addChainSchema),
    defaultValues: {
      name: '',
      ecosystem: 'evm',
      rpcUrl: '',
      chainId: '',
      blockExplorerUrl: '',
    },
  });

  const ecosystem = watch('ecosystem');
  const selectedEcosystem = ecosystemOptions.find((e) => e.value === ecosystem);
  const showChainId = ecosystem === 'evm';

  // When blockchain context is provided, pre-populate values
  useEffect(() => {
    if (isOpen && blockchain) {
      setValue('ecosystem', blockchain.ecosystem);
      setValue('name', `${blockchain.name} Custom`);
    } else if (isOpen) {
      reset({
        name: '',
        ecosystem: 'evm',
        rpcUrl: '',
        chainId: '',
        blockExplorerUrl: '',
      });
    }
  }, [blockchain, isOpen, setValue, reset]);

  const onSubmit = async (data: AddChainInput) => {
    const chainIdNumeric = data.chainId ? parseInt(data.chainId, 10) : undefined;

    try {
      const request: CreateChainRequest = {
        name: data.name.trim(),
        ecosystem: data.ecosystem,
        rpcUrl: data.rpcUrl.trim(),
        chainIdNumeric,
        currencySymbol: blockchain?.nativeCurrency || selectedEcosystem?.currency || 'ETH',
        blockExplorerUrl: data.blockExplorerUrl?.trim() || undefined,
        blockchain: blockchain?.id || 'custom',
        networkType: 'custom',
        isCustom: true,
        iconId: blockchain?.iconId || 'custom',
      };

      if (onAdd) {
        await onAdd(request);
      } else {
        await createChain.mutateAsync(request);
      }
      handleClose();
    } catch {
      // Error is handled by the mutation or caught by React Hook Form
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const modalTitle = blockchain
    ? `Add Custom Network to ${blockchain.name}`
    : 'Add Chain';

  const error = createChain.error?.message;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={modalTitle}
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit(onSubmit)}
            isLoading={isSubmitting || createChain.isPending}
          >
            Add Chain
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Chain Name"
          placeholder="Ethereum Sepolia"
          {...register('name')}
          error={errors.name?.message}
        />

        <div>
          <label className="block text-sm font-medium text-coco-text-primary mb-1.5">
            Ecosystem
          </label>
          {isBlockchainContext ? (
            <div className="px-3 py-2 text-sm bg-coco-bg-secondary border border-coco-border-default rounded-md text-coco-text-secondary">
              {selectedEcosystem?.label || ecosystem.toUpperCase()}
            </div>
          ) : (
            <select
              {...register('ecosystem')}
              className="w-full px-3 py-2 text-sm bg-coco-bg-primary border border-coco-border-default rounded-md focus:outline-none focus:ring-2 focus:ring-coco-accent focus:border-transparent"
            >
              {ecosystemOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          )}
        </div>

        <Input
          label="RPC URL"
          placeholder="https://sepolia.infura.io/v3/your-key"
          {...register('rpcUrl')}
          error={errors.rpcUrl?.message}
        />

        {showChainId && (
          <Input
            label="Chain ID"
            placeholder="11155111"
            {...register('chainId')}
            error={errors.chainId?.message}
            type="number"
          />
        )}

        <Input
          label="Block Explorer URL (optional)"
          placeholder="https://sepolia.etherscan.io"
          {...register('blockExplorerUrl')}
          error={errors.blockExplorerUrl?.message}
        />

        {error && (
          <p className="text-sm text-coco-error">{error}</p>
        )}
      </form>
    </Modal>
  );
}
