import { create } from 'zustand';

import type { GameState } from '../contracts';
import {
  dailySeedFor,
  todayDateString,
  type DailyPersistence,
  type DailyResult,
} from '../persistence/daily';

/**
 * Daily-shelf store: one seeded run per calendar day, one attempt. The run
 * itself flows through the normal run store (seeded with `dailySeedFor(today)`);
 * this store only tracks whether today's daily is done and its result (for the
 * share card + the title's played-today state).
 */

export interface DailyStoreState {
  date: string;
  playedToday: boolean;
  result: DailyResult | null;
  loaded: boolean;
  loadDaily(): Promise<void>;
  recordDaily(gameState: GameState): Promise<DailyResult | null>;
}

export const dailySelectors = {
  playedToday: (s: DailyStoreState) => s.playedToday,
  result: (s: DailyStoreState) => s.result,
} as const;

interface DailyStoreOptions {
  persistence?: DailyPersistence;
  today?: () => string;
}

let cachedDefaultPersistence: Promise<DailyPersistence> | null = null;
async function defaultPersistence(): Promise<DailyPersistence> {
  cachedDefaultPersistence ??= import('../persistence/asyncStorage').then(
    (m) => m.asyncStorageDailyPersistence,
  );
  return cachedDefaultPersistence;
}

function resultFromRun(gameState: GameState): DailyResult {
  return {
    daysSurvived: gameState.runStats.daysSurvived,
    coinsEarned: gameState.runStats.totalCoinsEarned,
    deepestRentSurvived: gameState.runStats.deepestRentSurvived,
    bestDayTotal: gameState.runStats.bestDayTotal,
    combosThisRun: gameState.catalogDelta.discoveredComboIds.length,
  };
}

export function isDailySeed(seed: string): boolean {
  return seed.startsWith('daily-');
}

export function createDailyStore(options: DailyStoreOptions = {}) {
  const today = options.today ?? todayDateString;
  const getPersistence = async () => options.persistence ?? defaultPersistence();

  return create<DailyStoreState>()((set, get) => ({
    date: today(),
    playedToday: false,
    result: null,
    loaded: false,

    async loadDaily() {
      const record = await (await getPersistence()).loadDaily();
      const date = today();
      if (record && record.date === date) {
        set({ date, playedToday: true, result: record.result, loaded: true });
      } else {
        set({ date, playedToday: false, result: null, loaded: true });
      }
    },

    async recordDaily(gameState) {
      const date = today();
      // Only the run seeded as today's daily counts, and only once.
      if (gameState.seed !== dailySeedFor(date)) return get().result;
      if (get().playedToday && get().date === date) return get().result;
      const result = resultFromRun(gameState);
      set({ date, playedToday: true, result });
      await (await getPersistence()).saveDaily({ schemaVersion: 1, date, result });
      return result;
    },
  }));
}

export const useDailyStore = createDailyStore();

export { dailySeedFor, todayDateString };
