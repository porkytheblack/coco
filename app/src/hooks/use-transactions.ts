import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/react-query';
import * as tauri from '@/lib/tauri';
import type { TransactionRun } from '@/types';

// ============================================================================
// Transaction query hooks
// ============================================================================

export function useTransactions(workspaceId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.transactions(workspaceId!),
    queryFn: () => tauri.listTransactions(workspaceId!),
    enabled: !!workspaceId,
  });
}

export function useTransactionRuns(transactionId: string | undefined, polling = false) {
  return useQuery({
    queryKey: queryKeys.transactionRuns(transactionId!),
    queryFn: () => tauri.listTransactionRuns(transactionId!),
    enabled: !!transactionId,
    refetchInterval: polling ? 2000 : false,
  });
}

// ============================================================================
// Transaction mutation hooks
// ============================================================================

export function useCreateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      workspaceId: string;
      name: string;
      contractId?: string;
      functionName?: string;
    }) =>
      tauri.createTransaction(
        params.workspaceId,
        params.name,
        params.contractId,
        params.functionName
      ),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions(variables.workspaceId) });
    },
  });
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      transactionId: string;
      workspaceId?: string;
      name?: string;
      contractId?: string;
      functionName?: string;
      args?: string;
    }) =>
      tauri.updateTransaction(params.transactionId, {
        name: params.name,
        contractId: params.contractId,
        functionName: params.functionName,
        args: params.args,
      }),
    onSuccess: (data, variables) => {
      queryClient.setQueryData(queryKeys.transaction(variables.transactionId), data);
      if (variables.workspaceId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.transactions(variables.workspaceId) });
      }
    },
  });
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { transactionId: string; workspaceId?: string }) =>
      tauri.deleteTransaction(params.transactionId),
    onSuccess: (_, variables) => {
      queryClient.removeQueries({ queryKey: queryKeys.transaction(variables.transactionId) });
      queryClient.removeQueries({ queryKey: queryKeys.transactionRuns(variables.transactionId) });
      if (variables.workspaceId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.transactions(variables.workspaceId) });
      }
    },
  });
}

export function useExecuteTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      transactionId: string;
      payload: Record<string, string>;
      walletId: string;
    }) => tauri.executeTransaction(params.transactionId, params.payload, params.walletId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.transactionRuns(variables.transactionId) });
    },
  });
}

export function useSaveTransactionRun() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (run: TransactionRun) => tauri.saveTransactionRun(run),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.transactionRuns(data.transactionId) });
    },
  });
}
