'use client';

import { useState, useEffect } from 'react';
import { Key, RefreshCw, Check, X } from 'lucide-react';
import { Modal, Button, Input } from '@/components/ui';
import { useAIStore } from '@/stores';
import { aiService } from '@/lib/ai';
import type { AIProvider } from '@/types';
import type { ModelInfo } from '@/lib/ai/types';

interface AISettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PROVIDER_INFO: Record<AIProvider, { name: string; needsApiKey: boolean; needsBaseUrl: boolean }> = {
  openrouter: { name: 'OpenRouter', needsApiKey: true, needsBaseUrl: false },
  anthropic: { name: 'Anthropic', needsApiKey: true, needsBaseUrl: false },
  openai: { name: 'OpenAI', needsApiKey: true, needsBaseUrl: false },
  google: { name: 'Google AI', needsApiKey: true, needsBaseUrl: false },
  ollama: { name: 'Ollama (Local)', needsApiKey: false, needsBaseUrl: true },
  lmstudio: { name: 'LM Studio (Local)', needsApiKey: false, needsBaseUrl: true },
};

export function AISettingsModal({ isOpen, onClose }: AISettingsModalProps) {
  const { settings, setEnabled, setProvider, updateProviderConfig } = useAIStore();
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');

  const currentConfig = settings.providers[settings.provider];
  const providerInfo = PROVIDER_INFO[settings.provider];

  // Load models when provider or config changes
  useEffect(() => {
    if (isOpen && currentConfig) {
      loadModels();
    }
  }, [isOpen, settings.provider, currentConfig?.apiKey, currentConfig?.baseUrl]);

  const loadModels = async () => {
    setLoadingModels(true);
    try {
      const fetchedModels = await aiService.listModels(settings.provider, currentConfig);
      setModels(fetchedModels);
    } catch (error) {
      console.error('Failed to load models:', error);
      setModels([]);
    } finally {
      setLoadingModels(false);
    }
  };

  const testConnection = async () => {
    setTestStatus('testing');
    try {
      aiService.setAdapter(settings.provider, currentConfig);
      await aiService.chat('Say "Hello" in one word.');
      setTestStatus('success');
      setTimeout(() => setTestStatus('idle'), 3000);
    } catch {
      setTestStatus('error');
      setTimeout(() => setTestStatus('idle'), 3000);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="AI Settings" size="md">
      <div className="space-y-6">
        {/* Enable/Disable Toggle */}
        <div className="flex items-center justify-between p-4 bg-coco-bg-secondary rounded-lg">
          <div>
            <h3 className="font-medium text-coco-text-primary">AI Features</h3>
            <p className="text-sm text-coco-text-secondary">Enable Coco AI assistance</p>
          </div>
          <button
            onClick={() => setEnabled(!settings.enabled)}
            className={`relative w-12 h-6 rounded-full transition-colors ${
              settings.enabled ? 'bg-coco-accent' : 'bg-coco-bg-tertiary'
            }`}
          >
            <span
              className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                settings.enabled ? 'translate-x-6' : ''
              }`}
            />
          </button>
        </div>

        {/* Provider Selection */}
        <div>
          <label className="block text-sm font-medium text-coco-text-secondary mb-2">
            AI Provider
          </label>
          <select
            value={settings.provider}
            onChange={(e) => setProvider(e.target.value as AIProvider)}
            className="w-full px-3 py-2 text-sm bg-coco-bg-primary border border-coco-border-default rounded-md focus:outline-none focus:ring-2 focus:ring-coco-accent"
          >
            {Object.entries(PROVIDER_INFO).map(([key, info]) => (
              <option key={key} value={key}>
                {info.name}
              </option>
            ))}
          </select>
        </div>

        {/* API Key */}
        {providerInfo.needsApiKey && (
          <div>
            <label className="block text-sm font-medium text-coco-text-secondary mb-2">
              <Key className="w-4 h-4 inline mr-1" />
              API Key
            </label>
            <Input
              type="password"
              value={currentConfig.apiKey || ''}
              onChange={(e) => updateProviderConfig(settings.provider, { apiKey: e.target.value })}
              placeholder={`Enter your ${providerInfo.name} API key`}
            />
          </div>
        )}

        {/* Base URL for local providers */}
        {providerInfo.needsBaseUrl && (
          <div>
            <label className="block text-sm font-medium text-coco-text-secondary mb-2">
              Base URL
            </label>
            <Input
              value={currentConfig.baseUrl || ''}
              onChange={(e) => updateProviderConfig(settings.provider, { baseUrl: e.target.value })}
              placeholder={settings.provider === 'ollama' ? 'http://localhost:11434' : 'http://localhost:1234'}
            />
          </div>
        )}

        {/* Model Selection */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-coco-text-secondary">Model</label>
            <button
              onClick={loadModels}
              disabled={loadingModels}
              className="text-xs text-coco-accent hover:underline flex items-center gap-1"
            >
              <RefreshCw className={`w-3 h-3 ${loadingModels ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {providerInfo.needsBaseUrl ? (
            // For local models, allow manual entry
            <Input
              value={currentConfig.selectedModel || ''}
              onChange={(e) => updateProviderConfig(settings.provider, { selectedModel: e.target.value })}
              placeholder="Enter model name (e.g., llama3.1)"
            />
          ) : (
            <select
              value={currentConfig.selectedModel || ''}
              onChange={(e) => updateProviderConfig(settings.provider, { selectedModel: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-coco-bg-primary border border-coco-border-default rounded-md focus:outline-none focus:ring-2 focus:ring-coco-accent"
            >
              <option value="">Select a model</option>
              {models.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name}
                </option>
              ))}
            </select>
          )}

          {loadingModels && (
            <p className="text-xs text-coco-text-tertiary mt-1">Loading models...</p>
          )}
        </div>

        {/* Test Connection */}
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            onClick={testConnection}
            disabled={testStatus === 'testing' || !currentConfig.selectedModel}
          >
            {testStatus === 'testing' ? 'Testing...' : 'Test Connection'}
          </Button>
          {testStatus === 'success' && (
            <span className="text-sm text-coco-success flex items-center gap-1">
              <Check className="w-4 h-4" /> Connected
            </span>
          )}
          {testStatus === 'error' && (
            <span className="text-sm text-coco-error flex items-center gap-1">
              <X className="w-4 h-4" /> Failed
            </span>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-coco-border-subtle">
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      </div>
    </Modal>
  );
}
