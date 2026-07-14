import { describe, expect, it } from 'vitest';

import { GameStateSchema, type GameState, type TraceEvent } from '../contracts';
import { loadCombos, loadItemTable } from '../items';
import { playRun } from './bots';
import {
  LOOP_V2_DAILY_SHOP_OFFERS,
  LOOP_V2_ENV_VAR,
  LOOP_V2_STARTING_COINS,
  SHELF_EXPANSION_COST,
  SHELF_EXPANSION_ENV_VAR,
} from './economy';
import { EngineError, createRun, dispatch, legalActions } from './engine';
import { makeInstance, makeState, withFlagWorld } from './testkit';
import { uiAffordances } from './uiAffordances';

const deps = { table: loadItemTable(), combos: loadCombos() };

/** Full-world pins (see testkit.withFlagWorld): each variant names exactly the
 *  flags it turns ON; everything else is forced OFF so flipped compiled
 *  defaults (signature items, unlocks, day-2 starter...) cannot leak in. */
function withLoopV2<T>(enabled: boolean, run: () => T): T {
  return withFlagWorld(enabled ? [LOOP_V2_ENV_VAR] : [], run);
}

function withLoopV2AndExpansion<T>(loop: boolean, expansion: boolean, run: () => T): T {
  const on: string[] = [];
  if (loop) on.push(LOOP_V2_ENV_VAR);
  if (expansion) on.push(SHELF_EXPANSION_ENV_VAR);
  return withFlagWorld(on, run);
}

function occupiedCount(state: GameState): number {
  return state.shelf.slots.filter((entry) => entry.item !== null).length;
}

function dayTotal(state: GameState): number {
  const event = state.lastScoringTrace?.events.at(-1) as TraceEvent | undefined;
  if (event?.kind !== 'dayTotal') throw new Error('Expected a dayTotal trace event.');
  return event.coins;
}

describe('loop v2 phase 1', () => {
  it('keeps the default loop on the delivery/restock cadence', () =>
    withLoopV2(false, () => {
      const state = createRun('loop-v2-off', deps);

      expect(state.phase).toBe('delivery');
      expect(state.coins).toBe(0);
      expect(state.currentOffers).toHaveLength(3);
      expect(state.currentOffers.every((offer) => offer.cost === 0)).toBe(true);
    }));

  it('routes the day-one starter into a paid buy-multiple shop', () =>
    withLoopV2(true, () => {
      let state = createRun('loop-v2-daily-shop', deps);
      expect(state.phase).toBe('delivery');
      expect(state.coins).toBe(LOOP_V2_STARTING_COINS);
      expect(state.currentOffers).toHaveLength(3);
      expect(state.currentOffers.every((offer) => offer.cost === 0)).toBe(true);

      state = dispatch(state, { type: 'draftItem', offerIndex: 0 }, deps);
      state = dispatch(state, { type: 'placeItem', slot: { row: 0, col: 0 } }, deps);
      expect(state.phase).toBe('restock');
      expect(state.day).toBe(1);
      expect(state.coins).toBe(LOOP_V2_STARTING_COINS);
      expect(state.currentOffers).toHaveLength(LOOP_V2_DAILY_SHOP_OFFERS);
      expect(state.currentOffers.every((offer) => offer.cost > 0)).toBe(true);

      for (const slot of [{ row: 0, col: 1 }, { row: 0, col: 2 }]) {
        const offerIndex = state.currentOffers.findIndex((offer) => offer.cost <= state.coins);
        expect(offerIndex).toBeGreaterThanOrEqual(0);
        state = dispatch(state, { type: 'buyOffer', offerIndex }, deps);
        state = dispatch(state, { type: 'placeItem', slot }, deps);
      }

      expect(occupiedCount(state)).toBe(3);
      state = dispatch(state, { type: 'endRestock' }, deps);
      expect(state.phase).toBe('arrange');
      expect(state.currentOffers).toHaveLength(0);

      state = dispatch(state, { type: 'openShop' }, deps);
      expect(state.day).toBe(2);
      expect(state.phase).toBe('restock');
      expect(state.currentOffers).toHaveLength(LOOP_V2_DAILY_SHOP_OFFERS);
      expect(() => dispatch(state, { type: 'draftItem', offerIndex: 0 }, deps)).toThrow(
        EngineError,
      );
    }));

  it('applies starting coins and the free starter only once', () =>
    withLoopV2(true, () => {
      let state = createRun('loop-v2-once', deps);
      state = dispatch(state, { type: 'draftItem', offerIndex: 0 }, deps);
      state = dispatch(state, { type: 'placeItem', slot: { row: 0, col: 0 } }, deps);
      state = dispatch(state, { type: 'endRestock' }, deps);

      state = dispatch(state, { type: 'openShop' }, deps);
      expect(state.phase).toBe('restock');
      expect(state.coins).toBe(LOOP_V2_STARTING_COINS + dayTotal(state));

      state = dispatch(state, { type: 'endRestock' }, deps);
      state = dispatch(state, { type: 'openShop' }, deps);
      expect(state.phase).toBe('restock');
      expect(state.currentOffers.every((offer) => offer.cost > 0)).toBe(true);
      expect(state.coins).toBe(LOOP_V2_STARTING_COINS + state.runStats.totalCoinsEarned);
    }));

  it('never re-issues a bought offer id when the expanded shop is bought out and rerolled', () =>
    withLoopV2AndExpansion(true, true, () => {
      let state = createRun('loop-v2-buyout-reroll', deps);
      state = dispatch(state, { type: 'draftItem', offerIndex: 0 }, deps);
      state = dispatch(state, { type: 'placeItem', slot: { row: 0, col: 0 } }, deps);

      // Rich-player scenario: afford the entire shop plus a reroll. Coins are
      // sim-internal (not RNG-derived), so granting them keeps offers untouched.
      state.coins = 500;
      state = dispatch(state, { type: 'expandShelf' }, deps);
      expect(state.shelf.size.rows).toBe(4);

      const seenOfferIds = new Set(state.currentOffers.map((offer) => offer.offerId));
      const boughtInstanceIds = new Set<string>();
      const slots = state.shelf.slots
        .filter((entry) => entry.item === null)
        .map((entry) => entry.slot);

      // Two full buyout+reroll cycles: the reroll after an EMPTY shop is the
      // degenerate case that used to reproduce the day's opening offer set
      // (salt collapsed to ''), minting duplicate instanceIds on re-buy.
      for (let cycle = 0; cycle < 2; cycle += 1) {
        while (state.currentOffers.length > 0) {
          state = dispatch(state, { type: 'buyOffer', offerIndex: 0 }, deps);
          boughtInstanceIds.add(state.heldItem!.instanceId);
          const slot = slots.shift();
          if (!slot) throw new Error('Expected enough expanded shelf slots for the buyout.');
          state = dispatch(state, { type: 'placeItem', slot }, deps);
        }
        state = dispatch(state, { type: 'reroll' }, deps);
        for (const offer of state.currentOffers) {
          expect(seenOfferIds.has(offer.offerId)).toBe(false);
          expect(boughtInstanceIds.has(`${offer.offerId}-inst`)).toBe(false);
          seenOfferIds.add(offer.offerId);
        }
      }

      // No duplicate instanceIds anywhere on the shelf.
      const placed = state.shelf.slots
        .map((entry) => entry.item?.instanceId)
        .filter((id): id is string => Boolean(id));
      expect(new Set(placed).size).toBe(placed.length);
    }));

  it('fills the shelf faster than v1 on the same scripted bot arc', () => {
    const seed = 'loop-v2-arc';
    const v1 = withLoopV2(false, () => playRun(seed, 'greedy', deps, 160));
    const v2 = withLoopV2(true, () => playRun(seed, 'greedy', deps, 160));

    const v1Day3 = v1.metrics.occupancyByDay['3'] ?? 0;
    const v2Day3 = v2.metrics.occupancyByDay['3'] ?? 0;

    expect(v1Day3).toBeGreaterThan(0);
    expect(v2Day3).toBeGreaterThan(v1Day3);
    expect(v2.metrics.itemsBought).toBeGreaterThan(v1.metrics.itemsBought);
  });
});

describe('shelf expansion coin sink', () => {
  it('expands a loop-v2 run from 3x4 to 4x4 exactly once at exact cost', () =>
    withLoopV2AndExpansion(true, true, () => {
      const state = makeState([], {
        phase: 'arrange',
        coins: SHELF_EXPANSION_COST,
        loopV2: true,
      });

      const after = dispatch(state, { type: 'expandShelf' }, deps);

      expect(after.coins).toBe(0);
      expect(after.shelf.size).toEqual({ rows: 4, cols: 4 });
      expect(after.shelf.slots).toHaveLength(16);
      expect(after.shelf.slots.slice(12)).toEqual([
        { slot: { row: 3, col: 0 }, item: null },
        { slot: { row: 3, col: 1 }, item: null },
        { slot: { row: 3, col: 2 }, item: null },
        { slot: { row: 3, col: 3 }, item: null },
      ]);
      expect(GameStateSchema.parse(JSON.parse(JSON.stringify(after)) as unknown)).toEqual(after);
    }));

  it('rejects a second expansion at 4 rows', () =>
    withLoopV2AndExpansion(true, true, () => {
      const state = makeState([], {
        phase: 'restock',
        coins: SHELF_EXPANSION_COST,
        loopV2: true,
      });
      const expanded = dispatch(state, { type: 'expandShelf' }, deps);

      expect(() =>
        dispatch({ ...expanded, coins: SHELF_EXPANSION_COST }, { type: 'expandShelf' }, deps),
      ).toThrow(EngineError);
    }));

  it('rejects expansion while an item is held', () =>
    withLoopV2AndExpansion(true, true, () => {
      const state = makeState([], {
        phase: 'restock',
        coins: SHELF_EXPANSION_COST,
        loopV2: true,
        heldItem: makeInstance(
          { slot: { row: 0, col: 0 }, itemId: 'observation-hive', baseValue: 4 },
          99,
        ),
      });

      expect(() => dispatch(state, { type: 'expandShelf' }, deps)).toThrow(EngineError);
    }));

  it('keeps expansion illegal and hidden when the expansion flag is off', () =>
    withLoopV2AndExpansion(true, false, () => {
      const state = makeState([], {
        phase: 'restock',
        coins: SHELF_EXPANSION_COST,
        loopV2: true,
      });

      expect(legalActions(state, deps).some((action) => action.type === 'expandShelf')).toBe(false);
      expect(uiAffordances(state).some((action) => action.type === 'expandShelf')).toBe(false);
      expect(() => dispatch(state, { type: 'expandShelf' }, deps)).toThrow(EngineError);
    }));

  it('keeps expansion illegal for v1 runs even when the env flag is on', () =>
    withLoopV2AndExpansion(false, true, () => {
      const state = makeState([], {
        phase: 'arrange',
        coins: SHELF_EXPANSION_COST,
      });

      expect(legalActions(state, deps).some((action) => action.type === 'expandShelf')).toBe(false);
      expect(uiAffordances(state).some((action) => action.type === 'expandShelf')).toBe(false);
      expect(() => dispatch(state, { type: 'expandShelf' }, deps)).toThrow(EngineError);
    }));
});
