import { create } from 'zustand';

/**
 * Presentation-only preference store (Lane B). This is NOT the run/meta game
 * store (that is Lane A's `src/app` wiring) — it holds accessibility and juice
 * toggles that theme the UI: reduced motion, haptics, and sound.
 *
 * Reduced-motion mode per docs/lane-b/motion-spec.md: springs collapse to a
 * single-frame timing and durations clamp to 0, but haptics stay — they are
 * the reduced-motion feedback channel.
 *
 * Sound gates (music/SFX) are read by the `src/juice/audio` gateway; it also
 * subscribes here so flipping a toggle pauses or resumes playback live.
 */
interface PrefsState {
  reducedMotion: boolean;
  hapticsEnabled: boolean;
  musicEnabled: boolean;
  sfxEnabled: boolean;
  setReducedMotion: (value: boolean) => void;
  setHapticsEnabled: (value: boolean) => void;
  setMusicEnabled: (value: boolean) => void;
  setSfxEnabled: (value: boolean) => void;
}

export const usePrefs = create<PrefsState>((set) => ({
  reducedMotion: false,
  hapticsEnabled: true,
  musicEnabled: true,
  sfxEnabled: true,
  setReducedMotion: (value) => set({ reducedMotion: value }),
  setHapticsEnabled: (value) => set({ hapticsEnabled: value }),
  setMusicEnabled: (value) => set({ musicEnabled: value }),
  setSfxEnabled: (value) => set({ sfxEnabled: value }),
}));

/** Selector hook — read reduced-motion without subscribing to the whole store. */
export function useReducedMotion(): boolean {
  return usePrefs((state) => state.reducedMotion);
}
