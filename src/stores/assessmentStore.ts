import { create } from 'zustand';
import type { PoseSequence } from '@/types/pose';

/** Current assessment capture state shared between capture and analysis pages. */
export interface AssessmentStoreState {
  /** Captured pose sequence waiting for analysis. */
  capturedSequence: PoseSequence | null;
  /** Store one captured pose sequence. */
  setCapturedSequence: (sequence: PoseSequence) => void;
  /** Clear transient assessment state. */
  clearCapturedSequence: () => void;
}

/** Zustand store for the current assessment workflow. */
export const useAssessmentStore = create<AssessmentStoreState>((set) => ({
  capturedSequence: null,
  clearCapturedSequence: () => {
    set({ capturedSequence: null });
  },
  setCapturedSequence: (sequence) => {
    set({ capturedSequence: sequence });
  },
}));
