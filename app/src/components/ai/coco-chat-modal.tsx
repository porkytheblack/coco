'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Send, Loader2 } from 'lucide-react';
import Image from 'next/image';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Modal } from '@/components/ui';
import { useAIStore } from '@/stores';
import { aiService } from '@/lib/ai';
import type { AIContext } from '@/types';

interface CocoChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  context?: AIContext;
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

  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const answerRef = useRef<HTMLDivElement>(null);

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

    // Add user message
    addMessage({ role: 'user', content: userMessage });

    // Get AI response
    setProcessing(true);
    try {
      const currentConfig = settings.providers[settings.provider];
      aiService.setAdapter(settings.provider, currentConfig);
      const response = await aiService.chat(userMessage, context);
      addMessage({ role: 'assistant', content: response });
    } catch (error) {
      addMessage({
        role: 'assistant',
        content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    } finally {
      setProcessing(false);
    }
  };

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

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Chat with Coco" size="md">
      <div className="flex flex-col gap-4">
        {/* Input Area - At the top */}
        <form onSubmit={handleSubmit}>
          <div className="relative flex items-center">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Coco here..."
              className="w-full px-4 py-3 pr-12 text-sm bg-coco-bg-secondary border border-coco-border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-coco-accent placeholder:text-coco-text-tertiary"
              disabled={isProcessing}
            />
            <button
              type="submit"
              disabled={!input.trim() || isProcessing}
              className="absolute right-3 p-1.5 text-coco-text-tertiary hover:text-coco-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? (
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
