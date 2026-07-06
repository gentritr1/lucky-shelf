import type { Action, GameState } from '../contracts';

import type { EngineDeps } from './engine';
import { createRun, dispatch, legalActions } from './engine';
import { resolveOpenShop } from './scoring';
import { rngFor } from './rng';

/**
 * Headless strategy bots. Shared by the determinism suite and the fuzz
 * harness. All randomness is seeded — a bot given the same seed always plays
 * the same run.
 */

export type StrategyName = 'random' | 'greedy' | 'combo';

export interface BotRun {
  seed: string;
  strategy: StrategyName;
  actions: Action[];
  finalState: GameState;
}

function nonQuitting(actions: readonly Action[]): Action[] {
  return actions.filter((action) => action.type !== 'abandonRun');
}

/** Score a hypothetical state by what the shelf would pay out right now. */
function projectedDayTotal(state: GameState, deps: EngineDeps): number {
  return resolveOpenShop(state, deps.table, deps.combos).dayTotal;
}

function chooseAction(
  state: GameState,
  strategy: StrategyName,
  deps: EngineDeps,
  step: number,
): Action | null {
  const legal = nonQuitting(legalActions(state, deps));
  if (legal.length === 0) return null;
  const rng = rngFor(state.seed, 'bot', strategy, state.day, state.phase, step);

  if (strategy === 'random') {
    return rng.pick(legal);
  }

  // greedy / combo: evaluate placement-affecting choices by simulated payout.
  const placements = legal.filter(
    (action): action is Extract<Action, { type: 'placeItem' }> => action.type === 'placeItem',
  );
  if (placements.length > 0) {
    let best = placements[0] as Action;
    let bestScore = -1;
    for (const placement of placements) {
      const candidate = dispatch(state, placement, deps);
      let score = projectedDayTotal(candidate, deps);
      if (strategy === 'combo') {
        // Combo-seeker prizes named combos above raw coins.
        score += resolveOpenShop(candidate, deps.table, deps.combos).discoveredComboIds.length * 50;
      }
      if (score > bestScore) {
        bestScore = score;
        best = placement;
      }
    }
    return best;
  }

  if (state.phase === 'delivery') {
    // Greedy drafts the offer whose best placement pays most.
    const drafts = legal.filter(
      (action): action is Extract<Action, { type: 'draftItem' }> => action.type === 'draftItem',
    );
    let best: Action | null = null;
    let bestScore = -1;
    for (const draft of drafts) {
      const held = dispatch(state, draft, deps);
      const placeOptions = nonQuitting(legalActions(held, deps));
      for (const placement of placeOptions) {
        const candidate = dispatch(held, placement, deps);
        const score = projectedDayTotal(candidate, deps);
        if (score > bestScore) {
          bestScore = score;
          best = draft;
        }
      }
    }
    return best ?? rng.pick(legal);
  }

  if (state.phase === 'arrange') {
    // Try a single improving move if any free moves remain; otherwise open.
    const openShop = legal.find((action) => action.type === 'openShop');
    if (state.moves.freeRemaining > 0) {
      const baseline = projectedDayTotal(state, deps);
      const moves = legal.filter(
        (action): action is Extract<Action, { type: 'moveItem' }> => action.type === 'moveItem',
      );
      let best: Action | null = null;
      let bestGain = 0;
      for (const move of moves) {
        const candidate = dispatch(state, move, deps);
        const gain = projectedDayTotal(candidate, deps) - baseline;
        if (gain > bestGain) {
          bestGain = gain;
          best = move;
        }
      }
      if (best) return best;
    }
    return openShop ?? rng.pick(legal);
  }

  if (state.phase === 'restock') {
    // Buy the best-value affordable offer once, then leave.
    const buys = legal.filter(
      (action): action is Extract<Action, { type: 'buyOffer' }> => action.type === 'buyOffer',
    );
    if (buys.length > 0 && rng.next() < 0.6) {
      let best = buys[0] as Action;
      let bestScore = -1;
      for (const buy of buys) {
        const held = dispatch(state, buy, deps);
        const placements2 = nonQuitting(legalActions(held, deps));
        for (const placement of placements2) {
          const candidate = dispatch(held, placement, deps);
          const score = projectedDayTotal(candidate, deps);
          if (score > bestScore) {
            bestScore = score;
            best = buy;
          }
        }
      }
      return best;
    }
    const end = legal.find((action) => action.type === 'endRestock');
    return end ?? rng.pick(legal);
  }

  return rng.pick(legal);
}

export function playRun(
  seed: string,
  strategy: StrategyName,
  deps: EngineDeps,
  maxActions = 400,
): BotRun {
  let state = createRun(seed, deps);
  const actions: Action[] = [];
  for (let step = 0; step < maxActions && state.phase !== 'gameOver'; step += 1) {
    const action = chooseAction(state, strategy, deps, step);
    if (!action) break;
    actions.push(action);
    state = dispatch(state, action, deps);
  }
  return { seed, strategy, actions, finalState: state };
}
