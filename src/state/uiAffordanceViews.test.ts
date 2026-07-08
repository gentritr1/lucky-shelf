import { describe, expect, it } from 'vitest';

import type { Action } from '../contracts';
import { loadCombos, loadItemTable } from '../items';
import { balanceFlagConfigByName, withBalanceFlagConfig } from '../sim/balanceHarness';
import { createRun } from '../sim/engine';
import { makeInstance, makeState } from '../sim/testkit';
import { uiAffordances } from '../sim/uiAffordances';
import {
  arrangeAffordanceView,
  draftAffordanceView,
  restockAffordanceView,
  slotActionFor,
} from './store';

const deps = { table: loadItemTable(), combos: loadCombos() };

function actionsOfType<T extends Action['type']>(
  actions: readonly Action[],
  type: T,
): Extract<Action, { type: T }>[] {
  return actions.filter((action): action is Extract<Action, { type: T }> => action.type === type);
}

describe('UI affordance view builders', () => {
  it('derives delivery draft actions from the shared affordance source', () => {
    const state = createRun('draft-view', deps);
    const affordances = uiAffordances(state);
    const view = draftAffordanceView(state);

    expect(view.draftActions).toEqual(actionsOfType(affordances, 'draftItem'));
    expect(view.pendingSupplierTags).toBeNull();
  });

  it('derives build-steering supplier chips from the shared affordance source', () => {
    withBalanceFlagConfig(balanceFlagConfigByName('buildSteering'), () => {
      const state = createRun('supplier-view', deps);
      const affordances = uiAffordances(state);
      const view = draftAffordanceView(state);

      expect(view.chooseSupplierActions).toEqual(actionsOfType(affordances, 'chooseSupplier'));
      expect(view.pendingSupplierTags).toEqual(
        actionsOfType(affordances, 'chooseSupplier').map((action) => action.tag),
      );
      expect(view.draftActions).toEqual([]);
    });
  });

  it('derives the full-shelf held-item sell escape from arrange affordances', () => {
    const full = Array.from({ length: 12 }, (_, index) => ({
      slot: { row: Math.floor(index / 4), col: index % 4 },
      itemId: 'wine-bottle',
      baseValue: 6,
    }));
    const state = makeState(full, {
      phase: 'arrange',
      heldItem: makeInstance({ slot: { row: 0, col: 0 }, itemId: 'observation-hive' }, 99),
    });
    const affordances = uiAffordances(state);
    const view = arrangeAffordanceView(state);

    expect(view.placeActions).toEqual([]);
    expect(view.sellActions).toEqual(actionsOfType(affordances, 'sellItem'));
    expect(slotActionFor(view.sellActions, { row: 0, col: 0 })).toEqual(view.sellActions[0]);
    expect(view.primaryAction).toBeNull();
  });

  it('derives restock buy, reroll, sell, and end controls from affordances', () => {
    const offers = createRun('restock-view-offers', deps).currentOffers;
    const state = makeState(
      [{ slot: { row: 0, col: 0 }, itemId: 'wine-bottle' }],
      { phase: 'restock', coins: 12, currentOffers: offers },
    );
    const affordances = uiAffordances(state);
    const view = restockAffordanceView(state);

    expect(view.buyActions).toEqual(actionsOfType(affordances, 'buyOffer'));
    expect(view.rerollAction).toEqual(actionsOfType(affordances, 'reroll')[0]);
    expect(view.sellActions).toEqual(actionsOfType(affordances, 'sellItem'));
    expect(view.endRestockAction).toEqual(actionsOfType(affordances, 'endRestock')[0]);
  });
});
