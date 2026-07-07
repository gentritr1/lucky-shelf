import type { Slot } from '@/contracts';
import { spacing } from '@/ui/tokens';

/**
 * Shelf geometry — pure numbers shared by the React render pass and the
 * Reanimated worklets (gesture hit-testing, drop resolution). Everything is
 * derived from the measured frame width so the scene is resolution-independent
 * and the same math answers "where does slot (r,c) sit" and "which slot is the
 * finger over."
 */

export const FRAME_PADDING = spacing.lg; // wood frame inner padding (top/sides)
export const SLOT_GAP = spacing.sm; // horizontal gap between slot wells
export const PLANK_HEIGHT = 10; // the visible shelf board under each row
export const ROW_GAP = spacing.md + PLANK_HEIGHT; // vertical gap incl. the plank
export const BASE_LIP = spacing.sm; // extra wood below the last plank (the counter base)

export interface ShelfLayout {
  rows: number;
  cols: number;
  frameWidth: number;
  frameHeight: number;
  slotSize: number;
  rowStride: number;
  colStride: number;
}

export function computeShelfLayout(frameWidth: number, rows: number, cols: number): ShelfLayout {
  const innerWidth = frameWidth - FRAME_PADDING * 2 - SLOT_GAP * (cols - 1);
  const slotSize = Math.max(0, innerWidth / cols);
  const colStride = slotSize + SLOT_GAP;
  const rowStride = slotSize + ROW_GAP;
  // Every row — including the last — gets its plank (ROW_GAP), then a base lip
  // and even bottom padding, so the shelf reads evenly and the bottom board has
  // room instead of clipping against the frame edge.
  const frameHeight = FRAME_PADDING * 2 + rows * slotSize + rows * ROW_GAP + BASE_LIP;
  return { rows, cols, frameWidth, frameHeight, slotSize, rowStride, colStride };
}

/** Top-left corner of a slot well, in frame-local coordinates. */
export function slotTopLeft(layout: ShelfLayout, row: number, col: number): { x: number; y: number } {
  'worklet';
  return {
    x: FRAME_PADDING + col * layout.colStride,
    y: FRAME_PADDING + row * layout.rowStride,
  };
}

/** Center point of a slot well, in frame-local coordinates. */
export function slotCenter(layout: ShelfLayout, row: number, col: number): { x: number; y: number } {
  'worklet';
  const half = layout.slotSize / 2;
  return {
    x: FRAME_PADDING + col * layout.colStride + half,
    y: FRAME_PADDING + row * layout.rowStride + half,
  };
}

/** Nearest slot to a frame-local point, clamped to the grid. */
export function pointToSlot(layout: ShelfLayout, x: number, y: number): Slot {
  'worklet';
  // clamp inlined: a separate worklet helper is captured into these worklets'
  // closures at module-eval and hits a TDZ under the Reanimated Babel plugin.
  const rawCol = Math.round((x - FRAME_PADDING - layout.slotSize / 2) / layout.colStride);
  const rawRow = Math.round((y - FRAME_PADDING - layout.slotSize / 2) / layout.rowStride);
  const col = Math.min(layout.cols - 1, Math.max(0, rawCol));
  const row = Math.min(layout.rows - 1, Math.max(0, rawRow));
  return { row, col };
}

export function slotIndex(cols: number, row: number, col: number): number {
  'worklet';
  return row * cols + col;
}
