'use client';

import { useEffect, useState } from 'react';
import { Settings, Plus, Play, Rocket, Copy, ExternalLink, Trash2, RefreshCw, ArrowUpRight, ArrowDownLeft, Sun, Moon, Search, Send, Droplet, FileCode, Key, Files, GripVertical, Eye, EyeOff, AlertTriangle, CheckCircle } from 'lucide-react';
import Image from 'next/image';
import { TopBar } from '@/components/layout';
import { IconButton, Button, StatusIndicator, CocoLogo } from '@/components/ui';
import { WalletList, AddWalletModal, SendModal } from '@/components/wallets';
import { WorkspaceGrid, CreateWorkspaceModal, WorkspaceSettingsModal } from '@/components/workspaces';
import { AddChainModal, ChainSettingsModal, BlockchainGrid, NetworkSelectionModal } from '@/components/chains';
import { ContractList, AddContractModal, EditContractModal, ContractPanel } from '@/components/contracts';
import { TransactionPanel, CreateTransactionModal } from '@/components/transactions';
import { AISettingsModal, CocoChatDrawer } from '@/components/ai';
import { ScriptList } from '@/components/scripts';
import { EnvVarList } from '@/components/env';
import { WorkflowList, CreateWorkflowModal, WorkflowBuilder } from '@/components/workflows';
import { useWorkflows, useWorkflow, useCreateWorkflow, useUpdateWorkflow, useRunWorkflow } from '@/hooks/use-workflows';
import { useScripts, useGetWalletPrivateKey } from '@/hooks';
import { useChainStore, useWalletStore, useWorkspaceStore, useToastStore, useThemeStore, useAIStore } from '@/stores';
import { useRouter } from '@/contexts';
import { openExternal } from '@/lib/tauri/commands';
import { clsx } from 'clsx';
import type { BlockchainDefinition, NetworkDefinition } from '@/data/chain-registry';
import { getExplorerUrl } from '@/lib/adapters/aptos-adapter';

export default function AppPage() {
  // Use the client-side router for URL-based navigation
  const { route, navigate } = useRouter();
  const [showAddChain, setShowAddChain] = useState(false);
  const [selectedBlockchain, setSelectedBlockchain] = useState<BlockchainDefinition | null>(null);
  const [showNetworkModal, setShowNetworkModal] = useState(false);
  const [addChainBlockchain, setAddChainBlockchain] = useState<BlockchainDefinition | null>(null);
  const [chainToEdit, setChainToEdit] = useState<typeof chains[0] | null>(null);
  const [showChainEditModal, setShowChainEditModal] = useState(false);

  // Chain selection page state
  const { chains, selectedChain, selectChain, addChain, updateChain, deleteChain, loadChains } = useChainStore();
  const { recentWorkspaces, loadRecentWorkspaces } = useWorkspaceStore();
  const { addToast } = useToastStore();
  const [showChainSettings, setShowChainSettings] = useState(false);

  // Chain dashboard state
  const { wallets, loadWallets, createWallet, importWallet, deleteWallet, refreshBalance, walletTransactions, loadWalletTransactions, selectedWallet, selectWallet } = useWalletStore();
  const { workspaces, loadWorkspaces, createWorkspace } = useWorkspaceStore();
  const [showAddWallet, setShowAddWallet] = useState(false);
  const [showCreateWorkspace, setShowCreateWorkspace] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [showExportKey, setShowExportKey] = useState(false);
  const [exportedPrivateKey, setExportedPrivateKey] = useState<string | null>(null);
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [copiedPrivateKey, setCopiedPrivateKey] = useState(false);
  const getPrivateKeyMutation = useGetWalletPrivateKey();

  // Workspace state
  const {
    currentWorkspace,
    contracts,
    transactions,
    selectedTransaction,
    loadWorkspace,
    selectTransaction,
    clearWorkspace,
    addContract,
    updateContract,
    deleteContract,
    createTransaction,
    executeTransaction,
    deleteTransaction,
    reorderTransactions,
    deleteWorkspace,
    getTransactionRuns,
  } = useWorkspaceStore();

  // Transaction reordering state
  const [draggedTxIndex, setDraggedTxIndex] = useState<number | null>(null);

  // Workspace modals state
  const [showAddContract, setShowAddContract] = useState(false);
  const [showEditContract, setShowEditContract] = useState(false);
  const [contractToEdit, setContractToEdit] = useState<typeof contracts[0] | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showCreateTransaction, setShowCreateTransaction] = useState(false);
  const [selectedContract, setSelectedContract] = useState<typeof contracts[0] | null>(null);
  const [workspaceTab, setWorkspaceTab] = useState<'contracts' | 'scripts' | 'env' | 'workflows'>('contracts');
  const [showCreateWorkflow, setShowCreateWorkflow] = useState(false);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(null);

  // Workflow hooks
  const { data: workflows = [], isLoading: isLoadingWorkflows } = useWorkflows(currentWorkspace?.id);
  const { data: scripts = [] } = useScripts(currentWorkspace?.id);
  const { data: selectedWorkflow } = useWorkflow(selectedWorkflowId || undefined);
  const createWorkflowMutation = useCreateWorkflow();
  const updateWorkflowMutation = useUpdateWorkflow();
  const runWorkflowMutation = useRunWorkflow();

  // AI and theme state
  const { theme, toggleTheme } = useThemeStore();
  const { settings: aiSettings } = useAIStore();
  const [showAISettings, setShowAISettings] = useState(false);
  const [showCocoChat, setShowCocoChat] = useState(false);
  const [chainSearch, setChainSearch] = useState('');

  // Load chains and recent workspaces on mount
  useEffect(() => {
    loadChains();
    loadRecentWorkspaces();
  }, [loadChains, loadRecentWorkspaces]);

  // Load data based on view
  useEffect(() => {
    if (route.view === 'chain-dashboard' && route.chainId) {
      const chain = chains.find((c) => c.id === route.chainId);
      if (chain) {
        selectChain(chain);
        loadWallets(chain);
        loadWorkspaces(route.chainId);
      }
    }
  }, [route.view, route.chainId, chains, selectChain, loadWallets, loadWorkspaces]);

  useEffect(() => {
    if (route.view === 'workspace' && route.workspaceId) {
      loadWorkspace(route.workspaceId);
      // Also load wallets for the workspace's chain
      if (route.chainId) {
        const chain = chains.find((c) => c.id === route.chainId);
        if (chain) {
          selectChain(chain);
          loadWallets(chain);
        }
      }
      return () => clearWorkspace();
    }
  }, [route.view, route.workspaceId, route.chainId, chains, loadWorkspace, clearWorkspace, selectChain, loadWallets]);

  // Reset selected workflow when workspace changes
  useEffect(() => {
    setSelectedWorkflowId(null);
    setWorkspaceTab('contracts');
  }, [route.workspaceId]);

  // Load wallet transactions when viewing wallet detail
  useEffect(() => {
    if (route.view === 'wallet-detail' && route.walletId) {
      loadWalletTransactions(route.walletId);
    }
  }, [route.view, route.walletId, loadWalletTransactions]);

  // Handle activating a network from the modal
  const handleActivateNetwork = async (blockchain: BlockchainDefinition, network: NetworkDefinition) => {
    try {
      await addChain({
        id: network.id, // Use the network ID from the registry to avoid duplicates
        name: `${blockchain.name} ${network.name}`,
        ecosystem: blockchain.ecosystem,
        rpcUrl: network.rpcUrl,
        chainIdNumeric: network.chainIdNumeric,
        currencySymbol: blockchain.nativeCurrency,
        blockExplorerUrl: network.blockExplorerUrl,
        blockExplorerApiUrl: network.blockExplorerApiUrl,
        faucetUrl: network.faucetUrl,
        blockchain: blockchain.id,
        networkType: network.networkType,
        isCustom: false,
        iconId: blockchain.iconId,
      });
      addToast({ type: 'success', title: `${blockchain.name} ${network.name} activated` });
    } catch (error) {
      addToast({ 
        type: 'error', 
        title: 'Failed to activate network', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      });
      console.error('Error activating network:', error);
    }
  };

  // Chain Selection View
  if (route.view === 'chains') {
    return (
      <div className="min-h-screen flex flex-col">
        {/* Drag region for transparent title bar */}
        <div className="h-8 drag-region flex-shrink-0" />
        <main className="flex-1 flex flex-col items-center p-6 pt-8">
          {/* Logo with rotating text */}
          <CocoLogo className="mb-4" />

          {/* Search and Actions Row */}
          <div className="w-full max-w-2xl mb-8 no-drag">
            <div className="flex items-center gap-3">
              {/* Search Input */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-coco-text-tertiary" />
                <input
                  type="text"
                  value={chainSearch}
                  onChange={(e) => setChainSearch(e.target.value)}
                  placeholder="Search blockchains..."
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-coco-bg-secondary border border-coco-border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-coco-accent placeholder:text-coco-text-tertiary"
                />
              </div>

              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="p-2.5 rounded-lg bg-coco-bg-secondary border border-coco-border-default hover:bg-coco-bg-tertiary transition-colors"
                title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {theme === 'dark' ? (
                  <Sun className="w-5 h-5 text-coco-text-secondary" />
                ) : (
                  <Moon className="w-5 h-5 text-coco-text-secondary" />
                )}
              </button>

              {/* AI Settings (Coco's Paw) */}
              <button
                onClick={() => setShowAISettings(true)}
                className={clsx(
                  'p-2 rounded-lg border transition-colors',
                  aiSettings.enabled
                    ? 'bg-coco-accent/10 border-coco-accent/30 hover:bg-coco-accent/20'
                    : 'bg-coco-bg-secondary border-coco-border-default hover:bg-coco-bg-tertiary'
                )}
                title="AI Settings"
              >
                <Image
                  src="/brand/coco-paw.png"
                  alt="AI Settings"
                  width={20}
                  height={20}
                  className={aiSettings.enabled ? '' : 'opacity-50'}
                />
              </button>
            </div>
          </div>

          {/* Recent Workspaces */}
          {recentWorkspaces.length > 0 && !chainSearch && (
            <div className="w-full max-w-4xl mb-8 no-drag">
              <h2 className="text-sm font-semibold text-coco-text-secondary uppercase tracking-wider mb-3">
                Recent Workspaces
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {recentWorkspaces.slice(0, 6).map((recent) => {
                  const chain = chains.find(c => c.id === recent.chainId);
                  const timeSince = getTimeSince(recent.accessedAt);
                  const networkType = chain?.networkType;
                  const ecosystemColor = getEcosystemColor(chain?.ecosystem);

                  return (
                    <button
                      key={recent.workspaceId}
                      onClick={() => navigate({ view: 'workspace', chainId: recent.chainId, workspaceId: recent.workspaceId })}
                      className="flex items-start gap-3 p-3 bg-coco-bg-secondary border border-coco-border-subtle rounded-xl hover:border-coco-accent/50 hover:bg-coco-bg-tertiary hover:shadow-md transition-all text-left group"
                    >
                      {/* Chain Icon */}
                      <div className={clsx(
                        'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105',
                        ecosystemColor.bg
                      )}>
                        {chain?.iconId ? (
                          <Image
                            src={`/chains/${chain.iconId}.svg`}
                            alt={chain.name}
                            width={24}
                            height={24}
                            className="object-contain"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <Rocket className={clsx('w-5 h-5', ecosystemColor.text)} />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-coco-text-primary truncate text-sm group-hover:text-coco-accent transition-colors">
                          {recent.name}
                        </p>
                        <p className="text-xs text-coco-text-tertiary truncate mt-0.5">
                          {chain?.name || 'Unknown chain'}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5">
                          {networkType && (
                            <span className={clsx(
                              'text-[10px] px-1.5 py-0.5 rounded-full font-medium',
                              networkType === 'mainnet'
                                ? 'bg-green-500/10 text-green-500'
                                : 'bg-amber-500/10 text-amber-500'
                            )}>
                              {networkType}
                            </span>
                          )}
                          <span className="text-[10px] text-coco-text-tertiary">
                            {timeSince}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Blockchain Grid */}
          <BlockchainGrid
            chains={chains}
            searchQuery={chainSearch}
            onBlockchainClick={(blockchain) => {
              setSelectedBlockchain(blockchain);
              setShowNetworkModal(true);
            }}
            onAddCustomChain={() => setShowAddChain(true)}
          />
        </main>

        <NetworkSelectionModal
          isOpen={showNetworkModal}
          blockchain={selectedBlockchain}
          activatedChains={chains}
          onClose={() => {
            setShowNetworkModal(false);
            setSelectedBlockchain(null);
          }}
          onActivateNetwork={handleActivateNetwork}
          onGoToChain={(chain) => {
            setShowNetworkModal(false);
            setSelectedBlockchain(null);
            navigate({ view: 'chain-dashboard', chainId: chain.id });
          }}
          onAddCustomNetwork={(blockchain) => {
            setShowNetworkModal(false);
            setAddChainBlockchain(blockchain);
            setShowAddChain(true);
          }}
          onEditChain={(chain) => {
            setShowNetworkModal(false);
            setSelectedBlockchain(null);
            setChainToEdit(chain);
            setShowChainEditModal(true);
          }}
          onDeleteChain={async (chain) => {
            try {
              await deleteChain(chain.id);
              addToast({ type: 'success', title: `${chain.name} deleted` });
            } catch (error) {
              addToast({
                type: 'error',
                title: 'Failed to delete chain',
                message: error instanceof Error ? error.message : 'Unknown error',
              });
            }
          }}
        />

        <AddChainModal
          isOpen={showAddChain}
          onClose={() => {
            setShowAddChain(false);
            setAddChainBlockchain(null);
          }}
          onAdd={async (req) => {
            await addChain(req);
            setAddChainBlockchain(null);
          }}
          blockchain={addChainBlockchain}
        />

        <ChainSettingsModal
          chain={chainToEdit}
          isOpen={showChainEditModal}
          onClose={() => {
            setShowChainEditModal(false);
            setChainToEdit(null);
          }}
          onSave={async (updates) => {
            if (chainToEdit) {
              await updateChain(chainToEdit.id, {
                name: updates.name,
                rpcUrl: updates.rpcUrl,
                chainIdNumeric: updates.chainIdNumeric,
                blockExplorerUrl: updates.blockExplorerUrl,
                blockExplorerApiUrl: updates.blockExplorerApiUrl,
                blockExplorerApiKey: updates.blockExplorerApiKey,
                faucetUrl: updates.faucetUrl,
              });
              addToast({ type: 'success', title: 'Chain settings saved' });
              setShowChainEditModal(false);
              setChainToEdit(null);
            }
          }}
          onDelete={async () => {
            if (chainToEdit) {
              await deleteChain(chainToEdit.id);
              addToast({ type: 'success', title: 'Chain deleted' });
              setShowChainEditModal(false);
              setChainToEdit(null);
            }
          }}
        />

        <AISettingsModal
          isOpen={showAISettings}
          onClose={() => setShowAISettings(false)}
        />

        <CocoChatDrawer
          isOpen={showCocoChat}
          onClose={() => setShowCocoChat(false)}
        />
      </div>
    );
  }

  // Chain Dashboard View
  if (route.view === 'chain-dashboard') {
    const handleBack = () => {
      selectChain(null);
      navigate({ view: 'chains' });
    };

    const getSubtitle = () => {
      if (!selectedChain) return '';
      const network = getNetworkName(selectedChain.rpcUrl);
      return network
        ? `${selectedChain.ecosystem.toUpperCase()} - ${network}`
        : selectedChain.ecosystem.toUpperCase();
    };

    return (
      <div className="min-h-screen flex flex-col">
        <TopBar
          title={selectedChain?.name || 'Loading...'}
          subtitle={getSubtitle()}
          showBack
          onBack={handleBack}
          onCocoChat={() => setShowCocoChat(true)}
          actions={
            <IconButton
              icon={<Settings className="w-5 h-5" />}
              label="Chain Settings"
              onClick={() => setShowChainSettings(true)}
            />
          }
        />

        <main className="flex-1 p-6 space-y-8">
          <WalletList
            wallets={wallets}
            onWalletClick={(wallet) => {
              selectWallet(wallet);
              navigate({ view: 'wallet-detail', chainId: route.chainId, walletId: wallet.id });
            }}
            onAddWallet={() => setShowAddWallet(true)}
          />

          <hr className="border-coco-border-subtle" />

          <WorkspaceGrid
            workspaces={workspaces}
            onWorkspaceClick={(ws) => navigate({ view: 'workspace', chainId: route.chainId, workspaceId: ws.id })}
            onNewWorkspace={() => setShowCreateWorkspace(true)}
          />
        </main>

        {route.chainId && selectedChain && (
          <>
            <AddWalletModal
              isOpen={showAddWallet}
              chainId={route.chainId}
              blockchain={selectedChain.blockchain}
              ecosystem={selectedChain.ecosystem}
              onClose={() => setShowAddWallet(false)}
              onCreate={async (req) => {
                await createWallet(req);
              }}
              onImport={async (req) => {
                await importWallet(req);
              }}
            />

            <CreateWorkspaceModal
              isOpen={showCreateWorkspace}
              chainId={route.chainId}
              onClose={() => setShowCreateWorkspace(false)}
              onCreate={async (req) => {
                await createWorkspace(req);
              }}
            />

            <ChainSettingsModal
              chain={selectedChain}
              isOpen={showChainSettings}
              onClose={() => setShowChainSettings(false)}
              onSave={async (updates) => {
                if (selectedChain) {
                  await updateChain(selectedChain.id, {
                    name: updates.name,
                    rpcUrl: updates.rpcUrl,
                    chainIdNumeric: updates.chainIdNumeric,
                    blockExplorerUrl: updates.blockExplorerUrl,
                    blockExplorerApiUrl: updates.blockExplorerApiUrl,
                    blockExplorerApiKey: updates.blockExplorerApiKey,
                    faucetUrl: updates.faucetUrl,
                  });
                  addToast({
                    type: 'success',
                    title: 'Chain settings saved',
                  });
                }
              }}
              onDelete={async () => {
                if (selectedChain) {
                  await deleteChain(selectedChain.id);
                  addToast({
                    type: 'success',
                    title: 'Chain deleted',
                  });
                  navigate({ view: 'chains' });
                }
              }}
            />
          </>
        )}

        <CocoChatDrawer
          isOpen={showCocoChat}
          onClose={() => setShowCocoChat(false)}
          context={{ ecosystem: selectedChain?.ecosystem, chainId: selectedChain?.id }}
        />
      </div>
    );
  }

  // Wallet Detail View
  if (route.view === 'wallet-detail') {
    const handleBack = () => {
      selectWallet(null);
      navigate({ view: 'chain-dashboard', chainId: route.chainId });
    };

    const wallet = wallets.find((w) => w.id === route.walletId) || selectedWallet;

    if (!wallet) {
      return <div>Loading wallet...</div>;
    }

    const formatBalance = (balance: string, decimals: number, symbol: string) => {
      const value = Number(balance) / Math.pow(10, decimals);
      return `${value.toFixed(4)} ${symbol}`;
    };

    const copyAddress = async () => {
      await navigator.clipboard.writeText(wallet.address);
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 2000);
    };

    const truncateHash = (hash: string) => `${hash.slice(0, 10)}...${hash.slice(-8)}`;

    const getTransactionIcon = (type: string) => {
      switch (type) {
        case 'send':
          return <ArrowUpRight className="w-4 h-4 text-coco-error" />;
        case 'receive':
          return <ArrowDownLeft className="w-4 h-4 text-coco-success" />;
        case 'contract_call':
          return <Play className="w-4 h-4 text-coco-accent" />;
        case 'contract_deploy':
          return <Rocket className="w-4 h-4 text-coco-warning" />;
        default:
          return null;
      }
    };

    const formatTxValue = (value: string, type: string) => {
      const numValue = Number(value) / 1e18;
      if (numValue === 0) return '-';
      const prefix = type === 'receive' ? '+' : '-';
      return `${prefix}${numValue.toFixed(4)} ETH`;
    };

    const explorerUrl = selectedChain && wallet.address ? getExplorerUrl(selectedChain, wallet.address) : undefined;

    return (
      <div className="min-h-screen flex flex-col">
        <TopBar
          title={wallet.name}
          subtitle={`${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}`}
          showBack
          onBack={handleBack}
          onCocoChat={() => setShowCocoChat(true)}
          actions={
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={async () => {
                  await refreshBalance(wallet.id);
                  addToast({ type: 'success', title: 'Balance refreshed' });
                }}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={async () => {
                  if (confirm('Are you sure you want to delete this wallet?')) {
                    await deleteWallet(wallet.id);
                    handleBack();
                  }
                }}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            </>
          }
        />

        <main className="flex-1 p-6">
          {/* Wallet Info Card */}
          <div className="bg-coco-bg-elevated border border-coco-border-subtle rounded-xl p-6 mb-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <p className="text-sm text-coco-text-tertiary mb-1">Balance</p>
                <p className="text-3xl font-bold text-coco-text-primary">
                  {formatBalance(wallet.balance.native, wallet.balance.nativeDecimals, wallet.balance.nativeSymbol)}
                </p>
              </div>
              <StatusIndicator status="success" showLabel size="lg" />
            </div>

            <div className="flex items-center gap-3 p-3 bg-coco-bg-primary rounded-lg border border-coco-border-subtle">
              <code className="flex-1 text-sm font-mono text-coco-text-secondary">
                {wallet.address}
              </code>
              <button
                onClick={copyAddress}
                className="p-2 hover:bg-coco-bg-secondary rounded transition-colors"
                title="Copy address"
              >
                <Copy className={clsx('w-4 h-4', copiedAddress ? 'text-coco-success' : 'text-coco-text-tertiary')} />
              </button>
              {selectedChain?.blockExplorerUrl && (
                <a
                  href={explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 hover:bg-coco-bg-secondary rounded transition-colors"
                  title="View on explorer"
                >
                  <ExternalLink className="w-4 h-4 text-coco-text-tertiary" />
                </a>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 mt-4">
              <Button
                variant="primary"
                size="sm"
                onClick={() => setShowSendModal(true)}
              >
                <Send className="w-4 h-4 mr-2" />
                Send
              </Button>
              {selectedChain?.faucetUrl && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => openExternal(selectedChain.faucetUrl!)}
                >
                  <Droplet className="w-4 h-4 mr-2" />
                  Faucet
                  <ExternalLink className="w-3 h-3 ml-1.5 opacity-60" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  try {
                    const key = await getPrivateKeyMutation.mutateAsync(wallet.id);
                    setExportedPrivateKey(key);
                    setShowExportKey(true);
                  } catch (error) {
                    addToast({ type: 'error', title: 'Failed to export key', message: String(error) });
                  }
                }}
                isLoading={getPrivateKeyMutation.isPending}
              >
                <Key className="w-4 h-4 mr-2" />
                Export Key
              </Button>
            </div>

            {/* Export Private Key Section */}
            {showExportKey && exportedPrivateKey && (
              <div className="mt-4 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg space-y-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-amber-500 text-sm">Private Key</h4>
                    <p className="text-xs text-coco-text-secondary mt-1">
                      Never share your private key. Anyone with this key can access your funds.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-coco-bg-primary rounded-lg p-3">
                  <code className="flex-1 text-sm font-mono text-coco-text-primary break-all">
                    {showPrivateKey ? exportedPrivateKey : '•'.repeat(Math.min(exportedPrivateKey.length, 32)) + '...'}
                  </code>
                  <button
                    onClick={() => setShowPrivateKey(!showPrivateKey)}
                    className="p-1.5 hover:bg-coco-bg-tertiary rounded transition-colors"
                    title={showPrivateKey ? 'Hide' : 'Show'}
                  >
                    {showPrivateKey ? (
                      <EyeOff className="w-4 h-4 text-coco-text-tertiary" />
                    ) : (
                      <Eye className="w-4 h-4 text-coco-text-tertiary" />
                    )}
                  </button>
                  <button
                    onClick={async () => {
                      await navigator.clipboard.writeText(exportedPrivateKey);
                      setCopiedPrivateKey(true);
                      setTimeout(() => setCopiedPrivateKey(false), 2000);
                    }}
                    className="p-1.5 hover:bg-coco-bg-tertiary rounded transition-colors"
                    title="Copy"
                  >
                    {copiedPrivateKey ? (
                      <CheckCircle className="w-4 h-4 text-coco-success" />
                    ) : (
                      <Copy className="w-4 h-4 text-coco-text-tertiary" />
                    )}
                  </button>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setShowExportKey(false);
                    setExportedPrivateKey(null);
                    setShowPrivateKey(false);
                    setCopiedPrivateKey(false);
                  }}
                  className="w-full"
                >
                  Hide Private Key
                </Button>
              </div>
            )}
          </div>

          {/* Transaction History */}
          <div className="bg-coco-bg-elevated border border-coco-border-subtle rounded-xl">
            <div className="p-4 border-b border-coco-border-subtle">
              <h2 className="text-lg font-semibold text-coco-text-primary">Transaction History</h2>
            </div>

            {walletTransactions.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-coco-text-tertiary mb-2">No transactions yet</p>
                {!selectedChain?.blockExplorerApiKey && (
                  <p className="text-xs text-coco-text-tertiary">
                    Add a Block Explorer API Key in{' '}
                    <button
                      onClick={() => setShowChainSettings(true)}
                      className="text-coco-accent hover:underline"
                    >
                      Chain Settings
                    </button>
                    {' '}to load transaction history
                  </p>
                )}
              </div>
            ) : (
              <div className="divide-y divide-coco-border-subtle">
                {walletTransactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="p-4 hover:bg-coco-bg-secondary transition-colors cursor-pointer"
                    onClick={() => {
                      if (selectedChain?.blockExplorerUrl) {
                        const ecosystem = selectedChain.ecosystem;
                        const network = selectedChain.networkType;
                        let link = `${selectedChain.blockExplorerUrl}`;
                        if (ecosystem === 'evm') {
                          link += `/tx/${tx.txHash}`;
                        }else if (ecosystem === 'solana') {
                          link += `/tx/${tx.txHash}`;
                        }else if (ecosystem === 'aptos') {
                          link += `/txn/${tx.txHash}`;
                          if (network == "testnet"){
                            link += "?network=testnet";
                          }
                        }
                        openExternal(link);
                      }
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-coco-bg-tertiary flex items-center justify-center">
                          {getTransactionIcon(tx.type)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-coco-text-primary capitalize">
                              {tx.type.replace('_', ' ')}
                            </span>
                            {tx.methodName && (
                              <code className="text-xs bg-coco-bg-tertiary px-1.5 py-0.5 rounded text-coco-text-secondary">
                                {tx.methodName}
                              </code>
                            )}
                          </div>
                          <p className="text-xs text-coco-text-tertiary font-mono">
                            {truncateHash(tx.txHash)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className={clsx(
                            'font-medium',
                            tx.type === 'receive' ? 'text-coco-success' : 'text-coco-text-primary'
                          )}>
                            {formatTxValue(tx.value, tx.type)}
                          </p>
                          <p className="text-xs text-coco-text-tertiary">
                            {new Date(tx.timestamp).toLocaleDateString()}
                          </p>
                        </div>
                        {selectedChain?.blockExplorerUrl && (
                          <ExternalLink className="w-4 h-4 text-coco-text-tertiary" />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>

        <CocoChatDrawer
          isOpen={showCocoChat}
          onClose={() => setShowCocoChat(false)}
          context={{ ecosystem: selectedChain?.ecosystem, chainId: selectedChain?.id }}
        />

        {selectedChain && (
          <SendModal
            isOpen={showSendModal}
            wallet={wallet}
            chain={selectedChain}
            onClose={() => setShowSendModal(false)}
            onSuccess={(txHash) => {
              addToast({ type: 'success', title: 'Transaction sent', message: `TX: ${txHash.slice(0, 10)}...` });
              refreshBalance(wallet.id);
            }}
          />
        )}
      </div>
    );
  }

  // Workspace View
  if (route.view === 'workspace') {
    const handleBack = () => {
      navigate({ view: 'chain-dashboard', chainId: route.chainId });
    };

    const workspaceTabs = [
      { id: 'contracts' as const, label: 'Contracts', icon: Files },
      { id: 'scripts' as const, label: 'Scripts', icon: FileCode },
      { id: 'env' as const, label: 'Environment', icon: Key },
      { id: 'workflows' as const, label: 'Workflows', icon: Rocket },
    ];

    return (
      <div className="h-screen flex flex-col overflow-hidden">
        <TopBar
          title={currentWorkspace?.name || 'Loading...'}
          showBack
          onBack={handleBack}
          onCocoChat={() => setShowCocoChat(true)}
          actions={
            <>
              <IconButton
                icon={<Settings className="w-5 h-5" />}
                label="Settings"
                onClick={() => setShowSettings(true)}
              />
              {workspaceTab === 'contracts' && (
                <IconButton
                  icon={<Plus className="w-5 h-5" />}
                  label="Add contract"
                  onClick={() => setShowAddContract(true)}
                />
              )}
            </>
          }
        />

        {/* Workspace Tabs */}
        <div className="border-b border-coco-border-subtle bg-coco-bg-elevated">
          <div className="flex gap-1 px-4">
            {workspaceTabs.map((tab) => {
              const TabIcon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setWorkspaceTab(tab.id)}
                  className={clsx(
                    'flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors',
                    'border-b-2 -mb-[1px]',
                    workspaceTab === tab.id
                      ? 'text-coco-accent border-coco-accent'
                      : 'text-coco-text-secondary border-transparent hover:text-coco-text-primary hover:bg-coco-bg-secondary'
                  )}
                >
                  <TabIcon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Contracts Tab Content */}
          {workspaceTab === 'contracts' && (
            <>
              {/* Sidebar with Contracts and Transactions */}
              <aside className="w-80 border-r border-coco-border-subtle flex flex-col overflow-hidden">
                {/* Contracts Section */}
                <div className="p-4 border-b border-coco-border-subtle flex-shrink-0">
                  <ContractList
                    contracts={contracts}
                    onContractClick={(contract) => {
                      setSelectedContract(contract);
                      selectTransaction(null);
                    }}
                    onAddContract={() => setShowAddContract(true)}
                  />
                </div>

                {/* Transactions Section */}
                <div className="flex-1 flex flex-col min-h-0">
                  <div className="p-3 border-b border-coco-border-subtle">
                    <h2 className="text-sm font-semibold text-coco-text-primary">Transactions</h2>
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    {transactions.map((tx, index) => (
                      <div
                        key={tx.id}
                        draggable={true}
                        onDragStart={(e) => {
                          setDraggedTxIndex(index);
                          e.dataTransfer.effectAllowed = 'move';
                          e.dataTransfer.setData('text/plain', String(index));
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = 'move';
                          e.currentTarget.classList.add('bg-coco-accent/10');
                        }}
                        onDragLeave={(e) => {
                          e.currentTarget.classList.remove('bg-coco-accent/10');
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.currentTarget.classList.remove('bg-coco-accent/10');
                          if (draggedTxIndex !== null && draggedTxIndex !== index) {
                            reorderTransactions(draggedTxIndex, index);
                          }
                          setDraggedTxIndex(null);
                        }}
                        onDragEnd={() => setDraggedTxIndex(null)}
                        onClick={() => {
                          selectTransaction(tx);
                          setSelectedContract(null);
                        }}
                        className={clsx(
                          'w-full px-2 py-2 text-left border-b border-coco-border-subtle cursor-pointer',
                          'transition-all duration-base flex items-center gap-1',
                          selectedTransaction?.id === tx.id
                            ? 'bg-coco-bg-tertiary border-l-2 border-l-coco-accent'
                            : 'hover:bg-coco-bg-secondary',
                          draggedTxIndex === index && 'opacity-50'
                        )}
                      >
                        <div className="cursor-grab active:cursor-grabbing p-1 text-coco-text-tertiary hover:text-coco-text-secondary">
                          <GripVertical className="w-4 h-4" />
                        </div>
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className="w-2 h-2 rounded-full bg-coco-success flex-shrink-0" />
                          <span className="text-sm font-medium text-coco-text-primary truncate">
                            {tx.name || tx.id.slice(0, 10)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => setShowCreateTransaction(true)}
                    className="flex-shrink-0 p-3 text-sm text-coco-accent hover:bg-coco-bg-secondary border-t border-coco-border-subtle"
                  >
                    + New transaction
                  </button>
                </div>
              </aside>

              {/* Main Content */}
              <main className="flex-1 p-6 overflow-y-auto">
                {selectedContract ? (
                  <ContractPanel
                    contract={selectedContract}
                    onCreateTransaction={() => {
                      setShowCreateTransaction(true);
                    }}
                    onEdit={(contract) => {
                      setContractToEdit(contract);
                      setShowEditContract(true);
                    }}
                    onDelete={async (contractId) => {
                      await deleteContract(contractId);
                      setSelectedContract(null);
                    }}
                  />
                ) : selectedTransaction ? (
                  <TransactionPanel
                    transaction={selectedTransaction}
                    wallets={wallets}
                    onExecute={async (payload, walletId) => {
                      return await executeTransaction(
                        selectedTransaction.id,
                        payload,
                        walletId,
                        selectedChain ? { chain: selectedChain } : undefined
                      );
                    }}
                    onDelete={async () => {
                      await deleteTransaction(selectedTransaction.id);
                    }}
                    runs={getTransactionRuns(selectedTransaction.id)}
                    blockExplorerUrl={selectedChain?.blockExplorerUrl}
                    ecosystem={selectedChain?.ecosystem}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-coco-text-tertiary">
                    Select a contract or transaction
                  </div>
                )}
              </main>
            </>
          )}

          {/* Scripts Tab Content */}
          {workspaceTab === 'scripts' && currentWorkspace && (
            <main className="flex-1 p-6 overflow-y-auto">
              <ScriptList workspaceId={currentWorkspace.id} ecosystem={selectedChain?.ecosystem} />
            </main>
          )}

          {/* Environment Variables Tab Content */}
          {workspaceTab === 'env' && currentWorkspace && (
            <main className="flex-1 p-6 overflow-y-auto">
              <EnvVarList workspaceId={currentWorkspace.id} />
            </main>
          )}

          {/* Workflows Tab Content */}
          {workspaceTab === 'workflows' && currentWorkspace && !selectedWorkflowId && (
            <main className="flex-1 p-6 overflow-y-auto">
              <WorkflowList
                workflows={workflows}
                onWorkflowClick={(workflow) => {
                  setSelectedWorkflowId(workflow.id);
                }}
                onNewWorkflow={() => setShowCreateWorkflow(true)}
              />
            </main>
          )}

          {/* Workflow Builder View */}
          {workspaceTab === 'workflows' && currentWorkspace && selectedWorkflowId && selectedWorkflow && (
            <WorkflowBuilder
              workflow={{
                id: selectedWorkflow.id,
                name: selectedWorkflow.name,
                definition: JSON.parse(selectedWorkflow.definition || '{"nodes":[],"edges":[],"variables":[]}'),
              }}
              transactions={transactions}
              contracts={contracts}
              scripts={scripts.map(s => ({ id: s.id, name: s.name }))}
              wallets={wallets.map(w => ({ id: w.id, name: w.name }))}
              onSave={async (definition) => {
                await updateWorkflowMutation.mutateAsync({
                  workflowId: selectedWorkflowId,
                  workspaceId: currentWorkspace.id,
                  definition,
                });
              }}
              onRun={async () => {
                return await runWorkflowMutation.mutateAsync({
                  workflowId: selectedWorkflowId,
                });
              }}
              onBack={() => setSelectedWorkflowId(null)}
              isSaving={updateWorkflowMutation.isPending}
              isRunning={runWorkflowMutation.isPending}
            />
          )}
        </div>

        {/* Workflow Modal */}
        <CreateWorkflowModal
          isOpen={showCreateWorkflow}
          onClose={() => setShowCreateWorkflow(false)}
          onCreate={async (name, description) => {
            if (currentWorkspace) {
              await createWorkflowMutation.mutateAsync({
                workspaceId: currentWorkspace.id,
                name,
                description,
              });
              setShowCreateWorkflow(false);
            }
          }}
          isCreating={createWorkflowMutation.isPending}
        />

        {/* Workspace Modals */}
        <AddContractModal
          isOpen={showAddContract}
          onClose={() => setShowAddContract(false)}
          onAdd={async (request) => {
            await addContract(request);
          }}
          ecosystem={selectedChain?.ecosystem || 'evm'}
          blockchain={selectedChain?.blockchain || 'ethereum'}
          chainId={route.chainId || ''}
          workspaceId={route.workspaceId || ''}
        />

        {contractToEdit && (
          <EditContractModal
            isOpen={showEditContract}
            onClose={() => {
              setShowEditContract(false);
              setContractToEdit(null);
            }}
            onSave={async (request) => {
              const updated = await updateContract(request, selectedChain?.ecosystem || 'evm');
              // Update the selected contract if it was the one being edited
              if (selectedContract?.id === updated.id) {
                setSelectedContract(updated);
              }
            }}
            contract={contractToEdit}
            ecosystem={selectedChain?.ecosystem || 'evm'}
          />
        )}

        <WorkspaceSettingsModal
          workspace={currentWorkspace}
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
          onSave={async (name) => {
            // TODO: Implement workspace update in backend
            console.log('Save workspace settings:', { name });
          }}
          onDelete={async () => {
            if (currentWorkspace) {
              await deleteWorkspace(currentWorkspace.id);
              navigate({ view: 'chain-dashboard', chainId: route.chainId });
            }
          }}
          contractCount={contracts.length}
          transactionCount={transactions.length}
        />

        <CreateTransactionModal
          isOpen={showCreateTransaction}
          contracts={contracts}
          onClose={() => setShowCreateTransaction(false)}
          onCreate={async (name, contractId, functionName) => {
            await createTransaction(name, contractId, functionName);
          }}
        />

        <CocoChatDrawer
          isOpen={showCocoChat}
          onClose={() => setShowCocoChat(false)}
          context={{ ecosystem: selectedChain?.ecosystem, chainId: selectedChain?.id }}
        />
      </div>
    );
  }

  return <div>Loading...</div>;
}

function getNetworkName(rpcUrl: string): string | null {
  const url = rpcUrl.toLowerCase();
  if (url.includes('sepolia')) return 'Sepolia';
  if (url.includes('goerli')) return 'Goerli';
  if (url.includes('mainnet')) return 'Mainnet';
  if (url.includes('devnet')) return 'Devnet';
  if (url.includes('testnet')) return 'Testnet';
  return null;
}

function getTimeSince(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function getEcosystemColor(ecosystem?: string): { bg: string; text: string } {
  switch (ecosystem) {
    case 'evm':
      return { bg: 'bg-blue-500/10', text: 'text-blue-500' };
    case 'solana':
      return { bg: 'bg-purple-500/10', text: 'text-purple-500' };
    case 'aptos':
      return { bg: 'bg-cyan-500/10', text: 'text-cyan-500' };
    case 'sui':
      return { bg: 'bg-sky-500/10', text: 'text-sky-500' };
    default:
      return { bg: 'bg-coco-accent/10', text: 'text-coco-accent' };
  }
}
