import { create } from 'zustand';

/**
 * First-run onboarding flag (kickoff §9 — one hint, no tutorial walls). Shown
 * once, then persisted as seen. Lazily loads AsyncStorage so it stays out of
 * the Node test path; fail-safe (any error → treat as unseen, at worst the
 * hint shows once more).
 */

// v2: refreshed copy for the redesigned loop (supplier lean, synergy, daily
// target) — bumping the key re-shows the one-time hint to existing players.
const ONBOARDING_KEY = 'luckyShelf:onboarding:v2';

export interface OnboardingStoreState {
  seen: boolean;
  loaded: boolean;
  loadOnboarding(): Promise<void>;
  dismiss(): Promise<void>;
}

async function storage() {
  const mod = await import('@react-native-async-storage/async-storage');
  return mod.default;
}

export const useOnboardingStore = create<OnboardingStoreState>()((set, get) => ({
  seen: false,
  loaded: false,

  async loadOnboarding() {
    if (get().loaded) return;
    try {
      const value = await (await storage()).getItem(ONBOARDING_KEY);
      set({ seen: value === 'seen', loaded: true });
    } catch {
      set({ seen: false, loaded: true });
    }
  },

  async dismiss() {
    set({ seen: true });
    try {
      await (await storage()).setItem(ONBOARDING_KEY, 'seen');
    } catch {
      // best-effort; the in-memory flag still hides it for this session
    }
  },
}));
