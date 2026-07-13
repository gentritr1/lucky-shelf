import { describe, expect, it } from 'vitest';

import type { ScoringTrace } from '@/contracts';

import { captionForLine, receiptCaptionForStep } from './caption';
import { receiptFromTrace, type ReceiptDeps } from './receiptModel';

const deps: ReceiptDeps = {
  itemNameAt: ({ col }) => col === 0 ? 'Wine Bottle' : 'Cheese Wheel',
  ruleLabel: () => 'per neighbor',
};

const trace: ScoringTrace = {
  traceId: 'caption-test',
  day: 1,
  seed: 'caption-test',
  events: [
    { kind: 'itemBase', slot: { row: 0, col: 0 }, value: 4 },
    {
      kind: 'ruleFire',
      sourceSlot: { row: 0, col: 0 },
      targetSlot: { row: 0, col: 1 },
      ruleId: 'wine-cheese',
      delta: { flat: 3 },
      runningTotal: 7,
    },
    { kind: 'itemTotal', slot: { row: 0, col: 0 }, total: 7 },
    { kind: 'dayTotal', coins: 7 },
  ],
};

describe('receipt cascade captions', () => {
  it('states source, affected item, delta, and new total for a rule fire', () => {
    const lines = receiptFromTrace(trace, deps);
    expect(receiptCaptionForStep(lines, 1)).toEqual({
      eventIndex: 1,
      title: 'Wine Bottle → Wine Bottle',
      explanation: 'per neighbor +3 · now 7',
      accessibilityLabel: 'Wine Bottle → Wine Bottle. per neighbor +3 · now 7',
    });
  });

  it('keeps the last meaningful caption on receipt-silent trace steps', () => {
    const plainTrace: ScoringTrace = {
      ...trace,
      events: [
        { kind: 'itemBase', slot: { row: 0, col: 1 }, value: 3 },
        { kind: 'itemTotal', slot: { row: 0, col: 1 }, total: 3 },
        { kind: 'dayTotal', coins: 3 },
      ],
    };
    const lines = receiptFromTrace(plainTrace, deps);

    expect(receiptCaptionForStep(lines, 1)?.explanation).toBe('Starts at 3');
    expect(receiptCaptionForStep(lines, 2)?.explanation).toBe('3 coins');
    expect(receiptCaptionForStep(lines, -1)).toBeNull();
  });

  it('describes aura, subtotal, combo, transform, vanish, and total lines', () => {
    const lines = receiptFromTrace(
      {
        ...trace,
        events: [
          { kind: 'itemBase', slot: { row: 0, col: 0 }, value: 4 },
          { kind: 'rowAura', sourceSlot: { row: 0, col: 0 }, row: 0, mult: 1.5 },
          { kind: 'itemTotal', slot: { row: 0, col: 0 }, total: 6 },
          {
            kind: 'comboNamed',
            comboId: 'wine-and-dine',
            slots: [{ row: 0, col: 0 }, { row: 0, col: 1 }],
          },
          {
            kind: 'transform',
            slot: { row: 0, col: 1 },
            fromItem: 'cheese-wheel',
            toItem: 'aged-cheese',
          },
          { kind: 'vanish', slot: { row: 0, col: 1 }, itemId: 'coupon-stack' },
          { kind: 'dayTotal', coins: 6 },
        ],
      },
      deps,
    );

    expect(lines.map(captionForLine).map(({ explanation }) => explanation)).toEqual([
      'Starts at 4',
      'Row aura ×1.5',
      'Subtotal 6 after row ×1.5',
      'Named combo · 2 items',
      'Transformation',
      'Left the shelf',
      '6 coins',
    ]);
  });
});
