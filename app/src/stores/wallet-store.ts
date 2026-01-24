import { create } from 'zustand';
import type { Wallet, WalletWithBalance, WalletTransaction, CreateWalletRequest, ImportWalletRequest, Chain } from '@/types';
import * as tauri from '@/lib/tauri';
import { getAdapter } from '@/lib/adapters';

interface WalletState {
  wallets: WalletWithBalance[];
  selectedWallet: WalletWithBalance | null;
  walletTransactions: WalletTransaction[];
  currentChain: Chain | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  loadWallets: (chain: Chain) => Promise<void>;
  selectWallet: (wallet: WalletWithBalance | null) => void;
  createWallet: (request: CreateWalletRequest) => Promise<Wallet>;
  importWallet: (request: ImportWalletRequest) => Promise<Wallet>;
  fundWallet: (walletId: string) => Promise<string>;
  deleteWallet: (walletId: string) => Promise<void>;
  refreshBalance: (walletId: string) => Promise<void>;
  refreshAllBalances: () => Promise<void>;
  loadWalletTransactions: (walletId: string) => Promise<void>;
}

// Mock data for development when not running in Tauri
const mockWallets: WalletWithBalance[] = [
  {
    id: 'w1',
    chainId: 'eth-sepolia',
    name: 'deployer',
    address: '0x742d35Cc6634C0532925a3b844Bc9e7595f3a9F',
    publicKey: '0x...',
    createdAt: new Date().toISOString(),
    balance: { native: '1245000000000000000', nativeDecimals: 18, nativeSymbol: 'ETH' },
    transactionCount: 12,
  },
  {
    id: 'w2',
    chainId: 'eth-sepolia',
    name: 'alice',
    address: '0x8ba1f109551bD432803012645Ac136ddd64DBA72',
    publicKey: '0x...',
    createdAt: new Date().toISOString(),
    balance: { native: '892000000000000000', nativeDecimals: 18, nativeSymbol: 'ETH' },
    transactionCount: 8,
  },
];

// Mock transaction history
const mockTransactions: WalletTransaction[] = [
  {
    id: 'tx1',
    walletId: 'w1',
    txHash: '0x8f2a3b1c4d5e6f708192a3b4c5d6e7f809a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5',
    type: 'send',
    from: '0x742d35Cc6634C0532925a3b844Bc9e7595f3a9F',
    to: '0x8ba1f109551bD432803012645Ac136ddd64DBA72',
    value: '100000000000000000',
    gasUsed: 21000,
    fee: '420000000000000',
    status: 'success',
    blockNumber: 12847293,
    timestamp: new Date(Date.now() - 3600000).toISOString(),
  },
];

export const useWalletStore = create<WalletState>((set, get) => ({
  wallets: [],
  selectedWallet: null,
  walletTransactions: [],
  currentChain: null,
  isLoading: false,
  error: null,

  loadWallets: async (chain: Chain) => {
    set({ isLoading: true, error: null, currentChain: chain });
    try {
      if (tauri.checkIsTauri()) {
        const wallets = await tauri.listWallets(chain.id);
        // Convert Wallet[] to WalletWithBalance[] with default balance
        const walletsWithBalance: WalletWithBalance[] = wallets.map((w) => ({
          ...w,
          balance: { native: '0', nativeDecimals: 18, nativeSymbol: chain.nativeCurrency },
          transactionCount: 0,
        }));
        set({ wallets: walletsWithBalance, isLoading: false });
        // Refresh balances in background using adapters
        get().refreshAllBalances();
      } else {
        // Fallback to mock data for browser development
        await new Promise((resolve) => setTimeout(resolve, 300));
        const wallets = mockWallets.filter((w) => w.chainId === chain.id);
        set({ wallets, isLoading: false });
        // Also try to fetch real balances in browser mode if we have RPC
        get().refreshAllBalances();
      }
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  selectWallet: (wallet: WalletWithBalance | null) => {
    set({ selectedWallet: wallet });
  },

  createWallet: async (request: CreateWalletRequest) => {
    const { currentChain } = get();
    set({ isLoading: true, error: null });
    try {
      let wallet: WalletWithBalance;
      if (tauri.checkIsTauri()) {
        const created = await tauri.createWallet(request);
        wallet = {
          ...created,
          balance: { native: '0', nativeDecimals: 18, nativeSymbol: currentChain?.nativeCurrency || 'ETH' },
          transactionCount: 0,
        };
      } else {
        // Fallback for browser development
        wallet = {
          id: `w-${Date.now()}`,
          chainId: request.chainId,
          name: request.name,
          address: `0x${Math.random().toString(16).slice(2, 42)}`,
          publicKey: '0x...',
          createdAt: new Date().toISOString(),
          balance: { native: '0', nativeDecimals: 18, nativeSymbol: currentChain?.nativeCurrency || 'ETH' },
          transactionCount: 0,
        };
      }
      set((state) => ({
        wallets: [...state.wallets, wallet],
        isLoading: false,
      }));
      return wallet;
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  importWallet: async (request: ImportWalletRequest) => {
    const { currentChain } = get();
    set({ isLoading: true, error: null });
    try {
      let wallet: WalletWithBalance;
      if (tauri.checkIsTauri()) {
        const imported = await tauri.importWallet(request);
        wallet = {
          ...imported,
          balance: { native: '0', nativeDecimals: 18, nativeSymbol: currentChain?.nativeCurrency || 'ETH' },
          transactionCount: 0,
        };
      } else {
        // Fallback for browser development
        wallet = {
          id: `w-${Date.now()}`,
          chainId: request.chainId,
          name: request.name,
          address: `0x${Math.random().toString(16).slice(2, 42)}`,
          publicKey: '0x...',
          createdAt: new Date().toISOString(),
          balance: { native: '0', nativeDecimals: 18, nativeSymbol: currentChain?.nativeCurrency || 'ETH' },
          transactionCount: 0,
        };
      }
      set((state) => ({
        wallets: [...state.wallets, wallet],
        isLoading: false,
      }));
      // Refresh balance for new wallet
      get().refreshBalance(wallet.id);
      return wallet;
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  fundWallet: async (walletId: string) => {
    set({ isLoading: true, error: null });
    try {
      // TODO: Implement faucet call in Tauri backend
      await new Promise((resolve) => setTimeout(resolve, 1000));
      // Simulate adding funds
      set((state) => ({
        wallets: state.wallets.map((w) =>
          w.id === walletId
            ? {
                ...w,
                balance: {
                  ...w.balance,
                  native: (BigInt(w.balance.native) + BigInt('1000000000000000000')).toString(),
                },
              }
            : w
        ),
        isLoading: false,
      }));
      return 'mock_faucet_tx_hash';
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  deleteWallet: async (walletId: string) => {
    const { currentChain } = get();
    if (!currentChain) {
      throw new Error('No chain selected');
    }

    set({ isLoading: true, error: null });
    try {
      if (tauri.checkIsTauri()) {
        await tauri.deleteWallet(currentChain.id, walletId);
      }
      set((state) => ({
        wallets: state.wallets.filter((w) => w.id !== walletId),
        selectedWallet: state.selectedWallet?.id === walletId ? null : state.selectedWallet,
        isLoading: false,
      }));
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  refreshBalance: async (walletId: string) => {
    const { currentChain, wallets } = get();
    if (!currentChain) return;

    const wallet = wallets.find((w) => w.id === walletId);
    if (!wallet) return;

    try {
      // Use the adapter to fetch real balance from the chain
      const adapter = getAdapter(currentChain.ecosystem);
      const balanceResult = await adapter.getBalance(
        currentChain.rpcUrl,
        wallet.address,
        currentChain.nativeCurrency
      );

      set((state) => ({
        wallets: state.wallets.map((w) =>
          w.id === walletId
            ? {
                ...w,
                balance: {
                  native: balanceResult.native,
                  nativeDecimals: balanceResult.nativeDecimals,
                  nativeSymbol: balanceResult.nativeSymbol,
                },
              }
            : w
        ),
        // Also update selectedWallet if it's the same
        selectedWallet:
          state.selectedWallet?.id === walletId
            ? {
                ...state.selectedWallet,
                balance: {
                  native: balanceResult.native,
                  nativeDecimals: balanceResult.nativeDecimals,
                  nativeSymbol: balanceResult.nativeSymbol,
                },
              }
            : state.selectedWallet,
      }));
    } catch (error) {
      console.error('Failed to refresh balance:', error);
    }
  },

  refreshAllBalances: async () => {
    const { wallets } = get();
    // Refresh all wallet balances in parallel
    await Promise.all(wallets.map((w) => get().refreshBalance(w.id)));
  },

  loadWalletTransactions: async (walletId: string) => {
    const { currentChain, wallets } = get();
    set({ isLoading: true, error: null });

    const wallet = wallets.find((w) => w.id === walletId);
    console.log('[loadWalletTransactions] walletId:', walletId, 'wallet:', wallet?.address, 'currentChain:', currentChain?.id, 'blockExplorerApiUrl:', currentChain?.blockExplorerApiUrl);

    if (!wallet || !currentChain) {
      console.log('[loadWalletTransactions] Missing wallet or chain, returning empty');
      set({ walletTransactions: [], isLoading: false });
      return;
    }

    try {
      // Use the adapter to fetch transaction history
      // Use the configured blockExplorerApiUrl and apiKey if available
      const adapter = getAdapter(currentChain.ecosystem);
      console.log('[loadWalletTransactions] Fetching transactions for', wallet.address, 'with API URL:', currentChain.blockExplorerApiUrl, 'API key:', currentChain.blockExplorerApiKey ? 'yes' : 'no');
      const transactions = await adapter.getTransactionHistory(
        currentChain.rpcUrl,
        wallet.address,
        currentChain.blockExplorerApiUrl,
        currentChain.blockExplorerApiKey
      );
      console.log('[loadWalletTransactions] Got', transactions.length, 'transactions');

      // Add walletId to transactions
      const transactionsWithWalletId = transactions.map((tx) => ({
        ...tx,
        walletId,
      }));

      set({ walletTransactions: transactionsWithWalletId, isLoading: false });
    } catch (error) {
      console.error('Failed to load transactions:', error);
      // Fallback to mock data
      if (!tauri.checkIsTauri()) {
        const transactions = mockTransactions.filter((tx) => tx.walletId === walletId);
        set({ walletTransactions: transactions, isLoading: false });
      } else {
        set({ walletTransactions: [], isLoading: false, error: (error as Error).message });
      }
    }
  },
}));
