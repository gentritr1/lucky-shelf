import { describe, expect, it } from 'vitest';

import { emptyCatalog, type GameState } from '../contracts';
import { loadCombos, loadItemTable } from '../items';
import { createCatalogPersistence } from '../persistence/catalog';
import { createRun } from '../sim';
import {
  buildCatalogView,
  catalogBands,
  createCatalogStore,
  nearestIncompleteBand,
  nextUnlockTeaserView,
  RARITY_BANDS,
  type CatalogBand,
} from './catalogStore';

function memoryStorage(seed?: Record<string, string>) {
  const map = new Map<string, string>(Object.entries(seed ?? {}));
  return {
    getItem: async (k: string) => map.get(k) ?? null,
    setItem: async (k: string, v: string) => void map.set(k, v),
    removeItem: async (k: string) => void map.delete(k),
  };
}

const deps = { table: loadItemTable(), combos: loadCombos() };

function finishedRun(runId: string): GameState {
  const state = createRun('catalog-store-test', deps);
  return {
    ...state,
    runId,
    phase: 'gameOver',
    catalogDelta: { discoveredItemIds: ['penny-jar'], discoveredComboIds: [] },
    runStats: { ...state.runStats, daysSurvived: 5, bestDayTotal: 30, totalCoinsEarned: 90 },
  };
}

describe('catalogStore recordRunEnd', () => {
  it('never wipes the persisted catalog when a run ends before any screen loaded it', async () => {
    // Regression (found in the B-M4 Fable review): recordRunEnd used to merge
    // into the in-memory emptyCatalog() and save THAT, destroying every prior
    // discovery and best for players who finished a run without visiting the
    // catalog screen first.
    const persistence = createCatalogPersistence(memoryStorage());
    const prior = emptyCatalog();
    prior.discoveredItemIds.push('cheese-wheel', 'wine-bottle');
    prior.stats.bestDayTotal = 500;
    prior.stats.longestRun = 20;
    await persistence.saveCatalog(prior);

    // Fresh session: catalog deliberately NOT loaded before the run ends.
    const store = createCatalogStore({ persistence });
    await store.getState().recordRunEnd(finishedRun('run-a'));

    const reloaded = (await persistence.loadCatalog()).catalog;
    expect(reloaded.discoveredItemIds).toEqual(
      expect.arrayContaining(['cheese-wheel', 'wine-bottle', 'penny-jar']),
    );
    expect(reloaded.stats.bestDayTotal).toBe(500);
    expect(reloaded.stats.longestRun).toBe(20);
  });

  it('stashes the pre-merge stats for the recorded run (the "New record!" baseline)', async () => {
    const persistence = createCatalogPersistence(memoryStorage());
    const prior = emptyCatalog();
    prior.stats.bestDayTotal = 500;
    await persistence.saveCatalog(prior);

    const store = createCatalogStore({ persistence });
    await store.getState().recordRunEnd(finishedRun('run-b'));

    const stash = store.getState().prevRunStats;
    expect(stash?.runId).toBe('run-b');
    // The stash is the STANDING best from disk, not the post-merge value and
    // not the pre-load empty catalog's zero.
    expect(stash?.stats.bestDayTotal).toBe(500);
  });
});

// --- B-M5 Part 2: catalog silhouettes (locked ≠ undiscovered), flag-gated. ---

const table = loadItemTable();
const combos = loadCombos();

/** A fresh player: no runs, no discoveries — everything past the "always" tier is
 *  still locked. */
function freshCatalog() {
  return emptyCatalog();
}

/** Everything unlocked: enough runs to clear every runsPlayed gate, plus the
 *  items/combos the conditional gates need. */
function exhaustedCatalog() {
  const catalog = emptyCatalog();
  catalog.stats.runsPlayed = 100;
  catalog.discoveredItemIds.push('price-gun', 'coupon-stack');
  catalog.achievedComboIds.push('lucky-cluster', 'fire-sale', 'cheese-board');
  return catalog;
}

function itemRow(catalog: ReturnType<typeof emptyCatalog>, id: string, unlockLadder: boolean) {
  const view = buildCatalogView(catalog, table, combos, { unlockLadder });
  const row = view.items.find((i) => i.id === id);
  if (!row) throw new Error(`no catalog row for ${id}`);
  return row;
}

describe('buildCatalogView — unlock silhouettes (flag on)', () => {
  it('marks a runs-gated item locked with a "Reach N runs" hint', () => {
    const chocolate = itemRow(freshCatalog(), 'chocolate-box', true); // runsPlayed: 6
    expect(chocolate.locked).toBe(true);
    expect(chocolate.discovered).toBe(false);
    expect(chocolate.unlockHint).toBe('Reach 6 runs');

    const apple = itemRow(freshCatalog(), 'apple-basket', true); // runsPlayed: 1
    expect(apple.unlockHint).toBe('Reach 1 run'); // singular
  });

  it('resolves item- and combo-gated hints to display names', () => {
    const brass = itemRow(freshCatalog(), 'brass-scale', true); // itemDiscovered: price-gun
    expect(brass.locked).toBe(true);
    expect(brass.unlockHint).toBe(`Discover the ${table.get('price-gun')?.name}`);

    const luckyCat = itemRow(freshCatalog(), 'lucky-cat', true); // comboAchieved: lucky-cluster
    const comboName = combos.find((c) => c.comboId === 'lucky-cluster')?.name;
    expect(luckyCat.unlockHint).toBe(`Discover the ${comboName} combo`);
  });

  it('never shows an "always" item as locked (it is unlocked from the start)', () => {
    const wine = itemRow(freshCatalog(), 'wine-bottle', true);
    expect(wine.locked).toBe(false);
    expect(wine.unlockHint).toBeNull();
  });

  it('lets a discovered item win over locked (locked ≠ merely undiscovered)', () => {
    const catalog = freshCatalog();
    catalog.discoveredItemIds.push('apple-basket'); // found via the daily full pool
    const apple = itemRow(catalog, 'apple-basket', true); // still runsPlayed: 1, unmet
    expect(apple.discovered).toBe(true);
    expect(apple.locked).toBe(false);
    expect(apple.unlockHint).toBeNull();
  });
});

describe('buildCatalogView — flag OFF is byte-identical to today', () => {
  it('never marks anything locked and carries no hints', () => {
    const view = buildCatalogView(freshCatalog(), table, combos, { unlockLadder: false });
    expect(view.items.every((i) => i.locked === false)).toBe(true);
    expect(view.items.every((i) => i.unlockHint === null)).toBe(true);
    // The discovered flags and completion math are untouched by the ladder.
    expect(view.items.every((i) => i.discovered === false)).toBe(true);
    expect(view.completionPct).toBe(0);
  });
});

describe('buildCatalogView — B-M11 "new" combo accent', () => {
  it('marks only the newly-achieved combos as isNew, and none by default', () => {
    const achieved = exhaustedCatalog(); // has lucky-cluster / fire-sale / cheese-board

    const plain = buildCatalogView(achieved, table, combos);
    expect(plain.combos.every((c) => c.isNew === false)).toBe(true); // default: no accent

    const flagged = buildCatalogView(achieved, table, combos, {
      newlyAchievedComboIds: new Set(['fire-sale']),
    });
    const fireSale = flagged.combos.find((c) => c.comboId === 'fire-sale');
    expect(fireSale?.isNew).toBe(true);
    // Every OTHER combo stays unaccented — the badge is not a blanket "achieved".
    expect(flagged.combos.filter((c) => c.comboId !== 'fire-sale').every((c) => c.isNew === false)).toBe(true);
  });
});

describe('buildCatalogView — CAT-2 rarity bands', () => {
  it('exposes each item def tier on its row (pure derive, no persistence)', () => {
    const view = buildCatalogView(freshCatalog(), table, combos);
    // Every row carries a 1–4 tier straight from the item def.
    expect(view.items.every((i) => [1, 2, 3, 4].includes(i.tier))).toBe(true);
    // Sanity against the frozen table distribution (14/12/11/4 = 41).
    const dist: Record<1 | 2 | 3 | 4, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
    for (const i of view.items) dist[i.tier] += 1;
    expect(dist).toEqual({ 1: 14, 2: 12, 3: 11, 4: 4 });
  });

  it('groups rows into rarest-first bands with correct per-band totals', () => {
    const view = buildCatalogView(freshCatalog(), table, combos);
    const bands = catalogBands(view.items);
    // Rarest leads: HEIRLOOM → RARE → FINE → COMMON.
    expect(bands.map((b) => b.name)).toEqual(['HEIRLOOM', 'RARE', 'FINE', 'COMMON']);
    expect(bands.map((b) => b.total)).toEqual([4, 11, 12, 14]);
    // Every item lands in exactly one band; nothing dropped or duplicated.
    expect(bands.reduce((n, b) => n + b.items.length, 0)).toBe(view.items.length);
    // Band order matches the RARITY_BANDS declaration order.
    expect(bands.map((b) => b.tier)).toEqual(RARITY_BANDS.map((b) => b.tier));
  });

  it('counts discovered per band from live discovery state', () => {
    const catalog = freshCatalog();
    // maneki-neko is a tier-4 HEIRLOOM (frozen table).
    catalog.discoveredItemIds.push('maneki-neko');
    const bands = catalogBands(buildCatalogView(catalog, table, combos).items);
    const heirloom = bands.find((b) => b.name === 'HEIRLOOM');
    expect(heirloom?.discovered).toBe(1);
    expect(heirloom?.total).toBe(4);
    // A band with no discoveries reports zero, not undefined.
    expect(bands.find((b) => b.name === 'COMMON')?.discovered).toBe(0);
  });

  it('preserves the buildCatalogView row order within each band (stable)', () => {
    const view = buildCatalogView(freshCatalog(), table, combos);
    const bands = catalogBands(view.items);
    for (const band of bands) {
      const bandIdsInViewOrder = view.items.filter((i) => i.tier === band.tier).map((i) => i.id);
      expect(band.items.map((i) => i.id)).toEqual(bandIdsInViewOrder);
    }
  });
});

describe('buildCatalogView — CAT-3 showcase payload (discovered items only)', () => {
  it('rides tags, baseValue and rule sentences on a DISCOVERED row', () => {
    const catalog = freshCatalog();
    catalog.discoveredItemIds.push('wine-bottle');
    const wine = itemRow(catalog, 'wine-bottle', false);
    expect(wine.discovered).toBe(true);
    expect(wine.tags).toEqual(['drink', 'fancy']);
    expect(wine.baseValue).toBe(4);
    expect(wine.ruleSentences).toEqual(['Earns +3 for each cheese item nearby']);
  });

  it('ships NO tags or rule text for an undiscovered id (mystery stays mystery)', () => {
    const wine = itemRow(freshCatalog(), 'wine-bottle', false);
    expect(wine.discovered).toBe(false);
    expect(wine.tags).toEqual([]);
    expect(wine.baseValue).toBe(0);
    expect(wine.ruleSentences).toEqual([]);
  });

  it('a locked ladder item also leaks nothing', () => {
    const chocolate = itemRow(freshCatalog(), 'chocolate-box', true); // locked
    expect(chocolate.locked).toBe(true);
    expect(chocolate.tags).toEqual([]);
    expect(chocolate.ruleSentences).toEqual([]);
  });
});

describe('buildCatalogView — COMBO-1 recipe descriptors', () => {
  it('carries the combo center/adjacent/count straight from the combo def', () => {
    const view = buildCatalogView(freshCatalog(), table, combos);
    const bakery = view.combos.find((c) => c.comboId === 'bakery-corner');
    expect(bakery?.center).toEqual({ kind: 'item', itemId: 'bread-loaf' });
    expect(bakery?.adjacent).toEqual({ kind: 'tag', tag: 'food' });

    const sugar = view.combos.find((c) => c.comboId === 'sugar-rush');
    expect(sugar?.center).toEqual({ kind: 'tag', tag: 'sweet' });
    expect(sugar?.adjacent).toEqual({ kind: 'tag', tag: 'sweet' });
    // adjacentCount (how many neighbors the diagram fills) is the combo def's
    // count — distinct from `count`, which is times-achieved (0 in a fresh
    // catalog).
    expect(sugar?.adjacentCount).toBe(2);
    expect(sugar?.count).toBe(0);
  });

  it('derives a player-facing unlock sentence with item names resolved', () => {
    const view = buildCatalogView(freshCatalog(), table, combos);
    const find = (id: string) => view.combos.find((c) => c.comboId === id);
    // item center + tag adjacent → "Arrange 2 food items around a Bread Loaf"
    expect(find('bakery-corner')?.unlockSentence).toBe('Arrange 2 food items around a Bread Loaf');
    // item center + item adjacent, count 3 → pluralised concrete neighbour
    expect(find('wine-and-dine')?.unlockSentence).toBe('Arrange 3 Cheese Wheels around a Wine Bottle');
    // tag center + tag adjacent → both read as archetypes
    expect(find('sugar-rush')?.unlockSentence).toBe('Arrange 2 sweet items around a sweet item');
    // vowel-initial tag takes "an"
    expect(find('heirloom-row')?.unlockSentence).toBe('Arrange 2 antique items around an antique item');
    // singular concrete neighbour is not pluralised
    expect(find('infinite-reflection')?.unlockSentence).toBe('Arrange 1 Mirror around a Mirror');
  });

  it('resolves tag-slot example cards from DISCOVERED items only, deterministically', () => {
    // Discovered: bread-loaf (food) + wine-bottle (drink). cheese-wheel and
    // honey-jar come EARLIER in table order but are NOT discovered, so the food
    // example must be bread-loaf — the first DISCOVERED food item, proving both
    // the leak rule (undiscovered ids never surface) and the deterministic pick.
    const catalog = freshCatalog();
    catalog.discoveredItemIds.push('bread-loaf', 'wine-bottle');
    const view = buildCatalogView(catalog, table, combos);
    const find = (id: string) => view.combos.find((c) => c.comboId === id);

    const bakery = find('bakery-corner');
    expect(bakery?.centerExampleItemId).toBeNull(); // item-kind slot → no example
    expect(bakery?.adjacentExampleItemId).toBe('bread-loaf');

    // No discovered item carries 'sweet' → null (UI keeps the tag glyph, no leak).
    const sugar = find('sugar-rush');
    expect(sugar?.centerExampleItemId).toBeNull();
    expect(sugar?.adjacentExampleItemId).toBeNull();

    // Every example id across every combo row must be a discovered id.
    const discovered = new Set(catalog.discoveredItemIds);
    for (const row of view.combos) {
      for (const example of [row.centerExampleItemId, row.adjacentExampleItemId]) {
        if (example !== null) expect(discovered.has(example)).toBe(true);
      }
    }
  });

  it('a fresh catalog (nothing discovered) ships no example ids at all', () => {
    const view = buildCatalogView(freshCatalog(), table, combos);
    for (const row of view.combos) {
      expect(row.centerExampleItemId).toBeNull();
      expect(row.adjacentExampleItemId).toBeNull();
    }
  });
});

describe('nextUnlockTeaserView — the summary "one more run" prompt (Part 3)', () => {
  it('prefers the nearest runs-gated unlock', () => {
    const teaser = nextUnlockTeaserView(freshCatalog(), table, combos, { unlockLadder: true });
    expect(teaser).not.toBeNull();
    expect(teaser?.itemId).toBe('apple-basket'); // runsPlayed: 1 — the nearest
    expect(teaser?.hint).toBe('Reach 1 run');
    expect(teaser?.name).toBe(table.get('apple-basket')?.name);
  });

  it('returns null when the flag is off (row omitted entirely)', () => {
    expect(nextUnlockTeaserView(freshCatalog(), table, combos, { unlockLadder: false })).toBeNull();
  });

  it('returns null when the ladder is exhausted (nothing left to chase)', () => {
    expect(nextUnlockTeaserView(exhaustedCatalog(), table, combos, { unlockLadder: true })).toBeNull();
  });

  it('PROG-1: carries runsPlayed progress for a runs-gated next unlock', () => {
    // Fresh player: 0 runs, nearest gate is apple-basket (runsPlayed 1).
    const teaser = nextUnlockTeaserView(freshCatalog(), table, combos, { unlockLadder: true });
    expect(teaser?.progress).toEqual({ current: 0, target: 1 });
  });

  it('PROG-1: carries NO progress for an item/combo-gated next unlock', () => {
    // Clear every runsPlayed gate (max is 20) so the nearest unlock is a
    // non-runs gate — brass-scale wants price-gun discovered (still unmet).
    const catalog = freshCatalog();
    catalog.stats.runsPlayed = 20;
    const teaser = nextUnlockTeaserView(catalog, table, combos, { unlockLadder: true });
    expect(teaser?.itemId).toBe('brass-scale');
    expect(teaser?.progress).toBeNull();
  });
});

describe('nearestIncompleteBand — PROG-1 shelf-growth fallback hook', () => {
  const band = (name: string, tier: 1 | 2 | 3 | 4, discovered: number, total: number): CatalogBand => ({
    tier,
    name,
    items: [],
    discovered,
    total,
  });

  it('returns the incomplete band closest to completion (fewest remaining)', () => {
    const bands = [
      band('HEIRLOOM', 4, 1, 4), // 3 remaining
      band('RARE', 3, 9, 11), // 2 remaining
      band('FINE', 2, 11, 12), // 1 remaining — the nearest
      band('COMMON', 1, 10, 14), // 4 remaining
    ];
    const near = nearestIncompleteBand(bands);
    expect(near?.name).toBe('FINE');
    expect((near as CatalogBand).total - (near as CatalogBand).discovered).toBe(1);
  });

  it('ties resolve to the rarest band (rarest-first order preserved)', () => {
    const bands = [
      band('HEIRLOOM', 4, 3, 4), // 1 remaining
      band('COMMON', 1, 13, 14), // 1 remaining — tie
    ];
    expect(nearestIncompleteBand(bands)?.name).toBe('HEIRLOOM');
  });

  it('returns null when every band is complete (nothing left to chase)', () => {
    const bands = [band('RARE', 3, 11, 11), band('COMMON', 1, 14, 14)];
    expect(nearestIncompleteBand(bands)).toBeNull();
  });

  it('reads live discovery through catalogBands (fewest-remaining wins)', () => {
    const catalog = freshCatalog();
    // maneki-neko is a tier-4 HEIRLOOM; discovering it leaves 3 of 4 HEIRLOOM
    // remaining — but every other band (11/12/14) has more remaining, so with a
    // single discovery HEIRLOOM is the closest to done.
    catalog.discoveredItemIds.push('maneki-neko');
    const bands = catalogBands(buildCatalogView(catalog, table, combos).items);
    expect(nearestIncompleteBand(bands)?.name).toBe('HEIRLOOM');
  });
});
