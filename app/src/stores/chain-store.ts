import { create } from 'zustand';
import type { Chain, CreateChainRequest, NetworkType } from '@/types';
import * as tauri from '@/lib/tauri';

interface ChainState {
  chains: Chain[];
  selectedChain: Chain | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  loadChains: () => Promise<void>;
  selectChain: (chain: Chain | null) => void;
  addChain: (request: CreateChainRequest) => Promise<Chain>;
  updateChain: (id: string, updates: Partial<Chain>) => Promise<void>;
  deleteChain: (id: string) => Promise<void>;
}

// Mock data for development when not running in Tauri
const mockChains: Chain[] = [
  {
    id: 'ethereum-sepolia',
    name: 'Ethereum Sepolia',
    ecosystem: 'evm',
    rpcUrl: 'https://sepolia.infura.io/v3/your-key',
    chainIdNumeric: 11155111,
    nativeCurrency: 'ETH',
    blockExplorerUrl: 'https://sepolia.etherscan.io',
    createdAt: new Date().toISOString(),
    walletCount: 4,
    workspaceCount: 2,
    blockchain: 'ethereum',
    networkType: 'testnet',
    isCustom: false,
    iconId: 'ethereum',
  },
  {
    id: 'solana-devnet',
    name: 'Solana Devnet',
    ecosystem: 'solana',
    rpcUrl: 'https://api.devnet.solana.com',
    nativeCurrency: 'SOL',
    blockExplorerUrl: 'https://explorer.solana.com?cluster=devnet',
    createdAt: new Date().toISOString(),
    walletCount: 1,
    workspaceCount: 1,
    blockchain: 'solana',
    networkType: 'devnet',
    isCustom: false,
    iconId: 'solana',
  },
  {
    id: 'aptos-devnet',
    name: 'Aptos Devnet',
    ecosystem: 'aptos',
    rpcUrl: 'https://fullnode.devnet.aptoslabs.com/v1',
    nativeCurrency: 'APT',
    blockExplorerUrl: 'https://explorer.aptoslabs.com/?network=devnet',
    createdAt: new Date().toISOString(),
    walletCount: 0,
    workspaceCount: 0,
    blockchain: 'aptos',
    networkType: 'devnet',
    isCustom: false,
    iconId: 'aptos',
  },
];

export const useChainStore = create<ChainState>((set, get) => ({
  chains: [],
  selectedChain: null,
  isLoading: false,
  error: null,

  loadChains: async () => {
    set({ isLoading: true, error: null });
    try {
      if (tauri.checkIsTauri()) {
        const chains = await tauri.listChains();
        set({ chains, isLoading: false });
      } else {
        // Fallback to mock data for browser development
        await new Promise((resolve) => setTimeout(resolve, 300));
        set({ chains: mockChains, isLoading: false });
      }
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  selectChain: (chain: Chain | null) => {
    set({ selectedChain: chain });
  },

  addChain: async (request: CreateChainRequest) => {
    set({ isLoading: true, error: null });
    try {
      let chain: Chain;
      if (tauri.checkIsTauri()) {
        chain = await tauri.createChain(request);
      } else {
        // Fallback for browser development
        const chainId = request.blockchain && request.networkType !== 'custom'
          ? `${request.blockchain}-${request.networkType}`
          : `${request.ecosystem}-${Date.now()}`;
        chain = {
          id: chainId,
          name: request.name,
          ecosystem: request.ecosystem,
          rpcUrl: request.rpcUrl,
          chainIdNumeric: request.chainIdNumeric,
          nativeCurrency: request.currencySymbol,
          blockExplorerUrl: request.blockExplorerUrl,
          blockExplorerApiUrl: request.blockExplorerApiUrl,
          faucetUrl: request.faucetUrl,
          createdAt: new Date().toISOString(),
          walletCount: 0,
          workspaceCount: 0,
          blockchain: request.blockchain || 'custom',
          networkType: (request.networkType as NetworkType) || 'custom',
          isCustom: request.isCustom === false ? false : true,
          iconId: request.iconId || 'custom',
        };
      }
      set((state) => ({
        chains: [...state.chains, chain],
        isLoading: false,
      }));
      return chain;
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  updateChain: async (id: string, updates: Partial<Chain>) => {
    set({ isLoading: true, error: null });
    try {
      if (tauri.checkIsTauri()) {
        const { chains } = get();
        const existingChain = chains.find((c) => c.id === id);
        console.log('[updateChain store] id:', id, 'existingChain:', existingChain, 'updates:', updates);
        if (existingChain) {
          await tauri.updateChain(
            id,
            updates.name || existingChain.name,
            updates.rpcUrl || existingChain.rpcUrl,
            updates.blockExplorerUrl,
            updates.blockExplorerApiUrl,
            updates.blockExplorerApiKey
          );
        } else {
          console.error('[updateChain store] Chain not found in local state:', id);
        }
      }
      // Update local state
      set((state) => ({
        chains: state.chains.map((c) =>
          c.id === id ? { ...c, ...updates } : c
        ),
        selectedChain:
          state.selectedChain?.id === id
            ? { ...state.selectedChain, ...updates }
            : state.selectedChain,
        isLoading: false,
      }));
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  deleteChain: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      if (tauri.checkIsTauri()) {
        await tauri.deleteChain(id);
      }
      set((state) => ({
        chains: state.chains.filter((c) => c.id !== id),
        selectedChain: state.selectedChain?.id === id ? null : state.selectedChain,
        isLoading: false,
      }));
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },
}));
