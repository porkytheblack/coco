'use client';

import { useState } from 'react';
import { FileCode, Copy, CheckCircle, ChevronDown, ChevronRight, Play, Eye, Edit, Trash2, Pencil } from 'lucide-react';
import { clsx } from 'clsx';
import type { Contract, ContractFunction } from '@/types';
import { truncateAddress } from '@/lib/utils/format';
import { Button } from '@/components/ui';

interface ContractPanelProps {
  contract: Contract;
  onCreateTransaction?: (contractId: string, functionName: string) => void;
  onEdit?: (contract: Contract) => void;
  onDelete?: (contractId: string) => Promise<void>;
}

function getInterfaceLabel(type: string | undefined) {
  switch (type) {
    case 'abi':
      return 'Solidity';
    case 'idl':
      return 'Anchor';
    case 'move':
      return 'Move';
    default:
      return type?.toUpperCase() || 'Unknown';
  }
}

export function ContractPanel({ contract, onCreateTransaction, onEdit, onDelete }: ContractPanelProps) {
  const [copied, setCopied] = useState(false);
  const [expandedSection, setExpandedSection] = useState<'read' | 'write' | null>('write');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Use the parsed functions from the contract, or empty array if none
  const functions = contract.functions || [];
  const readFunctions = functions.filter(f => f.type === 'read');
  const writeFunctions = functions.filter(f => f.type === 'write');

  const handleCopyAddress = async () => {
    if (contract.address) {
      await navigator.clipboard.writeText(contract.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCreateTransaction = (functionName: string) => {
    onCreateTransaction?.(contract.id, functionName);
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    setIsDeleting(true);
    try {
      await onDelete(contract.id);
    } catch (error) {
      console.error('Failed to delete contract:', error);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-coco-border-subtle">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <FileCode className="w-5 h-5 text-coco-accent" />
            <h2 className="text-lg font-semibold text-coco-text-primary">{contract.name}</h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs px-2 py-1 rounded-full bg-coco-bg-tertiary text-coco-text-secondary">
              {getInterfaceLabel(contract.interfaceType)}
            </span>
            {onEdit && !showDeleteConfirm && (
              <button
                onClick={() => onEdit(contract)}
                className="p-1.5 hover:bg-coco-bg-tertiary rounded transition-colors text-coco-text-tertiary hover:text-coco-accent"
                title="Edit contract"
              >
                <Pencil className="w-4 h-4" />
              </button>
            )}
            {onDelete && (
              !showDeleteConfirm ? (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="p-1.5 hover:bg-coco-bg-tertiary rounded transition-colors text-coco-text-tertiary hover:text-coco-error"
                  title="Delete contract"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              ) : (
                <div className="flex items-center gap-1">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setShowDeleteConfirm(false)}
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
              )
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-coco-text-tertiary font-mono">
            {truncateAddress(contract.address)}
          </span>
          <button
            onClick={handleCopyAddress}
            className="p-1 hover:bg-coco-bg-tertiary rounded transition-colors"
            title="Copy address"
          >
            {copied ? (
              <CheckCircle className="w-4 h-4 text-coco-success" />
            ) : (
              <Copy className="w-4 h-4 text-coco-text-tertiary" />
            )}
          </button>
        </div>
      </div>

      {/* Functions */}
      <div className="flex-1 overflow-y-auto">
        {functions.length === 0 ? (
          <div className="p-6 text-center">
            <FileCode className="w-12 h-12 text-coco-text-tertiary mx-auto mb-3" />
            <p className="text-sm text-coco-text-tertiary">
              No functions found. Add an ABI, IDL, or Move definition to see available functions.
            </p>
          </div>
        ) : (
          <>
            {/* Write Functions */}
            <div className="border-b border-coco-border-subtle">
              <button
                onClick={() => setExpandedSection(expandedSection === 'write' ? null : 'write')}
                className="w-full flex items-center justify-between p-3 hover:bg-coco-bg-secondary transition-colors"
              >
                <div className="flex items-center gap-2">
                  {expandedSection === 'write' ? (
                    <ChevronDown className="w-4 h-4 text-coco-text-tertiary" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-coco-text-tertiary" />
                  )}
                  <Edit className="w-4 h-4 text-coco-warning" />
                  <span className="text-sm font-medium text-coco-text-primary">
                    Write Functions
                  </span>
                </div>
                <span className="text-xs text-coco-text-tertiary">{writeFunctions.length}</span>
              </button>

              {expandedSection === 'write' && writeFunctions.length > 0 && (
                <div className="px-3 pb-3 space-y-2">
                  {writeFunctions.map((fn) => (
                    <FunctionItem
                      key={fn.name}
                      fn={fn}
                      onCreateTransaction={() => handleCreateTransaction(fn.name)}
                    />
                  ))}
                </div>
              )}

              {expandedSection === 'write' && writeFunctions.length === 0 && (
                <div className="px-3 pb-3 text-xs text-coco-text-tertiary">
                  No write functions
                </div>
              )}
            </div>

            {/* Read Functions */}
            <div className="border-b border-coco-border-subtle">
              <button
                onClick={() => setExpandedSection(expandedSection === 'read' ? null : 'read')}
                className="w-full flex items-center justify-between p-3 hover:bg-coco-bg-secondary transition-colors"
              >
                <div className="flex items-center gap-2">
                  {expandedSection === 'read' ? (
                    <ChevronDown className="w-4 h-4 text-coco-text-tertiary" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-coco-text-tertiary" />
                  )}
                  <Eye className="w-4 h-4 text-coco-accent" />
                  <span className="text-sm font-medium text-coco-text-primary">
                    Read Functions
                  </span>
                </div>
                <span className="text-xs text-coco-text-tertiary">{readFunctions.length}</span>
              </button>

              {expandedSection === 'read' && readFunctions.length > 0 && (
                <div className="px-3 pb-3 space-y-2">
                  {readFunctions.map((fn) => (
                    <FunctionItem
                      key={fn.name}
                      fn={fn}
                      onCreateTransaction={() => handleCreateTransaction(fn.name)}
                    />
                  ))}
                </div>
              )}

              {expandedSection === 'read' && readFunctions.length === 0 && (
                <div className="px-3 pb-3 text-xs text-coco-text-tertiary">
                  No read functions
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Footer hint */}
      {functions.length > 0 && (
        <div className="p-3 border-t border-coco-border-subtle bg-coco-bg-secondary">
          <p className="text-xs text-coco-text-tertiary text-center">
            Click a function to create a transaction
          </p>
        </div>
      )}
    </div>
  );
}

interface FunctionItemProps {
  fn: ContractFunction;
  onCreateTransaction: () => void;
}

function FunctionItem({ fn, onCreateTransaction }: FunctionItemProps) {
  return (
    <button
      onClick={onCreateTransaction}
      className={clsx(
        'w-full p-3 rounded-lg text-left',
        'bg-coco-bg-elevated border border-coco-border-subtle',
        'hover:border-coco-border-default hover:shadow-sm',
        'transition-all duration-base cursor-pointer',
        'focus:outline-none focus:ring-2 focus:ring-coco-accent focus:ring-offset-2'
      )}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium text-coco-text-primary font-mono">
          {fn.name}
        </span>
        <Play className="w-3 h-3 text-coco-text-tertiary" />
      </div>

      {fn.inputs.length > 0 && (
        <div className="text-xs text-coco-text-tertiary font-mono">
          ({fn.inputs.map((i, idx) => (
            <span key={i.name || idx}>
              <span className="text-coco-text-secondary">{i.name || `arg${idx}`}</span>
              <span className="text-coco-accent">: {i.type}</span>
              {idx < fn.inputs.length - 1 && ', '}
            </span>
          ))})
        </div>
      )}

      {fn.outputs && fn.outputs.length > 0 && (
        <div className="text-xs text-coco-text-tertiary font-mono mt-1">
          <span className="text-coco-success">
            {' -> '}
            {fn.outputs.map((o, idx) => (
              <span key={idx}>
                {o.type}
                {idx < fn.outputs!.length - 1 && ', '}
              </span>
            ))}
          </span>
        </div>
      )}
    </button>
  );
}
