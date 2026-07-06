import { describe, expect, it } from 'vitest';

import { createRun } from '../sim';
import { loadCombos, loadItemTable } from '../items';
import {
  ActiveRunSaveKey,
  SaveSchemaVersion,
  createRunPersistence,
  type KeyValueStorage,
} from './index';

class MemoryStorage implements KeyValueStorage {
  readonly values = new Map<string, string>();

  async getItem(key: string): Promise<string | null> {
    return this.values.get(key) ?? null;
  }

  async setItem(key: string, value: string): Promise<void> {
    this.values.set(key, value);
  }

  async removeItem(key: string): Promise<void> {
    this.values.delete(key);
  }
}

const deps = { table: loadItemTable(), combos: loadCombos() };

describe('run persistence', () => {
  it('round-trips an active run save', async () => {
    const storage = new MemoryStorage();
    const persistence = createRunPersistence(storage);
    const state = createRun('persist-round-trip', deps);

    await persistence.saveActiveRun(state);

    const loaded = await persistence.loadActiveRun(createRun('fresh', deps));
    expect(loaded.status).toBe('loaded');
    expect(loaded.gameState).toEqual(state);
  });

  it('returns a fresh state for missing or corrupt saves', async () => {
    const storage = new MemoryStorage();
    const persistence = createRunPersistence(storage);
    const freshState = createRun('fresh-corrupt', deps);

    await expect(persistence.loadActiveRun(freshState)).resolves.toEqual({
      status: 'missing',
      gameState: freshState,
    });

    await storage.setItem(ActiveRunSaveKey, '{bad json');

    await expect(persistence.loadActiveRun(freshState)).resolves.toEqual({
      status: 'corrupt',
      gameState: freshState,
    });
  });

  it('returns a fresh state for mismatched save or contract versions', async () => {
    const storage = new MemoryStorage();
    const persistence = createRunPersistence(storage);
    const freshState = createRun('fresh-version', deps);
    const savedState = createRun('saved-version', deps);

    await storage.setItem(
      ActiveRunSaveKey,
      JSON.stringify({
        schemaVersion: SaveSchemaVersion + 1,
        savedAt: new Date().toISOString(),
        gameState: savedState,
      }),
    );
    await expect(persistence.loadActiveRun(freshState)).resolves.toEqual({
      status: 'versionMismatch',
      gameState: freshState,
    });

    await storage.setItem(
      ActiveRunSaveKey,
      JSON.stringify({
        schemaVersion: SaveSchemaVersion,
        savedAt: new Date().toISOString(),
        gameState: { ...savedState, schemaVersion: 999 },
      }),
    );
    await expect(persistence.loadActiveRun(freshState)).resolves.toEqual({
      status: 'versionMismatch',
      gameState: freshState,
    });
  });
});
