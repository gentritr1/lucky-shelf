import type { Catalog } from '../contracts';

export type UnlockPredicate =
  | { kind: 'always' }
  | { kind: 'runsPlayed'; count: number }
  | { kind: 'itemDiscovered'; itemId: string }
  | { kind: 'comboAchieved'; comboId: string };

export type UnlockTable = Readonly<Record<string, UnlockPredicate>>;

export interface NextUnlock {
  itemId: string;
  predicate: UnlockPredicate;
}

export const UNLOCK_LADDER: UnlockTable = {
  'wine-bottle': { kind: 'always' },
  'cheese-wheel': { kind: 'always' },
  'honey-jar': { kind: 'always' },
  'lucky-bamboo': { kind: 'always' },
  'coupon-stack': { kind: 'always' },
  'bread-loaf': { kind: 'always' },
  candle: { kind: 'always' },
  'flower-vase': { kind: 'always' },
  'penny-jar': { kind: 'always' },
  mirror: { kind: 'always' },
  'shop-cat': { kind: 'always' },
  'price-gun': { kind: 'always' },
  fishbowl: { kind: 'always' },
  'ice-box': { kind: 'always' },
  'antique-clock': { kind: 'always' },
  'vintage-radio': { kind: 'always' },

  'apple-basket': { kind: 'runsPlayed', count: 1 },
  'tea-tin': { kind: 'runsPlayed', count: 2 },
  'dice-cup': { kind: 'runsPlayed', count: 3 },
  'postcard-rack': { kind: 'runsPlayed', count: 4 },
  'soap-bar': { kind: 'runsPlayed', count: 5 },
  'chocolate-box': { kind: 'runsPlayed', count: 6 },
  'record-crate': { kind: 'runsPlayed', count: 7 },
  'music-box': { kind: 'runsPlayed', count: 8 },
  'oil-painting': { kind: 'runsPlayed', count: 9 },
  samovar: { kind: 'runsPlayed', count: 10 },
  'antique-register': { kind: 'runsPlayed', count: 12 },
  'observation-hive': { kind: 'runsPlayed', count: 14 },
  'golden-scale': { kind: 'runsPlayed', count: 16 },
  'maneki-neko': { kind: 'runsPlayed', count: 18 },
  orrery: { kind: 'runsPlayed', count: 20 },

  'brass-scale': { kind: 'itemDiscovered', itemId: 'price-gun' },
  'ledger-book': { kind: 'itemDiscovered', itemId: 'coupon-stack' },
  'lucky-cat': { kind: 'comboAchieved', comboId: 'lucky-cluster' },
  'consignment-sign': { kind: 'comboAchieved', comboId: 'fire-sale' },
  'window-display': { kind: 'comboAchieved', comboId: 'cheese-board' },
};

function predicateIsMet(catalog: Catalog, predicate: UnlockPredicate): boolean {
  switch (predicate.kind) {
    case 'always':
      return true;
    case 'runsPlayed':
      return catalog.stats.runsPlayed >= predicate.count;
    case 'itemDiscovered':
      return catalog.discoveredItemIds.includes(predicate.itemId);
    case 'comboAchieved':
      return catalog.achievedComboIds.includes(predicate.comboId);
    default: {
      const exhausted: never = predicate;
      throw new Error(`Unknown unlock predicate ${JSON.stringify(exhausted)}`);
    }
  }
}

function sortedItems(items: Iterable<string>): string[] {
  return [...items].sort((a, b) => a.localeCompare(b));
}

export function unlockedItemIds(
  catalog: Catalog,
  table: UnlockTable = UNLOCK_LADDER,
): string[] {
  return sortedItems(
    Object.entries(table)
      .filter(([, predicate]) => predicateIsMet(catalog, predicate))
      .map(([itemId]) => itemId),
  );
}

export function alwaysUnlockedItemIds(table: UnlockTable = UNLOCK_LADDER): string[] {
  return sortedItems(
    Object.entries(table)
      .filter(([, predicate]) => predicate.kind === 'always')
      .map(([itemId]) => itemId),
  );
}

export function nextUnlocks(catalog: Catalog, table: UnlockTable = UNLOCK_LADDER): NextUnlock[] {
  const locked = Object.entries(table)
    .filter(([, predicate]) => !predicateIsMet(catalog, predicate))
    .map(([itemId, predicate]) => ({ itemId, predicate }));
  const runGates = locked.filter((entry) => entry.predicate.kind === 'runsPlayed');
  const nextRunCount = Math.min(
    ...runGates.map((entry) =>
      entry.predicate.kind === 'runsPlayed' ? entry.predicate.count : Number.POSITIVE_INFINITY,
    ),
  );

  return locked
    .filter(
      (entry) =>
        entry.predicate.kind !== 'runsPlayed' ||
        entry.predicate.count === nextRunCount,
    )
    .sort((a, b) => a.itemId.localeCompare(b.itemId));
}
