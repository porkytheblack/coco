import type { AIContext } from '@/types';
import type { ChatMessage, ModelInfo } from '../types';
import { BaseAIAdapter } from './base';

export class LMStudioAdapter extends BaseAIAdapter {
  provider = 'lmstudio' as const;

  constructor(baseUrl: string = 'http://localhost:1234', model: string = '') {
    super('', baseUrl, model);
  }

  async chat(messages: ChatMessage[], context?: AIContext): Promise<string> {
    const systemPrompt = this.buildSystemPrompt(context);

    const lmMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.filter((m) => m.role !== 'system'),
    ];

    const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model || 'local-model',
        messages: lmMessages,
        max_tokens: 16384,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`LM Studio API error: ${error}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || '';
  }

  async listModels(): Promise<ModelInfo[]> {
    try {
      const response = await fetch(`${this.baseUrl}/v1/models`);

      if (!response.ok) {
        throw new Error('Failed to fetch models');
      }

      const data = await response.json();
      return data.data.map((m: { id: string }) => ({
        id: m.id,
        name: m.id,
        provider: 'lmstudio' as const,
      }));
    } catch {
      return [];
    }
  }
}
