import { describe, expect, it } from 'vitest';

import type { ScoringTrace, Slot, TraceEvent } from '../contracts';
import { toSlotKey } from '../contracts';
import { isSignatureItem, loadCombos, loadItemTable } from '../items';

import {
  LOOP_V2_ENV_VAR,
  SIGNATURE_ITEMS_ENV_VAR,
  dailyShopCost,
  generateOffers,
  offerablePool,
} from './economy';
import { playRun } from './bots';
import { hashState } from './hash';
import { resolveOpenShop } from './scoring';
import { makeState, type PlacedItem } from './testkit';

const table = loadItemTable();
const combos = loadCombos();

function withSignatureItems<T>(enabled: boolean, run: () => T): T {
  const previous = process.env[SIGNATURE_ITEMS_ENV_VAR];
  if (enabled) process.env[SIGNATURE_ITEMS_ENV_VAR] = '1';
  else delete process.env[SIGNATURE_ITEMS_ENV_VAR];
  try {
    return run();
  } finally {
    if (previous === undefined) delete process.env[SIGNATURE_ITEMS_ENV_VAR];
    else process.env[SIGNATURE_ITEMS_ENV_VAR] = previous;
  }
}

function withLoopV2<T>(enabled: boolean, run: () => T): T {
  const previous = process.env[LOOP_V2_ENV_VAR];
  if (enabled) process.env[LOOP_V2_ENV_VAR] = '1';
  else delete process.env[LOOP_V2_ENV_VAR];
  try {
    return run();
  } finally {
    if (previous === undefined) delete process.env[LOOP_V2_ENV_VAR];
    else process.env[LOOP_V2_ENV_VAR] = previous;
  }
}

function lastItemTotal(trace: ScoringTrace, slot: Slot): number {
  const total = [...trace.events]
    .reverse()
    .find((event) => event.kind === 'itemTotal' && toSlotKey(event.slot) === toSlotKey(slot));
  if (!total || total.kind !== 'itemTotal') {
    throw new Error(`No itemTotal for ${toSlotKey(slot)}.`);
  }
  return total.total;
}

function ruleFires(trace: ScoringTrace, ruleId: string): TraceEvent[] {
  return trace.events.filter((event) => event.kind === 'ruleFire' && event.ruleId === ruleId);
}

function scoreWithSignatures(placed: readonly PlacedItem[]) {
  return withSignatureItems(true, () => resolveOpenShop(makeState(placed), table, combos));
}

describe('signature stock', () => {
  it('keeps signature items out of offers and scoring when the flag is off', () =>
    withSignatureItems(false, () => {
      expect(offerablePool(table).some(isSignatureItem)).toBe(false);
      const offers = generateOffers('signature-off', 12, 'restock', table, '');
      expect(offers.some((offer) => isSignatureItem(offer.item))).toBe(false);

      const foodSlot = { row: 0, col: 1 };
      const result = resolveOpenShop(
        makeState([
          { slot: { row: 0, col: 0 }, itemId: 'brass-scale' },
          { slot: foodSlot, itemId: 'cheese-wheel' },
        ]),
        table,
        combos,
      );

      expect(lastItemTotal(result.trace, foodSlot)).toBe(3);
      expect(ruleFires(result.trace, 'brass-scale-food-balance')).toHaveLength(0);
      expect(result.dayTotal).toBe(4);
    }));

  it('allows rare deterministic paid-shop signature offers when the flag is on', () =>
    withSignatureItems(true, () => {
      withLoopV2(true, () => {
        expect(offerablePool(table).some(isSignatureItem)).toBe(true);

        let seed = '';
        let offers = [] as ReturnType<typeof generateOffers>;
        for (let index = 0; index < 500 && offers.every((offer) => !isSignatureItem(offer.item)); index += 1) {
          seed = `signature-offer-${index}`;
          offers = generateOffers(seed, 10, 'restock', table, '');
        }

        const signatureOffer = offers.find((offer) => isSignatureItem(offer.item));
        expect(signatureOffer).toBeDefined();
        expect(generateOffers(seed, 10, 'restock', table, '')).toEqual(offers);
        expect(signatureOffer?.cost).toBe(dailyShopCost(signatureOffer!.item, 10));
        expect(signatureOffer?.cost).toBeGreaterThan(20);
        expect(generateOffers(seed, 10, 'delivery', table, '').some((offer) => isSignatureItem(offer.item)))
          .toBe(false);
      });
    }));

  it('keeps signature-enabled runs deterministic for the same seed', () =>
    withSignatureItems(true, () =>
      withLoopV2(true, () => {
        const deps = { table, combos };
        const first = playRun('signature-determinism', 'greedy', deps, 160);
        const second = playRun('signature-determinism', 'greedy', deps, 160);

        expect(second.actions).toEqual(first.actions);
        expect(hashState(second.finalState)).toBe(hashState(first.finalState));
      }),
    ));

  it('Brass Scale multiplies every food item and no-ops without food', () => {
    const foodSlot = { row: 0, col: 1 };
    const nonFoodSlot = { row: 2, col: 3 };
    const result = scoreWithSignatures([
      { slot: { row: 0, col: 0 }, itemId: 'brass-scale' },
      { slot: foodSlot, itemId: 'cheese-wheel' },
      { slot: nonFoodSlot, itemId: 'wine-bottle' },
    ]);

    expect(lastItemTotal(result.trace, foodSlot)).toBe(4);
    expect(lastItemTotal(result.trace, nonFoodSlot)).toBe(4);
    expect(ruleFires(result.trace, 'brass-scale-food-balance')).toContainEqual({
      kind: 'ruleFire',
      sourceSlot: { row: 0, col: 0 },
      targetSlot: foodSlot,
      ruleId: 'brass-scale-food-balance',
      delta: { mult: 1.5 },
      runningTotal: 4,
    });

    const noFood = scoreWithSignatures([
      { slot: { row: 0, col: 0 }, itemId: 'brass-scale' },
      { slot: { row: 0, col: 1 }, itemId: 'wine-bottle' },
    ]);
    expect(ruleFires(noFood.trace, 'brass-scale-food-balance')).toHaveLength(0);
  });

  it('Ledger Book adds coins per antique and no-ops without antiques', () => {
    const ledgerSlot = { row: 0, col: 0 };
    const result = scoreWithSignatures([
      { slot: ledgerSlot, itemId: 'ledger-book' },
      { slot: { row: 0, col: 2 }, itemId: 'antique-clock' },
      { slot: { row: 1, col: 3 }, itemId: 'vintage-radio' },
    ]);

    expect(lastItemTotal(result.trace, ledgerSlot)).toBe(11);
    expect(ruleFires(result.trace, 'ledger-book-antique-tally')).toContainEqual({
      kind: 'ruleFire',
      sourceSlot: ledgerSlot,
      targetSlot: ledgerSlot,
      ruleId: 'ledger-book-antique-tally',
      delta: { flat: 10 },
      runningTotal: 11,
    });

    const noAntiques = scoreWithSignatures([{ slot: ledgerSlot, itemId: 'ledger-book' }]);
    expect(lastItemTotal(noAntiques.trace, ledgerSlot)).toBe(1);
    expect(ruleFires(noAntiques.trace, 'ledger-book-antique-tally')).toHaveLength(0);
  });

  it('Lucky Cat copies the highest-scoring other item and no-ops alone', () => {
    const catSlot = { row: 0, col: 0 };
    const bestSlot = { row: 0, col: 1 };
    const result = scoreWithSignatures([
      { slot: catSlot, itemId: 'lucky-cat' },
      { slot: bestSlot, itemId: 'wine-bottle' },
      { slot: { row: 1, col: 0 }, itemId: 'cheese-wheel' },
    ]);

    expect(lastItemTotal(result.trace, catSlot)).toBe(4);
    expect(ruleFires(result.trace, 'lucky-cat-best-in-shop')).toContainEqual({
      kind: 'ruleFire',
      sourceSlot: bestSlot,
      targetSlot: catSlot,
      ruleId: 'lucky-cat-best-in-shop',
      delta: { flat: 4 },
      runningTotal: 4,
    });

    const alone = scoreWithSignatures([{ slot: catSlot, itemId: 'lucky-cat' }]);
    expect(lastItemTotal(alone.trace, catSlot)).toBe(0);
    expect(ruleFires(alone.trace, 'lucky-cat-best-in-shop')).toHaveLength(0);
  });

  it('Consignment Sign multiplies the shelf when an archetype count is met', () => {
    const signSlot = { row: 0, col: 0 };
    const foodSlots = [
      { row: 0, col: 1 },
      { row: 0, col: 3 },
      { row: 1, col: 2 },
      { row: 2, col: 0 },
    ];
    const result = scoreWithSignatures([
      { slot: signSlot, itemId: 'consignment-sign' },
      { slot: foodSlots[0]!, itemId: 'cheese-wheel' },
      { slot: foodSlots[1]!, itemId: 'honey-jar' },
      { slot: foodSlots[2]!, itemId: 'bread-loaf' },
      { slot: foodSlots[3]!, itemId: 'apple-basket' },
    ]);

    expect(lastItemTotal(result.trace, signSlot)).toBe(4);
    expect(lastItemTotal(result.trace, foodSlots[0]!)).toBe(6);
    expect(ruleFires(result.trace, 'consignment-sign-archetype-sale')).toHaveLength(5);

    const short = scoreWithSignatures([
      { slot: signSlot, itemId: 'consignment-sign' },
      { slot: foodSlots[0]!, itemId: 'cheese-wheel' },
      { slot: foodSlots[1]!, itemId: 'honey-jar' },
      { slot: foodSlots[2]!, itemId: 'bread-loaf' },
    ]);
    expect(ruleFires(short.trace, 'consignment-sign-archetype-sale')).toHaveLength(0);
  });

  it('Window Display doubles the highest-base item and no-ops alone', () => {
    const displaySlot = { row: 0, col: 0 };
    const targetSlot = { row: 1, col: 1 };
    const result = scoreWithSignatures([
      { slot: displaySlot, itemId: 'window-display' },
      { slot: { row: 0, col: 3 }, itemId: 'antique-clock' },
      { slot: targetSlot, itemId: 'antique-register' },
    ]);

    expect(lastItemTotal(result.trace, targetSlot)).toBe(21);
    expect(ruleFires(result.trace, 'window-display-hero-piece')).toContainEqual({
      kind: 'ruleFire',
      sourceSlot: displaySlot,
      targetSlot,
      ruleId: 'window-display-hero-piece',
      delta: { mult: 3 },
      runningTotal: 21,
    });

    const alone = scoreWithSignatures([{ slot: displaySlot, itemId: 'window-display' }]);
    expect(lastItemTotal(alone.trace, displaySlot)).toBe(0);
    expect(ruleFires(alone.trace, 'window-display-hero-piece')).toHaveLength(0);
  });
});
