import { create } from 'zustand';

import { emptyCatalog, type Catalog, type GameState } from '../contracts';
import { loadCombos, loadItemTable } from '../items';
import type { NamedCombo } from '../items';
import { mergeRunIntoCatalog } from '../persistence/catalog';
import type { CatalogPersistence, LoadCatalogStatus } from '../persistence/catalog';

/**
 * The permanent Catalog store — collection meta, separate from the run store
 * (run state is seeded and ephemeral; the catalog outlives runs). The album
 * screen reads it; the summary screen records a finished run into it exactly
 * once (guarded by runId so a re-mount can't double-count).
 */

export interface CatalogStoreState {
  catalog: Catalog;
  loadStatus: LoadCatalogStatus | 'idle' | 'loading';
  lastRecordedRunId: string | null;
  loadCatalog(): Promise<Catalog>;
  recordRunEnd(gameState: GameState): Promise<Catalog>;
}

export const catalogSelectors = {
  catalog: (state: CatalogStoreState) => state.catalog,
  stats: (state: CatalogStoreState) => state.catalog.stats,
} as const;

interface CatalogStoreOptions {
  persistence?: CatalogPersistence;
  initialCatalog?: Catalog;
}

let cachedDefaultPersistence: Promise<CatalogPersistence> | null = null;

async function defaultPersistence(): Promise<CatalogPersistence> {
  cachedDefaultPersistence ??= import('../persistence/asyncStorage').then(
    (module) => module.asyncStorageCatalogPersistence,
  );
  return cachedDefaultPersistence;
}

export function createCatalogStore(options: CatalogStoreOptions = {}) {
  const getPersistence = async () => options.persistence ?? defaultPersistence();

  return create<CatalogStoreState>()((set, get) => ({
    catalog: options.initialCatalog ?? emptyCatalog(),
    loadStatus: 'idle',
    lastRecordedRunId: null,

    async loadCatalog() {
      set({ loadStatus: 'loading' });
      const result = await (await getPersistence()).loadCatalog();
      set({ catalog: result.catalog, loadStatus: result.status });
      return result.catalog;
    },

    async recordRunEnd(gameState) {
      // Guard: the same finished run never merges twice (summary re-mount, etc.).
      if (get().lastRecordedRunId === gameState.runId) return get().catalog;
      const merged = mergeRunIntoCatalog(get().catalog, gameState);
      set({ catalog: merged, lastRecordedRunId: gameState.runId });
      await (await getPersistence()).saveCatalog(merged);
      return merged;
    },
  }));
}

export const useCatalogStore = createCatalogStore();

// --- View model: join the item/combo tables with discovery state for the album. ---

export interface CatalogItemRow {
  id: string;
  name: string;
  tier: 1 | 2 | 3 | 4;
  discovered: boolean;
}

export interface CatalogComboRow {
  comboId: string;
  name: string;
  count: number;
  achieved: boolean;
}

export interface CatalogView {
  items: CatalogItemRow[];
  combos: CatalogComboRow[];
  itemsDiscovered: number;
  itemsTotal: number;
  combosAchieved: number;
  combosTotal: number;
  completionPct: number;
}

/** Transform-target items (upgrade variants) are earned, not stocked — the
 * catalog still lists them, but they slot after the base items. */
export function buildCatalogView(
  catalog: Catalog,
  table = loadItemTable(),
  combos: readonly NamedCombo[] = loadCombos(),
): CatalogView {
  const discoveredItems = new Set(catalog.discoveredItemIds);
  const achievedCombos = new Set(catalog.achievedComboIds);

  const items: CatalogItemRow[] = [...table.values()].map((def) => ({
    id: def.id,
    name: def.name,
    tier: def.tier,
    discovered: discoveredItems.has(def.id),
  }));

  const comboRows: CatalogComboRow[] = combos.map((combo) => ({
    comboId: combo.comboId,
    name: combo.name,
    count: catalog.comboCounts[combo.comboId] ?? 0,
    achieved: achievedCombos.has(combo.comboId),
  }));

  const itemsDiscovered = items.filter((i) => i.discovered).length;
  const combosAchieved = comboRows.filter((c) => c.achieved).length;
  const total = items.length + comboRows.length;
  const found = itemsDiscovered + combosAchieved;

  return {
    items,
    combos: comboRows,
    itemsDiscovered,
    itemsTotal: items.length,
    combosAchieved,
    combosTotal: comboRows.length,
    completionPct: total === 0 ? 0 : Math.round((found / total) * 100),
  };
}
