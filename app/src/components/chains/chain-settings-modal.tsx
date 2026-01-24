'use client';

import { useState, useEffect } from 'react';
import { Trash2 } from 'lucide-react';
import { Button, Input, Modal } from '@/components/ui';
import type { Chain } from '@/types';

interface ChainSettingsModalProps {
  chain: Chain | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updates: {
    name: string;
    rpcUrl: string;
    chainIdNumeric?: number;
    blockExplorerUrl?: string;
    blockExplorerApiUrl?: string;
    blockExplorerApiKey?: string;
    faucetUrl?: string;
  }) => Promise<void>;
  onDelete: () => Promise<void>;
}

export function ChainSettingsModal({
  chain,
  isOpen,
  onClose,
  onSave,
  onDelete,
}: ChainSettingsModalProps) {
  const [name, setName] = useState('');
  const [rpcUrl, setRpcUrl] = useState('');
  const [chainId, setChainId] = useState('');
  const [blockExplorerUrl, setBlockExplorerUrl] = useState('');
  const [blockExplorerApiUrl, setBlockExplorerApiUrl] = useState('');
  const [blockExplorerApiKey, setBlockExplorerApiKey] = useState('');
  const [faucetUrl, setFaucetUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset state when chain changes
  useEffect(() => {
    if (chain) {
      setName(chain.name);
      setRpcUrl(chain.rpcUrl);
      setChainId(chain.chainIdNumeric?.toString() || '');
      setBlockExplorerUrl(chain.blockExplorerUrl || '');
      setBlockExplorerApiUrl(chain.blockExplorerApiUrl || '');
      setBlockExplorerApiKey(chain.blockExplorerApiKey || '');
      setFaucetUrl(chain.faucetUrl || '');
    }
  }, [chain]);

  if (!chain) return null;

  const showChainId = chain.ecosystem === 'evm';

  const handleSave = async () => {
    if (!name.trim() || !rpcUrl.trim()) {
      setError('Name and RPC URL are required');
      return;
    }

    if (chain.ecosystem === 'evm' && !chainId.trim()) {
      setError('Chain ID is required for EVM chains');
      return;
    }

    const chainIdNumeric = chainId.trim() ? parseInt(chainId.trim(), 10) : undefined;
    if (chain.ecosystem === 'evm' && (isNaN(chainIdNumeric!) || chainIdNumeric! <= 0)) {
      setError('Chain ID must be a positive number');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await onSave({
        name: name.trim(),
        rpcUrl: rpcUrl.trim(),
        chainIdNumeric,
        blockExplorerUrl: blockExplorerUrl.trim() || undefined,
        blockExplorerApiUrl: blockExplorerApiUrl.trim() || undefined,
        blockExplorerApiKey: blockExplorerApiKey.trim() || undefined,
        faucetUrl: faucetUrl.trim() || undefined,
      });
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
      title="Chain Settings"
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
          label="Chain Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        {/* Ecosystem (read-only) */}
        <div>
          <label className="block text-sm font-medium text-coco-text-primary mb-1.5">
            Ecosystem
          </label>
          <div className="px-3 py-2 text-sm bg-coco-bg-secondary border border-coco-border-default rounded-md text-coco-text-secondary">
            {chain.ecosystem.toUpperCase()}
          </div>
        </div>

        <Input
          label="RPC URL"
          placeholder="https://sepolia.infura.io/v3/your-api-key"
          value={rpcUrl}
          onChange={(e) => setRpcUrl(e.target.value)}
        />

        <p className="text-xs text-coco-text-tertiary -mt-2">
          Include your API key in the URL if required (e.g., Infura, Alchemy)
        </p>

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

        <Input
          label="Block Explorer API URL (optional)"
          placeholder="https://api-sepolia.etherscan.io/api"
          value={blockExplorerApiUrl}
          onChange={(e) => setBlockExplorerApiUrl(e.target.value)}
        />

        <Input
          label="Block Explorer API Key (optional)"
          placeholder="Your Etherscan API key"
          value={blockExplorerApiKey}
          onChange={(e) => setBlockExplorerApiKey(e.target.value)}
          type="password"
        />

        <p className="text-xs text-coco-text-tertiary -mt-2">
          API key for Etherscan V2 API. Get one free at etherscan.io/apis
        </p>

        <Input
          label="Faucet URL (optional)"
          placeholder="https://faucet.sepolia.dev"
          value={faucetUrl}
          onChange={(e) => setFaucetUrl(e.target.value)}
        />

        <p className="text-xs text-coco-text-tertiary -mt-2">
          URL to a faucet for getting testnet tokens
        </p>

        {/* Info */}
        <div className="bg-coco-bg-secondary rounded-lg p-3 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-coco-text-tertiary">Native Currency</span>
            <span className="text-coco-text-primary">{chain.nativeCurrency}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-coco-text-tertiary">Wallets</span>
            <span className="text-coco-text-primary">{chain.walletCount || 0}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-coco-text-tertiary">Workspaces</span>
            <span className="text-coco-text-primary">{chain.workspaceCount || 0}</span>
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
              Delete Chain
            </Button>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-coco-text-secondary text-center">
                Are you sure? This will delete all wallets and workspaces on this chain.
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
