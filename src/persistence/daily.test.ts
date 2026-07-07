import { describe, expect, it } from 'vitest';

import { createDailyPersistence, dailySeedFor, todayDateString } from './daily';

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
});
