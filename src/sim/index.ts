/**
 * Lane A sim surface. Pure TS — no React/RN/Skia imports anywhere below this
 * line (kickoff §3). Lane B consumes state via contracts + store selectors,
 * never these internals.
 */

export { createRun, dispatch, legalActions, EngineError, type EngineDeps } from './engine';
export { resolveOpenShop, type ScoringResult } from './scoring';
export { runReplay, type Replay } from './replay';
export { hashState, stableStringify, fnv1a64 } from './hash';
export { rngFor, hashString, type Rng } from './rng';
export {
  DEMAND_COUNT,
  DEMAND_ENABLED,
  DEMAND_MULT,
  FREE_MOVES_PER_DAY,
  LOOP_V2_DAILY_SHOP_OFFERS,
  LOOP_V2_ENABLED,
  LOOP_V2_ENV_VAR,
  LOOP_V2_STARTING_COINS,
  RENT_GROWTH,
  RENT_PERIOD_DAYS,
  REROLL_COST,
  SIGNATURE_ITEMS_ENABLED,
  SIGNATURE_ITEMS_ENV_VAR,
  SIGNATURE_ITEM_DAY_PREMIUM,
  SIGNATURE_ITEM_TIER_PREMIUM,
  SIGNATURE_ITEM_WEIGHT_MULT,
  SPOTLIGHT_ENABLED,
  SPOTLIGHT_MULT,
  STARTING_RENT,
  dailyShopCost,
  generateOffers,
  loopV2Enabled,
  nextRentAmount,
  paidMoveCost,
  sellPrice,
  signatureItemsEnabled,
  startingCoins,
} from './economy';
export {
  buildSlotMap,
  compareSlots,
  neighborsOf,
  occupiedNeighbors,
  rowMajorSlots,
  sameSlot,
  slotStateAt,
} from './grid';
