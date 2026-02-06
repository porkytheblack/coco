import { create } from 'zustand';
import type { FeedbackCategory } from '@oasis/sdk';
import { isOasisConfigured, submitFeedbackDirect } from '@/lib/oasis';

export type FeedbackStatus = 'idle' | 'submitting' | 'success' | 'error';

const LOCAL_FEEDBACK_KEY = 'coco-pending-feedback';

/**
 * Save feedback to localStorage when oasis is not configured.
 */
function saveLocally(category: FeedbackCategory, message: string, email?: string): void {
  try {
    const existing = JSON.parse(localStorage.getItem(LOCAL_FEEDBACK_KEY) || '[]');
    existing.push({ category, message, email, timestamp: new Date().toISOString() });
    localStorage.setItem(LOCAL_FEEDBACK_KEY, JSON.stringify(existing.slice(-50)));
  } catch {
    // localStorage unavailable - ignore
  }
}

interface FeedbackState {
  isOpen: boolean;
  status: FeedbackStatus;
  errorMessage: string | null;

  openDialog: () => void;
  closeDialog: () => void;
  submitFeedback: (category: FeedbackCategory, message: string, email?: string) => Promise<void>;
  reset: () => void;
}

export const useFeedbackStore = create<FeedbackState>((set) => ({
  isOpen: false,
  status: 'idle',
  errorMessage: null,

  openDialog: () => set({ isOpen: true, status: 'idle', errorMessage: null }),

  closeDialog: () => set({ isOpen: false, status: 'idle', errorMessage: null }),

  submitFeedback: async (category, message, email) => {
    set({ status: 'submitting', errorMessage: null });

    if (!isOasisConfigured()) {
      saveLocally(category, message, email);
      set({ status: 'success' });
      return;
    }

    try {
      await submitFeedbackDirect(category, message, email);
      set({ status: 'success' });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to submit feedback';
      set({ status: 'error', errorMessage: msg });
    }
  },

  reset: () => set({ status: 'idle', errorMessage: null }),
}));
