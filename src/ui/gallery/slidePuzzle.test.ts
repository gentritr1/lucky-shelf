import { describe, expect, it } from 'vitest';

import {
  CELLS,
  GAP,
  applyMove,
  gapIndex,
  inversions,
  isMovable,
  isSolvable,
  isSolved,
  movableIndices,
  orthogonalNeighbors,
  scramble,
  solvedBoard,
} from './slidePuzzle';

const seeds = ['still-life', 'counter-cat', 'stockroom', 'dusk', 'x', 'seed-42', 'AAAA'];

describe('slidePuzzle — solved detection', () => {
  it('solvedBoard is solved and is a permutation of 0..8', () => {
    const b = solvedBoard();
    expect(isSolved(b)).toBe(true);
    expect([...b].sort((x, y) => x - y)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
  });
});

describe('slidePuzzle — solvability invariant', () => {
  it('the solved board has zero inversions (even ⇒ solvable)', () => {
    expect(inversions(solvedBoard())).toBe(0);
    expect(isSolvable(solvedBoard())).toBe(true);
  });

  it('swapping two tiles of the solved board makes it UNSOLVABLE (odd parity)', () => {
    const b = solvedBoard();
    [b[0], b[1]] = [b[1]!, b[0]!]; // one transposition of non-gap tiles
    expect(isSolvable(b)).toBe(false);
  });

  it('every seeded scramble is solvable, not already solved, and a valid permutation', () => {
    for (const seed of seeds) {
      const b = scramble(seed);
      expect(b.length).toBe(CELLS);
      expect([...b].sort((x, y) => x - y)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
      expect(isSolved(b)).toBe(false);
      expect(isSolvable(b)).toBe(true);
    }
  });

  it('scramble is deterministic per seed', () => {
    for (const seed of seeds) {
      expect(scramble(seed)).toEqual(scramble(seed));
    }
    expect(scramble('still-life')).not.toEqual(scramble('dusk'));
  });
});

describe('slidePuzzle — legal-move reducer', () => {
  it('only tiles orthogonally adjacent to the gap are movable', () => {
    const b = scramble('still-life');
    const gap = gapIndex(b);
    const expected = orthogonalNeighbors(gap);
    expect(movableIndices(b).sort()).toEqual([...expected].sort());
    for (let i = 0; i < CELLS; i += 1) {
      expect(isMovable(b, i)).toBe(expected.includes(i));
    }
  });

  it('applyMove slides an adjacent tile into the gap and moves the gap', () => {
    const b = scramble('counter-cat');
    const gap = gapIndex(b);
    const tileIndex = movableIndices(b)[0]!;
    const tileValue = b[tileIndex]!;
    const next = applyMove(b, tileIndex)!;
    expect(next).not.toBe(b); // no mutation
    expect(next[gap]).toBe(tileValue);
    expect(next[tileIndex]).toBe(GAP);
    // A legal move preserves solvability.
    expect(isSolvable(next)).toBe(true);
  });

  it('rejects illegal moves (non-adjacent tile, the gap itself, out of range)', () => {
    const b = scramble('stockroom');
    const gap = gapIndex(b);
    expect(applyMove(b, gap)).toBeNull();
    expect(applyMove(b, -1)).toBeNull();
    expect(applyMove(b, CELLS)).toBeNull();
    const nonAdjacent = [...Array(CELLS).keys()].find(
      (i) => i !== gap && !movableIndices(b).includes(i),
    )!;
    expect(applyMove(b, nonAdjacent)).toBeNull();
  });

  it('a legal move and its inverse round-trip back to solved', () => {
    let b = solvedBoard();
    const gap0 = gapIndex(b);
    const first = movableIndices(b)[0]!; // a tile adjacent to the gap
    b = applyMove(b, first)!; // tile → old gap slot; gap → the tile's old slot
    expect(isSolved(b)).toBe(false);
    // Undo: slide the tile now sitting at the ORIGINAL gap position back.
    b = applyMove(b, gap0)!;
    expect(isSolved(b)).toBe(true);
  });
});
