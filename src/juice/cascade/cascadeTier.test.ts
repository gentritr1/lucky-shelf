import { describe, expect, it } from 'vitest';

import type { ScoringTrace, TraceEvent } from '@/contracts';

import {
  CASCADE_TIER_THRESHOLDS as T,
  cascadeTier,
  dayTotalOf,
  ruleFireCount,
} from './cascadeTier';

/** Build a trace with `fires` ruleFire events and a terminal dayTotal of `coins`. */
function trace(coins: number, fires: number): ScoringTrace {
  const events: TraceEvent[] = [];
  for (let i = 0; i < fires; i += 1) {
    events.push({
      kind: 'ruleFire',
      sourceSlot: { row: 0, col: 0 },
      targetSlot: { row: 0, col: 1 },
      ruleId: 'adjacency',
      delta: { flat: 1 },
      runningTotal: i + 1,
    });
  }
  events.push({ kind: 'dayTotal', coins });
  return { traceId: 't', day: 1, seed: 's', events };
}

describe('cascadeTier accessors', () => {
  it('reads the terminal dayTotal and counts ruleFires', () => {
    const tr = trace(120, 4);
    expect(dayTotalOf(tr)).toBe(120);
    expect(ruleFireCount(tr)).toBe(4);
  });

  it('dayTotalOf returns 0 when there is somehow no dayTotal event', () => {
    expect(dayTotalOf({ traceId: 't', day: 1, seed: 's', events: [
      { kind: 'itemTotal', slot: { row: 0, col: 0 }, total: 5 },
    ] })).toBe(0);
  });
});

describe('cascadeTier — with a goal-ladder target', () => {
  const target = 100;
  // Boundaries derived from the exported constants so tuning them can't rot the
  // tests. Few fires (3) so the ruleFires branches never interfere.
  const belowBig = Math.round((T.bigTargetMult - 0.1) * target);
  const atBig = Math.round(T.bigTargetMult * target);
  const atApex = Math.round(T.apexTargetMult * target);

  it('is normal just below bigTargetMult with few fires', () => {
    expect(cascadeTier(trace(belowBig, 3), target)).toBe('normal');
  });

  it('is big at exactly bigTargetMult', () => {
    expect(cascadeTier(trace(atBig, 3), target)).toBe('big');
  });

  it('is apex at exactly apexTargetMult', () => {
    expect(cascadeTier(trace(atApex, 3), target)).toBe('apex');
  });

  it('is apex on a dense scoring even when the total is below apexTargetMult', () => {
    // apexRuleFires fires but only atBig-level total → the ruleFires OR-branch wins.
    expect(cascadeTier(trace(atBig, T.apexRuleFires), target)).toBe('apex');
  });

  it('does NOT use the bigRuleFires fallback when a target is present', () => {
    // ≥ bigRuleFires but total below bigTargetMult → normal: with a goal, "big"
    // is target-relative, not fire-count.
    expect(cascadeTier(trace(belowBig, T.bigRuleFires + 1), target)).toBe('normal');
  });
});

describe('cascadeTier — no goal ladder (fallback on ruleFire density)', () => {
  it('is normal below the big fire threshold', () => {
    expect(cascadeTier(trace(999, T.bigRuleFires - 1))).toBe('normal');
  });

  it('is big at the big fire threshold regardless of total', () => {
    expect(cascadeTier(trace(10, T.bigRuleFires))).toBe('big');
  });

  it('is apex at the apex fire threshold', () => {
    expect(cascadeTier(trace(10, T.apexRuleFires))).toBe('apex');
  });

  it('treats target 0 / undefined identically (no divide-by-zero apex)', () => {
    expect(cascadeTier(trace(9999, 2), 0)).toBe('normal');
    expect(cascadeTier(trace(9999, 2), undefined)).toBe('normal');
  });
});

describe('cascadeTier thresholds are exported constants', () => {
  it('exposes four tunable numbers in a sane order', () => {
    expect(T.bigTargetMult).toBeLessThan(T.apexTargetMult);
    expect(T.bigRuleFires).toBeLessThan(T.apexRuleFires);
    expect(T.bigTargetMult).toBeGreaterThan(1);
  });
});
