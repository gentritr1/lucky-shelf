import { describe, expect, it } from 'vitest';

import { emptyCatalog, type GameState } from '../contracts';
import { loadCombos, loadItemTable } from '../items';
import { createRun } from '../sim';
import { CatalogSaveKey, createCatalogPersistence, mergeRunIntoCatalog } from './catalog';

function memoryStorage(seed?: Record<string, string>) {
  const map = new Map<string, string>(Object.entries(seed ?? {}));
  return {
    store: map,
    getItem: async (k: string) => map.get(k) ?? null,
    setItem: async (k: string, v: string) => void map.set(k, v),
    removeItem: async (k: string) => void map.delete(k),
  };
}

const deps = { table: loadItemTable(), combos: loadCombos() };

function finishedRun(overrides: Partial<GameState['runStats']>, combos: string[], items: string[]): GameState {
  const state = createRun('catalog-test', deps);
  return {
    ...state,
    phase: 'gameOver',
    catalogDelta: { discoveredItemIds: items, discoveredComboIds: combos },
    runStats: { ...state.runStats, ...overrides },
  };
}

describe('catalog merge', () => {
  it('unions discoveries and advances stats across runs', () => {
    let catalog = emptyCatalog();
    catalog = mergeRunIntoCatalog(
      catalog,
      finishedRun({ bestDayTotal: 40, deepestRentSurvived: 2, totalCoinsEarned: 120 }, ['wine-and-dine'], ['wine-bottle', 'cheese-wheel']),
    );
    expect(catalog.discoveredItemIds.sort()).toEqual(['cheese-wheel', 'wine-bottle']);
    expect(catalog.achievedComboIds).toEqual(['wine-and-dine']);
    expect(catalog.comboCounts['wine-and-dine']).toBe(1);
    expect(catalog.stats).toMatchObject({
      runsPlayed: 1,
      bestDayTotal: 40,
      deepestRentSurvived: 2,
      mostCoinsInARun: 120,
      totalCoinsAllTime: 120,
    });

    catalog = mergeRunIntoCatalog(
      catalog,
      finishedRun({ bestDayTotal: 25, deepestRentSurvived: 3, totalCoinsEarned: 80 }, ['wine-and-dine', 'cheese-board'], ['wine-bottle', 'honey-jar']),
    );
    expect(catalog.discoveredItemIds.sort()).toEqual(['cheese-wheel', 'honey-jar', 'wine-bottle']);
    expect(catalog.comboCounts['wine-and-dine']).toBe(2);
    expect(catalog.comboCounts['cheese-board']).toBe(1);
    expect(catalog.stats).toMatchObject({
      runsPlayed: 2,
      bestDayTotal: 40, // max kept
      deepestRentSurvived: 3, // advanced
      mostCoinsInARun: 120, // max kept
      totalCoinsAllTime: 200, // summed
    });
  });
});

describe('catalog persistence', () => {
  it('round-trips a catalog', async () => {
    const storage = memoryStorage();
    const persistence = createCatalogPersistence(storage);
    const merged = mergeRunIntoCatalog(emptyCatalog(), finishedRun({ bestDayTotal: 10 }, ['wine-and-dine'], ['wine-bottle']));
    await persistence.saveCatalog(merged);
    const result = await persistence.loadCatalog();
    expect(result.status).toBe('loaded');
    expect(result.catalog).toEqual(merged);
  });

  it('returns an empty catalog when none is saved', async () => {
    const result = await createCatalogPersistence(memoryStorage()).loadCatalog();
    expect(result.status).toBe('missing');
    expect(result.catalog).toEqual(emptyCatalog());
  });

  it('fails safe to empty on corrupt json', async () => {
    const result = await createCatalogPersistence(memoryStorage({ [CatalogSaveKey]: '{not json' })).loadCatalog();
    expect(result.status).toBe('corrupt');
    expect(result.catalog).toEqual(emptyCatalog());
  });

  it('fails safe to empty on version mismatch', async () => {
    const stale = JSON.stringify({ schemaVersion: 99, savedAt: 'x', catalog: {} });
    const result = await createCatalogPersistence(memoryStorage({ [CatalogSaveKey]: stale })).loadCatalog();
    expect(result.status).toBe('versionMismatch');
    expect(result.catalog).toEqual(emptyCatalog());
  });
});
