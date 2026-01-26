'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Send, Loader2, Zap, CheckCircle, XCircle, AlertCircle, Sparkles } from 'lucide-react';
import Image from 'next/image';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Modal, Button } from '@/components/ui';
import { useAIStore, useActionTrackingStore, useChainStore, useWorkspaceStore, useWalletStore } from '@/stores';
import { aiService } from '@/lib/ai';
import { initializeActionRegistry, executeAIAction, actionRegistry } from '@/lib/ai/actions';
import type { AIContext } from '@/types';
import type { ActionResult } from '@/lib/ai/actions/types';

interface CocoChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  context?: AIContext;
}

// Action execution state
interface PendingAction {
  action: string;
  params: Record<string, unknown>;
}

// Parse action blocks from AI response
function parseActionFromResponse(content: string): PendingAction | null {
  // Look for ```action blocks
  const actionMatch = content.match(/```action\s*\n([\s\S]*?)\n```/);
  if (actionMatch) {
    try {
      const parsed = JSON.parse(actionMatch[1]);
      if (parsed.action && typeof parsed.action === 'string') {
        return {
          action: parsed.action,
          params: parsed.params || {},
        };
      }
    } catch {
      // Not valid JSON
    }
  }

  // Also check for ```json blocks with action field
  const jsonMatch = content.match(/```json\s*\n([\s\S]*?)\n```/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[1]);
      if (parsed.action && typeof parsed.action === 'string') {
        return {
          action: parsed.action,
          params: parsed.params || {},
        };
      }
    } catch {
      // Not valid JSON or not an action
    }
  }

  return null;
}

// Remove action block from response for display
function removeActionBlock(content: string): string {
  return content
    .replace(/```action\s*\n[\s\S]*?\n```/g, '')
    .replace(/```json\s*\n\{[\s\S]*?"action"[\s\S]*?\}\n```/g, '')
    .trim();
}

export function CocoChatModal({ isOpen, onClose, context }: CocoChatModalProps) {
  const {
    settings,
    chatHistory,
    currentHistoryIndex,
    isProcessing,
    addMessage,
    navigateHistory,
    setProcessing,
  } = useAIStore();

  const { getActionSummary, getActionsForContext } = useActionTrackingStore();

  // Store access for action context
  const chainStore = useChainStore();
  const workspaceStore = useWorkspaceStore();
  const walletStore = useWalletStore();

  const [input, setInput] = useState('');
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [actionResult, setActionResult] = useState<ActionResult | null>(null);
  const [isExecutingAction, setIsExecutingAction] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const answerRef = useRef<HTMLDivElement>(null);

  // Initialize action registry on mount
  useEffect(() => {
    if (actionRegistry.getAll().length === 0) {
      initializeActionRegistry();
    }
  }, []);

  // Build context with recent actions and enable AI actions
  const enrichedContext = useMemo((): AIContext => {
    const actions = context?.chainId || context?.ecosystem
      ? getActionsForContext({
          chainId: context.chainId,
        })
      : getActionsForContext({});

    const actionSummary = actions.length > 0
      ? actions.slice(0, 15).map((a) => {
          const time = new Date(a.timestamp).toLocaleTimeString();
          const status = a.result?.success ? '✓' : a.result?.success === false ? '✗' : '';
          return `[${time}] ${status} ${a.summary}`;
        }).join('\n')
      : undefined;

    return {
      ...context,
      recentActions: actionSummary,
      enableActions: true, // Enable AI actions
    };
  }, [context, getActionsForContext]);

  // Auto-focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Get current answer to display
  const currentAnswer = chatHistory[currentHistoryIndex];
  const assistantMessages = chatHistory.filter((m) => m.role === 'assistant');
  const currentAssistantIndex = currentAnswer
    ? assistantMessages.findIndex((m) => m.id === currentAnswer.id)
    : -1;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isProcessing || !settings.enabled) return;

    const userMessage = input.trim();
    setInput('');

    // Clear any previous action state
    setPendingAction(null);
    setActionResult(null);

    // Add user message
    addMessage({ role: 'user', content: userMessage });

    // Get AI response
    setProcessing(true);
    try {
      const currentConfig = settings.providers[settings.provider];
      aiService.setAdapter(settings.provider, currentConfig);
      const response = await aiService.chat(userMessage, enrichedContext);

      // Check if response contains an action
      const parsedAction = parseActionFromResponse(response);

      if (parsedAction) {
        // Store the pending action for user confirmation
        setPendingAction(parsedAction);
        // Show response without the action block
        const cleanResponse = removeActionBlock(response);
        if (cleanResponse) {
          addMessage({ role: 'assistant', content: cleanResponse });
        }
      } else {
        addMessage({ role: 'assistant', content: response });
      }
    } catch (error) {
      addMessage({
        role: 'assistant',
        content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    } finally {
      setProcessing(false);
    }
  };

  // Execute a pending action
  const handleExecuteAction = useCallback(async () => {
    if (!pendingAction) return;

    setIsExecutingAction(true);
    try {
      const result = await executeAIAction(pendingAction.action, pendingAction.params, {
        currentChainId: context?.chainId || chainStore.selectedChain?.id || undefined,
        currentWorkspaceId: context?.workspaceId || workspaceStore.currentWorkspace?.id || undefined,
        currentWalletId: walletStore.selectedWallet?.id || undefined,
      });

      setActionResult(result);

      // Add result message
      if (result.success) {
        addMessage({
          role: 'assistant',
          content: `✅ **Action completed:** ${result.message}${result.data ? `\n\n\`\`\`json\n${JSON.stringify(result.data, null, 2)}\n\`\`\`` : ''}`,
        });
      } else {
        addMessage({
          role: 'assistant',
          content: `❌ **Action failed:** ${result.message}${result.error ? `\n\n\`${result.error}\`` : ''}`,
        });
      }
    } catch (error) {
      setActionResult({
        success: false,
        message: `Failed to execute action: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    } finally {
      setIsExecutingAction(false);
      setPendingAction(null);
    }
  }, [pendingAction, context, chainStore.selectedChain?.id, workspaceStore.currentWorkspace?.id, walletStore.selectedWallet?.id, addMessage]);

  // Cancel a pending action
  const handleCancelAction = useCallback(() => {
    setPendingAction(null);
    addMessage({
      role: 'assistant',
      content: '_Action cancelled._',
    });
  }, [addMessage]);

  const scrollAnswer = (direction: 'up' | 'down') => {
    if (answerRef.current) {
      const scrollAmount = 100;
      answerRef.current.scrollBy({
        top: direction === 'up' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  if (!settings.enabled) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Chat with Coco" size="md">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Image
            src="/brand/coco-paw.png"
            alt="Coco"
            width={64}
            height={64}
            className="opacity-50 mb-4"
          />
          <p className="text-coco-text-secondary mb-4">
            AI features are currently disabled.
          </p>
          <p className="text-sm text-coco-text-tertiary">
            Enable AI in settings to chat with Coco.
          </p>
        </div>
      </Modal>
    );
  }

  // Get action definition for display
  const getActionInfo = (actionId: string) => {
    const action = actionRegistry.get(actionId);
    return action?.definition;
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Chat with Coco" size="md">
      <div className="flex flex-col gap-4">
        {/* Pending Action Confirmation */}
        {pendingAction && (
          <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-amber-500/20 rounded-lg">
                <Zap className="w-5 h-5 text-amber-400" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-amber-400 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Coco wants to execute an action
                </h4>
                <p className="text-xs text-coco-text-secondary mt-1">
                  {getActionInfo(pendingAction.action)?.description || pendingAction.action}
                </p>
                {Object.keys(pendingAction.params).length > 0 && (
                  <div className="mt-2 p-2 bg-coco-bg-primary rounded text-xs font-mono">
                    <span className="text-coco-text-tertiary">Parameters:</span>
                    <pre className="text-coco-text-secondary mt-1 overflow-x-auto">
                      {JSON.stringify(pendingAction.params, null, 2)}
                    </pre>
                  </div>
                )}
                <div className="flex gap-2 mt-3">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleExecuteAction}
                    disabled={isExecutingAction}
                  >
                    {isExecutingAction ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Executing...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <CheckCircle className="w-3 h-3" />
                        Execute
                      </span>
                    )}
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleCancelAction}
                    disabled={isExecutingAction}
                  >
                    <XCircle className="w-3 h-3 mr-1" />
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Input Area - At the top */}
        <form onSubmit={handleSubmit}>
          <div className="relative flex items-center">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Coco to do something..."
              className="w-full px-4 py-3 pr-12 text-sm bg-coco-bg-secondary border border-coco-border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-coco-accent placeholder:text-coco-text-tertiary"
              disabled={isProcessing || isExecutingAction}
            />
            <button
              type="submit"
              disabled={!input.trim() || isProcessing || isExecutingAction}
              className="absolute right-3 p-1.5 text-coco-text-tertiary hover:text-coco-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing || isExecutingAction ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
        </form>

        {/* Answer Card */}
        <div className="bg-coco-bg-secondary rounded-lg border border-coco-border-subtle overflow-hidden min-h-[200px] flex flex-col">
          {currentAnswer && currentAnswer.role === 'assistant' ? (
            <>
              {/* Answer Content */}
              <div
                ref={answerRef}
                className="flex-1 p-4 overflow-y-auto max-h-[300px]"
              >
                <div className="prose prose-sm prose-invert max-w-none text-coco-text-primary">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                      strong: ({ children }) => <strong className="font-semibold text-coco-text-primary">{children}</strong>,
                      code: ({ children, className }) => {
                        const isInline = !className;
                        return isInline ? (
                          <code className="px-1 py-0.5 bg-coco-bg-tertiary rounded text-coco-accent text-xs font-mono">{children}</code>
                        ) : (
                          <code className="block p-2 bg-coco-bg-tertiary rounded text-xs font-mono overflow-x-auto">{children}</code>
                        );
                      },
                      pre: ({ children }) => <pre className="bg-coco-bg-tertiary rounded p-3 overflow-x-auto my-2">{children}</pre>,
                      ul: ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>,
                      ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>,
                      li: ({ children }) => <li className="text-coco-text-secondary">{children}</li>,
                      a: ({ href, children }) => <a href={href} className="text-coco-accent hover:underline" target="_blank" rel="noopener noreferrer">{children}</a>,
                      h1: ({ children }) => <h1 className="text-lg font-bold mb-2 text-coco-text-primary">{children}</h1>,
                      h2: ({ children }) => <h2 className="text-base font-semibold mb-2 text-coco-text-primary">{children}</h2>,
                      h3: ({ children }) => <h3 className="text-sm font-semibold mb-1 text-coco-text-primary">{children}</h3>,
                    }}
                  >
                    {currentAnswer.content}
                  </ReactMarkdown>
                </div>
              </div>

              {/* Navigation Footer */}
              <div className="flex items-center justify-between px-4 py-2 bg-coco-bg-tertiary border-t border-coco-border-subtle">
                {/* Prev/Next */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => navigateHistory('prev')}
                    disabled={assistantMessages.length <= 1}
                    className="flex items-center gap-1 text-xs text-coco-text-tertiary hover:text-coco-text-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Prev
                  </button>
                  <button
                    onClick={() => navigateHistory('next')}
                    disabled={assistantMessages.length <= 1}
                    className="flex items-center gap-1 text-xs text-coco-text-tertiary hover:text-coco-text-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Counter */}
                {assistantMessages.length > 0 && (
                  <span className="text-xs text-coco-text-tertiary">
                    {currentAssistantIndex + 1} / {assistantMessages.length}
                  </span>
                )}

                {/* Scroll Up/Down */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => scrollAnswer('up')}
                    className="p-1 text-coco-text-tertiary hover:text-coco-text-secondary transition-colors"
                    title="Scroll up"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => scrollAnswer('down')}
                    className="p-1 text-coco-text-tertiary hover:text-coco-text-secondary transition-colors"
                    title="Scroll down"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <Image
                src="/brand/coco-paw.png"
                alt="Coco"
                width={48}
                height={48}
                className="opacity-30 mb-4"
              />
              <p className="text-coco-text-tertiary text-sm">
                {isProcessing ? 'Coco is thinking...' : 'Ask me anything!'}
              </p>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
