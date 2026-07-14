import { describe, expect, it } from 'vitest';

import { loadCombos, loadItemTable } from '../items';
import { EngineError, createRun, dispatch } from './engine';
import { makeState, withFlagWorld } from './testkit';

const deps = { table: loadItemTable(), combos: loadCombos() };

describe('dispatcher', () => {
  // The first three tests pin all depth flags OFF: they document the FROZEN v1
  // opening flow, which must survive default flips byte-identically.
  it('runs delivery → arrange → openShop and advances the day', () =>
    withFlagWorld([], () => {
    let state = createRun('engine-test', deps);
    expect(state.phase).toBe('delivery');
    expect(state.currentOffers.length).toBeGreaterThan(0);

    state = dispatch(state, { type: 'draftItem', offerIndex: 0 }, deps);
    expect(state.phase).toBe('arrange');
    expect(state.heldItem).not.toBeNull();

    state = dispatch(state, { type: 'placeItem', slot: { row: 0, col: 0 } }, deps);
    expect(state.heldItem).toBeNull();

    state = dispatch(state, { type: 'openShop' }, deps);
    expect(state.day).toBe(2);
    expect(state.lastScoringTrace).not.toBeNull();
    expect(state.rent.dueInDays).toBe(2);
  }));

  it('does not mutate the input state', () =>
    withFlagWorld([], () => {
    const state = createRun('engine-pure', deps);
    const snapshot = JSON.stringify(state);
    dispatch(state, { type: 'draftItem', offerIndex: 0 }, deps);
    expect(JSON.stringify(state)).toBe(snapshot);
  }));

  it('rejects opening the shop while holding an item', () =>
    withFlagWorld([], () => {
    let state = createRun('engine-held', deps);
    state = dispatch(state, { type: 'draftItem', offerIndex: 0 }, deps);
    expect(() => dispatch(state, { type: 'openShop' }, deps)).toThrow(EngineError);
  }));

  it('ends the run when rent cannot be paid', () => {
    // Empty shelf earns nothing; rent 25 lands after day 3.
    const state = makeState([], {
      phase: 'arrange',
      day: 3,
      coins: 0,
      rent: { amount: 25, dueInDays: 1, cycle: 1 },
    });
    const after = dispatch(state, { type: 'openShop' }, deps);
    expect(after.phase).toBe('gameOver');
  });

  it('pays rent, raises it 44%, and enters restock after day 3', () => {
    const state = makeState([{ slot: { row: 0, col: 0 }, itemId: 'wine-bottle' }], {
      phase: 'arrange',
      day: 3,
      coins: 30,
      rent: { amount: 25, dueInDays: 1, cycle: 1 },
    });
    const after = dispatch(state, { type: 'openShop' }, deps);
    expect(after.phase).toBe('restock');
    expect(after.coins).toBe(30 + 4 - 25);
    expect(after.rent).toEqual({ amount: 36, dueInDays: 3, cycle: 2 });
    expect(after.moves.paidMoveCost).toBe(3);
    expect(after.runStats.deepestRentSurvived).toBe(1);
  });

  it('charges coins for moves beyond the free allowance and blocks sticky items', () => {
    const state = makeState(
      [
        { slot: { row: 0, col: 0 }, itemId: 'wine-bottle' },
        { slot: { row: 0, col: 1 }, itemId: 'cheese-wheel', state: { sticky: true } },
      ],
      { phase: 'arrange', coins: 10, moves: { freeRemaining: 0, paidMoveCost: 2 } },
    );

    expect(() =>
      dispatch(state, { type: 'moveItem', from: { row: 0, col: 1 }, to: { row: 2, col: 3 } }, deps),
    ).toThrow('Sticky');

    const after = dispatch(
      state,
      { type: 'moveItem', from: { row: 0, col: 0 }, to: { row: 2, col: 3 } },
      deps,
    );
    expect(after.coins).toBe(8);
  });

  it('ages cheese at rollover unless an Ice Box preserves it', () => {
    const aging = makeState(
      [
        { slot: { row: 0, col: 0 }, itemId: 'cheese-wheel' },
        { slot: { row: 2, col: 3 }, itemId: 'cheese-wheel' },
        { slot: { row: 0, col: 1 }, itemId: 'ice-box' },
      ],
      { phase: 'arrange', coins: 100 },
    );
    const after = dispatch(aging, { type: 'openShop' }, deps);
    const at = (row: number, col: number) =>
      after.shelf.slots.find((entry) => entry.slot.row === row && entry.slot.col === col)?.item;
    expect(at(0, 0)?.baseValue).toBe(3); // preserved by adjacent ice box
    expect(at(2, 3)?.baseValue).toBe(4); // aged +1
  });

  it('emits a real vanish trace when Coupon Stack countdown reaches zero', () => {
    const couponDay = makeState(
      [
        { slot: { row: 0, col: 0 }, itemId: 'coupon-stack', state: { countdown: 0 } },
        { slot: { row: 0, col: 1 }, itemId: 'cheese-wheel' },
      ],
      { phase: 'arrange', coins: 100 },
    );

    const after = dispatch(couponDay, { type: 'openShop' }, deps);
    const vanish = after.lastScoringTrace?.events.find((event) => event.kind === 'vanish');
    const couponSlot = after.shelf.slots.find((entry) => entry.slot.row === 0 && entry.slot.col === 0);

    expect(vanish).toEqual({
      kind: 'vanish',
      slot: { row: 0, col: 0 },
      itemId: 'coupon-stack',
    });
    expect(couponSlot?.item).toBeNull();
  });

  it('reroll deterministically changes restock offers for the same state', () => {
    const state = makeState([], {
      phase: 'restock',
      coins: 50,
      currentOffers: [],
      day: 4,
    });
    const withOffers = {
      ...state,
      currentOffers: dispatch(
        makeState([{ slot: { row: 0, col: 0 }, itemId: 'wine-bottle' }], {
          phase: 'arrange',
          day: 3,
          coins: 30,
          rent: { amount: 25, dueInDays: 1, cycle: 1 },
        }),
        { type: 'openShop' },
        deps,
      ).currentOffers,
    };
    const rerollA = dispatch(withOffers, { type: 'reroll' }, deps);
    const rerollB = dispatch(withOffers, { type: 'reroll' }, deps);
    expect(rerollA.currentOffers).toEqual(rerollB.currentOffers);
    expect(rerollA.currentOffers.map((offer) => offer.offerId)).not.toEqual(
      withOffers.currentOffers.map((offer) => offer.offerId),
    );
  });

  it('buys, places, rerolls, and ends a real restock phase', () => {
    const restock = dispatch(
      makeState([{ slot: { row: 0, col: 0 }, itemId: 'wine-bottle' }], {
        phase: 'arrange',
        day: 3,
        coins: 100,
        rent: { amount: 25, dueInDays: 1, cycle: 1 },
      }),
      { type: 'openShop' },
      deps,
    );
    const boughtOffer = restock.currentOffers[0];
    if (!boughtOffer) throw new Error('Expected restock offer.');

    const afterBuy = dispatch(restock, { type: 'buyOffer', offerIndex: 0 }, deps);
    expect(afterBuy.phase).toBe('restock');
    expect(afterBuy.heldItem?.itemId).toBe(boughtOffer.item.id);
    expect(afterBuy.coins).toBe(restock.coins - boughtOffer.cost);
    expect(afterBuy.currentOffers).toHaveLength(restock.currentOffers.length - 1);

    const afterPlace = dispatch(afterBuy, { type: 'placeItem', slot: { row: 0, col: 1 } }, deps);
    expect(afterPlace.heldItem).toBeNull();
    expect(afterPlace.shelf.slots.find((entry) => entry.slot.row === 0 && entry.slot.col === 1)?.item?.itemId)
      .toBe(boughtOffer.item.id);

    const afterReroll = dispatch(afterPlace, { type: 'reroll' }, deps);
    expect(afterReroll.currentOffers.map((offer) => offer.offerId)).not.toEqual(
      afterPlace.currentOffers.map((offer) => offer.offerId),
    );

    const afterEnd = dispatch(afterReroll, { type: 'endRestock' }, deps);
    expect(afterEnd.phase).toBe('delivery');
    expect(afterEnd.currentOffers).toHaveLength(3);
  });
});
