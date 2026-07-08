import type {
  GameState,
  ItemDefinition,
  ItemInstance,
  RuleDelta,
  ScoringTrace,
  Shelf,
  Slot,
  SlotState,
  TraceEvent,
} from '../contracts';
import { toSlotKey } from '../contracts';
import type { ItemTable, NamedCombo } from '../items';
import { itemDefinition } from '../items';

import {
  DEMAND_MULT,
  SPOTLIGHT_MULT,
  TAG_SYNERGY_ELIGIBLE_TAGS,
  TAG_SYNERGY_LADDER,
  signatureItemsEnabled,
  tagSynergyEnabled,
} from './economy';
import {
  buildSlotMap,
  compareSlots,
  neighborsOf,
  occupiedNeighbors,
  rowMajorSlots,
  sameSlot,
  type SlotMap,
} from './grid';
import { rngFor } from './rng';

/**
 * openShop() resolution. Emits the ScoringTrace exactly as Lane B animates it.
 *
 * Ordering rules (kickoff §4/§5 + freeze rulings):
 * - Slots resolve row-major; `scoresLast` items defer, then resolve row-major
 *   among themselves (R-7: itemTotal is final, so late info needs deferral).
 * - Within a slot window: itemBase → own flat rules (rule order, neighbor order
 *   left/right/up/down) → incoming flat grants (by source slot, row-major) →
 *   own mult rules → incoming mult grants → ambient row auras → order/synergy
 *   prototype mult → spotlight prototype mult at itemTotal.
 * - Every ruleFire lands in the window of the slot whose runningTotal it
 *   modifies (R-6). Auras exclude their source (R-1). Money floors after each
 *   multiplier (documented Lane A decision, flagged for Fable).
 * - After all windows: comboNamed → transform → vanish → dayTotal.
 */

interface IncomingEffect {
  sourceSlot: Slot;
  ruleId: string;
  phase: 'flat' | 'mult';
  amount: number;
}

interface AmbientAura {
  sourceSlot: Slot;
  /** null = whole shelf (shelfMultiplier); otherwise a single row index. */
  row: number | null;
  mult: number;
}

interface ScoredSlot {
  slot: Slot;
  item: ItemInstance;
  total: number;
}

interface TagSynergyMatch {
  mult: number;
}

export interface ScoringResult {
  trace: ScoringTrace;
  shelfAfter: Shelf;
  dayTotal: number;
  discoveredComboIds: string[];
}

function cloneShelf(shelf: Shelf): Shelf {
  // JSON round-trip instead of structuredClone: Shelf is plain JSON data and
  // this keeps the sim portable to older Hermes runtimes.
  return JSON.parse(JSON.stringify(shelf)) as Shelf;
}

function matchesTarget(
  item: ItemInstance,
  target: { kind: 'tag'; tag: string } | { kind: 'item'; itemId: string },
): boolean {
  return target.kind === 'tag' ? item.tags.includes(target.tag) : item.itemId === target.itemId;
}

function flatDelta(amount: number): RuleDelta {
  return { flat: amount };
}

function multDelta(amount: number): RuleDelta {
  return { mult: amount };
}

function scoredSlots(occupied: readonly SlotState[], totals: ReadonlyMap<string, number>): ScoredSlot[] {
  return occupied
    .filter((entry): entry is SlotState & { item: ItemInstance } => Boolean(entry.item))
    .map((entry) => ({
      slot: entry.slot,
      item: entry.item,
      total: totals.get(toSlotKey(entry.slot)) ?? 0,
    }));
}

function tagCounts(slots: readonly ScoredSlot[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const entry of slots) {
    for (const tag of entry.item.tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  return counts;
}

function eligibleTagCounts(occupied: readonly SlotState[]): Map<string, number> {
  const eligible = new Set(TAG_SYNERGY_ELIGIBLE_TAGS);
  const counts = new Map<string, number>();
  for (const entry of occupied) {
    const item = entry.item;
    if (!item) continue;
    for (const tag of item.tags) {
      if (!eligible.has(tag)) continue;
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  return counts;
}

function tagSynergyMultForCount(count: number): number {
  let mult = 1;
  for (const step of TAG_SYNERGY_LADDER) {
    if (count >= step.minCount) mult = step.mult;
  }
  return mult;
}

function bestTagSynergy(tags: readonly string[], counts: ReadonlyMap<string, number>): TagSynergyMatch | null {
  let best: TagSynergyMatch | null = null;
  for (const tag of tags) {
    const mult = tagSynergyMultForCount(counts.get(tag) ?? 0);
    if (mult <= 1) continue;
    if (!best || mult > best.mult) best = { mult };
  }
  return best;
}

function applySignatureFlat(
  events: TraceEvent[],
  totals: Map<string, number>,
  sourceSlot: Slot,
  targetSlot: Slot,
  ruleId: string,
  amount: number,
): void {
  if (amount === 0) return;
  const key = toSlotKey(targetSlot);
  const current = totals.get(key);
  if (current === undefined) return;
  const next = Math.max(0, Math.floor(current + amount));
  totals.set(key, next);
  events.push({
    kind: 'ruleFire',
    sourceSlot,
    targetSlot,
    ruleId,
    delta: flatDelta(amount),
    runningTotal: next,
  });
  events.push({ kind: 'itemTotal', slot: targetSlot, total: next });
}

function applySignatureMult(
  events: TraceEvent[],
  totals: Map<string, number>,
  sourceSlot: Slot,
  targetSlot: Slot,
  ruleId: string,
  mult: number,
): void {
  if (mult === 1) return;
  const key = toSlotKey(targetSlot);
  const current = totals.get(key);
  if (current === undefined) return;
  const next = Math.max(0, Math.floor(current * mult));
  totals.set(key, next);
  events.push({
    kind: 'ruleFire',
    sourceSlot,
    targetSlot,
    ruleId,
    delta: multDelta(mult),
    runningTotal: next,
  });
  events.push({ kind: 'itemTotal', slot: targetSlot, total: next });
}

function hasSignatureRule(definition: ItemDefinition): boolean {
  return definition.rules.some(
    (rule) =>
      rule.kind === 'tagFilteredShelfMultiplier' ||
      rule.kind === 'flatPerTagCount' ||
      rule.kind === 'copyHighestScoringOther' ||
      rule.kind === 'shelfMultiplierIfAnyTagCount' ||
      rule.kind === 'highestBaseValueMultiplier',
  );
}

function applySignatureRules(
  occupied: readonly SlotState[],
  totals: Map<string, number>,
  events: TraceEvent[],
  table: ItemTable,
): void {
  if (!signatureItemsEnabled()) return;

  const sources = scoredSlots(occupied, totals).filter((entry) =>
    hasSignatureRule(itemDefinition(table, entry.item.itemId)),
  );
  if (sources.length === 0) return;

  // Signature rules are post-window effects. Copy/highest selection reads this
  // settled snapshot so multiple signature items cannot form circular copies.
  const baselineTotals = new Map(totals);

  for (const source of sources) {
    const rules = itemDefinition(table, source.item.itemId).rules;
    for (const rule of rules) {
      const currentSlots = scoredSlots(occupied, totals);
      switch (rule.kind) {
        case 'tagFilteredShelfMultiplier': {
          for (const target of currentSlots) {
            if (!target.item.tags.includes(rule.tag)) continue;
            applySignatureMult(events, totals, source.slot, target.slot, rule.ruleId, rule.mult);
          }
          break;
        }
        case 'flatPerTagCount': {
          const count = currentSlots.filter((target) => target.item.tags.includes(rule.tag)).length;
          if (count === 0) break;
          applySignatureFlat(
            events,
            totals,
            source.slot,
            source.slot,
            rule.ruleId,
            count * rule.flatPerItem,
          );
          break;
        }
        case 'copyHighestScoringOther': {
          const best = currentSlots
            .filter((target) => !sameSlot(target.slot, source.slot))
            .map((target) => ({
              ...target,
              total: baselineTotals.get(toSlotKey(target.slot)) ?? 0,
            }))
            .sort((a, b) => b.total - a.total || compareSlots(a.slot, b.slot))[0];
          if (!best || best.total <= 0) break;
          applySignatureFlat(events, totals, best.slot, source.slot, rule.ruleId, best.total);
          break;
        }
        case 'shelfMultiplierIfAnyTagCount': {
          const met = [...tagCounts(currentSlots).values()].some((count) => count >= rule.minCount);
          if (!met) break;
          for (const target of currentSlots) {
            applySignatureMult(events, totals, source.slot, target.slot, rule.ruleId, rule.mult);
          }
          break;
        }
        case 'highestBaseValueMultiplier': {
          const best = currentSlots
            .filter((target) => !sameSlot(target.slot, source.slot) && target.item.baseValue > 0)
            .sort(
              (a, b) =>
                b.item.baseValue - a.item.baseValue ||
                compareSlots(a.slot, b.slot),
            )[0];
          if (!best) break;
          applySignatureMult(events, totals, source.slot, best.slot, rule.ruleId, rule.mult);
          break;
        }
        default:
          break;
      }
    }
  }
}

export function resolveOpenShop(
  state: GameState,
  table: ItemTable,
  combos: readonly NamedCombo[],
): ScoringResult {
  const shelf = state.shelf;
  const slotMap = buildSlotMap(shelf);
  const events: TraceEvent[] = [];

  const occupied: SlotState[] = rowMajorSlots(shelf.size)
    .map((slot) => slotMap.get(toSlotKey(slot)))
    .filter((entry): entry is SlotState => Boolean(entry?.item));

  const defOf = (item: ItemInstance): ItemDefinition => itemDefinition(table, item.itemId);
  const hasRule = (item: ItemInstance, kind: string): boolean =>
    defOf(item).rules.some((rule) => rule.kind === kind);

  const normal = occupied.filter((entry) => entry.item && !hasRule(entry.item, 'scoresLast'));
  const deferred = occupied.filter((entry) => entry.item && hasRule(entry.item, 'scoresLast'));
  const resolutionOrder = [...normal, ...deferred];

  // --- Precompute ambient auras (row multipliers announced via rowAura). ---
  const ambient: AmbientAura[] = [];
  for (const entry of occupied) {
    const item = entry.item;
    if (!item) continue;
    for (const rule of defOf(item).rules) {
      if (rule.kind === 'blocksSlot' && rule.shelfWideEffect) {
        if (rule.shelfWideEffect.kind === 'rowMultiplier') {
          ambient.push({ sourceSlot: entry.slot, row: entry.slot.row, mult: rule.shelfWideEffect.mult });
        } else if (rule.shelfWideEffect.kind === 'shelfMultiplier') {
          ambient.push({ sourceSlot: entry.slot, row: null, mult: rule.shelfWideEffect.mult });
        }
      } else if (rule.kind === 'auraRow' && rule.delta.mult !== undefined) {
        ambient.push({ sourceSlot: entry.slot, row: entry.slot.row, mult: rule.delta.mult });
      }
    }
  }

  // --- Precompute incoming per-slot effects (fire in the beneficiary's window, R-6). ---
  const incoming = new Map<string, IncomingEffect[]>();
  const pushIncoming = (slot: Slot, effect: IncomingEffect): void => {
    const key = toSlotKey(slot);
    const list = incoming.get(key) ?? [];
    list.push(effect);
    incoming.set(key, list);
  };
  const pushDeltaIncoming = (slot: Slot, sourceSlot: Slot, ruleId: string, delta: RuleDelta): void => {
    if (delta.flat !== undefined) {
      pushIncoming(slot, { sourceSlot, ruleId, phase: 'flat', amount: delta.flat });
    }
    if (delta.mult !== undefined) {
      pushIncoming(slot, { sourceSlot, ruleId, phase: 'mult', amount: delta.mult });
    }
  };

  for (const entry of occupied) {
    const item = entry.item;
    if (!item) continue;
    for (const rule of defOf(item).rules) {
      switch (rule.kind) {
        case 'grantsAdjacent': {
          for (const neighbor of occupiedNeighbors(slotMap, entry.slot, shelf.size)) {
            const target = neighbor.item;
            if (!target) continue;
            if (rule.target && !matchesTarget(target, rule.target)) continue;
            pushDeltaIncoming(neighbor.slot, entry.slot, rule.ruleId, rule.delta);
          }
          break;
        }
        case 'auraColumn': {
          for (const other of occupied) {
            if (!other.item || sameSlot(other.slot, entry.slot)) continue;
            if (other.slot.col !== entry.slot.col) continue;
            pushDeltaIncoming(other.slot, entry.slot, rule.ruleId, rule.delta);
          }
          break;
        }
        case 'auraRow': {
          // Mult handled ambiently above (rowAura event); flats are per-target (R-9).
          if (rule.delta.flat !== undefined) {
            for (const other of occupied) {
              if (!other.item || sameSlot(other.slot, entry.slot)) continue;
              if (other.slot.row !== entry.slot.row) continue;
              pushDeltaIncoming(other.slot, entry.slot, rule.ruleId, flatDelta(rule.delta.flat));
            }
          }
          break;
        }
        case 'echoLeftmostInRow': {
          const leftmost = occupied.find(
            (candidate) => candidate.item && candidate.slot.row === entry.slot.row,
          );
          // R-12: no effect when the source itself is the row's leftmost item.
          if (leftmost && !sameSlot(leftmost.slot, entry.slot)) {
            pushDeltaIncoming(leftmost.slot, entry.slot, rule.ruleId, multDelta(2));
          }
          break;
        }
        case 'countdownVanish': {
          if (item.state.countdown === 0) {
            for (const neighbor of occupiedNeighbors(slotMap, entry.slot, shelf.size)) {
              pushDeltaIncoming(neighbor.slot, entry.slot, rule.ruleId, rule.grantAdjacent);
            }
          }
          break;
        }
        default:
          break;
      }
    }
  }
  for (const effects of incoming.values()) {
    effects.sort(
      (a, b) => compareSlots(a.sourceSlot, b.sourceSlot) || a.ruleId.localeCompare(b.ruleId),
    );
  }

  // PROTOTYPE (Today's Order): the demand is a shelf-wide set check, known before
  // any window resolves (like ambient auras). If enough tagged items are placed,
  // every matching item's window gets the bonus mult.
  const order = state.dailyOrder ?? null;
  const orderMet = order
    ? occupied.filter((entry) => entry.item?.tags.includes(order.tag)).length >= order.count
    : false;
  const synergyEnabled = tagSynergyEnabled();
  const synergyCounts = synergyEnabled ? eligibleTagCounts(occupied) : new Map<string, number>();

  // --- Resolve slot windows. ---
  const resolvedTotals = new Map<string, number>();

  for (const entry of resolutionOrder) {
    const item = entry.item;
    if (!item) continue;
    const slot = entry.slot;
    const slotKey = toSlotKey(slot);
    const rules = defOf(item).rules;
    const blocked = rules.some((rule) => rule.kind === 'blocksSlot');

    events.push({ kind: 'itemBase', slot, value: item.baseValue });

    // Aura announcements live in the source's window, right after its itemBase.
    for (const aura of ambient) {
      if (!sameSlot(aura.sourceSlot, slot)) continue;
      if (aura.row === null) {
        for (let row = 0; row < shelf.size.rows; row += 1) {
          events.push({ kind: 'rowAura', sourceSlot: slot, row, mult: aura.mult });
        }
      } else {
        events.push({ kind: 'rowAura', sourceSlot: slot, row: aura.row, mult: aura.mult });
      }
    }

    if (blocked) {
      // R-3: a blocked slot accrues nothing.
      resolvedTotals.set(slotKey, 0);
      events.push({ kind: 'itemTotal', slot, total: 0 });
      continue;
    }

    let running = item.baseValue;
    const ownMults: { ruleId: string; targetSlot: Slot; mult: number }[] = [];

    // Own flat rules, in rule order.
    for (const rule of rules) {
      switch (rule.kind) {
        case 'adjacentTo': {
          const match = neighborsOf(slot, shelf.size)
            .map((neighbor) => slotMap.get(toSlotKey(neighbor)))
            .find((candidate) => candidate?.item && matchesTarget(candidate.item, rule.target));
          if (!match) break;
          if (rule.delta.flat !== undefined) {
            running += rule.delta.flat;
            events.push({
              kind: 'ruleFire',
              sourceSlot: slot,
              targetSlot: match.slot,
              ruleId: rule.ruleId,
              delta: flatDelta(rule.delta.flat),
              runningTotal: running,
            });
          }
          if (rule.delta.mult !== undefined) {
            ownMults.push({ ruleId: rule.ruleId, targetSlot: match.slot, mult: rule.delta.mult });
          }
          break;
        }
        case 'perAdjacent': {
          for (const neighbor of neighborsOf(slot, shelf.size)) {
            const candidate = slotMap.get(toSlotKey(neighbor));
            if (!candidate?.item || !matchesTarget(candidate.item, rule.target)) continue;
            if (rule.delta.flat !== undefined) {
              running += rule.delta.flat;
              events.push({
                kind: 'ruleFire',
                sourceSlot: slot,
                targetSlot: candidate.slot,
                ruleId: rule.ruleId,
                delta: flatDelta(rule.delta.flat),
                runningTotal: running,
              });
            }
            if (rule.delta.mult !== undefined) {
              ownMults.push({ ruleId: rule.ruleId, targetSlot: candidate.slot, mult: rule.delta.mult });
            }
          }
          break;
        }
        case 'copiesNeighbor': {
          const offsets = { left: [0, -1], right: [0, 1], up: [-1, 0], down: [1, 0] } as const;
          const [dRow, dCol] = offsets[rule.direction];
          const targetSlot = { row: slot.row + dRow, col: slot.col + dCol };
          if (!slotMap.has(toSlotKey(targetSlot))) break;
          const copied = resolvedTotals.get(toSlotKey(targetSlot)) ?? 0;
          running += copied;
          events.push({
            kind: 'ruleFire',
            sourceSlot: slot,
            targetSlot,
            ruleId: rule.ruleId,
            delta: flatDelta(copied),
            runningTotal: running,
          });
          break;
        }
        case 'lonerBonus': {
          if (occupiedNeighbors(slotMap, slot, shelf.size).length > 0) break;
          if (rule.delta.flat !== undefined) {
            running += rule.delta.flat;
            events.push({
              kind: 'ruleFire',
              sourceSlot: slot,
              targetSlot: slot,
              ruleId: rule.ruleId,
              delta: flatDelta(rule.delta.flat),
              runningTotal: running,
            });
          }
          if (rule.delta.mult !== undefined) {
            ownMults.push({ ruleId: rule.ruleId, targetSlot: slot, mult: rule.delta.mult });
          }
          break;
        }
        default:
          break;
      }
    }

    const incomingEffects = incoming.get(slotKey) ?? [];

    for (const effect of incomingEffects) {
      if (effect.phase !== 'flat') continue;
      running += effect.amount;
      events.push({
        kind: 'ruleFire',
        sourceSlot: effect.sourceSlot,
        targetSlot: slot,
        ruleId: effect.ruleId,
        delta: flatDelta(effect.amount),
        runningTotal: running,
      });
    }

    // Own conditional mult (Antique Clock) — evaluated against resolved neighbors.
    for (const rule of rules) {
      if (rule.kind !== 'multIfAdjacentMinTotal') continue;
      const neighborTotals = occupiedNeighbors(slotMap, slot, shelf.size)
        .map((neighbor) => resolvedTotals.get(toSlotKey(neighbor.slot)))
        .filter((total): total is number => total !== undefined);
      const fires =
        neighborTotals.length > 0 && neighborTotals.every((total) => total >= rule.threshold);
      if (fires) {
        ownMults.push({ ruleId: rule.ruleId, targetSlot: slot, mult: rule.mult });
      }
    }

    for (const own of ownMults) {
      running = Math.floor(running * own.mult);
      events.push({
        kind: 'ruleFire',
        sourceSlot: slot,
        targetSlot: own.targetSlot,
        ruleId: own.ruleId,
        delta: multDelta(own.mult),
        runningTotal: running,
      });
    }

    for (const effect of incomingEffects) {
      if (effect.phase !== 'mult') continue;
      running = Math.floor(running * effect.amount);
      events.push({
        kind: 'ruleFire',
        sourceSlot: effect.sourceSlot,
        targetSlot: slot,
        ruleId: effect.ruleId,
        delta: multDelta(effect.amount),
        runningTotal: running,
      });
    }

    // Ambient row auras land silently at itemTotal (announced via rowAura, R-9 note).
    for (const aura of ambient) {
      if (sameSlot(aura.sourceSlot, slot)) continue; // R-1: auras exclude their source.
      if (aura.row !== null && aura.row !== slot.row) continue;
      running = Math.floor(running * aura.mult);
    }

    // Loop v2 Phase 2a: tag-set synergy generalizes Today's Order. When the
    // synergy flag is on, order is deliberately skipped so the two don't stack.
    const synergy = synergyEnabled ? bestTagSynergy(item.tags, synergyCounts) : null;
    if (synergy) {
      running = Math.floor(running * synergy.mult);
      events.push({
        kind: 'ruleFire',
        sourceSlot: slot,
        targetSlot: slot,
        ruleId: 'synergy',
        delta: multDelta(synergy.mult),
        runningTotal: Math.max(0, Math.floor(running)),
      });
    } else if (!synergyEnabled && order && orderMet && item.tags.includes(order.tag)) {
      running = Math.floor(running * DEMAND_MULT);
      events.push({
        kind: 'ruleFire',
        sourceSlot: slot,
        targetSlot: slot,
        ruleId: 'order',
        delta: multDelta(DEMAND_MULT),
        runningTotal: Math.max(0, Math.floor(running)),
      });
    }

    // PROTOTYPE (Front Window): the day's spotlight slot multiplies the fully
    // built total — applied last so it caps the whole window. Emitted as a
    // ruleFire mult (ruleId 'spotlight') so the cascade animates it with no new
    // trace-event kind. `state.spotlight` is only populated when the flag is on,
    // so this branch is dead (and traces are unchanged) with the prototype off.
    if (state.spotlight && sameSlot(state.spotlight, slot)) {
      running = Math.floor(running * SPOTLIGHT_MULT);
      events.push({
        kind: 'ruleFire',
        sourceSlot: slot,
        targetSlot: slot,
        ruleId: 'spotlight',
        delta: multDelta(SPOTLIGHT_MULT),
        runningTotal: Math.max(0, Math.floor(running)),
      });
    }

    const total = Math.max(0, Math.floor(running));
    resolvedTotals.set(slotKey, total);
    events.push({ kind: 'itemTotal', slot, total });
  }

  // Signature stock resolves after ordinary item windows have settled, then
  // writes updated ruleFire/itemTotal pairs before non-scoring catalog/mutation
  // events. The branch is dead unless SIGNATURE_ITEMS_ENABLED is on.
  applySignatureRules(occupied, resolvedTotals, events, table);

  // --- Named combos (catalog-only, R-2). ---
  const discoveredComboIds: string[] = [];
  for (const combo of combos) {
    for (const entry of occupied) {
      const item = entry.item;
      if (!item || !matchesTarget(item, combo.center)) continue;
      const matching = occupiedNeighbors(slotMap, entry.slot, shelf.size).filter(
        (neighbor) => neighbor.item && matchesTarget(neighbor.item, combo.adjacent),
      );
      if (matching.length < combo.count) continue;
      const slots = [entry.slot, ...matching.map((neighbor) => neighbor.slot)].sort(compareSlots);
      events.push({ kind: 'comboNamed', comboId: combo.comboId, slots });
      discoveredComboIds.push(combo.comboId);
    }
  }

  // --- Post-scoring shelf mutations: transforms, vanishes, sticky (R-4/R-5). ---
  const shelfAfter = cloneShelf(shelf);
  const afterMap = buildSlotMap(shelfAfter);

  for (const entry of resolutionOrder) {
    const item = entry.item;
    if (!item) continue;
    for (const rule of defOf(item).rules) {
      if (rule.kind !== 'growsEachDay') continue;
      const growth = item.state.growthDays;
      if (growth <= 0 || growth % rule.intervalDays !== 0) continue;
      const eligible = occupiedNeighbors(slotMap, entry.slot, shelf.size).filter((neighbor) => {
        const target = neighbor.item;
        if (!target) return false;
        if (rule.target && !matchesTarget(target, rule.target)) return false;
        return defOf(target).upgradesToItemId !== undefined;
      });
      if (eligible.length === 0) continue; // R-4: no eligible neighbors = no-op.
      const rng = rngFor(state.seed, 'transform', state.day, toSlotKey(entry.slot));
      const chosen = rng.pick(eligible);
      const fromItem = chosen.item;
      if (!fromItem) continue;
      const toItemId = defOf(fromItem).upgradesToItemId;
      if (!toItemId) continue;
      const toDefinition = itemDefinition(table, toItemId);
      events.push({
        kind: 'transform',
        slot: chosen.slot,
        fromItem: fromItem.itemId,
        toItem: toItemId,
      });
      const afterEntry = afterMap.get(toSlotKey(chosen.slot));
      if (afterEntry?.item) {
        afterEntry.item.itemId = toDefinition.id;
        afterEntry.item.name = toDefinition.name;
        afterEntry.item.tier = toDefinition.tier;
        afterEntry.item.baseValue = toDefinition.baseValue;
        afterEntry.item.tags = [...toDefinition.tags];
        afterEntry.item.state.transformedFromItemId = fromItem.itemId;
        afterEntry.item.state.growthDays = 0;
      }
    }
  }

  for (const entry of resolutionOrder) {
    const item = entry.item;
    if (!item) continue;
    const vanishes = defOf(item).rules.some(
      (rule) => rule.kind === 'countdownVanish' && item.state.countdown === 0,
    );
    if (!vanishes) continue;
    events.push({ kind: 'vanish', slot: entry.slot, itemId: item.itemId });
    const afterEntry = afterMap.get(toSlotKey(entry.slot));
    if (afterEntry) {
      afterEntry.item = null;
    }
  }

  for (const entry of occupied) {
    const item = entry.item;
    if (!item) continue;
    for (const rule of defOf(item).rules) {
      if (rule.kind !== 'grantsAdjacent' || !rule.makesSticky) continue;
      for (const neighbor of occupiedNeighbors(slotMap, entry.slot, shelf.size)) {
        const target = neighbor.item;
        if (!target) continue;
        if (rule.target && !matchesTarget(target, rule.target)) continue;
        const afterEntry = afterMap.get(toSlotKey(neighbor.slot));
        if (afterEntry?.item) {
          afterEntry.item.state.sticky = true; // R-5: effective from next arrange phase.
        }
      }
    }
  }

  const dayTotal = [...resolvedTotals.values()].reduce((sum, total) => sum + total, 0);
  events.push({ kind: 'dayTotal', coins: dayTotal });

  const trace: ScoringTrace = {
    traceId: `trace-${state.seed}-d${state.day}`,
    day: state.day,
    seed: state.seed,
    events,
  };

  return { trace, shelfAfter, dayTotal, discoveredComboIds };
}
