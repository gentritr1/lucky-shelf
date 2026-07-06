import { describe, expect, it } from 'vitest';

import { loadCombos, loadItemTable } from '../items';
import { createRun, dispatch } from '../sim';
import { hashState } from '../sim/hash';
import {
  cascadeMountAfterOpenShop,
  routeForPhase,
} from './phaseRouting';

const deps = { table: loadItemTable(), combos: loadCombos() };

describe('phase routing', () => {
  it('maps engine phases to their route screens', () => {
    expect(routeForPhase('delivery')).toBe('/draft');
    expect(routeForPhase('arrange')).toBe('/run');
    expect(routeForPhase('openShop')).toBe('/run');
    expect(routeForPhase('restock')).toBe('/restock');
    expect(routeForPhase('gameOver')).toBe('/summary');
  });

  it('builds a real cascade mount from openShop output without losing the scoring shelf', () => {
    let state = createRun('m3-cascade-mount', deps);
    state = dispatch(state, { type: 'draftItem', offerIndex: 0 }, deps);
    const beforeOpenShop = dispatch(state, { type: 'placeItem', slot: { row: 0, col: 0 } }, deps);
    const afterOpenShop = dispatch(beforeOpenShop, { type: 'openShop' }, deps);

    const mount = cascadeMountAfterOpenShop(beforeOpenShop, afterOpenShop);

    expect(mount.trace).toBe(afterOpenShop.lastScoringTrace);
    expect(mount.trace.events.at(-1)?.kind).toBe('dayTotal');
    expect(hashState(mount.gameState)).toBe(hashState(beforeOpenShop));
    expect(mount.nextRoute).toBe(routeForPhase(afterOpenShop.phase));
  });
});
