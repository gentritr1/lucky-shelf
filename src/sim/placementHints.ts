import type { GameState, ItemInstance, Slot, TraceEvent } from '../contracts';
import { toSlotKey } from '../contracts';
import type { ItemTable, NamedCombo } from '../items';
import { itemDefinition } from '../items';

import { buildSlotMap, rowMajorSlots, sameSlot, slotStateAt } from './grid';
import { resolveOpenShop } from './scoring';

export interface PlacementHintDeps {
  table: ItemTable;
  combos: readonly NamedCombo[];
}

export interface KnownPlacementHints {
  discoveredItemIds: readonly string[];
  achievedComboIds: readonly string[];
}

export interface PlacementHint {
  slot: Slot;
  tier: 'none' | 'active';
  comboTeased: boolean;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function slotKey(slot: Slot): string {
  return toSlotKey(slot);
}

function sameSlotKey(a: Slot, b: Slot): boolean {
  return sameSlot(a, b);
}

function countKey(counts: Map<string, number>, key: string): void {
  counts.set(key, (counts.get(key) ?? 0) + 1);
}

function consumeKey(counts: Map<string, number>, key: string): boolean {
  const count = counts.get(key) ?? 0;
  if (count <= 0) return false;
  if (count === 1) counts.delete(key);
  else counts.set(key, count - 1);
  return true;
}

function ruleFireKey(event: Extract<TraceEvent, { kind: 'ruleFire' }>): string {
  return [
    event.ruleId,
    slotKey(event.sourceSlot),
    slotKey(event.targetSlot),
    event.delta.flat ?? '',
    event.delta.mult ?? '',
    event.runningTotal,
  ].join('|');
}

function comboKey(event: Extract<TraceEvent, { kind: 'comboNamed' }>): string {
  return `${event.comboId}|${event.slots.map(slotKey).join(';')}`;
}

function baselineRuleFireCounts(events: readonly TraceEvent[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const event of events) {
    if (event.kind === 'ruleFire') countKey(counts, ruleFireKey(event));
  }
  return counts;
}

function baselineComboCounts(events: readonly TraceEvent[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const event of events) {
    if (event.kind === 'comboNamed') countKey(counts, comboKey(event));
  }
  return counts;
}

function itemOwnsRule(table: ItemTable, item: ItemInstance, ruleId: string): boolean {
  return itemDefinition(table, item.itemId).rules.some((rule) => rule.ruleId === ruleId);
}

function ruleOwnerItemIds(
  state: GameState,
  table: ItemTable,
  event: Extract<TraceEvent, { kind: 'ruleFire' }>,
): string[] {
  const map = buildSlotMap(state.shelf);
  const source = slotStateAt(map, event.sourceSlot)?.item ?? null;
  const target = slotStateAt(map, event.targetSlot)?.item ?? null;
  const ownerIds: string[] = [];

  if (source && itemOwnsRule(table, source, event.ruleId)) ownerIds.push(source.itemId);
  if (target && target !== source && itemOwnsRule(table, target, event.ruleId)) {
    ownerIds.push(target.itemId);
  }
  if (ownerIds.length > 0) return ownerIds;

  for (const definition of table.values()) {
    if (definition.rules.some((rule) => rule.ruleId === event.ruleId)) {
      ownerIds.push(definition.id);
    }
  }
  return ownerIds;
}

function placeHeldItem(state: GameState, heldItem: ItemInstance, slot: Slot): GameState {
  const next = clone(state);
  const target = slotStateAt(buildSlotMap(next.shelf), slot);
  if (!target || target.item) {
    throw new Error(`Cannot evaluate placement hint for non-empty slot ${slotKey(slot)}.`);
  }
  target.item = clone(heldItem);
  next.heldItem = null;
  return next;
}

function hasDiscoveredCausedRuleFire(
  baselineCounts: ReadonlyMap<string, number>,
  candidate: Slot,
  hypotheticalState: GameState,
  hypotheticalEvents: readonly TraceEvent[],
  table: ItemTable,
  discoveredItemIds: ReadonlySet<string>,
): boolean {
  const remainingBaseline = new Map(baselineCounts);
  for (const event of hypotheticalEvents) {
    if (event.kind !== 'ruleFire') continue;

    const key = ruleFireKey(event);
    if (consumeKey(remainingBaseline, key)) continue;
    if (!sameSlotKey(event.sourceSlot, candidate) && !sameSlotKey(event.targetSlot, candidate)) {
      continue;
    }

    const ownerIds = ruleOwnerItemIds(hypotheticalState, table, event);
    if (ownerIds.some((itemId) => discoveredItemIds.has(itemId))) {
      return true;
    }
  }
  return false;
}

function teasesAchievedCombo(
  baselineCounts: ReadonlyMap<string, number>,
  candidate: Slot,
  hypotheticalEvents: readonly TraceEvent[],
  achievedComboIds: ReadonlySet<string>,
): boolean {
  const remainingBaseline = new Map(baselineCounts);
  for (const event of hypotheticalEvents) {
    if (event.kind !== 'comboNamed') continue;

    const key = comboKey(event);
    if (consumeKey(remainingBaseline, key)) continue;
    if (!achievedComboIds.has(event.comboId)) continue;
    if (event.slots.some((slot) => sameSlotKey(slot, candidate))) return true;
  }
  return false;
}

export function placementHints(
  state: GameState,
  heldItem: ItemInstance,
  deps: PlacementHintDeps,
  known: KnownPlacementHints,
): PlacementHint[] {
  const discoveredItemIds = new Set(known.discoveredItemIds);
  const achievedComboIds = new Set(known.achievedComboIds);
  const baseline = resolveOpenShop(state, deps.table, deps.combos).trace.events;
  const baselineRules = baselineRuleFireCounts(baseline);
  const baselineCombos = baselineComboCounts(baseline);
  const map = buildSlotMap(state.shelf);
  const hints: PlacementHint[] = [];

  for (const slot of rowMajorSlots(state.shelf.size)) {
    const slotState = slotStateAt(map, slot);
    if (!slotState || slotState.item) continue;

    const hypotheticalState = placeHeldItem(state, heldItem, slot);
    const hypotheticalEvents = resolveOpenShop(hypotheticalState, deps.table, deps.combos).trace.events;
    const active = hasDiscoveredCausedRuleFire(
      baselineRules,
      slot,
      hypotheticalState,
      hypotheticalEvents,
      deps.table,
      discoveredItemIds,
    );
    const comboTeased = teasesAchievedCombo(
      baselineCombos,
      slot,
      hypotheticalEvents,
      achievedComboIds,
    );

    hints.push({ slot, tier: active ? 'active' : 'none', comboTeased });
  }

  return hints;
}
