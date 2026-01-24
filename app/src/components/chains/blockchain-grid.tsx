'use client';

import { Plus } from 'lucide-react';
import { clsx } from 'clsx';
import type { Chain } from '@/types';
import type { BlockchainDefinition } from '@/data/chain-registry';
import { CHAIN_REGISTRY } from '@/data/chain-registry';
import { BlockchainCard } from './blockchain-card';

interface BlockchainGridProps {
  chains: Chain[];
  onBlockchainClick: (blockchain: BlockchainDefinition) => void;
  onAddCustomChain: () => void;
}

export function BlockchainGrid({ chains, onBlockchainClick, onAddCustomChain }: BlockchainGridProps) {
  // Count how many activated networks per blockchain
  const activatedCountByBlockchain = chains.reduce(
    (acc, chain) => {
      const blockchain = chain.blockchain || 'custom';
      acc[blockchain] = (acc[blockchain] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  // Group custom chains separately
  const customChains = chains.filter((c) => c.isCustom);

  return (
    <div className="space-y-8">
      {/* Main blockchains */}
      <div>
        <h2 className="text-sm font-medium text-coco-text-secondary mb-4">Blockchains</h2>
        <div className="flex flex-wrap gap-4">
          {CHAIN_REGISTRY.map((blockchain) => (
            <BlockchainCard
              key={blockchain.id}
              blockchain={blockchain}
              activatedNetworkCount={activatedCountByBlockchain[blockchain.id] || 0}
              onClick={() => onBlockchainClick(blockchain)}
            />
          ))}

          {/* Add Custom Chain button */}
          <button
            onClick={onAddCustomChain}
            className={clsx(
              'w-[200px] h-[180px] p-5 rounded-lg',
              'border-2 border-dashed border-coco-border-subtle',
              'hover:border-coco-border-default hover:bg-coco-bg-elevated',
              'transition-all duration-base cursor-pointer',
              'flex flex-col items-center justify-center gap-2',
              'focus:outline-none focus:ring-2 focus:ring-coco-accent focus:ring-offset-2'
            )}
          >
            <Plus className="w-8 h-8 text-coco-text-tertiary" />
            <span className="text-sm text-coco-text-secondary">Add Custom Chain</span>
          </button>
        </div>
      </div>

      {/* Custom chains section (if any) */}
      {customChains.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-coco-text-secondary mb-4">Custom Chains</h2>
          <div className="flex flex-wrap gap-4">
            {customChains.map((chain) => (
              <button
                key={chain.id}
                onClick={() => {
                  // For custom chains, we need to create a fake blockchain definition
                  const customBlockchain: BlockchainDefinition = {
                    id: chain.blockchain,
                    name: chain.name,
                    ecosystem: chain.ecosystem,
                    nativeCurrency: chain.nativeCurrency,
                    currencyDecimals: 18,
                    iconId: 'custom',
                    networks: [],
                  };
                  onBlockchainClick(customBlockchain);
                }}
                className={clsx(
                  'relative w-[200px] h-[180px] p-5 rounded-lg',
                  'bg-coco-bg-elevated border border-coco-border-subtle',
                  'hover:border-coco-border-default hover:shadow-md',
                  'transition-all duration-base cursor-pointer',
                  'flex flex-col items-start justify-between text-left',
                  'focus:outline-none focus:ring-2 focus:ring-coco-accent focus:ring-offset-2'
                )}
              >
                <div className="relative z-10 w-full">
                  <div className="w-10 h-10 rounded-lg bg-coco-bg-tertiary flex items-center justify-center mb-3">
                    <span className="text-sm font-bold text-coco-text-secondary">
                      {chain.nativeCurrency.slice(0, 3)}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-coco-text-primary">{chain.name}</h3>
                  <p className="text-sm text-coco-text-secondary">Custom</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
