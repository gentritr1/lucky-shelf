import { describe, expect, it } from 'vitest';

import { emptyCatalog, type GameState } from '../contracts';
import { loadCombos, loadItemTable } from '../items';
import { createCatalogPersistence } from '../persistence/catalog';
import { createRun } from '../sim';
import { createCatalogStore } from './catalogStore';

function memoryStorage(seed?: Record<string, string>) {
  const map = new Map<string, string>(Object.entries(seed ?? {}));
  return {
    getItem: async (k: string) => map.get(k) ?? null,
    setItem: async (k: string, v: string) => void map.set(k, v),
    removeItem: async (k: string) => void map.delete(k),
  };
}

const deps = { table: loadItemTable(), combos: loadCombos() };

function finishedRun(runId: string): GameState {
  const state = createRun('catalog-store-test', deps);
  return {
    ...state,
    runId,
    phase: 'gameOver',
    catalogDelta: { discoveredItemIds: ['penny-jar'], discoveredComboIds: [] },
    runStats: { ...state.runStats, daysSurvived: 5, bestDayTotal: 30, totalCoinsEarned: 90 },
  };
}

describe('catalogStore recordRunEnd', () => {
  it('never wipes the persisted catalog when a run ends before any screen loaded it', async () => {
    // Regression (found in the B-M4 Fable review): recordRunEnd used to merge
    // into the in-memory emptyCatalog() and save THAT, destroying every prior
    // discovery and best for players who finished a run without visiting the
    // catalog screen first.
    const persistence = createCatalogPersistence(memoryStorage());
    const prior = emptyCatalog();
    prior.discoveredItemIds.push('cheese-wheel', 'wine-bottle');
    prior.stats.bestDayTotal = 500;
    prior.stats.longestRun = 20;
    await persistence.saveCatalog(prior);

    // Fresh session: catalog deliberately NOT loaded before the run ends.
    const store = createCatalogStore({ persistence });
    await store.getState().recordRunEnd(finishedRun('run-a'));

    const reloaded = (await persistence.loadCatalog()).catalog;
    expect(reloaded.discoveredItemIds).toEqual(
      expect.arrayContaining(['cheese-wheel', 'wine-bottle', 'penny-jar']),
    );
    expect(reloaded.stats.bestDayTotal).toBe(500);
    expect(reloaded.stats.longestRun).toBe(20);
  });

  it('stashes the pre-merge stats for the recorded run (the "New record!" baseline)', async () => {
    const persistence = createCatalogPersistence(memoryStorage());
    const prior = emptyCatalog();
    prior.stats.bestDayTotal = 500;
    await persistence.saveCatalog(prior);

    const store = createCatalogStore({ persistence });
    await store.getState().recordRunEnd(finishedRun('run-b'));

    const stash = store.getState().prevRunStats;
    expect(stash?.runId).toBe('run-b');
    // The stash is the STANDING best from disk, not the post-merge value and
    // not the pre-load empty catalog's zero.
    expect(stash?.stats.bestDayTotal).toBe(500);
  });
});
