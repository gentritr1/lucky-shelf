import { describe, expect, it } from 'vitest';

import {
  GallerySaveKey,
  GallerySaveSchemaVersion,
  createGalleryPersistence,
} from './gallery';

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

describe('gallery persistence', () => {
  it('missing → empty, status missing', async () => {
    const { storage } = memoryStorage();
    const result = await createGalleryPersistence(storage).loadGallery();
    expect(result).toEqual({ status: 'missing', hungPaintingIds: [] });
  });

  it('round-trips a hung set', async () => {
    const { storage, map } = memoryStorage();
    const p = createGalleryPersistence(storage);
    await p.saveGallery(['still-life', 'dusk']);
    expect(map.has(GallerySaveKey)).toBe(true);
    const result = await p.loadGallery();
    expect(result.status).toBe('loaded');
    expect(result.hungPaintingIds.sort()).toEqual(['dusk', 'still-life']);
  });

  it('de-dupes on write and read', async () => {
    const { storage } = memoryStorage();
    const p = createGalleryPersistence(storage);
    await p.saveGallery(['dusk', 'dusk', 'still-life']);
    const result = await p.loadGallery();
    expect(result.hungPaintingIds.sort()).toEqual(['dusk', 'still-life']);
  });

  it('corrupt JSON → empty, status corrupt, nothing thrown', async () => {
    const { storage } = memoryStorage({ [GallerySaveKey]: '{not json' });
    const result = await createGalleryPersistence(storage).loadGallery();
    expect(result).toEqual({ status: 'corrupt', hungPaintingIds: [] });
  });

  it('wrong schema shape → empty, status corrupt', async () => {
    const bad = JSON.stringify({ schemaVersion: GallerySaveSchemaVersion, savedAt: 'x', hungPaintingIds: 'nope' });
    const { storage } = memoryStorage({ [GallerySaveKey]: bad });
    const result = await createGalleryPersistence(storage).loadGallery();
    expect(result.status).toBe('corrupt');
    expect(result.hungPaintingIds).toEqual([]);
  });

  it('version mismatch → empty, status versionMismatch', async () => {
    const stale = JSON.stringify({ schemaVersion: 999, savedAt: 'x', hungPaintingIds: ['dusk'] });
    const { storage } = memoryStorage({ [GallerySaveKey]: stale });
    const result = await createGalleryPersistence(storage).loadGallery();
    expect(result.status).toBe('versionMismatch');
    expect(result.hungPaintingIds).toEqual([]);
  });

  it('only ever touches its own key', async () => {
    const { storage, map } = memoryStorage({ 'luckyShelf:catalog:v1': 'PRECIOUS' });
    await createGalleryPersistence(storage).saveGallery(['dusk']);
    expect(map.get('luckyShelf:catalog:v1')).toBe('PRECIOUS');
    expect([...map.keys()].sort()).toEqual(['luckyShelf:catalog:v1', GallerySaveKey]);
  });
});
