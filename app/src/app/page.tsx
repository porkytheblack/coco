'use client';

import { useEffect, useState, useCallback } from 'react';
import { Settings, Plus, Play, Rocket, Copy, ExternalLink, Trash2, RefreshCw, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { TopBar } from '@/components/layout';
import { IconButton, Button, StatusIndicator } from '@/components/ui';
import { WalletList, AddWalletModal } from '@/components/wallets';
import { WorkspaceGrid, CreateWorkspaceModal, WorkspaceSettingsModal } from '@/components/workspaces';
import { AddChainModal, ChainSettingsModal, BlockchainGrid, NetworkSelectionModal } from '@/components/chains';
import { ContractList, AddContractModal, EditContractModal, ContractPanel } from '@/components/contracts';
import { TransactionPanel, CreateTransactionModal } from '@/components/transactions';
import { useChainStore, useWalletStore, useWorkspaceStore, useToastStore } from '@/stores';
import { openExternal } from '@/lib/tauri/commands';
import { clsx } from 'clsx';
import type { BlockchainDefinition, NetworkDefinition } from '@/data/chain-registry';

type View = 'chains' | 'chain-dashboard' | 'wallet-detail' | 'workspace';

interface AppState {
  view: View;
  chainId?: string;
  workspaceId?: string;
  walletId?: string;
}

export default function AppPage() {
  const [appState, setAppState] = useState<AppState>({ view: 'chains' });
  const [showAddChain, setShowAddChain] = useState(false);
  const [selectedBlockchain, setSelectedBlockchain] = useState<BlockchainDefinition | null>(null);
  const [showNetworkModal, setShowNetworkModal] = useState(false);

  // Chain selection page state
  const { chains, selectedChain, selectChain, addChain, updateChain, deleteChain, loadChains } = useChainStore();
  const { addToast } = useToastStore();
  const [showChainSettings, setShowChainSettings] = useState(false);

  // Chain dashboard state
  const { wallets, loadWallets, createWallet, importWallet, deleteWallet, refreshBalance, walletTransactions, loadWalletTransactions, selectedWallet, selectWallet } = useWalletStore();
  const { workspaces, loadWorkspaces, createWorkspace } = useWorkspaceStore();
  const [showAddWallet, setShowAddWallet] = useState(false);
  const [showCreateWorkspace, setShowCreateWorkspace] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);

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
    deleteWorkspace,
    getTransactionRuns,
  } = useWorkspaceStore();

  // Workspace modals state
  const [showAddContract, setShowAddContract] = useState(false);
  const [showEditContract, setShowEditContract] = useState(false);
  const [contractToEdit, setContractToEdit] = useState<typeof contracts[0] | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showCreateTransaction, setShowCreateTransaction] = useState(false);
  const [selectedContract, setSelectedContract] = useState<typeof contracts[0] | null>(null);

  // Load chains on mount
  useEffect(() => {
    loadChains();
  }, [loadChains]);

  // Load data based on view
  useEffect(() => {
    if (appState.view === 'chain-dashboard' && appState.chainId) {
      const chain = chains.find((c) => c.id === appState.chainId);
      if (chain) {
        selectChain(chain);
        loadWallets(chain);
        loadWorkspaces(appState.chainId);
      }
    }
  }, [appState.view, appState.chainId, chains, selectChain, loadWallets, loadWorkspaces]);

  useEffect(() => {
    if (appState.view === 'workspace' && appState.workspaceId) {
      loadWorkspace(appState.workspaceId);
      // Also load wallets for the workspace's chain
      if (appState.chainId) {
        const chain = chains.find((c) => c.id === appState.chainId);
        if (chain) {
          selectChain(chain);
          loadWallets(chain);
        }
      }
      return () => clearWorkspace();
    }
  }, [appState.view, appState.workspaceId, appState.chainId, chains, loadWorkspace, clearWorkspace, selectChain, loadWallets]);

  const navigate = useCallback((view: View, chainId?: string, workspaceId?: string, walletId?: string) => {
    setAppState({ view, chainId, workspaceId, walletId });
  }, []);

  // Load wallet transactions when viewing wallet detail
  useEffect(() => {
    if (appState.view === 'wallet-detail' && appState.walletId) {
      loadWalletTransactions(appState.walletId);
    }
  }, [appState.view, appState.walletId, loadWalletTransactions]);

  // Handle activating a network from the modal
  const handleActivateNetwork = async (blockchain: BlockchainDefinition, network: NetworkDefinition) => {
    await addChain({
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
  };

  // Chain Selection View
  if (appState.view === 'chains') {
    return (
      <div className="min-h-screen flex flex-col">
        <TopBar title="Coco" subtitle="Select a blockchain to get started" />

        <main className="flex-1 p-6">
          <BlockchainGrid
            chains={chains}
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
            navigate('chain-dashboard', chain.id);
          }}
        />

        <AddChainModal
          isOpen={showAddChain}
          onClose={() => setShowAddChain(false)}
          onAdd={async (req) => {
            await addChain(req);
          }}
        />
      </div>
    );
  }

  // Chain Dashboard View
  if (appState.view === 'chain-dashboard') {
    const handleBack = () => {
      selectChain(null);
      navigate('chains');
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
              navigate('wallet-detail', appState.chainId, undefined, wallet.id);
            }}
            onAddWallet={() => setShowAddWallet(true)}
          />

          <hr className="border-coco-border-subtle" />

          <WorkspaceGrid
            workspaces={workspaces}
            onWorkspaceClick={(ws) => navigate('workspace', appState.chainId, ws.id)}
            onNewWorkspace={() => setShowCreateWorkspace(true)}
          />
        </main>

        {appState.chainId && selectedChain && (
          <>
            <AddWalletModal
              isOpen={showAddWallet}
              chainId={appState.chainId}
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
              chainId={appState.chainId}
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
                  navigate('chains');
                }
              }}
            />
          </>
        )}
      </div>
    );
  }

  // Wallet Detail View
  if (appState.view === 'wallet-detail') {
    const handleBack = () => {
      selectWallet(null);
      navigate('chain-dashboard', appState.chainId);
    };

    const wallet = wallets.find((w) => w.id === appState.walletId) || selectedWallet;

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

    return (
      <div className="min-h-screen flex flex-col">
        <TopBar
          title={wallet.name}
          subtitle={`${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}`}
          showBack
          onBack={handleBack}
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
                  href={`${selectedChain.blockExplorerUrl}/address/${wallet.address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 hover:bg-coco-bg-secondary rounded transition-colors"
                  title="View on explorer"
                >
                  <ExternalLink className="w-4 h-4 text-coco-text-tertiary" />
                </a>
              )}
            </div>
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
                        let ecosystem = selectedChain.ecosystem;
                        const network = selectedChain.networkType
                        let link =`${selectedChain.blockExplorerUrl}`;
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
      </div>
    );
  }

  // Workspace View
  if (appState.view === 'workspace') {
    const handleBack = () => {
      navigate('chain-dashboard', appState.chainId);
    };

    return (
      <div className="h-screen flex flex-col overflow-hidden">
        <TopBar
          title={currentWorkspace?.name || 'Loading...'}
          showBack
          onBack={handleBack}
          actions={
            <>
              <IconButton
                icon={<Settings className="w-5 h-5" />}
                label="Settings"
                onClick={() => setShowSettings(true)}
              />
              <IconButton
                icon={<Plus className="w-5 h-5" />}
                label="Add contract"
                onClick={() => setShowAddContract(true)}
              />
            </>
          }
        />

        <div className="flex-1 flex overflow-hidden">
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
                {transactions.map((tx) => (
                  <button
                    key={tx.id}
                    onClick={() => {
                      selectTransaction(tx);
                      setSelectedContract(null);
                    }}
                    className={clsx(
                      'w-full px-4 py-2 text-left border-b border-coco-border-subtle',
                      'transition-all duration-base',
                      selectedTransaction?.id === tx.id
                        ? 'bg-coco-bg-tertiary border-l-2 border-l-coco-accent'
                        : 'hover:bg-coco-bg-secondary'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-coco-success flex-shrink-0" />
                      <span className="text-sm font-medium text-coco-text-primary truncate">
                        {tx.name || tx.id.slice(0, 10)}
                      </span>
                    </div>
                  </button>
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
                  // Create a new transaction for this function
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
                  // Pass chain context for real on-chain execution
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
        </div>

        {/* Workspace Modals */}
        <AddContractModal
          isOpen={showAddContract}
          onClose={() => setShowAddContract(false)}
          onAdd={async (request) => {
            await addContract(request);
          }}
          ecosystem={selectedChain?.ecosystem || 'evm'}
          blockchain={selectedChain?.blockchain || 'ethereum'}
          chainId={appState.chainId || ''}
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
              navigate('chain-dashboard', appState.chainId);
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
