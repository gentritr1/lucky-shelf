import { toSlotKey, type Slot, type TraceEvent } from '@/contracts';

/**
 * Pure cascade model — folds a ScoringTrace event list into per-step render
 * frames. No React, no Reanimated: this is where the trace semantics live so
 * they can be unit-tested against the goldens in plain TS.
 *
 * The crux is the R-6 "resolution window": a slot opens on its `itemBase` and
 * closes on its `itemTotal`. Whichever slot is open when a `ruleFire` arrives is
 * the *beneficiary* — the slot whose running total moved — regardless of which
 * slot the rule's arrow points at (`sourceSlot`→`targetSlot`). Fixtures 1 and 4
 * put the beneficiary on the source vs. the target respectively; this one rule
 * gets both right. Row auras (R-9) accumulate and never clear until `dayTotal`.
 */

export interface SlotDisplay {
  /** Base value revealed by `itemBase`, or null before it resolves. */
  base: number | null;
  /** Live tag value — starts at base, climbs with each `ruleFire`. */
  running: number | null;
  /** Final stamped total (`itemTotal`); nothing retro-modifies it (R-7). */
  total: number | null;
}

export interface CascadeFrame {
  slots: Record<string, SlotDisplay>;
  /** row → multiplier; persists until dayTotal so boosted totals stay attributable (R-9/R-27). */
  auraRows: Record<number, number>;
  /** Active named-combo banner, or null. Catalog-only, no coin change (R-2). */
  combo: { comboId: string; slots: Slot[] } | null;
  transformed: Record<string, { fromItem: string; toItem: string }>;
  vanished: Record<string, true>;
  /** The open resolution window — the R-6 beneficiary of an incoming ruleFire. */
  openSlot: string | null;
  /** Banked coins, set only by the terminal dayTotal event. */
  dayTotal: number | null;
}

export function emptyFrame(): CascadeFrame {
  return {
    slots: {},
    auraRows: {},
    combo: null,
    transformed: {},
    vanished: {},
    openSlot: null,
    dayTotal: null,
  };
}

function cloneFrame(frame: CascadeFrame): CascadeFrame {
  const slots: Record<string, SlotDisplay> = {};
  for (const [key, display] of Object.entries(frame.slots)) {
    slots[key] = { ...display };
  }
  return {
    slots,
    auraRows: { ...frame.auraRows },
    combo: frame.combo,
    transformed: { ...frame.transformed },
    vanished: { ...frame.vanished },
    openSlot: frame.openSlot,
    dayTotal: frame.dayTotal,
  };
}

function slotOf(frame: CascadeFrame, key: string): SlotDisplay {
  const existing = frame.slots[key];
  if (existing) return existing;
  const created: SlotDisplay = { base: null, running: null, total: null };
  frame.slots[key] = created;
  return created;
}

/** Advance a frame by one trace event (mutates and returns the same frame). */
export function applyEvent(frame: CascadeFrame, event: TraceEvent): CascadeFrame {
  switch (event.kind) {
    case 'itemBase': {
      const key = toSlotKey(event.slot);
      const display = slotOf(frame, key);
      display.base = event.value;
      display.running = event.value;
      display.total = null;
      frame.openSlot = key; // open the resolution window (R-6)
      return frame;
    }
    case 'ruleFire': {
      // Beneficiary = the slot whose window is open, NOT necessarily targetSlot.
      const beneficiary = frame.openSlot ?? toSlotKey(event.targetSlot);
      slotOf(frame, beneficiary).running = event.runningTotal;
      return frame;
    }
    case 'rowAura': {
      frame.auraRows[event.row] = event.mult; // persists until dayTotal (R-9)
      return frame;
    }
    case 'itemTotal': {
      const key = toSlotKey(event.slot);
      const display = slotOf(frame, key);
      display.total = event.total;
      display.running = event.total;
      frame.openSlot = null; // close the window (R-7: final)
      return frame;
    }
    case 'comboNamed': {
      frame.combo = { comboId: event.comboId, slots: event.slots };
      return frame;
    }
    case 'transform': {
      frame.transformed[toSlotKey(event.slot)] = { fromItem: event.fromItem, toItem: event.toItem };
      return frame;
    }
    case 'vanish': {
      frame.vanished[toSlotKey(event.slot)] = true;
      return frame;
    }
    case 'dayTotal': {
      frame.dayTotal = event.coins;
      return frame;
    }
    default:
      return frame;
  }
}

/**
 * Snapshot the accumulated frame after each event. `frames[i]` is the render
 * state once `events[i]` has resolved; walking the index is the whole cascade.
 */
export function buildKeyframes(events: readonly TraceEvent[]): CascadeFrame[] {
  const frames: CascadeFrame[] = [];
  const acc = emptyFrame();
  for (const event of events) {
    applyEvent(acc, event);
    frames.push(cloneFrame(acc));
  }
  return frames;
}

/** Running total after an event, for haptic escalation (motion-spec §4). */
export function runningTotalAt(event: TraceEvent): number | null {
  if (event.kind === 'ruleFire') return event.runningTotal;
  if (event.kind === 'itemTotal') return event.total;
  if (event.kind === 'dayTotal') return event.coins;
  return null;
}
