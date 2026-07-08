import { describe, expect, it } from 'vitest';

import { emptyCatalog, type CatalogStats, type RunStats } from '../contracts';
import { makeState } from '../sim/testkit';
import { personalBestsView, type PersonalBestRow } from './catalogStore';
import { NEAR_MISS_MARGIN, nearMissView } from './store';

function runStats(overrides: Partial<RunStats>): RunStats {
  return {
    totalCoinsEarned: 0,
    deepestRentSurvived: 0,
    daysSurvived: 0,
    bestDayTotal: 0,
    bestComboIds: [],
    ...overrides,
  };
}

function stats(overrides: Partial<CatalogStats>): CatalogStats {
  return { ...emptyCatalog().stats, ...overrides };
}

describe('personalBestsView', () => {
  it('flags a beaten record and reports the best including this run', () => {
    const rows = personalBestsView(
      stats({ bestDayTotal: 40, longestRun: 5, deepestRentSurvived: 2 }),
      runStats({ bestDayTotal: 55, daysSurvived: 5, deepestRentSurvived: 4 }),
    );
    const find = (key: PersonalBestRow['key']) => rows.find((r) => r.key === key);

    // Best day beaten (55 > 40).
    expect(find('bestDay')).toMatchObject({ thisRun: 55, best: 55, isRecord: true, kind: 'coin' });
    // Longest run tied, not beaten (5 == 5) → no record, best unchanged.
    expect(find('longestRun')).toMatchObject({ thisRun: 5, best: 5, isRecord: false, kind: 'days' });
    // Deepest rent beaten (4 > 2).
    expect(find('deepestRent')).toMatchObject({ thisRun: 4, best: 4, isRecord: true, kind: 'count' });
  });

  it('keeps the standing best when this run falls short', () => {
    const rows = personalBestsView(
      stats({ bestDayTotal: 90, longestRun: 12, deepestRentSurvived: 6 }),
      runStats({ bestDayTotal: 30, daysSurvived: 4, deepestRentSurvived: 2 }),
    );
    for (const row of rows) expect(row.isRecord).toBe(false);
    expect(rows.map((r) => r.best)).toEqual([90, 12, 6]);
  });

  it('does not celebrate a zero as a record on the first run', () => {
    const rows = personalBestsView(
      emptyCatalog().stats,
      runStats({ bestDayTotal: 20, daysSurvived: 3, deepestRentSurvived: 0 }),
    );
    const find = (key: PersonalBestRow['key']) => rows.find((r) => r.key === key);
    expect(find('bestDay')?.isRecord).toBe(true); // 20 > 0
    expect(find('longestRun')?.isRecord).toBe(true); // 3 > 0
    expect(find('deepestRent')?.isRecord).toBe(false); // 0 is not > 0
  });
});

describe('nearMissView', () => {
  it('is null when the run never paid rent (field absent)', () => {
    expect(nearMissView(makeState([]))).toBeNull();
  });

  it('is null when rent was cleared comfortably (margin above the threshold)', () => {
    const state = makeState([], {
      runStats: runStats({ closestRentMargin: NEAR_MISS_MARGIN + 1 }),
    });
    expect(nearMissView(state)).toBeNull();
  });

  it('surfaces the coins-to-spare on a genuine squeaker (margin at the threshold)', () => {
    const state = makeState([], {
      runStats: runStats({ closestRentMargin: NEAR_MISS_MARGIN }),
    });
    expect(nearMissView(state)).toEqual({ coinsToSpare: NEAR_MISS_MARGIN });
  });

  it('surfaces a 0-coin nail-biter', () => {
    const state = makeState([], { runStats: runStats({ closestRentMargin: 0 }) });
    expect(nearMissView(state)).toEqual({ coinsToSpare: 0 });
  });
});
