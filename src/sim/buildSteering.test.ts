import { describe, expect, it } from 'vitest';

import { loadCombos, loadItemTable } from '../items';
import { toSlotKey } from '../contracts';
import { playRun } from './bots';
import {
  BUILD_STEER_BIAS,
  BUILD_STEERING_ELIGIBLE_TAGS,
  BUILD_STEERING_ENV_VAR,
  LOOP_V2_ENV_VAR,
  generateOffers,
  offerWeight,
} from './economy';
import { createRun, dispatch, EngineError, legalActions } from './engine';
import { hashState } from './hash';
import { runReplay } from './replay';
import { withFlagWorld } from './testkit';

const deps = { table: loadItemTable(), combos: loadCombos() };


function chooseSupplierActions(state = createRun('build-steering-legal', deps)) {
  return legalActions(state, deps).filter((action) => action.type === 'chooseSupplier');
}

function tagOfferCount(tag: string, supplierTag: string | null): number {
  let count = 0;
  for (let index = 0; index < 160; index += 1) {
    const offers = generateOffers(
      `build-steering-bias-${index}`,
      5,
      'restock',
      deps.table,
      '',
      supplierTag,
    );
    count += offers.filter((offer) => offer.item.tags.includes(tag)).length;
  }
  return count;
}

describe('loop v2 phase 2b build steering', () => {
  it('keeps supplier lean fully absent while the flag is off', () =>
    withFlagWorld([], () => {
      const state = createRun('build-steering-off', deps);

      expect('supplierTag' in state).toBe(false);
      expect(chooseSupplierActions(state)).toHaveLength(0);
      expect(() => dispatch(state, { type: 'chooseSupplier', tag: 'food' }, deps)).toThrow(
        EngineError,
      );

      const baseline = generateOffers('build-steering-offers', 4, 'restock', deps.table, '');
      const supplied = generateOffers(
        'build-steering-offers',
        4,
        'restock',
        deps.table,
        '',
        'food',
      );
      expect(supplied).toEqual(baseline);
    }));

  it('sets supplierTag exactly once at the opening delivery and regenerates deterministic offers', () =>
    withFlagWorld([BUILD_STEERING_ENV_VAR], () => {
      const initial = createRun('build-steering-on', deps);
      expect(initial.phase).toBe('delivery');
      expect(initial.supplierTag).toBeNull();

      const legalChoices = chooseSupplierActions(initial);
      expect(legalChoices.map((action) => action.tag)).toEqual(BUILD_STEERING_ELIGIBLE_TAGS);
      expect(legalActions(initial, deps).some((action) => action.type === 'draftItem')).toBe(false);
      expect(() => dispatch(initial, { type: 'draftItem', offerIndex: 0 }, deps)).toThrow(
        EngineError,
      );

      const chosen = dispatch(initial, { type: 'chooseSupplier', tag: 'food' }, deps);
      const repeated = dispatch(createRun('build-steering-on', deps), {
        type: 'chooseSupplier',
        tag: 'food',
      }, deps);

      expect(chosen.supplierTag).toBe('food');
      expect(chosen.currentOffers).toEqual(repeated.currentOffers);
      expect(chosen.currentOffers).toEqual(
        generateOffers('build-steering-on', 1, 'delivery', deps.table, '', 'food'),
      );
      expect(legalActions(chosen, deps).some((action) => action.type === 'draftItem')).toBe(true);
      expect(() => dispatch(chosen, { type: 'chooseSupplier', tag: 'lucky' }, deps)).toThrow(
        EngineError,
      );

      const drafted = dispatch(chosen, { type: 'draftItem', offerIndex: 0 }, deps);
      expect(drafted.supplierTag).toBe('food');
      expect(() => dispatch(drafted, { type: 'chooseSupplier', tag: 'lucky' }, deps)).toThrow(
        EngineError,
      );
    }));

  it('rejects supplier tags outside the eligible archetype pool', () =>
    withFlagWorld([BUILD_STEERING_ENV_VAR], () => {
      const state = createRun('build-steering-invalid-tag', deps);

      expect(BUILD_STEERING_ELIGIBLE_TAGS).not.toContain('paper');
      expect(() => dispatch(state, { type: 'chooseSupplier', tag: 'paper' }, deps)).toThrow(
        EngineError,
      );
    }));

  it('multiplies leaned-tag offer weight by the build-steer bias without locking the pool', () =>
    withFlagWorld([BUILD_STEERING_ENV_VAR], () => {
      const food = deps.table.get('cheese-wheel');
      const nonFood = [...deps.table.values()].find(
        (definition) => !definition.tags.includes('food') && offerWeight(definition, 5) > 0,
      );
      if (!food || !nonFood) throw new Error('Expected food and non-food offerable items.');

      expect(offerWeight(food, 5, 'food')).toBe(offerWeight(food, 5, null) * BUILD_STEER_BIAS);
      expect(offerWeight(nonFood, 5, 'food')).toBe(offerWeight(nonFood, 5, null));

      const unsteeredFoodOffers = tagOfferCount('food', null);
      const steeredFoodOffers = tagOfferCount('food', 'food');
      const totalSteeredOffers = 160 * generateOffers('count-size', 5, 'restock', deps.table, '').length;

      expect(steeredFoodOffers).toBeGreaterThan(unsteeredFoodOffers);
      expect(steeredFoodOffers).toBeGreaterThan(
        Math.floor(unsteeredFoodOffers * Math.min(1.25, BUILD_STEER_BIAS / 2)),
      );
      expect(totalSteeredOffers - steeredFoodOffers).toBeGreaterThan(0);
    }));

  it('keeps bot supplier choices deterministic for the same seed', () =>
    withFlagWorld([BUILD_STEERING_ENV_VAR, LOOP_V2_ENV_VAR], () => {
        const first = playRun('build-steering-bot', 'greedy', deps, 140);
        const second = playRun('build-steering-bot', 'greedy', deps, 140);

        expect(first.actions[0]).toMatchObject({ type: 'chooseSupplier' });
        expect(first.finalState.supplierTag).toBeTruthy();
        expect(second.actions).toEqual(first.actions);
        expect(hashState(second.finalState)).toBe(hashState(first.finalState));
        expect(hashState(runReplay({ seed: first.seed, actions: first.actions }, deps))).toBe(
          hashState(first.finalState),
        );
        expect(first.metrics.supplierTag).toBe(first.finalState.supplierTag);
      }));

  it('carries the chosen supplier through starter placement and the daily shop offers', () =>
    withFlagWorld([BUILD_STEERING_ENV_VAR, LOOP_V2_ENV_VAR], () => {
        let state = createRun('build-steering-loop-v2', deps);
        state = dispatch(state, { type: 'chooseSupplier', tag: 'food' }, deps);
        state = dispatch(state, { type: 'draftItem', offerIndex: 0 }, deps);
        const heldSlot = { row: 0, col: 0 };
        state = dispatch(state, { type: 'placeItem', slot: heldSlot }, deps);
        const placed = state.shelf.slots.find(
          (entry) => toSlotKey(entry.slot) === toSlotKey(heldSlot),
        );

        expect(placed?.item).not.toBeNull();
        expect(state.phase).toBe('restock');
        expect(state.supplierTag).toBe('food');
        expect(state.currentOffers).toEqual(
          generateOffers(state.seed, state.day, 'restock', deps.table, '', 'food'),
        );
      }));
});
