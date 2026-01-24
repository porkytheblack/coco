'use client';

import { useState } from 'react';
import { Copy, CheckCircle, Trash2, RefreshCw, ExternalLink, Droplets } from 'lucide-react';
import { Modal, Button } from '@/components/ui';
import type { WalletWithBalance } from '@/types';
import { formatBalance } from '@/lib/utils/format';

interface WalletDetailModalProps {
  wallet: WalletWithBalance | null;
  isOpen: boolean;
  onClose: () => void;
  onDelete: (walletId: string) => Promise<void>;
  onRefreshBalance: (walletId: string) => Promise<void>;
  onFund: (walletId: string) => Promise<void>;
  blockExplorerUrl?: string;
}

export function WalletDetailModal({
  wallet,
  isOpen,
  onClose,
  onDelete,
  onRefreshBalance,
  onFund,
  blockExplorerUrl,
}: WalletDetailModalProps) {
  const [copied, setCopied] = useState<'address' | 'privateKey' | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isFunding, setIsFunding] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (!wallet) return null;

  const handleCopy = async (text: string, type: 'address' | 'privateKey') => {
    await navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete(wallet.id);
      onClose();
    } catch (error) {
      console.error('Failed to delete wallet:', error);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefreshBalance(wallet.id);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleFund = async () => {
    setIsFunding(true);
    try {
      await onFund(wallet.id);
    } finally {
      setIsFunding(false);
    }
  };

  const openInExplorer = () => {
    if (blockExplorerUrl) {
      window.open(`${blockExplorerUrl}/address/${wallet.address}`, '_blank');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={wallet.name}
      size="md"
    >
      <div className="space-y-6">
        {/* Balance */}
        <div className="bg-coco-bg-secondary rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-coco-text-secondary">Balance</span>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-1 hover:bg-coco-bg-tertiary rounded transition-colors"
            >
              <RefreshCw className={`w-4 h-4 text-coco-text-tertiary ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
          <p className="text-2xl font-semibold text-coco-text-primary">
            {formatBalance(wallet.balance.native, wallet.balance.nativeDecimals)}{' '}
            <span className="text-lg font-normal text-coco-text-secondary">
              {wallet.balance.nativeSymbol}
            </span>
          </p>
        </div>

        {/* Address */}
        <div>
          <label className="block text-sm font-medium text-coco-text-secondary mb-2">
            Address
          </label>
          <div className="flex items-center gap-2 bg-coco-bg-secondary rounded-lg p-3">
            <code className="flex-1 text-sm font-mono text-coco-text-primary break-all">
              {wallet.address}
            </code>
            <button
              onClick={() => handleCopy(wallet.address, 'address')}
              className="p-1.5 hover:bg-coco-bg-tertiary rounded transition-colors"
            >
              {copied === 'address' ? (
                <CheckCircle className="w-4 h-4 text-coco-success" />
              ) : (
                <Copy className="w-4 h-4 text-coco-text-tertiary" />
              )}
            </button>
            {blockExplorerUrl && (
              <button
                onClick={openInExplorer}
                className="p-1.5 hover:bg-coco-bg-tertiary rounded transition-colors"
              >
                <ExternalLink className="w-4 h-4 text-coco-text-tertiary" />
              </button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-coco-bg-secondary rounded-lg p-3">
            <p className="text-xs text-coco-text-tertiary mb-1">Transactions</p>
            <p className="text-lg font-medium text-coco-text-primary">
              {wallet.transactionCount}
            </p>
          </div>
          <div className="bg-coco-bg-secondary rounded-lg p-3">
            <p className="text-xs text-coco-text-tertiary mb-1">Created</p>
            <p className="text-sm text-coco-text-primary">
              {new Date(wallet.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            variant="secondary"
            onClick={handleFund}
            isLoading={isFunding}
            className="flex-1"
          >
            <Droplets className="w-4 h-4 mr-2" />
            Fund from Faucet
          </Button>
          {!showDeleteConfirm ? (
            <Button
              variant="danger"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={() => setShowDeleteConfirm(false)}
                size="sm"
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleDelete}
                isLoading={isDeleting}
                size="sm"
              >
                Confirm Delete
              </Button>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
