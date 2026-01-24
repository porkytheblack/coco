'use client';

import { useState, useEffect } from 'react';
import { Loader2, Lightbulb } from 'lucide-react';
import Image from 'next/image';
import { useAIStore } from '@/stores';
import { aiService } from '@/lib/ai';
import type { AIContext } from '@/types';
import type { ErrorExplanation as ErrorExplanationType } from '@/lib/ai/types';

interface ErrorExplanationProps {
  errorMessage: string;
  context?: AIContext;
}

export function ErrorExplanation({ errorMessage, context }: ErrorExplanationProps) {
  const { settings } = useAIStore();
  const [explanation, setExplanation] = useState<ErrorExplanationType | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (settings.enabled && errorMessage && !explanation) {
      explainError();
    }
  }, [errorMessage, settings.enabled]);

  const explainError = async () => {
    if (!settings.enabled || isLoading) return;

    setIsLoading(true);
    try {
      const currentConfig = settings.providers[settings.provider];
      aiService.setAdapter(settings.provider, currentConfig);
      const result = await aiService.explainError(errorMessage, context);
      setExplanation(result);
      setIsExpanded(true);
    } catch (error) {
      console.error('Failed to explain error:', error);
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
