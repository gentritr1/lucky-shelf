/**
 * UI-affordance model (Lane B liveness harness).
 *
 * The fuzz in scripts/fuzz.ts drives the engine's `legalActions`, so it can never
 * reproduce a *screen*-level dead-end: the engine may keep an escape legal that
 * the UI never exposes (exactly the full-shelf softlock — engine kept `sellItem`
 * legal while holding, but the Arrange screen didn't show it until `06771cf`).
 *
 * This function is the authoritative list of progressing actions each SCREEN
 * exposes for a state, so a liveness fuzz can assert the *player* is never stuck.
 * Route screens derive their buttons/chips from store view-models backed by this
 * source, so UI affordances and the fuzz model change together:
 *   - delivery → src/app/draft.tsx
 *   - arrange  → src/app/run.tsx
 *   - restock  → src/app/restock.tsx
 *
 * It deliberately omits `moveItem` (rearrange never advances the run), so a
 * non-empty result always contains a progressing action.
 */

import type { Action, GameState, Slot } from '../contracts';
import {
  BUILD_STEERING_ELIGIBLE_TAGS,
  REROLL_COST,
  buildSteeringEnabled,
  goalLadderEnabled,
} from './economy';

export type UiActionOfType<T extends Action['type']> = Extract<Action, { type: T }>;

function emptySlots(state: GameState): Slot[] {
  return state.shelf.slots.filter((s) => s.item === null).map((s) => s.slot);
}

function occupiedSlots(state: GameState): Slot[] {
  return state.shelf.slots.filter((s) => s.item !== null).map((s) => s.slot);
}

export function uiAffordances(state: GameState): Action[] {
  const acts: Action[] = [];
  if (state.phase === 'gameOver') return acts;

  const empties = emptySlots(state);
  const occupied = occupiedSlots(state);

  switch (state.phase) {
    case 'delivery': {
      // draft.tsx: the supplier picker replaces the offers on the one day it's
      // pending (build steering on, no lean chosen yet); otherwise draft any offer.
      if (buildSteeringEnabled() && state.supplierTag === null) {
        for (const tag of BUILD_STEERING_ELIGIBLE_TAGS) acts.push({ type: 'chooseSupplier', tag });
      } else {
        state.currentOffers.forEach((_, offerIndex) => acts.push({ type: 'draftItem', offerIndex }));
      }
      break;
    }
    case 'arrange': {
      if (state.heldItem) {
        // run.tsx: drag the held item onto an empty slot; if the shelf is full the
        // "sell to make room" chips are shown instead (06771cf).
        if (empties.length > 0) for (const slot of empties) acts.push({ type: 'placeItem', slot });
        else for (const slot of occupied) acts.push({ type: 'sellItem', slot });
      } else {
        acts.push({ type: 'openShop' });
      }
      break;
    }
    case 'restock': {
      if (state.heldItem) {
        // restock.tsx: the place-purchase view. Buying is gated on an empty slot
        // (canBuy), so a held item here always has a slot to go to.
        for (const slot of empties) acts.push({ type: 'placeItem', slot });
      } else {
        // Buy/Sell toggle — both modes are one tap away, so model them together.
        state.currentOffers.forEach((offer, offerIndex) => {
          if (state.coins >= offer.cost && empties.length > 0) acts.push({ type: 'buyOffer', offerIndex });
        });
        const freeReroll = goalLadderEnabled() && (state.freeRerollTokens ?? 0) > 0;
        if (freeReroll || state.coins >= REROLL_COST) acts.push({ type: 'reroll' });
        for (const slot of occupied) acts.push({ type: 'sellItem', slot });
        acts.push({ type: 'endRestock' });
      }
      break;
    }
  }
  return acts;
}

export function uiActionsOfType<T extends Action['type']>(
  state: GameState,
  type: T,
): UiActionOfType<T>[] {
  return uiAffordances(state).filter((action): action is UiActionOfType<T> => action.type === type);
}

/** A state is a player dead-end if it isn't game over yet exposes no screen action. */
export function isDeadEnd(state: GameState): boolean {
  return state.phase !== 'gameOver' && uiAffordances(state).length === 0;
}
