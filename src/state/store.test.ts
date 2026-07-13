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
  type RunPersistence,
} from '../persistence';
import { createRunStore, itemRuleLines, shelfItemInspectorView } from './store';

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
  it('exposes exact rule prose for offer decisions without leaking sim internals to screens', () => {
    expect(itemRuleLines(deps.table.get('wine-bottle')!)).toEqual([
      'Earns +3 for each cheese item nearby',
    ]);
    expect(itemRuleLines(deps.table.get('mirror')!)).toEqual([
      'Copies the value of the item to its left',
    ]);
  });

  it('exposes exact rule prose and location for shelf and delivery-tray inspectors', () => {
    const shelfState = makeState(
      [{ slot: { row: 1, col: 2 }, itemId: 'wine-bottle' }],
      { phase: 'arrange' },
    );
    const shelfItem = shelfState.shelf.slots.find((entry) => entry.item)?.item;
    expect(shelfItemInspectorView(shelfState, shelfItem?.instanceId ?? null)).toMatchObject({
      slot: { row: 1, col: 2 },
      item: { itemId: 'wine-bottle', name: 'Wine Bottle' },
      ruleLines: ['Earns +3 for each cheese item nearby'],
    });

    const heldItem = shelfState.shelf.slots.find((entry) => entry.item)?.item;
    if (!heldItem) throw new Error('expected held test item');
    const heldState = { ...shelfState, heldItem, shelf: makeState([]).shelf };
    expect(shelfItemInspectorView(heldState, heldItem.instanceId)).toMatchObject({
      slot: null,
      item: { itemId: 'wine-bottle' },
    });
    expect(shelfItemInspectorView(heldState, 'missing')).toBeNull();
  });

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

  it('serializes autosaves so an older snapshot cannot overwrite a newer action', async () => {
    const pending: Array<{
      gameState: ReturnType<typeof makeState>;
      resolve: () => void;
    }> = [];
    const persisted: Array<ReturnType<typeof makeState>> = [];
    const persistence: RunPersistence = {
      loadActiveRun: async (freshState) => ({ status: 'missing', gameState: freshState }),
      saveActiveRun: (gameState) =>
        new Promise<void>((resolve) => {
          pending.push({
            gameState,
            resolve: () => {
              persisted.push(gameState);
              resolve();
            },
          });
        }),
      clearActiveRun: async () => undefined,
    };
    const store = createRunStore({
      deps,
      persistence,
      initialState: makeState(
        [{ slot: { row: 1, col: 1 }, itemId: 'wine-bottle' }],
        { phase: 'arrange' },
      ),
    });

    const first = store
      .getState()
      .dispatchAction({ type: 'moveItem', from: { row: 1, col: 1 }, to: { row: 1, col: 0 } });
    expect(first.accepted).toBe(true);
    if (!first.accepted) throw new Error(first.rejected.message);
    const second = store
      .getState()
      .dispatchAction({ type: 'moveItem', from: { row: 1, col: 0 }, to: { row: 0, col: 0 } });
    expect(second.accepted).toBe(true);
    if (!second.accepted) throw new Error(second.rejected.message);

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(pending).toHaveLength(1);
    expect(store.getState().saveStatus).toBe('saving');

    pending[0]!.resolve();
    await first.save;
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(pending).toHaveLength(2);
    expect(store.getState().saveStatus).toBe('saving');

    pending[1]!.resolve();
    await second.save;
    expect(store.getState().saveStatus).toBe('saved');
    expect(persisted.map(hashState)).toEqual([
      hashState(first.gameState),
      hashState(second.gameState),
    ]);
    expect(hashState(persisted.at(-1)!)).toBe(hashState(store.getState().gameState));
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

  it('does not let a stale Continue load replace a newly started run', async () => {
    let resolveLoad!: (result: Awaited<ReturnType<RunPersistence['loadActiveRun']>>) => void;
    const oldState = makeState([], {
      phase: 'arrange',
      seed: 'old-save',
      runId: 'run-old-save',
    });
    const persistence: RunPersistence = {
      loadActiveRun: () =>
        new Promise((resolve) => {
          resolveLoad = resolve;
        }),
      saveActiveRun: async () => undefined,
      clearActiveRun: async () => undefined,
    };
    const store = createRunStore({
      deps,
      persistence,
      initialState: createRun('placeholder-race', deps),
    });

    const pendingContinue = store.getState().continueRun();
    await new Promise((resolve) => setTimeout(resolve, 0));
    const fresh = store.getState().startNewRun('newer-run');
    resolveLoad({ status: 'loaded', gameState: oldState });
    const continued = await pendingContinue;
    await fresh.save;

    expect(hashState(continued)).toBe(hashState(fresh.gameState));
    expect(hashState(store.getState().gameState)).toBe(hashState(fresh.gameState));
    expect(store.getState().loadStatus).toBe('loaded');
  });

  it('surfaces active-run read failures and recovers on retry', async () => {
    let shouldFail = true;
    const persistence: RunPersistence = {
      async loadActiveRun(freshState) {
        if (shouldFail) throw new Error('storage unavailable');
        return { status: 'missing', gameState: freshState };
      },
      saveActiveRun: async () => undefined,
      clearActiveRun: async () => undefined,
    };
    const store = createRunStore({ deps, persistence, seedFactory: () => 'load-retry' });

    await expect(store.getState().continueRun()).rejects.toThrow('storage unavailable');
    expect(store.getState().loadStatus).toBe('failed');
    expect(store.getState().lastLoadError).toBe('storage unavailable');

    shouldFail = false;
    await store.getState().continueRun();
    expect(store.getState().loadStatus).toBe('missing');
    expect(store.getState().lastLoadError).toBeNull();
  });

  it('surfaces a failed save and retries the newest state', async () => {
    let attempts = 0;
    let savedState: ReturnType<typeof makeState> | null = null;
    const persistence: RunPersistence = {
      loadActiveRun: async (freshState) => ({ status: 'missing', gameState: freshState }),
      async saveActiveRun(gameState) {
        attempts += 1;
        if (attempts === 1) throw new Error('disk full');
        savedState = gameState;
      },
      clearActiveRun: async () => undefined,
    };
    const store = createRunStore({ deps, persistence, initialState: makeState([], { phase: 'gameOver' }) });
    const started = store.getState().startNewRun('retry-save');

    await expect(started.save).rejects.toThrow('disk full');
    expect(store.getState().saveStatus).toBe('failed');
    expect(store.getState().lastSaveError).toBe('disk full');

    await store.getState().retrySave();
    expect(store.getState().saveStatus).toBe('saved');
    expect(store.getState().lastSaveError).toBeNull();
    expect(hashState(savedState!)).toBe(hashState(store.getState().gameState));
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
