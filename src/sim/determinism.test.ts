import { describe, expect, it } from 'vitest';

import { loadCombos, loadItemTable } from '../items';
import { playRun } from './bots';
import { hashState } from './hash';
import { runReplay } from './replay';

/**
 * Kickoff §5 quality bar:
 * - fixed seed + action list → exact state hash
 * - 200 random-action replays hashed twice, identical
 */

const deps = { table: loadItemTable(), combos: loadCombos() };

describe('determinism', () => {
  it('fixed seed + fixed action list produces the pinned state hash', () => {
    const bot = playRun('determinism-fixture', 'random', deps, 60);
    const replayed = runReplay({ seed: bot.seed, actions: bot.actions }, deps);
    const hash = hashState(replayed);
    expect(hash).toBe(hashState(bot.finalState));
    // Pinned: any engine change that shifts scoring, RNG derivation, offer
    // generation, or rollover order must consciously update this value.
    // Updated for the Front Window spotlight prototype (adds a per-day
    // rngFor(seed,'spotlight',day) derivation + a spotlight scoring mult) and
    // the Today's Order prototype (a per-cycle rngFor(seed,'order',cycle)
    // derivation + a set-bonus scoring mult; order re-keyed day→cycle + count 3→2).
    expect(hash).toMatchInlineSnapshot(`"8d48e1c5a6ad14c9"`);
  });

  it('200 random-action replays hash identically when run twice', () => {
    for (let index = 0; index < 200; index += 1) {
      const seed = `determinism-${index}`;
      const bot = playRun(seed, 'random', deps, 40);
      const first = hashState(runReplay({ seed, actions: bot.actions }, deps));
      const second = hashState(runReplay({ seed, actions: bot.actions }, deps));
      expect(second).toBe(first);
      expect(first).toBe(hashState(bot.finalState));
    }
  });
});
