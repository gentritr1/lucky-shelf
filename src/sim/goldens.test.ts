import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { parseFixtureCollection } from '../contracts';
import { loadCombos, loadItemTable } from '../items';
import { resolveOpenShop } from './scoring';

/**
 * M1 gate: the real engine must reproduce every hand-written M0 golden trace
 * exactly — event kinds, ordering, deltas, running totals, ids.
 */

const fixtures = parseFixtureCollection(
  JSON.parse(readFileSync(resolve(process.cwd(), 'fixtures/m0-fixtures.json'), 'utf8')),
);

describe('golden trace reproduction', () => {
  const table = loadItemTable();
  const combos = loadCombos();

  for (const fixture of fixtures) {
    it(`reproduces ${fixture.fixtureId}`, () => {
      // Prototype depth levers are intentionally absent from M0 fixtures. That
      // keeps the spotlight/order branches dead here, preserving byte-identical
      // golden traces until Fable signs off on graduating the mechanics.
      expect(fixture.gameState.spotlight).toBeUndefined();
      expect(fixture.gameState.dailyOrder).toBeUndefined();
      const result = resolveOpenShop(fixture.gameState, table, combos);
      expect(result.trace).toEqual(fixture.scoringTrace);
    });
  }
});
