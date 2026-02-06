'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { X, Send, Bug, Lightbulb, MessageCircle, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { clsx } from 'clsx';
import { useFeedbackStore } from '@/stores/feedback-store';
import type { FeedbackCategory } from '@oasis/sdk';

const categories: { id: FeedbackCategory; label: string; icon: React.ComponentType<{ className?: string }>; description: string }[] = [
  { id: 'bug', label: 'Bug Report', icon: Bug, description: 'Something isn\'t working correctly' },
  { id: 'feature', label: 'Feature Request', icon: Lightbulb, description: 'Suggest an improvement or new feature' },
  { id: 'general', label: 'General', icon: MessageCircle, description: 'General feedback or comments' },
];

export function FeedbackDialog() {
  const { isOpen, status, errorMessage, closeDialog, submitFeedback, reset } = useFeedbackStore();
  const [category, setCategory] = useState<FeedbackCategory>('general');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Focus textarea when dialog opens
  useEffect(() => {
    if (isOpen) {
      setCategory('general');
      setMessage('');
      setEmail('');
      reset();
      requestAnimationFrame(() => {
        textareaRef.current?.focus();
      });
    }
  }, [isOpen, reset]);

  // Auto-close on success after a delay
  useEffect(() => {
    if (status === 'success') {
      const timer = setTimeout(() => {
        closeDialog();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [status, closeDialog]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    await submitFeedback(category, message.trim(), email.trim() || undefined);
  }, [category, message, email, submitFeedback]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeDialog();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeDialog]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={closeDialog}
      />

      {/* Dialog */}
      <div
        className={clsx(
          'relative w-full max-w-md mx-4',
          'bg-coco-bg-elevated/95 backdrop-blur-xl',
          'border border-coco-border-subtle rounded-xl shadow-2xl',
          'animate-scale-in origin-center'
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Submit Feedback"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-coco-border-subtle">
          <h2 className="text-sm font-semibold text-coco-text-primary">Send Feedback</h2>
          <button
            onClick={closeDialog}
            className="p-1 rounded-lg hover:bg-coco-bg-tertiary text-coco-text-tertiary hover:text-coco-text-secondary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Success state */}
        {status === 'success' ? (
          <div className="p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-coco-success/10 flex items-center justify-center mx-auto mb-3">
              <CheckCircle className="w-6 h-6 text-coco-success" />
            </div>
            <p className="text-sm font-medium text-coco-text-primary">Thank you!</p>
            <p className="text-xs text-coco-text-secondary mt-1">Your feedback has been submitted.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="p-5 space-y-4">
              {/* Category selector */}
              <div className="grid grid-cols-3 gap-2">
                {categories.map((cat) => {
                  const Icon = cat.icon;
                  const selected = category === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategory(cat.id)}
                      className={clsx(
                        'flex flex-col items-center gap-1.5 p-3 rounded-lg border transition-colors text-center',
                        selected
                          ? 'bg-coco-accent/10 border-coco-accent/30 text-coco-accent'
                          : 'bg-coco-bg-secondary border-coco-border-subtle text-coco-text-secondary hover:bg-coco-bg-tertiary'
                      )}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-[11px] font-medium">{cat.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Message */}
              <div>
                <label htmlFor="feedback-message" className="block text-xs font-medium text-coco-text-secondary mb-1.5">
                  Message
                </label>
                <textarea
                  ref={textareaRef}
                  id="feedback-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={
                    category === 'bug'
                      ? 'Describe the issue you encountered...'
                      : category === 'feature'
                        ? 'Describe the feature you\'d like to see...'
                        : 'Share your thoughts...'
                  }
                  rows={4}
                  className={clsx(
                    'w-full px-3 py-2 text-sm rounded-lg resize-none',
                    'bg-coco-bg-secondary border border-coco-border-default',
                    'text-coco-text-primary placeholder:text-coco-text-tertiary',
                    'focus:outline-none focus:ring-2 focus:ring-coco-accent focus:border-transparent'
                  )}
                  required
                />
              </div>

              {/* Email (optional) */}
              <div>
                <label htmlFor="feedback-email" className="block text-xs font-medium text-coco-text-secondary mb-1.5">
                  Email <span className="text-coco-text-tertiary">(optional, for follow-up)</span>
                </label>
                <input
                  id="feedback-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className={clsx(
                    'w-full px-3 py-2 text-sm rounded-lg',
                    'bg-coco-bg-secondary border border-coco-border-default',
                    'text-coco-text-primary placeholder:text-coco-text-tertiary',
                    'focus:outline-none focus:ring-2 focus:ring-coco-accent focus:border-transparent'
                  )}
                />
              </div>

              {/* Error message */}
              {status === 'error' && errorMessage && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-coco-error/10 border border-coco-error/20">
                  <AlertCircle className="w-4 h-4 text-coco-error flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-coco-error">{errorMessage}</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-coco-border-subtle bg-coco-bg-secondary/50 rounded-b-xl">
              <button
                type="button"
                onClick={closeDialog}
                className="px-3 py-1.5 text-xs font-medium text-coco-text-secondary hover:text-coco-text-primary transition-colors rounded-lg hover:bg-coco-bg-tertiary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!message.trim() || status === 'submitting'}
                className={clsx(
                  'inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
                  'bg-coco-accent text-coco-text-inverse hover:bg-coco-accent-hover',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              >
                {status === 'submitting' ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-3 h-3" />
                    Submit
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
