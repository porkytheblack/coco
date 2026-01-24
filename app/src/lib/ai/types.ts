import type { AIProvider, AIContext, MoveDefinition } from '@/types';

export interface AIAdapter {
  provider: AIProvider;
  chat(messages: ChatMessage[], context?: AIContext): Promise<string>;
  listModels(): Promise<ModelInfo[]>;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ModelInfo {
  id: string;
  name: string;
  provider: AIProvider;
  contextLength?: number;
}

export interface MoveModuleParseResult {
  success: boolean;
  definition?: MoveDefinition;
  error?: string;
}

export interface ABIGenerationResult {
  success: boolean;
  abi?: object[];
  error?: string;
}

export interface ErrorExplanation {
  summary: string;
  details: string;
  suggestions: string[];
}
