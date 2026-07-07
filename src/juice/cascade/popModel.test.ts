import { describe, expect, it } from 'vitest';

import type { TraceEvent } from '@/contracts';
import { loadCombos, loadItemTable } from '@/items';
import { resolveOpenShop } from '@/sim';
import { makeState } from '@/sim/testkit';

import { deltaLabel, isSelfFire } from './popModel';

const fire = (source: [number, number], target: [number, number]): TraceEvent => ({
  kind: 'ruleFire',
  sourceSlot: { row: source[0], col: source[1] },
  targetSlot: { row: target[0], col: target[1] },
  ruleId: 'x',
  delta: { flat: 1 },
  runningTotal: 1,
});

describe('popModel.isSelfFire', () => {
  it('is true only when a ruleFire scores its own slot', () => {
    expect(isSelfFire(fire([1, 1], [1, 1]))).toBe(true);
    expect(isSelfFire(fire([1, 1], [1, 2]))).toBe(false);
    expect(isSelfFire({ kind: 'itemTotal', slot: { row: 0, col: 0 }, total: 5 })).toBe(false);
  });

  it('classifies real scoring emissions: self-scoring rules pop, cross-slot rules arrow', () => {
    // Two adjacent food items (cross-slot combo fires) + a spotlight/order on one
    // of them (self-fires). Every 'spotlight'/'order' fire must be a self-fire;
    // the adjacency fire between the two slots must NOT be.
    const a = { row: 0, col: 0 };
    const b = { row: 0, col: 1 };
    const result = resolveOpenShop(
      makeState(
        [
          { slot: a, itemId: 'cheese-wheel' },
          { slot: b, itemId: 'wine-bottle' },
        ],
        { spotlight: a, dailyOrder: { tag: 'food', count: 1 } },
      ),
      loadItemTable(),
      loadCombos(),
    );

    const fires = result.trace.events.filter((e) => e.kind === 'ruleFire');
    const leverFires = fires.filter((e) => e.kind === 'ruleFire' && (e.ruleId === 'spotlight' || e.ruleId === 'order'));
    expect(leverFires.length).toBeGreaterThan(0);
    for (const event of leverFires) expect(isSelfFire(event)).toBe(true);

    // Any fire whose source and target differ (adjacency/grants) is an arrow.
    const crossFires = fires.filter((e) => !isSelfFire(e));
    for (const event of crossFires) {
      expect(event.kind === 'ruleFire' && event.ruleId !== 'spotlight' && event.ruleId !== 'order').toBe(true);
    }
  });
});

describe('popModel.deltaLabel', () => {
  it('formats mult and signed flat deltas', () => {
    expect(deltaLabel({ mult: 3 })).toBe('×3');
    expect(deltaLabel({ mult: 1.5 })).toBe('×1.5');
    expect(deltaLabel({ flat: 4 })).toBe('+4');
    expect(deltaLabel({ flat: -2 })).toBe('-2');
    expect(deltaLabel({})).toBe('');
  });
});
