import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AIProvider, AIProviderConfig, AIMessage, AISettings } from '@/types';

interface AIState {
  // Settings
  settings: AISettings;

  // Chat state
  chatHistory: AIMessage[];
  currentHistoryIndex: number;
  isProcessing: boolean;

  // Actions
  setEnabled: (enabled: boolean) => void;
  setProvider: (provider: AIProvider) => void;
  updateProviderConfig: (provider: AIProvider, config: Partial<AIProviderConfig>) => void;

  // Chat actions
  addMessage: (message: Omit<AIMessage, 'id' | 'timestamp'>) => void;
  clearChat: () => void;
  navigateHistory: (direction: 'prev' | 'next') => void;
  setProcessing: (processing: boolean) => void;
}

const defaultProviders: Record<AIProvider, AIProviderConfig> = {
  openrouter: { provider: 'openrouter', apiKey: '', selectedModel: '' },
  anthropic: { provider: 'anthropic', apiKey: '', selectedModel: 'claude-sonnet-4-20250514' },
  openai: { provider: 'openai', apiKey: '', selectedModel: 'gpt-4o' },
  google: { provider: 'google', apiKey: '', selectedModel: 'gemini-1.5-pro' },
  ollama: { provider: 'ollama', baseUrl: 'http://localhost:11434', selectedModel: '' },
  lmstudio: { provider: 'lmstudio', baseUrl: 'http://localhost:1234', selectedModel: '' },
};

export const useAIStore = create<AIState>()(
  persist(
    (set, get) => ({
      settings: {
        enabled: false,
        provider: 'anthropic',
        providers: defaultProviders,
      },

      chatHistory: [],
      currentHistoryIndex: -1,
      isProcessing: false,

      setEnabled: (enabled: boolean) => {
        set((state) => ({
          settings: { ...state.settings, enabled },
        }));
      },

      setProvider: (provider: AIProvider) => {
        set((state) => ({
          settings: { ...state.settings, provider },
        }));
      },

      updateProviderConfig: (provider: AIProvider, config: Partial<AIProviderConfig>) => {
        set((state) => ({
          settings: {
            ...state.settings,
            providers: {
              ...state.settings.providers,
              [provider]: {
                ...state.settings.providers[provider],
                ...config,
              },
            },
          },
        }));
      },

      addMessage: (message) => {
        const newMessage: AIMessage = {
          ...message,
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
        };
        set((state) => ({
          chatHistory: [...state.chatHistory, newMessage],
          currentHistoryIndex: state.chatHistory.length, // Point to the new message
        }));
      },

      clearChat: () => {
        set({ chatHistory: [], currentHistoryIndex: -1 });
      },

      navigateHistory: (direction) => {
        const { chatHistory, currentHistoryIndex } = get();
        // Find assistant messages only for navigation
        const assistantIndices = chatHistory
          .map((msg, idx) => (msg.role === 'assistant' ? idx : -1))
          .filter((idx) => idx !== -1);

        if (assistantIndices.length === 0) return;

        const currentAssistantIdx = assistantIndices.indexOf(currentHistoryIndex);
        let newIdx: number;

        if (direction === 'prev') {
          if (currentAssistantIdx <= 0) {
            newIdx = assistantIndices[assistantIndices.length - 1];
          } else {
            newIdx = assistantIndices[currentAssistantIdx - 1];
          }
        } else {
          if (currentAssistantIdx >= assistantIndices.length - 1 || currentAssistantIdx === -1) {
            newIdx = assistantIndices[0];
          } else {
            newIdx = assistantIndices[currentAssistantIdx + 1];
          }
        }

        set({ currentHistoryIndex: newIdx });
      },

      setProcessing: (processing: boolean) => {
        set({ isProcessing: processing });
      },
    }),
    {
      name: 'coco-ai',
      partialize: (state) => ({
        settings: state.settings,
        // Don't persist chat history
      }),
    }
  )
);
