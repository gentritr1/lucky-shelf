/**
 * Lane A sim surface. Pure TS — no React/RN/Skia imports anywhere below this
 * line (kickoff §3). Lane B consumes state via contracts + store selectors,
 * never these internals.
 */

export {
  createRun,
  dispatch,
  legalActions,
  EngineError,
  type CreateRunOptions,
  type EngineDeps,
} from './engine';
export { resolveOpenShop, type ScoringResult } from './scoring';
export { runReplay, type Replay } from './replay';
export { hashState, stableStringify, fnv1a64 } from './hash';
export { rngFor, hashString, type Rng } from './rng';
export {
  UNLOCK_LADDER,
  allUnlockableItemIds,
  alwaysUnlockedItemIds,
  nextUnlocks,
  unlockedItemIds,
  type NextUnlock,
  type UnlockPredicate,
  type UnlockTable,
} from './unlocks';
export {
  DEMAND_COUNT,
  DEMAND_ENABLED,
  DEMAND_MULT,
  FREE_MOVES_PER_DAY,
  BUILD_STEER_BIAS,
  BUILD_STEERING_ELIGIBLE_TAGS,
  BUILD_STEERING_ENABLED,
  BUILD_STEERING_ENV_VAR,
  LOOP_V2_DAILY_SHOP_OFFERS,
  LOOP_V2_ENABLED,
  LOOP_V2_ENV_VAR,
  LOOP_V2_STARTING_COINS,
  RENT_GROWTH,
  RENT_PERIOD_DAYS,
  REROLL_COST,
  SHELF_EXPANSION_COST,
  SHELF_EXPANSION_ENABLED,
  SHELF_EXPANSION_ENV_VAR,
  SIGNATURE_ITEMS_ENABLED,
  SIGNATURE_ITEMS_ENV_VAR,
  SIGNATURE_ITEM_DAY_PREMIUM,
  SIGNATURE_ITEM_TIER_PREMIUM,
  SIGNATURE_ITEM_WEIGHT_MULT,
  SPOTLIGHT_ENABLED,
  SPOTLIGHT_MULT,
  STARTING_RENT,
  TAG_SYNERGY_ELIGIBLE_TAGS,
  TAG_SYNERGY_LADDER,
  UNLOCK_LADDER_ENABLED,
  UNLOCK_LADDER_ENV_VAR,
  WARM_OPENING_ENABLED,
  WARM_OPENING_ENV_VAR,
  buildSteeringEnabled,
  dailyShopCost,
  generateOffers,
  isBuildSteeringTag,
  loopV2Enabled,
  nextRentAmount,
  paidMoveCost,
  sellPrice,
  shelfExpansionEnabled,
  signatureItemsEnabled,
  startingCoins,
  tagSynergyEnabled,
  unlockLadderEnabled,
  warmOpeningEnabled,
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
