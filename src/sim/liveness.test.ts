import { describe, it, expect } from 'vitest';

import type { Action, GameState } from '../contracts';
import { loadCombos, loadItemTable } from '../items';
import { createRun, dispatch, type EngineDeps } from './engine';
import { makeInstance, makeState } from './testkit';
import { uiAffordances, isDeadEnd } from './uiAffordances';
import {
  BUILD_STEERING_ENV_VAR,
  GOAL_LADDER_ENV_VAR,
  LOOP_V2_ENV_VAR,
  SIGNATURE_ITEMS_ENV_VAR,
  TAG_SYNERGY_ENV_VAR,
} from './economy';
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

function withEnv(vars: Record<string, string | undefined>, fn: () => void): void {
  const prev: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(vars)) {
    prev[k] = process.env[k];
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  try {
    fn();
  } finally {
    for (const [k, v] of Object.entries(prev)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
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

const FLAG_CONFIGS: Record<string, Record<string, string | undefined>> = {
  baseline: {},
  buildSteering: { [BUILD_STEERING_ENV_VAR]: '1' },
  loopV2: { [LOOP_V2_ENV_VAR]: '1', [GOAL_LADDER_ENV_VAR]: '1' },
  allDepth: {
    [LOOP_V2_ENV_VAR]: '1',
    [SIGNATURE_ITEMS_ENV_VAR]: '1',
    [TAG_SYNERGY_ENV_VAR]: '1',
    [BUILD_STEERING_ENV_VAR]: '1',
    [GOAL_LADDER_ENV_VAR]: '1',
  },
};

describe('liveness — the player can never be dead-ended by the screens', () => {
  for (const [name, flags] of Object.entries(FLAG_CONFIGS)) {
    it(`no screen dead-end or illegal exposed action across 40 runs (${name})`, () => {
      withEnv(flags, () => {
        for (let i = 0; i < 40; i += 1) {
          const res = driveByAffordances(`liveness-${name}-${i}`, mulberry32(1000 + i));
          if (res.deadEnd) {
            throw new Error(
              `DEAD-END in "${name}" run ${i} at ${res.deadEnd.phase} (held=${Boolean(
                res.deadEnd.heldItem,
              )}, empty=${res.deadEnd.shelf.slots.filter((s) => !s.item).length}) — no screen action available.`,
            );
          }
          if (res.illegal) {
            throw new Error(
              `MODEL LIE in "${name}" run ${i}: screen exposed ${res.illegal.action.type} but engine rejected it — ${res.illegal.message}`,
            );
          }
        }
      });
    });
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
