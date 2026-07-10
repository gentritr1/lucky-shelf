import { useState } from 'react';
import { create } from 'zustand';

import { emptyCatalog, type Catalog, type CatalogStats, type GameState, type RunStats } from '../contracts';
import { loadCombos, loadItemTable } from '../items';
import type { ItemTable, NamedCombo } from '../items';
import {
  UNLOCK_LADDER,
  nextUnlocks,
  unlockLadderEnabled,
  unlockedItemIds as ladderUnlockedItemIds,
  type UnlockPredicate,
} from '../sim';
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

/**
 * B-M11: the set of combos achieved all-time as of RUN START, snapshotted once at
 * mount (the B-M4 pattern). Feeds the cascade's combo-discovery classifier so a
 * `first-ever` combo is one absent from the catalog when the run began. Reading
 * the live catalog would work too — a run only merges in at run end
 * (`recordRunEnd`) — but the snapshot is robust to that ordering and never
 * re-subscribes the caller to catalog writes.
 */
export function useRunStartAchievedCombos(): ReadonlySet<string> {
  const [snapshot] = useState(() => new Set(useCatalogStore.getState().catalog.achievedComboIds));
  return snapshot;
}

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
  /**
   * B-M5 Part 2: the item is on the unlock ladder but its predicate isn't met
   * yet — render as a locked silhouette, a state DISTINCT from an unlocked-but-
   * undiscovered "?". Only ever true when the ladder flag is on and the item is
   * not discovered; always `false` when the flag is off, so flag-off catalog
   * rendering is byte-identical to today.
   */
  locked: boolean;
  /** Human unlock hint for a locked item ("Reach 6 runs"); null unless locked. */
  unlockHint: string | null;
}

/**
 * The one-line unlock hint for a locked ladder item. Pure display formatting over
 * the sim's predicate — Lane B never evaluates unlock LOGIC (that stays in the
 * module, non-goal), it only renders the already-classified predicate as prose,
 * resolving item/combo ids to their display names.
 */
function formatUnlockHint(
  predicate: UnlockPredicate,
  table: ItemTable,
  combos: readonly NamedCombo[],
): string {
  switch (predicate.kind) {
    case 'runsPlayed':
      return `Reach ${predicate.count} ${predicate.count === 1 ? 'run' : 'runs'}`;
    case 'itemDiscovered':
      return `Discover the ${table.get(predicate.itemId)?.name ?? predicate.itemId}`;
    case 'comboAchieved': {
      const combo = combos.find((c) => c.comboId === predicate.comboId);
      return `Discover the ${combo?.name ?? predicate.comboId} combo`;
    }
    case 'always':
      return '';
  }
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
  table: ItemTable = loadItemTable(),
  combos: readonly NamedCombo[] = loadCombos(),
  options: { unlockLadder?: boolean } = {},
): CatalogView {
  const ladderOn = options.unlockLadder ?? unlockLadderEnabled();
  const discoveredItems = new Set(catalog.discoveredItemIds);
  const achievedCombos = new Set(catalog.achievedComboIds);
  // Only computed when the ladder is on — off keeps every item `locked: false`.
  const unlocked = ladderOn ? new Set(ladderUnlockedItemIds(catalog)) : null;

  const items: CatalogItemRow[] = [...table.values()].map((def) => {
    const discovered = discoveredItems.has(def.id);
    // Transform-target items (upgrade variants) aren't on the ladder — they read
    // as undiscovered "?", never as locked silhouettes.
    const predicate = UNLOCK_LADDER[def.id];
    const locked =
      unlocked !== null && !discovered && predicate !== undefined && !unlocked.has(def.id);
    return {
      id: def.id,
      name: def.name,
      tier: def.tier,
      discovered,
      locked,
      unlockHint: locked && predicate ? formatUnlockHint(predicate, table, combos) : null,
    };
  });

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

// --- View model: the run-summary "next unlock" teaser (Part 3). ---

export interface NextUnlockRow {
  itemId: string;
  name: string;
  hint: string;
}

/**
 * The single strongest "one more run" prompt: the nearest locked ladder item, to
 * show under the summary's personal bests. Returns null — and the row is omitted
 * entirely — when the flag is off OR the pool is exhausted (everything unlocked).
 * Among the immediately-reachable unlocks we prefer a `runsPlayed` gate, since
 * "reach N runs" is the literal one-more-run hook; otherwise the first by id.
 */
export function nextUnlockTeaserView(
  catalog: Catalog,
  table: ItemTable = loadItemTable(),
  combos: readonly NamedCombo[] = loadCombos(),
  options: { unlockLadder?: boolean } = {},
): NextUnlockRow | null {
  if (!(options.unlockLadder ?? unlockLadderEnabled())) return null;
  const upcoming = nextUnlocks(catalog);
  const pick = upcoming.find((u) => u.predicate.kind === 'runsPlayed') ?? upcoming[0];
  if (!pick) return null;
  return {
    itemId: pick.itemId,
    name: table.get(pick.itemId)?.name ?? pick.itemId,
    hint: formatUnlockHint(pick.predicate, table, combos),
  };
}
