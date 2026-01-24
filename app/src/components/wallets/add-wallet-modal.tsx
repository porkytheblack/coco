'use client';

import { useState, useEffect } from 'react';
import { Button, Input, Modal } from '@/components/ui';
import type { CreateWalletRequest, ImportWalletRequest, WalletWithChain, Ecosystem } from '@/types';
import * as tauri from '@/lib/tauri';

type WalletMode = 'create' | 'import' | 'reuse';

interface AddWalletModalProps {
  isOpen: boolean;
  chainId: string;
  blockchain: string;
  ecosystem: Ecosystem;
  onClose: () => void;
  onCreate: (request: CreateWalletRequest) => Promise<void>;
  onImport: (request: ImportWalletRequest) => Promise<void>;
}

export function AddWalletModal({
  isOpen,
  chainId,
  blockchain,
  ecosystem,
  onClose,
  onCreate,
  onImport,
}: AddWalletModalProps) {
  const [mode, setMode] = useState<WalletMode>('create');
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [privateKey, setPrivateKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Determine if we need address input (Solana and Aptos require it)
  const needsAddress = ecosystem === 'solana' || ecosystem === 'aptos';

  // Get placeholder text based on ecosystem
  const getPrivateKeyPlaceholder = () => {
    switch (ecosystem) {
      case 'solana':
        return 'Base58 encoded private key';
      case 'aptos':
        return '0x... (hex encoded private key)';
      default:
        return '0x... (hex encoded private key)';
    }
  };

  const getAddressPlaceholder = () => {
    switch (ecosystem) {
      case 'solana':
        return 'Base58 public key (e.g., 7xKXt...)';
      case 'aptos':
        return '0x... (account address)';
      default:
        return '0x...';
    }
  };

  const getPrivateKeyHelp = () => {
    switch (ecosystem) {
      case 'solana':
        return 'Enter your Solana keypair (base58 encoded, 64 or 88 characters).';
      case 'aptos':
        return 'Enter your Aptos private key (hex encoded with 0x prefix).';
      default:
        return 'Enter your EVM private key (hex encoded with 0x prefix).';
    }
  };

  // Reuse mode state
  const [reusableWallets, setReusableWallets] = useState<WalletWithChain[]>([]);
  const [selectedWalletId, setSelectedWalletId] = useState<string | null>(null);
  const [loadingWallets, setLoadingWallets] = useState(false);

  // Load reusable wallets when modal opens or mode changes to reuse
  useEffect(() => {
    if (isOpen && mode === 'reuse' && blockchain) {
      loadReusableWallets();
    }
  }, [isOpen, mode, blockchain, chainId]);

  const loadReusableWallets = async () => {
    setLoadingWallets(true);
    try {
      const wallets = await tauri.listReusableWallets(blockchain, chainId);
      setReusableWallets(wallets);
    } catch (err) {
      console.error('Failed to load reusable wallets:', err);
      setReusableWallets([]);
    } finally {
      setLoadingWallets(false);
    }
  };

  const handleSubmit = async () => {
    if (mode === 'reuse') {
      if (!selectedWalletId) {
        setError('Please select a wallet to reuse');
        return;
      }

      const selectedWallet = reusableWallets.find(w => w.id === selectedWalletId);
      if (!selectedWallet) {
        setError('Selected wallet not found');
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Get the private key from the selected wallet and import it
        const pk = await tauri.getWalletPrivateKey(selectedWalletId);
        await onImport({
          chainId,
          name: name.trim() || selectedWallet.name,
          address: selectedWallet.address,
          privateKey: pk,
          ecosystem,
        });
        handleClose();
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    if (!name.trim()) {
      setError('Wallet name is required');
      return;
    }

    if (mode === 'import') {
      if (!privateKey.trim()) {
        setError('Private key is required for import');
        return;
      }
      // For Solana and Aptos, address is required
      if (needsAddress && !address.trim()) {
        setError(`Address is required for ${ecosystem === 'solana' ? 'Solana' : 'Aptos'} wallets`);
        return;
      }
    }

    setIsLoading(true);
    setError(null);

    try {
      if (mode === 'create') {
        await onCreate({
          chainId,
          name: name.trim(),
          ecosystem,
        });
      } else {
        await onImport({
          chainId,
          name: name.trim(),
          address: needsAddress ? address.trim() : undefined,
          privateKey: privateKey.trim(),
          ecosystem,
        });
      }
      handleClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setName('');
    setAddress('');
    setPrivateKey('');
    setMode('create');
    setError(null);
    setSelectedWalletId(null);
    setReusableWallets([]);
    onClose();
  };

  const getTitle = () => {
    switch (mode) {
      case 'create': return 'Create Wallet';
      case 'import': return 'Import Wallet';
      case 'reuse': return 'Reuse Wallet';
    }
  };

  const getSubmitLabel = () => {
    switch (mode) {
      case 'create': return 'Create';
      case 'import': return 'Import';
      case 'reuse': return 'Add to Chain';
    }
  };

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={getTitle()}
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} isLoading={isLoading}>
            {getSubmitLabel()}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Mode selector */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setMode('create')}
            className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
              mode === 'create'
                ? 'bg-coco-accent text-white'
                : 'bg-coco-bg-secondary text-coco-text-secondary hover:text-coco-text-primary'
            }`}
          >
            Create New
          </button>
          <button
            type="button"
            onClick={() => setMode('import')}
            className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
              mode === 'import'
                ? 'bg-coco-accent text-white'
                : 'bg-coco-bg-secondary text-coco-text-secondary hover:text-coco-text-primary'
            }`}
          >
            Import
          </button>
          <button
            type="button"
            onClick={() => setMode('reuse')}
            className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
              mode === 'reuse'
                ? 'bg-coco-accent text-white'
                : 'bg-coco-bg-secondary text-coco-text-secondary hover:text-coco-text-primary'
            }`}
          >
            Reuse
          </button>
        </div>

        {/* Create mode */}
        {mode === 'create' && (
          <>
            <Input
              label="Wallet Name"
              placeholder="deployer"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <p className="text-xs text-coco-text-tertiary">
              A new wallet will be generated with a random private key. The key will be stored
              securely and can be exported later.
            </p>
          </>
        )}

        {/* Import mode */}
        {mode === 'import' && (
          <>
            <Input
              label="Wallet Name"
              placeholder="deployer"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            {needsAddress && (
              <Input
                label="Address"
                placeholder={getAddressPlaceholder()}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            )}
            <Input
              label="Private Key"
              type="password"
              placeholder={getPrivateKeyPlaceholder()}
              value={privateKey}
              onChange={(e) => setPrivateKey(e.target.value)}
            />
            <p className="text-xs text-coco-text-tertiary">
              {getPrivateKeyHelp()} The key will be stored securely.
            </p>
          </>
        )}

        {/* Reuse mode */}
        {mode === 'reuse' && (
          <>
            {loadingWallets ? (
              <div className="text-center py-4 text-coco-text-secondary">
                Loading wallets...
              </div>
            ) : reusableWallets.length === 0 ? (
              <div className="text-center py-4 text-coco-text-secondary">
                No wallets found on other {blockchain} networks.
                <br />
                <span className="text-xs">Create a wallet on another network first.</span>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-coco-text-primary">
                    Select a wallet to reuse
                  </label>
                  <div className="max-h-48 overflow-y-auto space-y-2">
                    {reusableWallets.map((wallet) => (
                      <button
                        key={wallet.id}
                        type="button"
                        onClick={() => setSelectedWalletId(wallet.id)}
                        className={`w-full p-3 text-left rounded-md border transition-colors ${
                          selectedWalletId === wallet.id
                            ? 'border-coco-accent bg-coco-accent/10'
                            : 'border-coco-border-default bg-coco-bg-secondary hover:border-coco-border-hover'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-medium text-coco-text-primary">{wallet.name}</div>
                            <div className="text-xs text-coco-text-tertiary font-mono">
                              {truncateAddress(wallet.address)}
                            </div>
                          </div>
                          <div className="text-xs text-coco-text-secondary">
                            {wallet.chainName}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
                <Input
                  label="Wallet Name (optional)"
                  placeholder={reusableWallets.find(w => w.id === selectedWalletId)?.name || 'deployer'}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                <p className="text-xs text-coco-text-tertiary">
                  The same wallet address will be added to this chain. Leave name empty to keep the original name.
                </p>
              </>
            )}
          </>
        )}

        {error && <p className="text-sm text-coco-error">{error}</p>}
      </div>
    </Modal>
  );
}
