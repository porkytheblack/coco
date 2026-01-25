import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/react-query';
import * as tauri from '@/lib/tauri';
import type { AISettings } from '@/types';

// ============================================================================
// General preference hooks
// ============================================================================

export function usePreferences() {
  return useQuery({
    queryKey: queryKeys.preferences,
    queryFn: () => tauri.listPreferences(),
  });
}

export function usePreference<T = unknown>(key: string) {
  return useQuery({
    queryKey: queryKeys.preference(key),
    queryFn: () => tauri.getPreference(key) as Promise<T | null>,
  });
}

export function useSetPreference() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { key: string; value: unknown }) =>
      tauri.setPreference(params.key, params.value),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.preference(variables.key) });
      queryClient.invalidateQueries({ queryKey: queryKeys.preferences });
    },
  });
}

export function useDeletePreference() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (key: string) => tauri.deletePreference(key),
    onSuccess: (_, key) => {
      queryClient.removeQueries({ queryKey: queryKeys.preference(key) });
      queryClient.invalidateQueries({ queryKey: queryKeys.preferences });
    },
  });
}

// ============================================================================
// Convenience preference hooks
// ============================================================================

export function useTheme() {
  return useQuery({
    queryKey: queryKeys.theme,
    queryFn: () => tauri.getTheme(),
  });
}

export function useSetTheme() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (theme: string) => tauri.setTheme(theme),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.theme });
    },
  });
}

export function useAiSettings() {
  return useQuery({
    queryKey: queryKeys.aiSettings,
    queryFn: () => tauri.getAiSettings() as Promise<AISettings | null>,
  });
}

export function useSetAiSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (settings: AISettings) => tauri.setAiSettings(settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.aiSettings });
    },
  });
}

export function useActiveWorkspace() {
  return useQuery({
    queryKey: queryKeys.activeWorkspace,
    queryFn: () => tauri.getActiveWorkspace(),
  });
}

export function useSetActiveWorkspace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (workspaceId?: string) => tauri.setActiveWorkspace(workspaceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.activeWorkspace });
    },
  });
}

export function useActiveNetwork() {
  return useQuery({
    queryKey: queryKeys.activeNetwork,
    queryFn: () => tauri.getActiveNetwork(),
  });
}

export function useSetActiveNetwork() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (networkId?: string) => tauri.setActiveNetwork(networkId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.activeNetwork });
    },
  });
}
