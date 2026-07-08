import { z } from 'zod';

import type { KeyValueStorage } from './index';

/**
 * Daily-shelf persistence (kickoff §1/§9): one seeded run per calendar day,
 * one attempt, enforced locally. We store only the *current* day's record —
 * a new date means the daily is fresh again. Fail-safe: any bad/missing save
 * reads as "not played today".
 */

export const DailySaveKey = 'luckyShelf:daily:v1';
export const DailySaveSchemaVersion = 1;

export const DailyResultSchema = z
  .object({
    daysSurvived: z.number().int().min(0),
    coinsEarned: z.number().int().min(0),
    deepestRentSurvived: z.number().int().min(0),
    bestDayTotal: z.number().int().min(0),
    combosThisRun: z.number().int().min(0),
  })
  .strict();

export type DailyResult = z.infer<typeof DailyResultSchema>;

/**
 * Consecutive-calendar-day play streak. Additive (B-M5): `streak` is optional on
 * the record so pre-streak saves load loss-free (absent = no streak). `lastDate`
 * is a `todayDateString()` value — all streak date math flows through that helper.
 */
export const DailyStreakSchema = z
  .object({
    count: z.number().int().min(0),
    lastDate: z.string().min(1),
  })
  .strict();

export type DailyStreak = z.infer<typeof DailyStreakSchema>;

export const DailyRecordSchema = z
  .object({
    schemaVersion: z.literal(DailySaveSchemaVersion),
    date: z.string().min(1),
    result: DailyResultSchema,
    streak: DailyStreakSchema.optional(),
  })
  .strict();

export type DailyRecord = z.infer<typeof DailyRecordSchema>;

export interface DailyPersistence {
  loadDaily(): Promise<DailyRecord | null>;
  saveDaily(record: DailyRecord): Promise<void>;
}

export function createDailyPersistence(storage: KeyValueStorage): DailyPersistence {
  return {
    async loadDaily() {
      const raw = await storage.getItem(DailySaveKey);
      if (raw === null) return null;
      try {
        const parsed = DailyRecordSchema.safeParse(JSON.parse(raw));
        return parsed.success ? parsed.data : null;
      } catch {
        return null;
      }
    },
    async saveDaily(record) {
      await storage.setItem(DailySaveKey, JSON.stringify(record));
    },
  };
}

/** Local calendar day as YYYY-MM-DD — the daily seed and the one-attempt key. */
export function todayDateString(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function dailySeedFor(date: string): string {
  return `daily-${date}`;
}

/**
 * The calendar day before `date` (YYYY-MM-DD). Uses the local `Date` constructor's
 * normalisation (day 0 → previous month's last day) so month/year boundaries fall
 * out correctly, then formats through `todayDateString` — no millisecond math, so
 * no DST drift. This is the only "yesterday" anyone should compute.
 */
export function previousDateString(date: string): string {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  return todayDateString(new Date(y, m - 1, d - 1));
}

/**
 * Advance the streak given today's date string:
 * - no prior streak → count 1;
 * - lastDate is today → unchanged (same-day replay is idempotent);
 * - lastDate is yesterday → +1 (consecutive day);
 * - otherwise (a gap) → reset to 1.
 */
export function advanceStreak(prev: DailyStreak | null, today: string): DailyStreak {
  if (!prev) return { count: 1, lastDate: today };
  if (prev.lastDate === today) return prev;
  if (prev.lastDate === previousDateString(today)) {
    return { count: prev.count + 1, lastDate: today };
  }
  return { count: 1, lastDate: today };
}

/**
 * The streak count to *show* on `today`: the stored count while the streak is
 * still live (last played today or yesterday), else 0 — a lapsed streak reads as
 * broken until the next play restarts it. Pure; drives the title/summary surfaces.
 */
export function displayStreakCount(streak: DailyStreak | null, today: string): number {
  if (!streak) return 0;
  if (streak.lastDate === today) return streak.count;
  if (streak.lastDate === previousDateString(today)) return streak.count;
  return 0;
}
