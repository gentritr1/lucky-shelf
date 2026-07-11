import { describe, expect, it } from 'vitest';

import { emptyCatalog, type Action, type Catalog, type GameState, type Slot } from '../contracts';
import { isSignatureItem, loadCombos, loadItemTable } from '../items';
import { mergeRunIntoCatalog } from '../persistence/catalog';
import { playRun, type StrategyName } from './bots';
import { dispatch } from './engine';
import {
  BUILD_STEERING_ENV_VAR,
  DAY2_STARTER_ENV_VAR,
  GOAL_LADDER_ENV_VAR,
  LOOP_V2_DAILY_SHOP_OFFERS,
  LOOP_V2_ENV_VAR,
  OFFERS_PER_DELIVERY,
  SHELF_EXPANSION_ENV_VAR,
  SIGNATURE_ITEMS_ENV_VAR,
  TAG_SYNERGY_ENV_VAR,
  UNLOCK_LADDER_ENV_VAR,
  WARM_OPENING_ENV_VAR,
  generateOffers,
  offerWeight,
  offerablePool,
} from './economy';
import { createRun } from './engine';
import { hashState } from './hash';
import { runReplay } from './replay';
import {
  UNLOCK_LADDER,
  alwaysUnlockedItemIds,
  nextUnlocks,
  unlockedItemIds,
} from './unlocks';

import { withFlagWorld } from './testkit';

const deps = { table: loadItemTable(), combos: loadCombos() };

const DEPTH_ENV = {
  [LOOP_V2_ENV_VAR]: '1',
  [SIGNATURE_ITEMS_ENV_VAR]: '1',
  [TAG_SYNERGY_ENV_VAR]: '1',
  [BUILD_STEERING_ENV_VAR]: '1',
  [GOAL_LADDER_ENV_VAR]: '1',
  [SHELF_EXPANSION_ENV_VAR]: '1',
  [WARM_OPENING_ENV_VAR]: '1',
  [DAY2_STARTER_ENV_VAR]: '1',
  [UNLOCK_LADDER_ENV_VAR]: '1',
} as const;

/** Overlay on a fully pinned-OFF world: named keys apply (undefined = force
 *  OFF via '0'); every unnamed depth flag is pinned '0' so graduated compiled
 *  defaults (unlock ladder, build steering's supplier gate...) cannot leak
 *  into these deterministic offer/unlock expectations. */
function withEnv<T>(env: Record<string, string | undefined>, fn: () => T): T {
  return withFlagWorld([], () => {
    const previous: Record<string, string | undefined> = {};
    for (const key of Object.keys(env)) {
      previous[key] = process.env[key];
      process.env[key] = env[key] ?? '0';
    }
    try {
      return fn();
    } finally {
      for (const [key, value] of Object.entries(previous)) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    }
  });
}

function allDepthWithUnlock<T>(fn: () => T): T {
  return withEnv(DEPTH_ENV, fn);
}

function offerIds(state: GameState): string[] {
  return state.currentOffers.map((offer) => offer.item.id);
}

function firstEmptySlot(state: GameState): Slot {
  const slot = state.shelf.slots.find((entry) => entry.item === null)?.slot;
  if (!slot) throw new Error('Expected an empty slot.');
  return slot;
}

function apply(state: GameState, action: Action): GameState {
  return dispatch(state, action, deps);
}

function nonSignatureOfferableIds(): string[] {
  return withEnv({ [SIGNATURE_ITEMS_ENV_VAR]: undefined }, () =>
    offerablePool(deps.table).map((definition) => definition.id),
  );
}

function newUnlocks(before: readonly string[], after: readonly string[]): string[] {
  const seenBefore = new Set(before);
  return after.filter((itemId) => !seenBefore.has(itemId));
}

function playCatalogRun(
  catalog: Catalog,
  runIndex: number,
  strategy: StrategyName = 'greedy',
): { catalog: Catalog; before: string[]; after: string[]; run: ReturnType<typeof playRun> } {
  const before = unlockedItemIds(catalog);
  const run = playRun(`unlock-drip-${strategy}-${runIndex}`, strategy, deps, 700, {
    createRunOptions: { unlockedItemIds: before },
  });
  const merged = mergeRunIntoCatalog(catalog, run.finalState);
  return { catalog: merged, before, after: unlockedItemIds(merged), run };
}

describe('unlock ladder', () => {
  it('covers the offerable item pool as a sidecar table without touching transform targets', () => {
    withEnv({ [SIGNATURE_ITEMS_ENV_VAR]: '1' }, () => {
      const tableIds = Object.keys(UNLOCK_LADDER).sort();
      const offerableIds = offerablePool(deps.table)
        .map((definition) => definition.id)
        .sort();

      expect(tableIds).toEqual(offerableIds);
      expect(tableIds).toHaveLength(36);
      expect(tableIds).not.toEqual(expect.arrayContaining(['cheese-wheel-tier-2', 'jam-jars']));
    });
  });

  it('keeps flag-off createRun byte path free of unlockedItemIds and full-pool offers', () => {
    withEnv({ [UNLOCK_LADDER_ENV_VAR]: undefined }, () => {
      const baseline = createRun('unlock-off', deps);
      const withIgnoredSnapshot = createRun('unlock-off', deps, {
        unlockedItemIds: ['wine-bottle'],
      });

      expect(baseline.unlockedItemIds).toBeUndefined();
      expect(withIgnoredSnapshot.unlockedItemIds).toBeUndefined();
      expect(withIgnoredSnapshot.currentOffers).toEqual(baseline.currentOffers);
    });
  });

  it('uses the starter set while catalog unlocks are unavailable', () => {
    withEnv({ [UNLOCK_LADDER_ENV_VAR]: '1' }, () => {
      const state = createRun('unlock-starter', deps);
      const starter = alwaysUnlockedItemIds();

      expect(state.unlockedItemIds).toEqual(starter);
      expect(offerIds(state).every((itemId) => starter.includes(itemId))).toBe(true);
      expect(nextUnlocks(emptyCatalog()).map((entry) => entry.itemId)).toEqual([
        'apple-basket',
        'brass-scale',
        'ledger-book',
        'lucky-cat',
        'consignment-sign',
        'window-display',
      ].sort());
    });
  });

  it('drips new unlocks through greedy bot catalog runs and reaches the full non-signature pool by run 20', () => {
    allDepthWithUnlock(() => {
      let catalog = emptyCatalog();
      const nonSignatureIds = nonSignatureOfferableIds();
      let fullPoolRun: number | null = null;
      const firstFiveUnlocks: string[][] = [];

      for (let runIndex = 1; runIndex <= 22; runIndex += 1) {
        const result = playCatalogRun(catalog, runIndex, 'greedy');
        catalog = result.catalog;
        const gained = newUnlocks(result.before, result.after);
        if (runIndex <= 5) firstFiveUnlocks.push(gained);
        if (
          fullPoolRun === null &&
          nonSignatureIds.every((itemId) => result.after.includes(itemId))
        ) {
          fullPoolRun = runIndex;
        }
      }

      expect(firstFiveUnlocks.every((gained) => gained.length >= 1)).toBe(true);
      expect(fullPoolRun).not.toBeNull();
      expect(fullPoolRun).toBeLessThanOrEqual(22);
      expect(catalog.stats.runsPlayed).toBe(22);
    });
  }, 60000);

  it('keeps discovery and combo unlock hooks reachable by real bot runs', () => {
    allDepthWithUnlock(() => {
      let catalog = emptyCatalog();
      const gatedIds = [
        'brass-scale',
        'ledger-book',
        'lucky-cat',
        'consignment-sign',
        'window-display',
      ];

      for (let runIndex = 1; runIndex <= 28; runIndex += 1) {
        const strategy: StrategyName = runIndex % 2 === 0 ? 'combo' : 'greedy';
        catalog = playCatalogRun(catalog, runIndex, strategy).catalog;
      }

      const unlocked = unlockedItemIds(catalog);
      expect(unlocked).toEqual(expect.arrayContaining(gatedIds));
      expect(catalog.discoveredItemIds).toEqual(
        expect.arrayContaining(['price-gun', 'coupon-stack']),
      );
      expect(catalog.achievedComboIds).toEqual(
        expect.arrayContaining(['lucky-cluster', 'fire-sale', 'cheese-board']),
      );
    });
  }, 60000);

  it('replays a flagged run identically after the live catalog changes when the run snapshot is reused', () => {
    allDepthWithUnlock(() => {
      const catalog = emptyCatalog();
      catalog.stats.runsPlayed = 8;
      catalog.discoveredItemIds.push('price-gun', 'coupon-stack');
      catalog.achievedComboIds.push('cheese-board');
      const originalSnapshot = unlockedItemIds(catalog);
      const run = playRun('unlock-replay-integrity', 'greedy', deps, 220, {
        createRunOptions: { unlockedItemIds: originalSnapshot },
      });

      const mutatedCatalog = emptyCatalog();
      mutatedCatalog.stats.runsPlayed = 22;
      const mutatedSnapshot = unlockedItemIds(mutatedCatalog);
      expect(mutatedSnapshot).not.toEqual(originalSnapshot);
      const runSnapshot = run.finalState.unlockedItemIds;
      expect(runSnapshot).toEqual(originalSnapshot);
      if (!runSnapshot) throw new Error('Expected flagged run to carry an unlock snapshot.');

      const replayed = runReplay(
        { seed: run.seed, actions: run.actions },
        deps,
        { unlockedItemIds: runSnapshot },
      );

      expect(hashState(replayed)).toBe(hashState(run.finalState));
      expect(replayed.unlockedItemIds).toEqual(originalSnapshot);
    });
  }, 30000);

  it('never offers locked items inside snapshot-limited fuzzed runs', () => {
    allDepthWithUnlock(() => {
      const snapshot = alwaysUnlockedItemIds();
      const allowed = new Set(snapshot);

      for (let seedIndex = 0; seedIndex < 200; seedIndex += 1) {
        const seed = `unlock-locked-never-${seedIndex}`;
        const run = playRun(seed, 'greedy', deps, 120, {
          createRunOptions: { unlockedItemIds: snapshot },
        });
        let state = createRun(seed, deps, { unlockedItemIds: snapshot });
        for (const action of run.actions) {
          expect(offerIds(state).every((itemId) => allowed.has(itemId))).toBe(true);
          state = apply(state, action);
        }
        expect(offerIds(state).every((itemId) => allowed.has(itemId))).toBe(true);
      }
    });
  }, 60000);

  it('keeps full-unlock offers identical to the current pool and starter pools wide enough', () => {
    allDepthWithUnlock(() => {
      const starter = alwaysUnlockedItemIds();
      const positiveStarterDayOne = offerablePool(deps.table, starter).filter(
        (definition) => offerWeight(definition, 1) > 0,
      );

      expect(positiveStarterDayOne.length).toBeGreaterThanOrEqual(
        OFFERS_PER_DELIVERY + LOOP_V2_DAILY_SHOP_OFFERS,
      );
      expect(offerablePool(deps.table, Object.keys(UNLOCK_LADDER))).toEqual(
        offerablePool(deps.table),
      );
    });
  });

  it('does not mint duplicate instance ids when a small-pool shop is bought out and rerolled', () => {
    withEnv({ [LOOP_V2_ENV_VAR]: '1', [UNLOCK_LADDER_ENV_VAR]: '1' }, () => {
      const smallPool = [
        'wine-bottle',
        'cheese-wheel',
        'honey-jar',
        'lucky-bamboo',
        'coupon-stack',
        'bread-loaf',
        'penny-jar',
      ];
      let state = createRun('unlock-small-pool', deps, { unlockedItemIds: smallPool });
      state = { ...state, coins: 200 };
      state = apply(state, { type: 'draftItem', offerIndex: 0 });
      state = apply(state, { type: 'placeItem', slot: firstEmptySlot(state) });

      for (let pass = 0; pass < 2; pass += 1) {
        while (state.currentOffers.length > 0) {
          state = apply(state, { type: 'buyOffer', offerIndex: 0 });
          state = apply(state, { type: 'placeItem', slot: firstEmptySlot(state) });
        }
        if (pass === 0) state = apply(state, { type: 'reroll' });
      }

      const instanceIds = state.shelf.slots
        .map((entry) => entry.item?.instanceId)
        .filter((id): id is string => Boolean(id));
      expect(new Set(instanceIds).size).toBe(instanceIds.length);
      expect(state.currentOffers).toHaveLength(0);
    });
  });
});
