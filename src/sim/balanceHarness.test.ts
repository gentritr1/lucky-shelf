import { describe, expect, it } from 'vitest';

import {
  ASPIRATIONAL_TARGET_BANDS,
  BALANCE_FLAG_CONFIGS,
  DEFAULT_BALANCE_POLICIES,
  FABLE_BALANCE_TARGET_BANDS,
  assertBalanceBands,
  evaluateBalanceBands,
  runBalanceReport,
  type BalanceTargetBands,
} from './balanceHarness';

const NO_BANDS: BalanceTargetBands = {
  ceilingMedianRunLengthDays: null,
  ceilingMaxMedianSurplusRatio: null,
  ceilingMaxConsecutiveDaysAboveSurplus: null,
  floorFirstRentSurvivalRate: null,
  nearDeathRunRate: null,
  buildSwingTotalCoinsRatio: null,
};

describe('balance harness', () => {
  it('reports floor and ceiling metrics for every balance flag config', () => {
    const report = runBalanceReport({ runs: 3, seed: 'balance-test', maxActions: 160 });

    expect(report.configs.map((config) => config.config)).toEqual(
      BALANCE_FLAG_CONFIGS.map((config) => config.name),
    );
    for (const config of report.configs) {
      for (const policy of DEFAULT_BALANCE_POLICIES) {
        const policyReport = config.policies[policy];
        expect(policyReport, `${config.config}/${policy}`).toBeDefined();
        expect(policyReport?.runs).toBe(3);
        expect(policyReport?.daysSurvived.count).toBe(3);
        expect(Object.keys(policyReport?.surplusByDay ?? {}).length).toBeGreaterThan(0);
      }
    }
  }, 30000);

  it('activates the guardrail bands and defers the rest to Fable', () => {
    // Active guardrails (bracket current reality — see balanceHarness.ts).
    expect(FABLE_BALANCE_TARGET_BANDS.ceilingMedianRunLengthDays).toEqual({ min: 24, max: 36 });
    expect(FABLE_BALANCE_TARGET_BANDS.buildSwingTotalCoinsRatio).toEqual({ min: 1.3, max: 2.0 });
    // Deferred to Fable (loose economy + tension are their tuning call).
    expect(FABLE_BALANCE_TARGET_BANDS.ceilingMaxMedianSurplusRatio).toBeNull();
    expect(FABLE_BALANCE_TARGET_BANDS.ceilingMaxConsecutiveDaysAboveSurplus).toBeNull();
    expect(FABLE_BALANCE_TARGET_BANDS.nearDeathRunRate).toBeNull();
    // Beginner floor is aspirational + non-blocking (reality ~16–21% < target).
    expect(FABLE_BALANCE_TARGET_BANDS.floorFirstRentSurvivalRate).toBeNull();
    expect(ASPIRATIONAL_TARGET_BANDS.floorFirstRentSurvivalRate).toEqual({ min: 0.4, max: 0.7 });
  });

  it('throws clear band violations when a target is tightened impossibly', () => {
    const report = runBalanceReport({
      runs: 2,
      seed: 'balance-impossible-target',
      maxActions: 120,
      configs: ['baseline'],
      policies: ['ceiling-combo'],
    });
    const impossible: BalanceTargetBands = {
      ...FABLE_BALANCE_TARGET_BANDS,
      ceilingMedianRunLengthDays: { min: 999, max: 1000 },
    };

    expect(() => assertBalanceBands(report, impossible)).toThrow(/median survival/);
  });

  it('enforces the approved guardrail bands', () => {
    // Run-length is stable across run counts, so assert it on a small real report.
    // (The full-fidelity gate that also checks build swing — which is only stable at
    // the calibrated 80-run/seed "balance" report — is `pnpm balance:assert`.)
    const report = runBalanceReport({ runs: 6, seed: 'balance', maxActions: 600 });
    const runLengthOnly: BalanceTargetBands = {
      ...NO_BANDS,
      ceilingMedianRunLengthDays: FABLE_BALANCE_TARGET_BANDS.ceilingMedianRunLengthDays,
    };
    expect(evaluateBalanceBands(report, runLengthOnly)).toEqual([]);

    // Build-swing band LOGIC, exercised deterministically against controlled swing
    // values so the unit suite need not run the flaky-at-low-count 80-run report.
    const swingBand: BalanceTargetBands = {
      ...NO_BANDS,
      buildSwingTotalCoinsRatio: FABLE_BALANCE_TARGET_BANDS.buildSwingTotalCoinsRatio,
    };
    const inBand = { ...report, buildSwingTotalCoinsRatio: { floor: 1.5, 'ceiling-greedy': 1.66 } };
    expect(evaluateBalanceBands(inBand, swingBand)).toEqual([]);
    const outOfBand = { ...report, buildSwingTotalCoinsRatio: { floor: 3.0 } };
    expect(evaluateBalanceBands(outOfBand, swingBand).length).toBeGreaterThan(0);
  }, 30000);
});
