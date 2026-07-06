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
  FREE_MOVES_PER_DAY,
  RENT_GROWTH,
  RENT_PERIOD_DAYS,
  REROLL_COST,
  STARTING_RENT,
  generateOffers,
  nextRentAmount,
  paidMoveCost,
  sellPrice,
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
