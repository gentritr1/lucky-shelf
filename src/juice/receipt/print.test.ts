import { describe, expect, it } from 'vitest';

import type { ScoringTrace } from '@/contracts';

import { receiptComplete, visibleReceiptLines } from './print';
import { receiptFromTrace, type ReceiptDeps } from './receiptModel';

const deps: ReceiptDeps = { itemNameAt: (s) => `Item ${s.row},${s.col}` };

const trace: ScoringTrace = {
  traceId: 't',
  day: 1,
  seed: 's',
  events: [
    { kind: 'itemBase', slot: { row: 0, col: 0 }, value: 4 },
    {
      kind: 'ruleFire',
      sourceSlot: { row: 0, col: 0 },
      targetSlot: { row: 0, col: 1 },
      ruleId: 'x',
      delta: { flat: 3 },
      runningTotal: 7,
    },
    { kind: 'itemTotal', slot: { row: 0, col: 0 }, total: 7 },
    { kind: 'dayTotal', coins: 7 },
  ],
};

const lines = receiptFromTrace(trace, deps);

describe('visibleReceiptLines — reuses the cascade clock (no second timer)', () => {
  it('reveals nothing before the first step', () => {
    expect(visibleReceiptLines(lines, -1)).toHaveLength(0);
  });

  it('reveals exactly the lines whose event has resolved', () => {
    // stepIndex 0 = itemBase resolved → the header only.
    expect(visibleReceiptLines(lines, 0).map((l) => l.kind)).toEqual(['item']);
    // stepIndex 1 = the ruleFire → header + cause.
    expect(visibleReceiptLines(lines, 1).map((l) => l.kind)).toEqual(['item', 'cause']);
    // stepIndex 3 = dayTotal → the whole receipt.
    expect(visibleReceiptLines(lines, 3).map((l) => l.kind)).toEqual([
      'item',
      'cause',
      'subtotal',
      'total',
    ]);
  });

  it('reveal count is monotonic in stepIndex (a line never un-prints)', () => {
    let prev = 0;
    for (let step = -1; step < trace.events.length; step += 1) {
      const count = visibleReceiptLines(lines, step).length;
      expect(count).toBeGreaterThanOrEqual(prev);
      prev = count;
    }
  });

  it('reduced motion short-circuits the print: the full receipt appears at once', () => {
    // revealAll ignores stepIndex — same lines, no per-line reveal (R-28 parity).
    expect(visibleReceiptLines(lines, -1, true)).toHaveLength(lines.length);
    expect(receiptComplete(lines, -1, true)).toBe(true);
  });
});

describe('receiptComplete — true once the total has printed', () => {
  it('is false mid-print and true at/after the total step', () => {
    expect(receiptComplete(lines, 1)).toBe(false);
    expect(receiptComplete(lines, 3)).toBe(true);
  });
});
