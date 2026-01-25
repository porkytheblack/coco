'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';
import { useWorkspace, useContracts, useTransactions } from '@/hooks';
import type { Workspace, Contract, Transaction } from '@/types';

interface WorkspaceContextValue {
  workspaceId: string;
  workspace: Workspace | undefined;
  contracts: Contract[];
  transactions: Transaction[];
  selectedContract: Contract | null;
  setSelectedContract: (contract: Contract | null) => void;
  selectedTransaction: Transaction | null;
  setSelectedTransaction: (transaction: Transaction | null) => void;
  isLoading: boolean;
  error: Error | null;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

interface WorkspaceProviderProps {
  workspaceId: string;
  children: ReactNode;
}

export function WorkspaceProvider({ workspaceId, children }: WorkspaceProviderProps) {
  const { data: workspace, isLoading: workspaceLoading, error: workspaceError } = useWorkspace(workspaceId);
  const { data: contracts = [], isLoading: contractsLoading } = useContracts(workspaceId);
  const { data: transactions = [], isLoading: transactionsLoading } = useTransactions(workspaceId);

  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  const value: WorkspaceContextValue = {
    workspaceId,
    workspace,
    contracts,
    transactions,
    selectedContract,
    setSelectedContract,
    selectedTransaction,
    setSelectedTransaction,
    isLoading: workspaceLoading || contractsLoading || transactionsLoading,
    error: workspaceError,
  };

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspaceContext() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspaceContext must be used within a WorkspaceProvider');
  }
  return context;
}
