import { create } from 'zustand';

/** Active navigation guard shown before leaving a sensitive workflow. */
export interface NavigationGuard {
  /** Whether app navigation should ask for confirmation. */
  isBlocked: boolean;
  /** Confirmation message shown to the operator. */
  message: string;
}

/** Navigation guard state shared by the app shell and recording pages. */
export interface NavigationGuardStoreState extends NavigationGuard {
  /** Enable a confirmation prompt before route changes. */
  blockNavigation: (message: string) => void;
  /** Disable the active route-change confirmation prompt. */
  unblockNavigation: () => void;
}

/** Zustand store for preventing accidental data loss during recording. */
export const useNavigationGuardStore = create<NavigationGuardStoreState>((set) => ({
  blockNavigation: (message) => {
    set({ isBlocked: true, message });
  },
  isBlocked: false,
  message: '',
  unblockNavigation: () => {
    set({ isBlocked: false, message: '' });
  },
}));
