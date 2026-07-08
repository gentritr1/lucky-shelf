import { create } from 'zustand';

import { DEFAULT_PREFS, type PersistedPrefs, type TextScale } from '@/persistence/prefs';

/**
 * Presentation-only preference store (Lane B). This is NOT the run/meta game
 * store — it holds accessibility and juice toggles that theme the UI: reduced
 * motion, haptics, sound, and (B-M7) large text + high contrast.
 *
 * Reduced-motion mode per docs/lane-b/motion-spec.md: springs collapse to a
 * single-frame timing and durations clamp to 0, but haptics stay — they are
 * the reduced-motion feedback channel.
 *
 * Sound gates (music/SFX) are read by the `src/juice/audio` gateway; it also
 * subscribes here so flipping a toggle pauses or resumes playback live.
 *
 * Persistence (B-M7): the store used to be in-memory only — every launch reset
 * every toggle. Now it hydrates from AsyncStorage at boot (`loadPrefs`, called
 * from `_layout`) and writes on every change. Writes are LOAD-GUARDED (the
 * standing catalog-wipe scar): nothing persists until hydration completes, so
 * the pre-load defaults can never clobber a real save. AsyncStorage is
 * lazy-imported so it stays out of the Node/test path.
 */
export type { TextScale } from '@/persistence/prefs';

interface PrefsState extends PersistedPrefs {
  /** True once `loadPrefs` has hydrated (or failed safe). Gates persistence. */
  loaded: boolean;
  loadPrefs: () => Promise<void>;
  setReducedMotion: (value: boolean) => void;
  setHapticsEnabled: (value: boolean) => void;
  setMusicEnabled: (value: boolean) => void;
  setSfxEnabled: (value: boolean) => void;
  setTextScale: (value: TextScale) => void;
  setHighContrast: (value: boolean) => void;
}

async function prefsPersistence() {
  const mod = await import('@/persistence/asyncStorage');
  return mod.asyncStoragePrefsPersistence;
}

export const usePrefs = create<PrefsState>((set, get) => {
  /** Write current prefs — only after hydration, so defaults never clobber. */
  const persist = () => {
    if (!get().loaded) return;
    const { reducedMotion, hapticsEnabled, musicEnabled, sfxEnabled, textScale, highContrast } = get();
    void prefsPersistence()
      .then((p) => p.savePrefs({ reducedMotion, hapticsEnabled, musicEnabled, sfxEnabled, textScale, highContrast }))
      .catch(() => undefined);
  };

  return {
    ...DEFAULT_PREFS,
    loaded: false,

    async loadPrefs() {
      if (get().loaded) return;
      try {
        const loaded = await (await prefsPersistence()).loadPrefs();
        set({ ...loaded, loaded: true });
      } catch {
        // best-effort: defaults are already in place
        set({ loaded: true });
      }
    },

    setReducedMotion: (value) => {
      set({ reducedMotion: value });
      persist();
    },
    setHapticsEnabled: (value) => {
      set({ hapticsEnabled: value });
      persist();
    },
    setMusicEnabled: (value) => {
      set({ musicEnabled: value });
      persist();
    },
    setSfxEnabled: (value) => {
      set({ sfxEnabled: value });
      persist();
    },
    setTextScale: (value) => {
      set({ textScale: value });
      persist();
    },
    setHighContrast: (value) => {
      set({ highContrast: value });
      persist();
    },
  };
});

/** Selector hook — read reduced-motion without subscribing to the whole store. */
export function useReducedMotion(): boolean {
  return usePrefs((state) => state.reducedMotion);
}

/** Selector hook — the large-text scale (1 | 1.15 | 1.3). */
export function useTextScale(): TextScale {
  return usePrefs((state) => state.textScale);
}

/** Selector hook — whether high-contrast theming is on. */
export function useHighContrast(): boolean {
  return usePrefs((state) => state.highContrast);
}
