import { describe, expect, it } from 'vitest';

import { GameStateSchema, type GameState } from '../contracts';
import { loadCombos, loadItemTable } from '../items';
import { playRun, type StrategyName } from './bots';
import { createRun, dispatch } from './engine';
import { generateOffers, offerWeight, offerablePool } from './economy';
import {
  BALANCE_FLAG_CONFIGS,
  balanceFlagConfigByName,
  withBalanceFlagConfig,
} from './balanceHarness';

const deps = { table: loadItemTable(), combos: loadCombos() };
const strategies: readonly StrategyName[] = ['random', 'greedy', 'combo'];

function assertStateInvariants(state: GameState): void {
  expect(state.coins).toBeGreaterThanOrEqual(0);
  const capacity = state.shelf.size.rows * state.shelf.size.cols;
  const itemCount = state.shelf.slots.filter((slot) => slot.item !== null).length;
  expect(itemCount).toBeLessThanOrEqual(capacity);
  expect(state.shelf.slots).toHaveLength(capacity);

  const roundTripped = GameStateSchema.parse(JSON.parse(JSON.stringify(state)) as unknown);
  expect(roundTripped).toEqual(state);
}

describe('reachable state invariants', () => {
  it('holds across fuzzed bot trajectories under every depth flag config', () => {
    for (const config of BALANCE_FLAG_CONFIGS) {
      withBalanceFlagConfig(config, () => {
        for (const strategy of strategies) {
          for (let seedIndex = 0; seedIndex < 2; seedIndex += 1) {
            const seed = `invariant-${config.name}-${strategy}-${seedIndex}`;
            const run = playRun(seed, strategy, deps, 70);
            let state = createRun(seed, deps);
            assertStateInvariants(state);
            for (const action of run.actions) {
              state = dispatch(state, action, deps);
              assertStateInvariants(state);
            }
          }
        }
      });
    }
  }, 30000);

  it('keeps every offerable catalog item reachable through the offer generator', () => {
    withBalanceFlagConfig(balanceFlagConfigByName('allDepth'), () => {
      const positiveWeightIds = new Set(
        offerablePool(deps.table)
          .filter((definition) =>
            Array.from({ length: 30 }, (_, index) => index + 1).some(
              (day) => offerWeight(definition, day) > 0,
            ),
          )
          .map((definition) => definition.id),
      );
      const seen = new Set<string>();

      for (let seedIndex = 0; seedIndex < 260; seedIndex += 1) {
        for (let day = 1; day <= 30; day += 1) {
          for (const kind of ['delivery', 'restock'] as const) {
            for (const offer of generateOffers(`offer-reach-${seedIndex}`, day, kind, deps.table, '')) {
              seen.add(offer.item.id);
            }
          }
        }
      }

      const missing = [...positiveWeightIds].filter((itemId) => !seen.has(itemId)).sort();
      expect(missing).toEqual([]);
    });
  }, 30000);
});
