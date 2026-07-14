import { describe, expect, it } from 'vitest';

import { emptyCatalog, type Catalog } from '../contracts';
import { loadCombos, loadItemTable, isSignatureItem } from '../items';
import {
  PAINTINGS,
  RUNS_CAP,
  galleryProgress,
  metricValue,
  paintingProgress,
  stockroomScore,
} from './galleryModel';

const table = loadItemTable();
const combos = loadCombos();
const allItemIds = [...table.keys()];
const signatureIds = [...table.values()].filter((d) => isSignatureItem(d)).map((d) => d.id);
const allComboIds = combos.map((c) => c.comboId);

function catalogWith(
  overrides: Partial<Omit<Catalog, 'stats'>> & { stats?: Partial<Catalog['stats']> },
): Catalog {
  const base = emptyCatalog();
  return {
    ...base,
    ...overrides,
    stats: { ...base.stats, ...(overrides.stats ?? {}) },
  };
}

const def = (id: string) => PAINTINGS.find((p) => p.id === id)!;

describe('galleryModel — grid/threshold shape', () => {
  it('every painting has thresholds.length === reveal grid cell count', () => {
    for (const p of PAINTINGS) {
      expect(p.thresholds.length).toBe(p.revealGrid.rows * p.revealGrid.cols);
    }
  });

  it('every painting has strictly monotone thresholds starting ≥ 1', () => {
    for (const p of PAINTINGS) {
      expect(p.thresholds[0]).toBeGreaterThanOrEqual(1);
      for (let i = 1; i < p.thresholds.length; i += 1) {
        expect(p.thresholds[i]!).toBeGreaterThan(p.thresholds[i - 1]!);
      }
    }
  });
});

describe('galleryModel — completability against the real tables', () => {
  it('P1 final ≤ item count, P2 final ≤ combo count, P4 final ≤ items+combos', () => {
    const items = table.size;
    const combosTotal = combos.length;
    expect(def('still-life').thresholds.at(-1)!).toBeLessThanOrEqual(items);
    expect(def('counter-cat').thresholds.at(-1)!).toBeLessThanOrEqual(combosTotal);
    expect(def('dusk').thresholds.at(-1)!).toBeLessThanOrEqual(items + combosTotal);
  });

  it('P3 final ≤ the runs+signatures floor (records only accelerate)', () => {
    const floor = RUNS_CAP + signatureIds.length;
    expect(def('stockroom').thresholds.at(-1)!).toBeLessThanOrEqual(floor);
  });

  it('a maxed catalog completes every painting via the guaranteed floor alone', () => {
    // No records set beyond zero: only distinct items + combos + runs + signatures.
    const maxed = catalogWith({
      discoveredItemIds: allItemIds,
      achievedComboIds: allComboIds,
      stats: { runsPlayed: RUNS_CAP },
    });
    for (const p of galleryProgress(maxed)) {
      expect(p.complete, `${p.id} should be complete`).toBe(true);
      expect(p.piecesRevealed).toBe(p.total);
    }
  });
});

describe('galleryModel — reveal derivation', () => {
  it('empty catalog reveals no pieces', () => {
    for (const p of galleryProgress(emptyCatalog())) {
      expect(p.piecesRevealed).toBe(0);
      expect(p.complete).toBe(false);
    }
  });

  it('P1 reveals piece i once distinct-items ≥ threshold i, and never un-reveals', () => {
    const p1 = def('still-life');
    let prevRevealed = 0;
    for (let n = 0; n <= table.size; n += 1) {
      const cat = catalogWith({ discoveredItemIds: allItemIds.slice(0, n) });
      const progress = paintingProgress(p1, cat);
      const expected = p1.thresholds.filter((t) => n >= t).length;
      expect(progress.piecesRevealed).toBe(expected);
      // Monotone: adding discoveries never reduces revealed pieces.
      expect(progress.piecesRevealed).toBeGreaterThanOrEqual(prevRevealed);
      prevRevealed = progress.piecesRevealed;
    }
  });

  it('P2 metric is combos achieved', () => {
    const cat = catalogWith({ achievedComboIds: allComboIds.slice(0, 5) });
    expect(metricValue('combosAchieved', cat)).toBe(5);
  });

  it('P4 metric is items + combos together', () => {
    const cat = catalogWith({
      discoveredItemIds: allItemIds.slice(0, 10),
      achievedComboIds: allComboIds.slice(0, 4),
    });
    expect(metricValue('catalogCompletion', cat)).toBe(14);
  });
});

describe('galleryModel — stockroom score (P3 composite)', () => {
  it('is monotone: runs, signature discoveries, and record tiers each only add', () => {
    const base = catalogWith({ stats: { runsPlayed: 2 } });
    const withRuns = catalogWith({ stats: { runsPlayed: 5 } });
    expect(stockroomScore(withRuns)).toBeGreaterThan(stockroomScore(base));

    const withSig = catalogWith({ stats: { runsPlayed: 2 }, discoveredItemIds: signatureIds });
    expect(stockroomScore(withSig)).toBe(stockroomScore(base) + signatureIds.length);

    const withRecord = catalogWith({ stats: { runsPlayed: 2, deepestRentSurvived: 4 } });
    expect(stockroomScore(withRecord)).toBe(stockroomScore(base) + 1);
  });

  it('caps the runs contribution at RUNS_CAP', () => {
    const atCap = catalogWith({ stats: { runsPlayed: RUNS_CAP } });
    const overCap = catalogWith({ stats: { runsPlayed: RUNS_CAP + 50 } });
    expect(stockroomScore(overCap)).toBe(stockroomScore(atCap));
  });

  it('only counts signature discoveries, not ordinary items', () => {
    const ordinary = allItemIds.filter((id) => !signatureIds.includes(id)).slice(0, 8);
    const cat = catalogWith({ discoveredItemIds: ordinary, stats: { runsPlayed: 0 } });
    expect(stockroomScore(cat)).toBe(0);
  });
});

describe('galleryModel — escalation (c): P1 earlier than P4', () => {
  it('P1 completes at a smaller fraction of its pool than P4', () => {
    const p1Frac = def('still-life').thresholds.at(-1)! / table.size;
    const p4Frac = def('dusk').thresholds.at(-1)! / (table.size + combos.length);
    expect(p1Frac).toBeLessThan(p4Frac);
  });
});
