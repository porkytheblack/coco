'use client';

import { clsx } from 'clsx';
import type { WalletWithBalance } from '@/types';
import { formatBalance, truncateAddress } from '@/lib/utils/format';

interface WalletCardProps {
  wallet: WalletWithBalance;
  onClick: () => void;
}

export function WalletCard({ wallet, onClick }: WalletCardProps) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'w-[180px] flex-shrink-0 p-4 rounded-lg',
        'bg-coco-bg-elevated border border-coco-border-subtle',
        'hover:border-coco-border-default hover:shadow-sm',
        'transition-all duration-base cursor-pointer text-left',
        'focus:outline-none focus:ring-2 focus:ring-coco-accent focus:ring-offset-2'
      )}
    >
      {/* Wallet icon and name */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-2 h-2 rounded-full bg-coco-accent" />
        <span className="text-sm font-medium text-coco-text-primary truncate">
          {wallet.name}
        </span>
      </div>

      {/* Balance */}
      <div className="mb-2">
        <p className="text-lg font-semibold text-coco-text-primary">
          {formatBalance(wallet.balance.native, wallet.balance.nativeDecimals)}{' '}
          <span className="text-sm font-normal text-coco-text-secondary">
            {wallet.balance.nativeSymbol}
          </span>
        </p>
      </div>

      {/* Address */}
      <div className="text-xs text-coco-text-tertiary">
        <p>{truncateAddress(wallet.address)}</p>
      </div>
    </button>
  );
}
