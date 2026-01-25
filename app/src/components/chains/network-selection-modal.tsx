'use client';

import { useState } from 'react';
import { Check, ExternalLink, Loader2, Plus, Settings, Trash2 } from 'lucide-react';
import { clsx } from 'clsx';
import { Button, Modal, IconButton } from '@/components/ui';
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
  onAddCustomNetwork?: (blockchain: BlockchainDefinition) => void;
  onEditChain?: (chain: Chain) => void;
  onDeleteChain?: (chain: Chain) => void;
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
  onAddCustomNetwork,
  onEditChain,
  onDeleteChain,
}: NetworkSelectionModalProps) {
  const [activatingNetworkId, setActivatingNetworkId] = useState<string | null>(null);

  if (!blockchain) return null;

  // Filter chains that belong to this blockchain
  const blockchainChains = activatedChains.filter((c) => c.blockchain === blockchain.id);

  // Map of activated chain IDs for this blockchain
  const activatedChainIds = new Set(blockchainChains.map((c) => c.id));

  // Get the chain object for an activated network
  const getActivatedChain = (networkId: string): Chain | undefined => {
    return activatedChains.find((c) => c.id === networkId);
  };

  // Get custom networks (chains not in the registry)
  const customChains = blockchainChains.filter((chain) => {
    const isInRegistry = blockchain.networks.some((n) => n.id === chain.id);
    return !isInRegistry || chain.isCustom;
  });

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
      <div className="space-y-4">
        <p className="text-sm text-coco-text-secondary">
          Select a network to activate or manage your existing networks.
        </p>

        {/* Registry Networks */}
        {blockchain.networks.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-medium text-coco-text-tertiary uppercase tracking-wider">
              Available Networks
            </h3>
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
                      <div className="flex items-center gap-1">
                        {onEditChain && (
                          <IconButton
                            icon={<Settings className="w-4 h-4" />}
                            label="Edit network"
                            onClick={() => onEditChain(activatedChain)}
                          />
                        )}
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            onGoToChain(activatedChain);
                            onClose();
                          }}
                        >
                          Open
                        </Button>
                      </div>
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
          </div>
        )}

        {/* Custom Networks */}
        {customChains.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-medium text-coco-text-tertiary uppercase tracking-wider">
              Custom Networks
            </h3>
            {customChains.map((chain) => (
              <div
                key={chain.id}
                className="flex items-center justify-between p-4 rounded-lg border bg-coco-bg-elevated border-coco-border-subtle"
              >
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-coco-text-primary">{chain.name}</span>
                    <span className={clsx('px-2 py-0.5 rounded-full text-xs font-medium', networkTypeBadgeColors.custom)}>
                      Custom
                    </span>
                  </div>
                  <span className="text-xs text-coco-text-tertiary mt-0.5 truncate max-w-[300px]">
                    {chain.rpcUrl}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  {onEditChain && (
                    <IconButton
                      icon={<Settings className="w-4 h-4" />}
                      label="Edit network"
                      onClick={() => onEditChain(chain)}
                    />
                  )}
                  {onDeleteChain && (
                    <IconButton
                      icon={<Trash2 className="w-4 h-4" />}
                      label="Delete network"
                      onClick={() => onDeleteChain(chain)}
                      variant="danger"
                    />
                  )}
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      onGoToChain(chain);
                      onClose();
                    }}
                  >
                    Open
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add Custom Network Button */}
        {onAddCustomNetwork && (
          <button
            onClick={() => onAddCustomNetwork(blockchain)}
            className={clsx(
              'w-full flex items-center justify-center gap-2 p-4 rounded-lg',
              'border-2 border-dashed border-coco-border-subtle',
              'hover:border-coco-border-default hover:bg-coco-bg-secondary',
              'transition-colors text-coco-text-secondary hover:text-coco-text-primary'
            )}
          >
            <Plus className="w-4 h-4" />
            <span>Add Custom Network</span>
          </button>
        )}

        {blockchain.networks.length === 0 && customChains.length === 0 && (
          <div className="text-center py-8 text-coco-text-tertiary">
            No networks configured for this blockchain.
            {onAddCustomNetwork && (
              <button
                onClick={() => onAddCustomNetwork(blockchain)}
                className="block mx-auto mt-2 text-coco-accent hover:underline"
              >
                Add a custom network
              </button>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
