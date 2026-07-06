import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { z } from 'zod';

import { ActionSchema, GameStateSchema, parseFixtureCollection } from '../src/contracts';

const fixturePath = resolve(process.cwd(), 'fixtures/m0-fixtures.json');
const fixtureJson = JSON.parse(readFileSync(fixturePath, 'utf8')) as unknown;
const fixtures = parseFixtureCollection(fixtureJson);

for (const fixture of fixtures) {
  const eventCount = fixture.scoringTrace.events.length;
  console.log(`${fixture.fixtureId}: ${eventCount} trace events`);
}

console.log(`Validated ${fixtures.length} M0 fixtures.`);

const ArrangeFixtureSchema = z
  .object({
    fixtureId: z.string().min(1),
    title: z.string().min(1),
    laneBUse: z.string().min(1),
    notes: z.array(z.string().min(1)),
    sourceActions: z.array(ActionSchema),
    gameState: GameStateSchema.refine((state) => state.phase === 'arrange', {
      message: 'Sticky fixture must be in arrange phase.',
    }).refine((state) => state.shelf.slots.some((slot) => slot.item?.state.sticky), {
      message: 'Sticky fixture must include at least one sticky item.',
    }),
  })
  .strict();

const stickyFixturePath = resolve(process.cwd(), 'fixtures/m2-arrange-sticky.json');
const stickyFixtureJson = JSON.parse(readFileSync(stickyFixturePath, 'utf8')) as unknown;
const stickyFixture = ArrangeFixtureSchema.parse(stickyFixtureJson);
const stickyCount = stickyFixture.gameState.shelf.slots.filter((slot) => slot.item?.state.sticky).length;
console.log(`${stickyFixture.fixtureId}: ${stickyCount} sticky item(s), arrange phase.`);
