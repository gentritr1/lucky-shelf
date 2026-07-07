import { describe, expect, it } from 'vitest';

import type { GameState, TraceEvent } from '../contracts';
import { loadCombos, loadItemTable } from '../items';
import { playRun } from './bots';
import {
  LOOP_V2_DAILY_SHOP_OFFERS,
  LOOP_V2_ENV_VAR,
  LOOP_V2_STARTING_COINS,
} from './economy';
import { EngineError, createRun, dispatch } from './engine';

const deps = { table: loadItemTable(), combos: loadCombos() };

function withLoopV2<T>(enabled: boolean, run: () => T): T {
  const previous = process.env[LOOP_V2_ENV_VAR];
  if (enabled) process.env[LOOP_V2_ENV_VAR] = '1';
  else delete process.env[LOOP_V2_ENV_VAR];
  try {
    return run();
  } finally {
    if (previous === undefined) delete process.env[LOOP_V2_ENV_VAR];
    else process.env[LOOP_V2_ENV_VAR] = previous;
  }
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
