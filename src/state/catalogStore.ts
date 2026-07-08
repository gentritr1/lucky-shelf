import { create } from 'zustand';

import { emptyCatalog, type Catalog, type CatalogStats, type GameState, type RunStats } from '../contracts';
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
  /** The standing catalog stats captured just BEFORE the named run merged in —
   *  what "New record!" must compare against. Keyed by runId so a consumer can
   *  tell whose pre-merge snapshot this is. */
  prevRunStats: { runId: string; stats: CatalogStats } | null;
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
    prevRunStats: null,

    async loadCatalog() {
      set({ loadStatus: 'loading' });
      const result = await (await getPersistence()).loadCatalog();
      set({ catalog: result.catalog, loadStatus: result.status });
      return result.catalog;
    },

    async recordRunEnd(gameState) {
      // Guard: the same finished run never merges twice (summary re-mount, etc.).
      if (get().lastRecordedRunId === gameState.runId) return get().catalog;
      // Merge against the PERSISTED catalog, never a not-yet-loaded empty one.
      // Finishing a run before any screen had loaded the catalog used to merge
      // into emptyCatalog() and save THAT — wiping every prior discovery and
      // best on disk (found in the B-M4 Fable review).
      if (get().loadStatus === 'idle' || get().loadStatus === 'loading') {
        await get().loadCatalog();
        if (get().lastRecordedRunId === gameState.runId) return get().catalog;
      }
      const previous = get().catalog;
      const merged = mergeRunIntoCatalog(previous, gameState);
      set({
        catalog: merged,
        lastRecordedRunId: gameState.runId,
        prevRunStats: { runId: gameState.runId, stats: previous.stats },
      });
      await (await getPersistence()).saveCatalog(merged);
      return merged;
    },
  }));
}

export const useCatalogStore = createCatalogStore();

// --- View model: this run's headline stats against the persisted personal best. ---

export type PersonalBestKind = 'coin' | 'days' | 'count';

export interface PersonalBestRow {
  key: 'bestDay' | 'longestRun' | 'deepestRent';
  label: string;
  /** This run's value for the stat. */
  thisRun: number;
  /** The all-time best INCLUDING this run (max of prior best and this run). */
  best: number;
  /** True when this run strictly beat the prior best — the "New record!" state. */
  isRecord: boolean;
  /** How the value renders: a coin pill, a day count, or a plain count. */
  kind: PersonalBestKind;
}

/**
 * The summary's personal-best rows. Pass the catalog stats captured BEFORE this
 * run was folded in (`prevStats`) so `isRecord` reflects whether the run beat the
 * standing record — comparing against the post-merge catalog would always tie.
 * `best` is the max of the prior best and this run, so it's correct to show
 * whether or not a record fell.
 */
export function personalBestsView(prevStats: CatalogStats, runStats: RunStats): PersonalBestRow[] {
  const row = (
    key: PersonalBestRow['key'],
    label: string,
    thisRun: number,
    priorBest: number,
    kind: PersonalBestKind,
  ): PersonalBestRow => ({
    key,
    label,
    thisRun,
    best: Math.max(priorBest, thisRun),
    isRecord: thisRun > priorBest,
    kind,
  });
  return [
    row('bestDay', 'Best day', runStats.bestDayTotal, prevStats.bestDayTotal, 'coin'),
    row('longestRun', 'Longest run', runStats.daysSurvived, prevStats.longestRun, 'days'),
    row('deepestRent', 'Deepest rent', runStats.deepestRentSurvived, prevStats.deepestRentSurvived, 'count'),
  ];
}

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
