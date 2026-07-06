import { z } from 'zod';

import {
  CatalogSchema,
  CatalogSchemaVersion,
  emptyCatalog,
  type Catalog,
  type GameState,
} from '../contracts';

import type { KeyValueStorage } from './index';

/**
 * Permanent catalog persistence (kickoff §1 — the collection meta). Separate
 * key from the active-run save; fail-safe on every path (missing / corrupt /
 * version-mismatch all resolve to an empty catalog, never a crash), so a bad
 * save can never wall the player out of their game.
 */

export const CatalogSaveKey = 'luckyShelf:catalog:v1';
export const CatalogSaveSchemaVersion = 1;

export const CatalogSaveSchema = z
  .object({
    schemaVersion: z.literal(CatalogSaveSchemaVersion),
    savedAt: z.string().min(1),
    catalog: CatalogSchema,
  })
  .strict();

export type CatalogSave = z.infer<typeof CatalogSaveSchema>;
export type LoadCatalogStatus = 'loaded' | 'missing' | 'corrupt' | 'versionMismatch';

export interface LoadCatalogResult {
  status: LoadCatalogStatus;
  catalog: Catalog;
}

export interface CatalogPersistence {
  loadCatalog(): Promise<LoadCatalogResult>;
  saveCatalog(catalog: Catalog): Promise<void>;
}

function classifyBadCatalog(value: unknown): Exclude<LoadCatalogStatus, 'loaded' | 'missing'> {
  if (!value || typeof value !== 'object') return 'corrupt';
  const record = value as Record<string, unknown>;
  const catalog = record.catalog as Record<string, unknown> | undefined;
  if (
    record.schemaVersion !== CatalogSaveSchemaVersion ||
    (catalog && typeof catalog === 'object' && catalog.schemaVersion !== CatalogSchemaVersion)
  ) {
    return 'versionMismatch';
  }
  return 'corrupt';
}

export function createCatalogPersistence(storage: KeyValueStorage): CatalogPersistence {
  return {
    async loadCatalog() {
      const raw = await storage.getItem(CatalogSaveKey);
      if (raw === null) return { status: 'missing', catalog: emptyCatalog() };

      let parsedJson: unknown;
      try {
        parsedJson = JSON.parse(raw) as unknown;
      } catch {
        return { status: 'corrupt', catalog: emptyCatalog() };
      }

      const parsed = CatalogSaveSchema.safeParse(parsedJson);
      if (!parsed.success) {
        return { status: classifyBadCatalog(parsedJson), catalog: emptyCatalog() };
      }
      return { status: 'loaded', catalog: parsed.data.catalog };
    },

    async saveCatalog(catalog) {
      const save: CatalogSave = {
        schemaVersion: CatalogSaveSchemaVersion,
        savedAt: new Date().toISOString(),
        catalog,
      };
      await storage.setItem(CatalogSaveKey, JSON.stringify(save));
    },
  };
}

function union(existing: readonly string[], incoming: readonly string[]): string[] {
  const set = new Set(existing);
  for (const value of incoming) set.add(value);
  return [...set];
}

/**
 * Fold one finished run into the permanent catalog. Pure — returns a new
 * catalog. Unions discovered ids, bumps each achieved combo's count by one
 * (the run's delta is already deduped), and advances the stat maxima /
 * lifetime totals. Idempotency isn't required (each run end is a distinct
 * event), but the store guards against merging the same terminal state twice.
 */
export function mergeRunIntoCatalog(catalog: Catalog, gameState: GameState): Catalog {
  const { catalogDelta, runStats } = gameState;
  const comboCounts: Record<string, number> = { ...catalog.comboCounts };
  for (const comboId of catalogDelta.discoveredComboIds) {
    comboCounts[comboId] = (comboCounts[comboId] ?? 0) + 1;
  }

  return {
    schemaVersion: CatalogSchemaVersion,
    discoveredItemIds: union(catalog.discoveredItemIds, catalogDelta.discoveredItemIds),
    achievedComboIds: union(catalog.achievedComboIds, catalogDelta.discoveredComboIds),
    comboCounts,
    stats: {
      runsPlayed: catalog.stats.runsPlayed + 1,
      bestDayTotal: Math.max(catalog.stats.bestDayTotal, runStats.bestDayTotal),
      deepestRentSurvived: Math.max(catalog.stats.deepestRentSurvived, runStats.deepestRentSurvived),
      mostCoinsInARun: Math.max(catalog.stats.mostCoinsInARun, runStats.totalCoinsEarned),
      totalCoinsAllTime: catalog.stats.totalCoinsAllTime + runStats.totalCoinsEarned,
    },
  };
}
