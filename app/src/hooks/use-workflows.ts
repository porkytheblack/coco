import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/react-query';
import * as tauri from '@/lib/tauri';
import type { Workflow, WorkflowDefinition, WorkflowRun } from '@/lib/workflow/types';

// ============================================================================
// Workflow hooks
// ============================================================================

export function useWorkflows(workspaceId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.workflows(workspaceId!),
    queryFn: () => tauri.listWorkflows(workspaceId!),
    enabled: !!workspaceId,
  });
}

export function useWorkflow(workflowId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.workflow(workflowId!),
    queryFn: () => tauri.getWorkflow(workflowId!),
    enabled: !!workflowId,
  });
}

export function useCreateWorkflow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      workspaceId: string;
      name: string;
      description?: string;
    }) =>
      tauri.createWorkflow(
        params.workspaceId,
        params.name,
        params.description
      ),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workflows(variables.workspaceId) });
    },
  });
}

export function useUpdateWorkflow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      workflowId: string;
      workspaceId?: string;
      name?: string;
      description?: string;
      definition?: WorkflowDefinition;
    }) =>
      tauri.updateWorkflow(
        params.workflowId,
        params.name,
        params.description,
        params.definition ? JSON.stringify(params.definition) : undefined
      ),
    onSuccess: (data, variables) => {
      queryClient.setQueryData(queryKeys.workflow(variables.workflowId), data);
      if (variables.workspaceId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.workflows(variables.workspaceId) });
      }
    },
  });
}

export function useDeleteWorkflow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { workflowId: string; workspaceId?: string }) =>
      tauri.deleteWorkflow(params.workflowId),
    onSuccess: (_, variables) => {
      queryClient.removeQueries({ queryKey: queryKeys.workflow(variables.workflowId) });
      if (variables.workspaceId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.workflows(variables.workspaceId) });
      }
    },
  });
}

// ============================================================================
// Workflow run hooks
// ============================================================================

export function useWorkflowRuns(workflowId: string | undefined, polling = false) {
  return useQuery({
    queryKey: queryKeys.workflowRuns(workflowId!),
    queryFn: () => tauri.listWorkflowRuns(workflowId!),
    enabled: !!workflowId,
    refetchInterval: polling ? 1000 : false,
  });
}

export function useWorkflowRun(runId: string | undefined, polling = false) {
  return useQuery({
    queryKey: queryKeys.workflowRun(runId!),
    queryFn: () => tauri.getWorkflowRun(runId!),
    enabled: !!runId,
    refetchInterval: polling ? 1000 : false,
  });
}

export function useRunWorkflow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      workflowId: string;
      variables?: Record<string, unknown>;
    }) =>
      tauri.runWorkflow(params.workflowId, params.variables),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workflowRuns(variables.workflowId) });
    },
  });
}
