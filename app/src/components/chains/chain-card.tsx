'use client';

import { clsx } from 'clsx';
import type { Chain, Ecosystem } from '@/types';
import { ChainIcon } from '@/components/icons';

interface ChainCardProps {
  chain: Chain;
  onClick: () => void;
}

const ecosystemColors: Record<Ecosystem, string> = {
  evm: 'from-blue-500/20 to-purple-500/20',
  solana: 'from-purple-500/20 to-green-500/20',
  aptos: 'from-teal-500/20 to-blue-500/20',
};

export function ChainCard({ chain, onClick }: ChainCardProps) {
  const networkName = chain.name;
  const subName = getSubName(chain);

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
          ecosystemColors[chain.ecosystem]
        )}
      />

      <div className="relative z-10 w-full">
        {/* Chain icon */}
        <div className="mb-3">
          <ChainIcon iconId={chain.iconId || chain.blockchain} size="md" />
        </div>

        {/* Chain name */}
        <h3 className="text-lg font-semibold text-coco-text-primary">{networkName}</h3>
        {subName && (
          <p className="text-sm text-coco-text-secondary">{subName}</p>
        )}
      </div>

      {/* Stats */}
      <div className="relative z-10 w-full text-xs text-coco-text-tertiary space-y-0.5">
        <p>{chain.walletCount || 0} wallets</p>
        <p>{chain.workspaceCount || 0} projects</p>
      </div>
    </button>
  );
}

function getSubName(chain: Chain): string | null {
  if (chain.networkType === 'mainnet') return 'Mainnet';
  if (chain.networkType === 'testnet') return 'Testnet';
  if (chain.networkType === 'devnet') return 'Devnet';
  if (chain.rpcUrl.includes('sepolia')) return 'Sepolia';
  if (chain.rpcUrl.includes('goerli')) return 'Goerli';
  if (chain.rpcUrl.includes('devnet')) return 'Devnet';
  if (chain.rpcUrl.includes('testnet')) return 'Testnet';
  if (chain.rpcUrl.includes('mainnet')) return 'Mainnet';
  return null;
}
