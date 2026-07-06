import { create } from 'zustand';

/**
 * Presentation-only preference store (Lane B). This is NOT the run/meta game
 * store (that is Lane A's `src/app` wiring) — it holds accessibility and juice
 * toggles that theme the UI: reduced motion and haptics.
 *
 * Reduced-motion mode per docs/lane-b/motion-spec.md: springs collapse to a
 * single-frame timing and durations clamp to 0, but haptics stay — they are
 * the reduced-motion feedback channel.
 */
interface PrefsState {
  reducedMotion: boolean;
  hapticsEnabled: boolean;
  setReducedMotion: (value: boolean) => void;
  setHapticsEnabled: (value: boolean) => void;
}

export const usePrefs = create<PrefsState>((set) => ({
  reducedMotion: false,
  hapticsEnabled: true,
  setReducedMotion: (value) => set({ reducedMotion: value }),
  setHapticsEnabled: (value) => set({ hapticsEnabled: value }),
}));

/** Selector hook — read reduced-motion without subscribing to the whole store. */
export function useReducedMotion(): boolean {
  return usePrefs((state) => state.reducedMotion);
}
