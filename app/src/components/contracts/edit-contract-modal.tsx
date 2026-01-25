'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FileCode } from 'lucide-react';
import { Button, Input, Modal } from '@/components/ui';
import { MoveDefinitionBuilder } from './move-definition-builder';
import { useUpdateContract } from '@/hooks';
import type { InterfaceType, UpdateContractRequest, MoveDefinition, Contract } from '@/types';

type AnchorIdlVersion = 'legacy' | 'new';

// Zod schema for edit contract form
const editContractSchema = z.object({
  name: z.string().min(1, 'Contract name is required').max(100, 'Name is too long'),
  address: z.string().min(1, 'Contract address is required'),
  abiJson: z.string().optional(),
  idlJson: z.string().optional(),
});

type EditContractInput = z.infer<typeof editContractSchema>;

// Example IDL placeholders for different Anchor versions
const ANCHOR_IDL_EXAMPLES = {
  legacy: `{
  "version": "0.1.0",
  "name": "my_program",
  "instructions": [
    {
      "name": "initialize",
      "accounts": [
        { "name": "authority", "isMut": true, "isSigner": true }
      ],
      "args": [
        { "name": "data", "type": "u64" }
      ]
    }
  ]
}`,
  new: `{
  "address": "Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS",
  "metadata": {
    "name": "my_program",
    "version": "0.1.0"
  },
  "instructions": [
    {
      "name": "initialize",
      "discriminator": [175, 175, 109, 31, 13, 152, 155, 237],
      "accounts": [
        { "name": "authority", "writable": true, "signer": true }
      ],
      "args": [
        { "name": "data", "type": "u64" }
      ]
    }
  ]
}`
};

interface EditContractModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (request: UpdateContractRequest) => Promise<void>;
  contract: Contract;
  ecosystem: 'evm' | 'solana' | 'aptos';
  workspaceId?: string;
}

export function EditContractModal({
  isOpen,
  onClose,
  onSave,
  contract,
  ecosystem,
  workspaceId,
}: EditContractModalProps) {
  // UI state
  const [idlVersion, setIdlVersion] = useState<AnchorIdlVersion>('new');
  const [error, setError] = useState<string | null>(null);

  // Move definition (complex nested state, kept separate)
  const [moveDefinition, setMoveDefinition] = useState<MoveDefinition>({
    moduleName: '',
    moduleAddress: '',
    functions: [],
    structs: [],
  });

  // TanStack Query hook
  const updateContract = useUpdateContract();

  // Form
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EditContractInput>({
    resolver: zodResolver(editContractSchema),
    defaultValues: {
      name: '',
      address: '',
      abiJson: '',
      idlJson: '',
    },
  });

  // Populate form when contract changes
  useEffect(() => {
    if (contract) {
      const abiJson = contract.abi ? JSON.stringify(contract.abi, null, 2) : '';
      const idlJson = contract.idl ? JSON.stringify(contract.idl, null, 2) : '';

      reset({
        name: contract.name || '',
        address: contract.address || '',
        abiJson,
        idlJson,
      });

      // Detect IDL version
      if (contract.idl) {
        const idl = contract.idl as Record<string, unknown>;
        if ('address' in idl || 'metadata' in idl) {
          setIdlVersion('new');
        } else {
          setIdlVersion('legacy');
        }
      }

      if (contract.moveDefinition) {
        setMoveDefinition(contract.moveDefinition);
      } else {
        setMoveDefinition({
          moduleName: '',
          moduleAddress: '',
          functions: [],
          structs: [],
        });
      }
    }
  }, [contract, reset]);

  // Determine interface type based on ecosystem
  const getInterfaceType = (): InterfaceType => {
    switch (ecosystem) {
      case 'evm':
        return 'abi';
      case 'solana':
        return 'idl';
      case 'aptos':
        return 'move';
      default:
        return 'abi';
    }
  };

  const onSubmit = async (data: EditContractInput) => {
    setError(null);

    // Validate ABI JSON format for EVM
    let parsedAbi: object[] | undefined;
    if (ecosystem === 'evm' && data.abiJson?.trim()) {
      try {
        parsedAbi = JSON.parse(data.abiJson);
        if (!Array.isArray(parsedAbi)) {
          setError('ABI must be a JSON array');
          return;
        }
      } catch {
        setError('Invalid ABI JSON format');
        return;
      }
    }

    // Validate IDL JSON format for Solana
    let parsedIdl: object | undefined;
    if (ecosystem === 'solana' && data.idlJson?.trim()) {
      try {
        parsedIdl = JSON.parse(data.idlJson);
      } catch {
        setError('Invalid IDL JSON format');
        return;
      }
    }

    // Validate Move definition for Aptos
    if (ecosystem === 'aptos') {
      if (!moveDefinition.moduleName.trim()) {
        setError('Module name is required for Move contracts');
        return;
      }
      if (moveDefinition.functions.length === 0) {
        setError('At least one function is required');
        return;
      }
    }

    try {
      if (onSave) {
        // Use callback if provided (maintains backward compatibility)
        const request: UpdateContractRequest = {
          contractId: contract.id,
          name: data.name.trim(),
          address: data.address.trim(),
          interfaceType: getInterfaceType(),
          abi: parsedAbi,
          idl: parsedIdl,
          moveDefinition: ecosystem === 'aptos' ? moveDefinition : undefined,
        };
        await onSave(request);
      } else {
        // Use TanStack Query mutation
        await updateContract.mutateAsync({
          contractId: contract.id,
          workspaceId,
          name: data.name.trim(),
          address: data.address.trim(),
          interfaceType: getInterfaceType(),
          abi: data.abiJson?.trim() || undefined,
          idl: data.idlJson?.trim() || undefined,
          moveDefinition: ecosystem === 'aptos' ? JSON.stringify(moveDefinition) : undefined,
        });
      }
      onClose();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const isLoading = isSubmitting || updateContract.isPending;

  const getEcosystemLabel = () => {
    switch (ecosystem) {
      case 'evm':
        return 'EVM (Solidity)';
      case 'solana':
        return 'Solana (Anchor)';
      case 'aptos':
        return 'Aptos (Move)';
      default:
        return ecosystem;
    }
  };

  const getAddressLabel = () => {
    switch (ecosystem) {
      case 'solana':
        return 'Program ID';
      case 'aptos':
        return 'Module Address';
      default:
        return 'Contract Address';
    }
  };

  const getAddressPlaceholder = () => {
    switch (ecosystem) {
      case 'solana':
        return 'e.g., Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS';
      case 'aptos':
        return '0x1::module_name';
      default:
        return '0x...';
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Contract"
      size={ecosystem === 'aptos' ? 'lg' : 'md'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit(onSubmit)} isLoading={isLoading}>
            Save Changes
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Ecosystem indicator */}
        <div className="flex items-center gap-2 p-2 bg-coco-bg-secondary rounded-md">
          <FileCode className="w-4 h-4 text-coco-accent" />
          <span className="text-sm text-coco-text-secondary">
            Editing <span className="font-medium text-coco-text-primary">{getEcosystemLabel()}</span> contract
          </span>
        </div>

        {/* Basic info */}
        <Input
          label="Contract Name"
          placeholder="Token"
          {...register('name')}
          error={errors.name?.message}
        />

        <Input
          label={getAddressLabel()}
          placeholder={getAddressPlaceholder()}
          {...register('address')}
          error={errors.address?.message}
        />

        {/* Interface input based on ecosystem */}
        {ecosystem === 'evm' && (
          <div>
            <label className="block text-sm font-medium text-coco-text-primary mb-1.5">
              ABI (JSON)
            </label>
            <textarea
              {...register('abiJson')}
              placeholder='[{"type":"function","name":"transfer",...}]'
              className="w-full h-40 px-3 py-2 text-sm font-mono bg-coco-bg-primary border border-coco-border-default rounded-md focus:outline-none focus:ring-2 focus:ring-coco-accent resize-none"
            />
            <p className="mt-1 text-xs text-coco-text-tertiary">
              Paste the contract ABI JSON array from your compiled contract or block explorer.
            </p>
          </div>
        )}

        {ecosystem === 'solana' && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-medium text-coco-text-primary">
                Anchor IDL (JSON)
              </label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-coco-text-tertiary">Version:</span>
                <select
                  value={idlVersion}
                  onChange={(e) => setIdlVersion(e.target.value as AnchorIdlVersion)}
                  className="text-xs bg-coco-bg-secondary border border-coco-border-default rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-coco-accent"
                >
                  <option value="new">Anchor 0.30+ (new format)</option>
                  <option value="legacy">Anchor &lt;0.30 (legacy)</option>
                </select>
              </div>
            </div>
            <textarea
              {...register('idlJson')}
              placeholder={ANCHOR_IDL_EXAMPLES[idlVersion]}
              className="w-full h-48 px-3 py-2 text-sm font-mono bg-coco-bg-primary border border-coco-border-default rounded-md focus:outline-none focus:ring-2 focus:ring-coco-accent resize-none"
            />
            <p className="mt-1 text-xs text-coco-text-tertiary">
              {idlVersion === 'new' ? (
                <>Paste the Anchor IDL JSON from your <code className="bg-coco-bg-secondary px-1 rounded">target/idl</code> folder. New format includes <code className="bg-coco-bg-secondary px-1 rounded">address</code> and <code className="bg-coco-bg-secondary px-1 rounded">metadata</code> fields.</>
              ) : (
                <>Paste the legacy Anchor IDL JSON. Legacy format uses <code className="bg-coco-bg-secondary px-1 rounded">version</code> and <code className="bg-coco-bg-secondary px-1 rounded">name</code> at the root level.</>
              )}
            </p>
          </div>
        )}

        {ecosystem === 'aptos' && (
          <div>
            <label className="block text-sm font-medium text-coco-text-primary mb-1.5">
              Move Module Definition
            </label>
            <p className="mb-3 text-xs text-coco-text-tertiary">
              Define the module's functions and structs manually since Move doesn't have a standard ABI format.
            </p>
            <MoveDefinitionBuilder
              value={moveDefinition}
              onChange={setMoveDefinition}
            />
          </div>
        )}

        {error && <p className="text-sm text-coco-error">{error}</p>}
      </div>
    </Modal>
  );
}
