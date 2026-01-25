'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Loader2, CheckCircle, XCircle, Copy, ExternalLink, Clock, ChevronDown, ChevronRight, Trash2 } from 'lucide-react';
import { clsx } from 'clsx';
import { Button } from '@/components/ui';
import { ErrorExplanation } from '@/components/ai';
import { useToastStore, useWorkspaceStore } from '@/stores';
import type { Transaction, TransactionRun, WalletWithBalance, TxStatus, Ecosystem, AccountRequirement, PdaSeed } from '@/types';
import { truncateAddress, truncateHash, formatBalance } from '@/lib/utils/format';

interface TransactionPanelProps {
  transaction: Transaction;
  wallets: WalletWithBalance[];
  onExecute: (payload: Record<string, string>, walletId: string) => Promise<TransactionRun>;
  onDelete: () => Promise<void>;
  runs: TransactionRun[];
  blockExplorerUrl?: string;
  ecosystem?: Ecosystem;
}

/**
 * Build a transaction explorer URL based on ecosystem
 */
function buildTxExplorerUrl(baseUrl: string, txHash: string, ecosystem: Ecosystem = 'evm'): string {
  // Remove trailing slash if present
  const cleanBaseUrl = baseUrl.replace(/\/$/, '');

  switch (ecosystem) {
    case 'solana': {
      // Solana explorer URLs may have query params for cluster
      // e.g., https://explorer.solana.com?cluster=devnet
      // Transaction path should be /tx/{signature} with cluster as query param
      try {
        const url = new URL(cleanBaseUrl);
        const cluster = url.searchParams.get('cluster');
        // Build transaction URL
        let txUrl = `${url.origin}/tx/${txHash}`;
        if (cluster) {
          txUrl += `?cluster=${cluster}`;
        }
        return txUrl;
      } catch {
        // Fallback for invalid URLs
        return `${cleanBaseUrl}/tx/${txHash}`;
      }
    }
    case 'aptos': {
      // Aptos explorer uses /txn/{hash} or /transaction/{hash}
      // For Aptos Explorer: https://explorer.aptoslabs.com/txn/{hash}?network=devnet
      try {
        const url = new URL(cleanBaseUrl);
        const network = url.searchParams.get('network');
        let txUrl = `${url.origin}/txn/${txHash}`;
        if (network) {
          txUrl += `?network=${network}`;
        }
        return txUrl;
      } catch {
        // Fallback for invalid URLs
        return `${cleanBaseUrl}/txn/${txHash}`;
      }
    }
    case 'evm':
    default:
      // EVM explorers typically use /tx/{hash}
      return `${cleanBaseUrl}/tx/${txHash}`;
  }
}

export function TransactionPanel({
  transaction,
  wallets,
  onExecute,
  onDelete,
  runs,
  blockExplorerUrl,
  ecosystem = 'evm',
}: TransactionPanelProps) {
  const [selectedWalletId, setSelectedWalletId] = useState(
    transaction.walletId || wallets[0]?.id || ''
  );
  // Initialize payload from saved transaction args
  const [payload, setPayload] = useState<Record<string, string>>(
    transaction.args || {}
  );
  const [isExecuting, setIsExecuting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isParamsExpanded, setIsParamsExpanded] = useState(true);
  const [expandedRuns, setExpandedRuns] = useState<Set<string>>(new Set());
  const addToast = useToastStore((state) => state.addToast);
  const updateTransactionArgs = useWorkspaceStore((state) => state.updateTransactionArgs);

  // Track the last saved payload to avoid unnecessary saves
  const lastSavedPayloadRef = useRef<string>(JSON.stringify(transaction.args || {}));
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced save function
  const savePayload = useCallback(async (newPayload: Record<string, string>) => {
    const payloadStr = JSON.stringify(newPayload);
    if (payloadStr === lastSavedPayloadRef.current) return;

    try {
      await updateTransactionArgs(transaction.id, newPayload);
      lastSavedPayloadRef.current = payloadStr;
    } catch (err) {
      console.error('Failed to save transaction args:', err);
    }
  }, [transaction.id, updateTransactionArgs]);

  // Update payload when transaction changes (e.g., switching between transactions)
  useEffect(() => {
    setPayload(transaction.args || {});
    lastSavedPayloadRef.current = JSON.stringify(transaction.args || {});
  }, [transaction.id, transaction.args]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const selectedWallet = wallets.find((w) => w.id === selectedWalletId);

  // Get function params from the contract if available
  const contractFunction = transaction.contract?.functions?.find(
    (f) => f.name === transaction.functionName
  );

  const handlePayloadChange = (key: string, value: string) => {
    const newPayload = { ...payload, [key]: value };
    setPayload(newPayload);

    // Debounce save - wait 500ms after last change before saving
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      savePayload(newPayload);
    }, 500);
  };

  const handleExecute = async () => {
    if (!selectedWalletId) {
      setError('Please select a wallet');
      addToast({
        type: 'error',
        title: 'Wallet required',
        message: 'Please select a wallet to execute the transaction',
      });
      return;
    }

    setIsExecuting(true);
    setError(null);

    try {
      const result = await onExecute(payload, selectedWalletId);

      if (result.status === 'success') {
        addToast({
          type: 'success',
          title: 'Transaction executed',
          message: result.txHash ? `TX: ${truncateHash(result.txHash)}` : 'Transaction completed successfully',
        });
        // Auto-expand the new run
        setExpandedRuns((prev) => new Set([...prev, result.id]));
      } else if (result.status === 'failed') {
        addToast({
          type: 'error',
          title: 'Transaction failed',
          message: result.errorMessage || 'Transaction execution failed',
        });
        // Auto-expand failed runs to show error
        setExpandedRuns((prev) => new Set([...prev, result.id]));
      }
    } catch (err) {
      const errorMessage = (err as Error).message;
      setError(errorMessage);
      addToast({
        type: 'error',
        title: 'Execution error',
        message: errorMessage,
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete();
      addToast({
        type: 'success',
        title: 'Transaction deleted',
        message: `"${transaction.name}" has been deleted`,
      });
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Delete failed',
        message: (err as Error).message,
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const toggleRunExpanded = (runId: string) => {
    setExpandedRuns((prev) => {
      const next = new Set(prev);
      if (next.has(runId)) {
        next.delete(runId);
      } else {
        next.add(runId);
      }
      return next;
    });
  };

  const getStatusIcon = (status: TxStatus) => {
    switch (status) {
      case 'pending':
        return <Loader2 className="w-4 h-4 text-coco-warning animate-spin" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-coco-success" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-coco-error" />;
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    addToast({
      type: 'info',
      title: 'Copied to clipboard',
      duration: 2000,
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const formatShortDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-coco-text-primary">
            {transaction.name || 'Transaction'}
          </h2>
          {transaction.contract && (
            <p className="text-sm text-coco-text-tertiary mt-1">
              Contract: {transaction.contract.name}
              {transaction.functionName && (
                <span className="ml-2 font-mono text-coco-accent">
                  .{transaction.functionName}()
                </span>
              )}
            </p>
          )}
        </div>
        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="p-2 text-coco-text-tertiary hover:text-coco-error hover:bg-coco-error/10 rounded-md transition-colors"
            title="Delete transaction"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowDeleteConfirm(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleDelete}
              isLoading={isDeleting}
            >
              Delete
            </Button>
          </div>
        )}
      </div>

      {/* Wallet Selection */}
      <div className="bg-coco-bg-secondary rounded-lg p-4">
        <h3 className="text-sm font-medium text-coco-text-secondary mb-3">Sender Wallet</h3>
        <select
          value={selectedWalletId}
          onChange={(e) => setSelectedWalletId(e.target.value)}
          className="w-full px-3 py-2 text-sm bg-coco-bg-primary border border-coco-border-default rounded-md focus:outline-none focus:ring-2 focus:ring-coco-accent"
        >
          <option value="">Select a wallet</option>
          {wallets.map((wallet) => (
            <option key={wallet.id} value={wallet.id}>
              {wallet.name} - {truncateAddress(wallet.address)} (
              {formatBalance(wallet.balance.native, wallet.balance.nativeDecimals)}{' '}
              {wallet.balance.nativeSymbol})
            </option>
          ))}
        </select>
        {selectedWallet && (
          <p className="mt-2 text-xs text-coco-text-tertiary font-mono">
            {selectedWallet.address}
          </p>
        )}
      </div>

      {/* Function Parameters - Collapsible */}
      <div className="bg-coco-bg-secondary rounded-lg">
        <button
          type="button"
          onClick={() => setIsParamsExpanded(!isParamsExpanded)}
          className="w-full flex items-center justify-between p-4 text-left hover:bg-coco-bg-tertiary/50 rounded-lg transition-colors"
        >
          <h3 className="text-sm font-medium text-coco-text-secondary">
            {contractFunction ? `Parameters for ${contractFunction.name}()` : 'Parameters'}
            {contractFunction && contractFunction.inputs.length > 0 && (
              <span className="ml-2 text-xs text-coco-text-tertiary">
                ({contractFunction.inputs.length} {contractFunction.inputs.length === 1 ? 'param' : 'params'})
              </span>
            )}
          </h3>
          {isParamsExpanded ? (
            <ChevronDown className="w-4 h-4 text-coco-text-tertiary" />
          ) : (
            <ChevronRight className="w-4 h-4 text-coco-text-tertiary" />
          )}
        </button>
        {isParamsExpanded && (
          <div className="px-4 pb-4 space-y-3">
            {/* Solana Account Inputs - for accounts that need manual input */}
            {ecosystem === 'solana' && contractFunction?.accounts && contractFunction.accounts.length > 0 && (() => {
              // Well-known program names that are auto-resolved
              const WELL_KNOWN_ACCOUNTS = ['system_program', 'systemProgram', 'token_program', 'tokenProgram', 'rent', 'clock'];

              // Helper to check if PDA has complete seed info from IDL (can be auto-derived)
              const hasCompletePdaSeeds = (acc: AccountRequirement): boolean => {
                if (!acc.pda || !acc.pda.seeds || acc.pda.seeds.length === 0) return false;
                // Check if all seeds can be resolved automatically
                return acc.pda.seeds.every((seed: PdaSeed) => {
                  if (seed.kind === 'const' && seed.value !== undefined) return true;
                  if (seed.kind === 'account' && seed.path) {
                    // Common signer references that can be auto-resolved
                    const refName = seed.path.split('.')[0];
                    return ['authority', 'signer', 'payer', 'owner', 'user'].includes(refName);
                  }
                  // arg seeds require user input, can't auto-resolve
                  return false;
                });
              };

              // Categorize accounts
              const signerAccounts = contractFunction.accounts.filter((acc) => acc.isSigner);
              const wellKnownAccounts = contractFunction.accounts.filter((acc) =>
                !acc.isSigner && (WELL_KNOWN_ACCOUNTS.includes(acc.name) || acc.address)
              );
              // PDAs with complete seed info from IDL - can be auto-derived
              const autoDerivablePdaAccounts = contractFunction.accounts.filter((acc) =>
                !acc.isSigner && !WELL_KNOWN_ACCOUNTS.includes(acc.name) && !acc.address && acc.pda && hasCompletePdaSeeds(acc)
              );
              // PDAs without complete seed info - need user input (legacy IDLs)
              const legacyPdaAccounts = contractFunction.accounts.filter((acc) =>
                !acc.isSigner && !WELL_KNOWN_ACCOUNTS.includes(acc.name) && !acc.address && acc.pda && !hasCompletePdaSeeds(acc)
              );
              const manualAccounts = contractFunction.accounts.filter((acc) =>
                !acc.isSigner && !WELL_KNOWN_ACCOUNTS.includes(acc.name) && !acc.address && !acc.pda
              );

              const autoResolvedAccounts = [...signerAccounts, ...wellKnownAccounts, ...autoDerivablePdaAccounts];

              return (
                <>
                  {/* Show auto-resolved accounts as info */}
                  {autoResolvedAccounts.length > 0 && (
                    <div className="text-xs text-coco-text-tertiary mb-2 pt-1 border-t border-coco-border-subtle">
                      <span className="font-medium text-coco-text-secondary">Auto-resolved: </span>
                      {autoResolvedAccounts.map((acc, idx) => (
                        <span key={acc.name}>
                          <span className="text-coco-success">{acc.name}</span>
                          {acc.isSigner && <span className="text-coco-accent"> (signer)</span>}
                          {acc.address && <span className="text-coco-accent"> (fixed)</span>}
                          {acc.pda && <span className="text-coco-accent"> (PDA)</span>}
                          {idx < autoResolvedAccounts.length - 1 && ', '}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Legacy PDA accounts - need seed input for derivation (IDL doesn't have complete seed info) */}
                  {legacyPdaAccounts.length > 0 && (
                    <>
                      <div className="text-xs font-medium text-coco-text-secondary mb-2 pt-1 border-t border-coco-border-subtle">
                        PDA Accounts <span className="font-normal text-coco-text-tertiary">(need seed for derivation)</span>
                      </div>
                      {legacyPdaAccounts.map((account: AccountRequirement) => (
                        <div key={`pda:${account.name}`}>
                          <label className="block text-xs text-coco-text-tertiary mb-1">
                            {account.name}{' '}
                            <span className="text-coco-warning">
                              (PDA{account.isMut ? ', writable' : ''})
                            </span>
                          </label>
                          <input
                            type="text"
                            placeholder='Enter seed string (e.g., "data", "counter", "vault")...'
                            value={payload[`pda_seed:${account.name}`] || ''}
                            onChange={(e) => handlePayloadChange(`pda_seed:${account.name}`, e.target.value)}
                            className="w-full px-3 py-2 text-sm bg-coco-bg-primary border border-coco-border-default rounded-md focus:outline-none focus:ring-2 focus:ring-coco-accent font-mono"
                            disabled={isExecuting}
                          />
                          <p className="mt-1 text-xs text-coco-text-tertiary">
                            PDA will be derived using: ["{'{seed}'}", signer_pubkey]
                          </p>
                        </div>
                      ))}
                    </>
                  )}

                  {/* Manual account inputs - no PDA info, need full address */}
                  {manualAccounts.length > 0 && (
                    <>
                      <div className="text-xs font-medium text-coco-text-secondary mb-2 pt-1 border-t border-coco-border-subtle">
                        Required Accounts
                      </div>
                      {manualAccounts.map((account) => (
                        <div key={`account:${account.name}`}>
                          <label className="block text-xs text-coco-text-tertiary mb-1">
                            {account.name}{' '}
                            <span className="text-coco-warning">
                              (account{account.isMut ? ', writable' : ''})
                            </span>
                          </label>
                          <input
                            type="text"
                            placeholder="Enter public key (base58)..."
                            value={payload[`account:${account.name}`] || ''}
                            onChange={(e) => handlePayloadChange(`account:${account.name}`, e.target.value)}
                            className="w-full px-3 py-2 text-sm bg-coco-bg-primary border border-coco-border-default rounded-md focus:outline-none focus:ring-2 focus:ring-coco-accent font-mono"
                            disabled={isExecuting}
                          />
                        </div>
                      ))}
                    </>
                  )}

                  {contractFunction.inputs.length > 0 && (
                    <div className="text-xs font-medium text-coco-text-secondary mb-2 pt-2 border-t border-coco-border-subtle">
                      Arguments
                    </div>
                  )}
                </>
              );
            })()}

            {/* Aptos Type Arguments */}
            {ecosystem === 'aptos' && contractFunction?.typeParams && contractFunction.typeParams.length > 0 && (
              <>
                <div className="text-xs font-medium text-coco-text-secondary mb-2 pt-1 border-t border-coco-border-subtle">
                  Type Arguments <span className="font-normal text-coco-text-tertiary">(generic types)</span>
                </div>
                {contractFunction.typeParams.map((typeParam, idx) => (
                  <div key={`type_arg:${idx}`}>
                    <label className="block text-xs text-coco-text-tertiary mb-1">
                      {typeParam}{' '}
                      <span className="text-coco-accent">(type)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., 0x1::aptos_coin::AptosCoin"
                      value={payload[`type_arg:${idx}`] || ''}
                      onChange={(e) => handlePayloadChange(`type_arg:${idx}`, e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-coco-bg-primary border border-coco-border-default rounded-md focus:outline-none focus:ring-2 focus:ring-coco-accent font-mono"
                      disabled={isExecuting}
                    />
                  </div>
                ))}
              </>
            )}

            {/* Function Arguments */}
            {contractFunction && contractFunction.inputs.length > 0 ? (
              contractFunction.inputs.map((input, idx) => (
                <div key={input.name || idx}>
                  <label className="block text-xs text-coco-text-tertiary mb-1">
                    {input.name || `arg${idx}`}{' '}
                    <span className="text-coco-accent">({input.type})</span>
                  </label>
                  <input
                    type="text"
                    placeholder={`Enter ${input.type}...`}
                    value={payload[input.name || `arg${idx}`] || ''}
                    onChange={(e) => handlePayloadChange(input.name || `arg${idx}`, e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-coco-bg-primary border border-coco-border-default rounded-md focus:outline-none focus:ring-2 focus:ring-coco-accent font-mono"
                    disabled={isExecuting}
                  />
                </div>
              ))
            ) : contractFunction && contractFunction.inputs.length === 0 ? (
              <p className="text-sm text-coco-text-tertiary text-center py-2">
                This function has no parameters.
              </p>
            ) : !transaction.contract ? (
              <p className="text-sm text-coco-text-tertiary text-center py-2">
                No contract selected. Add a contract to this transaction to see its parameters.
              </p>
            ) : !transaction.functionName ? (
              <p className="text-sm text-coco-text-tertiary text-center py-2">
                No function selected. Select a function from the contract to see its parameters.
              </p>
            ) : null}
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-coco-error/10 border border-coco-error/20 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <XCircle className="w-5 h-5 text-coco-error flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-coco-error mb-1">Transaction Failed</p>
              <pre className="text-xs text-coco-error/90 whitespace-pre-wrap break-words font-mono bg-coco-error/5 p-2 rounded max-h-48 overflow-y-auto">
                {error}
              </pre>
              {/* AI Error Explanation */}
              <ErrorExplanation
                errorMessage={error}
                context={{ ecosystem }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Execute Button */}
      <Button
        variant="primary"
        onClick={handleExecute}
        disabled={isExecuting}
        className="w-full"
      >
        {isExecuting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            Executing...
          </>
        ) : (
          <>
            <Play className="w-4 h-4 mr-2" />
            Execute Transaction
          </>
        )}
      </Button>

      {/* Execution History */}
      <div className="bg-coco-bg-secondary rounded-lg p-4">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-4 h-4 text-coco-text-tertiary" />
          <h3 className="text-sm font-medium text-coco-text-secondary">Execution History</h3>
          <span className="text-xs text-coco-text-tertiary">({runs.length})</span>
        </div>

        {runs.length === 0 ? (
          <p className="text-sm text-coco-text-tertiary text-center py-4">
            No executions yet. Click "Execute Transaction" to run this transaction.
          </p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {runs.map((run) => {
              const isExpanded = expandedRuns.has(run.id);
              return (
                <div
                  key={run.id}
                  className="bg-coco-bg-primary border border-coco-border-subtle rounded-lg overflow-hidden"
                >
                  {/* Collapsed Header - Always visible */}
                  <button
                    type="button"
                    onClick={() => toggleRunExpanded(run.id)}
                    className="w-full flex items-center justify-between p-3 text-left hover:bg-coco-bg-tertiary/30 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {getStatusIcon(run.status)}
                      <span
                        className={clsx(
                          'text-xs font-medium',
                          run.status === 'success' && 'text-coco-success',
                          run.status === 'failed' && 'text-coco-error',
                          run.status === 'pending' && 'text-coco-warning'
                        )}
                      >
                        {run.status.charAt(0).toUpperCase() + run.status.slice(1)}
                      </span>
                      {run.txHash && (
                        <span className="text-xs font-mono text-coco-text-tertiary truncate">
                          {truncateHash(run.txHash)}
                        </span>
                      )}
                      {run.errorMessage && !run.txHash && (
                        <span className="text-xs text-coco-error truncate">
                          {run.errorMessage.split('\n')[0].substring(0, 40)}...
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs text-coco-text-tertiary">
                        {formatShortDate(run.startedAt)}
                      </span>
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-coco-text-tertiary" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-coco-text-tertiary" />
                      )}
                    </div>
                  </button>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="px-3 pb-3 border-t border-coco-border-subtle">
                      {/* Full Timestamp */}
                      <div className="py-2 text-xs text-coco-text-tertiary">
                        {formatDate(run.startedAt)}
                      </div>

                      {/* TX Hash */}
                      {run.txHash && (
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs text-coco-text-tertiary">TX:</span>
                          <span className="text-xs font-mono text-coco-text-primary flex-1 truncate">
                            {run.txHash}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              copyToClipboard(run.txHash!);
                            }}
                            className="p-1 hover:bg-coco-bg-secondary rounded"
                            title="Copy transaction hash"
                          >
                            <Copy className="w-3 h-3 text-coco-text-tertiary" />
                          </button>
                          {blockExplorerUrl && (
                            <a
                              href={buildTxExplorerUrl(blockExplorerUrl, run.txHash, ecosystem)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1 hover:bg-coco-bg-secondary rounded"
                              title="View on explorer"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ExternalLink className="w-3 h-3 text-coco-text-tertiary" />
                            </a>
                          )}
                        </div>
                      )}

                      {/* Details */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {run.blockNumber && (
                          <div>
                            <span className="text-coco-text-tertiary">Block: </span>
                            <span className="text-coco-text-secondary">{run.blockNumber.toLocaleString()}</span>
                          </div>
                        )}
                        {run.gasUsed && (
                          <div>
                            <span className="text-coco-text-tertiary">Gas: </span>
                            <span className="text-coco-text-secondary">{run.gasUsed.toLocaleString()}</span>
                          </div>
                        )}
                        {run.durationMs && (
                          <div>
                            <span className="text-coco-text-tertiary">Duration: </span>
                            <span className="text-coco-text-secondary">{run.durationMs}ms</span>
                          </div>
                        )}
                        {run.fee && (
                          <div>
                            <span className="text-coco-text-tertiary">Fee: </span>
                            <span className="text-coco-text-secondary">{run.fee}</span>
                          </div>
                        )}
                      </div>

                      {/* Input Payload */}
                      {run.payload && Object.keys(run.payload).length > 0 && (
                        <div className="mt-2 pt-2 border-t border-coco-border-subtle">
                          <p className="text-xs text-coco-text-tertiary mb-1">Input:</p>
                          <pre className="text-xs font-mono bg-coco-bg-tertiary p-2 rounded overflow-x-auto">
                            {JSON.stringify(run.payload, null, 2)}
                          </pre>
                        </div>
                      )}

                      {/* Result */}
                      {run.result && Object.keys(run.result).length > 0 && (
                        <div className="mt-2 pt-2 border-t border-coco-border-subtle">
                          <p className="text-xs text-coco-text-tertiary mb-1">Output:</p>
                          <pre className="text-xs font-mono bg-coco-bg-tertiary p-2 rounded overflow-x-auto">
                            {JSON.stringify(run.result, null, 2)}
                          </pre>
                        </div>
                      )}

                      {/* Error */}
                      {run.errorMessage && (
                        <div className="mt-2 p-2 bg-coco-error/10 border border-coco-error/20 rounded">
                          <p className="text-xs font-medium text-coco-error mb-1">Error:</p>
                          <pre className="text-xs text-coco-error/90 whitespace-pre-wrap break-words font-mono max-h-32 overflow-y-auto">
                            {run.errorMessage}
                          </pre>
                          {/* AI Error Explanation */}
                          <ErrorExplanation
                            errorMessage={run.errorMessage}
                            context={{ ecosystem }}
                            runId={run.id}
                            savedExplanation={run.aiExplanation}
                          />
                        </div>
                      )}

                      {/* Events */}
                      {run.events && run.events.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-coco-border-subtle">
                          <p className="text-xs text-coco-text-tertiary mb-1">Events:</p>
                          <div className="space-y-1">
                            {run.events.map((event, i) => (
                              <div key={i} className="text-xs font-mono bg-coco-bg-tertiary p-2 rounded">
                                {event.name}({JSON.stringify(event.args)})
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
