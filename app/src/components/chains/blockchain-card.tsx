'use client';

import { clsx } from 'clsx';
import type { Ecosystem } from '@/types';
import type { BlockchainDefinition } from '@/data/chain-registry';
import { ChainIcon } from '@/components/icons';

interface BlockchainCardProps {
  blockchain: BlockchainDefinition;
  activatedNetworkCount: number;
  onClick: () => void;
}

const ecosystemColors: Record<Ecosystem, string> = {
  evm: 'from-blue-500/10 to-purple-500/10',
  solana: 'from-purple-500/10 to-green-500/10',
  aptos: 'from-teal-500/10 to-blue-500/10',
};

export function BlockchainCard({ blockchain, activatedNetworkCount, onClick }: BlockchainCardProps) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'relative h-[140px] p-4 rounded-lg',
        'bg-coco-bg-elevated border border-coco-border-subtle',
        'hover:border-coco-border-default hover:shadow-md hover:scale-[1.02]',
        'transition-all duration-base cursor-pointer',
        'flex flex-col items-start justify-between text-left',
        'focus:outline-none focus:ring-2 focus:ring-coco-accent focus:ring-offset-2'
      )}
    >
      {/* Gradient overlay */}
      <div
        className={clsx(
          'absolute inset-0 rounded-lg opacity-60',
          'bg-gradient-to-br',
          ecosystemColors[blockchain.ecosystem]
        )}
      />

      <div className="relative z-10 w-full">
        {/* Blockchain icon */}
        <div className="mb-2">
          <ChainIcon iconId={blockchain.iconId} size="md" />
        </div>

        {/* Blockchain name */}
        <h3 className="text-sm font-semibold text-coco-text-primary truncate">{blockchain.name}</h3>
        <p className="text-xs text-coco-text-tertiary">
          {blockchain.networks.length} network{blockchain.networks.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Active networks badge */}
      {activatedNetworkCount > 0 && (
        <div className="relative z-10">
          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-coco-accent/15 text-coco-accent">
            {activatedNetworkCount} active
          </span>
        </div>
      )}
    </button>
  );
}
