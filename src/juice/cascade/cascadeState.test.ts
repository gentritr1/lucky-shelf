import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { parseFixtureCollection, toSlotKey, type Fixture } from '@/contracts';
import { buildKeyframes } from './cascadeState';

const fixtures = parseFixtureCollection(
  JSON.parse(readFileSync(resolve(process.cwd(), 'fixtures/m0-fixtures.json'), 'utf8')),
);

function byId(id: string): Fixture {
  const found = fixtures.find((f) => f.fixtureId === id);
  if (!found) throw new Error(`fixture ${id} not found`);
  return found;
}

function finalFrame(id: string) {
  const frames = buildKeyframes(byId(id).scoringTrace.events);
  return frames[frames.length - 1]!;
}

describe('cascade keyframes — R-6 beneficiary derivation', () => {
  it('fixture 1: ruleFire count-up lands on the SOURCE slot (wine buffs itself)', () => {
    const events = byId('m0-basic-wine-cheese').scoringTrace.events;
    const frames = buildKeyframes(events);
    // events[1] is the ruleFire wine(0,0)→cheese(0,1); wine is the open window.
    const afterRule = frames[1]!;
    expect(afterRule.openSlot).toBe(toSlotKey({ row: 0, col: 0 }));
    expect(afterRule.slots[toSlotKey({ row: 0, col: 0 })]?.running).toBe(7);
    // cheese (the target) is untouched by the count-up.
    expect(afterRule.slots[toSlotKey({ row: 0, col: 1 })]).toBeUndefined();
  });

  it('fixture 4: ruleFire count-up lands on the TARGET slot (honey grants wine)', () => {
    const events = byId('m0-shop-cat-row-aura').scoringTrace.events;
    const frames = buildKeyframes(events);
    const ruleIdx = events.findIndex((e) => e.kind === 'ruleFire');
    const afterRule = frames[ruleIdx]!;
    // wine (0,1) is the open window; the honey→wine arrow does not move honey.
    expect(afterRule.openSlot).toBe(toSlotKey({ row: 0, col: 1 }));
    expect(afterRule.slots[toSlotKey({ row: 0, col: 1 })]?.running).toBe(8);
  });

  it('fixture 4: row aura persists through to dayTotal (R-9) and explains the silent jump', () => {
    const frame = finalFrame('m0-shop-cat-row-aura');
    expect(frame.auraRows[0]).toBe(1.5);
    // wine total 12 (running was 8 → ×1.5 aura), honey total 3 (base 2 → ×1.5).
    expect(frame.slots[toSlotKey({ row: 0, col: 1 })]?.total).toBe(12);
    expect(frame.slots[toSlotKey({ row: 0, col: 2 })]?.total).toBe(3);
    expect(frame.dayTotal).toBe(15);
  });

  it('fixture 3: mirror beneficiary is itself (source), copying the neighbor value', () => {
    const events = byId('m0-mirror-copy').scoringTrace.events;
    const frames = buildKeyframes(events);
    const ruleIdx = events.findIndex((e) => e.kind === 'ruleFire');
    expect(frames[ruleIdx]!.openSlot).toBe(toSlotKey({ row: 0, col: 2 }));
    expect(frames[ruleIdx]!.slots[toSlotKey({ row: 0, col: 2 })]?.running).toBe(4);
  });

  it('fixture 2: named combo banner is captured and total banks 22', () => {
    const frame = finalFrame('m0-wine-dine-combo');
    expect(frame.combo?.comboId).toBe('wine-and-dine');
    expect(frame.combo?.slots).toHaveLength(4);
    expect(frame.dayTotal).toBe(22);
  });

  it('fixture 6: transform is applied after totals and banks 6', () => {
    const frame = finalFrame('m0-bamboo-transform');
    expect(frame.transformed[toSlotKey({ row: 0, col: 1 })]).toEqual({
      fromItem: 'cheese-wheel',
      toItem: 'cheese-wheel-tier-2',
    });
    expect(frame.dayTotal).toBe(6);
  });

  it('every golden ends on a dayTotal frame', () => {
    for (const fixture of fixtures) {
      expect(finalFrame(fixture.fixtureId).dayTotal).not.toBeNull();
    }
  });
});
