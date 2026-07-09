import { describe, expect, it } from 'vitest';

import type { GameState } from '@/contracts';

import { goldenFixtures } from '../juice/goldens';
import { receiptCardView } from './store';

/**
 * B-M10 — the share "receipt" variant body. `receiptCardView` is the store
 * view-model the share screen consumes so it never value-imports `@/items`. This
 * pins a FIXED closing-day trace → FIXED paper text (acceptance §1): a golden
 * fixture's scoring trace, placed on `lastScoringTrace` exactly as a finished run
 * would carry it, rendered through the B-M8 receipt model.
 */
const combo = goldenFixtures.find((f) => f.fixtureId === 'm0-wine-dine-combo');
if (!combo) throw new Error('expected golden fixture m0-wine-dine-combo');

/** A finished run whose closing-day trace is the combo fixture's scoring trace. */
const closingDayState: GameState = { ...combo.gameState, lastScoringTrace: combo.scoringTrace };

describe('receiptCardView', () => {
  it('renders the closing-day trace as fixed receipt paper text', () => {
    const card = receiptCardView(closingDayState);
    expect(card).not.toBeNull();
    expect(card?.body).toMatchSnapshot('body');
  });

  it('headlines the brass total, matching the final printed body line', () => {
    // The trace's total is its terminal `dayTotal` event's coins.
    const lastEvent = combo.scoringTrace.events.at(-1);
    const dayTotal = lastEvent?.kind === 'dayTotal' ? lastEvent.coins : NaN;
    const card = receiptCardView(closingDayState);
    expect(card?.total).toBe(dayTotal);
    // The final printed line is the receipt total — the brass foot the card colors.
    const last = card?.body.at(-1) ?? '';
    expect(last).toContain(String(dayTotal));
  });

  it('returns null when the run has no closing-day trace to print', () => {
    expect(receiptCardView({ ...combo.gameState, lastScoringTrace: null })).toBeNull();
  });
});
