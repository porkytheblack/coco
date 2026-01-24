import type { AIProvider, AIContext } from '@/types';
import type { AIAdapter, ChatMessage, ModelInfo } from '../types';

export abstract class BaseAIAdapter implements AIAdapter {
  abstract provider: AIProvider;
  protected apiKey: string;
  protected baseUrl: string;
  protected model: string;

  constructor(apiKey: string, baseUrl: string, model: string) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
    this.model = model;
  }

  abstract chat(messages: ChatMessage[], context?: AIContext): Promise<string>;
  abstract listModels(): Promise<ModelInfo[]>;

  protected buildSystemPrompt(context?: AIContext): string {
    let systemPrompt = `You are Coco, a helpful AI assistant for blockchain development. You help users with:
- Understanding smart contracts (EVM, Solana, Aptos)
- Explaining transaction errors
- Generating contract interfaces (ABI, IDL, Move definitions)
- Answering questions about blockchain development

Be concise, technical, and helpful. When explaining errors, provide actionable suggestions.`;

    if (context?.ecosystem) {
      systemPrompt += `\n\nCurrent ecosystem: ${context.ecosystem}`;
    }
    if (context?.errorMessage) {
      systemPrompt += `\n\nUser is asking about this error: ${context.errorMessage}`;
    }
    if (context?.sourceCode) {
      systemPrompt += `\n\nSource code context:\n${context.sourceCode}`;
    }

    return systemPrompt;
  }
}
