import type { Catalog } from '../contracts';
import { loadCombos, loadItemTable, isSignatureItem, type ItemTable, type NamedCombo } from '../items';
import { UNLOCK_LADDER } from '../sim';

/**
 * B-M14 Picture Gallery — the pure milestone→piece model. Maps the ALREADY
 * persisted catalog (read-only; the catalog-wipe scar means this module never
 * writes it) to per-painting reveal progress. Four paintings are revealed
 * piece-by-piece as the player collects wider, then "hung" via a one-time slide
 * puzzle (persisted separately in galleryStore). Zero sim/economy/contract
 * impact: this is a pure derive over stats the game records anyway.
 *
 * THRESHOLD DERIVATION (the non-negotiable scar — every ceiling must be derived
 * from the real tables, never invented): `scripts/gallery-thresholds.ts` reads
 * `loadItemTable()` / `loadCombos()` / `UNLOCK_LADDER` and asserts, for the
 * arrays below, that (a) every painting is COMPLETABLE, (b) thresholds are
 * strictly monotone, and (c) P1 completes meaningfully earlier than P4. Run:
 *   node --import tsx scripts/gallery-thresholds.ts
 * The printed table is reproduced in docs/review-packets/B-M14-picture-gallery.md.
 * Completability proofs (checked by that script against live counts):
 *   P1 still-life   final 16 ≤ 41 items in the table.
 *   P2 counter-cat  final 11 ≤ 20 named combos.
 *   P3 stockroom    final 24 ≤ RUNS_CAP(20) + signatureCount(5) = 25 — the
 *                   guaranteed reachable FLOOR from runs+signatures ALONE, so
 *                   completion never depends on the (unbounded) record tiers,
 *                   which only accelerate the fill.
 *   P4 dusk         final 58 ≤ 41 items + 20 combos = 61 catalog entries.
 */

/** The four source metrics, each a pure read over the persisted catalog. */
export type PaintingMetric =
  | 'itemsDiscovered'
  | 'combosAchieved'
  | 'stockroomScore'
  | 'catalogCompletion';

export interface PaintingDef {
  id: string;
  /** Ordinal 1–4 (also the escalating-rarity order). */
  order: 1 | 2 | 3 | 4;
  title: string;
  /** The reveal grid the gallery card windows the image through (P1–2 3×3,
   *  P3–4 4×4). Its cell count equals `thresholds.length`. NOTE: the assembly
   *  slide puzzle is ALWAYS 3×3 regardless of this (4×4 slide frustrates). */
  revealGrid: { rows: number; cols: number };
  metric: PaintingMetric;
  /** Plain-language source, shown under an incomplete card ("Discover new items
   *  to reveal pieces"). Names the real thing the player does. */
  sourceCaption: string;
  /** The line shown under a hung painting. */
  flavor: string;
  /** Per-piece reveal thresholds: piece i (in row-major scan order) is revealed
   *  once the metric value ≥ thresholds[i]. Strictly increasing; length = cells. */
  thresholds: readonly number[];
}

/** Max `runsPlayed` gate present in the unlock ladder (orrery, 20). Derived, not
 *  invented: the catalog is "complete" in unlock terms here, so it is the natural
 *  provably-reachable cap for the stockroom score's runs contribution. */
export const RUNS_CAP = Math.max(
  0,
  ...Object.values(UNLOCK_LADDER).map((p) => (p.kind === 'runsPlayed' ? p.count : 0)),
);

/**
 * Record-tier ladders for the stockroom score (P3). These are ACCELERATORS: each
 * crossed tier adds one point, so a player who sets records fills the stockroom
 * faster — but completion is proven by the runs+signatures floor alone (see the
 * header), so none of these numbers gate completability. They are modest values a
 * mid-game player crosses well before 20 runs.
 */
export const STOCKROOM_RECORD_TIERS = {
  bestDayTotal: [45, 80, 130],
  longestRun: [8, 12, 16],
  deepestRentSurvived: [4, 7, 10],
} as const;

export const PAINTINGS: readonly PaintingDef[] = [
  {
    id: 'still-life',
    order: 1,
    title: 'First Shelf',
    revealGrid: { rows: 3, cols: 3 },
    metric: 'itemsDiscovered',
    sourceCaption: 'Discover new items to reveal pieces',
    flavor: 'A quiet corner of the shop, caught in the afternoon light.',
    thresholds: [1, 2, 4, 6, 8, 10, 12, 14, 16],
  },
  {
    id: 'counter-cat',
    order: 2,
    title: 'The Counter Cat',
    revealGrid: { rows: 3, cols: 3 },
    metric: 'combosAchieved',
    sourceCaption: 'Complete named combos to reveal pieces',
    flavor: 'The shop cat keeps the counter — and, they say, the luck.',
    thresholds: [1, 2, 3, 4, 5, 6, 7, 9, 11],
  },
  {
    id: 'stockroom',
    order: 3,
    title: 'Golden Hour Stockroom',
    revealGrid: { rows: 4, cols: 4 },
    metric: 'stockroomScore',
    sourceCaption: 'Play runs, set records, and find signature pieces',
    flavor: 'Every shelf you ever filled, stacked deep in the back room.',
    thresholds: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 16, 18, 21, 24],
  },
  {
    id: 'dusk',
    order: 4,
    title: 'The Lucky Shelf at Dusk',
    revealGrid: { rows: 4, cols: 4 },
    metric: 'catalogCompletion',
    sourceCaption: 'Complete your whole collection to reveal pieces',
    flavor: 'The whole store aglow, the day’s last light on the glass.',
    thresholds: [8, 13, 18, 23, 28, 32, 36, 40, 43, 46, 49, 52, 54, 56, 57, 58],
  },
] as const;

export interface GalleryModelDeps {
  table: ItemTable;
  combos: readonly NamedCombo[];
}

function defaultDeps(): GalleryModelDeps {
  return { table: loadItemTable(), combos: loadCombos() };
}

/** How many tiers of a stat the value has crossed (monotone in `value`). */
function tiersCrossed(value: number, tiers: readonly number[]): number {
  let count = 0;
  for (const t of tiers) if (value >= t) count += 1;
  return count;
}

/** The P3 stockroom composite: min(runs, cap) + signature discoveries + record
 *  tiers. Every term is monotone non-decreasing, so the sum is monotone — a piece
 *  once revealed never un-reveals. */
export function stockroomScore(catalog: Catalog, deps: GalleryModelDeps = defaultDeps()): number {
  const runs = Math.min(catalog.stats.runsPlayed, RUNS_CAP);
  const signatureDiscoveries = catalog.discoveredItemIds.filter((id) => {
    const def = deps.table.get(id);
    return def !== undefined && isSignatureItem(def);
  }).length;
  const records =
    tiersCrossed(catalog.stats.bestDayTotal, STOCKROOM_RECORD_TIERS.bestDayTotal) +
    tiersCrossed(catalog.stats.longestRun, STOCKROOM_RECORD_TIERS.longestRun) +
    tiersCrossed(catalog.stats.deepestRentSurvived, STOCKROOM_RECORD_TIERS.deepestRentSurvived);
  return runs + signatureDiscoveries + records;
}

/** The raw metric value for a painting against a catalog snapshot. */
export function metricValue(
  metric: PaintingMetric,
  catalog: Catalog,
  deps: GalleryModelDeps = defaultDeps(),
): number {
  switch (metric) {
    case 'itemsDiscovered':
      return catalog.discoveredItemIds.length;
    case 'combosAchieved':
      return catalog.achievedComboIds.length;
    case 'stockroomScore':
      return stockroomScore(catalog, deps);
    case 'catalogCompletion':
      return catalog.discoveredItemIds.length + catalog.achievedComboIds.length;
  }
}

export interface PaintingProgress {
  id: string;
  order: 1 | 2 | 3 | 4;
  title: string;
  revealGrid: { rows: number; cols: number };
  sourceCaption: string;
  flavor: string;
  /** Pieces revealed (0..total), in row-major scan order. */
  piecesRevealed: number;
  /** Total pieces (revealGrid cells). */
  total: number;
  /** All pieces revealed — the painting is ready to assemble. */
  complete: boolean;
  /** The live metric value (for the "6 of 9" caption's numerator context). */
  metricValue: number;
}

/** Pure milestone→pieces derive for one painting. */
export function paintingProgress(
  def: PaintingDef,
  catalog: Catalog,
  deps: GalleryModelDeps = defaultDeps(),
): PaintingProgress {
  const value = metricValue(def.metric, catalog, deps);
  const total = def.thresholds.length;
  let revealed = 0;
  for (const t of def.thresholds) if (value >= t) revealed += 1;
  return {
    id: def.id,
    order: def.order,
    title: def.title,
    revealGrid: def.revealGrid,
    sourceCaption: def.sourceCaption,
    flavor: def.flavor,
    piecesRevealed: revealed,
    total,
    complete: revealed >= total,
    metricValue: value,
  };
}

/** Progress for all four paintings, in order. */
export function galleryProgress(
  catalog: Catalog,
  deps: GalleryModelDeps = defaultDeps(),
): PaintingProgress[] {
  return PAINTINGS.map((def) => paintingProgress(def, catalog, deps));
}
