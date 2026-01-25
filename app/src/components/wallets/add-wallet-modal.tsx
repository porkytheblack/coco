'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Input, Modal } from '@/components/ui';
import { useCreateWallet, useImportWallet, useReusableWallets, useGetWalletPrivateKey } from '@/hooks';
import type { CreateWalletRequest, ImportWalletRequest, Ecosystem } from '@/types';

type WalletMode = 'create' | 'import' | 'reuse';

// Schema for create mode
const createWalletSchema = z.object({
  name: z.string().min(1, 'Wallet name is required').max(50, 'Name is too long'),
});

// Schema for import mode - address required for non-EVM
const importWalletSchema = z.object({
  name: z.string().min(1, 'Wallet name is required').max(50, 'Name is too long'),
  privateKey: z.string().min(1, 'Private key is required'),
  address: z.string().optional(),
});

// Schema for reuse mode
const reuseWalletSchema = z.object({
  selectedWalletId: z.string().min(1, 'Please select a wallet to reuse'),
  name: z.string().optional(),
});

type CreateWalletInput = z.infer<typeof createWalletSchema>;
type ImportWalletInput = z.infer<typeof importWalletSchema>;
type ReuseWalletInput = z.infer<typeof reuseWalletSchema>;

interface AddWalletModalProps {
  isOpen: boolean;
  chainId: string;
  blockchain: string;
  ecosystem: Ecosystem;
  onClose: () => void;
  onCreate?: (request: CreateWalletRequest) => Promise<void>;
  onImport?: (request: ImportWalletRequest) => Promise<void>;
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
  const [error, setError] = useState<string | null>(null);

  // TanStack Query hooks
  const createWallet = useCreateWallet();
  const importWallet = useImportWallet();
  const getWalletPrivateKey = useGetWalletPrivateKey();
  const { data: reusableWallets = [], isLoading: loadingWallets } = useReusableWallets(
    mode === 'reuse' ? blockchain : undefined,
    mode === 'reuse' ? chainId : undefined
  );

  // Determine if we need address input (Solana and Aptos require it)
  const needsAddress = ecosystem === 'solana' || ecosystem === 'aptos';

  // Create form
  const createForm = useForm<CreateWalletInput>({
    resolver: zodResolver(createWalletSchema),
    defaultValues: { name: '' },
  });

  // Import form
  const importForm = useForm<ImportWalletInput>({
    resolver: zodResolver(needsAddress
      ? importWalletSchema.refine(
          (data) => data.address && data.address.trim().length > 0,
          { message: `Address is required for ${ecosystem === 'solana' ? 'Solana' : 'Aptos'} wallets`, path: ['address'] }
        )
      : importWalletSchema
    ),
    defaultValues: { name: '', privateKey: '', address: '' },
  });

  // Reuse form
  const reuseForm = useForm<ReuseWalletInput>({
    resolver: zodResolver(reuseWalletSchema),
    defaultValues: { selectedWalletId: '', name: '' },
  });

  // Reset forms when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      createForm.reset({ name: '' });
      importForm.reset({ name: '', privateKey: '', address: '' });
      reuseForm.reset({ selectedWalletId: '', name: '' });
      setMode('create');
      setError(null);
    }
  }, [isOpen]);

  // Get placeholder text based on ecosystem
  const getPrivateKeyPlaceholder = () => {
    switch (ecosystem) {
      case 'solana': return 'Base58 encoded private key';
      case 'aptos': return '0x... (hex encoded private key)';
      default: return '0x... (hex encoded private key)';
    }
  };

  const getAddressPlaceholder = () => {
    switch (ecosystem) {
      case 'solana': return 'Base58 public key (e.g., 7xKXt...)';
      case 'aptos': return '0x... (account address)';
      default: return '0x...';
    }
  };

  const getPrivateKeyHelp = () => {
    switch (ecosystem) {
      case 'solana': return 'Enter your Solana keypair (base58 encoded, 64 or 88 characters).';
      case 'aptos': return 'Enter your Aptos private key (hex encoded with 0x prefix).';
      default: return 'Enter your EVM private key (hex encoded with 0x prefix).';
    }
  };

  const handleCreate = async (data: CreateWalletInput) => {
    setError(null);
    try {
      const request: CreateWalletRequest = {
        chainId,
        name: data.name.trim(),
        ecosystem,
      };
      if (onCreate) {
        await onCreate(request);
      } else {
        await createWallet.mutateAsync(request);
      }
      handleClose();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleImport = async (data: ImportWalletInput) => {
    setError(null);
    try {
      const request: ImportWalletRequest = {
        chainId,
        name: data.name.trim(),
        privateKey: data.privateKey.trim(),
        address: needsAddress ? data.address?.trim() : undefined,
        ecosystem,
      };
      if (onImport) {
        await onImport(request);
      } else {
        await importWallet.mutateAsync(request);
      }
      handleClose();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleReuse = async (data: ReuseWalletInput) => {
    setError(null);
    const selectedWallet = reusableWallets.find(w => w.id === data.selectedWalletId);
    if (!selectedWallet) {
      setError('Selected wallet not found');
      return;
    }

    try {
      // Get the private key from the selected wallet and import it
      const pk = await getWalletPrivateKey.mutateAsync(data.selectedWalletId);
      const request: ImportWalletRequest = {
        chainId,
        name: data.name?.trim() || selectedWallet.name,
        address: selectedWallet.address,
        privateKey: pk,
        ecosystem,
      };
      if (onImport) {
        await onImport(request);
      } else {
        await importWallet.mutateAsync(request);
      }
      handleClose();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleSubmit = () => {
    if (mode === 'create') {
      createForm.handleSubmit(handleCreate)();
    } else if (mode === 'import') {
      importForm.handleSubmit(handleImport)();
    } else {
      reuseForm.handleSubmit(handleReuse)();
    }
  };

  const handleClose = () => {
    createForm.reset();
    importForm.reset();
    reuseForm.reset();
    setMode('create');
    setError(null);
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

  const isLoading = createForm.formState.isSubmitting ||
    importForm.formState.isSubmitting ||
    reuseForm.formState.isSubmitting ||
    createWallet.isPending ||
    importWallet.isPending ||
    getWalletPrivateKey.isPending;

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
          <form onSubmit={createForm.handleSubmit(handleCreate)} className="space-y-4">
            <Input
              label="Wallet Name"
              placeholder="deployer"
              {...createForm.register('name')}
              error={createForm.formState.errors.name?.message}
            />
            <p className="text-xs text-coco-text-tertiary">
              A new wallet will be generated with a random private key. The key will be stored
              securely and can be exported later.
            </p>
          </form>
        )}

        {/* Import mode */}
        {mode === 'import' && (
          <form onSubmit={importForm.handleSubmit(handleImport)} className="space-y-4">
            <Input
              label="Wallet Name"
              placeholder="deployer"
              {...importForm.register('name')}
              error={importForm.formState.errors.name?.message}
            />
            {needsAddress && (
              <Input
                label="Address"
                placeholder={getAddressPlaceholder()}
                {...importForm.register('address')}
                error={importForm.formState.errors.address?.message}
              />
            )}
            <Input
              label="Private Key"
              type="password"
              placeholder={getPrivateKeyPlaceholder()}
              {...importForm.register('privateKey')}
              error={importForm.formState.errors.privateKey?.message}
            />
            <p className="text-xs text-coco-text-tertiary">
              {getPrivateKeyHelp()} The key will be stored securely.
            </p>
          </form>
        )}

        {/* Reuse mode */}
        {mode === 'reuse' && (
          <form onSubmit={reuseForm.handleSubmit(handleReuse)} className="space-y-4">
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
                        onClick={() => reuseForm.setValue('selectedWalletId', wallet.id)}
                        className={`w-full p-3 text-left rounded-md border transition-colors ${
                          reuseForm.watch('selectedWalletId') === wallet.id
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
                  {reuseForm.formState.errors.selectedWalletId && (
                    <p className="text-xs text-coco-error">{reuseForm.formState.errors.selectedWalletId.message}</p>
                  )}
                </div>
                <Input
                  label="Wallet Name (optional)"
                  placeholder={reusableWallets.find(w => w.id === reuseForm.watch('selectedWalletId'))?.name || 'deployer'}
                  {...reuseForm.register('name')}
                />
                <p className="text-xs text-coco-text-tertiary">
                  The same wallet address will be added to this chain. Leave name empty to keep the original name.
                </p>
              </>
            )}
          </form>
        )}

        {error && <p className="text-sm text-coco-error">{error}</p>}
      </div>
    </Modal>
  );
}
