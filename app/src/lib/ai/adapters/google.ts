import type { AIContext } from '@/types';
import type { ChatMessage, ModelInfo } from '../types';
import { BaseAIAdapter } from './base';

export class GoogleAdapter extends BaseAIAdapter {
  provider = 'google' as const;

  constructor(apiKey: string, model: string = 'gemini-1.5-pro') {
    super(apiKey, 'https://generativelanguage.googleapis.com', model);
  }

  async chat(messages: ChatMessage[], context?: AIContext): Promise<string> {
    const systemPrompt = this.buildSystemPrompt(context, context?.enableActions);

    // Convert to Gemini format
    const contents = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

    const response = await fetch(
      `${this.baseUrl}/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents,
          systemInstruction: {
            parts: [{ text: systemPrompt }],
          },
          generationConfig: {
            maxOutputTokens: 16384,
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Google AI API error: ${error}`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }

  async listModels(): Promise<ModelInfo[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/v1beta/models?key=${this.apiKey}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch models');
      }

      const data = await response.json();
      return data.models
        .filter((m: { name: string }) => m.name.includes('gemini'))
        .map((m: { name: string; displayName: string }) => ({
          id: m.name.replace('models/', ''),
          name: m.displayName,
          provider: 'google' as const,
        }));
    } catch {
      return [
        { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', provider: 'google' },
        { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', provider: 'google' },
        { id: 'gemini-pro', name: 'Gemini Pro', provider: 'google' },
      ];
    }
  }
}
