import { describe, expect, it } from 'vitest';

import type { TraceEvent } from '@/contracts';
import { goldenFixtures } from '../goldens';
import { classifyDiscoveries, slowBeatStepIndices, type DiscoveryMoment } from './discoveryModel';

// --- tiny trace builders (avoid depending on the engine) ---
const combo = (comboId: string): TraceEvent => ({
  kind: 'comboNamed',
  comboId,
  slots: [{ row: 0, col: 0 }],
});
const filler = (value: number): TraceEvent => ({ kind: 'itemBase', slot: { row: 0, col: 0 }, value });

const kinds = (moments: DiscoveryMoment[]) => moments.map((m) => m.kind);
const set = (...ids: string[]) => new Set(ids);

describe('classifyDiscoveries', () => {
  it('classifies a brand-new combo as first-ever', () => {
    const moments = classifyDiscoveries([combo('wine-and-dine')], { achievedBeforeRun: set() });
    expect(kinds(moments)).toEqual(['first-ever']);
  });

  it('classifies a combo achieved in a prior run as first-this-run', () => {
    const moments = classifyDiscoveries([combo('wine-and-dine')], {
      achievedBeforeRun: set('wine-and-dine'),
    });
    expect(kinds(moments)).toEqual(['first-this-run']);
  });

  it('classifies a combo already seen on a prior day this run as repeat', () => {
    const moments = classifyDiscoveries([combo('wine-and-dine')], {
      achievedBeforeRun: set(),
      seenPriorThisRun: set('wine-and-dine'),
    });
    expect(kinds(moments)).toEqual(['repeat']);
  });

  it('marks the SECOND fire in the same trace as repeat (the pre-run snapshot edge)', () => {
    // Never achieved before → first fire is first-ever, second is repeat.
    const brandNew = classifyDiscoveries([combo('fire-sale'), filler(3), combo('fire-sale')], {
      achievedBeforeRun: set(),
    });
    expect(kinds(brandNew)).toEqual(['first-ever', 'repeat']);

    // Achieved in a prior run → first fire is first-this-run, second is repeat.
    const known = classifyDiscoveries([combo('fire-sale'), combo('fire-sale')], {
      achievedBeforeRun: set('fire-sale'),
    });
    expect(kinds(known)).toEqual(['first-this-run', 'repeat']);
  });

  it('classifies a mixed trace and reports the true event index of each combo', () => {
    const events: TraceEvent[] = [
      filler(1), //          0
      combo('cheese-board'), // 1 — new → first-ever
      filler(2), //          2
      combo('wine-and-dine'), // 3 — known all-time → first-this-run
      combo('cheese-board'), // 4 — seen this run → repeat
      combo('lucky-cluster'), // 5 — new → first-ever
    ];
    const moments = classifyDiscoveries(events, { achievedBeforeRun: set('wine-and-dine') });
    expect(moments).toEqual([
      { eventIndex: 1, comboId: 'cheese-board', kind: 'first-ever' },
      { eventIndex: 3, comboId: 'wine-and-dine', kind: 'first-this-run' },
      { eventIndex: 4, comboId: 'cheese-board', kind: 'repeat' },
      { eventIndex: 5, comboId: 'lucky-cluster', kind: 'first-ever' },
    ]);
  });

  it('emits nothing for a trace with no comboNamed events', () => {
    expect(classifyDiscoveries([filler(1), filler(2)], { achievedBeforeRun: set() })).toEqual([]);
  });

  it('classifies the golden fixtures stably and deterministically', () => {
    for (const fixture of goldenFixtures) {
      const events = fixture.scoringTrace.events;
      const empty = classifyDiscoveries(events, { achievedBeforeRun: set() });
      // Deterministic: same inputs → identical output.
      expect(classifyDiscoveries(events, { achievedBeforeRun: set() })).toEqual(empty);
      // Every classified moment points at an actual comboNamed event.
      for (const moment of empty) {
        expect(events[moment.eventIndex]?.kind).toBe('comboNamed');
      }
      // With an empty run-start catalog, a golden never yields first-this-run
      // (nothing was achieved before); each combo is first-ever until it repeats.
      const firstFireById = new Map<string, DiscoveryMoment>();
      for (const moment of empty) {
        if (!firstFireById.has(moment.comboId)) {
          firstFireById.set(moment.comboId, moment);
          expect(moment.kind).toBe('first-ever');
        } else {
          expect(moment.kind).toBe('repeat');
        }
      }
    }
  });
});

describe('slowBeatStepIndices', () => {
  it('returns the event indices of first-ever moments when enabled', () => {
    const moments = classifyDiscoveries(
      [combo('a'), combo('b'), combo('a')],
      { achievedBeforeRun: set('b') }, // a: first-ever(0)+repeat(2); b: first-this-run(1)
    );
    expect([...slowBeatStepIndices(moments, true)]).toEqual([0]);
  });

  it('returns an empty set when disabled (reduced motion → no slow-beat)', () => {
    const moments = classifyDiscoveries([combo('a')], { achievedBeforeRun: set() });
    expect(slowBeatStepIndices(moments, false).size).toBe(0);
  });
});
