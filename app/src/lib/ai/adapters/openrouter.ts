import type { AIContext } from '@/types';
import type { ChatMessage, ModelInfo } from '../types';
import { BaseAIAdapter } from './base';

export class OpenRouterAdapter extends BaseAIAdapter {
  provider = 'openrouter' as const;

  constructor(apiKey: string, model: string = 'anthropic/claude-3.5-sonnet') {
    super(apiKey, 'https://openrouter.ai/api', model);
  }

  async chat(messages: ChatMessage[], context?: AIContext): Promise<string> {
    const systemPrompt = this.buildSystemPrompt(context);

    const openRouterMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.filter((m) => m.role !== 'system'),
    ];

    const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
        'HTTP-Referer': window.location.origin,
        'X-Title': 'Coco Blockchain Development',
      },
      body: JSON.stringify({
        model: this.model,
        messages: openRouterMessages,
        max_tokens: 16384,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenRouter API error: ${error}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || '';
  }

  async listModels(): Promise<ModelInfo[]> {
    try {
      const response = await fetch(`${this.baseUrl}/v1/models`, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch models');
      }

      const data = await response.json();
      return data.data.map((m: { id: string; name: string; context_length?: number }) => ({
        id: m.id,
        name: m.name || m.id,
        provider: 'openrouter' as const,
        contextLength: m.context_length,
      }));
    } catch {
      return [
        { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'openrouter' },
        { id: 'anthropic/claude-3-opus', name: 'Claude 3 Opus', provider: 'openrouter' },
        { id: 'openai/gpt-4o', name: 'GPT-4o', provider: 'openrouter' },
        { id: 'google/gemini-pro-1.5', name: 'Gemini Pro 1.5', provider: 'openrouter' },
        { id: 'meta-llama/llama-3.1-405b-instruct', name: 'Llama 3.1 405B', provider: 'openrouter' },
      ];
    }
  }
}
