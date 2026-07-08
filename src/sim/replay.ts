import type { Action, GameState } from '../contracts';

import type { CreateRunOptions, EngineDeps } from './engine';
import { createRun, dispatch } from './engine';

/**
 * Replay = seed + decision list (Pillar 5). Same inputs always land on the
 * same final state; the determinism suite hashes this.
 */

export interface Replay {
  seed: string;
  actions: readonly Action[];
}

export function runReplay(
  replay: Replay,
  deps: EngineDeps,
  options: CreateRunOptions = {},
): GameState {
  let state = createRun(replay.seed, deps, options);
  for (const action of replay.actions) {
    if (state.phase === 'gameOver') break;
    state = dispatch(state, action, deps);
  }
  return state;
}
