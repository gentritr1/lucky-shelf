import { create } from 'zustand';

import {
  type Action,
  type GameState,
  type ItemInstance,
  type Slot,
} from '../contracts';
import { isSignatureItem, itemDefinition, loadCombos, loadItemTable } from '../items';
import {
  BUILD_STEERING_ELIGIBLE_TAGS,
  DEMAND_MULT,
  EngineError,
  REROLL_COST,
  TAG_SYNERGY_ELIGIBLE_TAGS,
  TAG_SYNERGY_LADDER,
  buildSteeringEnabled,
  createRun,
  dispatch as engineDispatch,
  hashState,
  sellPrice,
  tagSynergyEnabled,
} from '../sim';
import type { EngineDeps } from '../sim';
import type { LoadActiveRunStatus, RunPersistence } from '../persistence';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'failed';

export interface RejectedAction {
  action: Action;
  message: string;
}

export type DispatchResult =
  | { accepted: true; gameState: GameState; save: Promise<void> }
  | { accepted: false; rejected: RejectedAction };

export interface RunStoreState {
  gameState: GameState;
  loadStatus: LoadActiveRunStatus | 'idle' | 'loading';
  saveStatus: SaveStatus;
  lastRejectedAction: RejectedAction | null;
  rejectedActionCount: number;
  lastSaveError: string | null;
  startNewRun(seed?: string): { gameState: GameState; save: Promise<void> };
  startFreshRun(seed?: string): { gameState: GameState; save: Promise<void> };
  continueRun(seedForFallback?: string): Promise<GameState>;
  dispatchAction(action: Action): DispatchResult;
  clearActiveRun(): Promise<void>;
}

/** Item table for selectors that resolve definitions (sell pricing). Module-level
 *  so pure `(state) => …` selectors can reach it without threading deps. */
const selectorItemTable = loadItemTable();

/** Dominant eligible tag on the shelf and its active ladder multiplier, or null.
 *  Moved out of the run screen so the "food shelf ×N" signpost is one source. */
function dominantSynergy(shelf: GameState['shelf']): SynergyHudView | null {
  const eligible = new Set(TAG_SYNERGY_ELIGIBLE_TAGS);
  const counts = new Map<string, number>();
  for (const slot of shelf.slots) {
    if (!slot.item) continue;
    for (const tag of slot.item.tags) if (eligible.has(tag)) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }
  let best: { tag: string; count: number } | null = null;
  for (const [tag, count] of counts) if (!best || count > best.count) best = { tag, count };
  if (!best) return null;
  let mult = 1;
  for (const step of TAG_SYNERGY_LADDER) if (best.count >= step.minCount) mult = step.mult;
  return mult > 1 ? { tag: best.tag, count: best.count, mult } : null;
}

/** A sellable shelf slot with its computed sell-back price. */
export interface SellSlotView {
  slot: Slot;
  item: ItemInstance;
  price: number;
}

/** The dominant tag-synergy / today's-order signpost for the HUD, or null when off
 *  / not active. Keeps the "what am I building" logic in the store, not the screen. */
export interface SynergyHudView {
  tag: string;
  count: number;
  mult: number;
}

export interface OrderHudView {
  tag: string;
  count: number;
  mult: number;
  have: number;
  met: boolean;
}

export const runSelectors = {
  gameState: (state: RunStoreState) => state.gameState,
  shelf: (state: RunStoreState) => state.gameState.shelf,
  coins: (state: RunStoreState) => state.gameState.coins,
  day: (state: RunStoreState) => state.gameState.day,
  rent: (state: RunStoreState) => state.gameState.rent,
  moves: (state: RunStoreState) => state.gameState.moves,
  phase: (state: RunStoreState) => state.gameState.phase,
  offers: (state: RunStoreState) => state.gameState.currentOffers,
  signatureOffers: (state: RunStoreState) =>
    state.gameState.currentOffers.filter((offer) => isSignatureItem(offer.item)),
  isSignatureOffer: (offerId: string) => (state: RunStoreState) =>
    state.gameState.currentOffers.some(
      (offer) => offer.offerId === offerId && isSignatureItem(offer.item),
    ),
  lastScoringTrace: (state: RunStoreState) => state.gameState.lastScoringTrace,
  // Build steering (Phase 2b): the eligible supplier tags when the opening
  // delivery is waiting for a lean (flag on, none chosen yet), else null. The
  // UI reads this rather than importing the sim constant across the lane line.
  pendingSupplierTags: (state: RunStoreState): readonly string[] | null =>
    buildSteeringEnabled() &&
    state.gameState.phase === 'delivery' &&
    state.gameState.supplierTag === null
      ? BUILD_STEERING_ELIGIBLE_TAGS
      : null,
  lastRejectedAction: (state: RunStoreState) => state.lastRejectedAction,
  rejectedActionCount: (state: RunStoreState) => state.rejectedActionCount,
  saveStatus: (state: RunStoreState) => state.saveStatus,
} as const;

/**
 * View-model builders — pure functions of GameState, so screens `useMemo` them
 * over the relevant slice instead of reaching into sim/economy/item internals.
 * (Kept out of `runSelectors` because they return fresh objects; subscribing to
 * them directly would re-render on every store change — memoize in the screen.)
 */

/** Reroll price for the daily shop (economy constant, surfaced via the boundary). */
export const rerollCost = REROLL_COST;

/** Occupied shelf slots with their computed sell-back price, for the sell view. */
export function sellShelfView(gameState: GameState): SellSlotView[] {
  return gameState.shelf.slots
    .filter((slot): slot is typeof slot & { item: ItemInstance } => slot.item !== null)
    .map((slot) => ({
      slot: slot.slot,
      item: slot.item,
      price: sellPrice(slot.item.baseValue, itemDefinition(selectorItemTable, slot.item.itemId)),
    }));
}

/** Active tag-synergy signpost (dominant eligible tag + ladder mult), or null. */
export function synergyHudView(gameState: GameState): SynergyHudView | null {
  if (!tagSynergyEnabled()) return null;
  return dominantSynergy(gameState.shelf);
}

/** Today's-Order signpost with live shelf progress, or null when no order. */
export function orderHudView(gameState: GameState): OrderHudView | null {
  const order = gameState.dailyOrder;
  if (!order) return null;
  const have = gameState.shelf.slots.filter((slot) => slot.item?.tags.includes(order.tag)).length;
  return { tag: order.tag, count: order.count, mult: DEMAND_MULT, have, met: have >= order.count };
}

interface RunStoreOptions {
  deps?: EngineDeps;
  persistence?: RunPersistence;
  seedFactory?: () => string;
  initialState?: GameState;
}

const defaultDeps: EngineDeps = { table: loadItemTable(), combos: loadCombos() };

let cachedDefaultPersistence: Promise<RunPersistence> | null = null;

async function defaultPersistence(): Promise<RunPersistence> {
  cachedDefaultPersistence ??= import('../persistence/asyncStorage').then(
    (module) => module.asyncStorageRunPersistence,
  );
  return cachedDefaultPersistence;
}

function defaultSeed(): string {
  return `local-${Date.now()}`;
}

function isEngineError(error: unknown): error is EngineError {
  return error instanceof EngineError || (error instanceof Error && error.name === 'EngineError');
}

export function createRunStore(options: RunStoreOptions = {}) {
  const deps = options.deps ?? defaultDeps;
  const seedFactory = options.seedFactory ?? defaultSeed;
  const getPersistence = async () => options.persistence ?? defaultPersistence();
  const initialState = options.initialState ?? createRun(seedFactory(), deps);

  return create<RunStoreState>()((set, get) => {
    const saveActiveRun = (gameState: GameState): Promise<void> => {
      set({ saveStatus: 'saving', lastSaveError: null });
      const save = getPersistence()
        .then((persistence) => persistence.saveActiveRun(gameState))
        .then(
          () => set({ saveStatus: 'saved', lastSaveError: null }),
          (error: unknown) => {
            set({
              saveStatus: 'failed',
              lastSaveError: error instanceof Error ? error.message : String(error),
            });
            throw error;
          },
        );
      return save;
    };

    const setRun = (gameState: GameState): { gameState: GameState; save: Promise<void> } => {
      set({ gameState, lastRejectedAction: null });
      return { gameState, save: saveActiveRun(gameState) };
    };

    return {
      gameState: initialState,
      loadStatus: 'idle',
      saveStatus: 'idle',
      lastRejectedAction: null,
      rejectedActionCount: 0,
      lastSaveError: null,

      startNewRun(seed) {
        return setRun(createRun(seed ?? seedFactory(), deps));
      },

      startFreshRun(seed) {
        return setRun(createRun(seed ?? seedFactory(), deps));
      },

      async continueRun(seedForFallback) {
        set({ loadStatus: 'loading', lastRejectedAction: null });
        const fallback = createRun(seedForFallback ?? seedFactory(), deps);
        const result = await (await getPersistence()).loadActiveRun(fallback);
        set({ gameState: result.gameState, loadStatus: result.status });
        return result.gameState;
      },

      dispatchAction(action) {
        const before = get().gameState;
        try {
          const next = engineDispatch(before, action, deps);
          return { accepted: true, ...setRun(next) };
        } catch (error: unknown) {
          if (!isEngineError(error)) throw error;
          const rejected = { action, message: error.message };
          set((state) => ({
            lastRejectedAction: rejected,
            rejectedActionCount: state.rejectedActionCount + 1,
            gameState: before,
          }));
          return { accepted: false, rejected };
        }
      },

      async clearActiveRun() {
        await (await getPersistence()).clearActiveRun();
      },
    };
  });
}

export function hashRunStoreState(state: RunStoreState): string {
  return hashState(state.gameState);
}

export const useRunStore = createRunStore();
