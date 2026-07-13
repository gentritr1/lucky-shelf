/**
 * B-M14 gallery threshold derivation + assertion (the threshold scar, fired 5×).
 * Reads the REAL item/combo tables and the unlock ladder, then proves the piece
 * thresholds in `src/state/galleryModel.ts` are completable, monotone, and
 * escalating. Run:
 *   node --import tsx scripts/gallery-thresholds.ts
 * Exits non-zero (throws) on any violation. The printed table is copied into
 * docs/review-packets/B-M14-picture-gallery.md.
 */
import { loadCombos, loadItemTable, isSignatureItem } from '../src/items';
import { PAINTINGS, RUNS_CAP } from '../src/state/galleryModel';

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(`ASSERT FAILED: ${msg}`);
}

const table = loadItemTable();
const combos = loadCombos();

const itemsTotal = table.size;
const combosTotal = combos.length;
const signatureCount = [...table.values()].filter((d) => isSignatureItem(d)).length;
const stockroomFloor = RUNS_CAP + signatureCount; // provably reachable without records

console.log('=== Live table counts (derived, not invented) ===');
console.log(`items in table            : ${itemsTotal}`);
console.log(`named combos              : ${combosTotal}`);
console.log(`signature items           : ${signatureCount}`);
console.log(`RUNS_CAP (max ladder gate): ${RUNS_CAP}`);
console.log(`P3 stockroom floor        : RUNS_CAP(${RUNS_CAP}) + signatures(${signatureCount}) = ${stockroomFloor}`);
console.log('');

// The provable completability ceiling for each painting's metric.
const poolMax: Record<string, number> = {
  'still-life': itemsTotal, // distinct items discovered
  'counter-cat': combosTotal, // named combos achieved
  stockroom: stockroomFloor, // runs+signatures floor (records only accelerate)
  dusk: itemsTotal + combosTotal, // discoveries + combos
};

console.log('=== Derived piece thresholds ===');
for (const p of PAINTINGS) {
  const cells = p.revealGrid.rows * p.revealGrid.cols;
  const final = p.thresholds[p.thresholds.length - 1] ?? 0;

  // Grid/threshold count agree.
  assert(p.thresholds.length === cells, `${p.id}: ${p.thresholds.length} thresholds ≠ ${cells} cells`);
  // Strictly monotone.
  for (let i = 1; i < p.thresholds.length; i += 1) {
    assert(p.thresholds[i]! > p.thresholds[i - 1]!, `${p.id}: thresholds not strictly increasing at ${i}`);
  }
  // First threshold positive (a piece is earned, never free at zero progress).
  assert(p.thresholds[0]! >= 1, `${p.id}: first threshold must be ≥ 1`);
  // Completable against the REAL pool.
  const max = poolMax[p.id]!;
  assert(final <= max, `${p.id}: final threshold ${final} exceeds reachable max ${max}`);

  console.log(
    `${p.order}. ${p.id.padEnd(12)} ${p.revealGrid.rows}×${p.revealGrid.cols} (${cells} pcs)  ` +
      `final ${String(final).padStart(2)} / max ${String(max).padStart(2)}  ` +
      `[${p.thresholds.join(', ')}]`,
  );
}
console.log('');

// (c) P1 completes meaningfully earlier than P4 — compared as a fraction of each
// painting's own metric pool (the escalating-rarity intent).
const p1 = PAINTINGS.find((p) => p.id === 'still-life')!;
const p4 = PAINTINGS.find((p) => p.id === 'dusk')!;
const p1Frac = (p1.thresholds[p1.thresholds.length - 1] ?? 0) / poolMax['still-life']!;
const p4Frac = (p4.thresholds[p4.thresholds.length - 1] ?? 0) / poolMax.dusk!;
assert(p1Frac < p4Frac, `P1 fraction ${p1Frac} not < P4 fraction ${p4Frac}`);
console.log('=== Escalation (c): P1 completes earlier than P4 ===');
console.log(`P1 completes at ${(p1Frac * 100).toFixed(1)}% of its pool; P4 at ${(p4Frac * 100).toFixed(1)}%.`);
console.log('');
console.log('ALL ASSERTIONS PASSED.');
