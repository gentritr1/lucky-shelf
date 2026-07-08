import { describe, expect, it } from 'vitest';

import type { TraceEvent } from '../contracts';
import { loadCombos, loadItemTable } from '../items';
import { resolveOpenShop } from './scoring';
import { makeState } from './testkit';

const table = loadItemTable();
const combos = loadCombos();

function eventsOf(kind: TraceEvent['kind'], events: readonly TraceEvent[]): TraceEvent[] {
  return events.filter((event) => event.kind === kind);
}

function totalAt(events: readonly TraceEvent[], row: number, col: number): number {
  const event = events.find(
    (candidate) =>
      candidate.kind === 'itemTotal' && candidate.slot.row === row && candidate.slot.col === col,
  );
  if (!event || event.kind !== 'itemTotal') {
    throw new Error(`No itemTotal for ${row},${col}`);
  }
  return event.total;
}

describe('rule primitives', () => {
  it('auraColumn: Price Gun adds +2 to other items in its column, not itself', () => {
    const state = makeState([
      { slot: { row: 0, col: 0 }, itemId: 'price-gun' },
      { slot: { row: 1, col: 0 }, itemId: 'wine-bottle' },
      { slot: { row: 2, col: 0 }, itemId: 'fishbowl' },
    ]);
    const { trace } = resolveOpenShop(state, table, combos);
    expect(totalAt(trace.events, 0, 0)).toBe(1); // gun keeps its own base only (R-1)
    expect(totalAt(trace.events, 1, 0)).toBe(6); // wine 4 + 2
    // fishbowl 3 + 2, no loner bonus (wine adjacent)
    expect(totalAt(trace.events, 2, 0)).toBe(5);
    const fires = eventsOf('ruleFire', trace.events);
    expect(fires.filter((f) => f.kind === 'ruleFire' && f.ruleId === 'price-gun-column-flat')).toHaveLength(2);
  });

  it('lonerBonus: Fishbowl gains +6 only when isolated', () => {
    const alone = makeState([{ slot: { row: 1, col: 1 }, itemId: 'fishbowl' }]);
    const { trace } = resolveOpenShop(alone, table, combos);
    expect(totalAt(trace.events, 1, 1)).toBe(9);

    const crowded = makeState([
      { slot: { row: 1, col: 1 }, itemId: 'fishbowl' },
      { slot: { row: 1, col: 2 }, itemId: 'wine-bottle' },
    ]);
    const crowdedTrace = resolveOpenShop(crowded, table, combos).trace;
    expect(totalAt(crowdedTrace.events, 1, 1)).toBe(3);
  });

  it('multIfAdjacentMinTotal: Clock doubles when every scored neighbor is rich', () => {
    const state = makeState([
      { slot: { row: 0, col: 0 }, itemId: 'antique-clock' },
      { slot: { row: 0, col: 1 }, itemId: 'wine-bottle', baseValue: 7 },
    ]);
    const { trace } = resolveOpenShop(state, table, combos);
    expect(totalAt(trace.events, 0, 0)).toBe(12); // 6 x2, neighbor scored 7 >= 5
    // Clock resolves after the wine despite being first in row-major order.
    const totals = eventsOf('itemTotal', trace.events);
    expect(totals[0]?.kind === 'itemTotal' && totals[0].slot.col).toBe(1);
  });

  it('multIfAdjacentMinTotal: no double with no scored neighbors at all', () => {
    const state = makeState([{ slot: { row: 0, col: 0 }, itemId: 'antique-clock' }]);
    const { trace } = resolveOpenShop(state, table, combos);
    expect(totalAt(trace.events, 0, 0)).toBe(6);
  });

  it('echoLeftmostInRow: Radio doubles the leftmost item in its row', () => {
    const state = makeState([
      { slot: { row: 1, col: 0 }, itemId: 'wine-bottle' },
      { slot: { row: 1, col: 3 }, itemId: 'vintage-radio' },
    ]);
    const { trace } = resolveOpenShop(state, table, combos);
    expect(totalAt(trace.events, 1, 0)).toBe(8); // wine 4 x2
    expect(totalAt(trace.events, 1, 3)).toBe(5); // radio unchanged
  });

  it('echoLeftmostInRow: no self-double when the Radio itself is leftmost (R-12)', () => {
    const state = makeState([
      { slot: { row: 1, col: 0 }, itemId: 'vintage-radio' },
      { slot: { row: 1, col: 1 }, itemId: 'wine-bottle' },
    ]);
    const { trace } = resolveOpenShop(state, table, combos);
    expect(totalAt(trace.events, 1, 0)).toBe(5); // radio does not fire
    expect(totalAt(trace.events, 1, 1)).toBe(4); // wine untouched
  });

  it('grantsAdjacent with target: Ice Box preserves and multiplies perishables only', () => {
    const state = makeState([
      { slot: { row: 0, col: 0 }, itemId: 'ice-box' },
      { slot: { row: 0, col: 1 }, itemId: 'cheese-wheel' },
      { slot: { row: 1, col: 0 }, itemId: 'wine-bottle' },
    ]);
    const { trace } = resolveOpenShop(state, table, combos);
    expect(totalAt(trace.events, 0, 1)).toBe(4); // floor(3 x 1.5)
    expect(totalAt(trace.events, 1, 0)).toBe(4); // wine not perishable, untouched
  });

  it('countdownVanish: Coupon at zero grants +5 to neighbors and vanishes', () => {
    const state = makeState([
      { slot: { row: 0, col: 0 }, itemId: 'coupon-stack', baseValue: 0, state: { countdown: 0 } },
      { slot: { row: 0, col: 1 }, itemId: 'wine-bottle' },
    ]);
    const result = resolveOpenShop(state, table, combos);
    expect(totalAt(result.trace.events, 0, 1)).toBe(9); // wine 4 + 5
    const vanish = eventsOf('vanish', result.trace.events);
    expect(vanish).toHaveLength(1);
    const slotAfter = result.shelfAfter.slots.find(
      (entry) => entry.slot.row === 0 && entry.slot.col === 0,
    );
    expect(slotAfter?.item).toBeNull();
  });

  it('countdownVanish: Coupon above zero neither grants nor vanishes', () => {
    const state = makeState([
      { slot: { row: 0, col: 0 }, itemId: 'coupon-stack', state: { countdown: 1 } },
      { slot: { row: 0, col: 1 }, itemId: 'wine-bottle' },
    ]);
    const result = resolveOpenShop(state, table, combos);
    expect(totalAt(result.trace.events, 0, 1)).toBe(4);
    expect(eventsOf('vanish', result.trace.events)).toHaveLength(0);
  });

  it('copiesNeighbor pointing off-shelf copies zero without an invalid trace slot', () => {
    const state = makeState([{ slot: { row: 0, col: 0 }, itemId: 'mirror' }]);
    const { trace } = resolveOpenShop(state, table, combos);
    expect(totalAt(trace.events, 0, 0)).toBe(0);
    expect(
      eventsOf('ruleFire', trace.events).filter(
        (event) => event.kind === 'ruleFire' && event.ruleId === 'mirror-copy-left',
      ),
    ).toHaveLength(0);
  });

  it('copiesNeighbor pointing at an empty on-shelf slot copies zero with a valid target', () => {
    const state = makeState([{ slot: { row: 0, col: 1 }, itemId: 'mirror' }]);
    const { trace } = resolveOpenShop(state, table, combos);
    expect(totalAt(trace.events, 0, 1)).toBe(0);
    expect(
      eventsOf('ruleFire', trace.events).find(
        (event) => event.kind === 'ruleFire' && event.ruleId === 'mirror-copy-left',
      ),
    ).toMatchObject({ targetSlot: { row: 0, col: 0 }, delta: { flat: 0 } });
  });

  it('grantsAdjacent sticky lands in shelfAfter, not the pre-scoring state (R-5)', () => {
    const state = makeState([
      { slot: { row: 0, col: 0 }, itemId: 'honey-jar' },
      { slot: { row: 0, col: 1 }, itemId: 'wine-bottle' },
    ]);
    const result = resolveOpenShop(state, table, combos);
    const wineAfter = result.shelfAfter.slots.find(
      (entry) => entry.slot.row === 0 && entry.slot.col === 1,
    );
    expect(wineAfter?.item?.state.sticky).toBe(true);
    expect(totalAt(result.trace.events, 0, 1)).toBe(8); // 4 + 4
  });

  it('growsEachDay: no eligible neighbors means no transform event (R-4)', () => {
    const state = makeState([
      { slot: { row: 0, col: 0 }, itemId: 'lucky-bamboo', state: { growthDays: 3 } },
      { slot: { row: 0, col: 1 }, itemId: 'mirror' }, // mirror has no upgrade path
    ]);
    const { trace } = resolveOpenShop(state, table, combos);
    expect(eventsOf('transform', trace.events)).toHaveLength(0);
  });

  it('empty shelf still emits a terminal dayTotal of zero', () => {
    const { trace } = resolveOpenShop(makeState([]), table, combos);
    expect(trace.events).toEqual([{ kind: 'dayTotal', coins: 0 }]);
  });
});
