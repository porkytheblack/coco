import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/react-query';
import * as tauri from '@/lib/tauri';

// ============================================================================
// Contract documentation hooks
// ============================================================================

export function useContractDocs(contractId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.contractDocs(contractId!),
    queryFn: () => tauri.getContractDocs(contractId!),
    enabled: !!contractId,
  });
}

export function useFunctionDoc(contractId: string | undefined, functionName: string | undefined) {
  return useQuery({
    queryKey: queryKeys.functionDoc(contractId!, functionName!),
    queryFn: () => tauri.getFunctionDoc(contractId!, functionName!),
    enabled: !!contractId && !!functionName,
  });
}

export function useUpsertContractDoc() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      contractId: string;
      functionName: string;
      description?: string;
      notes?: string;
    }) =>
      tauri.upsertContractDoc(
        params.contractId,
        params.functionName,
        params.description,
        params.notes
      ),
    onSuccess: (data, variables) => {
      queryClient.setQueryData(
        queryKeys.functionDoc(variables.contractId, variables.functionName),
        data
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.contractDocs(variables.contractId) });
    },
  });
}

export function useDeleteContractDoc() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { docId: string; contractId?: string }) =>
      tauri.deleteContractDoc(params.docId),
    onSuccess: (_, variables) => {
      if (variables.contractId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.contractDocs(variables.contractId) });
      }
    },
  });
}

export function useDeleteFunctionDoc() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { contractId: string; functionName: string }) =>
      tauri.deleteFunctionDoc(params.contractId, params.functionName),
    onSuccess: (_, variables) => {
      queryClient.removeQueries({
        queryKey: queryKeys.functionDoc(variables.contractId, variables.functionName),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.contractDocs(variables.contractId) });
    },
  });
}
