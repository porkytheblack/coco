'use client';

import { clsx } from 'clsx';
import { FileCode, Copy, CheckCircle, ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import type { Contract } from '@/types';
import { truncateAddress } from '@/lib/utils/format';

interface ContractCardProps {
  contract: Contract;
  onClick?: () => void;
}

export function ContractCard({ contract, onClick }: ContractCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyAddress = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (contract.address) {
      await navigator.clipboard.writeText(contract.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getInterfaceLabel = (type: string | undefined) => {
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
  };

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
      className={clsx(
        'w-full p-4 rounded-lg text-left',
        'bg-coco-bg-elevated border border-coco-border-subtle',
        'hover:border-coco-border-default hover:shadow-sm',
        'transition-all duration-base cursor-pointer',
        'focus:outline-none focus:ring-2 focus:ring-coco-accent focus:ring-offset-2'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <FileCode className="w-4 h-4 text-coco-accent" />
          <span className="text-sm font-medium text-coco-text-primary">
            {contract.name}
          </span>
        </div>
        <span className="text-xs px-2 py-0.5 rounded-full bg-coco-bg-tertiary text-coco-text-secondary">
          {getInterfaceLabel(contract.interfaceType)}
        </span>
      </div>

      {/* Address */}
      {contract.address ? (
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs text-coco-text-tertiary font-mono">
            {truncateAddress(contract.address)}
          </span>
          <button
            onClick={handleCopyAddress}
            className="p-1 hover:bg-coco-bg-tertiary rounded transition-colors"
            title="Copy address"
          >
            {copied ? (
              <CheckCircle className="w-3 h-3 text-coco-success" />
            ) : (
              <Copy className="w-3 h-3 text-coco-text-tertiary" />
            )}
          </button>
        </div>
      ) : (
        <p className="text-xs text-coco-text-tertiary mb-2">Not deployed</p>
      )}
    </div>
  );
}

interface ContractListProps {
  contracts: Contract[];
  onContractClick?: (contract: Contract) => void;
  onAddContract?: () => void;
  defaultCollapsed?: boolean;
}

export function ContractList({
  contracts,
  onContractClick,
  onAddContract,
  defaultCollapsed = true,
}: ContractListProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="flex items-center gap-1 text-sm font-semibold text-coco-text-primary hover:text-coco-accent transition-colors"
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
          Contracts ({contracts.length})
        </button>
        {onAddContract && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddContract();
            }}
            className="text-xs text-coco-accent hover:text-coco-accent-hover"
          >
            + Add
          </button>
        )}
      </div>

      {!isCollapsed && (
        <>
          {contracts.length > 0 ? (
            <div className="space-y-2">
              {contracts.map((contract) => (
                <ContractCard
                  key={contract.id}
                  contract={contract}
                  onClick={() => onContractClick?.(contract)}
                />
              ))}
            </div>
          ) : (
            <div className="p-6 text-center border border-dashed border-coco-border-subtle rounded-lg">
              <FileCode className="w-8 h-8 text-coco-text-tertiary mx-auto mb-2" />
              <p className="text-sm text-coco-text-tertiary">No contracts yet</p>
              {onAddContract && (
                <button
                  onClick={onAddContract}
                  className="mt-2 text-sm text-coco-accent hover:text-coco-accent-hover"
                >
                  Add your first contract
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
