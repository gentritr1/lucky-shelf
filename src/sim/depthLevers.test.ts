import { describe, expect, it } from 'vitest';

import type { ScoringTrace, Slot } from '../contracts';
import { toSlotKey } from '../contracts';
import { loadCombos, loadItemTable } from '../items';

import {
  DEMAND_COUNT,
  DEMAND_MULT,
  SPOTLIGHT_MULT,
} from './economy';
import { dispatch, pickCycleOrder, pickSpotlight } from './engine';
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
