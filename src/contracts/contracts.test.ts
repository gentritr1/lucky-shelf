import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  ActionSchema,
  FixtureCollectionSchema,
  GameStateSchema,
  ScoringTraceSchema,
} from '.';

function loadFixtureJson(): unknown {
  return JSON.parse(readFileSync(resolve(process.cwd(), 'fixtures/m0-fixtures.json'), 'utf8'));
}

describe('M0 contract schemas', () => {
  it('loads all six fixture GameStates and ScoringTraces', () => {
    const fixtures = FixtureCollectionSchema.parse(loadFixtureJson());

    expect(fixtures).toHaveLength(6);
    for (const fixture of fixtures) {
      expect(GameStateSchema.parse(fixture.gameState)).toEqual(fixture.gameState);
      expect(ScoringTraceSchema.parse(fixture.scoringTrace)).toEqual(fixture.scoringTrace);
    }
  });

  it('accepts the full additive action surface', () => {
    const actions = [
      { type: 'chooseSupplier', tag: 'food' },
      { type: 'draftItem', offerIndex: 0 },
      { type: 'placeItem', slot: { row: 0, col: 0 } },
      { type: 'moveItem', from: { row: 0, col: 0 }, to: { row: 0, col: 1 } },
      { type: 'sellItem', slot: { row: 0, col: 0 } },
      { type: 'openShop' },
      { type: 'buyOffer', offerIndex: 1 },
      { type: 'reroll' },
      { type: 'endRestock' },
      { type: 'abandonRun' },
    ];

    for (const action of actions) {
      expect(ActionSchema.parse(action)).toEqual(action);
    }
  });

  it('accepts optional supplierTag without requiring it in old fixtures', () => {
    const fixtures = FixtureCollectionSchema.parse(loadFixtureJson());
    const fixture = fixtures[0];
    if (!fixture) throw new Error('Expected at least one fixture.');

    expect('supplierTag' in fixture.gameState).toBe(false);

    const withChosenSupplier = structuredClone(fixture.gameState);
    withChosenSupplier.supplierTag = 'food';
    expect(GameStateSchema.parse(withChosenSupplier).supplierTag).toBe('food');

    const withUnchosenSupplier = structuredClone(fixture.gameState);
    withUnchosenSupplier.supplierTag = null;
    expect(GameStateSchema.parse(withUnchosenSupplier).supplierTag).toBeNull();
  });

  it('accepts optional goal ladder fields without requiring them in old fixtures', () => {
    const fixtures = FixtureCollectionSchema.parse(loadFixtureJson());
    const fixture = fixtures[0];
    if (!fixture) throw new Error('Expected at least one fixture.');

    expect('dailyTarget' in fixture.gameState).toBe(false);
    expect('dailyTargetResult' in fixture.gameState).toBe(false);
    expect('freeRerollTokens' in fixture.gameState).toBe(false);

    const withGoalFields = structuredClone(fixture.gameState);
    withGoalFields.dailyTarget = 15;
    withGoalFields.dailyTargetResult = {
      day: 1,
      target: 15,
      dayTotal: 16,
      targetMet: true,
      rewardKind: 'freeReroll',
      rewardGranted: true,
    };
    withGoalFields.freeRerollTokens = 1;

    expect(GameStateSchema.parse(withGoalFields).dailyTargetResult?.targetMet).toBe(true);
  });

  it('rejects traces that do not end with a dayTotal event', () => {
    expect(() =>
      ScoringTraceSchema.parse({
        traceId: 'bad-trace',
        day: 1,
        seed: 'bad-seed',
        events: [{ kind: 'itemBase', slot: { row: 0, col: 0 }, value: 4 }],
      }),
    ).toThrow();
  });

  it('rejects shelves with duplicate slots', () => {
    const fixtures = FixtureCollectionSchema.parse(loadFixtureJson());
    const fixture = fixtures[0];
    if (!fixture) {
      throw new Error('Expected at least one fixture.');
    }

    const brokenState = structuredClone(fixture.gameState);
    const firstSlot = brokenState.shelf.slots[0];
    if (!firstSlot || !brokenState.shelf.slots[1]) {
      throw new Error('Expected the fixture shelf to include at least two slots.');
    }
    brokenState.shelf.slots.splice(1, 1, structuredClone(firstSlot));

    expect(() => GameStateSchema.parse(brokenState)).toThrow();
  });
});
