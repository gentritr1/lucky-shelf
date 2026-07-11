import { describe, expect, it } from 'vitest';

import type { ScoringTrace, Slot, TraceEvent } from '@/contracts';
import { toSlotKey } from '@/contracts';
import { loadCombos, loadItemTable } from '@/items';
import { resolveOpenShop } from '@/sim';
import { makeState } from '@/sim/testkit';

import { goldenFixtures } from '../goldens';
import {
  causeHasSource,
  formatReceipt,
  receiptDepsFromGameState,
  receiptFromTrace,
  type ReceiptDeps,
} from './receiptModel';

const table = loadItemTable();
const combos = loadCombos();

/** A generic namer so a hand-built trace needs no shelf — never returns empty. */
const genericDeps: ReceiptDeps = {
  itemNameAt: (slot) => `Item ${slot.row},${slot.col}`,
};

// ---------------------------------------------------------------------------
// 1. Golden snapshots — the six M0 traces become grammar regression fixtures.

describe('receiptFromTrace — M0 golden snapshots (grammar regression fixtures)', () => {
  for (const fixture of goldenFixtures) {
    it(`renders a stable receipt for ${fixture.fixtureId}`, () => {
      const deps = receiptDepsFromGameState(fixture.gameState, { table, combos });
      const lines = receiptFromTrace(fixture.scoringTrace, deps);
      // Snapshot the human-readable paper view AND the structured lines: the text
      // pins the grammar, the structure pins slot attribution + event indices.
      expect(formatReceipt(lines)).toMatchSnapshot('paper');
      expect(lines).toMatchSnapshot('lines');
    });
  }
});

// ---------------------------------------------------------------------------
// 2. Every TraceEvent kind renders per the grammar.

const slot = (row: number, col: number): Slot => ({ row, col });

describe('receiptFromTrace — every event kind renders per the grammar', () => {
  it('itemBase → a window header naming the item and its base', () => {
    const trace = wrap([{ kind: 'itemBase', slot: slot(0, 0), value: 4 }]);
    const line = receiptFromTrace(trace, genericDeps)[0]!;
    expect(line.kind).toBe('item');
    expect(line.indent).toBe(0);
    expect(line.label).toBe('Item 0,0');
    expect(line.amount).toBe('4');
  });

  it('ruleFire → an indented cause naming source · rule and delta → total', () => {
    const trace = wrap([
      { kind: 'itemBase', slot: slot(0, 0), value: 4 },
      {
        kind: 'ruleFire',
        sourceSlot: slot(0, 0),
        targetSlot: slot(0, 1),
        ruleId: 'wine-adjacent-cheese-flat',
        delta: { flat: 3 },
        runningTotal: 7,
      },
    ]);
    const cause = receiptFromTrace(trace, genericDeps).find((l) => l.kind === 'cause')!;
    expect(cause.indent).toBe(1);
    expect(cause.label).toBe('↳ Item 0,0 · Wine Adjacent Cheese Flat');
    expect(cause.amount).toBe('+3 → 7');
    expect(causeHasSource(cause)).toBe(true);
  });

  it('ruleFire credits the OPEN window (R-6 beneficiary), not necessarily targetSlot', () => {
    // Honey (0,2) grants wine (0,1) while wine's window is open: affected = wine.
    const trace = wrap([
      { kind: 'itemBase', slot: slot(0, 1), value: 4 },
      {
        kind: 'ruleFire',
        sourceSlot: slot(0, 2),
        targetSlot: slot(0, 1),
        ruleId: 'grant',
        delta: { flat: 4 },
        runningTotal: 8,
      },
    ]);
    const cause = receiptFromTrace(trace, genericDeps).find((l) => l.kind === 'cause')!;
    if (cause.detail.kind !== 'cause') throw new Error('expected cause');
    expect(toSlotKey(cause.detail.sourceSlot)).toBe('0:2');
    expect(toSlotKey(cause.detail.affectedSlot)).toBe('0:1');
  });

  it('mult delta renders ×N', () => {
    const trace = wrap([
      { kind: 'itemBase', slot: slot(0, 0), value: 4 },
      {
        kind: 'ruleFire',
        sourceSlot: slot(0, 0),
        targetSlot: slot(0, 0),
        ruleId: 'spotlight',
        delta: { mult: 1.5 },
        runningTotal: 6,
      },
    ]);
    const cause = receiptFromTrace(trace, genericDeps).find((l) => l.kind === 'cause')!;
    expect(cause.amount).toBe('×1.5 → 6');
  });

  it('rowAura → an aura line naming its source and ×mult (no orphan number)', () => {
    const trace = wrap([
      { kind: 'itemBase', slot: slot(0, 0), value: 0 },
      { kind: 'rowAura', sourceSlot: slot(0, 0), row: 0, mult: 1.5 },
    ]);
    const aura = receiptFromTrace(trace, genericDeps).find((l) => l.kind === 'aura')!;
    expect(aura.label).toBe('↳ Item 0,0 · row 0 aura');
    expect(aura.amount).toBe('×1.5');
    expect(causeHasSource(aura)).toBe(true);
  });

  it('itemTotal → a subtotal only when the item scored a cause; plain items stay one line', () => {
    // Plain: base == total, no rule → single header line, no subtotal.
    const plain = receiptFromTrace(
      wrap([
        { kind: 'itemBase', slot: slot(0, 0), value: 3 },
        { kind: 'itemTotal', slot: slot(0, 0), total: 3 },
      ]),
      genericDeps,
    );
    expect(plain.filter((l) => l.kind === 'subtotal')).toHaveLength(0);

    // Scored: a cause fired → the subtotal closes the window.
    const scored = receiptFromTrace(
      wrap([
        { kind: 'itemBase', slot: slot(0, 0), value: 4 },
        {
          kind: 'ruleFire',
          sourceSlot: slot(0, 0),
          targetSlot: slot(0, 0),
          ruleId: 'x',
          delta: { flat: 3 },
          runningTotal: 7,
        },
        { kind: 'itemTotal', slot: slot(0, 0), total: 7 },
      ]),
      genericDeps,
    );
    const subtotal = scored.find((l) => l.kind === 'subtotal')!;
    expect(subtotal.amount).toBe('= 7');
  });

  it('subtotal attributes an active row aura that multiplied the total', () => {
    const trace = wrap([
      { kind: 'itemBase', slot: slot(0, 0), value: 0 },
      { kind: 'rowAura', sourceSlot: slot(0, 0), row: 0, mult: 1.5 },
      { kind: 'itemTotal', slot: slot(0, 0), total: 0 },
      { kind: 'itemBase', slot: slot(0, 1), value: 4 },
      {
        kind: 'ruleFire',
        sourceSlot: slot(0, 2),
        targetSlot: slot(0, 1),
        ruleId: 'grant',
        delta: { flat: 4 },
        runningTotal: 8,
      },
      { kind: 'itemTotal', slot: slot(0, 1), total: 12 },
    ]);
    const subtotal = receiptFromTrace(trace, genericDeps).find(
      (l) => l.kind === 'subtotal' && toSlotKey((l.detail as { slot: Slot }).slot) === '0:1',
    )!;
    if (subtotal.detail.kind !== 'subtotal') throw new Error('expected subtotal');
    expect(subtotal.detail.appliedAura?.mult).toBe(1.5);
    expect(subtotal.label).toContain('row ×1.5');
  });

  it('comboNamed → a named-combo banner with no coin change', () => {
    const trace = wrap([
      { kind: 'comboNamed', comboId: 'wine-and-dine', slots: [slot(0, 0), slot(0, 1)] },
    ]);
    const combo = receiptFromTrace(trace, genericDeps).find((l) => l.kind === 'combo')!;
    expect(combo.label).toBe('• Wine And Dine');
    expect(combo.amount).toBe('');
    expect(combo.slots).toHaveLength(2);
  });

  it('transform and vanish render as annotations', () => {
    const trace = wrap([
      { kind: 'transform', slot: slot(0, 0), fromItem: 'cheese-wheel', toItem: 'cheese-wheel-tier-2' },
      { kind: 'vanish', slot: slot(0, 1), itemId: 'coupon-stack' },
    ]);
    const lines = receiptFromTrace(trace, genericDeps);
    expect(lines.find((l) => l.kind === 'transform')!.label).toBe(
      '→ Cheese Wheel became Cheese Wheel Tier 2',
    );
    expect(lines.find((l) => l.kind === 'vanish')!.label).toBe('× Coupon Stack left the shelf');
  });

  it('dayTotal → the brass receipt total', () => {
    const trace = wrap([{ kind: 'itemBase', slot: slot(0, 0), value: 4 }]);
    const total = receiptFromTrace(trace, genericDeps).find((l) => l.kind === 'total')!;
    expect(total.label).toBe('DAY TOTAL');
    expect(total.amount).toBe(String((trace.events.at(-1) as { coins: number }).coins));
  });

  it('every emitted line carries the eventIndex that reveals it (cascade-clock sync)', () => {
    const events: TraceEvent[] = [
      { kind: 'itemBase', slot: slot(0, 0), value: 4 },
      {
        kind: 'ruleFire',
        sourceSlot: slot(0, 0),
        targetSlot: slot(0, 1),
        ruleId: 'x',
        delta: { flat: 3 },
        runningTotal: 7,
      },
      { kind: 'itemTotal', slot: slot(0, 0), total: 7 },
      { kind: 'dayTotal', coins: 7 },
    ];
    const lines = receiptFromTrace({ traceId: 't', day: 1, seed: 's', events }, genericDeps);
    for (const line of lines) {
      expect(line.eventIndex).toBeGreaterThanOrEqual(0);
      expect(line.eventIndex).toBeLessThan(events.length);
      // The line's source event kind must be consistent with the line kind.
      expect(events[line.eventIndex]).toBeDefined();
    }
  });
});

// ---------------------------------------------------------------------------
// 3. Missing-name fallback still names a source (grammar guarantee, deps-agnostic).

describe('receiptFromTrace — source guarantee survives an unknown shelf slot', () => {
  it('falls back to a slot token so a cause never renders sourceless', () => {
    const emptyDeps: ReceiptDeps = { itemNameAt: () => undefined };
    const trace = wrap([
      { kind: 'itemBase', slot: slot(2, 3), value: 4 },
      {
        kind: 'ruleFire',
        sourceSlot: slot(2, 3),
        targetSlot: slot(2, 4),
        ruleId: 'x',
        delta: { flat: 1 },
        runningTotal: 5,
      },
    ]);
    const cause = receiptFromTrace(trace, emptyDeps).find((l) => l.kind === 'cause')!;
    expect(causeHasSource(cause)).toBe(true);
    expect(cause.label).toBe('↳ Slot 2,3 · X');
  });
});

// ---------------------------------------------------------------------------
// 4. A synergy + spotlight + signature trace: correct attribution and ordering.

describe('receiptFromTrace — synergy + spotlight + signature attribution', () => {
  it('names every prototype-lever cause and preserves event order', () => {
    const prev = {
      sig: process.env.SIGNATURE_ITEMS_ENABLED,
      syn: process.env.TAG_SYNERGY_ENABLED,
    };
    process.env.SIGNATURE_ITEMS_ENABLED = '1';
    process.env.TAG_SYNERGY_ENABLED = '1';
    try {
      // Three 'lucky' items (synergy ≥3) incl. a signature item, and a spotlight
      // on the one that scores > 0 so the spotlight lever genuinely fires.
      const shopCat = slot(0, 0); // lucky, mascot — casts the row aura, base 0
      const maneki = slot(0, 1); // lucky, mascot — base 6, the spotlighted slot
      const luckyCat = slot(0, 2); // lucky, mascot, signature — copies best
      const state = makeState(
        [
          { slot: shopCat, itemId: 'shop-cat' },
          { slot: maneki, itemId: 'maneki-neko' },
          { slot: luckyCat, itemId: 'lucky-cat' },
        ],
        { loopV2: true, spotlight: maneki }, // v2 snapshot: synergy/signature scoring is run-gated
      );
      const trace = resolveOpenShop(state, table, combos).trace;

      const deps = receiptDepsFromGameState(state, { table, combos });
      const lines = receiptFromTrace(trace, deps);

      // Ordering: receipt line eventIndices are non-decreasing and cover the trace
      // in order (the print sync contract).
      const indices = lines.map((l) => l.eventIndex);
      expect(indices).toEqual([...indices].sort((x, y) => x - y));

      // Every ruleFire in the trace has a cause line that names a source.
      const fireCount = trace.events.filter((e) => e.kind === 'ruleFire').length;
      const causeLines = lines.filter((l) => l.kind === 'cause');
      expect(causeLines.length).toBe(fireCount);
      for (const line of causeLines) expect(causeHasSource(line)).toBe(true);

      const causeById = (ruleId: string) =>
        causeLines.find((l) => l.detail.kind === 'cause' && l.detail.ruleId === ruleId);

      // All three prototype levers genuinely fired (non-vacuous coverage).
      const spotlight = causeById('spotlight');
      const synergy = causeById('synergy');
      const signature = causeById('lucky-cat-best-in-shop');
      expect(spotlight).toBeDefined();
      expect(synergy).toBeDefined();
      expect(signature).toBeDefined();

      // The spotlight mult is attributed to the spotlighted item itself.
      if (spotlight?.detail.kind === 'cause') {
        expect(toSlotKey(spotlight.detail.sourceSlot)).toBe(toSlotKey(maneki));
        expect(spotlight.detail.ruleLabel).toBe('spotlight');
        expect(spotlight.detail.deltaLabel.startsWith('×')).toBe(true);
      }
      // The synergy fire reads as tag synergy with a named source.
      if (synergy?.detail.kind === 'cause') {
        expect(synergy.detail.ruleLabel).toBe('tag synergy');
        expect(synergy.detail.sourceName.length).toBeGreaterThan(0);
      }
      // The signature copy names the item it copied from (its value source).
      if (signature?.detail.kind === 'cause') {
        expect(signature.detail.ruleLabel).toBe('copies best');
        expect(signature.detail.sourceName.length).toBeGreaterThan(0);
      }
    } finally {
      restoreEnv('SIGNATURE_ITEMS_ENABLED', prev.sig);
      restoreEnv('TAG_SYNERGY_ENABLED', prev.syn);
    }
  });
});

// ---------------------------------------------------------------------------
// 5. Grammar completeness proof — 50 fuzzed traces, no orphan deltas.

describe('receiptFromTrace — no orphan deltas across 50 fuzzed traces', () => {
  it('every ruleFire produces exactly one cause line that names a source', () => {
    const rng = mulberry32(0xb8_5eed);
    const deps: ReceiptDeps = { itemNameAt: (s) => `Item ${s.row},${s.col}` };

    for (let t = 0; t < 50; t += 1) {
      const trace = fuzzTrace(rng);
      const lines = receiptFromTrace(trace, deps);

      const fires = trace.events.filter((e) => e.kind === 'ruleFire');
      const causes = lines.filter((l) => l.kind === 'cause');
      // 1:1 — one cause line per ruleFire.
      expect(causes.length).toBe(fires.length);
      // Each cause names a non-empty source (grammar #2, no orphan numbers).
      for (const line of causes) {
        expect(causeHasSource(line)).toBe(true);
        if (line.detail.kind === 'cause') {
          expect(line.detail.sourceName.trim().length).toBeGreaterThan(0);
          expect(Number.isFinite(line.detail.runningTotal)).toBe(true);
        }
      }
      // A well-formed trace ends in a dayTotal → the receipt ends in a total line.
      expect(lines.at(-1)?.kind).toBe('total');
    }
  });
});

// ---------------------------------------------------------------------------
// Helpers.

/** Wrap partial events into a schema-shaped trace ending in dayTotal. */
function wrap(events: TraceEvent[]): ScoringTrace {
  const runningTotal = events.reduce((sum, e) => {
    if (e.kind === 'itemTotal') return sum + e.total;
    return sum;
  }, 0);
  return {
    traceId: 'test-trace',
    day: 1,
    seed: 'test',
    events: [...events, { kind: 'dayTotal', coins: runningTotal }],
  };
}

function restoreEnv(key: string, value: string | undefined): void {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}

/** Small deterministic PRNG so the fuzz is reproducible. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d_2b_79_f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

/**
 * Build a plausible scoring trace: a handful of item windows, each with 0–3
 * rule fires (self- or cross-slot, flat or mult) and occasional row auras,
 * transforms and vanishes, ending in a dayTotal. Every fire carries a running
 * total, so the model must attribute all of them.
 */
function fuzzTrace(rng: () => number): ScoringTrace {
  const rint = (n: number) => Math.floor(rng() * n);
  const rslot = (): Slot => ({ row: rint(3), col: rint(4) });
  const events: TraceEvent[] = [];
  let dayTotal = 0;

  const windows = 1 + rint(5);
  for (let w = 0; w < windows; w += 1) {
    const home = rslot();
    let running = rint(8);
    events.push({ kind: 'itemBase', slot: home, value: running });

    if (rng() < 0.25) {
      events.push({ kind: 'rowAura', sourceSlot: home, row: home.row, mult: 1.5 });
    }

    const fires = rint(4);
    for (let f = 0; f < fires; f += 1) {
      const selfFire = rng() < 0.4;
      const source = selfFire ? home : rslot();
      const target = selfFire ? home : rslot();
      if (rng() < 0.5) {
        const flat = 1 + rint(6);
        running += flat;
        events.push({
          kind: 'ruleFire',
          sourceSlot: source,
          targetSlot: target,
          ruleId: pick(rng, ['adjacency', 'grant', 'spotlight', 'order', 'synergy']),
          delta: { flat },
          runningTotal: running,
        });
      } else {
        const mult = pick(rng, [1.2, 1.5, 2]);
        running = Math.floor(running * mult);
        events.push({
          kind: 'ruleFire',
          sourceSlot: source,
          targetSlot: target,
          ruleId: pick(rng, ['adjacency', 'grant', 'spotlight', 'order', 'synergy']),
          delta: { mult },
          runningTotal: running,
        });
      }
    }

    events.push({ kind: 'itemTotal', slot: home, total: running });
    dayTotal += running;

    if (rng() < 0.12) {
      events.push({ kind: 'transform', slot: home, fromItem: 'a-item', toItem: 'b-item' });
    }
    if (rng() < 0.08) {
      events.push({ kind: 'vanish', slot: home, itemId: 'a-item' });
    }
  }

  events.push({ kind: 'dayTotal', coins: dayTotal });
  return { traceId: `fuzz-${dayTotal}`, day: 1, seed: 'fuzz', events };
}

function pick<T>(rng: () => number, items: readonly T[]): T {
  return items[Math.floor(rng() * items.length)]!;
}
