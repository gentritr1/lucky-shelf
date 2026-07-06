import type { Shelf, ShelfSize, Slot, SlotState } from '../contracts';
import { toSlotKey } from '../contracts';

/**
 * Grid helpers. Ordering rules are contract-relevant:
 * - Resolution order is row-major: left→right within a row, top row first.
 * - Neighbor iteration order is left, right, up, down (golden fixture
 *   m0-wine-dine-combo encodes this: left cheese fires before right before below).
 */

export function rowMajorSlots(size: ShelfSize): Slot[] {
  const slots: Slot[] = [];
  for (let row = 0; row < size.rows; row += 1) {
    for (let col = 0; col < size.cols; col += 1) {
      slots.push({ row, col });
    }
  }
  return slots;
}

export function compareSlots(a: Slot, b: Slot): number {
  return a.row - b.row || a.col - b.col;
}

const NEIGHBOR_OFFSETS: readonly Slot[] = [
  { row: 0, col: -1 }, // left
  { row: 0, col: 1 }, // right
  { row: -1, col: 0 }, // up
  { row: 1, col: 0 }, // down
];

export function neighborsOf(slot: Slot, size: ShelfSize): Slot[] {
  const neighbors: Slot[] = [];
  for (const offset of NEIGHBOR_OFFSETS) {
    const row = slot.row + offset.row;
    const col = slot.col + offset.col;
    if (row >= 0 && row < size.rows && col >= 0 && col < size.cols) {
      neighbors.push({ row, col });
    }
  }
  return neighbors;
}

export type SlotMap = Map<string, SlotState>;

export function buildSlotMap(shelf: Shelf): SlotMap {
  const map: SlotMap = new Map();
  for (const slotState of shelf.slots) {
    map.set(toSlotKey(slotState.slot), slotState);
  }
  return map;
}

export function slotStateAt(map: SlotMap, slot: Slot): SlotState | undefined {
  return map.get(toSlotKey(slot));
}

export function occupiedNeighbors(map: SlotMap, slot: Slot, size: ShelfSize): SlotState[] {
  const occupied: SlotState[] = [];
  for (const neighbor of neighborsOf(slot, size)) {
    const state = slotStateAt(map, neighbor);
    if (state?.item) {
      occupied.push(state);
    }
  }
  return occupied;
}

export function sameSlot(a: Slot, b: Slot): boolean {
  return a.row === b.row && a.col === b.col;
}
