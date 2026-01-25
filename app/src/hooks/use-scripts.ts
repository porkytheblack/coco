import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/react-query';
import * as tauri from '@/lib/tauri';
import type { ScriptFlagType, ScriptRunner } from '@/types';

// ============================================================================
// Script hooks
// ============================================================================

export function useScripts(workspaceId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.scripts(workspaceId!),
    queryFn: () => tauri.listScripts(workspaceId!),
    enabled: !!workspaceId,
  });
}

export function useScript(scriptId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.script(scriptId!),
    queryFn: () => tauri.getScript(scriptId!),
    enabled: !!scriptId,
  });
}

export function useCreateScript() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      workspaceId: string;
      name: string;
      description?: string;
      runner: ScriptRunner;
      filePath: string;
      command?: string;
      workingDirectory?: string;
      category?: string;
    }) =>
      tauri.createScript(params.workspaceId, {
        name: params.name,
        description: params.description,
        runner: params.runner,
        filePath: params.filePath,
        command: params.command,
        workingDirectory: params.workingDirectory,
        category: params.category,
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.scripts(variables.workspaceId) });
    },
  });
}

export function useUpdateScript() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      scriptId: string;
      workspaceId?: string;
      name?: string;
      description?: string;
      runner?: ScriptRunner;
      filePath?: string;
      command?: string;
      workingDirectory?: string;
      category?: string;
    }) =>
      tauri.updateScript(params.scriptId, {
        name: params.name,
        description: params.description,
        runner: params.runner,
        filePath: params.filePath,
        command: params.command,
        workingDirectory: params.workingDirectory,
        category: params.category,
      }),
    onSuccess: (data, variables) => {
      queryClient.setQueryData(queryKeys.script(variables.scriptId), data);
      if (variables.workspaceId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.scripts(variables.workspaceId) });
      }
    },
  });
}

export function useDeleteScript() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { scriptId: string; workspaceId?: string }) =>
      tauri.deleteScript(params.scriptId),
    onSuccess: (_, variables) => {
      queryClient.removeQueries({ queryKey: queryKeys.script(variables.scriptId) });
      if (variables.workspaceId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.scripts(variables.workspaceId) });
      }
    },
  });
}

// ============================================================================
// Script flag hooks
// ============================================================================

export function useScriptFlags(scriptId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.scriptFlags(scriptId!),
    queryFn: () => tauri.listScriptFlags(scriptId!),
    enabled: !!scriptId,
  });
}

export function useCreateScriptFlag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      scriptId: string;
      flagName: string;
      flagType: ScriptFlagType;
      defaultValue?: string;
      required: boolean;
      description?: string;
    }) =>
      tauri.createScriptFlag(params.scriptId, {
        flagName: params.flagName,
        flagType: params.flagType,
        defaultValue: params.defaultValue,
        required: params.required,
        description: params.description,
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.scriptFlags(variables.scriptId) });
    },
  });
}

export function useUpdateScriptFlag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      flagId: string;
      scriptId?: string;
      flagName?: string;
      flagType?: string;
      defaultValue?: string;
      required?: boolean;
      description?: string;
    }) =>
      tauri.updateScriptFlag(
        params.flagId,
        params.flagName,
        params.flagType,
        params.defaultValue,
        params.required,
        params.description
      ),
    onSuccess: (_, variables) => {
      if (variables.scriptId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.scriptFlags(variables.scriptId) });
      }
    },
  });
}

export function useDeleteScriptFlag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { flagId: string; scriptId?: string }) =>
      tauri.deleteScriptFlag(params.flagId),
    onSuccess: (_, variables) => {
      if (variables.scriptId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.scriptFlags(variables.scriptId) });
      }
    },
  });
}

// ============================================================================
// Script execution hooks
// ============================================================================

export function useScriptRuns(scriptId: string | undefined, polling = false) {
  return useQuery({
    queryKey: queryKeys.scriptRuns(scriptId!),
    queryFn: () => tauri.listScriptRuns(scriptId!),
    enabled: !!scriptId,
    refetchInterval: polling ? 1000 : false, // Poll every second when enabled
  });
}

export function useScriptRun(runId: string | undefined, polling = false) {
  return useQuery({
    queryKey: queryKeys.scriptRun(runId!),
    queryFn: () => tauri.getScriptRun(runId!),
    enabled: !!runId,
    refetchInterval: polling ? 1000 : false, // Poll every second when enabled
  });
}

export function useScriptRunLogs(runId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: queryKeys.scriptRunLogs(runId!),
    queryFn: () => tauri.getScriptRunLogs(runId!),
    enabled: !!runId && enabled,
    refetchInterval: 1000, // Poll every second for running scripts
  });
}

export function useRunScript() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      scriptId: string;
      flags?: Record<string, string>;
      envVarKeys?: string[];
    }) =>
      tauri.runScript(params.scriptId, {
        flags: params.flags,
        envVarKeys: params.envVarKeys,
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.scriptRuns(variables.scriptId) });
    },
  });
}

export function useStartScriptAsync() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      scriptId: string;
      flags?: Record<string, string>;
      envVarKeys?: string[];
    }) =>
      tauri.startScriptAsync(params.scriptId, {
        flags: params.flags,
        envVarKeys: params.envVarKeys,
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.scriptRuns(variables.scriptId) });
    },
  });
}

export function useCancelScriptRun() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { runId: string; scriptId?: string }) =>
      tauri.cancelScriptRun(params.runId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.scriptRun(variables.runId) });
      if (variables.scriptId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.scriptRuns(variables.scriptId) });
      }
    },
  });
}
