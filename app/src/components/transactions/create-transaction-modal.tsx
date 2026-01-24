'use client';

import { useState, useMemo } from 'react';
import { Button, Input, Modal } from '@/components/ui';
import type { Contract } from '@/types';

interface CreateTransactionModalProps {
  isOpen: boolean;
  contracts: Contract[];
  onClose: () => void;
  onCreate: (name: string, contractId?: string, functionName?: string) => Promise<void>;
}

export function CreateTransactionModal({
  isOpen,
  contracts,
  onClose,
  onCreate,
}: CreateTransactionModalProps) {
  const [name, setName] = useState('');
  const [contractId, setContractId] = useState('');
  const [functionName, setFunctionName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get the selected contract and its functions
  const selectedContract = useMemo(() => {
    return contracts.find((c) => c.id === contractId);
  }, [contracts, contractId]);

  const availableFunctions = useMemo(() => {
    if (!selectedContract?.functions) return [];
    // Show all functions (both read/view and write)
    return selectedContract.functions;
  }, [selectedContract]);

  const handleContractChange = (newContractId: string) => {
    setContractId(newContractId);
    setFunctionName(''); // Reset function when contract changes
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      setError('Transaction name is required');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await onCreate(
        name.trim(),
        contractId || undefined,
        functionName || undefined
      );
      handleClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setName('');
    setContractId('');
    setFunctionName('');
    setError(null);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="New Transaction"
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleCreate} isLoading={isLoading}>
            Create
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input
          label="Transaction Name"
          placeholder="mint-tokens"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <div>
          <label className="block text-sm font-medium text-coco-text-primary mb-1.5">
            Contract
          </label>
          <select
            value={contractId}
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
              value={functionName}
              onChange={(e) => setFunctionName(e.target.value)}
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
      </div>
    </Modal>
  );
}
