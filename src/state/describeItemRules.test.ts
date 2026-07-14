import { describe, expect, it } from 'vitest';

import type { ItemDefinition, ItemRule } from '../contracts';
import { loadItemTable } from '../items';
import { RULES_FALLBACK, describeItemRules } from './describeItemRules';

const table = loadItemTable();

function itemById(id: string): ItemDefinition {
  const def = table.get(id);
  if (!def) throw new Error(`no item ${id}`);
  return def;
}

/** A minimal def wrapper so a single rule can be described in isolation. */
function defWithRule(rule: ItemRule): ItemDefinition {
  return { id: 'x', name: 'X', tier: 1, baseValue: 1, tags: [], rules: [rule] };
}

describe('describeItemRules — every catalog item yields real sentences', () => {
  it('gives every item in the table ≥1 non-empty, non-placeholder sentence', () => {
    for (const def of table.values()) {
      const lines = describeItemRules(def);
      expect(lines.length).toBeGreaterThan(0);
      for (const line of lines) {
        expect(line.trim().length).toBeGreaterThan(0);
        // No leaked placeholder / TODO / raw rule-kind text.
        expect(line).not.toMatch(/todo|placeholder|undefined|\bnull\b|\?\?\?/i);
      }
    }
  });

  it('falls back to one neutral line for an item with no rules', () => {
    const def: ItemDefinition = { id: 'x', name: 'X', tier: 1, baseValue: 3, tags: [], rules: [] };
    expect(describeItemRules(def)).toEqual([RULES_FALLBACK]);
  });

  it('emits one sentence per rule, in rule order', () => {
    // Antique Register carries two rules (adjacentTo deal, onSell).
    expect(describeItemRules(itemById('antique-register'))).toEqual([
      'Earns +5 next to a deal item',
      'Pays +10 extra when you sell it',
    ]);
  });
});

describe('describeItemRules — representative snapshots', () => {
  it('reads the sim semantics, not the rule name', () => {
    expect(describeItemRules(itemById('wine-bottle'))).toEqual([
      'Earns +3 for each cheese item next to it',
    ]);
    expect(describeItemRules(itemById('cheese-wheel'))).toEqual([
      'Gains +1 in value each day (up to 6)',
    ]);
    expect(describeItemRules(itemById('coupon-stack'))).toEqual([
      'Loses 1 in value each day (down to 0)',
      'Vanishes after 1 day, giving each item next to it +5 as it goes',
    ]);
    expect(describeItemRules(itemById('honey-jar'))).toEqual([
      'Gives each item next to it +4 and keeps them stuck in place',
    ]);
    expect(describeItemRules(itemById('ice-box'))).toEqual([
      'Multiplies each perishable item next to it ×1.5 and keeps them fresh',
    ]);
    expect(describeItemRules(itemById('maneki-neko'))).toEqual(['Multiplies its whole row ×1.5']);
    expect(describeItemRules(itemById('shop-cat'))).toEqual([
      'Blocks its own slot, but multiplies its whole row ×1.5',
    ]);
    expect(describeItemRules(itemById('fishbowl'))).toEqual([
      'Earns +6 with nothing next to it',
    ]);
    expect(describeItemRules(itemById('antique-clock'))).toEqual([
      'Waits and scores last, after everything else',
      'Scores ×2 when everything next to it is worth at least 5',
    ]);
    expect(describeItemRules(itemById('vintage-radio'))).toEqual([
      'Makes the leftmost item in its row score twice',
    ]);
    expect(describeItemRules(itemById('mirror'))).toEqual([
      'Copies the value of the item to its left',
    ]);
    expect(describeItemRules(itemById('lucky-bamboo'))).toEqual([
      'Every 3 days, upgrades one item next to it into its better version',
    ]);
    expect(describeItemRules(itemById('window-display'))).toEqual([
      'Multiplies your most valuable other item ×3',
    ]);
    expect(describeItemRules(itemById('consignment-sign'))).toEqual([
      'Multiplies the whole shelf ×2 when you have 4+ of any one tag',
    ]);
    expect(describeItemRules(itemById('lucky-cat'))).toEqual([
      'Matches the value of your highest-scoring other item',
    ]);
    expect(describeItemRules(itemById('ledger-book'))).toEqual([
      'Earns +5 for every antique item on the shelf',
    ]);
    expect(describeItemRules(itemById('brass-scale'))).toEqual([
      'Multiplies every food item on the shelf ×1.5',
    ]);
    expect(describeItemRules(itemById('price-gun'))).toEqual([
      'Gives every other item in its column +2',
    ]);
    expect(describeItemRules(itemById('samovar'))).toEqual([
      'Multiplies its whole column ×1.25',
    ]);
    expect(describeItemRules(itemById('candle'))).toEqual([
      'Earns +3 next to an antique item',
    ]);
  });

  it('resolves an item-target rule to a display name', () => {
    const rule: ItemRule = {
      ruleId: 'r',
      kind: 'adjacentTo',
      target: { kind: 'item', itemId: 'wine-bottle' },
      delta: { flat: 2 },
    };
    expect(describeItemRules(defWithRule(rule), { itemName: (id) => table.get(id)?.name ?? id })).toEqual([
      'Earns +2 next to a Wine Bottle',
    ]);
  });
});
