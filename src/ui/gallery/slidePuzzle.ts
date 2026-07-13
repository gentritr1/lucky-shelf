/**
 * B-M14 assembly ceremony — pure 3×3 slide-puzzle logic (8 tiles + one gap).
 * ALWAYS 3×3, even for the 4×4-reveal paintings (a 4×4 slide frustrates). No
 * React, no timers, no image concerns: this is the state machine the ceremony
 * UI drives, with tests for scramble solvability (the 15-puzzle parity
 * invariant), the legal-move reducer, and solved detection.
 *
 * Board representation: a length-9 array indexed by BOARD POSITION (row-major,
 * position p → row=⌊p/3⌋, col=p%3). Each cell holds a TILE VALUE 0..7 (the tile
 * whose home position index equals its value) or `GAP` (8) for the empty slot.
 * The solved board is [0,1,2,3,4,5,6,7,8].
 */

export const SIZE = 3;
export const CELLS = SIZE * SIZE; // 9
export const GAP = CELLS - 1; // 8 — the empty slot's value

export type Board = number[];

export function solvedBoard(): Board {
  return Array.from({ length: CELLS }, (_, i) => i);
}

export function isSolved(board: Board): boolean {
  for (let i = 0; i < CELLS; i += 1) if (board[i] !== i) return false;
  return true;
}

export function gapIndex(board: Board): number {
  return board.indexOf(GAP);
}

function rowCol(index: number): { row: number; col: number } {
  return { row: Math.floor(index / SIZE), col: index % SIZE };
}

/** Board positions orthogonally adjacent to `index` (the tiles that could slide
 *  into a gap at `index`). */
export function orthogonalNeighbors(index: number): number[] {
  const { row, col } = rowCol(index);
  const out: number[] = [];
  if (row > 0) out.push(index - SIZE);
  if (row < SIZE - 1) out.push(index + SIZE);
  if (col > 0) out.push(index - 1);
  if (col < SIZE - 1) out.push(index + 1);
  return out;
}

/** Board positions currently holding a tile that can legally slide (those
 *  orthogonally adjacent to the gap). */
export function movableIndices(board: Board): number[] {
  return orthogonalNeighbors(gapIndex(board));
}

/** True when the tile at board position `index` is adjacent to the gap. */
export function isMovable(board: Board, index: number): boolean {
  return movableIndices(board).includes(index);
}

/**
 * The legal-move reducer: slide the tile at board position `index` into the gap.
 * Returns a NEW board, or `null` if the move is illegal (the tile is not adjacent
 * to the gap, or `index` IS the gap). Never mutates the input.
 */
export function applyMove(board: Board, index: number): Board | null {
  if (index < 0 || index >= CELLS) return null;
  if (board[index] === GAP) return null;
  if (!isMovable(board, index)) return null;
  const next = board.slice();
  const gap = gapIndex(board);
  next[gap] = board[index]!;
  next[index] = GAP;
  return next;
}

/** Inversions among the tiles (the gap ignored) — the basis of the 15-puzzle
 *  solvability parity test. */
export function inversions(board: Board): number {
  const tiles = board.filter((v) => v !== GAP);
  let count = 0;
  for (let i = 0; i < tiles.length; i += 1) {
    for (let j = i + 1; j < tiles.length; j += 1) {
      if (tiles[i]! > tiles[j]!) count += 1;
    }
  }
  return count;
}

/**
 * Solvability: for an odd-width board (3×3) a configuration is solvable iff the
 * inversion count is even. (The blank-row rule only matters for even widths.)
 * A random permutation has a 50% chance of being unsolvable, which is exactly why
 * `scramble` walks from the solved state instead of shuffling blindly.
 */
export function isSolvable(board: Board): boolean {
  return inversions(board) % 2 === 0;
}

// --- Deterministic seeded scramble ---------------------------------------

/** 32-bit string hash (FNV-1a-ish) → uint32 seed. */
function hashSeed(seed: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** mulberry32 — a tiny deterministic PRNG (no @/sim import; the puzzle is UI). */
function mulberry32(a: number): () => number {
  let t = a >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

/** Number of legal moves in a scramble walk. Large enough to fully mix 3×3. */
export const SCRAMBLE_MOVES = 80;

/**
 * A deterministic, SOLVABLE, not-already-solved scramble for a painting. Walks
 * `SCRAMBLE_MOVES` random LEGAL moves from the solved board (so solvability holds
 * by construction — every reachable state is solvable), avoiding immediate move
 * reversal for a better mix, then nudges once more if it happens to land solved.
 * Deterministic per `seed` (same painting id ⇒ same scramble every time).
 */
export function scramble(seed: string): Board {
  const rand = mulberry32(hashSeed(seed));
  let board = solvedBoard();
  let prevGap = -1;
  for (let step = 0; step < SCRAMBLE_MOVES; step += 1) {
    const gap = gapIndex(board);
    // Candidate tiles = neighbors of the gap, excluding the one we just moved
    // (its position is the previous gap) so we don't immediately undo a move.
    let candidates = orthogonalNeighbors(gap).filter((i) => i !== prevGap);
    if (candidates.length === 0) candidates = orthogonalNeighbors(gap);
    const pick = candidates[Math.floor(rand() * candidates.length)]!;
    prevGap = gap;
    board = applyMove(board, pick)!;
  }
  // Guarantee not-already-solved: one extra legal move (still solvable).
  if (isSolved(board)) {
    const gap = gapIndex(board);
    board = applyMove(board, orthogonalNeighbors(gap)[0]!)!;
  }
  return board;
}
