import { create } from 'zustand';
import type { FeedbackCategory } from '@oasis/sdk';
import { getOasis } from '@/lib/oasis';

export type FeedbackStatus = 'idle' | 'submitting' | 'success' | 'error';

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

    const oasis = getOasis();
    if (!oasis) {
      set({ status: 'error', errorMessage: 'Feedback service is not configured.' });
      return;
    }

    try {
      await oasis.feedback.submit({ category, message, email });
      set({ status: 'success' });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to submit feedback';
      set({ status: 'error', errorMessage: msg });
    }
  },

  reset: () => set({ status: 'idle', errorMessage: null }),
}));
