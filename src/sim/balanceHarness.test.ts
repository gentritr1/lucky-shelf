import { describe, expect, it } from 'vitest';

import {
  BALANCE_FLAG_CONFIGS,
  DEFAULT_BALANCE_POLICIES,
  FABLE_BALANCE_TARGET_BANDS,
  assertBalanceBands,
  evaluateBalanceBands,
  runBalanceReport,
  type BalanceTargetBands,
} from './balanceHarness';

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

  it('leaves Fable target bands inert until the TODO constants are filled', () => {
    const report = runBalanceReport({
      runs: 2,
      seed: 'balance-no-targets',
      maxActions: 120,
      configs: ['baseline'],
      policies: ['floor', 'ceiling-combo'],
    });

    expect(FABLE_BALANCE_TARGET_BANDS).toEqual({
      ceilingMedianRunLengthDays: null,
      ceilingMaxMedianSurplusRatio: null,
      ceilingMaxConsecutiveDaysAboveSurplus: null,
      floorFirstRentSurvivalRate: null,
      nearDeathRunRate: null,
      buildSwingTotalCoinsRatio: null,
    });
    expect(evaluateBalanceBands(report)).toEqual([]);
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

  it.skip('TODO(fable): enforces the approved balance target bands', () => {
    const report = runBalanceReport();
    assertBalanceBands(report);
  });
});
