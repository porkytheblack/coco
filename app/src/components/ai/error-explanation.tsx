'use client';

import { useState, useEffect, useRef } from 'react';
import { Loader2, Lightbulb } from 'lucide-react';
import Image from 'next/image';
import { useAIStore } from '@/stores';
import { aiService } from '@/lib/ai';
import * as tauri from '@/lib/tauri/commands';
import type { AIContext, AIExplanation } from '@/types';
import type { ErrorExplanation as ErrorExplanationType } from '@/lib/ai/types';

interface ErrorExplanationProps {
  errorMessage: string;
  context?: AIContext;
  runId?: string;
  savedExplanation?: AIExplanation;
}

// Module-level cache for error explanations to persist across component remounts
const explanationCache = new Map<string, ErrorExplanationType>();

// Generate a cache key from error message and context
function getCacheKey(errorMessage: string, context?: AIContext): string {
  return `${errorMessage}::${JSON.stringify(context || {})}`;
}

export function ErrorExplanation({ errorMessage, context, runId, savedExplanation }: ErrorExplanationProps) {
  const { settings } = useAIStore();
  const cacheKey = getCacheKey(errorMessage, context);
  const cachedExplanation = explanationCache.get(cacheKey);

  // Use saved explanation from database if available, otherwise fall back to cache
  const initialExplanation = savedExplanation || cachedExplanation || null;

  const [explanation, setExplanation] = useState<ErrorExplanationType | null>(initialExplanation);
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(!!initialExplanation);

  // Track if we've already fetched for this error to prevent duplicate requests
  const fetchedRef = useRef<string | null>(initialExplanation ? cacheKey : null);

  useEffect(() => {
    // If we have a saved explanation from the database, use it
    if (savedExplanation) {
      setExplanation(savedExplanation);
      setIsExpanded(true);
      fetchedRef.current = cacheKey;
      // Also update the cache
      explanationCache.set(cacheKey, savedExplanation);
      return;
    }

    // Only auto-fetch if enabled, we have an error, and haven't fetched this error before
    if (settings.enabled && errorMessage && fetchedRef.current !== cacheKey && !cachedExplanation) {
      explainError();
    }
  }, [errorMessage, settings.enabled, cacheKey, savedExplanation]);

  const explainError = async () => {
    if (!settings.enabled || isLoading) return;

    // Check cache first
    const cached = explanationCache.get(cacheKey);
    if (cached) {
      setExplanation(cached);
      setIsExpanded(true);
      fetchedRef.current = cacheKey;
      return;
    }

    setIsLoading(true);
    fetchedRef.current = cacheKey;
    try {
      const currentConfig = settings.providers[settings.provider];
      aiService.setAdapter(settings.provider, currentConfig);
      const result = await aiService.explainError(errorMessage, context);
      // Cache the result
      explanationCache.set(cacheKey, result);
      setExplanation(result);
      setIsExpanded(true);

      // Persist to database if we have a runId
      if (runId && tauri.checkIsTauri()) {
        try {
          await tauri.updateTransactionRunExplanation(runId, {
            summary: result.summary,
            details: result.details,
            suggestions: result.suggestions,
          });
        } catch (persistError) {
          // Log but don't fail - the explanation is still displayed
          console.error('Failed to persist AI explanation:', persistError);
        }
      }
    } catch (error) {
      console.error('Failed to explain error:', error);
      fetchedRef.current = null; // Allow retry on error
    } finally {
      setIsLoading(false);
    }
  };

  if (!settings.enabled) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="mt-3 flex items-center gap-2 text-sm text-coco-text-tertiary">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>Coco is analyzing...</span>
      </div>
    );
  }

  if (!explanation) {
    return (
      <button
        onClick={explainError}
        className="mt-3 flex items-center gap-2 text-sm text-coco-accent hover:underline"
      >
        <Image src="/brand/coco-paw.png" alt="Coco" width={16} height={16} />
        <span>Ask Coco to explain this error</span>
      </button>
    );
  }

  return (
    <div className="mt-3 bg-coco-bg-tertiary/50 border border-coco-border-subtle rounded-lg overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-3 p-3 hover:bg-coco-bg-tertiary/70 transition-colors"
      >
        <Image src="/brand/coco-paw.png" alt="Coco" width={20} height={20} />
        <span className="flex-1 text-left text-sm font-medium text-coco-text-primary">
          {explanation.summary}
        </span>
      </button>

      {isExpanded && (
        <div className="px-3 pb-3 space-y-3">
          <p className="text-sm text-coco-text-secondary pl-8">{explanation.details}</p>

          {explanation.suggestions.length > 0 && (
            <div className="pl-8">
              <div className="flex items-center gap-2 text-xs font-medium text-coco-text-tertiary mb-2">
                <Lightbulb className="w-3 h-3" />
                Suggestions
              </div>
              <ul className="space-y-1">
                {explanation.suggestions.map((suggestion, idx) => (
                  <li
                    key={idx}
                    className="text-sm text-coco-text-secondary flex items-start gap-2"
                  >
                    <span className="text-coco-accent">•</span>
                    {suggestion}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
