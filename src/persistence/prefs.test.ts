import { describe, expect, it } from 'vitest';

import {
  DEFAULT_PREFS,
  PrefsSaveKey,
  createPrefsPersistence,
  type PersistedPrefs,
} from './prefs';

function memoryStorage(seed?: Record<string, string>) {
  const map = new Map<string, string>(Object.entries(seed ?? {}));
  return {
    getItem: async (k: string) => map.get(k) ?? null,
    setItem: async (k: string, v: string) => void map.set(k, v),
    removeItem: async (k: string) => void map.delete(k),
    _map: map,
  };
}

describe('prefs persistence (B-M7)', () => {
  // The standing scar: a pre-B-M7 save has only the four original toggles and no
  // textScale/highContrast. It must load loss-free — old fields preserved, new
  // fields defaulted — never wiped to defaults.
  it('loads an OLD-SHAPE save (no textScale/highContrast) loss-free', async () => {
    const oldShape = JSON.stringify({
      schemaVersion: 1,
      reducedMotion: true,
      hapticsEnabled: false,
      musicEnabled: true,
      sfxEnabled: false,
    });
    const persistence = createPrefsPersistence(memoryStorage({ [PrefsSaveKey]: oldShape }));
    const loaded = await persistence.loadPrefs();
    // old fields survive verbatim
    expect(loaded.reducedMotion).toBe(true);
    expect(loaded.hapticsEnabled).toBe(false);
    expect(loaded.sfxEnabled).toBe(false);
    // new fields fall back to defaults, not garbage
    expect(loaded.textScale).toBe(1);
    expect(loaded.highContrast).toBe(false);
  });

  it('returns all defaults when nothing is stored', async () => {
    const persistence = createPrefsPersistence(memoryStorage());
    expect(await persistence.loadPrefs()).toEqual(DEFAULT_PREFS);
  });

  it('falls back to defaults on a corrupt (non-JSON) blob', async () => {
    const persistence = createPrefsPersistence(memoryStorage({ [PrefsSaveKey]: '{not json' }));
    expect(await persistence.loadPrefs()).toEqual(DEFAULT_PREFS);
  });

  it('ignores unknown/future fields and still loads the known ones', async () => {
    const future = JSON.stringify({
      schemaVersion: 99,
      reducedMotion: true,
      textScale: 1.3,
      colorFilter: 'protanopia', // a field this version has never heard of
    });
    const persistence = createPrefsPersistence(memoryStorage({ [PrefsSaveKey]: future }));
    const loaded = await persistence.loadPrefs();
    expect(loaded.reducedMotion).toBe(true);
    expect(loaded.textScale).toBe(1.3);
    expect(loaded.highContrast).toBe(false);
  });

  it('rejects an out-of-range textScale, falling back to the default step', async () => {
    const bad = JSON.stringify({ schemaVersion: 1, textScale: 2.5 });
    const persistence = createPrefsPersistence(memoryStorage({ [PrefsSaveKey]: bad }));
    // 2.5 is not a valid literal → whole parse fails → all defaults (never a wild scale)
    expect((await persistence.loadPrefs()).textScale).toBe(1);
  });

  it('round-trips a full prefs object through save → load', async () => {
    const storage = memoryStorage();
    const persistence = createPrefsPersistence(storage);
    const prefs: PersistedPrefs = {
      reducedMotion: true,
      hapticsEnabled: false,
      musicEnabled: false,
      sfxEnabled: true,
      textScale: 1.15,
      highContrast: true,
    };
    await persistence.savePrefs(prefs);
    expect(await persistence.loadPrefs()).toEqual(prefs);
  });
});
