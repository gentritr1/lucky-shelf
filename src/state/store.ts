import { create } from 'zustand';

import {
  type Action,
  type GameState,
} from '../contracts';
import { isSignatureItem, loadCombos, loadItemTable } from '../items';
import { EngineError, createRun, dispatch as engineDispatch, hashState } from '../sim';
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
  lastRejectedAction: (state: RunStoreState) => state.lastRejectedAction,
  rejectedActionCount: (state: RunStoreState) => state.rejectedActionCount,
  saveStatus: (state: RunStoreState) => state.saveStatus,
} as const;

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
