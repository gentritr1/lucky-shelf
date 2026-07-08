import type { ScoringTrace } from '@/contracts';

/**
 * Pure cascade *spectacle tiering* (B-M6, "spectacle without swing" / P4). No
 * React, no Reanimated — a function of the trace so it's unit-testable in node
 * and so the presentation layer stays a thin switch on the result.
 *
 * The economy's build-swing guardrail is deliberately gentle (1.3–2.0×, Fable's
 * — untouched here), so the top-end thrill has to come from *presentation*. This
 * classifies a day's scoring into three escalating visual budgets; the renderer
 * short-circuits on `'normal'` so ordinary days stay byte-identical to shipped.
 */

export type CascadeTier = 'normal' | 'big' | 'apex';

/**
 * Thresholds TUNED against 120-run full-stack fuzz traces (see
 * `scripts/cascade-tiers.ts` and the B-M6 review packet). The brief's provisional
 * 1.5×/2.5×/12-fire numbers were far too low for the live economy — a median
 * full-stack day already scores 1.88× its goal target with 27 ruleFires, so those
 * caught ~84% of days. These land apex ≈ once per ~2 runs (see the packet's
 * tension note on the brief's dual frequency targets). Exported so the tests and
 * the frequency report reference the same numbers.
 *
 * - `*TargetMult` gate the day total against the goal-ladder target (the primary
 *   path when the goal ladder is on — which is the full-stack fuzz condition).
 * - `*RuleFires` are the goal-ladder-*less* fallback: with no target there is no
 *   per-day yardstick, so a dense scoring (many ruleFires in one day) stands in
 *   for "a big day". `apexRuleFires` also qualifies *with* a target — a 50-fire
 *   day is spectacle regardless of the goal number (the brief's explicit OR).
 */
export const CASCADE_TIER_THRESHOLDS = {
  bigTargetMult: 2.8,
  apexTargetMult: 4.2,
  bigRuleFires: 40,
  apexRuleFires: 50,
} as const;

/** The scored day total — the coins on the terminal `dayTotal` event (0 if absent). */
export function dayTotalOf(trace: ScoringTrace): number {
  for (let i = trace.events.length - 1; i >= 0; i -= 1) {
    const event = trace.events[i];
    if (event && event.kind === 'dayTotal') return event.coins;
  }
  return 0;
}

/** How many rule fires this scoring produced — the density proxy for a big day. */
export function ruleFireCount(trace: ScoringTrace): number {
  let count = 0;
  for (const event of trace.events) if (event.kind === 'ruleFire') count += 1;
  return count;
}

/**
 * Classify a day's cascade into a spectacle tier. `dailyTarget` is the goal
 * ladder's target for the day (absent when the goal ladder is off).
 *
 * apex → the full juice budget (edge glow, spark burst, oversized slam, sting);
 * big  → one extra warm beat (gold wash on the slam, warmer pops);
 * normal → exactly as shipped, no added effects.
 */
export function cascadeTier(trace: ScoringTrace, dailyTarget?: number): CascadeTier {
  const T = CASCADE_TIER_THRESHOLDS;
  const dayTotal = dayTotalOf(trace);
  const ruleFires = ruleFireCount(trace);
  const hasTarget = dailyTarget !== undefined && dailyTarget > 0;

  // APEX. The dense-scoring spike qualifies with or without a goal ladder; the
  // target-relative branch only when there is a target.
  if (ruleFires >= T.apexRuleFires) return 'apex';
  if (hasTarget && dayTotal >= T.apexTargetMult * dailyTarget) return 'apex';

  // BIG. Target-relative when there is a goal; otherwise the ruleFires fallback.
  if (hasTarget) {
    if (dayTotal >= T.bigTargetMult * dailyTarget) return 'big';
  } else if (ruleFires >= T.bigRuleFires) {
    return 'big';
  }

  return 'normal';
}
