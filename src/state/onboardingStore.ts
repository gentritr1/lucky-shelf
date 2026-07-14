import { create } from 'zustand';

/**
 * First-run contextual onboarding (kickoff §9 — no tutorial walls). The current
 * action is persisted so a resumed run never restarts the tour or explains a
 * verb the player already completed. Lazily loads AsyncStorage so it stays out
 * of the Node test path; fail-safe (any error → start at the first action).
 */

const ONBOARDING_KEY = 'luckyShelf:onboarding:v3';

export type OnboardingStep = 'supplier' | 'draft' | 'place' | 'open' | 'done';

const STEP_ORDER: readonly OnboardingStep[] = ['supplier', 'draft', 'place', 'open', 'done'];

export function isOnboardingStep(value: string | null): value is OnboardingStep {
  return value !== null && STEP_ORDER.includes(value as OnboardingStep);
}

export function laterOnboardingStep(
  current: OnboardingStep,
  requested: OnboardingStep,
): OnboardingStep {
  return STEP_ORDER.indexOf(requested) > STEP_ORDER.indexOf(current) ? requested : current;
}

export interface OnboardingStoreState {
  step: OnboardingStep;
  loaded: boolean;
  loadOnboarding(): Promise<void>;
  syncTo(step: Exclude<OnboardingStep, 'done'>): Promise<void>;
  complete(): Promise<void>;
  dismiss(): Promise<void>;
}

async function storage() {
  const mod = await import('@react-native-async-storage/async-storage');
  return mod.default;
}

export const useOnboardingStore = create<OnboardingStoreState>()((set, get) => ({
  step: 'supplier',
  loaded: false,

  async loadOnboarding() {
    if (get().loaded) return;
    try {
      const value = await (await storage()).getItem(ONBOARDING_KEY);
      set({ step: isOnboardingStep(value) ? value : 'supplier', loaded: true });
    } catch {
      set({ step: 'supplier', loaded: true });
    }
  },

  async syncTo(requested) {
    if (!get().loaded) await get().loadOnboarding();
    const step = laterOnboardingStep(get().step, requested);
    if (step === get().step) return;
    set({ step });
    try {
      await (await storage()).setItem(ONBOARDING_KEY, step);
    } catch {
      // best-effort; the in-memory stage remains correct for this session
    }
  },

  async complete() {
    if (!get().loaded) await get().loadOnboarding();
    set({ step: 'done' });
    try {
      await (await storage()).setItem(ONBOARDING_KEY, 'done');
    } catch {
      // best-effort; the in-memory stage still completes the tour
    }
  },

  async dismiss() {
    await get().complete();
  },
}));
