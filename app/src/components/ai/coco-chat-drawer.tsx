'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { X, Send, Loader2, Zap, CheckCircle, XCircle, Sparkles, MessageSquare, Trash2, Edit2, ChevronDown, ChevronRight } from 'lucide-react';
import Image from 'next/image';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { clsx } from 'clsx';
import { Button, IconButton, Input } from '@/components/ui';
import { useAIStore, useActionTrackingStore, useChainStore, useWorkspaceStore, useWalletStore } from '@/stores';
import { aiService } from '@/lib/ai';
import { initializeActionRegistry, executeAIAction, actionRegistry } from '@/lib/ai/actions';
import type { AIContext, AIMessage } from '@/types';
import type { ActionResult } from '@/lib/ai/actions/types';

interface CocoChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  context?: AIContext;
}

// Action execution state
interface PendingAction {
  action: string;
  params: Record<string, unknown>;
  inferredFrom?: string; // Description of where params were inferred from
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

// Message bubble component
function MessageBubble({ message, isLatest }: { message: AIMessage; isLatest: boolean }) {
  const isUser = message.role === 'user';

  return (
    <div className={clsx('flex gap-3 animate-fade-in', isUser ? 'flex-row-reverse' : 'flex-row')}>
      {/* Avatar */}
      <div className={clsx(
        'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
        isUser ? 'bg-coco-accent/20' : 'bg-coco-bg-tertiary'
      )}>
        {isUser ? (
          <span className="text-xs font-medium text-coco-accent">You</span>
        ) : (
          <Image src="/brand/coco-paw.png" alt="Coco" width={20} height={20} />
        )}
      </div>

      {/* Message content */}
      <div className={clsx(
        'flex-1 max-w-[85%] rounded-xl px-4 py-3',
        isUser
          ? 'bg-coco-accent/10 border border-coco-accent/20'
          : 'bg-coco-bg-secondary border border-coco-border-subtle'
      )}>
        {isUser ? (
          <p className="text-sm text-coco-text-primary">{message.content}</p>
        ) : (
          <div className="prose prose-sm prose-invert max-w-none text-coco-text-primary">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                p: ({ children }) => <p className="mb-2 last:mb-0 text-sm">{children}</p>,
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
                li: ({ children }) => <li className="text-coco-text-secondary text-sm">{children}</li>,
                a: ({ href, children }) => <a href={href} className="text-coco-accent hover:underline" target="_blank" rel="noopener noreferrer">{children}</a>,
                h1: ({ children }) => <h1 className="text-base font-bold mb-2 text-coco-text-primary">{children}</h1>,
                h2: ({ children }) => <h2 className="text-sm font-semibold mb-2 text-coco-text-primary">{children}</h2>,
                h3: ({ children }) => <h3 className="text-sm font-semibold mb-1 text-coco-text-primary">{children}</h3>,
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        )}
        <span className="text-[10px] text-coco-text-tertiary mt-1 block">
          {new Date(message.timestamp).toLocaleTimeString()}
        </span>
      </div>
    </div>
  );
}

// Action parameter editor
interface ActionParamEditorProps {
  params: Record<string, unknown>;
  onChange: (params: Record<string, unknown>) => void;
  actionDef?: { parameters?: Array<{ name: string; type: string; required?: boolean; description?: string }> };
}

function ActionParamEditor({ params, onChange, actionDef }: ActionParamEditorProps) {
  const [expanded, setExpanded] = useState(true);

  const handleParamChange = (key: string, value: string) => {
    onChange({ ...params, [key]: value });
  };

  // Use action definition parameters if available and not empty, otherwise derive from params object
  const paramList = (actionDef?.parameters && actionDef.parameters.length > 0)
    ? actionDef.parameters
    : Object.keys(params).map(key => ({
        name: key,
        type: typeof params[key] === 'string' ? 'string' : 'unknown',
        required: false,
        description: undefined as string | undefined,
      }));

  return (
    <div className="mt-3 border border-coco-border-subtle rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3 py-2 bg-coco-bg-tertiary hover:bg-coco-bg-secondary transition-colors"
      >
        <span className="text-xs font-medium text-coco-text-secondary flex items-center gap-2">
          <Edit2 className="w-3 h-3" />
          Parameters ({paramList.length})
        </span>
        {expanded ? <ChevronDown className="w-4 h-4 text-coco-text-tertiary" /> : <ChevronRight className="w-4 h-4 text-coco-text-tertiary" />}
      </button>

      {expanded && (
        <div className="p-3 space-y-3 bg-coco-bg-primary">
          {paramList.length > 0 ? (
            paramList.map((param) => (
              <div key={param.name}>
                <label className="block text-xs font-medium text-coco-text-secondary mb-1">
                  {param.name}
                  {param.required && <span className="text-coco-error ml-1">*</span>}
                </label>
                <input
                  type="text"
                  value={String(params[param.name] ?? '')}
                  onChange={(e) => handleParamChange(param.name, e.target.value)}
                  placeholder={param.description || `Enter ${param.name}`}
                  className="w-full px-3 py-2 text-sm bg-coco-bg-secondary border border-coco-border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-coco-accent placeholder:text-coco-text-tertiary"
                />
                {param.description && (
                  <p className="text-[10px] text-coco-text-tertiary mt-1">{param.description}</p>
                )}
              </div>
            ))
          ) : (
            <p className="text-xs text-coco-text-tertiary text-center py-2">No parameters required</p>
          )}
        </div>
      )}
    </div>
  );
}

export function CocoChatDrawer({ isOpen, onClose, context }: CocoChatDrawerProps) {
  const {
    settings,
    chatHistory,
    isProcessing,
    addMessage,
    clearChat,
    setProcessing,
  } = useAIStore();

  const { getActionsForContext } = useActionTrackingStore();

  // Store access for action context
  const chainStore = useChainStore();
  const workspaceStore = useWorkspaceStore();
  const walletStore = useWalletStore();

  const [input, setInput] = useState('');
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [editableParams, setEditableParams] = useState<Record<string, unknown>>({});
  const [actionResult, setActionResult] = useState<ActionResult | null>(null);
  const [isExecutingAction, setIsExecutingAction] = useState(false);
  const [drawerWidth, setDrawerWidth] = useState(400);
  const [isResizing, setIsResizing] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize action registry on mount
  useEffect(() => {
    if (actionRegistry.getAll().length === 0) {
      initializeActionRegistry();
    }
  }, []);

  // Build context with recent actions and enable AI actions
  const enrichedContext = useMemo((): AIContext => {
    const actions = context?.chainId || context?.ecosystem
      ? getActionsForContext({ chainId: context.chainId })
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
      enableActions: true,
    };
  }, [context, getActionsForContext]);

  // Current context description for action parameter inference
  const currentContextDescription = useMemo(() => {
    const parts: string[] = [];
    if (chainStore.selectedChain) {
      parts.push(`Chain: ${chainStore.selectedChain.name}`);
    }
    if (workspaceStore.currentWorkspace) {
      parts.push(`Workspace: ${workspaceStore.currentWorkspace.name}`);
    }
    if (walletStore.selectedWallet) {
      parts.push(`Wallet: ${walletStore.selectedWallet.name}`);
    }
    return parts.join(', ') || 'No context selected';
  }, [chainStore.selectedChain, workspaceStore.currentWorkspace, walletStore.selectedWallet]);

  // Auto-focus input and scroll to bottom
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  // Update editable params when pending action changes
  useEffect(() => {
    if (pendingAction) {
      // Infer parameters from current context
      const inferredParams = { ...pendingAction.params };

      // Add context-based defaults if not already present
      if (!inferredParams.chainId && chainStore.selectedChain?.id) {
        inferredParams.chainId = chainStore.selectedChain.id;
      }
      if (!inferredParams.workspaceId && workspaceStore.currentWorkspace?.id) {
        inferredParams.workspaceId = workspaceStore.currentWorkspace.id;
      }
      if (!inferredParams.walletId && walletStore.selectedWallet?.id) {
        inferredParams.walletId = walletStore.selectedWallet.id;
      }

      setEditableParams(inferredParams);
    }
  }, [pendingAction, chainStore.selectedChain?.id, workspaceStore.currentWorkspace?.id, walletStore.selectedWallet?.id]);

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
        setPendingAction({
          ...parsedAction,
          inferredFrom: currentContextDescription,
        });
        // Show response without the action block
        const cleanResponse = removeActionBlock(response);
        if (cleanResponse) {
          addMessage({ role: 'assistant', content: cleanResponse });
        } else {
          addMessage({ role: 'assistant', content: "I'd like to perform the following action. Please review and confirm:" });
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

  // Execute a pending action with edited params
  const handleExecuteAction = useCallback(async () => {
    if (!pendingAction) return;

    setIsExecutingAction(true);
    try {
      const result = await executeAIAction(pendingAction.action, editableParams, {
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
  }, [pendingAction, editableParams, context, chainStore.selectedChain?.id, workspaceStore.currentWorkspace?.id, walletStore.selectedWallet?.id, addMessage]);

  // Cancel a pending action
  const handleCancelAction = useCallback(() => {
    setPendingAction(null);
    addMessage({
      role: 'assistant',
      content: '_Action cancelled. Let me know if you need anything else!_',
    });
  }, [addMessage]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, handleKeyDown]);

  // Drawer resize handlers
  const startResizing = useCallback(() => {
    setIsResizing(true);
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  const onResize = useCallback((e: MouseEvent) => {
    if (isResizing) {
      const newWidth = window.innerWidth - e.clientX;
      if (newWidth >= 320 && newWidth <= 700) {
        setDrawerWidth(newWidth);
      }
    }
  }, [isResizing]);

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', onResize);
      window.addEventListener('mouseup', stopResizing);
    } else {
      window.removeEventListener('mousemove', onResize);
      window.removeEventListener('mouseup', stopResizing);
    }
    return () => {
      window.removeEventListener('mousemove', onResize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [isResizing, onResize, stopResizing]);

  // Get action definition for display
  const getActionInfo = (actionId: string) => {
    const action = actionRegistry.get(actionId);
    return action?.definition;
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 dark:bg-black/50 z-40 animate-fade-in"
        onClick={onClose}
      />

      {/* Resize overlay */}
      {isResizing && (
        <div className="fixed inset-0 z-[100] cursor-ew-resize" />
      )}

      {/* Drawer - Right side */}
      <div
        style={{ width: drawerWidth }}
        className={clsx(
          'fixed right-0 top-0 bottom-0',
          'bg-coco-bg-elevated border-l border-coco-border-subtle',
          'shadow-drawer z-50 flex flex-col',
          'animate-slide-in',
          isResizing && 'select-none'
        )}
      >
        {/* Resize Handle */}
        <div
          onMouseDown={startResizing}
          className="absolute -left-1.5 top-0 w-3 h-full cursor-ew-resize hover:bg-coco-accent/20 z-[60] group transition-colors flex items-center justify-center"
        >
          <div className="w-1 h-16 rounded-full bg-coco-border-subtle group-hover:bg-coco-accent transition-colors opacity-30 group-hover:opacity-100" />
        </div>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-coco-border-subtle bg-coco-bg-elevated">
          <div className="flex items-center gap-3">
            <Image src="/brand/coco-paw.png" alt="Coco" width={28} height={28} />
            <div>
              <h2 className="text-sm font-semibold text-coco-text-primary">Chat with Coco</h2>
              <p className="text-[10px] text-coco-text-tertiary">{currentContextDescription}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <IconButton
              icon={<Trash2 className="w-4 h-4" />}
              label="Clear chat"
              onClick={clearChat}
              className="opacity-60 hover:opacity-100"
            />
            <IconButton
              icon={<X className="w-5 h-5" />}
              label="Close"
              onClick={onClose}
            />
          </div>
        </div>

        {/* Chat not enabled state */}
        {!settings.enabled ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <Image
              src="/brand/coco-paw.png"
              alt="Coco"
              width={64}
              height={64}
              className="opacity-30 mb-4"
            />
            <p className="text-coco-text-secondary mb-2">AI features are disabled</p>
            <p className="text-xs text-coco-text-tertiary">
              Enable AI in settings to chat with Coco
            </p>
          </div>
        ) : (
          <>
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {chatHistory.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <Image
                    src="/brand/coco-paw.png"
                    alt="Coco"
                    width={48}
                    height={48}
                    className="opacity-20 mb-4"
                  />
                  <p className="text-sm text-coco-text-tertiary mb-2">Start a conversation!</p>
                  <p className="text-xs text-coco-text-tertiary max-w-[250px]">
                    Ask me questions, request actions, or get help with your blockchain development.
                  </p>
                </div>
              ) : (
                <>
                  {chatHistory.map((msg, index) => (
                    <MessageBubble
                      key={msg.id}
                      message={msg}
                      isLatest={index === chatHistory.length - 1}
                    />
                  ))}

                  {/* Thinking indicator */}
                  {isProcessing && (
                    <div className="flex gap-3 animate-fade-in">
                      <div className="w-8 h-8 rounded-full bg-coco-bg-tertiary flex items-center justify-center flex-shrink-0">
                        <Image src="/brand/coco-paw.png" alt="Coco" width={20} height={20} />
                      </div>
                      <div className="bg-coco-bg-secondary border border-coco-border-subtle rounded-xl px-4 py-3">
                        <div className="flex items-center gap-2 text-sm text-coco-text-tertiary">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Thinking...
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Pending Action Confirmation */}
            {pendingAction && (
              <div className="mx-4 mb-4 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl animate-fade-in">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-amber-500/20 rounded-lg flex-shrink-0">
                    <Zap className="w-5 h-5 text-amber-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-amber-400 flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      Confirm Action
                    </h4>
                    <p className="text-xs text-coco-text-primary mt-1 font-medium">
                      {getActionInfo(pendingAction.action)?.name || pendingAction.action}
                    </p>
                    <p className="text-xs text-coco-text-secondary mt-0.5">
                      {getActionInfo(pendingAction.action)?.description || 'Execute this action?'}
                    </p>

                    {pendingAction.inferredFrom && (
                      <p className="text-[10px] text-coco-text-tertiary mt-2 italic">
                        Parameters inferred from: {pendingAction.inferredFrom}
                      </p>
                    )}

                    {/* Editable Parameters */}
                    <ActionParamEditor
                      params={editableParams}
                      onChange={setEditableParams}
                      actionDef={getActionInfo(pendingAction.action)}
                    />

                    <div className="flex gap-2 mt-4">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={handleExecuteAction}
                        disabled={isExecutingAction}
                        className="flex-1"
                      >
                        {isExecutingAction ? (
                          <span className="flex items-center justify-center gap-2">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Executing...
                          </span>
                        ) : (
                          <span className="flex items-center justify-center gap-2">
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
                        <XCircle className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Input Area */}
            <div className="p-4 border-t border-coco-border-subtle bg-coco-bg-elevated">
              <form onSubmit={handleSubmit}>
                <div className="relative">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSubmit(e);
                      }
                    }}
                    placeholder="Ask Coco anything..."
                    rows={1}
                    className="w-full px-4 py-3 pr-12 text-sm bg-coco-bg-secondary border border-coco-border-default rounded-xl focus:outline-none focus:ring-2 focus:ring-coco-accent placeholder:text-coco-text-tertiary resize-none"
                    disabled={isProcessing || isExecutingAction}
                  />
                  <button
                    type="submit"
                    disabled={!input.trim() || isProcessing || isExecutingAction}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-coco-text-tertiary hover:text-coco-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isProcessing || isExecutingAction ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                  </button>
                </div>
                <p className="text-[10px] text-coco-text-tertiary mt-2 text-center">
                  Press Enter to send, Shift+Enter for new line
                </p>
              </form>
            </div>
          </>
        )}
      </div>
    </>
  );
}
