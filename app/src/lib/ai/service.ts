import type { AIProvider, AIProviderConfig, AIContext, MoveDefinition } from '@/types';
import type { AIAdapter, ChatMessage, ModelInfo, MoveModuleParseResult, ABIGenerationResult, ErrorExplanation } from './types';
import {
  AnthropicAdapter,
  OpenAIAdapter,
  GoogleAdapter,
  OpenRouterAdapter,
  OllamaAdapter,
  LMStudioAdapter,
} from './adapters';

class AIService {
  private adapter: AIAdapter | null = null;

  createAdapter(provider: AIProvider, config: AIProviderConfig): AIAdapter {
    switch (provider) {
      case 'anthropic':
        return new AnthropicAdapter(config.apiKey || '', config.selectedModel || 'claude-sonnet-4-20250514');
      case 'openai':
        return new OpenAIAdapter(config.apiKey || '', config.selectedModel || 'gpt-4o');
      case 'google':
        return new GoogleAdapter(config.apiKey || '', config.selectedModel || 'gemini-1.5-pro');
      case 'openrouter':
        return new OpenRouterAdapter(config.apiKey || '', config.selectedModel || 'anthropic/claude-3.5-sonnet');
      case 'ollama':
        return new OllamaAdapter(config.baseUrl || 'http://localhost:11434', config.selectedModel || '');
      case 'lmstudio':
        return new LMStudioAdapter(config.baseUrl || 'http://localhost:1234', config.selectedModel || '');
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
  }

  setAdapter(provider: AIProvider, config: AIProviderConfig): void {
    this.adapter = this.createAdapter(provider, config);
  }

  async chat(userMessage: string, context?: AIContext): Promise<string> {
    if (!this.adapter) {
      throw new Error('AI adapter not configured');
    }

    const messages: ChatMessage[] = [{ role: 'user', content: userMessage }];
    return this.adapter.chat(messages, context);
  }

  async chatWithHistory(messages: ChatMessage[], context?: AIContext, isFirstMessage?: boolean): Promise<string> {
    if (!this.adapter) {
      throw new Error('AI adapter not configured');
    }

    // Only include full context (recent actions, etc.) on first message
    // For subsequent messages, just include basic context
    const contextToUse = isFirstMessage ? context : {
      ecosystem: context?.ecosystem,
      chainId: context?.chainId,
      enableActions: context?.enableActions,
      // Omit recentActions and other heavy context for follow-up messages
    };

    return this.adapter.chat(messages, contextToUse);
  }

  async listModels(provider: AIProvider, config: AIProviderConfig): Promise<ModelInfo[]> {
    const adapter = this.createAdapter(provider, config);
    return adapter.listModels();
  }

  async parseMoveModule(sourceCode: string): Promise<MoveModuleParseResult> {
    if (!this.adapter) {
      throw new Error('AI adapter not configured');
    }

    const prompt = `Analyze the following Move module source code and extract its structure.

IMPORTANT: For function parameters:
- If a function has ONLY ONE signer parameter (e.g., "signer: &signer" or "account: &signer"), OMIT it entirely from the params array. This signer is the transaction sender and does not need to be specified.
- If a function has MULTIPLE signer parameters, include ALL of them in the params array (multi-signer support will be added later, but we need to track them).
- Include all non-signer parameters normally.

Return a JSON object with this exact structure:
{
  "moduleName": "the module name",
  "moduleAddress": "the module address (e.g., 0x1)",
  "functions": [
    {
      "name": "function_name",
      "visibility": "public" | "entry" | "private",
      "params": [{"name": "param_name", "type": "param_type"}],
      "typeParams": ["T"], // optional generic type params
      "returnType": ["return_type"], // optional
      "isView": true/false // true if it's a view function
    }
  ],
  "structs": [
    {
      "name": "StructName",
      "fields": [{"name": "field_name", "type": "field_type"}]
    }
  ]
}

Source code:
\`\`\`move
${sourceCode}
\`\`\`

Return ONLY the JSON object, no additional text.`;

    try {
      const response = await this.adapter.chat([{ role: 'user', content: prompt }]);

      // Extract JSON from response (handle markdown code blocks)
      let jsonStr = response.trim();
      if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
      }

      const definition: MoveDefinition = JSON.parse(jsonStr);
      return { success: true, definition };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to parse Move module',
      };
    }
  }

  async generateABI(sourceCode: string, language: 'solidity' | 'vyper' = 'solidity'): Promise<ABIGenerationResult> {
    if (!this.adapter) {
      throw new Error('AI adapter not configured');
    }

    const prompt = `Analyze the following ${language} smart contract source code and generate its ABI.

Return a JSON array representing the ABI with this structure:
[
  {
    "type": "function" | "event" | "constructor",
    "name": "functionName",
    "inputs": [{"name": "paramName", "type": "uint256", "internalType": "uint256"}],
    "outputs": [{"name": "", "type": "bool", "internalType": "bool"}],
    "stateMutability": "view" | "pure" | "nonpayable" | "payable"
  }
]

Source code:
\`\`\`${language}
${sourceCode}
\`\`\`

Return ONLY the JSON array, no additional text.`;

    try {
      const response = await this.adapter.chat([{ role: 'user', content: prompt }]);

      // Extract JSON from response
      let jsonStr = response.trim();
      if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
      }

      const abi = JSON.parse(jsonStr);
      return { success: true, abi };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate ABI',
      };
    }
  }

  async explainError(errorMessage: string, context?: AIContext): Promise<ErrorExplanation> {
    if (!this.adapter) {
      throw new Error('AI adapter not configured');
    }

    const ecosystemContext = context?.ecosystem ? `This is a ${context.ecosystem} transaction.` : '';

    const prompt = `Explain the following blockchain transaction error in a helpful way.

${ecosystemContext}

Error message:
${errorMessage}

Provide your response in this JSON format:
{
  "summary": "A one-line summary of what went wrong",
  "details": "A more detailed explanation of the error",
  "suggestions": ["Suggestion 1 to fix the issue", "Suggestion 2", "etc"]
}

Return ONLY the JSON object, no additional text.`;

    try {
      const response = await this.adapter.chat([{ role: 'user', content: prompt }], context);

      // Extract JSON from response
      let jsonStr = response.trim();
      if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
      }

      return JSON.parse(jsonStr);
    } catch {
      return {
        summary: 'Unable to analyze error',
        details: errorMessage,
        suggestions: ['Check the transaction parameters', 'Ensure you have sufficient funds', 'Verify the contract address'],
      };
    }
  }
}

export const aiService = new AIService();
