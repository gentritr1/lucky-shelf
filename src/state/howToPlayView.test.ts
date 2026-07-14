import { describe, expect, it } from 'vitest';

import { SPOTLIGHT_ENABLED } from '../sim/economy';
import { withFlagWorld } from '../sim/testkit';

import { howToPlayGlossary, type GlossaryGroup } from './howToPlayView';

/**
 * GLOS-1 glossary gating. The glossary must always define the concepts the
 * player can always meet, and must NEVER define a term for a mechanic gated OFF
 * — otherwise the lookup surface teaches a word the run can't produce. Flag
 * worlds are pinned with `withFlagWorld` (every env flag forced, not ambient) so
 * the assertions survive a compiled-default flip (the graduation scar).
 *
 * Note: `Front Window` tracks the compile-time `SPOTLIGHT_ENABLED` constant, not
 * an env flag, so `withFlagWorld` can't toggle it; its presence is asserted
 * against that constant rather than pinned.
 */

const flatTerms = (groups: GlossaryGroup[]): string[] =>
  groups.flatMap((group) => group.terms.map((entry) => entry.term));

const ALWAYS_ON = [
  'Trade',
  'Next to',
  'Named Combo',
  'Rent',
  'Day Total',
  'Catalog',
  'Rarity Bands',
  'Delivery',
  'Moves',
  'Daily Shelf',
  'Streak',
] as const;

describe('howToPlayGlossary', () => {
  it('always defines the concepts the player can always meet', () => {
    // Even in the fully-OFF world, every unconditional term is present.
    withFlagWorld([], () => {
      const terms = flatTerms(howToPlayGlossary());
      for (const term of ALWAYS_ON) {
        expect(terms).toContain(term);
      }
    });
  });

  it('hides every env-gated term when its flag is off', () => {
    withFlagWorld([], () => {
      const terms = flatTerms(howToPlayGlossary());
      expect(terms).not.toContain('Build'); // tag synergy off
      expect(terms).not.toContain('Supplier'); // build steering off
      expect(terms).not.toContain('Daily Target'); // goal ladder off
      expect(terms).not.toContain('Reroll'); // goal ladder off
    });
  });

  it('defines Build only when tag synergy is on', () => {
    withFlagWorld([], () => expect(flatTerms(howToPlayGlossary())).not.toContain('Build'));
    withFlagWorld(['TAG_SYNERGY_ENABLED'], () =>
      expect(flatTerms(howToPlayGlossary())).toContain('Build'),
    );
  });

  it('defines Supplier only when build steering is on', () => {
    withFlagWorld([], () => expect(flatTerms(howToPlayGlossary())).not.toContain('Supplier'));
    withFlagWorld(['BUILD_STEERING_ENABLED'], () =>
      expect(flatTerms(howToPlayGlossary())).toContain('Supplier'),
    );
  });

  it('defines Daily Target and Reroll only when the goal ladder is live', () => {
    // Goal ladder needs LOOP_V2 as well (goalLadderEnabled gates on both).
    withFlagWorld(['GOAL_LADDER_ENABLED'], () => {
      // LOOP_V2 off → ladder inert → terms absent.
      const terms = flatTerms(howToPlayGlossary());
      expect(terms).not.toContain('Daily Target');
      expect(terms).not.toContain('Reroll');
    });
    withFlagWorld(['LOOP_V2_ENABLED', 'GOAL_LADDER_ENABLED'], () => {
      const terms = flatTerms(howToPlayGlossary());
      expect(terms).toContain('Daily Target');
      expect(terms).toContain('Reroll');
    });
  });

  it('defines Front Window in lockstep with SPOTLIGHT_ENABLED', () => {
    const terms = flatTerms(howToPlayGlossary());
    expect(terms.includes('Front Window')).toBe(SPOTLIGHT_ENABLED);
  });

  it('returns two non-empty groups (THE DAY / THE COLLECTION)', () => {
    withFlagWorld([], () => {
      const groups = howToPlayGlossary();
      expect(groups.map((group) => group.label)).toEqual(['THE DAY', 'THE COLLECTION']);
      for (const group of groups) {
        expect(group.terms.length).toBeGreaterThan(0);
      }
    });
  });

  it('never repeats a term across the page', () => {
    // Every gate on: the maximal term set must still be duplicate-free.
    withFlagWorld(
      ['LOOP_V2_ENABLED', 'GOAL_LADDER_ENABLED', 'TAG_SYNERGY_ENABLED', 'BUILD_STEERING_ENABLED'],
      () => {
        const terms = flatTerms(howToPlayGlossary());
        expect(new Set(terms).size).toBe(terms.length);
      },
    );
  });

  it('keeps every definition drift-proof — one sentence, no bare numbers', () => {
    withFlagWorld(
      ['LOOP_V2_ENABLED', 'GOAL_LADDER_ENABLED', 'TAG_SYNERGY_ENABLED', 'BUILD_STEERING_ENABLED'],
      () => {
        for (const group of howToPlayGlossary()) {
          for (const entry of group.terms) {
            expect(entry.definition.length).toBeGreaterThan(0);
            // No literal digits — the glossary must not pin a tunable number
            // (the one player-facing constant, the Front Window ×N, lives on the
            // TWISTS page; the glossary stays number-free so it never drifts).
            expect(entry.definition).not.toMatch(/[0-9]/);
          }
        }
      },
    );
  });
});
