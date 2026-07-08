import type {
  Action,
  DailyOrder,
  DeliveryOffer,
  GameState,
  ItemInstance,
  Slot,
} from '../contracts';
import { ContractSchemaVersion, toSlotKey } from '../contracts';
import type { ItemTable, NamedCombo } from '../items';
import { itemDefinition } from '../items';

import {
  BUILD_STEERING_ELIGIBLE_TAGS,
  DEMAND_COUNT,
  DEMAND_ENABLED,
  DEMAND_TAG_POOL,
  FREE_MOVES_PER_DAY,
  RENT_PERIOD_DAYS,
  REROLL_COST,
  SPOTLIGHT_ENABLED,
  SHELF_EXPANSION_COST,
  STARTING_RENT,
  buildSteeringEnabled,
  day2StarterEnabled,
  dailyGoalTarget,
  generateOffers,
  goalLadderEnabled,
  isBuildSteeringTag,
  loopV2Enabled,
  nextRentAmount,
  paidMoveCost,
  sellPrice,
  shelfExpansionEnabled,
  startingCoins,
  unlockLadderEnabled,
} from './economy';
import { buildSlotMap, occupiedNeighbors, rowMajorSlots, slotStateAt } from './grid';
import { rngFor } from './rng';
import { resolveOpenShop } from './scoring';
import { alwaysUnlockedItemIds } from './unlocks';

/**
 * PROTOTYPE (Front Window): the day's spotlight slot, chosen deterministically
 * from (seed + day) so it fits the replay/trace model — no RNG cursor in state.
 * Returns null when the flag is off, which keeps GameState.spotlight absent and
 * scoring unchanged.
 */
export function pickSpotlight(seed: string, day: number, size: { rows: number; cols: number }): Slot | null {
  if (!SPOTLIGHT_ENABLED) return null;
  return rngFor(seed, 'spotlight', day).pick(rowMajorSlots(size));
}

/**
 * PROTOTYPE (Today's Order): the collection demand, chosen deterministically from
 * (seed + rent cycle) so it HOLDS FOR THE WHOLE 3-day rent cycle. Keying on the
 * day made it re-roll faster than one draft/day could fill it — an unfillable
 * goal at any magnitude; keying on the cycle turns it into a real multi-delivery
 * chase. Null when the flag is off, keeping GameState.dailyOrder absent and
 * scoring unchanged.
 */
export function pickCycleOrder(seed: string, cycle: number): DailyOrder | null {
  if (!DEMAND_ENABLED || DEMAND_TAG_POOL.length === 0) return null;
  return { tag: rngFor(seed, 'order', cycle).pick(DEMAND_TAG_POOL), count: DEMAND_COUNT };
}

/**
 * The dispatcher: `dispatch(state, action) → GameState` is the only mutation
 * surface (kickoff §4). Pure — the input state is never modified; illegal
 * actions throw EngineError so bots and the UI can distinguish bugs from
 * disallowed moves.
 */

export class EngineError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EngineError';
  }
}

export interface EngineDeps {
  table: ItemTable;
  combos: readonly NamedCombo[];
}

export interface CreateRunOptions {
  unlockedItemIds?: readonly string[];
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function instantiate(offer: DeliveryOffer, deps: EngineDeps): ItemInstance {
  const definition = itemDefinition(deps.table, offer.item.id);
  const countdownRule = definition.rules.find((rule) => rule.kind === 'countdownVanish');
  return {
    instanceId: `${offer.offerId}-inst`,
    itemId: definition.id,
    name: definition.name,
    tier: definition.tier,
    baseValue: definition.baseValue,
    tags: [...definition.tags],
    state: {
      ageDays: 0,
      growthDays: 0,
      countdown: countdownRule?.kind === 'countdownVanish' ? countdownRule.days : null,
      sticky: false,
      blocked: definition.rules.some((rule) => rule.kind === 'blocksSlot'),
      transformedFromItemId: null,
    },
  };
}

function sortedUnique(values: readonly string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

function runUnlockedItemIds(state: GameState): readonly string[] | undefined {
  return state.unlockedItemIds;
}

export function createRun(seed: string, deps: EngineDeps, options: CreateRunOptions = {}): GameState {
  const unlockedForRun = unlockLadderEnabled()
    ? sortedUnique(options.unlockedItemIds ?? alwaysUnlockedItemIds())
    : undefined;
  const state: GameState = {
    schemaVersion: ContractSchemaVersion,
    runId: `run-${seed}`,
    seed,
    phase: 'delivery',
    day: 1,
    coins: startingCoins(),
    shelf: {
      size: { rows: 3, cols: 4 },
      slots: rowMajorSlots({ rows: 3, cols: 4 }).map((slot) => ({ slot, item: null })),
    },
    rent: { amount: STARTING_RENT, dueInDays: RENT_PERIOD_DAYS, cycle: 1 },
    moves: { freeRemaining: FREE_MOVES_PER_DAY, paidMoveCost: paidMoveCost(1) },
    currentOffers: generateOffers(
      seed,
      1,
      'delivery',
      deps.table,
      '',
      null,
      loopV2Enabled(),
      unlockedForRun,
    ),
    heldItem: null,
    lastScoringTrace: null,
    runStats: {
      totalCoinsEarned: 0,
      deepestRentSurvived: 0,
      daysSurvived: 0,
      bestDayTotal: 0,
      bestComboIds: [],
    },
    catalogDelta: { discoveredItemIds: [], discoveredComboIds: [] },
    spotlight: pickSpotlight(seed, 1, { rows: 3, cols: 4 }),
    dailyOrder: pickCycleOrder(seed, 1),
  };
  if (unlockedForRun) state.unlockedItemIds = unlockedForRun;
  // Pin the loop mode to this run for its whole lifetime. Only set when enabled,
  // so an OFF-path run leaves the field undefined → stableStringify drops it →
  // determinism pin + M0 goldens stay byte-identical.
  if (loopV2Enabled()) state.loopV2 = true;
  if (buildSteeringEnabled()) state.supplierTag = null;
  if (goalLadderEnabled(runLoopV2(state))) {
    state.dailyTarget = dailyGoalTarget(state.day);
    state.freeRerollTokens = 0;
  }
  return state;
}

function requirePhase(state: GameState, ...phases: GameState['phase'][]): void {
  if (!phases.includes(state.phase)) {
    throw new EngineError(`Action not legal in phase ${state.phase}.`);
  }
}

function addUnique(list: string[], values: readonly string[]): string[] {
  const merged = new Set(list);
  for (const value of values) merged.add(value);
  return [...merged];
}

function occupiedSlotCount(state: GameState): number {
  return state.shelf.slots.filter((entry) => entry.item !== null).length;
}

/**
 * A run's loop mode is snapshotted onto `state.loopV2` at creation (see createRun),
 * so every dispatch reads the value the run STARTED under — flipping LOOP_V2_ENABLED
 * mid-session (hot reload / fuzz) can't split a run into a half-v1/half-v2 state.
 * Strict `=== true`: an older save / v1 run (field absent) stays v1 regardless of env.
 */
function runLoopV2(state: GameState): boolean {
  return state.loopV2 === true;
}

function canExpandShelf(state: GameState): boolean {
  return (
    shelfExpansionEnabled(runLoopV2(state)) &&
    (state.phase === 'arrange' || state.phase === 'restock') &&
    state.heldItem === null &&
    state.shelf.size.rows < 4 &&
    state.coins >= SHELF_EXPANSION_COST
  );
}

function isLoopV2StarterPlacement(state: GameState): boolean {
  return (
    runLoopV2(state) &&
    state.phase === 'arrange' &&
    state.day === 1 &&
    state.runStats.daysSurvived === 0 &&
    state.currentOffers.length === 0 &&
    state.heldItem === null &&
    occupiedSlotCount(state) === 1
  );
}

function isDay2StarterPlacement(state: GameState): boolean {
  return (
    day2StarterEnabled(runLoopV2(state)) &&
    state.phase === 'arrange' &&
    state.day === 2 &&
    state.runStats.daysSurvived === 1 &&
    state.currentOffers.length === 0 &&
    state.heldItem === null
  );
}

function supplierTagForOffers(state: GameState): string | null {
  return buildSteeringEnabled() ? (state.supplierTag ?? null) : null;
}

function freeRerollTokens(state: GameState): number {
  return goalLadderEnabled(runLoopV2(state)) ? (state.freeRerollTokens ?? 0) : 0;
}

function canChooseSupplier(state: GameState): boolean {
  return (
    buildSteeringEnabled() &&
    state.phase === 'delivery' &&
    state.day === 1 &&
    state.runStats.daysSurvived === 0 &&
    state.supplierTag == null
  );
}

export function dispatch(state: GameState, action: Action, deps: EngineDeps): GameState {
  if (state.phase === 'gameOver') {
    throw new EngineError('Run is over.');
  }
  const next = clone(state);

  switch (action.type) {
    case 'chooseSupplier': {
      requirePhase(next, 'delivery');
      if (!buildSteeringEnabled()) throw new EngineError('Build steering is disabled.');
      if (!canChooseSupplier(next)) {
        throw new EngineError('Supplier can only be chosen once at run start.');
      }
      if (!isBuildSteeringTag(action.tag)) {
        throw new EngineError(`Supplier tag ${action.tag} is not eligible for build steering.`);
      }
      next.supplierTag = action.tag;
      next.currentOffers = generateOffers(
        next.seed,
        next.day,
        'delivery',
        deps.table,
        '',
        action.tag,
        runLoopV2(next),
        runUnlockedItemIds(next),
      );
      return next;
    }

    case 'draftItem': {
      requirePhase(next, 'delivery');
      if (canChooseSupplier(next)) {
        throw new EngineError('Choose a supplier before drafting.');
      }
      const offer = next.currentOffers[action.offerIndex];
      if (!offer) throw new EngineError(`No offer at index ${action.offerIndex}.`);
      next.heldItem = instantiate(offer, deps);
      next.currentOffers = [];
      next.phase = 'arrange';
      return next;
    }

    case 'placeItem': {
      requirePhase(next, 'arrange', 'restock');
      if (!next.heldItem) throw new EngineError('No held item to place.');
      const slotState = slotStateAt(buildSlotMap(next.shelf), action.slot);
      if (!slotState) throw new EngineError(`Slot ${toSlotKey(action.slot)} is off the shelf.`);
      if (slotState.item) throw new EngineError(`Slot ${toSlotKey(action.slot)} is occupied.`);
      slotState.item = next.heldItem;
      next.heldItem = null;
      if (isLoopV2StarterPlacement(next)) {
        next.phase = 'restock';
        next.currentOffers = generateOffers(
          next.seed,
          next.day,
          'restock',
          deps.table,
          '',
          supplierTagForOffers(next),
          runLoopV2(next),
          runUnlockedItemIds(next),
        );
      } else if (isDay2StarterPlacement(next)) {
        next.phase = 'restock';
        next.currentOffers = generateOffers(
          next.seed,
          next.day,
          'restock',
          deps.table,
          '',
          supplierTagForOffers(next),
          runLoopV2(next),
          runUnlockedItemIds(next),
        );
      }
      return next;
    }

    case 'moveItem': {
      requirePhase(next, 'arrange', 'restock');
      const map = buildSlotMap(next.shelf);
      const from = slotStateAt(map, action.from);
      const to = slotStateAt(map, action.to);
      if (!from?.item) throw new EngineError(`No item at ${toSlotKey(action.from)}.`);
      if (!to) throw new EngineError(`Slot ${toSlotKey(action.to)} is off the shelf.`);
      if (to.item) throw new EngineError(`Slot ${toSlotKey(action.to)} is occupied.`);
      if (from.item.state.sticky) throw new EngineError('Sticky items cannot be moved.');
      if (next.moves.freeRemaining > 0) {
        next.moves.freeRemaining -= 1;
      } else if (next.coins >= next.moves.paidMoveCost) {
        next.coins -= next.moves.paidMoveCost;
      } else {
        throw new EngineError('No free moves left and not enough coins for a paid move.');
      }
      to.item = from.item;
      from.item = null;
      return next;
    }

    case 'sellItem': {
      requirePhase(next, 'arrange', 'restock');
      const slotState = slotStateAt(buildSlotMap(next.shelf), action.slot);
      if (!slotState?.item) throw new EngineError(`No item at ${toSlotKey(action.slot)}.`);
      const definition = itemDefinition(deps.table, slotState.item.itemId);
      next.coins += sellPrice(slotState.item.baseValue, definition, runLoopV2(next));
      slotState.item = null;
      return next;
    }

    case 'openShop': {
      requirePhase(next, 'arrange');
      if (next.heldItem) throw new EngineError('Place the held item before opening the shop.');

      const result = resolveOpenShop(next, deps.table, deps.combos);
      const scoredDay = next.day;
      next.lastScoringTrace = result.trace;
      next.coins += result.dayTotal;
      next.shelf = result.shelfAfter;

      next.runStats.totalCoinsEarned += result.dayTotal;
      next.runStats.bestDayTotal = Math.max(next.runStats.bestDayTotal, result.dayTotal);
      next.runStats.daysSurvived = scoredDay;
      next.runStats.bestComboIds = addUnique(next.runStats.bestComboIds, result.discoveredComboIds);

      if (goalLadderEnabled(runLoopV2(next))) {
        const target = next.dailyTarget ?? dailyGoalTarget(scoredDay);
        const targetMet = result.dayTotal >= target;
        next.dailyTargetResult = {
          day: scoredDay,
          target,
          dayTotal: result.dayTotal,
          targetMet,
          rewardKind: 'freeReroll',
          rewardGranted: targetMet,
        };
        next.freeRerollTokens = targetMet ? 1 : 0;
      }

      const shelfItemIds = next.shelf.slots
        .map((entry) => entry.item?.itemId)
        .filter((id): id is string => Boolean(id));
      next.catalogDelta.discoveredItemIds = addUnique(
        next.catalogDelta.discoveredItemIds,
        shelfItemIds,
      );
      next.catalogDelta.discoveredComboIds = addUnique(
        next.catalogDelta.discoveredComboIds,
        result.discoveredComboIds,
      );

      // Rent sawtooth.
      next.rent.dueInDays -= 1;
      if (next.rent.dueInDays === 0) {
        if (next.coins < next.rent.amount) {
          next.phase = 'gameOver';
          return next;
        }
        next.coins -= next.rent.amount;
        next.runStats.deepestRentSurvived = next.rent.cycle;
        // B-M4 near-miss drama: coins left after clearing rent = "coins to spare".
        // Track the tightest such margin across the run for the summary line. Only
        // written on a successful payment, so the OFF-path pin/goldens are safe.
        next.runStats.closestRentMargin =
          next.runStats.closestRentMargin === undefined
            ? next.coins
            : Math.min(next.runStats.closestRentMargin, next.coins);
        next.rent.amount = nextRentAmount(next.rent.amount, next.rent.cycle, runLoopV2(next));
        next.rent.cycle += 1;
        next.rent.dueInDays = RENT_PERIOD_DAYS;
      }

      // Day rollover: aging, growth, countdowns (freeze R-8).
      const map = buildSlotMap(next.shelf);
      const preserved = new Set<string>();
      for (const entry of next.shelf.slots) {
        if (!entry.item) continue;
        for (const rule of itemDefinition(deps.table, entry.item.itemId).rules) {
          if (rule.kind !== 'grantsAdjacent' || !rule.preventsAging) continue;
          for (const neighbor of occupiedNeighbors(map, entry.slot, next.shelf.size)) {
            const target = neighbor.item;
            if (!target) continue;
            if (rule.target && !(rule.target.kind === 'tag' ? target.tags.includes(rule.target.tag) : target.itemId === rule.target.itemId)) {
              continue;
            }
            preserved.add(toSlotKey(neighbor.slot));
          }
        }
      }
      for (const entry of next.shelf.slots) {
        const item = entry.item;
        if (!item) continue;
        const rules = itemDefinition(deps.table, item.itemId).rules;
        const isPreserved = preserved.has(toSlotKey(entry.slot));
        for (const rule of rules) {
          if (rule.kind === 'agesDaily' && !isPreserved) {
            item.baseValue += rule.flatPerDay;
            if (rule.minValue !== undefined) item.baseValue = Math.max(rule.minValue, item.baseValue);
            if (rule.maxValue !== undefined) item.baseValue = Math.min(rule.maxValue, item.baseValue);
            item.state.ageDays += 1;
          } else if (rule.kind === 'growsEachDay') {
            item.state.growthDays += 1;
          }
        }
        if (item.state.countdown !== null && item.state.countdown > 0) {
          item.state.countdown -= 1;
        }
      }

      next.day = scoredDay + 1;
      if (goalLadderEnabled(runLoopV2(next))) {
        next.dailyTarget = dailyGoalTarget(next.day);
      }
      next.spotlight = pickSpotlight(next.seed, next.day, next.shelf.size);
      // Order is keyed on the (already-updated) rent cycle, so it stays fixed
      // across the cycle's 3 deliveries and only rotates when rent resets.
      next.dailyOrder = pickCycleOrder(next.seed, next.rent.cycle);
      next.moves = {
        freeRemaining: FREE_MOVES_PER_DAY,
        paidMoveCost: paidMoveCost(next.rent.cycle),
      };

      if (day2StarterEnabled(runLoopV2(next)) && scoredDay === 1) {
        next.phase = 'delivery';
        next.currentOffers = generateOffers(
          next.seed,
          next.day,
          'delivery',
          deps.table,
          '',
          supplierTagForOffers(next),
          runLoopV2(next),
          runUnlockedItemIds(next),
        );
      } else if (runLoopV2(next)) {
        next.phase = 'restock';
        next.currentOffers = generateOffers(
          next.seed,
          next.day,
          'restock',
          deps.table,
          '',
          supplierTagForOffers(next),
          runLoopV2(next),
          runUnlockedItemIds(next),
        );
      } else if (scoredDay % 3 === 0) {
        next.phase = 'restock';
        next.currentOffers = generateOffers(
          next.seed,
          next.day,
          'restock',
          deps.table,
          '',
          supplierTagForOffers(next),
          runLoopV2(next),
          runUnlockedItemIds(next),
        );
      } else {
        next.phase = 'delivery';
        next.currentOffers = generateOffers(
          next.seed,
          next.day,
          'delivery',
          deps.table,
          '',
          supplierTagForOffers(next),
          runLoopV2(next),
          runUnlockedItemIds(next),
        );
      }
      return next;
    }

    case 'expandShelf': {
      requirePhase(next, 'arrange', 'restock');
      if (!shelfExpansionEnabled(runLoopV2(next))) {
        throw new EngineError('Shelf expansion is disabled.');
      }
      if (next.heldItem) {
        throw new EngineError('Place the held item before expanding the shelf.');
      }
      if (next.shelf.size.rows >= 4) {
        throw new EngineError('Shelf is already fully expanded.');
      }
      if (next.coins < SHELF_EXPANSION_COST) {
        throw new EngineError('Not enough coins to expand the shelf.');
      }

      const newRow = next.shelf.size.rows;
      const cols = next.shelf.size.cols;
      next.coins -= SHELF_EXPANSION_COST;
      next.shelf.size.rows = newRow + 1;
      for (let col = 0; col < cols; col += 1) {
        next.shelf.slots.push({ slot: { row: newRow, col }, item: null });
      }
      return next;
    }

    case 'buyOffer': {
      requirePhase(next, 'restock');
      if (next.heldItem) throw new EngineError('Place the held item before buying again.');
      const offer = next.currentOffers[action.offerIndex];
      if (!offer) throw new EngineError(`No offer at index ${action.offerIndex}.`);
      if (next.coins < offer.cost) throw new EngineError('Not enough coins for this offer.');
      next.coins -= offer.cost;
      next.heldItem = instantiate(offer, deps);
      next.currentOffers = next.currentOffers.filter((_, index) => index !== action.offerIndex);
      return next;
    }

    case 'reroll': {
      requirePhase(next, 'restock');
      const tokens = freeRerollTokens(next);
      if (tokens > 0) {
        next.freeRerollTokens = tokens - 1;
      } else {
        if (next.coins < REROLL_COST) throw new EngineError('Not enough coins to reroll.');
        next.coins -= REROLL_COST;
      }
      // The salt must never collapse back to a value a previous generation used:
      // buying out the whole shop left `currentOffers` empty, so an id-only salt
      // degenerated to '' — the same salt as the day's opening generation — and
      // the reroll reproduced identical offerIds, letting a re-buy mint a
      // duplicate instanceId on the shelf (schema-invalid save). Folding coins
      // plus every live instanceId in makes any salt that could re-issue a
      // bought offer's id structurally different from the salt that created it.
      const salt = [
        `c${next.coins}`,
        next.heldItem ? next.heldItem.instanceId : '',
        ...next.shelf.slots.flatMap((entry) => (entry.item ? [entry.item.instanceId] : [])),
        ...next.currentOffers.map((offer) => offer.offerId),
      ].join('|');
      next.currentOffers = generateOffers(
        next.seed,
        next.day,
        'restock',
        deps.table,
        salt,
        supplierTagForOffers(next),
        runLoopV2(next),
        runUnlockedItemIds(next),
      );
      return next;
    }

    case 'endRestock': {
      requirePhase(next, 'restock');
      if (next.heldItem) throw new EngineError('Place the held item before ending restock.');
      if (runLoopV2(next)) {
        next.phase = 'arrange';
        next.currentOffers = [];
        return next;
      }
      next.phase = 'delivery';
      next.currentOffers = generateOffers(
        next.seed,
        next.day,
        'delivery',
        deps.table,
        '',
        supplierTagForOffers(next),
        runLoopV2(next),
        runUnlockedItemIds(next),
      );
      return next;
    }

    case 'abandonRun': {
      next.phase = 'gameOver';
      return next;
    }

    default: {
      const exhausted: never = action;
      throw new EngineError(`Unknown action ${JSON.stringify(exhausted)}.`);
    }
  }
}

/** Enumerate legal actions for bots (and eventually UI affordance hints). */
export function legalActions(state: GameState, deps: EngineDeps): Action[] {
  const actions: Action[] = [];
  if (state.phase === 'gameOver') return actions;

  const map = buildSlotMap(state.shelf);
  const emptySlots: Slot[] = [];
  const occupiedSlots: Slot[] = [];
  for (const slot of rowMajorSlots(state.shelf.size)) {
    const entry = slotStateAt(map, slot);
    if (entry?.item) occupiedSlots.push(slot);
    else emptySlots.push(slot);
  }

  switch (state.phase) {
    case 'delivery': {
      if (canChooseSupplier(state)) {
        for (const tag of BUILD_STEERING_ELIGIBLE_TAGS) {
          actions.push({ type: 'chooseSupplier', tag });
        }
        break;
      }
      state.currentOffers.forEach((_, index) => actions.push({ type: 'draftItem', offerIndex: index }));
      break;
    }
    case 'arrange': {
      if (state.heldItem) {
        for (const slot of emptySlots) actions.push({ type: 'placeItem', slot });
        // F-1: selling stays reachable while holding, or a full shelf softlocks.
        for (const slot of occupiedSlots) actions.push({ type: 'sellItem', slot });
      } else {
        actions.push({ type: 'openShop' });
        if (canExpandShelf(state)) actions.push({ type: 'expandShelf' });
        const canPayMove = state.moves.freeRemaining > 0 || state.coins >= state.moves.paidMoveCost;
        if (canPayMove) {
          for (const from of occupiedSlots) {
            const item = slotStateAt(map, from)?.item;
            if (item?.state.sticky) continue;
            for (const to of emptySlots) actions.push({ type: 'moveItem', from, to });
          }
        }
        for (const slot of occupiedSlots) actions.push({ type: 'sellItem', slot });
      }
      break;
    }
    case 'restock': {
      if (state.heldItem) {
        for (const slot of emptySlots) actions.push({ type: 'placeItem', slot });
        // F-1: same softlock guard as arrange.
        for (const slot of occupiedSlots) actions.push({ type: 'sellItem', slot });
      } else {
        actions.push({ type: 'endRestock' });
        if (canExpandShelf(state)) actions.push({ type: 'expandShelf' });
        state.currentOffers.forEach((offer, index) => {
          if (state.coins >= offer.cost && emptySlots.length > 0) {
            actions.push({ type: 'buyOffer', offerIndex: index });
          }
        });
        if (freeRerollTokens(state) > 0 || state.coins >= REROLL_COST) {
          actions.push({ type: 'reroll' });
        }
        for (const slot of occupiedSlots) actions.push({ type: 'sellItem', slot });
      }
      break;
    }
    default:
      break;
  }
  actions.push({ type: 'abandonRun' });
  return actions;
}
