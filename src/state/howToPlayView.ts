import {
  DEMAND_MULT,
  SPOTLIGHT_MULT,
  DEMAND_ENABLED,
  SPOTLIGHT_ENABLED,
  TAG_SYNERGY_LADDER,
  buildSteeringEnabled,
  goalLadderEnabled,
  tagSynergyEnabled,
} from '../sim/economy';

/**
 * How-to-Play flag gating (ONB-1). The doc route is a screen, so per the Lane
 * boundary it must not value-import `@/sim`; this view-model is the sanctioned
 * seam (same pattern as the store selectors) and reports which "daily twist"
 * rows the onboarding page should show.
 *
 * The booleans MIRROR the run HUD's own gating so the section never teaches a
 * mechanic the player can't see:
 * - `spotlight` ← SPOTLIGHT_ENABLED (engine `pickSpotlight` returns null when
 *   off → `GameState.spotlight` absent → the ShelfScene window marker is hidden;
 *   run.tsx passes `gameState.spotlight`).
 * - `order` ← DEMAND_ENABLED && !tagSynergyEnabled() (engine `pickCycleOrder`
 *   returns null when off → `GameState.dailyOrder` absent → `orderHudView`
 *   returns null → the ORDER goal chip is hidden; and scoring fires order ONLY
 *   when the synergy flag is off — `!synergyEnabled && order …` in
 *   resolveOpenShop — so under synergy the chip/teaching would promise a ×1.5
 *   that never pays. Human ruling 2026-07-11: hide rather than stack).
 * - `target` ← goalLadderEnabled() (createRun only sets `GameState.dailyTarget`
 *   when the goal ladder is on; run.tsx shows the TARGET chip off that field).
 *
 * Pure: reads compiled/env flag state, no persisted-state or run coupling.
 */
export interface HowToPlayTwists {
  spotlight: boolean;
  order: boolean;
  target: boolean;
  /** Front Window multiplier (integer), surfaced only when `spotlight`. */
  spotlightMult: number;
  /** Today's Order multiplier, surfaced only when `order`. */
  orderMult: number;
  /** True when at least one twist row is enabled (gates the whole page). */
  any: boolean;
}

export function howToPlayTwists(): HowToPlayTwists {
  const spotlight = SPOTLIGHT_ENABLED;
  const order = DEMAND_ENABLED && !tagSynergyEnabled();
  const target = goalLadderEnabled();
  return {
    spotlight,
    order,
    target,
    spotlightMult: SPOTLIGHT_MULT,
    orderMult: DEMAND_MULT,
    any: spotlight || order || target,
  };
}

/**
 * Tag-synergy teach block gating (Multipliers page, block 2). Mirrors the
 * scoring flag: `tagSynergyEnabled()` is the same read `resolveOpenShop` makes
 * before applying the ladder (scoring skips it entirely when off), so the page
 * only teaches "matching trade" sets when they can actually fire. The entry
 * mult/count come from the ladder's FIRST step so the copy never pins a value
 * the sim doesn't pay.
 */
export interface HowToPlaySynergy {
  enabled: boolean;
  /** First ladder step: minimum same-tag count for any bonus (e.g. 3). */
  minCount: number;
  /** First ladder step's multiplier (e.g. 1.2). */
  mult: number;
}

export function howToPlaySynergy(): HowToPlaySynergy {
  const first = TAG_SYNERGY_LADDER[0] ?? { minCount: 3, mult: 1.2 };
  return {
    enabled: tagSynergyEnabled(),
    minCount: first.minCount,
    mult: first.mult,
  };
}

/**
 * Glossary term list (GLOS-1). The How-to-Play glossary page is a lookup surface
 * for the words the game coins in the HUD and cascade; this seam bakes the SAME
 * flag gating the run uses so the page never defines a term for a mechanic the
 * player can't currently meet (the screen must not value-import `@/sim`).
 *
 * Gated terms mirror their run gating exactly:
 * - `Build` ← tagSynergyEnabled() (scoring applies the same-trade ladder only
 *   when this flag is on — `resolveOpenShop` skips it otherwise).
 * - `Supplier` ← buildSteeringEnabled() (the `chooseSupplier` action throws when
 *   the flag is off, and the delivery screen hides the picker).
 * - `Front Window` ← SPOTLIGHT_ENABLED (createRun leaves `GameState.spotlight`
 *   absent when off, so no slot is ever lit).
 * - `Daily Target` + `Reroll` ← goalLadderEnabled() (createRun only sets
 *   `GameState.dailyTarget` under the ladder, and the free-reroll reward — the
 *   thing that makes Reroll worth teaching here — exists only with it).
 *
 * Definitions are number-free by construction so they never drift with tuning
 * (the one named constant a player meets, the Front Window ×N, is already taught
 * on the TWISTS page). Grouped into the run loop ("THE DAY") and the cross-run
 * meta ("THE COLLECTION"); the always-on terms guarantee both groups are never
 * empty, so the page always has content.
 *
 * Pure: reads compiled/env flag state only, no persisted-state or run coupling.
 */
export interface GlossaryTerm {
  term: string;
  definition: string;
}

export interface GlossaryGroup {
  /** Small-caps section label ("THE DAY"). */
  label: string;
  terms: GlossaryTerm[];
}

export function howToPlayGlossary(): GlossaryGroup[] {
  const build = tagSynergyEnabled();
  const supplier = buildSteeringEnabled();
  const spotlight = SPOTLIGHT_ENABLED;
  const target = goalLadderEnabled();

  const day: GlossaryTerm[] = [
    {
      term: 'Delivery',
      definition: 'The start of each day, where you draft new stock from a few offers.',
    },
    {
      term: 'Moves',
      definition:
        'Rearranging items already on the shelf — the first few each day are free, then each one costs coins.',
    },
    {
      term: 'Trade',
      definition:
        'The kind an item is — drink, food, antique and the like; matching trades power your multipliers.',
    },
    {
      term: 'Next to',
      definition:
        'Touching left, right, above, or below — diagonals don’t count. Many item rules only reach the slots next to them.',
    },
    ...(build
      ? [
          {
            term: 'Build',
            definition:
              "Your shelf's identity: stock several items of the same trade and every one of them pays more.",
          },
        ]
      : []),
    ...(supplier
      ? [
          {
            term: 'Supplier',
            definition:
              'A trade you pick at the start of a run; your shop then leans toward stock that fits it.',
          },
        ]
      : []),
    ...(spotlight
      ? [
          {
            term: 'Front Window',
            definition:
              'One lit shelf slot each day — whatever you place there pays a big multiplier.',
          },
        ]
      : []),
    {
      term: 'Named Combo',
      definition:
        "A special arrangement with a name — discover one and it's stamped into your Catalog.",
    },
    {
      term: 'Day Total',
      definition: 'Every item and bonus paid out when you open the shop, added into the day’s coins.',
    },
    ...(target
      ? [
          {
            term: 'Daily Target',
            definition: "A coin goal for the day; beat it to earn a free reroll.",
          },
          {
            term: 'Reroll',
            definition:
              'Swap the shop’s current offers for a fresh set — free with a target reward, otherwise a few coins.',
          },
        ]
      : []),
    {
      term: 'Rent',
      definition:
        'The bill that comes due every few days — pay it from your coins or the run ends.',
    },
  ];

  const collection: GlossaryTerm[] = [
    {
      term: 'Catalog',
      definition:
        "Your permanent collection — every item you've discovered and every combo you've earned, kept across runs.",
    },
    {
      term: 'Rarity Bands',
      definition: 'The tiers the Catalog sorts items into — Common, Fine, Rare and Heirloom.',
    },
    {
      term: 'Daily Shelf',
      definition: 'One seeded run everyone shares each calendar day, played once.',
    },
    {
      term: 'Streak',
      definition: "How many days in a row you've played the Daily Shelf.",
    },
  ];

  return [
    { label: 'THE DAY', terms: day },
    { label: 'THE COLLECTION', terms: collection },
  ];
}
