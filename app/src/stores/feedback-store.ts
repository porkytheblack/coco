import { create } from 'zustand';
import type { FeedbackCategory } from '@oasis/sdk';
import { getOasis } from '@/lib/oasis';

export type FeedbackStatus = 'idle' | 'submitting' | 'success' | 'error';

const LOCAL_FEEDBACK_KEY = 'coco-pending-feedback';

interface LocalFeedbackEntry {
  category: FeedbackCategory;
  message: string;
  email?: string;
  timestamp: string;
}

/**
 * Save feedback to localStorage when oasis is not configured.
 * These can be flushed later once the service is available.
 */
function saveLocally(category: FeedbackCategory, message: string, email?: string): void {
  try {
    const existing: LocalFeedbackEntry[] = JSON.parse(localStorage.getItem(LOCAL_FEEDBACK_KEY) || '[]');
    existing.push({ category, message, email, timestamp: new Date().toISOString() });
    // Keep at most 50 entries
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

    const oasis = getOasis();
    if (!oasis) {
      // Oasis not configured - save locally and treat as success.
      // Feedback will be available for manual export or flushed when configured.
      saveLocally(category, message, email);
      set({ status: 'success' });
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
