/**
 * Deterministic, stateless RNG for the sim.
 *
 * GameState carries no RNG cursor; instead every random decision derives its
 * generator from (runSeed + a context key). Same state + same decision point =
 * same randomness, which keeps replay (`{seed, actions[]}`) exact without
 * persisting generator internals in the save.
 */

/** FNV-1a 32-bit hash of a string. */
export function hashString(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export interface Rng {
  /** Float in [0, 1). */
  next(): number;
  /** Integer in [0, maxExclusive). */
  int(maxExclusive: number): number;
  /** Uniform pick; throws on empty input. */
  pick<T>(values: readonly T[]): T;
}

/** mulberry32 over an FNV-1a seed of the joined context key. */
export function rngFor(seed: string, ...context: readonly (string | number)[]): Rng {
  let state = hashString([seed, ...context].join(':'));

  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const int = (maxExclusive: number): number => {
    if (maxExclusive <= 0) {
      throw new Error(`rng.int requires a positive bound, got ${maxExclusive}.`);
    }
    return Math.floor(next() * maxExclusive);
  };

  const pick = <T>(values: readonly T[]): T => {
    if (values.length === 0) {
      throw new Error('rng.pick requires a non-empty array.');
    }
    // Index is always in bounds; the assertion narrows T|undefined from
    // noUncheckedIndexedAccess.
    return values[int(values.length)] as T;
  };

  return { next, int, pick };
}
