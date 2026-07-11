import {
  DEMAND_MULT,
  SPOTLIGHT_MULT,
  DEMAND_ENABLED,
  SPOTLIGHT_ENABLED,
  TAG_SYNERGY_LADDER,
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
