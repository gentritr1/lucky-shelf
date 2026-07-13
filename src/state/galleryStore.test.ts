import { describe, expect, it } from 'vitest';

import { emptyCatalog } from '../contracts';
import { loadCombos, loadItemTable } from '../items';
import { GallerySaveKey, createGalleryPersistence } from '../persistence/gallery';
import { PAINTINGS, RUNS_CAP } from './galleryModel';
import { createGalleryStore, galleryView } from './galleryStore';

function memoryStorage(seed?: Record<string, string>) {
  const map = new Map<string, string>(Object.entries(seed ?? {}));
  return {
    map,
    storage: {
      getItem: async (k: string) => map.get(k) ?? null,
      setItem: async (k: string, v: string) => void map.set(k, v),
      removeItem: async (k: string) => void map.delete(k),
    },
  };
}

const on = () => true;
const off = () => false;
const allItemIds = [...loadItemTable().keys()];
const allComboIds = loadCombos().map((c) => c.comboId);

describe('galleryStore — flag off (byte-identical, no storage touch)', () => {
  it('loadGallery is a no-op that never reads storage', async () => {
    const { storage, map } = memoryStorage({ [GallerySaveKey]: JSON.stringify({ schemaVersion: 1, savedAt: 'x', hungPaintingIds: ['dusk'] }) });
    const store = createGalleryStore({ persistence: createGalleryPersistence(storage), enabled: off });
    await store.getState().loadGallery();
    expect(store.getState().loadStatus).toBe('disabled');
    expect(store.getState().hungPaintingIds).toEqual([]);
    // Nothing written; the seeded key is untouched (never even read into state).
    expect([...map.keys()]).toEqual([GallerySaveKey]);
  });

  it('hangPainting is a no-op that never writes storage', async () => {
    const { storage, map } = memoryStorage();
    const store = createGalleryStore({ persistence: createGalleryPersistence(storage), enabled: off });
    const result = await store.getState().hangPainting('dusk');
    expect(result).toEqual([]);
    expect(map.size).toBe(0);
  });
});

describe('galleryStore — flag on', () => {
  it('load-guards hangPainting: a write-before-load never wipes a prior save', async () => {
    // Disk already has a hung painting; the store has NOT loaded yet.
    const seeded = JSON.stringify({ schemaVersion: 1, savedAt: 'x', hungPaintingIds: ['still-life'] });
    const { storage, map } = memoryStorage({ [GallerySaveKey]: seeded });
    const store = createGalleryStore({ persistence: createGalleryPersistence(storage), enabled: on });

    // Hang WITHOUT calling loadGallery first — the store must hydrate, then merge.
    await store.getState().hangPainting('dusk');
    const persisted = JSON.parse(map.get(GallerySaveKey)!);
    expect(persisted.hungPaintingIds.sort()).toEqual(['dusk', 'still-life']);
  });

  it('hangPainting is idempotent and persists', async () => {
    const { storage, map } = memoryStorage();
    const store = createGalleryStore({ persistence: createGalleryPersistence(storage), enabled: on });
    await store.getState().loadGallery();
    await store.getState().hangPainting('stockroom');
    await store.getState().hangPainting('stockroom');
    expect(store.getState().hungPaintingIds).toEqual(['stockroom']);
    expect(JSON.parse(map.get(GallerySaveKey)!).hungPaintingIds).toEqual(['stockroom']);
  });

  it('reloads persisted hung state', async () => {
    const { storage } = memoryStorage();
    const a = createGalleryStore({ persistence: createGalleryPersistence(storage), enabled: on });
    await a.getState().loadGallery();
    await a.getState().hangPainting('dusk');

    const b = createGalleryStore({ persistence: createGalleryPersistence(storage), enabled: on });
    await b.getState().loadGallery();
    expect(b.getState().hungPaintingIds).toEqual(['dusk']);
  });
});

describe('galleryView — join of catalog progress + hung set', () => {
  it('marks a completed-but-unhung painting readyToAssemble; hung once persisted', () => {
    // A maxed catalog completes every painting.
    const maxed = {
      ...emptyCatalog(),
      discoveredItemIds: allItemIds,
      achievedComboIds: allComboIds,
      stats: { ...emptyCatalog().stats, runsPlayed: RUNS_CAP },
    };
    const unhung = galleryView(maxed, []);
    for (const v of unhung) {
      expect(v.complete).toBe(true);
      expect(v.readyToAssemble).toBe(true);
      expect(v.hung).toBe(false);
      expect(v.progressLabel).toBe(`${v.total} of ${v.total}`);
    }
    const hung = galleryView(maxed, [PAINTINGS[0]!.id]);
    expect(hung[0]!.hung).toBe(true);
    expect(hung[0]!.readyToAssemble).toBe(false);
  });

  it('an empty catalog yields no revealed pieces and no ready paintings', () => {
    for (const v of galleryView(emptyCatalog(), [])) {
      expect(v.piecesRevealed).toBe(0);
      expect(v.readyToAssemble).toBe(false);
      expect(v.progressLabel).toBe(`0 of ${v.total}`);
    }
  });
});
