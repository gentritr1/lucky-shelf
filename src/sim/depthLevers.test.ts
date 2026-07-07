import { describe, expect, it } from 'vitest';

import type { ScoringTrace, Slot } from '../contracts';
import { toSlotKey } from '../contracts';
import { loadCombos, loadItemTable } from '../items';

import {
  DEMAND_COUNT,
  DEMAND_MULT,
  SPOTLIGHT_MULT,
  TAG_SYNERGY_ENV_VAR,
  TAG_SYNERGY_LADDER,
} from './economy';
import { playRun } from './bots';
import { dispatch, pickCycleOrder, pickSpotlight } from './engine';
import { hashState } from './hash';
import { resolveOpenShop } from './scoring';
import { makeState, type PlacedItem } from './testkit';

const table = loadItemTable();
const combos = loadCombos();
const foodItemIds = [
  'cheese-wheel',
  'honey-jar',
  'bread-loaf',
  'apple-basket',
  'jam-jars',
  'chocolate-box',
  'cheese-wheel-tier-2',
] as const;
const nonAdjacentSlots: Slot[] = [
  { row: 0, col: 0 },
  { row: 0, col: 2 },
  { row: 1, col: 1 },
  { row: 1, col: 3 },
  { row: 2, col: 0 },
  { row: 2, col: 2 },
  { row: 2, col: 3 },
];

function itemTotals(trace: ScoringTrace): Map<string, number> {
  const totals = new Map<string, number>();
  for (const event of trace.events) {
    if (event.kind === 'itemTotal') totals.set(toSlotKey(event.slot), event.total);
  }
  return totals;
}

function placedFood(count: number): PlacedItem[] {
  return Array.from({ length: count }, (_, index) => ({
    slot: nonAdjacentSlots[index] ?? { row: Math.floor(index / 4), col: index % 4 },
    itemId: foodItemIds[index % foodItemIds.length]!,
  }));
}

function ruleIdsForSlot(trace: ScoringTrace, slot: Slot): string[] {
  return trace.events
    .filter((event) => event.kind === 'ruleFire' && toSlotKey(event.sourceSlot) === toSlotKey(slot))
    .map((event) => (event.kind === 'ruleFire' ? event.ruleId : ''));
}

function ruleFires(trace: ScoringTrace, ruleId: string) {
  return trace.events.filter((event) => event.kind === 'ruleFire' && event.ruleId === ruleId);
}

function ruleFiresForSlot(trace: ScoringTrace, ruleId: string, slot: Slot) {
  const key = toSlotKey(slot);
  return ruleFires(trace, ruleId).filter(
    (event) =>
      event.kind === 'ruleFire' &&
      toSlotKey(event.sourceSlot) === key &&
      toSlotKey(event.targetSlot) === key,
  );
}

function synergyMultForCount(count: number): number {
  let mult = 1;
  for (const step of TAG_SYNERGY_LADDER) {
    if (count >= step.minCount) mult = step.mult;
  }
  return mult;
}

function withTagSynergy<T>(enabled: boolean, run: () => T): T {
  const previous = process.env[TAG_SYNERGY_ENV_VAR];
  if (enabled) process.env[TAG_SYNERGY_ENV_VAR] = '1';
  else delete process.env[TAG_SYNERGY_ENV_VAR];
  try {
    return run();
  } finally {
    if (previous === undefined) delete process.env[TAG_SYNERGY_ENV_VAR];
    else process.env[TAG_SYNERGY_ENV_VAR] = previous;
  }
}

describe('prototype depth levers', () => {
  it('spotlight multiplies an occupied slot total and emits in that slot window', () => {
    const slot = { row: 0, col: 0 };
    const withoutSpotlight = resolveOpenShop(
      makeState([{ slot, itemId: 'wine-bottle' }], { spotlight: null, dailyOrder: null }),
      table,
      combos,
    );
    const withSpotlight = resolveOpenShop(
      makeState([{ slot, itemId: 'wine-bottle' }], { spotlight: slot, dailyOrder: null }),
      table,
      combos,
    );

    const baseTotal = itemTotals(withoutSpotlight.trace).get(toSlotKey(slot));
    expect(itemTotals(withSpotlight.trace).get(toSlotKey(slot))).toBe(
      Math.floor((baseTotal ?? 0) * SPOTLIGHT_MULT),
    );
    expect(withSpotlight.trace.events).toContainEqual({
      kind: 'ruleFire',
      sourceSlot: slot,
      targetSlot: slot,
      ruleId: 'spotlight',
      delta: { mult: SPOTLIGHT_MULT },
      runningTotal: Math.floor((baseTotal ?? 0) * SPOTLIGHT_MULT),
    });
  });

  it('spotlight on an empty or blocked slot has no effect and emits no event', () => {
    const occupiedSlot = { row: 0, col: 0 };
    const emptySpotlight = { row: 2, col: 3 };
    const base = resolveOpenShop(
      makeState([{ slot: occupiedSlot, itemId: 'wine-bottle' }], {
        spotlight: null,
        dailyOrder: null,
      }),
      table,
      combos,
    );
    const empty = resolveOpenShop(
      makeState([{ slot: occupiedSlot, itemId: 'wine-bottle' }], {
        spotlight: emptySpotlight,
        dailyOrder: null,
      }),
      table,
      combos,
    );
    const blocked = resolveOpenShop(
      makeState([{ slot: occupiedSlot, itemId: 'shop-cat' }], {
        spotlight: occupiedSlot,
        dailyOrder: null,
      }),
      table,
      combos,
    );

    expect(empty.trace.events.some((event) => event.kind === 'ruleFire' && event.ruleId === 'spotlight'))
      .toBe(false);
    expect(empty.dayTotal).toBe(base.dayTotal);
    expect(blocked.trace.events.some((event) => event.kind === 'ruleFire' && event.ruleId === 'spotlight'))
      .toBe(false);
    expect(itemTotals(blocked.trace).get(toSlotKey(occupiedSlot))).toBe(0);
  });

  it('order multiplies each matching item only when the tag count is met', () => {
    const placed = placedFood(DEMAND_COUNT);
    const withoutOrder = resolveOpenShop(makeState(placed, { spotlight: null, dailyOrder: null }), table, combos);
    const withOrder = resolveOpenShop(
      makeState(placed, { spotlight: null, dailyOrder: { tag: 'food', count: DEMAND_COUNT } }),
      table,
      combos,
    );

    const baseline = itemTotals(withoutOrder.trace);
    const ordered = itemTotals(withOrder.trace);
    for (const placedItem of placed) {
      const key = toSlotKey(placedItem.slot);
      expect(ordered.get(key)).toBe(Math.floor((baseline.get(key) ?? 0) * DEMAND_MULT));
    }
    expect(withOrder.trace.events.filter((event) => event.kind === 'ruleFire' && event.ruleId === 'order'))
      .toHaveLength(DEMAND_COUNT);

    const shortOrder = resolveOpenShop(
      makeState(placedFood(Math.max(0, DEMAND_COUNT - 1)), {
        spotlight: null,
        dailyOrder: { tag: 'food', count: DEMAND_COUNT },
      }),
      table,
      combos,
    );
    expect(shortOrder.trace.events.some((event) => event.kind === 'ruleFire' && event.ruleId === 'order'))
      .toBe(false);
  });

  it('applies order before spotlight when both hit the same item', () => {
    const spotlight = nonAdjacentSlots[0]!;
    const placed = placedFood(DEMAND_COUNT);
    const withoutLevers = resolveOpenShop(
      makeState(placed, { spotlight: null, dailyOrder: null }),
      table,
      combos,
    );
    const withBoth = resolveOpenShop(
      makeState(placed, { spotlight, dailyOrder: { tag: 'food', count: DEMAND_COUNT } }),
      table,
      combos,
    );

    const baseTotal = itemTotals(withoutLevers.trace).get(toSlotKey(spotlight)) ?? 0;
    const orderTotal = Math.floor(baseTotal * DEMAND_MULT);
    const expectedTotal = Math.floor(orderTotal * SPOTLIGHT_MULT);
    const ids = ruleIdsForSlot(withBoth.trace, spotlight);

    expect(ids.indexOf('order')).toBeGreaterThanOrEqual(0);
    expect(ids.indexOf('spotlight')).toBeGreaterThan(ids.indexOf('order'));
    expect(itemTotals(withBoth.trace).get(toSlotKey(spotlight))).toBe(expectedTotal);
  });

  it('tag synergy applies the eligible-tag ladder per matching item and caps at the top step', () =>
    withTagSynergy(true, () => {
      for (const count of [2, 3, 4, 5, 6, 7]) {
        const placed = placedFood(count);
        const baseline = withTagSynergy(false, () =>
          resolveOpenShop(makeState(placed, { spotlight: null, dailyOrder: null }), table, combos),
        );
        const result = resolveOpenShop(
          makeState(placed, { spotlight: null, dailyOrder: null }),
          table,
          combos,
        );
        const expectedMult = synergyMultForCount(count);
        const baselineTotals = itemTotals(baseline.trace);
        const totals = itemTotals(result.trace);

        for (const placedItem of placed) {
          const key = toSlotKey(placedItem.slot);
          expect(totals.get(key)).toBe(Math.floor((baselineTotals.get(key) ?? 0) * expectedMult));
        }
        expect(ruleFires(result.trace, 'synergy')).toHaveLength(
          expectedMult > 1 ? placed.length : 0,
        );
      }
    }));

  it('tag synergy uses one best qualifying tag instead of multiplying every tag', () =>
    withTagSynergy(true, () => {
      const target = { row: 0, col: 0 };
      const placed = [
        { slot: target, itemId: 'chocolate-box' },
        { slot: { row: 0, col: 2 }, itemId: 'honey-jar' },
        { slot: { row: 1, col: 1 }, itemId: 'jam-jars' },
        { slot: { row: 1, col: 3 }, itemId: 'observation-hive' },
        { slot: { row: 2, col: 0 }, itemId: 'observation-hive' },
      ];
      const result = resolveOpenShop(
        makeState(placed, { spotlight: null, dailyOrder: null }),
        table,
        combos,
      );
      const fires = ruleFiresForSlot(result.trace, 'synergy', target);
      const expectedMult = synergyMultForCount(5);

      expect(fires).toHaveLength(1);
      expect(fires[0]).toMatchObject({
        kind: 'ruleFire',
        sourceSlot: target,
        targetSlot: target,
        ruleId: 'synergy',
        delta: { mult: expectedMult },
      });
      expect(itemTotals(result.trace).get(toSlotKey(target))).toBe(Math.floor(4 * expectedMult));
    }));

  it('tag synergy supersedes order when enabled and leaves order intact when disabled', () => {
    const placed = placedFood(3);
    const orderedState = makeState(placed, {
      spotlight: null,
      dailyOrder: { tag: 'food', count: DEMAND_COUNT },
    });

    const off = withTagSynergy(false, () => resolveOpenShop(orderedState, table, combos));
    expect(ruleFires(off.trace, 'order')).toHaveLength(placed.length);
    expect(ruleFires(off.trace, 'synergy')).toHaveLength(0);

    const on = withTagSynergy(true, () => resolveOpenShop(orderedState, table, combos));
    expect(ruleFires(on.trace, 'order')).toHaveLength(0);
    expect(ruleFires(on.trace, 'synergy')).toHaveLength(placed.length);
  });

  it('tag synergy ignores ineligible tag piles but occupied blockers still count for eligible tags', () =>
    withTagSynergy(true, () => {
      const paper = resolveOpenShop(
        makeState(
          [
            { slot: { row: 0, col: 0 }, itemId: 'coupon-stack' },
            { slot: { row: 0, col: 2 }, itemId: 'postcard-rack' },
            { slot: { row: 1, col: 1 }, itemId: 'record-crate' },
          ],
          { spotlight: null, dailyOrder: null },
        ),
        table,
        combos,
      );
      expect(ruleFires(paper.trace, 'synergy')).toHaveLength(0);

      const blockedSlot = { row: 0, col: 0 };
      const result = resolveOpenShop(
        makeState(
          [
            { slot: blockedSlot, itemId: 'shop-cat' },
            { slot: { row: 0, col: 2 }, itemId: 'penny-jar', baseValue: 10 },
            { slot: { row: 1, col: 1 }, itemId: 'lucky-bamboo', baseValue: 10 },
          ],
          { spotlight: null, dailyOrder: null },
        ),
        table,
        combos,
      );

      expect(itemTotals(result.trace).get(toSlotKey(blockedSlot))).toBe(0);
      expect(ruleFiresForSlot(result.trace, 'synergy', blockedSlot)).toHaveLength(0);
      expect(ruleFires(result.trace, 'synergy')).toHaveLength(2);
    }));

  it('applies tag synergy after ambient auras and before spotlight', () =>
    withTagSynergy(true, () => {
      const target = { row: 0, col: 2 };
      const placed = [
        { slot: { row: 0, col: 0 }, itemId: 'maneki-neko' },
        { slot: target, itemId: 'cheese-wheel', baseValue: 10 },
        { slot: { row: 1, col: 1 }, itemId: 'bread-loaf' },
        { slot: { row: 2, col: 0 }, itemId: 'apple-basket' },
      ];
      const result = resolveOpenShop(
        makeState(placed, { spotlight: target, dailyOrder: { tag: 'food', count: DEMAND_COUNT } }),
        table,
        combos,
      );
      const targetIds = ruleIdsForSlot(result.trace, target);
      const afterAura = Math.floor(10 * 1.5);
      const afterSynergy = Math.floor(afterAura * synergyMultForCount(3));
      const expected = Math.floor(afterSynergy * SPOTLIGHT_MULT);

      expect(ruleFires(result.trace, 'order')).toHaveLength(0);
      expect(targetIds.indexOf('synergy')).toBeGreaterThanOrEqual(0);
      expect(targetIds.indexOf('spotlight')).toBeGreaterThan(targetIds.indexOf('synergy'));
      expect(itemTotals(result.trace).get(toSlotKey(target))).toBe(expected);
    }));

  it('keeps tag-synergy-enabled bot runs deterministic for the same seed', () =>
    withTagSynergy(true, () => {
      const deps = { table, combos };
      const first = playRun('tag-synergy-determinism', 'greedy', deps, 120);
      const second = playRun('tag-synergy-determinism', 'greedy', deps, 120);

      expect(second.actions).toEqual(first.actions);
      expect(hashState(second.finalState)).toBe(hashState(first.finalState));
    }));

  it('picks one order per rent cycle and rotates the spotlight by day', () => {
    const seed = findSeedWithDifferentOrders();
    const firstCycle = pickCycleOrder(seed, 1);
    expect([pickCycleOrder(seed, 1), pickCycleOrder(seed, 1), pickCycleOrder(seed, 1)])
      .toEqual([firstCycle, firstCycle, firstCycle]);
    expect(pickCycleOrder(seed, 2)).not.toEqual(firstCycle);

    const spotlightSeed = findSeedWithRotatingSpotlights();
    const size = { rows: 3, cols: 4 };
    const days = [1, 2, 3].map((day) => pickSpotlight(spotlightSeed, day, size));
    expect(new Set(days.map((slot) => (slot ? toSlotKey(slot) : 'null'))).size).toBeGreaterThan(1);

    let state = makeState([{ slot: { row: 0, col: 0 }, itemId: 'wine-bottle' }], {
      seed,
      phase: 'arrange',
      day: 1,
      coins: 100,
      rent: { amount: 25, dueInDays: 3, cycle: 1 },
      spotlight: pickSpotlight(seed, 1, size),
      dailyOrder: firstCycle,
    });
    state = dispatch(state, { type: 'openShop' }, { table, combos });
    expect(state.day).toBe(2);
    expect(state.rent.cycle).toBe(1);
    expect(state.dailyOrder).toEqual(firstCycle);
    expect(state.spotlight).toEqual(pickSpotlight(seed, 2, size));

    state = dispatch({ ...state, phase: 'arrange' }, { type: 'openShop' }, { table, combos });
    expect(state.day).toBe(3);
    expect(state.rent.cycle).toBe(1);
    expect(state.dailyOrder).toEqual(firstCycle);
    expect(state.spotlight).toEqual(pickSpotlight(seed, 3, size));

    state = dispatch({ ...state, phase: 'arrange' }, { type: 'openShop' }, { table, combos });
    expect(state.day).toBe(4);
    expect(state.rent.cycle).toBe(2);
    expect(state.dailyOrder).toEqual(pickCycleOrder(seed, 2));
    expect(state.dailyOrder).not.toEqual(firstCycle);
  });
});

function findSeedWithDifferentOrders(): string {
  for (let index = 0; index < 200; index += 1) {
    const seed = `order-cycle-${index}`;
    if (JSON.stringify(pickCycleOrder(seed, 1)) !== JSON.stringify(pickCycleOrder(seed, 2))) {
      return seed;
    }
  }
  throw new Error('No deterministic seed found with different cycle orders.');
}

function findSeedWithRotatingSpotlights(): string {
  const size = { rows: 3, cols: 4 };
  for (let index = 0; index < 200; index += 1) {
    const seed = `spotlight-day-${index}`;
    const keys = [1, 2, 3].map((day) => {
      const slot = pickSpotlight(seed, day, size);
      return slot ? toSlotKey(slot) : 'null';
    });
    if (new Set(keys).size > 1) return seed;
  }
  throw new Error('No deterministic seed found with rotating spotlight slots.');
}
