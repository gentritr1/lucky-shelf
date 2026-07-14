import type { Action } from '../contracts';

import type { BotRun } from './bots';

export const DECISION_ACTION_TYPES = [
  'moveItem',
  'sellItem',
  'buyOffer',
  'reroll',
  'expandShelf',
] as const satisfies readonly Action['type'][];

export type DecisionActionType = (typeof DECISION_ACTION_TYPES)[number];

export interface DecisionDepthSample {
  actionCounts: Record<DecisionActionType, number>;
  scoredDays: number;
  finalShelfFull: boolean;
  finalItemIds: string[];
  namedComboIds: string[];
  supplierTag: string | null;
  totalCoinsEarned: number;
  daysSurvived: number;
}

export interface DecisionNumericSummary {
  count: number;
  min: number;
  median: number;
  mean: number;
  max: number;
}

export interface PresenceSummary {
  runsPresent: number;
  runRate: number;
}

export interface SupplierOutcomeSummary {
  runs: number;
  totalCoinsEarned: DecisionNumericSummary;
  daysSurvived: DecisionNumericSummary;
}

export interface DecisionDepthSummary {
  /** Descriptive proxies only; these are not proof of player intent or optimal play. */
  interpretation: 'observational-proxies';
  runs: number;
  actionsPerRunByType: Record<DecisionActionType, DecisionNumericSummary>;
  movesPerScoredDay: DecisionNumericSummary;
  zeroSellRunRate: number;
  finalShelfFullRunRate: number;
  distinctFinalItemIdsPerRun: DecisionNumericSummary;
  finalItemPresenceById: Record<string, PresenceSummary>;
  namedComboDiscoveryById: Record<string, PresenceSummary>;
  observedOutcomesBySupplier: Record<string, SupplierOutcomeSummary>;
}

function round(value: number): number {
  return Number(value.toFixed(3));
}

function median(sorted: readonly number[]): number {
  if (sorted.length === 0) return 0;
  return sorted[Math.floor((sorted.length - 1) / 2)] ?? 0;
}

export function summarizeDecisionValues(values: readonly number[]): DecisionNumericSummary {
  const sorted = [...values].sort((a, b) => a - b);
  const mean = sorted.length > 0
    ? sorted.reduce((total, value) => total + value, 0) / sorted.length
    : 0;
  return {
    count: sorted.length,
    min: sorted[0] ?? 0,
    median: median(sorted),
    mean: round(mean),
    max: sorted.at(-1) ?? 0,
  };
}

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

export function decisionDepthSample(run: BotRun): DecisionDepthSample {
  const actionCounts = Object.fromEntries(
    DECISION_ACTION_TYPES.map((type) => [
      type,
      run.actions.filter((action) => action.type === type).length,
    ]),
  ) as Record<DecisionActionType, number>;
  const finalItemIds = uniqueSorted(
    run.finalState.shelf.slots.flatMap((entry) => entry.item ? [entry.item.itemId] : []),
  );

  return {
    actionCounts,
    scoredDays: run.metrics.scoredDays,
    finalShelfFull: run.finalState.shelf.slots.every((entry) => entry.item !== null),
    finalItemIds,
    namedComboIds: uniqueSorted(run.finalState.catalogDelta.discoveredComboIds),
    supplierTag: run.metrics.supplierTag,
    totalCoinsEarned: run.finalState.runStats.totalCoinsEarned,
    daysSurvived: run.finalState.runStats.daysSurvived,
  };
}

function presenceById(
  samples: readonly DecisionDepthSample[],
  selectIds: (sample: DecisionDepthSample) => readonly string[],
): Record<string, PresenceSummary> {
  const counts = new Map<string, number>();
  for (const sample of samples) {
    for (const id of new Set(selectIds(sample))) {
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
  }
  return Object.fromEntries(
    [...counts.entries()]
      .sort(([idA], [idB]) => idA.localeCompare(idB))
      .map(([id, runsPresent]) => [
        id,
        { runsPresent, runRate: samples.length === 0 ? 0 : round(runsPresent / samples.length) },
      ]),
  );
}

export function summarizeDecisionDepth(
  samples: readonly DecisionDepthSample[],
): DecisionDepthSummary {
  const supplierSamples = new Map<string, DecisionDepthSample[]>();
  for (const sample of samples) {
    const key = sample.supplierTag ?? 'none';
    const grouped = supplierSamples.get(key) ?? [];
    grouped.push(sample);
    supplierSamples.set(key, grouped);
  }

  return {
    interpretation: 'observational-proxies',
    runs: samples.length,
    actionsPerRunByType: Object.fromEntries(
      DECISION_ACTION_TYPES.map((type) => [
        type,
        summarizeDecisionValues(samples.map((sample) => sample.actionCounts[type])),
      ]),
    ) as Record<DecisionActionType, DecisionNumericSummary>,
    movesPerScoredDay: summarizeDecisionValues(
      samples.map((sample) =>
        sample.scoredDays === 0 ? 0 : round(sample.actionCounts.moveItem / sample.scoredDays),
      ),
    ),
    zeroSellRunRate: samples.length === 0
      ? 0
      : round(samples.filter((sample) => sample.actionCounts.sellItem === 0).length / samples.length),
    finalShelfFullRunRate: samples.length === 0
      ? 0
      : round(samples.filter((sample) => sample.finalShelfFull).length / samples.length),
    distinctFinalItemIdsPerRun: summarizeDecisionValues(
      samples.map((sample) => sample.finalItemIds.length),
    ),
    finalItemPresenceById: presenceById(samples, (sample) => sample.finalItemIds),
    namedComboDiscoveryById: presenceById(samples, (sample) => sample.namedComboIds),
    observedOutcomesBySupplier: Object.fromEntries(
      [...supplierSamples.entries()]
        .sort(([tagA], [tagB]) => tagA.localeCompare(tagB))
        .map(([tag, grouped]) => [
          tag,
          {
            runs: grouped.length,
            totalCoinsEarned: summarizeDecisionValues(
              grouped.map((sample) => sample.totalCoinsEarned),
            ),
            daysSurvived: summarizeDecisionValues(grouped.map((sample) => sample.daysSurvived)),
          },
        ]),
    ),
  };
}
