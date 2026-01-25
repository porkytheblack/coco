import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/react-query';
import * as tauri from '@/lib/tauri';

// ============================================================================
// Environment variable hooks
// ============================================================================

export function useEnvVars(workspaceId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.envVars(workspaceId!),
    queryFn: () => tauri.listEnvVars(workspaceId!),
    enabled: !!workspaceId,
  });
}

export function useEnvVar(envVarId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.envVar(envVarId!),
    queryFn: () => tauri.getEnvVar(envVarId!),
    enabled: !!envVarId,
  });
}

export function useCreateEnvVar() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      workspaceId: string;
      key: string;
      value: string;
      description?: string;
    }) => tauri.createEnvVar(params.workspaceId, params.key, params.value, params.description),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.envVars(variables.workspaceId) });
    },
  });
}

export function useUpdateEnvVar() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      envVarId: string;
      workspaceId?: string;
      key?: string;
      value?: string;
      description?: string;
    }) => tauri.updateEnvVar(params.envVarId, params.key, params.value, params.description),
    onSuccess: (data, variables) => {
      queryClient.setQueryData(queryKeys.envVar(variables.envVarId), data);
      if (variables.workspaceId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.envVars(variables.workspaceId) });
      }
    },
  });
}

export function useDeleteEnvVar() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { envVarId: string; workspaceId?: string }) =>
      tauri.deleteEnvVar(params.envVarId),
    onSuccess: (_, variables) => {
      queryClient.removeQueries({ queryKey: queryKeys.envVar(variables.envVarId) });
      if (variables.workspaceId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.envVars(variables.workspaceId) });
      }
    },
  });
}
