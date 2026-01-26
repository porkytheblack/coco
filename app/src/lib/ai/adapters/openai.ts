import type { AIContext } from '@/types';
import type { ChatMessage, ModelInfo } from '../types';
import { BaseAIAdapter } from './base';

export class OpenAIAdapter extends BaseAIAdapter {
  provider = 'openai' as const;

  constructor(apiKey: string, model: string = 'gpt-4o') {
    super(apiKey, 'https://api.openai.com', model);
  }

  async chat(messages: ChatMessage[], context?: AIContext): Promise<string> {
    const systemPrompt = this.buildSystemPrompt(context, context?.enableActions);

    const openaiMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.filter((m) => m.role !== 'system'),
    ];

    const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: openaiMessages,
        max_tokens: 16384,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${error}`);
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
      return data.data
        .filter((m: { id: string }) => m.id.startsWith('gpt-'))
        .map((m: { id: string }) => ({
          id: m.id,
          name: m.id,
          provider: 'openai' as const,
        }));
    } catch {
      // Return known models as fallback
      return [
        { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai' },
        { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'openai' },
        { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', provider: 'openai' },
        { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', provider: 'openai' },
      ];
    }
  }
}
