import { readdirSync, readFileSync, statSync } from 'node:fs';
import { relative, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import type { GameState, ItemInstance, Slot, TraceEvent } from '../contracts';
import { toSlotKey } from '../contracts';
import { itemDefinition, loadCombos, loadItemTable } from '../items';
import type { ItemTable } from '../items';

import { buildSlotMap, rowMajorSlots, sameSlot, slotStateAt } from './grid';
import { placementHints, type KnownPlacementHints, type PlacementHint } from './placementHints';
import { rngFor } from './rng';
import { resolveOpenShop } from './scoring';
import { makeInstance, makeState, type PlacedItem } from './testkit';

const deps = { table: loadItemTable(), combos: loadCombos() };

function held(itemId: string, index = 99): ItemInstance {
  return makeInstance({ slot: { row: 0, col: 0 }, itemId }, index);
}

function hintAt(hints: readonly PlacementHint[], slot: Slot): PlacementHint {
  const hint = hints.find((candidate) => sameSlot(candidate.slot, slot));
  if (!hint) throw new Error(`Missing hint at ${toSlotKey(slot)}.`);
  return hint;
}

function placeHeldItem(state: GameState, item: ItemInstance, slot: Slot): GameState {
  const next = JSON.parse(JSON.stringify(state)) as GameState;
  const target = slotStateAt(buildSlotMap(next.shelf), slot);
  if (!target || target.item) throw new Error(`Expected empty slot ${toSlotKey(slot)}.`);
  target.item = JSON.parse(JSON.stringify(item)) as ItemInstance;
  next.heldItem = null;
  return next;
}

function ruleFireKey(event: Extract<TraceEvent, { kind: 'ruleFire' }>): string {
  return [
    event.ruleId,
    toSlotKey(event.sourceSlot),
    toSlotKey(event.targetSlot),
    event.delta.flat ?? '',
    event.delta.mult ?? '',
    event.runningTotal,
  ].join('|');
}

function countBaselineRuleFires(events: readonly TraceEvent[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const event of events) {
    if (event.kind !== 'ruleFire') continue;
    const key = ruleFireKey(event);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

function consume(counts: Map<string, number>, key: string): boolean {
  const count = counts.get(key) ?? 0;
  if (count <= 0) return false;
  if (count === 1) counts.delete(key);
  else counts.set(key, count - 1);
  return true;
}

function itemOwnsRule(table: ItemTable, item: ItemInstance, ruleId: string): boolean {
  return itemDefinition(table, item.itemId).rules.some((rule) => rule.ruleId === ruleId);
}

function discoveredOwnerIds(
  state: GameState,
  event: Extract<TraceEvent, { kind: 'ruleFire' }>,
  known: KnownPlacementHints,
): string[] {
  const map = buildSlotMap(state.shelf);
  const source = slotStateAt(map, event.sourceSlot)?.item ?? null;
  const target = slotStateAt(map, event.targetSlot)?.item ?? null;
  const discovered = new Set(known.discoveredItemIds);
  const owners: string[] = [];
  if (source && itemOwnsRule(deps.table, source, event.ruleId) && discovered.has(source.itemId)) {
    owners.push(source.itemId);
  }
  if (
    target &&
    target !== source &&
    itemOwnsRule(deps.table, target, event.ruleId) &&
    discovered.has(target.itemId)
  ) {
    owners.push(target.itemId);
  }
  return owners;
}

function hasQualifyingCausedFire(
  state: GameState,
  item: ItemInstance,
  slot: Slot,
  known: KnownPlacementHints,
): boolean {
  const baseline = resolveOpenShop(state, deps.table, deps.combos).trace.events;
  const baselineCounts = countBaselineRuleFires(baseline);
  const hypothetical = placeHeldItem(state, item, slot);
  const events = resolveOpenShop(hypothetical, deps.table, deps.combos).trace.events;

  for (const event of events) {
    if (event.kind !== 'ruleFire') continue;
    if (consume(baselineCounts, ruleFireKey(event))) continue;
    if (!sameSlot(event.sourceSlot, slot) && !sameSlot(event.targetSlot, slot)) continue;
    if (discoveredOwnerIds(hypothetical, event, known).length > 0) return true;
  }
  return false;
}

function deepFreeze<T>(value: T): T {
  if (value === null || typeof value !== 'object') return value;
  for (const child of Object.values(value as Record<string, unknown>)) {
    deepFreeze(child);
  }
  return Object.freeze(value);
}

function walkTsFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const path = resolve(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) files.push(...walkTsFiles(path));
    else if (path.endsWith('.ts')) files.push(path);
  }
  return files;
}

describe('placementHints', () => {
  it('marks adjacency fires active only when the existing source item is discovered', () => {
    const state = makeState([{ slot: { row: 1, col: 1 }, itemId: 'wine-bottle' }]);
    const item = held('cheese-wheel');
    const target = { row: 1, col: 2 };
    const discoveredWine = { discoveredItemIds: ['wine-bottle'], achievedComboIds: [] };
    const undiscoveredWine = { discoveredItemIds: ['cheese-wheel'], achievedComboIds: [] };

    expect(hintAt(placementHints(state, item, deps, discoveredWine), target).tier).toBe('active');
    expect(hintAt(placementHints(state, item, deps, undiscoveredWine), target).tier).toBe('none');
    expect(hasQualifyingCausedFire(state, item, target, discoveredWine)).toBe(true);
  });

  it('requires the held item itself to be discovered before its own rules hint', () => {
    const state = makeState([{ slot: { row: 1, col: 1 }, itemId: 'cheese-wheel' }]);
    const item = held('wine-bottle');
    const target = { row: 1, col: 2 };

    expect(
      hintAt(
        placementHints(state, item, deps, {
          discoveredItemIds: ['wine-bottle'],
          achievedComboIds: [],
        }),
        target,
      ).tier,
    ).toBe('active');
    expect(
      hintAt(
        placementHints(state, item, deps, {
          discoveredItemIds: ['cheese-wheel'],
          achievedComboIds: [],
        }),
        target,
      ).tier,
    ).toBe('none');
  });

  it('teases completed named combos only after that combo was previously achieved', () => {
    const state = makeState([
      { slot: { row: 1, col: 1 }, itemId: 'wine-bottle' },
      { slot: { row: 1, col: 0 }, itemId: 'cheese-wheel' },
      { slot: { row: 0, col: 1 }, itemId: 'cheese-wheel' },
    ]);
    const item = held('cheese-wheel');
    const target = { row: 1, col: 2 };

    expect(
      hintAt(
        placementHints(state, item, deps, {
          discoveredItemIds: ['wine-bottle'],
          achievedComboIds: ['wine-and-dine'],
        }),
        target,
      ).comboTeased,
    ).toBe(true);
    expect(
      hintAt(
        placementHints(state, item, deps, {
          discoveredItemIds: ['wine-bottle'],
          achievedComboIds: [],
        }),
        target,
      ).comboTeased,
    ).toBe(false);
  });

  it('returns none-tier hints for an empty board when the held item has no scoring rule', () => {
    const hints = placementHints(makeState([]), held('cheese-wheel'), deps, {
      discoveredItemIds: ['cheese-wheel'],
      achievedComboIds: ['cheese-board'],
    });

    expect(hints).toHaveLength(12);
    expect(hints.every((hint) => hint.tier === 'none' && !hint.comboTeased)).toBe(true);
  });

  it('returns no hints for a full board', () => {
    const placed = rowMajorSlots({ rows: 3, cols: 4 }).map<PlacedItem>((slot, index) => ({
      slot,
      itemId: index % 2 === 0 ? 'wine-bottle' : 'cheese-wheel',
    }));

    expect(
      placementHints(makeState(placed), held('honey-jar'), deps, {
        discoveredItemIds: ['honey-jar'],
        achievedComboIds: [],
      }),
    ).toEqual([]);
  });

  it('excludes occupied blocked slots from candidate hints', () => {
    const state = makeState([{ slot: { row: 0, col: 0 }, itemId: 'shop-cat' }]);
    const hints = placementHints(state, held('cheese-wheel'), deps, {
      discoveredItemIds: ['shop-cat', 'cheese-wheel'],
      achievedComboIds: [],
    });

    expect(hints).toHaveLength(11);
    expect(hints.some((hint) => sameSlot(hint.slot, { row: 0, col: 0 }))).toBe(false);
  });

  it('does not mutate the input state or held item', () => {
    const state = makeState([
      { slot: { row: 1, col: 1 }, itemId: 'wine-bottle' },
      { slot: { row: 1, col: 0 }, itemId: 'cheese-wheel' },
    ]);
    const item = held('cheese-wheel');
    const beforeState = JSON.stringify(state);
    const beforeItem = JSON.stringify(item);

    deepFreeze(state);
    deepFreeze(item);
    placementHints(state, item, deps, {
      discoveredItemIds: ['wine-bottle', 'cheese-wheel'],
      achievedComboIds: ['wine-and-dine'],
    });

    expect(JSON.stringify(state)).toBe(beforeState);
    expect(JSON.stringify(item)).toBe(beforeItem);
  });

  it('is deterministic across 50 fuzzed boards and every active hint has a qualifying trace fire', () => {
    const itemIds = [...deps.table.keys()];
    const slots = rowMajorSlots({ rows: 3, cols: 4 });

    for (let index = 0; index < 50; index += 1) {
      const rng = rngFor('placement-hints-property', index);
      const shuffledSlots = [...slots];
      for (let slotIndex = shuffledSlots.length - 1; slotIndex > 0; slotIndex -= 1) {
        const swapIndex = rng.int(slotIndex + 1);
        const current = shuffledSlots[slotIndex];
        const swap = shuffledSlots[swapIndex];
        if (!current || !swap) throw new Error('Slot shuffle index out of bounds.');
        shuffledSlots[slotIndex] = swap;
        shuffledSlots[swapIndex] = current;
      }
      const occupiedCount = rng.int(slots.length);
      const placed = shuffledSlots.slice(0, occupiedCount).map<PlacedItem>((slot, itemIndex) => {
        const placedItem: PlacedItem = { slot, itemId: rng.pick(itemIds) };
        if (itemIndex % 5 === 0) placedItem.baseValue = rng.int(8);
        return placedItem;
      });
      const item = held(rng.pick(itemIds), 200 + index);
      const knownIds = [...new Set([...placed.map((entry) => entry.itemId), item.itemId])].filter(
        (_, knownIndex) => (knownIndex + index) % 2 === 0,
      );
      const known = {
        discoveredItemIds: knownIds,
        achievedComboIds: index % 3 === 0 ? ['wine-and-dine', 'cheese-board'] : [],
      };
      const state = makeState(placed);

      const first = placementHints(state, item, deps, known);
      const second = placementHints(state, item, deps, known);
      expect(JSON.stringify(second)).toBe(JSON.stringify(first));

      for (const hint of first) {
        if (hint.tier === 'none') continue;
        expect(hasQualifyingCausedFire(state, item, hint.slot, known)).toBe(true);
      }
    }
  });

  it('is not imported by production modules under src/sim', () => {
    const simDir = resolve(process.cwd(), 'src/sim');
    const importPattern =
      /(?:from|import|require\()\s*['"][^'"]*placementHints['"]|export\s+.*from\s+['"][^'"]*placementHints['"]/;
    const offenders = walkTsFiles(simDir)
      .filter((file) => !file.endsWith('.test.ts'))
      .filter((file) => file !== resolve(simDir, 'placementHints.ts'))
      .filter((file) => importPattern.test(readFileSync(file, 'utf8')))
      .map((file) => relative(process.cwd(), file));

    expect(offenders).toEqual([]);
  });
});
