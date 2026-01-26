'use client';

import { Plus } from 'lucide-react';
import { clsx } from 'clsx';
import type { Chain, Ecosystem } from '@/types';
import type { BlockchainDefinition } from '@/data/chain-registry';
import { CHAIN_REGISTRY } from '@/data/chain-registry';
import { BlockchainCard } from './blockchain-card';

interface BlockchainGridProps {
  chains: Chain[];
  searchQuery?: string;
  onBlockchainClick: (blockchain: BlockchainDefinition) => void;
  onAddCustomChain: () => void;
}

// Ecosystem display info
const ecosystemInfo: Record<Ecosystem, { name: string; description: string }> = {
  evm: { name: 'EVM', description: 'Ethereum Virtual Machine compatible chains' },
  solana: { name: 'Solana', description: 'Solana blockchain ecosystem' },
  aptos: { name: 'Move', description: 'Move-based blockchains' },
};

export function BlockchainGrid({ chains, searchQuery = '', onBlockchainClick, onAddCustomChain }: BlockchainGridProps) {
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

  // Filter blockchains by search query
  const filteredRegistry = searchQuery
    ? CHAIN_REGISTRY.filter(
        (blockchain) =>
          blockchain.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          blockchain.ecosystem.toLowerCase().includes(searchQuery.toLowerCase()) ||
          blockchain.nativeCurrency.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : CHAIN_REGISTRY;

  const filteredCustomChains = searchQuery
    ? customChains.filter(
        (chain) =>
          chain.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          chain.ecosystem.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : customChains;

  // Group blockchains by ecosystem
  const blockchainsByEcosystem = filteredRegistry.reduce(
    (acc, blockchain) => {
      if (!acc[blockchain.ecosystem]) {
        acc[blockchain.ecosystem] = [];
      }
      acc[blockchain.ecosystem].push(blockchain);
      return acc;
    },
    {} as Record<Ecosystem, BlockchainDefinition[]>
  );

  // Define ecosystem order for display
  const ecosystemOrder: Ecosystem[] = ['evm', 'solana', 'aptos'];

  return (
    <div className="w-full max-w-5xl space-y-8">
      {/* Blockchains grouped by ecosystem */}
      {ecosystemOrder.map((ecosystem) => {
        const blockchains = blockchainsByEcosystem[ecosystem];
        if (!blockchains || blockchains.length === 0) return null;

        return (
          <div key={ecosystem}>
            {/* Ecosystem header */}
            <div className="mb-4">
              <h2 className="text-sm font-semibold text-coco-text-secondary uppercase tracking-wider">
                {ecosystemInfo[ecosystem].name}
              </h2>
              <p className="text-xs text-coco-text-tertiary mt-0.5">
                {ecosystemInfo[ecosystem].description}
              </p>
            </div>

            {/* Blockchain cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {blockchains.map((blockchain) => (
                <BlockchainCard
                  key={blockchain.id}
                  blockchain={blockchain}
                  activatedNetworkCount={activatedCountByBlockchain[blockchain.id] || 0}
                  onClick={() => onBlockchainClick(blockchain)}
                />
              ))}
            </div>
          </div>
        );
      })}

      {/* Add Custom Chain section */}
      <div>
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-coco-text-secondary uppercase tracking-wider">
            Custom
          </h2>
          <p className="text-xs text-coco-text-tertiary mt-0.5">
            Add your own RPC endpoints
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {/* Custom chains */}
          {filteredCustomChains.map((chain) => (
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
                'relative h-[140px] p-4 rounded-lg',
                'bg-coco-bg-elevated border border-coco-border-subtle',
                'hover:border-coco-border-default hover:shadow-md',
                'transition-all duration-base cursor-pointer',
                'flex flex-col items-start justify-between text-left',
                'focus:outline-none focus:ring-2 focus:ring-coco-accent focus:ring-offset-2'
              )}
            >
              <div className="relative z-10 w-full">
                <div className="w-8 h-8 rounded-lg bg-coco-bg-tertiary flex items-center justify-center mb-2">
                  <span className="text-xs font-bold text-coco-text-secondary">
                    {chain.nativeCurrency.slice(0, 3)}
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-coco-text-primary truncate">{chain.name}</h3>
                <p className="text-xs text-coco-text-tertiary">Custom</p>
              </div>
            </button>
          ))}

          {/* Add Custom Chain button */}
          <button
            onClick={onAddCustomChain}
            className={clsx(
              'h-[140px] p-4 rounded-lg',
              'border-2 border-dashed border-coco-border-subtle',
              'hover:border-coco-border-default hover:bg-coco-bg-elevated',
              'transition-all duration-base cursor-pointer',
              'flex flex-col items-center justify-center gap-2',
              'focus:outline-none focus:ring-2 focus:ring-coco-accent focus:ring-offset-2'
            )}
          >
            <Plus className="w-6 h-6 text-coco-text-tertiary" />
            <span className="text-xs text-coco-text-secondary">Add Custom</span>
          </button>
        </div>
      </div>
    </div>
  );
}
