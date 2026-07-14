import { describe, expect, it } from 'vitest';

import type { DeliveryOffer } from '../contracts';
import { loadCombos, loadItemTable, type ItemTable } from '../items';
import {
  LOOP_V2_ENV_VAR,
  WARM_OPENING_ENV_VAR,
  dailyShopCost,
  generateOffers,
  offerWeight,
  offerablePool,
} from './economy';
import { createRun, dispatch } from './engine';
import { hashString } from './rng';

import { withFlagWorld } from './testkit';

const deps = { table: loadItemTable(), combos: loadCombos() };

/** Overlay helper: named vars apply on top of the current world (undefined =
 *  force OFF via '0'); outermost calls in this file go through
 *  withPinnedWorld so graduated compiled defaults cannot leak in. */
function withEnv<T>(vars: Record<string, string | undefined>, run: () => T): T {
  const previous: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(vars)) {
    previous[key] = process.env[key];
    process.env[key] = value ?? '0';
  }
  try {
    return run();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

function withPinnedWorld<T>(vars: Record<string, string | undefined>, run: () => T): T {
  return withFlagWorld([], () => withEnv(vars, run));
}

function cheapOfferCount(offers: readonly DeliveryOffer[], ceiling = 4): number {
  return offers.filter((offer) => offer.cost <= ceiling).length;
}

function assertStandardOfferIds(offers: readonly DeliveryOffer[], day: number, salt: string): void {
  const saltHash = hashString(salt).toString(36);
  for (const [index, offer] of offers.entries()) {
    expect(offer.offerId).toBe(`restock-${day}-${index}-${offer.item.id}-${saltHash}`);
  }
}

function normalRestockOffers(
  seed: string,
  day: number,
  table: ItemTable,
  salt: string,
  supplierTag: string | null = null,
): DeliveryOffer[] {
  return withPinnedWorld({}, () =>
    generateOffers(seed, day, 'restock', table, salt, supplierTag, true),
  );
}

describe('warm opening offer guarantee', () => {
  it('keeps flag-off generation byte-identical across sample seeds', () => {
    withEnv({ [WARM_OPENING_ENV_VAR]: undefined }, () => {
      for (const day of [1, 2, 3]) {
        for (let index = 0; index < 20; index += 1) {
          const seed = `warm-off-${day}-${index}`;
          const salt = index % 2 === 0 ? '' : `reroll-${index}`;

          expect(generateOffers(seed, day, 'restock', deps.table, salt, null, true)).toEqual(
            normalRestockOffers(seed, day, deps.table, salt),
          );
        }
      }
    });
  });

  it('guarantees two cheap day-1 daily-shop offers without changing prices or offer-id shape', () =>
    withPinnedWorld({ [LOOP_V2_ENV_VAR]: '1', [WARM_OPENING_ENV_VAR]: '1' }, () => {
      const normal = normalRestockOffers('warm-test-0', 1, deps.table, '');
      const warmed = generateOffers('warm-test-0', 1, 'restock', deps.table, '', null, true);

      expect(cheapOfferCount(normal)).toBeLessThan(2);
      expect(cheapOfferCount(warmed)).toBeGreaterThanOrEqual(2);
      for (const offer of warmed) {
        expect(offer.cost).toBe(dailyShopCost(offer.item, 1));
      }
      assertStandardOfferIds(warmed, 1, '');
    }));

  it('guarantees two day-2 offers under the day-aware ceiling (Fable ruling: flat 4 was unsatisfiable on day 2)', () =>
    withPinnedWorld({ [LOOP_V2_ENV_VAR]: '1', [WARM_OPENING_ENV_VAR]: '1' }, () => {
      for (let index = 0; index < 10; index += 1) {
        const seed = `warm-day2-${index}`;
        const warmed = generateOffers(seed, 2, 'restock', deps.table, '', null, true);

        expect(cheapOfferCount(warmed, 10)).toBeGreaterThanOrEqual(2);
        for (const offer of warmed) {
          expect(offer.cost).toBe(dailyShopCost(offer.item, 2));
        }
        assertStandardOfferIds(warmed, 2, '');
      }
    }));

  it('is deterministic for same-seed opening shops and rerolls', () =>
    withPinnedWorld({ [LOOP_V2_ENV_VAR]: '1', [WARM_OPENING_ENV_VAR]: '1' }, () => {
      const first = generateOffers('warm-deterministic', 1, 'restock', deps.table, '', null, true);
      const second = generateOffers('warm-deterministic', 1, 'restock', deps.table, '', null, true);
      const rerollA = generateOffers(
        'warm-deterministic',
        1,
        'restock',
        deps.table,
        'reroll-salt',
        null,
        true,
      );
      const rerollB = generateOffers(
        'warm-deterministic',
        1,
        'restock',
        deps.table,
        'reroll-salt',
        null,
        true,
      );

      expect(second).toEqual(first);
      expect(rerollB).toEqual(rerollA);
      expect(cheapOfferCount(first)).toBeGreaterThanOrEqual(2);
      expect(cheapOfferCount(rerollA)).toBeGreaterThanOrEqual(2);
    }));

  it('leaves delivery and day-3 restock generation byte-identical when enabled', () =>
    withPinnedWorld({ [LOOP_V2_ENV_VAR]: '1', [WARM_OPENING_ENV_VAR]: '1' }, () => {
      const warmDelivery = generateOffers('warm-untouched', 1, 'delivery', deps.table, '', null, true);
      const warmDay3 = generateOffers('warm-untouched', 3, 'restock', deps.table, '', null, true);

      withEnv({ [WARM_OPENING_ENV_VAR]: undefined }, () => {
        expect(warmDelivery).toEqual(
          generateOffers('warm-untouched', 1, 'delivery', deps.table, '', null, true),
        );
        expect(warmDay3).toEqual(
          generateOffers('warm-untouched', 3, 'restock', deps.table, '', null, true),
        );
      });
    }));

  it('degrades gracefully when the weighted pool has fewer than two cheap day-1 items', () =>
    withPinnedWorld({ [LOOP_V2_ENV_VAR]: '1', [WARM_OPENING_ENV_VAR]: '1' }, () => {
      const cheapIds = offerablePool(deps.table)
        .filter(
          (definition) =>
            offerWeight(definition, 1, null) > 0 && dailyShopCost(definition, 1) <= 4,
        )
        .map((definition) => definition.id);
      const [keptCheapId] = cheapIds;
      if (!keptCheapId) throw new Error('Expected at least one cheap item in the real table.');

      const filtered = new Map(
        [...deps.table.entries()].filter(
          ([itemId]) => itemId === keptCheapId || !cheapIds.includes(itemId),
        ),
      );

      const offers = generateOffers('warm-degenerate-pool', 1, 'restock', filtered, '', null, true);

      expect(offers).toHaveLength(4);
      expect(cheapOfferCount(offers)).toBeLessThanOrEqual(1);
      assertStandardOfferIds(offers, 1, '');
    }));

  it('keeps day-1 buyout plus reroll guaranteed and duplicate-id safe', () =>
    withPinnedWorld({ [LOOP_V2_ENV_VAR]: '1', [WARM_OPENING_ENV_VAR]: '1' }, () => {
      let state = createRun('warm-buyout-reroll', deps);
      state = dispatch(state, { type: 'draftItem', offerIndex: 0 }, deps);
      state = dispatch(state, { type: 'placeItem', slot: { row: 0, col: 0 } }, deps);
      state.coins = 500;

      expect(state.phase).toBe('restock');
      expect(cheapOfferCount(state.currentOffers)).toBeGreaterThanOrEqual(2);

      const seenOfferIds = new Set(state.currentOffers.map((offer) => offer.offerId));
      const boughtInstanceIds = new Set<string>();
      const slots = state.shelf.slots
        .filter((entry) => entry.item === null)
        .map((entry) => entry.slot);

      for (let cycle = 0; cycle < 2; cycle += 1) {
        while (state.currentOffers.length > 0) {
          state = dispatch(state, { type: 'buyOffer', offerIndex: 0 }, deps);
          boughtInstanceIds.add(state.heldItem!.instanceId);
          const slot = slots.shift();
          if (!slot) throw new Error('Expected enough slots for warm buyout regression.');
          state = dispatch(state, { type: 'placeItem', slot }, deps);
        }

        state = dispatch(state, { type: 'reroll' }, deps);
        expect(cheapOfferCount(state.currentOffers)).toBeGreaterThanOrEqual(2);
        for (const offer of state.currentOffers) {
          expect(seenOfferIds.has(offer.offerId)).toBe(false);
          expect(boughtInstanceIds.has(`${offer.offerId}-inst`)).toBe(false);
          seenOfferIds.add(offer.offerId);
        }
      }

      const placed = state.shelf.slots
        .map((entry) => entry.item?.instanceId)
        .filter((id): id is string => Boolean(id));
      expect(new Set(placed).size).toBe(placed.length);
    }));
});
