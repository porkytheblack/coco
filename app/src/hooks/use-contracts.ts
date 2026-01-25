import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/react-query';
import * as tauri from '@/lib/tauri';

// ============================================================================
// Contract query hooks
// ============================================================================

export function useContracts(workspaceId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.contracts(workspaceId!),
    queryFn: () => tauri.listContracts(workspaceId!),
    enabled: !!workspaceId,
  });
}

export function useReusableContracts(
  blockchain: string | undefined,
  excludeChainId: string | undefined
) {
  return useQuery({
    queryKey: ['contracts', 'reusable', blockchain, excludeChainId] as const,
    queryFn: () => tauri.listReusableContracts(blockchain!, excludeChainId!),
    enabled: !!blockchain && !!excludeChainId,
  });
}

// ============================================================================
// Contract mutation hooks
// ============================================================================

export function useAddContract() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      workspaceId: string;
      name: string;
      address?: string;
      interfaceType?: string;
      abi?: string;
      idl?: string;
      moveDefinition?: string;
    }) =>
      tauri.addContract(
        params.workspaceId,
        params.name,
        params.address,
        params.interfaceType,
        params.abi,
        params.idl,
        params.moveDefinition
      ),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.contracts(variables.workspaceId) });
      queryClient.setQueryData(queryKeys.contract(data.id), data);
    },
  });
}

export function useUpdateContract() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      contractId: string;
      workspaceId?: string;
      name: string;
      address?: string;
      interfaceType?: string;
      abi?: string;
      idl?: string;
      moveDefinition?: string;
    }) =>
      tauri.updateContract(
        params.contractId,
        params.name,
        params.address,
        params.interfaceType,
        params.abi,
        params.idl,
        params.moveDefinition
      ),
    onSuccess: (data, variables) => {
      queryClient.setQueryData(queryKeys.contract(variables.contractId), data);
      if (variables.workspaceId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.contracts(variables.workspaceId) });
      }
    },
  });
}

export function useDeleteContract() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { contractId: string; workspaceId?: string }) =>
      tauri.deleteContract(params.contractId),
    onSuccess: (_, variables) => {
      queryClient.removeQueries({ queryKey: queryKeys.contract(variables.contractId) });
      // Also invalidate contract docs
      queryClient.invalidateQueries({ queryKey: queryKeys.contractDocs(variables.contractId) });
      if (variables.workspaceId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.contracts(variables.workspaceId) });
      }
    },
  });
}
