import { create } from 'zustand';

import {
  type Action,
  type GameState,
  type ItemDefinition,
  type ItemInstance,
  type Slot,
  toSlotKey,
} from '../contracts';
import { isSignatureItem, itemDefinition, loadCombos, loadItemTable } from '../items';
import {
  allUnlockableItemIds,
  alwaysUnlockedItemIds,
  DEMAND_MULT,
  EngineError,
  REROLL_COST,
  TAG_SYNERGY_ELIGIBLE_TAGS,
  TAG_SYNERGY_LADDER,
  createRun,
  dispatch as engineDispatch,
  hashState,
  sellPrice,
  tagSynergyEnabled,
  unlockLadderEnabled,
  unlockedItemIds as catalogUnlockedItemIds,
} from '../sim';
import type { CreateRunOptions, EngineDeps } from '../sim';
import { uiAffordances, type UiActionOfType } from '../sim/uiAffordances';
import type { LoadActiveRunStatus, RunPersistence } from '../persistence';
import { useCatalogStore, type CatalogStoreState } from './catalogStore';
import { isDailySeed } from './dailyStore';

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

/** Dominant eligible tag on the shelf: which build the player is leaning into,
 *  the count on theme, and where they sit on the synergy ladder. Null only when
 *  no eligible-tag item is on the shelf yet. */
function dominantBuild(shelf: GameState['shelf']): { tag: string; count: number } | null {
  const eligible = new Set(TAG_SYNERGY_ELIGIBLE_TAGS);
  const counts = new Map<string, number>();
  for (const slot of shelf.slots) {
    if (!slot.item) continue;
    for (const tag of slot.item.tags) if (eligible.has(tag)) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }
  let best: { tag: string; count: number } | null = null;
  for (const [tag, count] of counts) if (!best || count > best.count) best = { tag, count };
  return best;
}

/** A sellable shelf slot with its computed sell-back price. */
export interface SellSlotView {
  slot: Slot;
  item: ItemInstance;
  price: number;
}

/** The run's build identity for the HUD hero signpost: the leaned-into tag, how
 *  many items are on theme, the multiplier that count currently earns, and the
 *  next ladder tier to chase (null when maxed). `active` = the mult is already
 *  above ×1. Null when synergy is off or the shelf has no eligible items. */
export interface BuildIdentityView {
  tag: string;
  count: number;
  mult: number;
  active: boolean;
  next: { count: number; mult: number } | null;
}

export interface OrderHudView {
  tag: string;
  count: number;
  mult: number;
  have: number;
  met: boolean;
}

export interface DraftAffordanceView {
  chooseSupplierActions: readonly UiActionOfType<'chooseSupplier'>[];
  draftActions: readonly UiActionOfType<'draftItem'>[];
  pendingSupplierTags: readonly string[] | null;
}

export interface ArrangeAffordanceView {
  placeActions: readonly UiActionOfType<'placeItem'>[];
  sellActions: readonly UiActionOfType<'sellItem'>[];
  openShopAction: UiActionOfType<'openShop'> | null;
  primaryAction: { label: string; action: UiActionOfType<'openShop'> } | null;
}

export interface RestockAffordanceView {
  placeActions: readonly UiActionOfType<'placeItem'>[];
  buyActions: readonly UiActionOfType<'buyOffer'>[];
  rerollAction: UiActionOfType<'reroll'> | null;
  sellActions: readonly UiActionOfType<'sellItem'>[];
  endRestockAction: UiActionOfType<'endRestock'> | null;
}

function actionsOfType<T extends Action['type']>(
  actions: readonly Action[],
  type: T,
): UiActionOfType<T>[] {
  return actions.filter((action): action is UiActionOfType<T> => action.type === type);
}

function firstActionOfType<T extends Action['type']>(
  actions: readonly Action[],
  type: T,
): UiActionOfType<T> | null {
  return actionsOfType(actions, type)[0] ?? null;
}

export function draftAffordanceView(gameState: GameState): DraftAffordanceView {
  const actions = uiAffordances(gameState);
  const chooseSupplierActions = actionsOfType(actions, 'chooseSupplier');
  return {
    chooseSupplierActions,
    draftActions: actionsOfType(actions, 'draftItem'),
    pendingSupplierTags:
      chooseSupplierActions.length > 0 ? chooseSupplierActions.map((action) => action.tag) : null,
  };
}

export function arrangeAffordanceView(gameState: GameState): ArrangeAffordanceView {
  const actions = uiAffordances(gameState);
  const openShopAction = firstActionOfType(actions, 'openShop');
  return {
    placeActions: actionsOfType(actions, 'placeItem'),
    sellActions: actionsOfType(actions, 'sellItem'),
    openShopAction,
    primaryAction: openShopAction ? { label: 'Open Shop', action: openShopAction } : null,
  };
}

export function restockAffordanceView(gameState: GameState): RestockAffordanceView {
  const actions = uiAffordances(gameState);
  return {
    placeActions: actionsOfType(actions, 'placeItem'),
    buyActions: actionsOfType(actions, 'buyOffer'),
    rerollAction: firstActionOfType(actions, 'reroll'),
    sellActions: actionsOfType(actions, 'sellItem'),
    endRestockAction: firstActionOfType(actions, 'endRestock'),
  };
}

type SlotAffordanceAction = UiActionOfType<'placeItem'> | UiActionOfType<'sellItem'>;

export function slotActionFor<T extends SlotAffordanceAction>(
  actions: readonly T[],
  slot: Slot,
): T | null {
  const key = toSlotKey(slot);
  return actions.find((action) => toSlotKey(action.slot) === key) ?? null;
}

export function hasSlotAction<T extends SlotAffordanceAction>(
  actions: readonly T[],
  slot: Slot,
): boolean {
  return slotActionFor(actions, slot) !== null;
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
    draftAffordanceView(state.gameState).pendingSupplierTags,
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
      // Mirror the engine's run-scoped loopV2 read so the shown price is the paid price.
      price: sellPrice(
        slot.item.baseValue,
        itemDefinition(selectorItemTable, slot.item.itemId),
        gameState.loopV2 === true,
      ),
    }));
}

/** Build-identity signpost: which shelf the player is making + its live payoff. */
export function buildIdentityView(gameState: GameState): BuildIdentityView | null {
  if (!tagSynergyEnabled()) return null;
  const best = dominantBuild(gameState.shelf);
  if (!best) return null;
  let mult = 1;
  let next: { count: number; mult: number } | null = null;
  for (const step of TAG_SYNERGY_LADDER) {
    if (best.count >= step.minCount) mult = step.mult;
    else if (!next) next = { count: step.minCount, mult: step.mult };
  }
  return { tag: best.tag, count: best.count, mult, active: mult > 1, next };
}

/** Daily-shop header context so the restock screen reads as a shop with a budget
 *  and buying capacity, not a plain list. `isDailyShop` = the v2 daily loop. */
export interface ShopHeaderView {
  isDailyShop: boolean;
  day: number;
  coins: number;
  spotsOpen: number;
}

export function shopHeaderView(gameState: GameState): ShopHeaderView {
  const spotsOpen = gameState.shelf.slots.filter((slot) => slot.item === null).length;
  return {
    isDailyShop: gameState.loopV2 === true,
    day: gameState.day,
    coins: gameState.coins,
    spotsOpen,
  };
}

/** One-line plain-English effect for a signature item (Phase 2c run-defining
 *  stock), or null if the item isn't signature. Keeps scoring-rule vocabulary in
 *  the store so the shop screen can badge signatures without reading scoring. */
export function signatureBlurb(item: ItemDefinition): string | null {
  if (!isSignatureItem(item)) return null;
  for (const rule of item.rules) {
    switch (rule.kind) {
      case 'tagFilteredShelfMultiplier':
        return `×${rule.mult} to every ${rule.tag} on your shelf`;
      case 'flatPerTagCount':
        return `+${rule.flatPerItem} for each ${rule.tag} on your shelf`;
      case 'copyHighestScoringOther':
        return 'Scores a copy of your best other item';
      case 'shelfMultiplierIfAnyTagCount':
        return `×${rule.mult} to the shelf with ${rule.minCount}+ of one tag`;
      case 'highestBaseValueMultiplier':
        return `×${rule.mult} to your most valuable item`;
      default:
        break;
    }
  }
  return 'Run-defining signature stock';
}

/** Below this coins-to-spare margin, the run's tightest rent payment reads as a
 *  near-miss worth dramatizing on the summary. Kept in the view-model layer so
 *  the screen never reaches into economy/sim for the threshold. */
export const NEAR_MISS_MARGIN = 5;

/** Near-miss drama for the summary: the tightest coins-to-spare margin the run
 *  cleared rent by, but only when it was a genuine squeaker (≤ NEAR_MISS_MARGIN).
 *  Null when the run never paid rent (field absent) or always paid comfortably. */
export function nearMissView(gameState: GameState): { coinsToSpare: number } | null {
  const margin = gameState.runStats.closestRentMargin;
  if (margin === undefined || margin > NEAR_MISS_MARGIN) return null;
  return { coinsToSpare: margin };
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
  catalogSnapshot?: () => Pick<CatalogStoreState, 'catalog' | 'loadStatus'>;
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

function createRunOptionsFromCatalog(
  seed: string,
  snapshot: Pick<CatalogStoreState, 'catalog' | 'loadStatus'>,
): CreateRunOptions {
  if (!unlockLadderEnabled()) return {};
  // Fable graduation gate (A-M7 review): DAILY seeds always use the canonical
  // FULL ladder pool — never personal unlocks — so the whole world plays the
  // identical shelf and {seed, actions} ghosts/leaderboards stay comparable.
  // Passed explicitly (not omitted): the engine defaults an absent option to
  // the starter set, and an explicit snapshot keeps old daily replays stable
  // even if the ladder table changes later.
  if (isDailySeed(seed)) return { unlockedItemIds: allUnlockableItemIds() };
  if (snapshot.loadStatus === 'idle' || snapshot.loadStatus === 'loading') {
    return { unlockedItemIds: alwaysUnlockedItemIds() };
  }
  return { unlockedItemIds: catalogUnlockedItemIds(snapshot.catalog) };
}

export function createRunStore(options: RunStoreOptions = {}) {
  const deps = options.deps ?? defaultDeps;
  const seedFactory = options.seedFactory ?? defaultSeed;
  const getPersistence = async () => options.persistence ?? defaultPersistence();
  const getCatalogSnapshot = options.catalogSnapshot ?? (() => useCatalogStore.getState());
  const createRunFromCatalog = (seed: string): GameState =>
    createRun(seed, deps, createRunOptionsFromCatalog(seed, getCatalogSnapshot()));
  const initialState = options.initialState ?? createRunFromCatalog(seedFactory());

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
        return setRun(createRunFromCatalog(seed ?? seedFactory()));
      },

      startFreshRun(seed) {
        return setRun(createRunFromCatalog(seed ?? seedFactory()));
      },

      async continueRun(seedForFallback) {
        set({ loadStatus: 'loading', lastRejectedAction: null });
        const fallback = createRunFromCatalog(seedForFallback ?? seedFactory());
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
