import { describe, expect, it } from 'vitest';

import { loadCombos, loadItemTable } from '../items';

import { playRun } from './bots';
import {
  decisionDepthSample,
  summarizeDecisionDepth,
  type DecisionDepthSample,
} from './decisionDepth';

const deps = { table: loadItemTable(), combos: loadCombos() };

describe('decision-depth report', () => {
  it('extracts descriptive action and final-shelf evidence from a bot run', () => {
    const run = playRun('decision-depth-sample', 'greedy', deps, 120);
    const sample = decisionDepthSample(run);

    expect(sample.actionCounts.moveItem).toBe(
      run.actions.filter((action) => action.type === 'moveItem').length,
    );
    expect(sample.finalItemIds).toEqual([...new Set(sample.finalItemIds)].sort());
    expect(sample.namedComboIds).toEqual([...new Set(sample.namedComboIds)].sort());
    expect(sample.scoredDays).toBe(run.metrics.scoredDays);
  });

  it('summarizes run-level presence once and keeps supplier outcomes observational', () => {
    const samples: DecisionDepthSample[] = [
      {
        actionCounts: { moveItem: 4, sellItem: 0, buyOffer: 2, reroll: 1, expandShelf: 0 },
        scoredDays: 2,
        finalShelfFull: true,
        finalItemIds: ['apple-basket', 'apple-basket', 'tea-tin'],
        namedComboIds: ['tea-time', 'tea-time'],
        supplierTag: 'cozy',
        totalCoinsEarned: 100,
        daysSurvived: 8,
      },
      {
        actionCounts: { moveItem: 0, sellItem: 1, buyOffer: 3, reroll: 0, expandShelf: 1 },
        scoredDays: 0,
        finalShelfFull: false,
        finalItemIds: ['tea-tin'],
        namedComboIds: [],
        supplierTag: 'cozy',
        totalCoinsEarned: 60,
        daysSurvived: 5,
      },
    ];

    const report = summarizeDecisionDepth(samples);

    expect(report.interpretation).toBe('observational-proxies');
    expect(report.movesPerScoredDay.mean).toBe(1);
    expect(report.zeroSellRunRate).toBe(0.5);
    expect(report.finalShelfFullRunRate).toBe(0.5);
    expect(report.finalItemPresenceById['apple-basket']).toEqual({ runsPresent: 1, runRate: 0.5 });
    expect(report.finalItemPresenceById['tea-tin']).toEqual({ runsPresent: 2, runRate: 1 });
    expect(report.namedComboDiscoveryById['tea-time']).toEqual({ runsPresent: 1, runRate: 0.5 });
    expect(report.observedOutcomesBySupplier.cozy?.runs).toBe(2);
    expect(report.observedOutcomesBySupplier.cozy?.totalCoinsEarned.mean).toBe(80);
  });
});
