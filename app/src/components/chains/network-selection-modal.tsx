'use client';

import { useState } from 'react';
import { Check, ExternalLink, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';
import { Button, Modal } from '@/components/ui';
import { ChainIcon } from '@/components/icons';
import type { Chain, NetworkType } from '@/types';
import type { BlockchainDefinition, NetworkDefinition } from '@/data/chain-registry';

interface NetworkSelectionModalProps {
  isOpen: boolean;
  blockchain: BlockchainDefinition | null;
  activatedChains: Chain[];
  onClose: () => void;
  onActivateNetwork: (blockchain: BlockchainDefinition, network: NetworkDefinition) => Promise<void>;
  onGoToChain: (chain: Chain) => void;
}

const networkTypeLabels: Record<NetworkType, string> = {
  mainnet: 'Mainnet',
  testnet: 'Testnet',
  devnet: 'Devnet',
  custom: 'Custom',
};

const networkTypeBadgeColors: Record<NetworkType, string> = {
  mainnet: 'bg-green-500/10 text-green-500',
  testnet: 'bg-yellow-500/10 text-yellow-500',
  devnet: 'bg-blue-500/10 text-blue-500',
  custom: 'bg-gray-500/10 text-gray-500',
};

export function NetworkSelectionModal({
  isOpen,
  blockchain,
  activatedChains,
  onClose,
  onActivateNetwork,
  onGoToChain,
}: NetworkSelectionModalProps) {
  const [activatingNetworkId, setActivatingNetworkId] = useState<string | null>(null);

  if (!blockchain) return null;

  // Map of activated chain IDs for this blockchain
  const activatedChainIds = new Set(
    activatedChains
      .filter((c) => c.blockchain === blockchain.id)
      .map((c) => c.id)
  );

  // Get the chain object for an activated network
  const getActivatedChain = (networkId: string): Chain | undefined => {
    return activatedChains.find((c) => c.id === networkId);
  };

  const handleActivateNetwork = async (network: NetworkDefinition) => {
    setActivatingNetworkId(network.id);
    try {
      await onActivateNetwork(blockchain, network);
    } finally {
      setActivatingNetworkId(null);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-3">
          <ChainIcon iconId={blockchain.iconId} size="md" />
          <span>{blockchain.name}</span>
        </div>
      }
      size="md"
    >
      <div className="space-y-2">
        <p className="text-sm text-coco-text-secondary mb-4">
          Select a network to activate. Activated networks will appear in your workspace.
        </p>

        {blockchain.networks.map((network) => {
          const isActivated = activatedChainIds.has(network.id);
          const activatedChain = getActivatedChain(network.id);
          const isActivating = activatingNetworkId === network.id;

          return (
            <div
              key={network.id}
              className={clsx(
                'flex items-center justify-between p-4 rounded-lg border',
                isActivated
                  ? 'bg-coco-bg-elevated border-coco-accent/30'
                  : 'bg-coco-bg-primary border-coco-border-subtle hover:border-coco-border-default'
              )}
            >
              <div className="flex items-center gap-3">
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-coco-text-primary">{network.name}</span>
                    <span
                      className={clsx(
                        'px-2 py-0.5 rounded-full text-xs font-medium',
                        networkTypeBadgeColors[network.networkType]
                      )}
                    >
                      {networkTypeLabels[network.networkType]}
                    </span>
                    {isActivated && (
                      <span className="flex items-center gap-1 text-xs text-coco-accent">
                        <Check className="w-3 h-3" />
                        Active
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-coco-text-tertiary mt-0.5 truncate max-w-[300px]">
                    {network.rpcUrl}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {network.faucetUrl && (
                  <a
                    href={network.faucetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 text-coco-text-tertiary hover:text-coco-text-secondary"
                    title="Faucet"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}

                {isActivated && activatedChain ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      onGoToChain(activatedChain);
                      onClose();
                    }}
                  >
                    Go to Chain
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleActivateNetwork(network)}
                    disabled={isActivating}
                  >
                    {isActivating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-1" />
                        Activating...
                      </>
                    ) : (
                      'Activate'
                    )}
                  </Button>
                )}
              </div>
            </div>
          );
        })}

        {blockchain.networks.length === 0 && (
          <div className="text-center py-8 text-coco-text-tertiary">
            No networks configured for this blockchain.
          </div>
        )}
      </div>
    </Modal>
  );
}
