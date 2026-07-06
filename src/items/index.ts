import { z } from 'zod';

import type { ItemDefinition } from '../contracts';
import { ItemDefinitionSchema, RuleTargetSchema } from '../contracts';

import combosJson from './combos.json';
import itemsJson from './items.json';

/**
 * Fable-authored item data: the full 36-item MVP table (delivered after the
 * A-M1 review) and 20 named combos. The 12 kickoff exemplars keep their ids,
 * values, and ruleIds — the M0 golden traces pin them.
 */

export const ItemTableSchema = z
  .array(ItemDefinitionSchema)
  .superRefine((items, ctx) => {
    const ids = new Set<string>();
    for (const [index, item] of items.entries()) {
      if (ids.has(item.id)) {
        ctx.addIssue({
          code: 'custom',
          message: `Duplicate item id ${item.id}.`,
          path: [index, 'id'],
        });
      }
      ids.add(item.id);
    }
    for (const [index, item] of items.entries()) {
      if (item.upgradesToItemId !== undefined && !ids.has(item.upgradesToItemId)) {
        ctx.addIssue({
          code: 'custom',
          message: `upgradesToItemId ${item.upgradesToItemId} is not in the table.`,
          path: [index, 'upgradesToItemId'],
        });
      }
    }
  });

export const NamedComboSchema = z
  .object({
    comboId: z.string().min(1),
    name: z.string().min(1),
    center: RuleTargetSchema,
    adjacent: RuleTargetSchema,
    count: z.number().int().positive(),
  })
  .strict();

export const ComboTableSchema = z.array(NamedComboSchema);

export type NamedCombo = z.infer<typeof NamedComboSchema>;
export type ItemTable = Map<string, ItemDefinition>;

let cachedTable: ItemTable | null = null;
let cachedCombos: NamedCombo[] | null = null;

export function loadItemTable(): ItemTable {
  if (!cachedTable) {
    const items = ItemTableSchema.parse(itemsJson);
    cachedTable = new Map(items.map((item) => [item.id, item]));
  }
  return cachedTable;
}

export function loadCombos(): NamedCombo[] {
  if (!cachedCombos) {
    cachedCombos = ComboTableSchema.parse(combosJson);
  }
  return cachedCombos;
}

export function itemDefinition(table: ItemTable, itemId: string): ItemDefinition {
  const definition = table.get(itemId);
  if (!definition) {
    throw new Error(`Unknown item id: ${itemId}`);
  }
  return definition;
}
