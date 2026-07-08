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

  // --- B-M4 migration posture: `longestRun` is an additive stat with a safe
  // default (0). An older persisted catalog (saved before B-M4, so its `stats`
  // object has no `longestRun`) MUST still load with every existing field intact
  // and no wipe. This test freezes that guarantee. ---
  it('loads a pre-B-M4 catalog (stats without longestRun) without data loss', async () => {
    const legacySave = JSON.stringify({
      schemaVersion: 1,
      savedAt: '2026-07-01T00:00:00.000Z',
      catalog: {
        schemaVersion: 1,
        discoveredItemIds: ['wine-bottle', 'cheese-wheel'],
        achievedComboIds: ['wine-and-dine'],
        comboCounts: { 'wine-and-dine': 3 },
        // NOTE: pre-B-M4 shape — no `longestRun` key here on purpose.
        stats: {
          runsPlayed: 7,
          bestDayTotal: 88,
          deepestRentSurvived: 4,
          mostCoinsInARun: 260,
          totalCoinsAllTime: 940,
        },
      },
    });
    const result = await createCatalogPersistence(
      memoryStorage({ [CatalogSaveKey]: legacySave }),
    ).loadCatalog();

    // Loads (not corrupt / not wiped) and every existing field is preserved.
    expect(result.status).toBe('loaded');
    expect(result.catalog.discoveredItemIds).toEqual(['wine-bottle', 'cheese-wheel']);
    expect(result.catalog.achievedComboIds).toEqual(['wine-and-dine']);
    expect(result.catalog.comboCounts).toEqual({ 'wine-and-dine': 3 });
    expect(result.catalog.stats).toEqual({
      runsPlayed: 7,
      bestDayTotal: 88,
      deepestRentSurvived: 4,
      mostCoinsInARun: 260,
      totalCoinsAllTime: 940,
      // absent in the old save → filled by the safe default, not derived history.
      longestRun: 0,
    });
  });

  it('advances longestRun to the max daysSurvived across recorded runs', () => {
    let catalog = emptyCatalog();
    catalog = mergeRunIntoCatalog(catalog, finishedRun({ daysSurvived: 6 }, [], []));
    expect(catalog.stats.longestRun).toBe(6);
    catalog = mergeRunIntoCatalog(catalog, finishedRun({ daysSurvived: 4 }, [], []));
    expect(catalog.stats.longestRun).toBe(6); // shorter run keeps the record
    catalog = mergeRunIntoCatalog(catalog, finishedRun({ daysSurvived: 9 }, [], []));
    expect(catalog.stats.longestRun).toBe(9); // longer run advances it
  });
});
