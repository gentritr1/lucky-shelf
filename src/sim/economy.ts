import type { DeliveryOffer, ItemDefinition } from '../contracts';
import { isSignatureItem, type ItemTable } from '../items';

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

/**
 * LOOP REDESIGN v2 PHASE 1 — decision-density prototype.
 *
 * Default is deliberately OFF: the current delivery/restock cadence, offer ids,
 * offer costs, and goldens stay byte-identical unless the env flag is enabled
 * for local fuzz/device testing. Flip with:
 *
 *   LOOP_V2_ENABLED=1 node --import tsx scripts/fuzz.ts --runs 100
 */
export const LOOP_V2_ENABLED = false;
export const LOOP_V2_ENV_VAR = 'LOOP_V2_ENABLED';
export const LOOP_V2_STARTING_COINS = 8;
export const LOOP_V2_DAILY_SHOP_OFFERS = 4;

export function loopV2Enabled(): boolean {
  return LOOP_V2_ENABLED || process.env[LOOP_V2_ENV_VAR] === '1';
}

export function startingCoins(): number {
  return loopV2Enabled() ? LOOP_V2_STARTING_COINS : 0;
}

/**
 * Loop redesign v2 Phase 3 — daily score-goal ladder. Default OFF pending
 * Fable sign-off. The target curve is calibrated against the v2 daily-shop
 * payout plateau, so the effective flag requires LOOP_V2 as well.
 */
export const GOAL_LADDER_ENABLED = false;
export const GOAL_LADDER_ENV_VAR = 'GOAL_LADDER_ENABLED';
export const GOAL_LADDER_TARGETS: readonly number[] = [16, 24, 34, 39, 49, 59, 62, 68, 72, 74];
export const GOAL_LADDER_REWARD_KIND = 'freeReroll' as const;

export function goalLadderEnabled(): boolean {
  return loopV2Enabled() && (GOAL_LADDER_ENABLED || process.env[GOAL_LADDER_ENV_VAR] === '1');
}

export function dailyGoalTarget(day: number): number {
  if (!Number.isInteger(day) || day < 1) {
    throw new Error(`Daily goal day must be a positive integer, got ${day}.`);
  }
  const cappedIndex = Math.min(day, GOAL_LADDER_TARGETS.length) - 1;
  const target = GOAL_LADDER_TARGETS[cappedIndex];
  if (target === undefined) throw new Error('Goal ladder has no target values.');
  return target;
}

/**
 * PROTOTYPE — "Front Window" spotlight (flagged, default ON for the feel build).
 * Each day one deterministic slot becomes the storefront window: whatever item's
 * total lands there is multiplied. Turn SPOTLIGHT_ENABLED off to restore the
 * pre-prototype loop byte-for-byte (createRun stops populating GameState.spotlight,
 * and scoring never sees a spotlight slot to boost).
 */
export const SPOTLIGHT_ENABLED = true;
export const SPOTLIGHT_MULT = 3;

/**
 * PROTOTYPE — "Today's Order" collection demand (flagged, independent of the
 * spotlight so the two levers can be A/B'd separately). The order HOLDS for the
 * whole 3-day rent cycle (see pickCycleOrder) — a customer wants DEMAND_COUNT
 * items carrying one tag; fill the shelf with them and every matching item is
 * multiplied by DEMAND_MULT. The pool is the well-represented tags (≥4 items).
 * DEMAND_COUNT is 2 (not 3) so the order is reliably fillable across a cycle's
 * 3 deliveries and the reward actually gets felt — raise to 3 if it feels trivial.
 */
export const DEMAND_ENABLED = true;
export const DEMAND_MULT = 1.5;
export const DEMAND_COUNT = 2;
export const DEMAND_TAG_POOL: readonly string[] = [
  'fancy',
  'food',
  'antique',
  'lucky',
  'fragile',
  'utility',
  'drink',
  'perishable',
  'sweet',
  'plant',
];

/**
 * Loop redesign v2 Phase 2a — tag-set synergies. Default OFF pending Fable
 * sign-off. When on, this supersedes Today's Order during scoring: each item
 * receives only the best eligible tag ladder multiplier it qualifies for.
 */
export const TAG_SYNERGY_ENABLED = false;
export const TAG_SYNERGY_ENV_VAR = 'TAG_SYNERGY_ENABLED';
export const TAG_SYNERGY_ELIGIBLE_TAGS = DEMAND_TAG_POOL;
export const TAG_SYNERGY_LADDER: readonly { minCount: number; mult: number }[] = [
  { minCount: 3, mult: 1.2 },
  { minCount: 4, mult: 1.4 },
  { minCount: 5, mult: 1.6 },
  { minCount: 6, mult: 1.8 },
];

export function tagSynergyEnabled(): boolean {
  return TAG_SYNERGY_ENABLED || process.env[TAG_SYNERGY_ENV_VAR] === '1';
}

/**
 * Loop redesign v2 Phase 2b — build steering. Default OFF pending Fable
 * sign-off. When on, the opening delivery can choose a supplier tag and offers
 * carrying that tag get a weighted nudge without locking out the rest of the pool.
 */
export const BUILD_STEERING_ENABLED = false;
export const BUILD_STEERING_ENV_VAR = 'BUILD_STEERING_ENABLED';
export const BUILD_STEERING_ELIGIBLE_TAGS = TAG_SYNERGY_ELIGIBLE_TAGS;
export const BUILD_STEER_BIAS = 2.5;

export function buildSteeringEnabled(): boolean {
  return BUILD_STEERING_ENABLED || process.env[BUILD_STEERING_ENV_VAR] === '1';
}

export function isBuildSteeringTag(tag: string): boolean {
  return BUILD_STEERING_ELIGIBLE_TAGS.includes(tag);
}

/**
 * Loop redesign v2 Phase 2c — signature stock. Default OFF pending Fable sign-off
 * and Lane B feel pass. When off, signature items are filtered before offer
 * generation and their scoring rule branch is dead.
 */
export const SIGNATURE_ITEMS_ENABLED = false;
export const SIGNATURE_ITEMS_ENV_VAR = 'SIGNATURE_ITEMS_ENABLED';
export const SIGNATURE_ITEM_WEIGHT_MULT = 0.3;
export const SIGNATURE_ITEM_DAY_PREMIUM = 3;
export const SIGNATURE_ITEM_TIER_PREMIUM = 4;

export function signatureItemsEnabled(): boolean {
  return SIGNATURE_ITEMS_ENABLED || process.env[SIGNATURE_ITEMS_ENV_VAR] === '1';
}

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
  if (isSignatureItem(definition)) {
    return Math.max(14, definition.baseValue * 2 + definition.tier * 6);
  }
  // Table-v1 tuning (T-1): restock is the main coin sink; steep enough that
  // buying power, not shelf space, limits mid-run scaling.
  return Math.max(2, definition.baseValue * 2 + definition.tier * 3);
}

export function dailyShopCost(definition: ItemDefinition, day: number): number {
  if (isSignatureItem(definition)) {
    const dayPremium = Math.max(0, day - 1) * SIGNATURE_ITEM_DAY_PREMIUM;
    return Math.max(
      12,
      definition.baseValue * 2 + definition.tier * SIGNATURE_ITEM_TIER_PREMIUM + dayPremium,
    );
  }
  // Loop v2 Phase 1: cheap early items so day-1 coins can buy multiple pieces.
  const dayPremium = Math.max(0, day - 1) * 5;
  return Math.max(3, definition.baseValue * 2 + definition.tier + dayPremium);
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

export function offerWeight(
  definition: ItemDefinition,
  day: number,
  supplierTag: string | null = null,
): number {
  const baseWeight = tierWeight(definition.tier, day);
  if (baseWeight <= 0) return 0;
  let weight = isSignatureItem(definition) ? baseWeight * SIGNATURE_ITEM_WEIGHT_MULT : baseWeight;
  if (
    buildSteeringEnabled() &&
    supplierTag &&
    isBuildSteeringTag(supplierTag) &&
    definition.tags.includes(supplierTag)
  ) {
    weight *= BUILD_STEER_BIAS;
  }
  return weight;
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
  return [...table.values()].filter(
    (definition) =>
      !transformTargets.has(definition.id) &&
      (signatureItemsEnabled() || !isSignatureItem(definition)),
  );
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
  supplierTag: string | null = null,
): DeliveryOffer[] {
  const rng = rngFor(seed, 'offers', kind, day, salt);
  const count =
    kind === 'delivery'
      ? OFFERS_PER_DELIVERY
      : loopV2Enabled()
        ? LOOP_V2_DAILY_SHOP_OFFERS
        : OFFERS_PER_RESTOCK;
  const pool = offerablePool(table).filter(
    (definition) => kind === 'restock' || !isSignatureItem(definition),
  );
  const remaining = pool.filter((definition) => offerWeight(definition, day, supplierTag) > 0);

  const offers: DeliveryOffer[] = [];
  for (let index = 0; index < count && remaining.length > 0; index += 1) {
    const weights = remaining.map((definition) => offerWeight(definition, day, supplierTag));
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
      cost:
        kind === 'restock'
          ? loopV2Enabled()
            ? dailyShopCost(definition, day)
            : restockCost(definition)
          : 0,
    });
  }
  return offers;
}
