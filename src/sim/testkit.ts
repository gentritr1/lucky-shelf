import type { GameState, ItemInstance, ItemInstanceState, Shelf, Slot } from '../contracts';
import { loadItemTable } from '../items';
import { rowMajorSlots } from './grid';
import { toSlotKey } from '../contracts';

/** Test-only helpers for building GameStates around the exemplar table. */

export interface PlacedItem {
  slot: Slot;
  itemId: string;
  baseValue?: number;
  state?: Partial<ItemInstanceState>;
}

const DEFAULT_INSTANCE_STATE: ItemInstanceState = {
  ageDays: 0,
  growthDays: 0,
  countdown: null,
  sticky: false,
  blocked: false,
  transformedFromItemId: null,
};

export function makeInstance(placed: PlacedItem, index: number): ItemInstance {
  const table = loadItemTable();
  const definition = table.get(placed.itemId);
  if (!definition) {
    throw new Error(`Unknown item id in testkit: ${placed.itemId}`);
  }
  return {
    instanceId: `${placed.itemId}-test-${index}`,
    itemId: definition.id,
    name: definition.name,
    tier: definition.tier,
    baseValue: placed.baseValue ?? definition.baseValue,
    tags: [...definition.tags],
    state: { ...DEFAULT_INSTANCE_STATE, ...placed.state },
  };
}

export function makeShelf(placedItems: readonly PlacedItem[]): Shelf {
  const size = { rows: 3, cols: 4 };
  const byKey = new Map(placedItems.map((placed, index) => [toSlotKey(placed.slot), makeInstance(placed, index)]));
  return {
    size,
    slots: rowMajorSlots(size).map((slot) => ({
      slot,
      item: byKey.get(toSlotKey(slot)) ?? null,
    })),
  };
}

export function makeState(placedItems: readonly PlacedItem[], overrides?: Partial<GameState>): GameState {
  return {
    schemaVersion: 1,
    runId: 'run-test',
    seed: 'test-seed',
    phase: 'openShop',
    day: 1,
    coins: 0,
    shelf: makeShelf(placedItems),
    rent: { amount: 25, dueInDays: 3, cycle: 1 },
    moves: { freeRemaining: 3, paidMoveCost: 2 },
    currentOffers: [],
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
    ...overrides,
  };
}
