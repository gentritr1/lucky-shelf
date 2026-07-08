import { describe, expect, it } from 'vitest';

import { loadCombos, loadItemTable } from '../items';
import { createRun } from '../sim';
import {
  DailySaveKey,
  createDailyPersistence,
  dailySeedFor,
  type DailyRecord,
} from '../persistence/daily';
import { createDailyStore } from './dailyStore';

function memoryStorage(seed?: Record<string, string>) {
  const map = new Map<string, string>(Object.entries(seed ?? {}));
  return {
    getItem: async (k: string) => map.get(k) ?? null,
    setItem: async (k: string, v: string) => void map.set(k, v),
    removeItem: async (k: string) => void map.delete(k),
  };
}

const deps = { table: loadItemTable(), combos: loadCombos() };

/** A finished run seeded as `date`'s daily — the only shape recordDaily accepts. */
function finishedDaily(date: string) {
  return createRun(dailySeedFor(date), deps);
}

describe('dailyStore streak (B-M5)', () => {
  it('loads an old-shape (pre-streak) record without crashing and with streak null', async () => {
    const oldShape = JSON.stringify({
      schemaVersion: 1,
      date: '2026-07-08',
      result: { daysSurvived: 9, coinsEarned: 300, deepestRentSurvived: 3, bestDayTotal: 60, combosThisRun: 2 },
    });
    const store = createDailyStore({
      persistence: createDailyPersistence(memoryStorage({ [DailySaveKey]: oldShape })),
      today: () => '2026-07-08',
    });
    await store.getState().loadDaily();
    expect(store.getState().playedToday).toBe(true);
    expect(store.getState().streak).toBeNull();
  });

  it('starts a streak at 1 on the first daily played', async () => {
    const persistence = createDailyPersistence(memoryStorage());
    const store = createDailyStore({ persistence, today: () => '2026-07-08' });
    await store.getState().loadDaily();
    await store.getState().recordDaily(finishedDaily('2026-07-08'));
    expect(store.getState().streak).toEqual({ count: 1, lastDate: '2026-07-08' });
  });

  it('increments on a consecutive day across two sessions', async () => {
    const storage = memoryStorage();
    const persistence = createDailyPersistence(storage);
    await createDailyStore({ persistence, today: () => '2026-07-07' })
      .getState()
      .recordDaily(finishedDaily('2026-07-07'));

    // New calendar day, fresh store instance (a relaunch).
    const day2 = createDailyStore({ persistence, today: () => '2026-07-08' });
    await day2.getState().loadDaily();
    expect(day2.getState().playedToday).toBe(false); // not yet played today...
    expect(day2.getState().streak).toEqual({ count: 1, lastDate: '2026-07-07' }); // ...but streak carried
    await day2.getState().recordDaily(finishedDaily('2026-07-08'));
    expect(day2.getState().streak).toEqual({ count: 2, lastDate: '2026-07-08' });
  });

  it('resets to 1 after a missed day', async () => {
    const storage = memoryStorage();
    const persistence = createDailyPersistence(storage);
    await createDailyStore({ persistence, today: () => '2026-07-05' })
      .getState()
      .recordDaily(finishedDaily('2026-07-05'));

    const later = createDailyStore({ persistence, today: () => '2026-07-08' });
    await later.getState().loadDaily();
    await later.getState().recordDaily(finishedDaily('2026-07-08'));
    expect(later.getState().streak).toEqual({ count: 1, lastDate: '2026-07-08' });
  });

  it('is idempotent when the same daily is recorded twice', async () => {
    const persistence = createDailyPersistence(memoryStorage());
    const store = createDailyStore({ persistence, today: () => '2026-07-08' });
    await store.getState().loadDaily();
    const run = finishedDaily('2026-07-08');
    await store.getState().recordDaily(run);
    await store.getState().recordDaily(run);
    expect(store.getState().streak).toEqual({ count: 1, lastDate: '2026-07-08' });
  });

  // The catalog-wipe scar, applied to the streak: a run can end (recordDaily) on a
  // cold store that was never loadDaily()'d — the load-guard must hydrate the
  // persisted streak first, or a live multi-day streak gets clobbered to 1.
  it('does not wipe a live streak when recording before the store is loaded', async () => {
    const prior: DailyRecord = {
      schemaVersion: 1,
      date: '2026-07-07',
      result: { daysSurvived: 5, coinsEarned: 100, deepestRentSurvived: 2, bestDayTotal: 40, combosThisRun: 1 },
      streak: { count: 6, lastDate: '2026-07-07' },
    };
    const persistence = createDailyPersistence(
      memoryStorage({ [DailySaveKey]: JSON.stringify(prior) }),
    );

    // Fresh session that never called loadDaily(): straight to recordDaily.
    const store = createDailyStore({ persistence, today: () => '2026-07-08' });
    expect(store.getState().loaded).toBe(false);
    await store.getState().recordDaily(finishedDaily('2026-07-08'));

    expect(store.getState().streak).toEqual({ count: 7, lastDate: '2026-07-08' });
    const reloaded = await persistence.loadDaily();
    expect(reloaded?.streak).toEqual({ count: 7, lastDate: '2026-07-08' });
  });
});
