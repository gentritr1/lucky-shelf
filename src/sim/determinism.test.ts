import { describe, expect, it } from 'vitest';

import { loadCombos, loadItemTable } from '../items';
import { playRun } from './bots';
import { hashState } from './hash';
import { runReplay } from './replay';
import { withFlagWorld } from './testkit';

/**
 * Kickoff §5 quality bar:
 * - fixed seed + action list → exact state hash
 * - 200 random-action replays hashed twice, identical
 */

const deps = { table: loadItemTable(), combos: loadCombos() };

describe('determinism', () => {
  it('fixed seed + fixed action list produces the FROZEN v1 pinned state hash', () =>
    withFlagWorld([], () => {
      const bot = playRun('determinism-fixture', 'random', deps, 60);
      const replayed = runReplay({ seed: bot.seed, actions: bot.actions }, deps);
      const hash = hashState(replayed);
      expect(hash).toBe(hashState(bot.finalState));
      // Pinned: any engine change that shifts scoring, RNG derivation, offer
      // generation, or rollover order must consciously update this value.
      // Since graduation (RELEASE-PLAN Gate 1.3) this trajectory runs under an
      // explicit all-OFF flag world: it is the frozen pre-v2 regression floor
      // and the SAME hash the pre-flip default produced — old saves' rules.
      expect(hash).toMatchInlineSnapshot(`"8d48e1c5a6ad14c9"`);
    }));

  it('fixed seed + fixed action list produces the pinned GRADUATING state hash', () => {
    // No env manipulation: this is the true shipping default (the graduated
    // depth stack). Any change to the graduating experience must consciously
    // update this value — the ON-path twin of the frozen pin above.
    // Updated 2026-07-13 by the Gate-1.2 economy retune (A-M9): TAG_SYNERGY_LADDER
    // trim + re-derived GOAL_LADDER_TARGETS shifted the graduating economy, so this
    // ON-path hash moved from 4d5b9f57ba63b916. The frozen v1 pin above is unchanged.
    const bot = playRun('determinism-fixture', 'random', deps, 60);
    const replayed = runReplay({ seed: bot.seed, actions: bot.actions }, deps);
    const hash = hashState(replayed);
    expect(hash).toBe(hashState(bot.finalState));
    expect(hash).toMatchInlineSnapshot(`"1adfc85f256b8512"`);
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
