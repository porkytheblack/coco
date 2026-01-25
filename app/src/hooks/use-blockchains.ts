import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/react-query';
import * as tauri from '@/lib/tauri';
import type { Blockchain, Network } from '@/types';

// ============================================================================
// Blockchain hooks
// ============================================================================

export function useBlockchains() {
  return useQuery({
    queryKey: queryKeys.blockchains,
    queryFn: () => tauri.listBlockchains(),
  });
}

export function useBlockchain(blockchainId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.blockchain(blockchainId!),
    queryFn: () => tauri.getBlockchain(blockchainId!),
    enabled: !!blockchainId,
  });
}

// ============================================================================
// Network hooks
// ============================================================================

export function useNetworks(blockchainId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.networks(blockchainId!),
    queryFn: () => tauri.listNetworks(blockchainId!),
    enabled: !!blockchainId,
  });
}

export function useAllNetworks() {
  return useQuery({
    queryKey: queryKeys.allNetworks,
    queryFn: () => tauri.listAllNetworks(),
  });
}

export function useNetwork(networkId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.network(networkId!),
    queryFn: () => tauri.getNetwork(networkId!),
    enabled: !!networkId,
  });
}

export function useCreateNetwork() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      blockchainId: string;
      name: string;
      networkType: string;
      rpcUrl: string;
      nativeCurrency: string;
      chainIdNumeric?: number;
      blockExplorerUrl?: string;
      blockExplorerApiUrl?: string;
      blockExplorerApiKey?: string;
      faucetUrl?: string;
      isCustom?: boolean;
    }) =>
      tauri.createNetwork(
        params.blockchainId,
        params.name,
        params.networkType,
        params.rpcUrl,
        params.nativeCurrency,
        params.chainIdNumeric,
        params.blockExplorerUrl,
        params.blockExplorerApiUrl,
        params.blockExplorerApiKey,
        params.faucetUrl,
        params.isCustom
      ),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.networks(variables.blockchainId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.allNetworks });
    },
  });
}

export function useUpdateNetwork() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      networkId: string;
      blockchainId?: string;
      name?: string;
      rpcUrl?: string;
      chainIdNumeric?: number;
      blockExplorerUrl?: string;
      blockExplorerApiUrl?: string;
      blockExplorerApiKey?: string;
      faucetUrl?: string;
    }) =>
      tauri.updateNetwork(
        params.networkId,
        params.name,
        params.rpcUrl,
        params.chainIdNumeric,
        params.blockExplorerUrl,
        params.blockExplorerApiUrl,
        params.blockExplorerApiKey,
        params.faucetUrl
      ),
    onSuccess: (data, variables) => {
      queryClient.setQueryData(queryKeys.network(variables.networkId), data);
      if (variables.blockchainId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.networks(variables.blockchainId) });
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.allNetworks });
    },
  });
}

export function useDeleteNetwork() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { networkId: string; blockchainId?: string }) =>
      tauri.deleteNetwork(params.networkId),
    onSuccess: (_, variables) => {
      queryClient.removeQueries({ queryKey: queryKeys.network(variables.networkId) });
      if (variables.blockchainId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.networks(variables.blockchainId) });
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.allNetworks });
    },
  });
}
