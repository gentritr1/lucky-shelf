import { describe, expect, it } from 'vitest';

import { GameStateSchema, type GameState, type TraceEvent } from '../contracts';
import { loadCombos, loadItemTable } from '../items';

import {
  BUILD_STEERING_ENV_VAR,
  DAY2_STARTER_ENV_VAR,
  GOAL_LADDER_ENV_VAR,
  LOOP_V2_ENV_VAR,
  dailyGoalTarget,
  generateOffers,
} from './economy';
import { EngineError, createRun, dispatch, legalActions } from './engine';
import { hashState } from './hash';
import { makeState, withFlagWorld, type PlacedItem } from './testkit';
import { uiAffordances } from './uiAffordances';

const deps = { table: loadItemTable(), combos: loadCombos() };

/** Overlay helper: named vars apply on top of a fully pinned-OFF flag world
 *  (undefined = force OFF via '0'); nested calls only touch their named keys. */
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

function openDay1(seed: string): GameState {
  let state = createRun(seed, deps);
  state = dispatch(state, { type: 'draftItem', offerIndex: 0 }, deps);
  state = dispatch(state, { type: 'placeItem', slot: { row: 0, col: 0 } }, deps);
  state = dispatch(state, { type: 'endRestock' }, deps);
  return dispatch(state, { type: 'openShop' }, deps);
}

function placeDay2Starter(seed: string, offerIndex = 0): GameState {
  let state = openDay1(seed);
  state = dispatch(state, { type: 'draftItem', offerIndex }, deps);
  return dispatch(state, { type: 'placeItem', slot: { row: 0, col: 1 } }, deps);
}

function dayTotal(state: GameState): number {
  const event = state.lastScoringTrace?.events.at(-1) as TraceEvent | undefined;
  if (event?.kind !== 'dayTotal') throw new Error('Expected a dayTotal event.');
  return event.coins;
}

function fullShelfItems(): PlacedItem[] {
  return Array.from({ length: 12 }, (_, index) => ({
    slot: { row: Math.floor(index / 4), col: index % 4 },
    itemId: 'wine-bottle',
    baseValue: 4,
  }));
}

describe('A-M6c day-2 starter delivery', () => {
  it('keeps the flag-off loop-v2 day-1 rollover on the existing daily-shop path', () =>
    withPinnedWorld({ [LOOP_V2_ENV_VAR]: '1' }, () => {
      for (let index = 0; index < 8; index += 1) {
        const seed = `day2-starter-off-${index}`;
        const state = openDay1(seed);

        expect(state.day).toBe(2);
        expect(state.phase).toBe('restock');
        expect(state.currentOffers).toEqual(
          generateOffers(seed, 2, 'restock', deps.table, '', null, true),
        );
        expect(hashState(openDay1(seed))).toBe(hashState(state));
      }
    }));

  it('routes day 2 through a deterministic free delivery and then the old day-2 shop', () =>
    withPinnedWorld({ [LOOP_V2_ENV_VAR]: '1', [DAY2_STARTER_ENV_VAR]: '1' }, () => {
      const seed = 'day2-starter-flow';
      const oldDirectShop = withEnv({ [DAY2_STARTER_ENV_VAR]: undefined }, () => openDay1(seed));
      let state = openDay1(seed);

      expect(state.day).toBe(2);
      expect(state.phase).toBe('delivery');
      expect(state.runStats.daysSurvived).toBe(1);
      expect(state.currentOffers).toEqual(
        generateOffers(seed, 2, 'delivery', deps.table, '', null, true),
      );
      expect(state.currentOffers).toEqual(openDay1(seed).currentOffers);
      expect(state.currentOffers).toHaveLength(3);
      expect(state.currentOffers.every((offer) => offer.cost === 0)).toBe(true);
      expect(state.currentOffers.every((offer) => offer.offerId.startsWith('delivery-2-'))).toBe(
        true,
      );

      state = dispatch(state, { type: 'draftItem', offerIndex: 1 }, deps);
      state = dispatch(state, { type: 'placeItem', slot: { row: 0, col: 1 } }, deps);

      expect(state.phase).toBe('restock');
      expect(state.day).toBe(2);
      expect(state.currentOffers).toEqual(oldDirectShop.currentOffers);
      expect(state.currentOffers.every((offer) => offer.cost > 0)).toBe(true);
      expect(GameStateSchema.parse(JSON.parse(JSON.stringify(state)) as unknown)).toEqual(state);
    }));

  it('keeps supplier choice day-1-only during the day-2 delivery', () =>
    withPinnedWorld(
      {
        [LOOP_V2_ENV_VAR]: '1',
        [DAY2_STARTER_ENV_VAR]: '1',
        [BUILD_STEERING_ENV_VAR]: '1',
      },
      () => {
        let state = createRun('day2-starter-supplier', deps);
        state = dispatch(state, { type: 'chooseSupplier', tag: 'food' }, deps);
        state = dispatch(state, { type: 'draftItem', offerIndex: 0 }, deps);
        state = dispatch(state, { type: 'placeItem', slot: { row: 0, col: 0 } }, deps);
        state = dispatch(state, { type: 'endRestock' }, deps);
        state = dispatch(state, { type: 'openShop' }, deps);

        expect(state.phase).toBe('delivery');
        expect(state.day).toBe(2);
        expect(legalActions(state, deps).some((action) => action.type === 'chooseSupplier')).toBe(
          false,
        );
        expect(uiAffordances(state).some((action) => action.type === 'chooseSupplier')).toBe(false);
        expect(() => dispatch(state, { type: 'chooseSupplier', tag: 'lucky' }, deps)).toThrow(
          EngineError,
        );

        const missingSupplier = { ...state, supplierTag: null };
        expect(
          legalActions(missingSupplier, deps).some((action) => action.type === 'chooseSupplier'),
        ).toBe(false);
        expect(
          uiAffordances(missingSupplier).some((action) => action.type === 'chooseSupplier'),
        ).toBe(false);
        expect(() =>
          dispatch(missingSupplier, { type: 'chooseSupplier', tag: 'lucky' }, deps),
        ).toThrow(EngineError);
      },
    ));

  it('does not dead-end if a synthetic day-2 delivery starts with a full shelf', () =>
    withPinnedWorld({ [LOOP_V2_ENV_VAR]: '1', [DAY2_STARTER_ENV_VAR]: '1' }, () => {
      const state = makeState(fullShelfItems(), {
        phase: 'delivery',
        day: 2,
        loopV2: true,
        currentOffers: generateOffers('day2-full-shelf', 2, 'delivery', deps.table, '', null, true),
        runStats: {
          totalCoinsEarned: 20,
          deepestRentSurvived: 0,
          daysSurvived: 1,
          bestDayTotal: 20,
          bestComboIds: [],
        },
      });

      let drafted = dispatch(state, { type: 'draftItem', offerIndex: 0 }, deps);
      expect(drafted.phase).toBe('arrange');
      expect(drafted.heldItem).not.toBeNull();
      expect(uiAffordances(drafted).every((action) => action.type === 'sellItem')).toBe(true);

      drafted = dispatch(drafted, { type: 'sellItem', slot: { row: 0, col: 0 } }, deps);
      const placed = dispatch(drafted, { type: 'placeItem', slot: { row: 0, col: 0 } }, deps);
      expect(placed.phase).toBe('restock');
      expect(placed.currentOffers).toHaveLength(4);
    }));

  it('keeps day-2 buyout plus reroll duplicate-id safe after the free placement', () =>
    withPinnedWorld({ [LOOP_V2_ENV_VAR]: '1', [DAY2_STARTER_ENV_VAR]: '1' }, () => {
      let state = placeDay2Starter('day2-starter-buyout-reroll');
      state.coins = 500;

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
          if (!slot) throw new Error('Expected enough slots for day-2 buyout regression.');
          state = dispatch(state, { type: 'placeItem', slot }, deps);
        }

        state = dispatch(state, { type: 'reroll' }, deps);
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

  it('evaluates the goal ladder against the scored day total after the day-2 starter', () =>
    withPinnedWorld(
      {
        [LOOP_V2_ENV_VAR]: '1',
        [DAY2_STARTER_ENV_VAR]: '1',
        [GOAL_LADDER_ENV_VAR]: '1',
      },
      () => {
        let state = openDay1('day2-starter-goal');
        expect(state.phase).toBe('delivery');
        expect(state.dailyTarget).toBe(dailyGoalTarget(2));

        state = dispatch(state, { type: 'draftItem', offerIndex: 0 }, deps);
        state = dispatch(state, { type: 'placeItem', slot: { row: 0, col: 1 } }, deps);
        state = dispatch(state, { type: 'endRestock' }, deps);
        state = dispatch(state, { type: 'openShop' }, deps);

        expect(state.dailyTargetResult).toMatchObject({
          day: 2,
          target: dailyGoalTarget(2),
          dayTotal: dayTotal(state),
          rewardKind: 'freeReroll',
        });
        expect(state.dailyTarget).toBe(dailyGoalTarget(3));
      },
    ));
});
