import { describe, expect, it } from 'vitest';

import { emptyCatalog, type Catalog } from '../contracts';
import { dailySeedFor } from '../persistence/daily';
import {
  UNLOCK_LADDER_ENV_VAR,
  allUnlockableItemIds,
  alwaysUnlockedItemIds,
  createRun,
  unlockedItemIds,
} from '../sim';
import { hashState } from '../sim/hash';
import { makeState } from '../sim/testkit';
import { loadCombos, loadItemTable } from '../items';
import {
  ActiveRunSaveKey,
  SaveSchemaVersion,
  createRunPersistence,
  type KeyValueStorage,
} from '../persistence';
import { createRunStore } from './store';

class MemoryStorage implements KeyValueStorage {
  readonly values = new Map<string, string>();

  async getItem(key: string): Promise<string | null> {
    return this.values.get(key) ?? null;
  }

  async setItem(key: string, value: string): Promise<void> {
    this.values.set(key, value);
  }

  async removeItem(key: string): Promise<void> {
    this.values.delete(key);
  }
}

const deps = { table: loadItemTable(), combos: loadCombos() };

function withEnv<T>(env: Record<string, string | undefined>, fn: () => T): T {
  const previous: Record<string, string | undefined> = {};
  for (const key of Object.keys(env)) {
    previous[key] = process.env[key];
    if (env[key] === undefined) delete process.env[key];
    else process.env[key] = env[key];
  }
  try {
    return fn();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

describe('run store', () => {
  it('dispatches accepted actions through the engine and autosaves the new state', async () => {
    const storage = new MemoryStorage();
    const persistence = createRunPersistence(storage);
    const store = createRunStore({
      deps,
      persistence,
      initialState: makeState(
        [{ slot: { row: 1, col: 1 }, itemId: 'wine-bottle' }],
        { phase: 'arrange' },
      ),
      seedFactory: () => 'store-accepted',
    });

    const result = store
      .getState()
      .dispatchAction({ type: 'moveItem', from: { row: 1, col: 1 }, to: { row: 1, col: 0 } });

    expect(result.accepted).toBe(true);
    if (!result.accepted) throw new Error(result.rejected.message);
    await result.save;

    const saved = await persistence.loadActiveRun(createRun('fallback', deps));
    expect(saved.status).toBe('loaded');
    expect(hashState(saved.gameState)).toBe(hashState(result.gameState));
    expect(saved.gameState.moves.freeRemaining).toBe(2);
  });

  it('rejects illegal engine actions without changing state', () => {
    const storage = new MemoryStorage();
    const store = createRunStore({
      deps,
      persistence: createRunPersistence(storage),
      initialState: makeState(
        [{ slot: { row: 0, col: 0 }, itemId: 'cheese-wheel', state: { sticky: true } }],
        { phase: 'arrange' },
      ),
    });
    const before = hashState(store.getState().gameState);

    const result = store
      .getState()
      .dispatchAction({ type: 'moveItem', from: { row: 0, col: 0 }, to: { row: 2, col: 3 } });

    expect(result.accepted).toBe(false);
    expect(hashState(store.getState().gameState)).toBe(before);
    expect(store.getState().lastRejectedAction?.message).toMatch(/Sticky items cannot be moved/);
    expect(storage.values.has(ActiveRunSaveKey)).toBe(false);
  });

  it('continues from the active autosave exactly', async () => {
    const storage = new MemoryStorage();
    const persistence = createRunPersistence(storage);
    const savedState = makeState(
      [{ slot: { row: 0, col: 0 }, itemId: 'wine-bottle' }],
      { phase: 'arrange', seed: 'store-continue', runId: 'run-store-continue' },
    );
    await storage.setItem(
      ActiveRunSaveKey,
      JSON.stringify({
        schemaVersion: SaveSchemaVersion,
        savedAt: new Date().toISOString(),
        gameState: savedState,
      }),
    );

    const store = createRunStore({
      deps,
      persistence,
      initialState: createRun('placeholder', deps),
      seedFactory: () => 'fallback',
    });
    const continued = await store.getState().continueRun();

    expect(hashState(continued)).toBe(hashState(savedState));
    expect(hashState(store.getState().gameState)).toBe(hashState(savedState));
    expect(store.getState().loadStatus).toBe('loaded');
  });

  it('starts new runs from pure day-1 delivery with real seeded offers', async () => {
    const storage = new MemoryStorage();
    const persistence = createRunPersistence(storage);
    const store = createRunStore({
      deps,
      persistence,
      initialState: makeState([], { phase: 'gameOver' }),
      seedFactory: () => 'm3-new-run',
    });

    const result = store.getState().startNewRun();
    await result.save;

    expect(result.gameState.phase).toBe('delivery');
    expect(result.gameState.day).toBe(1);
    expect(result.gameState.shelf.slots.every((slot) => slot.item === null)).toBe(true);
    expect(result.gameState.currentOffers).toHaveLength(3);
    expect(result.gameState.currentOffers.map((offer) => offer.offerId)).toEqual(
      createRun('m3-new-run', deps).currentOffers.map((offer) => offer.offerId),
    );
  });

  it('snapshots loaded catalog unlocks for flagged new runs and falls back to starters while idle', () => {
    withEnv({ [UNLOCK_LADDER_ENV_VAR]: '1' }, () => {
      const loadedCatalog = emptyCatalog();
      loadedCatalog.stats.runsPlayed = 5;
      const expectedLoaded = unlockedItemIds(loadedCatalog);
      const loadedStore = createRunStore({
        deps,
        persistence: createRunPersistence(new MemoryStorage()),
        initialState: makeState([], { phase: 'gameOver' }),
        catalogSnapshot: () => ({ catalog: loadedCatalog, loadStatus: 'loaded' }),
      });

      const loadedRun = loadedStore.getState().startNewRun('store-unlocks-loaded').gameState;
      expect(loadedRun.unlockedItemIds).toEqual(expectedLoaded);
      expect(loadedRun.unlockedItemIds).toContain('soap-bar');

      const idleStore = createRunStore({
        deps,
        persistence: createRunPersistence(new MemoryStorage()),
        initialState: makeState([], { phase: 'gameOver' }),
        catalogSnapshot: () => ({ catalog: emptyCatalog(), loadStatus: 'idle' }),
      });
      const idleRun = idleStore.getState().startNewRun('store-unlocks-idle').gameState;
      expect(idleRun.unlockedItemIds).toEqual(alwaysUnlockedItemIds());
    });
  });

  it('gives daily seeds the canonical full pool regardless of personal unlocks (A-M7 graduation gate)', () => {
    withEnv({ [UNLOCK_LADDER_ENV_VAR]: '1' }, () => {
      const dailySeed = dailySeedFor('2026-07-08');
      const richCatalog = emptyCatalog();
      richCatalog.stats.runsPlayed = 20;

      const makeDailyRun = (snapshot: { catalog: Catalog; loadStatus: 'loaded' | 'idle' }) =>
        createRunStore({
          deps,
          persistence: createRunPersistence(new MemoryStorage()),
          initialState: makeState([], { phase: 'gameOver' }),
          catalogSnapshot: () => snapshot,
        })
          .getState()
          .startNewRun(dailySeed).gameState;

      const fresh = makeDailyRun({ catalog: emptyCatalog(), loadStatus: 'idle' });
      const veteran = makeDailyRun({ catalog: richCatalog, loadStatus: 'loaded' });

      // Same shelf worldwide: both carry the CANONICAL full ladder pool (never
      // personal unlocks — and never the engine's starter-set default), so the
      // offers are identical for every player.
      expect(fresh.unlockedItemIds).toEqual(allUnlockableItemIds());
      expect(veteran.unlockedItemIds).toEqual(allUnlockableItemIds());
      expect(veteran.currentOffers).toEqual(fresh.currentOffers);
    });
  });
});

// -----------------------------------------------------------------------------
// orderHudView flag gate (human ruling 2026-07-11): scoring fires Today's Order
// ONLY when the synergy flag is off (`!synergyEnabled && order …` in
// resolveOpenShop), so the HUD chip must hide under tag synergy — otherwise it
// promises a ×1.5 that never pays. Flag world pinned per the Gate-1 scar.
// -----------------------------------------------------------------------------
import { orderHudView } from './store';
import { withFlagWorld } from '../sim/testkit';

describe('orderHudView synergy gate', () => {
  const withOrder = () =>
    makeState([], { dailyOrder: { tag: 'drink', count: 2 } });

  it('shows the chip when synergy is OFF (order can pay)', () => {
    withFlagWorld([], () => {
      const view = orderHudView(withOrder());
      expect(view).not.toBeNull();
      expect(view?.tag).toBe('drink');
    });
  });

  it('hides the chip when TAG_SYNERGY is ON (scoring skips order)', () => {
    withFlagWorld(['TAG_SYNERGY_ENABLED'], () => {
      expect(orderHudView(withOrder())).toBeNull();
    });
  });

  it('still hides it with no order regardless of flags', () => {
    withFlagWorld([], () => {
      expect(orderHudView(makeState([]))).toBeNull();
    });
  });
});
