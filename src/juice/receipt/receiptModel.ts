import { toSlotKey, type RuleDelta, type ScoringTrace, type Slot, type TraceEvent } from '@/contracts';
import type { GameState } from '@/contracts';
import type { ItemTable, NamedCombo } from '@/items';

/**
 * B-M8 — the pure receipt model (build FIRST, fully headless, unit-testable in
 * node). `receiptFromTrace(trace, deps)` renders a `ScoringTrace` as a shop
 * receipt: one line per item window (`name … base`), indented cause lines for
 * each ruleFire (`↳ source · rule  ×1.5 → 12`), aura/combo/transform/vanish
 * annotations, a subtotal per item, and the `dayTotal` as the brass receipt
 * total. This is the same pattern as `popModel`/`cascadeTier`: all grammar
 * decisions live here so they can be pinned against the M0 goldens in plain TS,
 * and the presentation layer is a thin map over `ReceiptLine[]`.
 *
 * The jury's non-negotiable grammar (#2): every visible effect names its cause
 * in the order *source item → affected item → delta → new total*. In a receipt
 * the affected item is the window a cause is nested under (its indent), so a
 * cause line always carries `sourceSlot` + `sourceName` — no effect renders as a
 * bare number with no source. `causeHasSource()` and the fuzz proof enforce it.
 *
 * No sim/trace changes: this consumes the frozen trace verbatim (same events the
 * cascade player walks). Each emitted line carries `eventIndex` — the trace step
 * that reveals it — so the receipt prints in lock-step with the cascade player's
 * existing clock (no second clock; see `receipt/print.ts`).
 */

export type ReceiptLineKind =
  | 'item'
  | 'cause'
  | 'aura'
  | 'combo'
  | 'transform'
  | 'vanish'
  | 'subtotal'
  | 'total';

/** Structured detail per line — the machine-readable payload the UI cross-highlights on. */
export type ReceiptLineDetail =
  | { kind: 'item'; slot: Slot; itemName: string; base: number }
  | {
      kind: 'cause';
      /** The item that CAUSED this effect — the named source (grammar #2). */
      sourceSlot: Slot;
      sourceName: string;
      /** The rule's geometric target (arrow tip); may differ from the beneficiary. */
      targetSlot: Slot;
      /** The window this fire credited — the affected item (R-6 beneficiary). */
      affectedSlot: Slot;
      affectedName: string;
      ruleId: string;
      ruleLabel: string;
      delta: RuleDelta;
      deltaLabel: string;
      runningTotal: number;
    }
  | {
      kind: 'aura';
      /** The item casting the row multiplier — the named source. */
      sourceSlot: Slot;
      sourceName: string;
      row: number;
      mult: number;
    }
  | { kind: 'combo'; comboId: string; comboName: string; slots: Slot[] }
  | { kind: 'transform'; slot: Slot; fromItem: string; fromName: string; toItem: string; toName: string }
  | { kind: 'vanish'; slot: Slot; itemId: string; itemName: string }
  | {
      kind: 'subtotal';
      slot: Slot;
      itemName: string;
      total: number;
      /** Set when an active row aura multiplied this total — ties the jump to its cause. */
      appliedAura?: { sourceSlot: Slot; mult: number };
    }
  | { kind: 'total'; coins: number };

export interface ReceiptLine {
  kind: ReceiptLineKind;
  /** The trace-event index that reveals this line — the cascade step to sync on. */
  eventIndex: number;
  /** 0 = window header / subtotal / banner / total; 1 = a cause nested under a window. */
  indent: 0 | 1;
  /** Left column — the "what": item name, `↳ source · rule`, combo, etc. */
  label: string;
  /** Right column — the "amount": base, `×1.5 → 12`, `= 12`, day total, or '' for banners. */
  amount: string;
  /** Every slot this line reads from, for shelf ↔ receipt cross-highlight. */
  slots: Slot[];
  detail: ReceiptLineDetail;
}

/**
 * External lookups the pure model can't derive from the trace alone. Only
 * `itemNameAt` is load-bearing (the trace carries slots, not names); the label
 * hooks default to a prettified slug so the model is usable with no deps at all.
 * `receiptDepsFromGameState` wires these from the live shelf + item table.
 */
export interface ReceiptDeps {
  /** Display name of the item occupying `slot` when the day scored (shelf lookup). */
  itemNameAt: (slot: Slot) => string | undefined;
  /** ruleId → human label. Default: prettified slug. */
  ruleLabel?: (ruleId: string) => string;
  /** comboId → human label. Default: prettified slug. */
  comboLabel?: (comboId: string) => string;
  /** itemId → human label (transform/vanish). Default: prettified slug. */
  itemLabel?: (itemId: string) => string;
}

/** Turn a kebab/snake slug into Title Case — the default label for any id. */
export function prettifySlug(slug: string): string {
  return slug
    .split(/[-_]/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/** `×N` for a multiplier delta, `+N`/`-N` for a flat one (shared with popModel's read). */
export function deltaLabel(delta: RuleDelta): string {
  if (delta.mult !== undefined) return `×${delta.mult}`;
  if (delta.flat !== undefined) return `${delta.flat >= 0 ? '+' : ''}${delta.flat}`;
  return '';
}

/** A cause line names a source iff it carries a non-empty source name (grammar #2). */
export function causeHasSource(line: ReceiptLine): boolean {
  return (
    (line.detail.kind === 'cause' || line.detail.kind === 'aura') &&
    line.detail.sourceName.trim().length > 0
  );
}

// A slot label that is never empty — the last-resort source token so a cause can
// always name *something* even when the shelf lookup misses (grammar guarantee).
function slotLabel(slot: Slot): string {
  return `Slot ${slot.row},${slot.col}`;
}

/**
 * Render a `ScoringTrace` as receipt lines. Pure and synchronous — a single fold
 * over the event list, mirroring the cascade player's R-6 resolution window so a
 * cause nests under the item whose total actually moved (the beneficiary), which
 * is the arrow's *source* in some fires and its *target* in others.
 */
export function receiptFromTrace(trace: ScoringTrace, deps: ReceiptDeps): ReceiptLine[] {
  const nameAt = (slot: Slot): string => deps.itemNameAt(slot) ?? slotLabel(slot);
  const ruleLabelOf = deps.ruleLabel ?? prettifySlug;
  const comboLabelOf = deps.comboLabel ?? prettifySlug;
  const itemLabelOf = deps.itemLabel ?? prettifySlug;

  const lines: ReceiptLine[] = [];

  // R-6 open resolution window + R-9 persistent row auras (with their source), so
  // a subtotal can attribute the aura that multiplied it.
  let openSlot: Slot | null = null;
  let causesInWindow = 0;
  const auraRows = new Map<number, { sourceSlot: Slot; mult: number }>();

  trace.events.forEach((event: TraceEvent, eventIndex) => {
    switch (event.kind) {
      case 'itemBase': {
        openSlot = event.slot;
        causesInWindow = 0;
        const itemName = nameAt(event.slot);
        lines.push({
          kind: 'item',
          eventIndex,
          indent: 0,
          label: itemName,
          amount: String(event.value),
          slots: [event.slot],
          detail: { kind: 'item', slot: event.slot, itemName, base: event.value },
        });
        return;
      }
      case 'ruleFire': {
        causesInWindow += 1;
        // Beneficiary = the open window, NOT necessarily targetSlot (cascadeState R-6).
        const affectedSlot = openSlot ?? event.targetSlot;
        const sourceName = nameAt(event.sourceSlot);
        const affectedName = nameAt(affectedSlot);
        const ruleLabel = ruleLabelOf(event.ruleId);
        const dLabel = deltaLabel(event.delta);
        const slots = uniqueSlots([event.sourceSlot, affectedSlot]);
        lines.push({
          kind: 'cause',
          eventIndex,
          indent: 1,
          label: `↳ ${sourceName} · ${ruleLabel}`,
          amount: `${dLabel} → ${event.runningTotal}`,
          slots,
          detail: {
            kind: 'cause',
            sourceSlot: event.sourceSlot,
            sourceName,
            targetSlot: event.targetSlot,
            affectedSlot,
            affectedName,
            ruleId: event.ruleId,
            ruleLabel,
            delta: event.delta,
            deltaLabel: dLabel,
            runningTotal: event.runningTotal,
          },
        });
        return;
      }
      case 'rowAura': {
        causesInWindow += 1;
        auraRows.set(event.row, { sourceSlot: event.sourceSlot, mult: event.mult });
        const sourceName = nameAt(event.sourceSlot);
        lines.push({
          kind: 'aura',
          eventIndex,
          // Nest under the casting item's window when one is open; else stand alone.
          indent: openSlot ? 1 : 0,
          label: `↳ ${sourceName} · row ${event.row} aura`,
          amount: `×${event.mult}`,
          slots: [event.sourceSlot],
          detail: {
            kind: 'aura',
            sourceSlot: event.sourceSlot,
            sourceName,
            row: event.row,
            mult: event.mult,
          },
        });
        return;
      }
      case 'itemTotal': {
        const slot = event.slot;
        openSlot = null;
        // Only print a subtotal when the item's number actually moved (≥1 cause in
        // its window). A plain item (base == total, no rules) already reads its
        // value on the header line — no redundant closing line.
        if (causesInWindow === 0) return;
        const itemName = nameAt(slot);
        const aura = auraRows.get(slot.row);
        // Any active row aura multiplied this total at close — attribute it so the
        // jump from the last cause's running total to the subtotal has a source.
        const appliedAura = aura ? { sourceSlot: aura.sourceSlot, mult: aura.mult } : undefined;
        lines.push({
          kind: 'subtotal',
          eventIndex,
          indent: 0,
          label: appliedAura ? `${itemName} subtotal (row ×${appliedAura.mult})` : `${itemName} subtotal`,
          amount: `= ${event.total}`,
          slots: [slot],
          detail: {
            kind: 'subtotal',
            slot,
            itemName,
            total: event.total,
            ...(appliedAura ? { appliedAura } : {}),
          },
        });
        return;
      }
      case 'comboNamed': {
        const comboName = comboLabelOf(event.comboId);
        lines.push({
          kind: 'combo',
          eventIndex,
          indent: 0,
          label: `• ${comboName}`,
          amount: '',
          slots: [...event.slots],
          detail: { kind: 'combo', comboId: event.comboId, comboName, slots: [...event.slots] },
        });
        return;
      }
      case 'transform': {
        const fromName = itemLabelOf(event.fromItem);
        const toName = itemLabelOf(event.toItem);
        lines.push({
          kind: 'transform',
          eventIndex,
          indent: 0,
          label: `→ ${fromName} became ${toName}`,
          amount: '',
          slots: [event.slot],
          detail: {
            kind: 'transform',
            slot: event.slot,
            fromItem: event.fromItem,
            fromName,
            toItem: event.toItem,
            toName,
          },
        });
        return;
      }
      case 'vanish': {
        const itemName = itemLabelOf(event.itemId);
        lines.push({
          kind: 'vanish',
          eventIndex,
          indent: 0,
          label: `× ${itemName} left the shelf`,
          amount: '',
          slots: [event.slot],
          detail: { kind: 'vanish', slot: event.slot, itemId: event.itemId, itemName },
        });
        return;
      }
      case 'dayTotal': {
        lines.push({
          kind: 'total',
          eventIndex,
          indent: 0,
          label: 'DAY TOTAL',
          amount: String(event.coins),
          slots: [],
          detail: { kind: 'total', coins: event.coins },
        });
        return;
      }
      default:
        return;
    }
  });

  return lines;
}

function uniqueSlots(slots: Slot[]): Slot[] {
  const seen = new Set<string>();
  const out: Slot[] = [];
  for (const slot of slots) {
    const key = toSlotKey(slot);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(slot);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Deps builder — wires the pure model to the live shelf + item table. Kept in
// this file (types-only imports of ItemTable/NamedCombo) so the pure core has no
// runtime dependency on @/items; the UI calls this to get nice rule/combo names.

/** Friendly phrase per rule *kind* — read for a receipt, not the raw ruleId slug. */
const RULE_KIND_LABEL: Record<string, string> = {
  adjacentTo: 'adjacency',
  perAdjacent: 'per neighbor',
  copiesNeighbor: 'copies neighbor',
  auraRow: 'row aura',
  auraColumn: 'column aura',
  scoresLast: 'scores last',
  transformsAdjacent: 'transforms neighbor',
  blocksSlot: 'blocks slot',
  onSell: 'on sell',
  growsEachDay: 'grows daily',
  agesDaily: 'ages daily',
  grantsAdjacent: 'neighbor grant',
  lonerBonus: 'loner bonus',
  multIfAdjacentMinTotal: 'rich-neighbor bonus',
  echoLeftmostInRow: 'row echo',
  countdownVanish: 'countdown',
  tagFilteredShelfMultiplier: 'tag multiplier',
  flatPerTagCount: 'per-tag bonus',
  copyHighestScoringOther: 'copies best',
  shelfMultiplierIfAnyTagCount: 'set multiplier',
  highestBaseValueMultiplier: 'top-item multiplier',
};

/** Prototype scoring levers emit synthetic ruleIds not present in any item's rules. */
const SPECIAL_RULE_LABEL: Record<string, string> = {
  spotlight: 'spotlight',
  order: "today's order",
  synergy: 'tag synergy',
};

export interface ReceiptDepsOptions {
  table?: ItemTable;
  combos?: readonly NamedCombo[];
}

/**
 * Build `ReceiptDeps` from the scored `GameState` (shelf → names) and, when
 * given, the item table (ruleId → kind label) and combo table (comboId → name).
 * Item names come straight off the shelf instances so a transformed/renamed
 * instance reads exactly as it did when it scored.
 */
export function receiptDepsFromGameState(
  state: GameState,
  options: ReceiptDepsOptions = {},
): ReceiptDeps {
  const nameByKey = new Map<string, string>();
  const itemNameById = new Map<string, string>();
  for (const slotState of state.shelf.slots) {
    if (slotState.item) {
      nameByKey.set(toSlotKey(slotState.slot), slotState.item.name);
      itemNameById.set(slotState.item.itemId, slotState.item.name);
    }
  }

  const ruleLabelById = new Map<string, string>();
  if (options.table) {
    for (const definition of options.table.values()) {
      for (const rule of definition.rules) {
        if (!ruleLabelById.has(rule.ruleId)) {
          ruleLabelById.set(rule.ruleId, RULE_KIND_LABEL[rule.kind] ?? prettifySlug(rule.ruleId));
        }
      }
      itemNameById.set(definition.id, definition.name);
    }
  }

  const comboNameById = new Map<string, string>();
  if (options.combos) {
    for (const combo of options.combos) comboNameById.set(combo.comboId, combo.name);
  }

  return {
    itemNameAt: (slot) => nameByKey.get(toSlotKey(slot)),
    ruleLabel: (ruleId) =>
      SPECIAL_RULE_LABEL[ruleId] ?? ruleLabelById.get(ruleId) ?? prettifySlug(ruleId),
    comboLabel: (comboId) => comboNameById.get(comboId) ?? prettifySlug(comboId),
    itemLabel: (itemId) => itemNameById.get(itemId) ?? prettifySlug(itemId),
  };
}

/**
 * Format receipt lines as monospace text — the paper view. Used for the review
 * packet's snapshot and available to the reduced-motion "appears complete" path.
 * Two columns with a dotted leader; indent nests causes under their window.
 */
export function formatReceipt(lines: readonly ReceiptLine[], width = 40): string[] {
  return lines.map((line) => {
    const indent = line.indent ? '  ' : '';
    const left = `${indent}${line.label}`;
    if (!line.amount) return left;
    const gap = Math.max(1, width - left.length - line.amount.length);
    const leader = gap >= 2 ? ` ${'.'.repeat(gap - 2)} ` : ' '.repeat(gap);
    return `${left}${leader}${line.amount}`;
  });
}
