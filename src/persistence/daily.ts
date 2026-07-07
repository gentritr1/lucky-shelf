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

export const DailyRecordSchema = z
  .object({
    schemaVersion: z.literal(DailySaveSchemaVersion),
    date: z.string().min(1),
    result: DailyResultSchema,
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
