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
  evm: 'from-blue-500/20 to-purple-500/20',
  solana: 'from-purple-500/20 to-green-500/20',
  aptos: 'from-teal-500/20 to-blue-500/20',
};

export function BlockchainCard({ blockchain, activatedNetworkCount, onClick }: BlockchainCardProps) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'relative w-[200px] h-[180px] p-5 rounded-lg',
        'bg-coco-bg-elevated border border-coco-border-subtle',
        'hover:border-coco-border-default hover:shadow-md',
        'transition-all duration-base cursor-pointer',
        'flex flex-col items-start justify-between text-left',
        'focus:outline-none focus:ring-2 focus:ring-coco-accent focus:ring-offset-2'
      )}
    >
      {/* Gradient overlay */}
      <div
        className={clsx(
          'absolute inset-0 rounded-lg opacity-50',
          'bg-gradient-to-br',
          ecosystemColors[blockchain.ecosystem]
        )}
      />

      <div className="relative z-10 w-full">
        {/* Blockchain icon */}
        <div className="mb-3">
          <ChainIcon iconId={blockchain.iconId} size="lg" />
        </div>

        {/* Blockchain name */}
        <h3 className="text-lg font-semibold text-coco-text-primary">{blockchain.name}</h3>
        <p className="text-sm text-coco-text-secondary">
          {blockchain.networks.length} network{blockchain.networks.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Active networks */}
      {activatedNetworkCount > 0 && (
        <div className="relative z-10 w-full">
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-coco-accent/10 text-coco-accent">
            {activatedNetworkCount} active
          </span>
        </div>
      )}
    </button>
  );
}
