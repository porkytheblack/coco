'use client';

import { useState } from 'react';
import { Loader2, Sparkles, Check, X } from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui';
import { useAIStore } from '@/stores';
import { aiService } from '@/lib/ai';
import type { MoveDefinition } from '@/types';

interface MoveImportAssistantProps {
  onImport: (definition: MoveDefinition) => void;
  onCancel: () => void;
}

export function MoveImportAssistant({ onImport, onCancel }: MoveImportAssistantProps) {
  const { settings } = useAIStore();
  const [sourceCode, setSourceCode] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<MoveDefinition | null>(null);

  const handleAnalyze = async () => {
    if (!sourceCode.trim() || !settings.enabled) return;

    setIsProcessing(true);
    setError(null);
    setPreview(null);

    try {
      const currentConfig = settings.providers[settings.provider];
      aiService.setAdapter(settings.provider, currentConfig);
      const result = await aiService.parseMoveModule(sourceCode);

      if (result.success && result.definition) {
        setPreview(result.definition);
      } else {
        setError(result.error || 'Failed to parse Move module');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze Move module');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirm = () => {
    if (preview) {
      onImport(preview);
    }
  };

  if (!settings.enabled) {
    return (
      <div className="text-center py-8">
        <Image
          src="/brand/coco-paw.png"
          alt="Coco"
          width={48}
          height={48}
          className="mx-auto opacity-50 mb-4"
        />
        <p className="text-coco-text-secondary mb-2">AI features are disabled</p>
        <p className="text-sm text-coco-text-tertiary">
          Enable AI in settings to use the Move import assistant.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-coco-text-secondary">
        <Sparkles className="w-4 h-4 text-coco-accent" />
        <span>Paste your Move module source code and let Coco extract the definitions</span>
      </div>

      {/* Source Code Input */}
      <div>
        <textarea
          value={sourceCode}
          onChange={(e) => setSourceCode(e.target.value)}
          placeholder={`module my_module::example {
    struct MyStruct has key {
        value: u64
    }

    public entry fun initialize(account: &signer) {
        // ...
    }

    public fun get_value(addr: address): u64 {
        // ...
    }
}`}
          rows={12}
          className="w-full px-3 py-2 text-sm font-mono bg-coco-bg-primary border border-coco-border-default rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-coco-accent"
          disabled={isProcessing}
        />
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 bg-coco-error/10 border border-coco-error/20 rounded-lg text-sm text-coco-error">
          {error}
        </div>
      )}

      {/* Preview */}
      {preview && (
        <div className="p-4 bg-coco-bg-secondary rounded-lg border border-coco-border-subtle">
          <div className="flex items-center gap-2 mb-3">
            <Check className="w-4 h-4 text-coco-success" />
            <span className="text-sm font-medium text-coco-text-primary">Analysis Complete</span>
          </div>

          <div className="space-y-2 text-sm">
            <div>
              <span className="text-coco-text-tertiary">Module: </span>
              <code className="text-coco-text-primary">{preview.moduleAddress}::{preview.moduleName}</code>
            </div>
            <div>
              <span className="text-coco-text-tertiary">Functions: </span>
              <span className="text-coco-text-primary">{preview.functions.length}</span>
            </div>
            <div>
              <span className="text-coco-text-tertiary">Structs: </span>
              <span className="text-coco-text-primary">{preview.structs.length}</span>
            </div>

            {/* Functions list */}
            {preview.functions.length > 0 && (
              <div className="mt-3 pt-3 border-t border-coco-border-subtle">
                <p className="text-xs font-medium text-coco-text-tertiary mb-2">Functions:</p>
                <ul className="space-y-1">
                  {preview.functions.map((fn, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-xs">
                      <span className={`px-1.5 py-0.5 rounded ${
                        fn.visibility === 'public' ? 'bg-coco-success/20 text-coco-success' :
                        fn.visibility === 'entry' ? 'bg-coco-accent/20 text-coco-accent' :
                        'bg-coco-bg-tertiary text-coco-text-tertiary'
                      }`}>
                        {fn.visibility}
                      </span>
                      <code className="text-coco-text-primary">{fn.name}</code>
                      {fn.isView && (
                        <span className="px-1.5 py-0.5 rounded bg-coco-warning/20 text-coco-warning">
                          view
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-2">
        <Button variant="secondary" onClick={onCancel}>
          <X className="w-4 h-4 mr-1" />
          Cancel
        </Button>

        {preview ? (
          <Button onClick={handleConfirm}>
            <Check className="w-4 h-4 mr-1" />
            Use This Definition
          </Button>
        ) : (
          <Button onClick={handleAnalyze} disabled={!sourceCode.trim() || isProcessing}>
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Image src="/brand/coco-paw.png" alt="" width={16} height={16} className="mr-1" />
                Analyze with Coco
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
