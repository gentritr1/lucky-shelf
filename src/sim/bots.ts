import type { Action, GameState } from '../contracts';
import { isSignatureItem } from '../items';

import type { EngineDeps } from './engine';
import { createRun, dispatch, legalActions } from './engine';
import { TAG_SYNERGY_ELIGIBLE_TAGS, loopV2Enabled } from './economy';
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
  metrics: BotRunMetrics;
}

export interface BotRunMetrics {
  scoredDays: number;
  orderMetDays: number;
  spotlightHitDays: number;
  synergyFireDays: number;
  synergyFires: number;
  scoredOccupiedSlots: number;
  supplierTag: string | null;
  finalDominantEligibleTagCount: number;
  finalSupplierTagCount: number;
  itemsBought: number;
  signatureItemsBought: number;
  signatureItemsBoughtById: Record<string, number>;
  occupancyByDay: Record<string, number>;
  itemsBoughtByDay: Record<string, number>;
  dominantEligibleTagCountByDay: Record<string, number>;
  supplierTagCountByDay: Record<string, number>;
}

function nonQuitting(actions: readonly Action[]): Action[] {
  return actions.filter((action) => action.type !== 'abandonRun');
}

/** Score a hypothetical state by what the shelf would pay out right now. */
function projectedDayTotal(state: GameState, deps: EngineDeps): number {
  return resolveOpenShop(state, deps.table, deps.combos).dayTotal;
}

function bestDraftForState(
  state: GameState,
  deps: EngineDeps,
): { action: Action | null; score: number } {
  const legal = nonQuitting(legalActions(state, deps));
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
  return { action: best, score: bestScore };
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
    const supplierChoices = legal.filter(
      (action): action is Extract<Action, { type: 'chooseSupplier' }> =>
        action.type === 'chooseSupplier',
    );
    return supplierChoices.length > 0 ? rng.pick(supplierChoices) : rng.pick(legal);
  }

  const supplierChoices = legal.filter(
    (action): action is Extract<Action, { type: 'chooseSupplier' }> =>
      action.type === 'chooseSupplier',
  );
  if (supplierChoices.length > 0) {
    let best = supplierChoices[0] as Action;
    let bestScore = -1;
    for (const choice of supplierChoices) {
      const leaned = dispatch(state, choice, deps);
      const matchingOffers = leaned.currentOffers.filter((offer) =>
        offer.item.tags.includes(choice.tag),
      ).length;
      const score = bestDraftForState(leaned, deps).score + matchingOffers * 10;
      if (score > bestScore) {
        bestScore = score;
        best = choice;
      }
    }
    return best;
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
    return bestDraftForState(state, deps).action ?? rng.pick(legal);
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
    // V1 restock is conservative; v2 daily shops spend until coins or slots stop it.
    const buys = legal.filter(
      (action): action is Extract<Action, { type: 'buyOffer' }> => action.type === 'buyOffer',
    );
    if (buys.length > 0 && (loopV2Enabled() || rng.next() < 0.6)) {
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

function orderIsMet(state: GameState): boolean {
  const order = state.dailyOrder;
  if (!order) return false;
  const matches = state.shelf.slots.filter((entry) => entry.item?.tags.includes(order.tag)).length;
  return matches >= order.count;
}

function spotlightIsOccupied(state: GameState): boolean {
  const spotlight = state.spotlight;
  if (!spotlight) return false;
  return Boolean(
    state.shelf.slots.find(
      (entry) => entry.slot.row === spotlight.row && entry.slot.col === spotlight.col,
    )?.item,
  );
}

function shelfOccupancy(state: GameState): number {
  return state.shelf.slots.filter((entry) => entry.item !== null).length;
}

function dominantEligibleTagCount(state: GameState): number {
  const eligible = new Set(TAG_SYNERGY_ELIGIBLE_TAGS);
  const counts = new Map<string, number>();
  for (const entry of state.shelf.slots) {
    const item = entry.item;
    if (!item) continue;
    for (const tag of item.tags) {
      if (!eligible.has(tag)) continue;
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  return Math.max(0, ...counts.values());
}

function supplierTagShelfCount(state: GameState): number {
  const tag = state.supplierTag;
  if (!tag) return 0;
  return state.shelf.slots.filter((entry) => entry.item?.tags.includes(tag)).length;
}

function incrementDayMetric(metrics: Record<string, number>, day: number): void {
  const key = String(day);
  metrics[key] = (metrics[key] ?? 0) + 1;
}

export function playRun(
  seed: string,
  strategy: StrategyName,
  deps: EngineDeps,
  maxActions = 400,
): BotRun {
  let state = createRun(seed, deps);
  const actions: Action[] = [];
  const metrics: BotRunMetrics = {
    scoredDays: 0,
    orderMetDays: 0,
    spotlightHitDays: 0,
    synergyFireDays: 0,
    synergyFires: 0,
    scoredOccupiedSlots: 0,
    supplierTag: state.supplierTag ?? null,
    finalDominantEligibleTagCount: 0,
    finalSupplierTagCount: 0,
    itemsBought: 0,
    signatureItemsBought: 0,
    signatureItemsBoughtById: {},
    occupancyByDay: {},
    itemsBoughtByDay: {},
    dominantEligibleTagCountByDay: {},
    supplierTagCountByDay: {},
  };
  for (let step = 0; step < maxActions && state.phase !== 'gameOver'; step += 1) {
    const action = chooseAction(state, strategy, deps, step);
    if (!action) break;
    const beforeAction = state;
    if (action.type === 'openShop') {
      metrics.scoredDays += 1;
      metrics.occupancyByDay[String(beforeAction.day)] = shelfOccupancy(beforeAction);
      metrics.scoredOccupiedSlots += shelfOccupancy(beforeAction);
      metrics.dominantEligibleTagCountByDay[String(beforeAction.day)] =
        dominantEligibleTagCount(beforeAction);
      if (beforeAction.supplierTag) {
        metrics.supplierTagCountByDay[String(beforeAction.day)] =
          supplierTagShelfCount(beforeAction);
      }
      if (orderIsMet(beforeAction)) metrics.orderMetDays += 1;
      if (spotlightIsOccupied(beforeAction)) metrics.spotlightHitDays += 1;
    } else if (action.type === 'chooseSupplier') {
      metrics.supplierTag = action.tag;
    } else if (action.type === 'buyOffer') {
      const offer = beforeAction.currentOffers[action.offerIndex];
      metrics.itemsBought += 1;
      incrementDayMetric(metrics.itemsBoughtByDay, beforeAction.day);
      if (offer && isSignatureItem(offer.item)) {
        metrics.signatureItemsBought += 1;
        metrics.signatureItemsBoughtById[offer.item.id] =
          (metrics.signatureItemsBoughtById[offer.item.id] ?? 0) + 1;
      }
    }
    actions.push(action);
    state = dispatch(beforeAction, action, deps);
    if (action.type === 'openShop') {
      const synergyFires =
        state.lastScoringTrace?.events.filter(
          (event) => event.kind === 'ruleFire' && event.ruleId === 'synergy',
        ).length ?? 0;
      metrics.synergyFires += synergyFires;
      if (synergyFires > 0) metrics.synergyFireDays += 1;
    }
  }
  metrics.supplierTag = state.supplierTag ?? metrics.supplierTag;
  metrics.finalDominantEligibleTagCount = dominantEligibleTagCount(state);
  metrics.finalSupplierTagCount = supplierTagShelfCount(state);
  return { seed, strategy, actions, finalState: state, metrics };
}
