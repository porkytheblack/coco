'use client';

import { ChevronRight, Plus } from 'lucide-react';
import { WalletCard } from './wallet-card';
import { IconButton } from '@/components/ui';
import type { WalletWithBalance } from '@/types';

interface WalletListProps {
  wallets: WalletWithBalance[];
  onWalletClick: (wallet: WalletWithBalance) => void;
  onAddWallet: () => void;
}

export function WalletList({ wallets, onWalletClick, onAddWallet }: WalletListProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-coco-text-primary">Wallets</h2>
        <button
          onClick={onAddWallet}
          className="text-sm text-coco-accent hover:text-coco-accent-hover flex items-center gap-1"
        >
          <Plus className="w-4 h-4" />
          Add wallet
        </button>
      </div>

      <div className="relative">
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {wallets.map((wallet) => (
            <WalletCard
              key={wallet.id}
              wallet={wallet}
              onClick={() => onWalletClick(wallet)}
            />
          ))}

          {wallets.length === 0 && (
            <div className="w-[180px] h-[140px] flex items-center justify-center border border-dashed border-coco-border-default rounded-lg">
              <button
                onClick={onAddWallet}
                className="text-sm text-coco-text-tertiary hover:text-coco-text-secondary"
              >
                + Create wallet
              </button>
            </div>
          )}
        </div>

        {/* Scroll indicator */}
        {wallets.length > 4 && (
          <div className="absolute right-0 top-1/2 -translate-y-1/2 bg-gradient-to-l from-coco-bg-primary to-transparent w-16 h-full flex items-center justify-end pointer-events-none">
            <ChevronRight className="w-5 h-5 text-coco-text-tertiary mr-2" />
          </div>
        )}
      </div>
    </div>
  );
}
