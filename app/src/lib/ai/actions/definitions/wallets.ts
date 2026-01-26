/**
 * Wallet Actions
 *
 * Actions for managing wallets in the app.
 */

import type { RegisteredAction, ActionResult } from '../types';
import { useWalletStore, useChainStore } from '@/stores';

export const walletActions: RegisteredAction[] = [
  {
    definition: {
      id: 'list_wallets',
      name: 'List Wallets',
      description: 'Get all wallets for the current or specified chain',
      category: 'wallets',
      parameters: [
        { name: 'chainId', type: 'string', description: 'Chain ID to list wallets for (uses current chain if not specified)', required: false },
      ],
      returns: 'List of wallets with address, name, and balance',
      tags: ['wallets', 'list', 'accounts'],
    },
    execute: async (params): Promise<ActionResult> => {
      const { wallets, loadWallets } = useWalletStore.getState();
      const { chains, selectedChain } = useChainStore.getState();

      const chainId = params.chainId as string || selectedChain?.id;
      if (!chainId) {
        return {
          success: false,
          message: 'No chain specified and no chain currently selected',
          error: 'Chain ID required',
        };
      }

      const chain = chains.find(c => c.id === chainId);
      if (!chain) {
        return {
          success: false,
          message: `Chain "${chainId}" not found`,
          error: 'Chain not found',
        };
      }

      // Load wallets for the chain
      await loadWallets(chain);

      const walletList = wallets.map(w => ({
        id: w.id,
        name: w.name,
        address: w.address,
        balance: w.balance,
      }));

      return {
        success: true,
        message: `Found ${walletList.length} wallet(s) on ${chain.name}`,
        data: walletList,
      };
    },
  },
  {
    definition: {
      id: 'create_wallet',
      name: 'Create Wallet',
      description: 'Create a new wallet on a specific chain',
      category: 'wallets',
      parameters: [
        { name: 'name', type: 'string', description: 'Display name for the wallet', required: true },
        { name: 'chainId', type: 'string', description: 'Chain ID to create wallet on', required: true },
      ],
      returns: 'The created wallet object with address',
      requiresConfirmation: true,
      tags: ['wallets', 'create', 'new', 'account'],
    },
    execute: async (params): Promise<ActionResult> => {
      const { createWallet } = useWalletStore.getState();
      const { chains } = useChainStore.getState();

      const chain = chains.find(c => c.id === params.chainId);
      if (!chain) {
        return {
          success: false,
          message: `Chain "${params.chainId}" not found`,
          error: 'Chain not found',
        };
      }

      try {
        const wallet = await createWallet({
          name: params.name as string,
          chainId: params.chainId as string,
          ecosystem: chain.ecosystem,
        });
        return {
          success: true,
          message: `Wallet "${params.name}" created with address ${wallet.address}`,
          data: {
            id: wallet.id,
            name: wallet.name,
            address: wallet.address,
          },
        };
      } catch (error) {
        return {
          success: false,
          message: `Failed to create wallet: ${error instanceof Error ? error.message : 'Unknown error'}`,
          error: String(error),
        };
      }
    },
  },
  {
    definition: {
      id: 'get_wallet_balance',
      name: 'Get Wallet Balance',
      description: 'Get the balance of a specific wallet',
      category: 'wallets',
      parameters: [
        { name: 'walletId', type: 'string', description: 'The wallet ID to check balance for', required: true },
      ],
      returns: 'Wallet balance information',
      tags: ['wallets', 'balance', 'funds'],
    },
    execute: async (params): Promise<ActionResult> => {
      const { wallets, refreshBalance } = useWalletStore.getState();
      const wallet = wallets.find(w => w.id === params.walletId);

      if (!wallet) {
        return {
          success: false,
          message: `Wallet "${params.walletId}" not found`,
          error: 'Wallet not found',
        };
      }

      try {
        await refreshBalance(wallet.id);
        const updatedWallet = useWalletStore.getState().wallets.find(w => w.id === params.walletId);
        return {
          success: true,
          message: `Balance: ${updatedWallet?.balance.native} ${updatedWallet?.balance.nativeSymbol}`,
          data: updatedWallet?.balance,
        };
      } catch (error) {
        return {
          success: false,
          message: `Failed to get balance: ${error instanceof Error ? error.message : 'Unknown error'}`,
          error: String(error),
        };
      }
    },
  },
  {
    definition: {
      id: 'delete_wallet',
      name: 'Delete Wallet',
      description: 'Delete a wallet from the app',
      category: 'wallets',
      parameters: [
        { name: 'walletId', type: 'string', description: 'The wallet ID to delete', required: true },
      ],
      returns: 'Success confirmation',
      requiresConfirmation: true,
      tags: ['wallets', 'delete', 'remove'],
    },
    execute: async (params): Promise<ActionResult> => {
      const { wallets, deleteWallet } = useWalletStore.getState();
      const wallet = wallets.find(w => w.id === params.walletId);

      if (!wallet) {
        return {
          success: false,
          message: `Wallet "${params.walletId}" not found`,
          error: 'Wallet not found',
        };
      }

      try {
        await deleteWallet(params.walletId as string);
        return {
          success: true,
          message: `Wallet "${wallet.name}" deleted successfully`,
        };
      } catch (error) {
        return {
          success: false,
          message: `Failed to delete wallet: ${error instanceof Error ? error.message : 'Unknown error'}`,
          error: String(error),
        };
      }
    },
  },
];
