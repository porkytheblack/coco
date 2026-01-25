'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useChain, useWallets, useWorkspaces } from '@/hooks';
import type { Chain, WalletWithBalance, Workspace } from '@/types';

interface ChainContextValue {
  chainId: string;
  chain: Chain | undefined;
  wallets: WalletWithBalance[];
  workspaces: Workspace[];
  isLoading: boolean;
  error: Error | null;
}

const ChainContext = createContext<ChainContextValue | null>(null);

interface ChainProviderProps {
  chainId: string;
  children: ReactNode;
}

export function ChainProvider({ chainId, children }: ChainProviderProps) {
  const { data: chain, isLoading: chainLoading, error: chainError } = useChain(chainId);
  const { data: rawWallets = [], isLoading: walletsLoading } = useWallets(chainId);
  const { data: workspaces = [], isLoading: workspacesLoading } = useWorkspaces(chainId);

  // Convert Wallet[] to WalletWithBalance[] with default balance
  const wallets = useMemo((): WalletWithBalance[] => {
    return rawWallets.map((w) => ({
      ...w,
      balance: {
        native: '0',
        nativeDecimals: 18,
        nativeSymbol: chain?.nativeCurrency || 'ETH',
      },
      transactionCount: 0,
    }));
  }, [rawWallets, chain?.nativeCurrency]);

  const value: ChainContextValue = {
    chainId,
    chain,
    wallets,
    workspaces,
    isLoading: chainLoading || walletsLoading || workspacesLoading,
    error: chainError,
  };

  return (
    <ChainContext.Provider value={value}>
      {children}
    </ChainContext.Provider>
  );
}

export function useChainContext() {
  const context = useContext(ChainContext);
  if (!context) {
    throw new Error('useChainContext must be used within a ChainProvider');
  }
  return context;
}
