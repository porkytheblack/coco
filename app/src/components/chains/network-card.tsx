'use client';

import { useState } from 'react';
import { Settings, Trash2, Check, ExternalLink } from 'lucide-react';
import { clsx } from 'clsx';
import { Card, IconButton, Badge } from '@/components/ui';
import { ChainIcon } from '@/components/icons';
import type { Chain, NetworkType } from '@/types';

interface NetworkCardProps {
  chain: Chain;
  isActive?: boolean;
  onSelect: (chain: Chain) => void;
  onSettings: (chain: Chain) => void;
  onDelete: (chain: Chain) => void;
}

const networkTypeBadge: Record<NetworkType, { label: string; variant: 'success' | 'pending' | 'contract' }> = {
  mainnet: { label: 'Mainnet', variant: 'success' },
  testnet: { label: 'Testnet', variant: 'pending' },
  devnet: { label: 'Devnet', variant: 'contract' },
  custom: { label: 'Custom', variant: 'contract' },
};

export function NetworkCard({ chain, isActive, onSelect, onSettings, onDelete }: NetworkCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const badgeInfo = networkTypeBadge[chain.networkType] || networkTypeBadge.custom;

  return (
    <Card
      className={clsx(
        'p-4 cursor-pointer transition-all',
        isActive
          ? 'border-coco-accent bg-coco-accent/5'
          : 'hover:border-coco-accent/50'
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onSelect(chain)}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <ChainIcon iconId={chain.iconId || 'custom'} size="md" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-coco-text-primary truncate">{chain.name}</h3>
              {isActive && (
                <span className="flex items-center gap-1 text-xs text-coco-accent">
                  <Check className="w-3 h-3" />
                  Active
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={badgeInfo.variant}>{badgeInfo.label}</Badge>
              <span className="text-xs text-coco-text-tertiary uppercase">
                {chain.ecosystem}
              </span>
            </div>
            <p className="text-xs text-coco-text-tertiary mt-2 truncate font-mono">
              {chain.rpcUrl}
            </p>
          </div>
        </div>

        <div
          className={`flex items-center gap-1 transition-opacity ${
            isHovered ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {chain.faucetUrl && (
            <a
              href={chain.faucetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-coco-text-tertiary hover:text-coco-text-secondary rounded-md hover:bg-coco-bg-tertiary"
              title="Faucet"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
          <IconButton
            icon={<Settings className="w-4 h-4" />}
            label="Network settings"
            onClick={() => onSettings(chain)}
          />
          <IconButton
            icon={<Trash2 className="w-4 h-4" />}
            label="Delete network"
            onClick={() => onDelete(chain)}
            variant="danger"
          />
        </div>
      </div>
    </Card>
  );
}
