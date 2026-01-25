import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/react-query';
import * as tauri from '@/lib/tauri';
import type { CreateWorkspaceRequest } from '@/types';

// ============================================================================
// Workspace query hooks
// ============================================================================

export function useWorkspaces(chainId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.workspaces(chainId!),
    queryFn: () => tauri.listWorkspaces(chainId!),
    enabled: !!chainId,
  });
}

export function useWorkspace(workspaceId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.workspace(workspaceId!),
    queryFn: () => tauri.getWorkspace(workspaceId!),
    enabled: !!workspaceId,
  });
}

// ============================================================================
// Workspace mutation hooks
// ============================================================================

export function useCreateWorkspace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: CreateWorkspaceRequest) => tauri.createWorkspace(request),
    onSuccess: (data, variables) => {
      // Invalidate the workspaces list for this chain
      queryClient.invalidateQueries({ queryKey: queryKeys.workspaces(variables.chainId) });
      // Add the new workspace to cache
      queryClient.setQueryData(queryKeys.workspace(data.id), data);
    },
  });
}

export function useDeleteWorkspace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { workspaceId: string; chainId?: string }) =>
      tauri.deleteWorkspace(params.workspaceId),
    onSuccess: (_, variables) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: queryKeys.workspace(variables.workspaceId) });
      // Invalidate related data
      queryClient.invalidateQueries({ queryKey: queryKeys.contracts(variables.workspaceId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions(variables.workspaceId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.scripts(variables.workspaceId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.envVars(variables.workspaceId) });
      // Invalidate workspaces list if chainId provided
      if (variables.chainId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.workspaces(variables.chainId) });
      }
    },
  });
}
