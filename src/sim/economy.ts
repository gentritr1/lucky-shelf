import type { DeliveryOffer, ItemDefinition } from '../contracts';
import type { ItemTable } from '../items';

import { hashString, rngFor } from './rng';

/**
 * Economy v1. Every number here is provisional Lane A tuning fodder for
 * Fable's balance pass — flagged in the A-M1 review packet. The rent curve is
 * the exception: 25 × 1.44^cycle is locked to the M0 fixtures (25 → 36).
 */

export const STARTING_RENT = 25;
/** Early sawtooth growth — cycles 1-3, pinned by the M0 fixtures (25 → 36). */
export const RENT_GROWTH = 1.44;
/** Fable table-v1 ruling (T-1): the landlord gets greedy from cycle 4 on. */
export const RENT_GROWTH_LATE = 1.6;
export const RENT_GROWTH_LATE_FROM_CYCLE = 4;
export const RENT_PERIOD_DAYS = 3;
export const FREE_MOVES_PER_DAY = 3;
export const REROLL_COST = 2;
export const OFFERS_PER_DELIVERY = 3;
export const OFFERS_PER_RESTOCK = 3;

export function nextRentAmount(amount: number, completedCycle: number): number {
  const growth =
    completedCycle + 1 >= RENT_GROWTH_LATE_FROM_CYCLE ? RENT_GROWTH_LATE : RENT_GROWTH;
  return Math.floor(amount * growth);
}

export function paidMoveCost(rentCycle: number): number {
  // Fixtures: cycle 1 → 2 coins, cycle 2 → 3 coins.
  return rentCycle + 1;
}

export function sellPrice(baseValue: number, definition: ItemDefinition): number {
  // Table-v1 tuning (T-1): lean sell-back so shelf churn isn't a piggy bank.
  let price = Math.max(0, Math.floor(baseValue / 3));
  for (const rule of definition.rules) {
    if (rule.kind !== 'onSell') continue;
    if (rule.delta.flat !== undefined) price += rule.delta.flat;
    if (rule.delta.mult !== undefined) price = Math.floor(price * rule.delta.mult);
  }
  return Math.max(0, price);
}

export function restockCost(definition: ItemDefinition): number {
  // Table-v1 tuning (T-1): restock is the main coin sink; steep enough that
  // buying power, not shelf space, limits mid-run scaling.
  return Math.max(2, definition.baseValue * 2 + definition.tier * 3);
}

/** Day-shifting tier weights: t1-heavy early, t2/t3 arriving as rent climbs. */
function tierWeight(tier: number, day: number): number {
  switch (tier) {
    case 1:
      return Math.max(2, 12 - day);
    case 2:
      return Math.min(10, 2 + day);
    case 3:
      return Math.max(0, day - 4);
    case 4:
      return Math.max(0, day - 9); // Fable table pass: t4 enters the pool from day 10
    default:
      return 0;
  }
}

/** Items that only exist as transform targets never show up in offers. */
export function offerablePool(table: ItemTable): ItemDefinition[] {
  const transformTargets = new Set<string>();
  for (const definition of table.values()) {
    if (definition.upgradesToItemId) transformTargets.add(definition.upgradesToItemId);
    for (const rule of definition.rules) {
      if (rule.kind === 'transformsAdjacent') transformTargets.add(rule.toItemId);
    }
  }
  return [...table.values()].filter((definition) => !transformTargets.has(definition.id));
}

/**
 * Seeded, tier-weighted offer generation. `salt` folds in the current offer
 * ids so a reroll deterministically produces a different set without an RNG
 * cursor in GameState.
 */
export function generateOffers(
  seed: string,
  day: number,
  kind: 'delivery' | 'restock',
  table: ItemTable,
  salt: string,
): DeliveryOffer[] {
  const rng = rngFor(seed, 'offers', kind, day, salt);
  const count = kind === 'delivery' ? OFFERS_PER_DELIVERY : OFFERS_PER_RESTOCK;
  const pool = offerablePool(table);
  const remaining = pool.filter((definition) => tierWeight(definition.tier, day) > 0);

  const offers: DeliveryOffer[] = [];
  for (let index = 0; index < count && remaining.length > 0; index += 1) {
    const weights = remaining.map((definition) => tierWeight(definition.tier, day));
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    let roll = rng.next() * totalWeight;
    let chosenIndex = 0;
    for (const [weightIndex, weight] of weights.entries()) {
      roll -= weight;
      if (roll < 0) {
        chosenIndex = weightIndex;
        break;
      }
    }
    const definition = remaining.splice(chosenIndex, 1)[0];
    if (!definition) break;
    offers.push({
      offerId: `${kind}-${day}-${index}-${definition.id}-${hashString(salt).toString(36)}`,
      item: definition,
      cost: kind === 'restock' ? restockCost(definition) : 0,
    });
  }
  return offers;
}
