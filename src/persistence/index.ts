import { z } from 'zod';

import {
  ContractSchemaVersion,
  GameStateSchema,
  type GameState,
} from '../contracts';

export const ActiveRunSaveKey = 'luckyShelf:save:v1:activeRun';
export const SaveSchemaVersion = 1;

export interface KeyValueStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export const ActiveRunSaveSchema = z
  .object({
    schemaVersion: z.literal(SaveSchemaVersion),
    savedAt: z.string().min(1),
    gameState: GameStateSchema,
  })
  .strict();

export type ActiveRunSave = z.infer<typeof ActiveRunSaveSchema>;
export type LoadActiveRunStatus = 'loaded' | 'missing' | 'corrupt' | 'versionMismatch';

export interface LoadActiveRunResult {
  status: LoadActiveRunStatus;
  gameState: GameState;
}

export interface RunPersistence {
  loadActiveRun(freshState: GameState): Promise<LoadActiveRunResult>;
  saveActiveRun(gameState: GameState): Promise<void>;
  clearActiveRun(): Promise<void>;
}

function classifyBadSave(value: unknown): Exclude<LoadActiveRunStatus, 'loaded' | 'missing'> {
  if (!value || typeof value !== 'object') return 'corrupt';
  const record = value as Record<string, unknown>;
  if (
    record.schemaVersion !== SaveSchemaVersion ||
    (record.gameState &&
      typeof record.gameState === 'object' &&
      (record.gameState as Record<string, unknown>).schemaVersion !== ContractSchemaVersion)
  ) {
    return 'versionMismatch';
  }
  return 'corrupt';
}

export function createRunPersistence(storage: KeyValueStorage): RunPersistence {
  return {
    async loadActiveRun(freshState) {
      const raw = await storage.getItem(ActiveRunSaveKey);
      if (raw === null) {
        return { status: 'missing', gameState: freshState };
      }

      let parsedJson: unknown;
      try {
        parsedJson = JSON.parse(raw) as unknown;
      } catch {
        return { status: 'corrupt', gameState: freshState };
      }

      const parsedSave = ActiveRunSaveSchema.safeParse(parsedJson);
      if (!parsedSave.success) {
        return { status: classifyBadSave(parsedJson), gameState: freshState };
      }

      return { status: 'loaded', gameState: parsedSave.data.gameState };
    },

    async saveActiveRun(gameState) {
      const save: ActiveRunSave = {
        schemaVersion: SaveSchemaVersion,
        savedAt: new Date().toISOString(),
        gameState,
      };
      await storage.setItem(ActiveRunSaveKey, JSON.stringify(save));
    },

    async clearActiveRun() {
      await storage.removeItem(ActiveRunSaveKey);
    },
  };
}
