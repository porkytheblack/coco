'use client';

import { useState, useEffect } from 'react';
import { Button, Input, Modal } from '@/components/ui';
import type { Ecosystem, CreateChainRequest } from '@/types';
import type { BlockchainDefinition } from '@/data/chain-registry';

interface AddChainModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (request: CreateChainRequest) => Promise<void>;
  /** Optional blockchain context for adding a custom network to an existing blockchain */
  blockchain?: BlockchainDefinition | null;
}

const ecosystemOptions: { value: Ecosystem; label: string; currency: string }[] = [
  { value: 'evm', label: 'EVM (Ethereum, Polygon, etc.)', currency: 'ETH' },
  { value: 'solana', label: 'Solana', currency: 'SOL' },
  { value: 'aptos', label: 'Aptos', currency: 'APT' },
];

export function AddChainModal({ isOpen, onClose, onAdd, blockchain }: AddChainModalProps) {
  const [name, setName] = useState('');
  const [ecosystem, setEcosystem] = useState<Ecosystem>('evm');
  const [rpcUrl, setRpcUrl] = useState('');
  const [chainId, setChainId] = useState('');
  const [blockExplorerUrl, setBlockExplorerUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // When blockchain context is provided, pre-populate and lock the ecosystem
  const isBlockchainContext = !!blockchain;

  useEffect(() => {
    if (blockchain) {
      setEcosystem(blockchain.ecosystem);
      setName(`${blockchain.name} Custom`);
    }
  }, [blockchain, isOpen]);

  const selectedEcosystem = ecosystemOptions.find((e) => e.value === ecosystem);
  const showChainId = ecosystem === 'evm';

  const handleSubmit = async () => {
    if (!name.trim() || !rpcUrl.trim()) {
      setError('Name and RPC URL are required');
      return;
    }

    if (ecosystem === 'evm' && !chainId.trim()) {
      setError('Chain ID is required for EVM chains');
      return;
    }

    const chainIdNumeric = chainId.trim() ? parseInt(chainId.trim(), 10) : undefined;
    if (ecosystem === 'evm' && (isNaN(chainIdNumeric!) || chainIdNumeric! <= 0)) {
      setError('Chain ID must be a positive number');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await onAdd({
        name: name.trim(),
        ecosystem,
        rpcUrl: rpcUrl.trim(),
        chainIdNumeric,
        currencySymbol: blockchain?.nativeCurrency || selectedEcosystem?.currency || 'ETH',
        blockExplorerUrl: blockExplorerUrl.trim() || undefined,
        blockchain: blockchain?.id || 'custom',
        networkType: 'custom',
        isCustom: true,
        iconId: blockchain?.iconId || 'custom',
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
    setEcosystem('evm');
    setRpcUrl('');
    setChainId('');
    setBlockExplorerUrl('');
    setError(null);
    onClose();
  };

  const modalTitle = blockchain
    ? `Add Custom Network to ${blockchain.name}`
    : 'Add Chain';

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={modalTitle}
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} isLoading={isLoading}>
            Add Chain
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input
          label="Chain Name"
          placeholder="Ethereum Sepolia"
          value={name}
          onChange={(e) => setName(e.target.value)}
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
              value={ecosystem}
              onChange={(e) => setEcosystem(e.target.value as Ecosystem)}
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
          value={rpcUrl}
          onChange={(e) => setRpcUrl(e.target.value)}
        />

        {showChainId && (
          <Input
            label="Chain ID"
            placeholder="11155111"
            value={chainId}
            onChange={(e) => setChainId(e.target.value)}
            type="number"
          />
        )}

        <Input
          label="Block Explorer URL (optional)"
          placeholder="https://sepolia.etherscan.io"
          value={blockExplorerUrl}
          onChange={(e) => setBlockExplorerUrl(e.target.value)}
        />

        {error && (
          <p className="text-sm text-coco-error">{error}</p>
        )}
      </div>
    </Modal>
  );
}
