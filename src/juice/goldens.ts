import { parseFixtureCollection, parseGameState, type Fixture, type GameState } from '@/contracts';
import m0Fixtures from '../../fixtures/m0-fixtures.json';
import stickyFixture from '../../fixtures/m2-arrange-sticky.json';

/**
 * The six engine-verified golden fixtures, parsed through the frozen contract at
 * load so the cascade harness can never render a trace the engine couldn't
 * produce. Lane A regenerates these; Lane B consumes them (they don't key on
 * traceId). Ordered as authored (day 1→6).
 */
export const goldenFixtures: readonly Fixture[] = parseFixtureCollection(m0Fixtures);

/**
 * The R-23 engine-generated arrange state with a sticky item — the base shelf
 * for the drag-place demo, replacing the retired hand-authored mockShelf.
 */
export const stickyArrangeState: GameState = parseGameState(stickyFixture.gameState);
