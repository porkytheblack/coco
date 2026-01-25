import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/react-query';
import * as tauri from '@/lib/tauri';

// ============================================================================
// Conversation hooks
// ============================================================================

export function useConversations(workspaceId?: string) {
  return useQuery({
    queryKey: queryKeys.conversations(workspaceId),
    queryFn: () => tauri.listConversations(workspaceId),
  });
}

export function useConversation(conversationId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.conversation(conversationId!),
    queryFn: () => tauri.getConversation(conversationId!),
    enabled: !!conversationId,
  });
}

export function useCreateConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { workspaceId?: string; title?: string }) =>
      tauri.createConversation(params.workspaceId, params.title),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.conversations(variables.workspaceId),
      });
    },
  });
}

export function useUpdateConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { conversationId: string; workspaceId?: string; title?: string }) =>
      tauri.updateConversation(params.conversationId, params.title),
    onSuccess: (data, variables) => {
      queryClient.setQueryData(queryKeys.conversation(variables.conversationId), data);
      queryClient.invalidateQueries({
        queryKey: queryKeys.conversations(variables.workspaceId),
      });
    },
  });
}

export function useDeleteConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { conversationId: string; workspaceId?: string }) =>
      tauri.deleteConversation(params.conversationId),
    onSuccess: (_, variables) => {
      queryClient.removeQueries({ queryKey: queryKeys.conversation(variables.conversationId) });
      queryClient.invalidateQueries({
        queryKey: queryKeys.conversations(variables.workspaceId),
      });
    },
  });
}

// ============================================================================
// Message hooks
// ============================================================================

export function useMessages(conversationId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.messages(conversationId!),
    queryFn: () => tauri.listMessages(conversationId!),
    enabled: !!conversationId,
  });
}

export function useAddMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { conversationId: string; role: string; content: string }) =>
      tauri.addMessage(params.conversationId, params.role, params.content),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.messages(variables.conversationId) });
    },
  });
}

export function useDeleteMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { messageId: string; conversationId?: string }) =>
      tauri.deleteMessage(params.messageId),
    onSuccess: (_, variables) => {
      if (variables.conversationId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.messages(variables.conversationId),
        });
      }
    },
  });
}

export function useClearConversationMessages() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (conversationId: string) => tauri.clearConversationMessages(conversationId),
    onSuccess: (_, conversationId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.messages(conversationId) });
    },
  });
}
