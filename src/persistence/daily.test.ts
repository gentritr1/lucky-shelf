import { describe, expect, it } from 'vitest';

import {
  DailySaveKey,
  advanceStreak,
  createDailyPersistence,
  dailySeedFor,
  displayStreakCount,
  previousDateString,
  todayDateString,
  type DailyStreak,
} from './daily';

function memoryStorage(seed?: Record<string, string>) {
  const map = new Map<string, string>(Object.entries(seed ?? {}));
  return {
    getItem: async (k: string) => map.get(k) ?? null,
    setItem: async (k: string, v: string) => void map.set(k, v),
    removeItem: async (k: string) => void map.delete(k),
  };
}

describe('daily persistence', () => {
  it('round-trips a daily record', async () => {
    const p = createDailyPersistence(memoryStorage());
    const record = {
      schemaVersion: 1 as const,
      date: '2026-07-07',
      result: { daysSurvived: 9, coinsEarned: 300, deepestRentSurvived: 3, bestDayTotal: 60, combosThisRun: 2 },
    };
    await p.saveDaily(record);
    expect(await p.loadDaily()).toEqual(record);
  });

  it('returns null when nothing is saved and on corrupt json', async () => {
    expect(await createDailyPersistence(memoryStorage()).loadDaily()).toBeNull();
    expect(
      await createDailyPersistence(memoryStorage({ 'luckyShelf:daily:v1': '{bad' })).loadDaily(),
    ).toBeNull();
  });

  it('builds a stable date-based seed', () => {
    const date = todayDateString(new Date('2026-07-07T10:00:00'));
    expect(date).toBe('2026-07-07');
    expect(dailySeedFor(date)).toBe('daily-2026-07-07');
  });

  // B-M5 migration guard: `streak` is additive. A pre-streak save (the current
  // shipping shape) must load loss-free — written BEFORE any streak UI, per the
  // catalog-wipe scar.
  it('loads a pre-streak (old-shape) record with zero data loss', async () => {
    const oldShape = JSON.stringify({
      schemaVersion: 1,
      date: '2026-07-07',
      result: { daysSurvived: 9, coinsEarned: 300, deepestRentSurvived: 3, bestDayTotal: 60, combosThisRun: 2 },
    });
    const p = createDailyPersistence(memoryStorage({ [DailySaveKey]: oldShape }));
    const loaded = await p.loadDaily();
    expect(loaded).not.toBeNull();
    expect(loaded?.result.daysSurvived).toBe(9);
    expect(loaded?.streak).toBeUndefined();
  });

  it('round-trips a record carrying a streak', async () => {
    const p = createDailyPersistence(memoryStorage());
    const record = {
      schemaVersion: 1 as const,
      date: '2026-07-08',
      result: { daysSurvived: 9, coinsEarned: 300, deepestRentSurvived: 3, bestDayTotal: 60, combosThisRun: 2 },
      streak: { count: 4, lastDate: '2026-07-08' },
    };
    await p.saveDaily(record);
    expect(await p.loadDaily()).toEqual(record);
  });
});

describe('previousDateString', () => {
  it('steps back one day within a month', () => {
    expect(previousDateString('2026-07-08')).toBe('2026-07-07');
  });
  it('crosses a month boundary', () => {
    expect(previousDateString('2026-03-01')).toBe('2026-02-28');
  });
  it('crosses a year boundary', () => {
    expect(previousDateString('2026-01-01')).toBe('2025-12-31');
  });
  it('handles the leap-day boundary', () => {
    expect(previousDateString('2028-03-01')).toBe('2028-02-29');
  });
});

describe('advanceStreak', () => {
  it('starts a streak at 1 when there is no prior', () => {
    expect(advanceStreak(null, '2026-07-08')).toEqual({ count: 1, lastDate: '2026-07-08' });
  });
  it('increments on a consecutive calendar day', () => {
    const prev: DailyStreak = { count: 3, lastDate: '2026-07-07' };
    expect(advanceStreak(prev, '2026-07-08')).toEqual({ count: 4, lastDate: '2026-07-08' });
  });
  it('is idempotent on the same day (no double count)', () => {
    const prev: DailyStreak = { count: 3, lastDate: '2026-07-08' };
    expect(advanceStreak(prev, '2026-07-08')).toEqual(prev);
  });
  it('resets to 1 after a gap of two or more days', () => {
    const prev: DailyStreak = { count: 9, lastDate: '2026-07-05' };
    expect(advanceStreak(prev, '2026-07-08')).toEqual({ count: 1, lastDate: '2026-07-08' });
  });
  it('increments across a month boundary', () => {
    const prev: DailyStreak = { count: 5, lastDate: '2026-02-28' };
    expect(advanceStreak(prev, '2026-03-01')).toEqual({ count: 6, lastDate: '2026-03-01' });
  });
  it('increments across a year boundary', () => {
    const prev: DailyStreak = { count: 2, lastDate: '2025-12-31' };
    expect(advanceStreak(prev, '2026-01-01')).toEqual({ count: 3, lastDate: '2026-01-01' });
  });
});

describe('displayStreakCount', () => {
  it('is 0 with no streak', () => {
    expect(displayStreakCount(null, '2026-07-08')).toBe(0);
  });
  it('shows the count when last played today', () => {
    expect(displayStreakCount({ count: 4, lastDate: '2026-07-08' }, '2026-07-08')).toBe(4);
  });
  it('still shows the count when last played yesterday (streak alive)', () => {
    expect(displayStreakCount({ count: 4, lastDate: '2026-07-07' }, '2026-07-08')).toBe(4);
  });
  it('reads 0 once the streak has lapsed (older than yesterday)', () => {
    expect(displayStreakCount({ count: 4, lastDate: '2026-07-06' }, '2026-07-08')).toBe(0);
  });
});
