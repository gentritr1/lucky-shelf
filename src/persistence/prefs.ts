import { z } from 'zod';

import type { KeyValueStorage } from './index';

/**
 * Presentation-preference persistence (B-M7 accessibility floor). The prefs
 * store (`src/ui/prefs.ts`) was previously in-memory only — every launch reset
 * reduced-motion / sound / haptics and (new) large-text / high-contrast. This
 * makes those choices survive relaunch.
 *
 * Old-shape safety (the standing catalog-wipe scar): every field is OPTIONAL and
 * loads merged over `DEFAULT_PREFS`, exactly like the B-M5 daily `streak` field.
 * A pre-B-M7 save (only the four original toggles) — or an empty/corrupt blob, or
 * a *future* save with fields this version doesn't know — loads loss-free instead
 * of wiping. This is presentation-only data (no run/meta state), but the load
 * path is still guarded so a bad read never clobbers a good save.
 */

export const PrefsSaveKey = 'luckyShelf:prefs:v1';
export const PrefsSaveSchemaVersion = 1;

/** Large-text steps (B-M7): 1.0 baseline, 1.15 comfortable, 1.3 large. */
export type TextScale = 1 | 1.15 | 1.3;
export const TEXT_SCALES: readonly TextScale[] = [1, 1.15, 1.3];

export interface PersistedPrefs {
  reducedMotion: boolean;
  hapticsEnabled: boolean;
  musicEnabled: boolean;
  sfxEnabled: boolean;
  textScale: TextScale;
  highContrast: boolean;
}

/** The shipping defaults — also the fallback for any missing/absent field. */
export const DEFAULT_PREFS: PersistedPrefs = {
  reducedMotion: false,
  hapticsEnabled: true,
  musicEnabled: true,
  sfxEnabled: true,
  textScale: 1,
  highContrast: false,
};

/**
 * Every field optional and the object NON-strict on purpose: unknown keys from a
 * newer version are ignored rather than failing the whole parse, and a missing
 * field falls back to its default. This is what makes old- AND future-shape loads
 * loss-free — the schema recognises what it can and defers the rest to merge.
 */
export const PrefsSaveSchema = z.object({
  schemaVersion: z.number().int().optional(),
  reducedMotion: z.boolean().optional(),
  hapticsEnabled: z.boolean().optional(),
  musicEnabled: z.boolean().optional(),
  sfxEnabled: z.boolean().optional(),
  textScale: z.union([z.literal(1), z.literal(1.15), z.literal(1.3)]).optional(),
  highContrast: z.boolean().optional(),
});

export type PrefsSave = z.infer<typeof PrefsSaveSchema>;

export interface PrefsPersistence {
  /** Full prefs, merged over defaults. Missing/corrupt read → all defaults. */
  loadPrefs(): Promise<PersistedPrefs>;
  savePrefs(prefs: PersistedPrefs): Promise<void>;
}

/** Merge a partial parse over the defaults so the result is always complete. */
function mergeOverDefaults(partial: PrefsSave): PersistedPrefs {
  return {
    reducedMotion: partial.reducedMotion ?? DEFAULT_PREFS.reducedMotion,
    hapticsEnabled: partial.hapticsEnabled ?? DEFAULT_PREFS.hapticsEnabled,
    musicEnabled: partial.musicEnabled ?? DEFAULT_PREFS.musicEnabled,
    sfxEnabled: partial.sfxEnabled ?? DEFAULT_PREFS.sfxEnabled,
    textScale: partial.textScale ?? DEFAULT_PREFS.textScale,
    highContrast: partial.highContrast ?? DEFAULT_PREFS.highContrast,
  };
}

export function createPrefsPersistence(storage: KeyValueStorage): PrefsPersistence {
  return {
    async loadPrefs() {
      const raw = await storage.getItem(PrefsSaveKey);
      if (raw === null) return { ...DEFAULT_PREFS };
      try {
        const parsed = PrefsSaveSchema.safeParse(JSON.parse(raw));
        return parsed.success ? mergeOverDefaults(parsed.data) : { ...DEFAULT_PREFS };
      } catch {
        return { ...DEFAULT_PREFS };
      }
    },
    async savePrefs(prefs) {
      const save: PrefsSave = { schemaVersion: PrefsSaveSchemaVersion, ...prefs };
      await storage.setItem(PrefsSaveKey, JSON.stringify(save));
    },
  };
}
