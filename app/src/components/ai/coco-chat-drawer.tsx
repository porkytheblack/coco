'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  X,
  Send,
  Loader2,
  Zap,
  CheckCircle,
  XCircle,
  Sparkles,
  Trash2,
  Edit2,
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  RefreshCw,
  Plus,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  Paperclip,
  FileCode,
  HelpCircle,
  Terminal,
} from 'lucide-react';
import Image from 'next/image';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { clsx } from 'clsx';
import { Button, IconButton } from '@/components/ui';
import { useAIStore, useActionTrackingStore, useChainStore, useWorkspaceStore, useWalletStore } from '@/stores';
import { aiService } from '@/lib/ai';
import { initializeActionRegistry, executeAIAction, actionRegistry } from '@/lib/ai/actions';
import {
  useConversations,
  useCreateConversation,
  useDeleteConversation,
  useMessages,
  useAddMessage,
  useClearConversationMessages,
} from '@/hooks/use-conversations';
import type { AIContext, Conversation } from '@/types';
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
  inferredFrom?: string;
}

// Parse action blocks from AI response
function parseActionFromResponse(content: string): PendingAction | null {
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

// Format relative time
function formatRelativeTime(timestamp: string): string {
  const now = new Date();
  const date = new Date(timestamp);
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  return date.toLocaleDateString();
}

// Simple syntax highlighter for code blocks
function highlightCode(code: string, language: string): string {
  const lang = language.toLowerCase();

  // Keywords by language
  const keywords: Record<string, string[]> = {
    javascript: ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'class', 'import', 'export', 'from', 'async', 'await', 'try', 'catch', 'throw', 'new', 'this', 'typeof', 'instanceof', 'null', 'undefined', 'true', 'false'],
    typescript: ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'class', 'import', 'export', 'from', 'async', 'await', 'try', 'catch', 'throw', 'new', 'this', 'typeof', 'instanceof', 'null', 'undefined', 'true', 'false', 'interface', 'type', 'enum', 'implements', 'extends', 'public', 'private', 'protected', 'readonly'],
    solidity: ['pragma', 'solidity', 'contract', 'function', 'modifier', 'event', 'struct', 'enum', 'mapping', 'address', 'uint', 'uint256', 'int', 'int256', 'bool', 'string', 'bytes', 'public', 'private', 'internal', 'external', 'view', 'pure', 'payable', 'memory', 'storage', 'calldata', 'returns', 'return', 'if', 'else', 'for', 'while', 'require', 'revert', 'emit', 'constructor', 'fallback', 'receive', 'override', 'virtual', 'abstract', 'interface', 'library', 'using', 'is', 'import', 'from'],
    python: ['def', 'class', 'import', 'from', 'return', 'if', 'elif', 'else', 'for', 'while', 'try', 'except', 'finally', 'with', 'as', 'lambda', 'yield', 'raise', 'pass', 'break', 'continue', 'and', 'or', 'not', 'in', 'is', 'None', 'True', 'False', 'async', 'await', 'self'],
    rust: ['fn', 'let', 'mut', 'const', 'struct', 'enum', 'impl', 'trait', 'pub', 'use', 'mod', 'crate', 'self', 'super', 'if', 'else', 'match', 'for', 'while', 'loop', 'return', 'break', 'continue', 'async', 'await', 'move', 'ref', 'where', 'type', 'unsafe', 'extern', 'dyn', 'static', 'true', 'false', 'Some', 'None', 'Ok', 'Err'],
    json: [],
  };

  const langKeywords = keywords[lang] || keywords.javascript || [];

  // Escape HTML
  let highlighted = code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Highlight strings (double and single quotes)
  highlighted = highlighted.replace(
    /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)/g,
    '<span class="text-emerald-400">$1</span>'
  );

  // Highlight numbers
  highlighted = highlighted.replace(
    /\b(\d+(?:\.\d+)?(?:e[+-]?\d+)?)\b/g,
    '<span class="text-amber-400">$1</span>'
  );

  // Highlight comments (// and /* */ and #)
  highlighted = highlighted.replace(
    /(\/\/[^\n]*|\/\*[\s\S]*?\*\/|#[^\n]*)/g,
    '<span class="text-coco-text-tertiary italic">$1</span>'
  );

  // Highlight keywords
  if (langKeywords.length > 0) {
    const keywordRegex = new RegExp(`\\b(${langKeywords.join('|')})\\b`, 'g');
    highlighted = highlighted.replace(
      keywordRegex,
      '<span class="text-violet-400">$1</span>'
    );
  }

  return highlighted;
}

// Code block component with copy button and syntax highlighting
function CodeBlock({ children, language }: { children: string; language: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [children]);

  const highlightedCode = useMemo(() => highlightCode(children, language), [children, language]);

  return (
    <div className="relative group my-2">
      {language && (
        <div className="absolute top-0 left-0 px-2 py-1 text-[10px] font-mono text-coco-text-tertiary bg-coco-bg-tertiary rounded-tl-lg rounded-br-lg">
          {language}
        </div>
      )}
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 p-1.5 rounded-md bg-coco-bg-secondary/80 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-coco-bg-tertiary"
        aria-label="Copy code"
      >
        {copied ? (
          <Check className="w-3.5 h-3.5 text-coco-success" />
        ) : (
          <Copy className="w-3.5 h-3.5 text-coco-text-tertiary" />
        )}
      </button>
      <pre className="bg-coco-bg-tertiary rounded-lg p-3 pt-7 overflow-x-auto text-xs font-mono">
        <code
          dangerouslySetInnerHTML={{ __html: highlightedCode }}
          className="text-coco-text-primary"
        />
      </pre>
    </div>
  );
}

// Typing indicator with bouncing dots
function TypingIndicator() {
  return (
    <div className="flex gap-3 animate-fade-in">
      <div className="w-8 h-8 rounded-full bg-coco-bg-tertiary flex items-center justify-center flex-shrink-0">
        <Image src="/brand/coco-paw.png" alt="Coco" width={20} height={20} />
      </div>
      <div className="bg-coco-bg-secondary border border-coco-border-subtle rounded-xl px-4 py-3">
        <div className="flex items-center gap-2 text-sm text-coco-text-tertiary">
          <span>Coco is thinking</span>
          <div className="flex gap-1">
            <span className="w-1.5 h-1.5 bg-coco-accent rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1.5 h-1.5 bg-coco-accent rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1.5 h-1.5 bg-coco-accent rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>
    </div>
  );
}

// Message bubble component with hover actions
interface MessageBubbleProps {
  message: { id: string; role: string; content: string; timestamp?: string; createdAt?: string };
  isLatest: boolean;
  onCopy: () => void;
  onRetry?: () => void;
}

function MessageBubble({ message, isLatest: _isLatest, onCopy, onRetry }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const [isHovered, setIsHovered] = useState(false);
  const [showTimestamp, setShowTimestamp] = useState(false);
  const timestamp = message.timestamp || message.createdAt || new Date().toISOString();

  return (
    <div
      className={clsx('flex gap-3 animate-fade-in group', isUser ? 'flex-row-reverse' : 'flex-row')}
      onMouseEnter={() => {
        setIsHovered(true);
        setShowTimestamp(true);
      }}
      onMouseLeave={() => {
        setIsHovered(false);
        setShowTimestamp(false);
      }}
    >
      {/* Avatar */}
      <div
        className={clsx(
          'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
          isUser ? 'bg-coco-accent/20' : 'bg-coco-bg-tertiary'
        )}
      >
        {isUser ? (
          <span className="text-xs font-medium text-coco-accent">You</span>
        ) : (
          <Image src="/brand/coco-paw.png" alt="Coco" width={20} height={20} />
        )}
      </div>

      {/* Message content */}
      <div className="flex-1 max-w-[85%] relative">
        <div
          className={clsx(
            'rounded-xl px-4 py-3',
            isUser
              ? 'bg-coco-accent/10 border border-coco-accent/20 ml-auto'
              : 'bg-coco-bg-secondary border border-coco-border-subtle'
          )}
        >
          {isUser ? (
            <p className="text-sm text-coco-text-primary whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="prose prose-sm prose-invert max-w-none text-coco-text-primary">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  p: ({ children }) => <p className="mb-2 last:mb-0 text-sm leading-relaxed">{children}</p>,
                  strong: ({ children }) => <strong className="font-semibold text-coco-text-primary">{children}</strong>,
                  em: ({ children }) => <em className="italic text-coco-text-secondary">{children}</em>,
                  code: ({ children, className }) => {
                    const match = /language-(\w+)/.exec(className || '');
                    const isInline = !match && !className;

                    if (isInline) {
                      return (
                        <code className="px-1.5 py-0.5 bg-coco-bg-tertiary/80 border border-coco-border-subtle rounded text-coco-accent text-xs font-mono">
                          {children}
                        </code>
                      );
                    }
                    return <>{children}</>;
                  },
                  pre: ({ children }) => {
                    const codeElement = children as React.ReactElement<{ className?: string; children?: React.ReactNode }>;
                    const codeProps = codeElement?.props;
                    const className = codeProps?.className || '';
                    const match = /language-(\w+)/.exec(className);
                    const language = match ? match[1] : '';
                    const codeContent = String(codeProps?.children || '').replace(/\n$/, '');

                    return <CodeBlock language={language}>{codeContent}</CodeBlock>;
                  },
                  ul: ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>,
                  li: ({ children }) => <li className="text-coco-text-secondary text-sm">{children}</li>,
                  a: ({ href, children }) => (
                    <a
                      href={href}
                      className="text-coco-accent hover:underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {children}
                    </a>
                  ),
                  h1: ({ children }) => <h1 className="text-base font-bold mb-2 text-coco-text-primary">{children}</h1>,
                  h2: ({ children }) => <h2 className="text-sm font-semibold mb-2 text-coco-text-primary">{children}</h2>,
                  h3: ({ children }) => <h3 className="text-sm font-semibold mb-1 text-coco-text-primary">{children}</h3>,
                  table: ({ children }) => (
                    <div className="overflow-x-auto my-2">
                      <table className="min-w-full border border-coco-border-subtle rounded-lg overflow-hidden text-sm">
                        {children}
                      </table>
                    </div>
                  ),
                  thead: ({ children }) => <thead className="bg-coco-bg-tertiary">{children}</thead>,
                  tbody: ({ children }) => <tbody className="divide-y divide-coco-border-subtle">{children}</tbody>,
                  tr: ({ children }) => <tr className="even:bg-coco-bg-tertiary/50">{children}</tr>,
                  th: ({ children }) => (
                    <th className="px-3 py-2 text-left text-xs font-semibold text-coco-text-primary border-b border-coco-border-subtle">
                      {children}
                    </th>
                  ),
                  td: ({ children }) => (
                    <td className="px-3 py-2 text-xs text-coco-text-secondary">{children}</td>
                  ),
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-2 border-coco-accent pl-3 my-2 text-coco-text-secondary italic">
                      {children}
                    </blockquote>
                  ),
                  hr: () => <hr className="my-3 border-coco-border-subtle" />,
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {/* Timestamp on hover */}
        <span
          className={clsx(
            'absolute -bottom-4 text-[10px] text-coco-text-tertiary transition-opacity duration-200',
            isUser ? 'right-0' : 'left-0',
            showTimestamp ? 'opacity-100' : 'opacity-0'
          )}
        >
          {formatRelativeTime(timestamp)}
        </span>

        {/* Hover actions */}
        <div
          className={clsx(
            'absolute top-0 flex gap-1 transition-opacity duration-200',
            isUser ? '-left-16' : '-right-16',
            isHovered ? 'opacity-100' : 'opacity-0'
          )}
        >
          <button
            onClick={onCopy}
            className="p-1.5 rounded-md hover:bg-coco-bg-tertiary text-coco-text-tertiary hover:text-coco-text-secondary transition-colors"
            title="Copy message"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          {!isUser && onRetry && (
            <button
              onClick={onRetry}
              className="p-1.5 rounded-md hover:bg-coco-bg-tertiary text-coco-text-tertiary hover:text-coco-text-secondary transition-colors"
              title="Retry"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Conversation list item
interface ConversationItemProps {
  conversation: Conversation;
  isActive: boolean;
  onClick: () => void;
  onDelete: () => void;
  messageCount?: number;
}

function ConversationItem({ conversation, isActive, onClick, onDelete, messageCount }: ConversationItemProps) {
  const [showDelete, setShowDelete] = useState(false);

  return (
    <div
      className={clsx(
        'group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors',
        isActive ? 'bg-coco-accent/10 border border-coco-accent/20' : 'hover:bg-coco-bg-tertiary'
      )}
      onClick={onClick}
      onMouseEnter={() => setShowDelete(true)}
      onMouseLeave={() => setShowDelete(false)}
    >
      <MessageSquare className={clsx('w-4 h-4 flex-shrink-0', isActive ? 'text-coco-accent' : 'text-coco-text-tertiary')} />
      <div className="flex-1 min-w-0">
        <p className={clsx('text-sm truncate', isActive ? 'text-coco-accent font-medium' : 'text-coco-text-primary')}>
          {conversation.title || 'New conversation'}
        </p>
        <p className="text-[10px] text-coco-text-tertiary">
          {formatRelativeTime(conversation.updatedAt || conversation.createdAt)}
          {messageCount !== undefined && ` - ${messageCount} messages`}
        </p>
      </div>
      {showDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="p-1 rounded hover:bg-coco-error/20 text-coco-text-tertiary hover:text-coco-error transition-colors"
          title="Delete conversation"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

// Quick action chip
interface QuickActionChipProps {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}

function QuickActionChip({ label, icon, onClick }: QuickActionChipProps) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-2 bg-coco-bg-tertiary hover:bg-coco-accent/10 border border-coco-border-subtle hover:border-coco-accent/30 rounded-lg transition-colors text-sm text-coco-text-secondary hover:text-coco-accent"
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

// Suggestion chip for empty state
interface SuggestionChipProps {
  label: string;
  onClick: () => void;
}

function SuggestionChip({ label, onClick }: SuggestionChipProps) {
  return (
    <button
      onClick={onClick}
      className="px-4 py-2 bg-coco-bg-secondary hover:bg-coco-accent/10 border border-coco-border-subtle hover:border-coco-accent/30 rounded-full transition-all text-sm text-coco-text-secondary hover:text-coco-accent"
    >
      {label}
    </button>
  );
}

// Empty state component
interface EmptyStateProps {
  onSuggestionClick: (suggestion: string) => void;
}

function EmptyState({ onSuggestionClick }: EmptyStateProps) {
  const suggestions = [
    "Explain my contract's ABI",
    'Help debug transaction error',
    'Generate a deployment script',
    "What's the gas cost?",
  ];

  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-6">
      <Image
        src="/brand/coco-paw.png"
        alt="Coco"
        width={72}
        height={72}
        className="opacity-40 mb-6"
      />
      <h3 className="text-lg font-medium text-coco-text-primary mb-2">Hey there!</h3>
      <p className="text-sm text-coco-text-tertiary mb-6 max-w-[280px]">
        I am Coco, your blockchain development assistant. Ask me anything about contracts, transactions, or debugging.
      </p>
      <div className="flex flex-wrap gap-2 justify-center">
        {suggestions.map((suggestion) => (
          <SuggestionChip
            key={suggestion}
            label={suggestion}
            onClick={() => onSuggestionClick(suggestion)}
          />
        ))}
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

  const paramList =
    actionDef?.parameters && actionDef.parameters.length > 0
      ? actionDef.parameters
      : Object.keys(params).map((key) => ({
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
        {expanded ? (
          <ChevronDown className="w-4 h-4 text-coco-text-tertiary" />
        ) : (
          <ChevronRight className="w-4 h-4 text-coco-text-tertiary" />
        )}
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
                {param.description && <p className="text-[10px] text-coco-text-tertiary mt-1">{param.description}</p>}
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

// Main chat drawer component
export function CocoChatDrawer({ isOpen, onClose, context }: CocoChatDrawerProps) {
  const {
    settings,
    chatHistory,
    isProcessing,
    addMessage: addMessageToStore,
    clearChat,
    setProcessing,
  } = useAIStore();

  const { getActionsForContext } = useActionTrackingStore();

  // Store access for action context
  const chainStore = useChainStore();
  const workspaceStore = useWorkspaceStore();
  const walletStore = useWalletStore();

  // Conversation management - load ALL conversations for the sidebar (no workspace filter)
  const workspaceId = workspaceStore.currentWorkspace?.id;
  const { data: conversations = [] } = useConversations();
  const createConversation = useCreateConversation();
  const deleteConversation = useDeleteConversation();
  const addMessageMutation = useAddMessage();
  const clearMessagesMutation = useClearConversationMessages();

  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [showConversationList, setShowConversationList] = useState(false);

  // Get messages for active conversation
  const { data: conversationMessages = [] } = useMessages(activeConversationId || undefined);

  // Use conversation messages if available, otherwise fall back to local chat history
  const displayMessages = activeConversationId ? conversationMessages : chatHistory;

  const [input, setInput] = useState('');
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [editableParams, setEditableParams] = useState<Record<string, unknown>>({});
  const [_actionResult, setActionResult] = useState<ActionResult | null>(null);
  const [isExecutingAction, setIsExecutingAction] = useState(false);
  const [drawerWidth, setDrawerWidth] = useState(480);
  const [isResizing, setIsResizing] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const MAX_INPUT_LENGTH = 4000;
  const MAX_INPUT_LINES = 5;

  // Initialize action registry on mount
  useEffect(() => {
    if (actionRegistry.getAll().length === 0) {
      initializeActionRegistry();
    }
  }, []);

  // Build context with recent actions and enable AI actions
  const enrichedContext = useMemo((): AIContext => {
    const actions =
      context?.chainId || context?.ecosystem
        ? getActionsForContext({ chainId: context.chainId })
        : getActionsForContext({});

    const actionSummary =
      actions.length > 0
        ? actions
            .slice(0, 15)
            .map((a) => {
              const time = new Date(a.timestamp).toLocaleTimeString();
              const status = a.result?.success ? '' : a.result?.success === false ? '' : '';
              return `[${time}] ${status} ${a.summary}`;
            })
            .join('\n')
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
  }, [displayMessages]);

  // Update editable params when pending action changes
  useEffect(() => {
    if (pendingAction) {
      const inferredParams = { ...pendingAction.params };

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

  // Auto-resize textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (value.length <= MAX_INPUT_LENGTH) {
      setInput(value);

      // Auto-resize
      const textarea = e.target;
      textarea.style.height = 'auto';
      const lineHeight = 24;
      const maxHeight = lineHeight * MAX_INPUT_LINES;
      textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`;
    }
  };

  // Create new conversation
  const handleNewConversation = useCallback(async () => {
    try {
      const conversation = await createConversation.mutateAsync({
        workspaceId,
        title: 'New conversation',
      });
      setActiveConversationId(conversation.id);
    } catch (error) {
      console.error('Failed to create conversation:', error);
    }
  }, [createConversation, workspaceId]);

  // Delete conversation
  const handleDeleteConversation = useCallback(
    async (conversationId: string) => {
      try {
        await deleteConversation.mutateAsync({ conversationId, workspaceId });
        if (activeConversationId === conversationId) {
          setActiveConversationId(null);
        }
      } catch (error) {
        console.error('Failed to delete conversation:', error);
      }
    },
    [deleteConversation, workspaceId, activeConversationId]
  );

  // Handle message copy
  const handleCopyMessage = useCallback(async (content: string) => {
    await navigator.clipboard.writeText(content);
  }, []);

  // Handle retry (re-send previous user message)
  const handleRetry = useCallback(
    async (_messageIndex: number) => {
      // Find the previous user message
      const userMessages = displayMessages.filter((m) => m.role === 'user');
      const lastUserMessage = userMessages[userMessages.length - 1];

      if (lastUserMessage) {
        // Set the input and trigger submit
        setInput(lastUserMessage.content);
      }
    },
    [displayMessages]
  );

  // Submit message
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isProcessing || !settings.enabled) return;

    const userMessage = input.trim();
    setInput('');

    // Reset textarea height
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }

    // Clear any previous action state
    setPendingAction(null);
    setActionResult(null);

    // Add user message to local store
    addMessageToStore({ role: 'user', content: userMessage });

    // Also save to backend if we have an active conversation
    if (activeConversationId) {
      addMessageMutation.mutate({
        conversationId: activeConversationId,
        role: 'user',
        content: userMessage,
      });
    }

    // Get AI response
    setProcessing(true);
    try {
      const currentConfig = settings.providers[settings.provider];
      aiService.setAdapter(settings.provider, currentConfig);

      const messageHistory = [
        ...chatHistory.map((msg) => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        })),
        { role: 'user' as const, content: userMessage },
      ];

      const isFirstMessage = chatHistory.length === 0;

      const response = await aiService.chatWithHistory(messageHistory, enrichedContext, isFirstMessage);

      const parsedAction = parseActionFromResponse(response);

      if (parsedAction) {
        setPendingAction({
          ...parsedAction,
          inferredFrom: currentContextDescription,
        });
        const cleanResponse = removeActionBlock(response);
        const messageContent = cleanResponse || "I'd like to perform the following action. Please review and confirm:";
        addMessageToStore({ role: 'assistant', content: messageContent });
        if (activeConversationId) {
          addMessageMutation.mutate({
            conversationId: activeConversationId,
            role: 'assistant',
            content: messageContent,
          });
        }
      } else {
        addMessageToStore({ role: 'assistant', content: response });
        if (activeConversationId) {
          addMessageMutation.mutate({
            conversationId: activeConversationId,
            role: 'assistant',
            content: response,
          });
        }
      }

      // Update conversation title if it's the first message
      if (isFirstMessage && activeConversationId) {
        // Generate title from first message (truncated)
        const _title = userMessage.length > 40 ? userMessage.substring(0, 40) + '...' : userMessage;
        // TODO: Use useUpdateConversation hook to update conversation title
      }
    } catch (error) {
      const errorMessage = `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}`;
      addMessageToStore({ role: 'assistant', content: errorMessage });
      if (activeConversationId) {
        addMessageMutation.mutate({
          conversationId: activeConversationId,
          role: 'assistant',
          content: errorMessage,
        });
      }
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

      const resultSummary = result.success
        ? `${result.message}${result.data ? `\nData: ${JSON.stringify(result.data)}` : ''}`
        : `Failed: ${result.message}${result.error ? ` (${result.error})` : ''}`;

      const resultMessage = result.success
        ? `Action completed: ${result.message}${result.data ? `\n\n\`\`\`json\n${JSON.stringify(result.data, null, 2)}\n\`\`\`` : ''}`
        : `Action failed: ${result.message}${result.error ? `\n\n\`${result.error}\`` : ''}`;

      addMessageToStore({ role: 'assistant', content: resultMessage });
      if (activeConversationId) {
        addMessageMutation.mutate({
          conversationId: activeConversationId,
          role: 'assistant',
          content: resultMessage,
        });
      }

      setPendingAction(null);
      setIsExecutingAction(false);

      // Continue conversation
      setProcessing(true);

      try {
        const currentConfig = settings.providers[settings.provider];
        aiService.setAdapter(settings.provider, currentConfig);

        const updatedHistory = useAIStore.getState().chatHistory;
        const messageHistory = [
          ...updatedHistory.map((msg) => ({
            role: msg.role as 'user' | 'assistant',
            content: msg.content,
          })),
          {
            role: 'user' as const,
            content: `[Action "${pendingAction.action}" result: ${resultSummary}]\n\nBriefly summarize or answer based on this result.`,
          },
        ];

        const response = await aiService.chatWithHistory(messageHistory, enrichedContext, false);
        const parsedAction = parseActionFromResponse(response);

        if (parsedAction) {
          setPendingAction({
            ...parsedAction,
            inferredFrom: currentContextDescription,
          });
          const cleanResponse = removeActionBlock(response);
          if (cleanResponse) {
            addMessageToStore({ role: 'assistant', content: cleanResponse });
            if (activeConversationId) {
              addMessageMutation.mutate({
                conversationId: activeConversationId,
                role: 'assistant',
                content: cleanResponse,
              });
            }
          }
        } else {
          addMessageToStore({ role: 'assistant', content: response });
          if (activeConversationId) {
            addMessageMutation.mutate({
              conversationId: activeConversationId,
              role: 'assistant',
              content: response,
            });
          }
        }
      } catch (error) {
        console.error('Follow-up AI call failed:', error);
      } finally {
        setProcessing(false);
      }
    } catch (error) {
      const errorMessage = `Failed to execute action: ${error instanceof Error ? error.message : 'Unknown error'}`;
      setActionResult({
        success: false,
        message: errorMessage,
      });
      addMessageToStore({ role: 'assistant', content: `Action failed: ${errorMessage}` });
      if (activeConversationId) {
        addMessageMutation.mutate({
          conversationId: activeConversationId,
          role: 'assistant',
          content: `Action failed: ${errorMessage}`,
        });
      }
      setIsExecutingAction(false);
      setPendingAction(null);
    }
  }, [
    pendingAction,
    editableParams,
    context,
    chainStore.selectedChain?.id,
    workspaceStore.currentWorkspace?.id,
    walletStore.selectedWallet?.id,
    addMessageToStore,
    settings,
    enrichedContext,
    currentContextDescription,
    setProcessing,
    activeConversationId,
    addMessageMutation,
  ]);

  // Cancel a pending action
  const handleCancelAction = useCallback(() => {
    setPendingAction(null);
    const cancelMessage = '_Action cancelled. Let me know if you need anything else!_';
    addMessageToStore({ role: 'assistant', content: cancelMessage });
    if (activeConversationId) {
      addMessageMutation.mutate({
        conversationId: activeConversationId,
        role: 'assistant',
        content: cancelMessage,
      });
    }
  }, [addMessageToStore, activeConversationId, addMessageMutation]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    },
    [onClose]
  );

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

  const onResize = useCallback(
    (e: MouseEvent) => {
      if (isResizing) {
        const newWidth = window.innerWidth - e.clientX;
        if (newWidth >= 380 && newWidth <= 800) {
          setDrawerWidth(newWidth);
        }
      }
    },
    [isResizing]
  );

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

  // Handle suggestion click from empty state
  const handleSuggestionClick = useCallback(
    (suggestion: string) => {
      setInput(suggestion);
      inputRef.current?.focus();
      // Auto submit
      setTimeout(() => {
        const form = inputRef.current?.closest('form');
        if (form) {
          form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
        }
      }, 0);
    },
    []
  );

  // Handle quick action click
  const handleQuickAction = useCallback((text: string) => {
    setInput(text);
    inputRef.current?.focus();
  }, []);

  // Handle clear chat with optional conversation clearing
  const handleClearChat = useCallback(() => {
    clearChat();
    if (activeConversationId) {
      clearMessagesMutation.mutate(activeConversationId);
    }
  }, [clearChat, activeConversationId, clearMessagesMutation]);

  if (!isOpen) return null;

  const conversationListWidth = showConversationList ? 200 : 0;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/20 dark:bg-black/50 z-40 animate-fade-in" onClick={onClose} />

      {/* Resize overlay */}
      {isResizing && <div className="fixed inset-0 z-[100] cursor-ew-resize" />}

      {/* Drawer - Right side */}
      <div
        style={{ width: drawerWidth + conversationListWidth }}
        className={clsx(
          'fixed right-0 top-0 bottom-0',
          'bg-coco-bg-elevated border-l border-coco-border-subtle',
          'shadow-drawer z-50 flex',
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

        {/* Conversation List Panel */}
        {showConversationList && (
          <div className="w-[200px] flex-shrink-0 border-r border-coco-border-subtle bg-coco-bg-primary flex flex-col">
            <div className="p-3 border-b border-coco-border-subtle">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleNewConversation}
                className="w-full justify-center gap-2"
                disabled={createConversation.isPending}
              >
                <Plus className="w-4 h-4" />
                New Chat
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {conversations.length === 0 ? (
                <p className="text-xs text-coco-text-tertiary text-center py-4">No conversations yet</p>
              ) : (
                conversations.map((conv) => (
                  <ConversationItem
                    key={conv.id}
                    conversation={conv}
                    isActive={conv.id === activeConversationId}
                    onClick={() => setActiveConversationId(conv.id)}
                    onDelete={() => handleDeleteConversation(conv.id)}
                  />
                ))
              )}
            </div>
          </div>
        )}

        {/* Main Chat Panel */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-coco-border-subtle bg-coco-bg-elevated">
            <div className="flex items-center gap-3">
              <IconButton
                icon={showConversationList ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
                label={showConversationList ? 'Hide conversations' : 'Show conversations'}
                onClick={() => setShowConversationList(!showConversationList)}
                className="opacity-60 hover:opacity-100"
              />
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
                onClick={handleClearChat}
                className="opacity-60 hover:opacity-100"
              />
              <IconButton icon={<X className="w-5 h-5" />} label="Close" onClick={onClose} />
            </div>
          </div>

          {/* Chat not enabled state */}
          {!settings.enabled ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <Image src="/brand/coco-paw.png" alt="Coco" width={64} height={64} className="opacity-30 mb-4" />
              <p className="text-coco-text-secondary mb-2">AI features are disabled</p>
              <p className="text-xs text-coco-text-tertiary">Enable AI in settings to chat with Coco</p>
            </div>
          ) : (
            <>
              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto relative">
                {/* Top gradient for scroll indication */}
                <div className="sticky top-0 left-0 right-0 h-6 bg-gradient-to-b from-coco-bg-elevated to-transparent pointer-events-none z-10" />

                <div className="p-4 space-y-6 min-h-full">
                  {displayMessages.length === 0 ? (
                    <EmptyState onSuggestionClick={handleSuggestionClick} />
                  ) : (
                    <>
                      {displayMessages.map((msg, index) => (
                        <MessageBubble
                          key={msg.id}
                          message={msg}
                          isLatest={index === displayMessages.length - 1}
                          onCopy={() => handleCopyMessage(msg.content)}
                          onRetry={msg.role === 'assistant' ? () => handleRetry(index) : undefined}
                        />
                      ))}

                      {/* Typing indicator */}
                      {isProcessing && <TypingIndicator />}
                    </>
                  )}
                  <div ref={messagesEndRef} />
                </div>
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
                        <Button variant="secondary" size="sm" onClick={handleCancelAction} disabled={isExecutingAction}>
                          <XCircle className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Input Area */}
              <div className="p-4 border-t border-coco-border-subtle bg-coco-bg-elevated">
                {/* Quick Actions */}
                <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
                  <QuickActionChip
                    label="Explain error"
                    icon={<HelpCircle className="w-3.5 h-3.5" />}
                    onClick={() => handleQuickAction('Explain the most recent error I encountered')}
                  />
                  <QuickActionChip
                    label="Help with contract"
                    icon={<FileCode className="w-3.5 h-3.5" />}
                    onClick={() => handleQuickAction('Help me understand this contract')}
                  />
                  <QuickActionChip
                    label="Generate script"
                    icon={<Terminal className="w-3.5 h-3.5" />}
                    onClick={() => handleQuickAction('Generate a deployment script for')}
                  />
                </div>

                <form onSubmit={handleSubmit}>
                  <div className="relative bg-coco-bg-secondary rounded-xl border border-coco-border-default shadow-sm focus-within:ring-2 focus-within:ring-coco-accent focus-within:border-transparent">
                    <textarea
                      ref={inputRef}
                      value={input}
                      onChange={handleInputChange}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSubmit(e);
                        }
                      }}
                      placeholder="Ask Coco anything..."
                      rows={1}
                      className="w-full px-4 py-3 pr-20 text-sm bg-transparent focus:outline-none placeholder:text-coco-text-tertiary resize-none"
                      disabled={isProcessing || isExecutingAction}
                      style={{ maxHeight: `${24 * MAX_INPUT_LINES}px` }}
                    />
                    <div className="absolute right-2 bottom-2 flex items-center gap-2">
                      {/* Attachment button (placeholder) */}
                      <button
                        type="button"
                        className="p-1.5 text-coco-text-tertiary hover:text-coco-text-secondary transition-colors rounded-md hover:bg-coco-bg-tertiary"
                        title="Attach file (coming soon)"
                        disabled
                      >
                        <Paperclip className="w-4 h-4" />
                      </button>
                      {/* Send button */}
                      <button
                        type="submit"
                        disabled={!input.trim() || isProcessing || isExecutingAction}
                        className="p-1.5 text-coco-text-tertiary hover:text-coco-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed rounded-md hover:bg-coco-accent/10"
                      >
                        {isProcessing || isExecutingAction ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <Send className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-2 px-1">
                    <p className="text-[10px] text-coco-text-tertiary">
                      Press Enter to send, Shift+Enter for new line
                    </p>
                    <p
                      className={clsx(
                        'text-[10px]',
                        input.length > MAX_INPUT_LENGTH * 0.9 ? 'text-coco-error' : 'text-coco-text-tertiary'
                      )}
                    >
                      {input.length}/{MAX_INPUT_LENGTH}
                    </p>
                  </div>
                </form>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
