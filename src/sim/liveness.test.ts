import { describe, it, expect } from 'vitest';

import type { Action, GameState } from '../contracts';
import { loadCombos, loadItemTable } from '../items';
import {
  BALANCE_FLAG_CONFIGS,
  withBalanceFlagConfig,
} from './balanceHarness';
import { createRun, dispatch, type EngineDeps } from './engine';
import { makeInstance, makeState } from './testkit';
import { uiAffordances, isDeadEnd } from './uiAffordances';
// NOTE: DEMAND_ENABLED / SPOTLIGHT_ENABLED are default-ON consts (no env var),
// so Today's Order + the spotlight are active in every config below.

const deps: EngineDeps = { table: loadItemTable(), combos: loadCombos() };

/** Deterministic RNG so failures reproduce. */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface DriveResult {
  deadEnd: GameState | null;
  illegal: { action: Action; message: string; state: GameState } | null;
  reachedGameOver: boolean;
  steps: number;
}

/** Play a run picking only screen-exposed actions; report any player dead-end or
 *  any exposed action the engine rejects (the model must never lie). */
function driveByAffordances(seed: string, rng: () => number, maxSteps = 4000): DriveResult {
  let state = createRun(seed, deps);
  for (let steps = 0; steps < maxSteps; steps += 1) {
    if (state.phase === 'gameOver') return { deadEnd: null, illegal: null, reachedGameOver: true, steps };
    const acts = uiAffordances(state);
    if (acts.length === 0) return { deadEnd: state, illegal: null, reachedGameOver: false, steps };
    const action = acts[Math.floor(rng() * acts.length)]!;
    try {
      state = dispatch(state, action, deps);
    } catch (error) {
      return {
        deadEnd: null,
        illegal: { action, message: error instanceof Error ? error.message : String(error), state },
        reachedGameOver: false,
        steps,
      };
    }
  }
  return { deadEnd: null, illegal: null, reachedGameOver: false, steps: maxSteps };
}

describe('liveness — the player can never be dead-ended by the screens', () => {
  for (const config of BALANCE_FLAG_CONFIGS) {
    const runs = config.name === 'graduating' ? 40 : 10;
    it(`no screen dead-end or illegal exposed action across ${runs} runs (${config.name})`, () => {
      withBalanceFlagConfig(config, () => {
        for (let i = 0; i < runs; i += 1) {
          const res = driveByAffordances(`liveness-${config.name}-${i}`, mulberry32(1000 + i));
          if (res.deadEnd) {
            throw new Error(
              `DEAD-END in "${config.name}" run ${i} at ${res.deadEnd.phase} (held=${Boolean(
                res.deadEnd.heldItem,
              )}, empty=${res.deadEnd.shelf.slots.filter((s) => !s.item).length}) — no screen action available.`,
            );
          }
          if (res.illegal) {
            throw new Error(
              `MODEL LIE in "${config.name}" run ${i}: screen exposed ${res.illegal.action.type} but engine rejected it — ${res.illegal.message}`,
            );
          }
        }
      });
    }, 30000);
  }

  it('the full-shelf + held-item state (the fixed softlock) is not a dead-end', () => {
    const full = Array.from({ length: 12 }, (_, i) => ({
      slot: { row: Math.floor(i / 4), col: i % 4 }, itemId: 'wine-bottle', baseValue: 6,
    }));
    const stuck = makeState(full, {
      phase: 'arrange',
      heldItem: makeInstance({ slot: { row: 0, col: 0 }, itemId: 'observation-hive', baseValue: 4 }, 99),
    });
    // Regression guard: pre-06771cf this exposed only placeItem (none, full) → empty → dead-end.
    expect(isDeadEnd(stuck)).toBe(false);
    const acts = uiAffordances(stuck);
    expect(acts.length).toBeGreaterThan(0);
    expect(acts.every((a) => a.type === 'sellItem')).toBe(true);
  });
});
