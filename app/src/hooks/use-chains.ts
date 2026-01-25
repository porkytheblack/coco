import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/react-query';
import * as tauri from '@/lib/tauri';
import type { CreateChainRequest } from '@/types';

// ============================================================================
// Chain hooks
// ============================================================================

export function useChains() {
  return useQuery({
    queryKey: queryKeys.chains,
    queryFn: () => tauri.listChains(),
  });
}

export function useChain(chainId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.chain(chainId!),
    queryFn: () => tauri.getChain(chainId!),
    enabled: !!chainId,
  });
}

export function useCreateChain() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: CreateChainRequest) => tauri.createChain(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.chains });
    },
  });
}

export function useUpdateChain() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      chainId: string;
      name: string;
      rpcUrl: string;
      chainIdNumeric?: number;
      explorerUrl?: string;
      explorerApiUrl?: string;
      explorerApiKey?: string;
      faucetUrl?: string;
    }) =>
      tauri.updateChain(
        params.chainId,
        params.name,
        params.rpcUrl,
        params.chainIdNumeric,
        params.explorerUrl,
        params.explorerApiUrl,
        params.explorerApiKey,
        params.faucetUrl
      ),
    onSuccess: (data, variables) => {
      queryClient.setQueryData(queryKeys.chain(variables.chainId), data);
      queryClient.invalidateQueries({ queryKey: queryKeys.chains });
    },
  });
}

export function useDeleteChain() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (chainId: string) => tauri.deleteChain(chainId),
    onSuccess: (_, chainId) => {
      queryClient.removeQueries({ queryKey: queryKeys.chain(chainId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.chains });
      // Also invalidate related data
      queryClient.invalidateQueries({ queryKey: queryKeys.wallets(chainId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.workspaces(chainId) });
    },
  });
}
