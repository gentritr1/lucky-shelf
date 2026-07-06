import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { parseFixtureCollection } from '../src/contracts';
import { loadCombos, loadItemTable } from '../src/items';
import { resolveOpenShop } from '../src/sim/scoring';

const args = new Set(process.argv.slice(2));
const writeInPlace = args.has('--write');
const fixturePath = resolve(process.cwd(), 'fixtures/m0-fixtures.json');
const fixtures = parseFixtureCollection(JSON.parse(readFileSync(fixturePath, 'utf8')) as unknown);
const table = loadItemTable();
const combos = loadCombos();

const regenerated = fixtures.map((fixture) => {
  const result = resolveOpenShop(fixture.gameState, table, combos);
  const oldTotal = fixture.scoringTrace.events.at(-1);
  const newTotal = result.trace.events.at(-1);
  if (oldTotal?.kind !== 'dayTotal' || newTotal?.kind !== 'dayTotal') {
    throw new Error(`Fixture ${fixture.fixtureId} is missing a dayTotal event.`);
  }
  if (oldTotal.coins !== newTotal.coins) {
    throw new Error(
      `Fixture ${fixture.fixtureId} day total changed: ${oldTotal.coins} -> ${newTotal.coins}`,
    );
  }
  return {
    ...fixture,
    scoringTrace: result.trace,
  };
});

const output = `${JSON.stringify(regenerated, null, 2)}\n`;

if (writeInPlace) {
  writeFileSync(fixturePath, output);
  console.log(`Regenerated ${regenerated.length} fixtures in ${fixturePath}.`);
} else {
  process.stdout.write(output);
}
