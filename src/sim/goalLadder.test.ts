import { describe, expect, it } from 'vitest';

import type { GameState } from '../contracts';
import { loadCombos, loadItemTable } from '../items';

import { playRun } from './bots';
import {
  GOAL_LADDER_ENV_VAR,
  GOAL_LADDER_TARGETS,
  LOOP_V2_ENV_VAR,
  REROLL_COST,
  dailyGoalTarget,
  goalLadderEnabled,
} from './economy';
import { EngineError, createRun, dispatch, legalActions } from './engine';
import { hashState } from './hash';
import { makeState, withFlagWorld } from './testkit';

const deps = { table: loadItemTable(), combos: loadCombos() };

/** Full-world pin: every depth flag forced OFF except goal ladder (+ its
 *  loop-v2 prerequisite) when enabled — ambient defaults (e.g. build steering's
 *  supplier gate, the day-2 starter's delivery routing) must not leak in. */
function withGoalLadder<T>(enabled: boolean, run: () => T): T {
  return withFlagWorld(enabled ? [GOAL_LADDER_ENV_VAR, LOOP_V2_ENV_VAR] : [], run);
}

function scoringState(dayTotal: 'hit' | 'miss', overrides?: Partial<GameState>): GameState {
  const baseValue = dayTotal === 'hit' ? dailyGoalTarget(1) : Math.max(0, dailyGoalTarget(1) - 1);
  return makeState([{ slot: { row: 0, col: 0 }, itemId: 'wine-bottle', baseValue }], {
    // Goal ladder requires a v2 run; the engine now reads the per-run loopV2
    // snapshot (not the env flag), so a seeded v2 state must declare it.
    loopV2: true,
    phase: 'arrange',
    coins: 0,
    dailyTarget: dailyGoalTarget(1),
    freeRerollTokens: 0,
    ...overrides,
  });
}

describe('loop v2 phase 3 goal ladder', () => {
  it('requires loop v2 as well as the goal flag', () =>
    withFlagWorld([GOAL_LADDER_ENV_VAR], () => {
        expect(goalLadderEnabled()).toBe(false);
        const state = createRun('goal-without-loop-v2', deps);
        expect(state.dailyTarget).toBeUndefined();
        expect(state.freeRerollTokens).toBeUndefined();
      }));

  it('uses the capped target ladder constant', () => {
    for (let day = 1; day <= 14; day += 1) {
      const expected = GOAL_LADDER_TARGETS[Math.min(day, GOAL_LADDER_TARGETS.length) - 1];
      expect(dailyGoalTarget(day)).toBe(expected);
    }
    expect(dailyGoalTarget(14)).toBe(dailyGoalTarget(12));
    expect(() => dailyGoalTarget(0)).toThrow();
  });

  it('keeps target state absent while the flag is off', () =>
    withGoalLadder(false, () => {
      let state = createRun('goal-off', deps);
      expect(state.dailyTarget).toBeUndefined();
      expect(state.dailyTargetResult).toBeUndefined();
      expect(state.freeRerollTokens).toBeUndefined();

      state = dispatch(state, { type: 'draftItem', offerIndex: 0 }, deps);
      state = dispatch(state, { type: 'placeItem', slot: { row: 0, col: 0 } }, deps);
      state = dispatch(state, { type: 'openShop' }, deps);

      expect(state.dailyTarget).toBeUndefined();
      expect(state.dailyTargetResult).toBeUndefined();
      expect(state.freeRerollTokens).toBeUndefined();
    }));

  it('marks targetMet exactly from dayTotal >= target and grants one free reroll', () =>
    withGoalLadder(true, () => {
      const hit = dispatch(scoringState('hit'), { type: 'openShop' }, deps);
      expect(hit.dailyTargetResult).toEqual({
        day: 1,
        target: dailyGoalTarget(1),
        dayTotal: dailyGoalTarget(1),
        targetMet: true,
        rewardKind: 'freeReroll',
        rewardGranted: true,
      });
      expect(hit.freeRerollTokens).toBe(1);
      expect(hit.dailyTarget).toBe(dailyGoalTarget(2));

      const repeatedHit = dispatch(
        scoringState('hit', { freeRerollTokens: 1 }),
        { type: 'openShop' },
        deps,
      );
      expect(repeatedHit.freeRerollTokens).toBe(1);

      const miss = dispatch(
        scoringState('miss', { freeRerollTokens: 1 }),
        { type: 'openShop' },
        deps,
      );
      expect(miss.dailyTargetResult).toMatchObject({
        day: 1,
        target: dailyGoalTarget(1),
        dayTotal: dailyGoalTarget(1) - 1,
        targetMet: false,
        rewardGranted: false,
      });
      expect(miss.freeRerollTokens).toBe(0);
    }));

  it('consumes a free reroll token before charging coins', () =>
    withGoalLadder(true, () => {
      const restock = dispatch(scoringState('hit', { coins: 0 }), { type: 'openShop' }, deps);
      const coinsBeforeFreeReroll = restock.coins;

      expect(restock.phase).toBe('restock');
      expect(restock.freeRerollTokens).toBe(1);
      expect(legalActions(restock, deps).some((action) => action.type === 'reroll')).toBe(true);

      const freeRerolled = dispatch(restock, { type: 'reroll' }, deps);
      expect(freeRerolled.freeRerollTokens).toBe(0);
      expect(freeRerolled.coins).toBe(coinsBeforeFreeReroll);

      const paidRerolled = dispatch(freeRerolled, { type: 'reroll' }, deps);
      expect(paidRerolled.coins).toBe(coinsBeforeFreeReroll - REROLL_COST);
    }));

  it('blocks reroll with no coins and no token', () =>
    withGoalLadder(true, () => {
      const state = {
        ...scoringState('miss', { phase: 'restock', coins: 0, currentOffers: [] }),
        freeRerollTokens: 0,
      };

      expect(legalActions(state, deps).some((action) => action.type === 'reroll')).toBe(false);
      expect(() => dispatch(state, { type: 'reroll' }, deps)).toThrow(EngineError);
    }));

  it('keeps goal-ladder-enabled bot runs deterministic for the same seed', () =>
    withGoalLadder(true, () => {
      const first = playRun('goal-ladder-determinism', 'greedy', deps, 180);
      const second = playRun('goal-ladder-determinism', 'greedy', deps, 180);

      expect(second.actions).toEqual(first.actions);
      expect(hashState(second.finalState)).toBe(hashState(first.finalState));
      expect(first.metrics.goalTargetDays).toBeGreaterThan(0);
      expect(first.metrics.goalRewardsGranted).toBe(first.metrics.goalMetDays);
    }));
});
