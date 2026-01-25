import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/react-query';
import * as tauri from '@/lib/tauri';
import type { CreateWalletRequest, ImportWalletRequest } from '@/types';

// ============================================================================
// Wallet query hooks
// ============================================================================

export function useWallets(chainId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.wallets(chainId!),
    queryFn: () => tauri.listWallets(chainId!),
    enabled: !!chainId,
  });
}

export function useWallet(walletId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.wallet(walletId!),
    queryFn: () => tauri.getWallet(walletId!),
    enabled: !!walletId,
  });
}

export function useReusableWallets(
  blockchain: string | undefined,
  excludeChainId: string | undefined
) {
  return useQuery({
    queryKey: queryKeys.reusableWallets(blockchain!, excludeChainId!),
    queryFn: () => tauri.listReusableWallets(blockchain!, excludeChainId!),
    enabled: !!blockchain && !!excludeChainId,
  });
}

// ============================================================================
// Wallet mutation hooks
// ============================================================================

export function useCreateWallet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: CreateWalletRequest) => tauri.createWallet(request),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.wallets(variables.chainId) });
    },
  });
}

export function useImportWallet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: ImportWalletRequest) => tauri.importWallet(request),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.wallets(variables.chainId) });
    },
  });
}

export function useDeleteWallet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { chainId: string; walletId: string }) =>
      tauri.deleteWallet(params.chainId, params.walletId),
    onSuccess: (_, variables) => {
      queryClient.removeQueries({ queryKey: queryKeys.wallet(variables.walletId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.wallets(variables.chainId) });
    },
  });
}

export function useRefreshBalance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { chainId: string; walletId: string }) =>
      tauri.refreshBalance(params.chainId, params.walletId),
    onSuccess: (_, variables) => {
      // Invalidate the wallet to get the updated balance
      queryClient.invalidateQueries({ queryKey: queryKeys.wallet(variables.walletId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.wallets(variables.chainId) });
    },
  });
}

export function useGetWalletPrivateKey() {
  return useMutation({
    mutationFn: (walletId: string) => tauri.getWalletPrivateKey(walletId),
  });
}
