import type { Action, GameState } from '../contracts';
import { loadCombos, loadItemTable } from '../items';

import { playRun, type StrategyName } from './bots';
import { createRun, dispatch, type EngineDeps } from './engine';
import {
  BUILD_STEERING_ENV_VAR,
  DAY2_STARTER_ENV_VAR,
  GOAL_LADDER_ENV_VAR,
  LOOP_V2_ENV_VAR,
  SHELF_EXPANSION_ENV_VAR,
  SIGNATURE_ITEMS_ENV_VAR,
  TAG_SYNERGY_ENV_VAR,
  UNLOCK_LADDER_ENV_VAR,
  WARM_OPENING_ENV_VAR,
} from './economy';
import { uiAffordances } from './uiAffordances';

export const BALANCE_FLAG_ENV_KEYS = [
  BUILD_STEERING_ENV_VAR,
  DAY2_STARTER_ENV_VAR,
  GOAL_LADDER_ENV_VAR,
  LOOP_V2_ENV_VAR,
  SHELF_EXPANSION_ENV_VAR,
  SIGNATURE_ITEMS_ENV_VAR,
  TAG_SYNERGY_ENV_VAR,
  UNLOCK_LADDER_ENV_VAR,
  WARM_OPENING_ENV_VAR,
] as const;

export interface BalanceFlagConfig {
  name: string;
  env: Partial<Record<(typeof BALANCE_FLAG_ENV_KEYS)[number], '1'>>;
}

export const BALANCE_FLAG_CONFIGS = [
  { name: 'baseline', env: {} },
  { name: 'baselineWarmOpening', env: { [WARM_OPENING_ENV_VAR]: '1' } },
  { name: 'buildSteering', env: { [BUILD_STEERING_ENV_VAR]: '1' } },
  {
    name: 'buildSteeringWarmOpening',
    env: { [BUILD_STEERING_ENV_VAR]: '1', [WARM_OPENING_ENV_VAR]: '1' },
  },
  { name: 'loopV2', env: { [LOOP_V2_ENV_VAR]: '1', [GOAL_LADDER_ENV_VAR]: '1' } },
  {
    name: 'loopV2Day2Starter',
    env: {
      [LOOP_V2_ENV_VAR]: '1',
      [GOAL_LADDER_ENV_VAR]: '1',
      [DAY2_STARTER_ENV_VAR]: '1',
    },
  },
  {
    name: 'loopV2WarmOpening',
    env: {
      [LOOP_V2_ENV_VAR]: '1',
      [GOAL_LADDER_ENV_VAR]: '1',
      [WARM_OPENING_ENV_VAR]: '1',
    },
  },
  {
    name: 'loopV2WarmOpeningDay2Starter',
    env: {
      [LOOP_V2_ENV_VAR]: '1',
      [GOAL_LADDER_ENV_VAR]: '1',
      [WARM_OPENING_ENV_VAR]: '1',
      [DAY2_STARTER_ENV_VAR]: '1',
    },
  },
  {
    name: 'allDepth',
    env: {
      [LOOP_V2_ENV_VAR]: '1',
      [SIGNATURE_ITEMS_ENV_VAR]: '1',
      [TAG_SYNERGY_ENV_VAR]: '1',
      [BUILD_STEERING_ENV_VAR]: '1',
      [GOAL_LADDER_ENV_VAR]: '1',
    },
  },
  {
    name: 'allDepthDay2Starter',
    env: {
      [LOOP_V2_ENV_VAR]: '1',
      [SIGNATURE_ITEMS_ENV_VAR]: '1',
      [TAG_SYNERGY_ENV_VAR]: '1',
      [BUILD_STEERING_ENV_VAR]: '1',
      [GOAL_LADDER_ENV_VAR]: '1',
      [DAY2_STARTER_ENV_VAR]: '1',
    },
  },
  {
    name: 'allDepthWarmOpening',
    env: {
      [LOOP_V2_ENV_VAR]: '1',
      [SIGNATURE_ITEMS_ENV_VAR]: '1',
      [TAG_SYNERGY_ENV_VAR]: '1',
      [BUILD_STEERING_ENV_VAR]: '1',
      [GOAL_LADDER_ENV_VAR]: '1',
      [WARM_OPENING_ENV_VAR]: '1',
    },
  },
  {
    name: 'allDepthWarmOpeningDay2Starter',
    env: {
      [LOOP_V2_ENV_VAR]: '1',
      [SIGNATURE_ITEMS_ENV_VAR]: '1',
      [TAG_SYNERGY_ENV_VAR]: '1',
      [BUILD_STEERING_ENV_VAR]: '1',
      [GOAL_LADDER_ENV_VAR]: '1',
      [WARM_OPENING_ENV_VAR]: '1',
      [DAY2_STARTER_ENV_VAR]: '1',
    },
  },
  // The exact flag set intended to ship as the graduated default (RELEASE-PLAN.md
  // Gate 1) — WARM_OPENING stays off (superseded by the day-2 starter, A-M6c).
  // Every balance/goal number must be tuned against THIS config, not allDepth:
  // allDepth lacks expansion/unlocks/starter and under-measures yields.
  {
    name: 'graduating',
    env: {
      [LOOP_V2_ENV_VAR]: '1',
      [SIGNATURE_ITEMS_ENV_VAR]: '1',
      [TAG_SYNERGY_ENV_VAR]: '1',
      [BUILD_STEERING_ENV_VAR]: '1',
      [GOAL_LADDER_ENV_VAR]: '1',
      [SHELF_EXPANSION_ENV_VAR]: '1',
      [UNLOCK_LADDER_ENV_VAR]: '1',
      [DAY2_STARTER_ENV_VAR]: '1',
    },
  },
] as const satisfies readonly BalanceFlagConfig[];

export type BalanceFlagConfigName = (typeof BALANCE_FLAG_CONFIGS)[number]['name'];
export type BalancePolicyName = 'floor' | 'ceiling-greedy' | 'ceiling-combo';

export const DEFAULT_BALANCE_POLICIES: readonly BalancePolicyName[] = [
  'floor',
  'ceiling-greedy',
  'ceiling-combo',
];

export interface BalanceOptions {
  runs?: number;
  seed?: string;
  maxActions?: number;
  configs?: readonly BalanceFlagConfigName[];
  policies?: readonly BalancePolicyName[];
  deps?: EngineDeps;
}

export interface NumericSummary {
  count: number;
  min: number;
  p10: number;
  median: number;
  mean: number;
  p90: number;
  max: number;
}

export interface BalanceDaySample {
  day: number;
  coinsBeforeScoring: number;
  rentAmount: number;
  rentDueInDays: number;
  surplusCoins: number;
  surplusRatio: number;
}

export interface BalanceDaySummary {
  samples: number;
  coinsBeforeScoring: NumericSummary;
  rentAmount: NumericSummary;
  surplusCoins: NumericSummary;
  surplusRatio: NumericSummary;
}

export interface BalancePolicyReport {
  policy: BalancePolicyName;
  strategy: StrategyName | 'ui-floor';
  runs: number;
  daysSurvived: NumericSummary;
  survivalDistribution: Record<string, number>;
  deepestRentSurvived: NumericSummary;
  totalCoinsEarned: NumericSummary;
  gameOverRate: number;
  firstRentSurvivalRate: number;
  nearDeathRunRate: number;
  surplusByDay: Record<string, BalanceDaySummary>;
}

export interface BalanceConfigReport {
  config: BalanceFlagConfigName;
  policies: Record<BalancePolicyName, BalancePolicyReport | undefined>;
}

export interface BalanceReport {
  runsPerPolicy: number;
  seed: string;
  maxActions: number;
  configs: BalanceConfigReport[];
  buildSwingTotalCoinsRatio: Partial<Record<BalancePolicyName, number>>;
}

export interface RangeTarget {
  min: number;
  max: number;
}

export interface BalanceTargetBands {
  ceilingMedianRunLengthDays: RangeTarget | null;
  ceilingMaxMedianSurplusRatio: number | null;
  ceilingMaxConsecutiveDaysAboveSurplus: number | null;
  floorFirstRentSurvivalRate: RangeTarget | null;
  nearDeathRunRate: RangeTarget | null;
  buildSwingTotalCoinsRatio: RangeTarget | null;
}

// Human-set 2026-07-08 (guardrail philosophy: bracket current reality so `pnpm
// balance:assert` stays green and catches future DRIFT — these do not themselves
// tighten the economy). Calibrated against the default report (80 runs, seed
// "balance", maxActions 600); build swing is only stable at that exact report, so
// the authoritative gate is `scripts/balance.ts --assert-bands`, not the unit suite.
export const FABLE_BALANCE_TARGET_BANDS: BalanceTargetBands = {
  // Re-set by the Fable economy pass (rulings 2026-07-08 §8): the v2 rent
  // steepening deliberately pulls the depth-config ceiling down to ~24–27d
  // (baseline v1 stays 27–30d, untouched). Bracket BOTH realities: the band
  // still catches drift in either direction without blessing further loosening.
  ceilingMedianRunLengthDays: { min: 20, max: 36 },
  // Deferred to Fable: today's surplus sits at 5–7× rent — the KNOWN loose economy
  // (see FABLE-SIGNOFF-QUEUE). A guardrail here would bless that looseness, so leave
  // null until Fable tunes and sets the real cap.
  ceilingMaxMedianSurplusRatio: null,
  ceilingMaxConsecutiveDaysAboveSurplus: null,
  // Deferred: the human target is a SOFTER beginner floor (see ASPIRATIONAL_TARGET_BANDS),
  // which today's ~16–21% does not meet. That needs Fable to ease the opening economy,
  // so it is reported (not asserted) to avoid enshrining the skill cliff as acceptable.
  floorFirstRentSurvivalRate: null,
  // Deferred: nearDeath() was degenerate (100% for everyone); metric is fixed below,
  // but the tension band itself is still Fable's taste call.
  nearDeathRunRate: null,
  // Builds currently swing 1.33–1.66×; bracket to "matter without dominating".
  buildSwingTotalCoinsRatio: { min: 1.3, max: 2.0 },
};

// Aspirational, NON-BLOCKING (human, 2026-07-08): a beginner should usually clear the
// first rent. Current floor is ~16–21%, so this is intentionally NOT in
// FABLE_BALANCE_TARGET_BANDS — it needs Fable to ease the opening economy. The balance
// report surfaces the gap; nothing asserts it, so `pnpm test` stays green.
export const ASPIRATIONAL_TARGET_BANDS: Pick<BalanceTargetBands, 'floorFirstRentSurvivalRate'> = {
  floorFirstRentSurvivalRate: { min: 0.4, max: 0.7 },
};

interface RunMeasurement {
  samples: BalanceDaySample[];
  daysSurvived: number;
  deepestRentSurvived: number;
  totalCoinsEarned: number;
  gameOver: boolean;
}

function defaultDeps(): EngineDeps {
  return { table: loadItemTable(), combos: loadCombos() };
}

export function balanceFlagConfigByName(name: BalanceFlagConfigName): BalanceFlagConfig {
  const config = BALANCE_FLAG_CONFIGS.find((candidate) => candidate.name === name);
  if (!config) throw new Error(`Unknown balance flag config: ${name}`);
  return config;
}

export function withBalanceFlagConfig<T>(config: BalanceFlagConfig, fn: () => T): T {
  const previous: Record<string, string | undefined> = {};
  for (const key of BALANCE_FLAG_ENV_KEYS) {
    previous[key] = process.env[key];
    delete process.env[key];
  }
  for (const [key, value] of Object.entries(config.env)) {
    process.env[key] = value;
  }
  try {
    return fn();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

function typedActions<T extends Action['type']>(
  actions: readonly Action[],
  type: T,
): Extract<Action, { type: T }>[] {
  return actions.filter((action): action is Extract<Action, { type: T }> => action.type === type);
}

function floorAction(state: GameState, actions: readonly Action[]): Action {
  const buys = typedActions(actions, 'buyOffer');
  if (buys.length > 0) return buys[0]!;
  const placements = typedActions(actions, 'placeItem');
  if (placements.length > 0) return placements[0]!;
  const drafts = typedActions(actions, 'draftItem');
  if (drafts.length > 0) return drafts[0]!;
  const suppliers = typedActions(actions, 'chooseSupplier');
  if (suppliers.length > 0) return suppliers[0]!;
  const openShop = typedActions(actions, 'openShop');
  if (openShop.length > 0) return openShop[0]!;
  const sells = typedActions(actions, 'sellItem');
  if (sells.length > 0 && state.heldItem) return sells[0]!;
  const endRestock = typedActions(actions, 'endRestock');
  if (endRestock.length > 0) return endRestock[0]!;
  const rerolls = typedActions(actions, 'reroll');
  if (rerolls.length > 0) return rerolls[0]!;
  return actions[0]!;
}

function daySample(state: GameState): BalanceDaySample {
  const rentAmount = state.rent.amount;
  return {
    day: state.day,
    coinsBeforeScoring: state.coins,
    rentAmount,
    rentDueInDays: state.rent.dueInDays,
    surplusCoins: state.coins - rentAmount,
    surplusRatio: rentAmount > 0 ? Number((state.coins / rentAmount).toFixed(3)) : 0,
  };
}

function measureFloorRun(seed: string, deps: EngineDeps, maxActions: number): RunMeasurement {
  let state = createRun(seed, deps);
  const samples: BalanceDaySample[] = [];
  for (let step = 0; step < maxActions && state.phase !== 'gameOver'; step += 1) {
    const actions = uiAffordances(state);
    if (actions.length === 0) break;
    const action = floorAction(state, actions);
    if (action.type === 'openShop') samples.push(daySample(state));
    state = dispatch(state, action, deps);
  }
  return {
    samples,
    daysSurvived: state.runStats.daysSurvived,
    deepestRentSurvived: state.runStats.deepestRentSurvived,
    totalCoinsEarned: state.runStats.totalCoinsEarned,
    gameOver: state.phase === 'gameOver',
  };
}

function strategyForPolicy(policy: BalancePolicyName): StrategyName | 'ui-floor' {
  switch (policy) {
    case 'floor':
      return 'ui-floor';
    case 'ceiling-greedy':
      return 'greedy';
    case 'ceiling-combo':
      return 'combo';
  }
}

function measureBotRun(
  seed: string,
  strategy: StrategyName,
  deps: EngineDeps,
  maxActions: number,
): RunMeasurement {
  const run = playRun(seed, strategy, deps, maxActions);
  let replay = createRun(seed, deps);
  const samples: BalanceDaySample[] = [];
  for (const action of run.actions) {
    if (action.type === 'openShop') samples.push(daySample(replay));
    replay = dispatch(replay, action, deps);
  }
  return {
    samples,
    daysSurvived: run.finalState.runStats.daysSurvived,
    deepestRentSurvived: run.finalState.runStats.deepestRentSurvived,
    totalCoinsEarned: run.finalState.runStats.totalCoinsEarned,
    gameOver: run.finalState.phase === 'gameOver',
  };
}

function measureRun(
  seed: string,
  policy: BalancePolicyName,
  deps: EngineDeps,
  maxActions: number,
): RunMeasurement {
  const strategy = strategyForPolicy(policy);
  return strategy === 'ui-floor'
    ? measureFloorRun(seed, deps, maxActions)
    : measureBotRun(seed, strategy, deps, maxActions);
}

function quantile(sorted: readonly number[], q: number): number {
  if (sorted.length === 0) return 0;
  const index = Math.min(sorted.length - 1, Math.floor(q * (sorted.length - 1)));
  return sorted[index] ?? 0;
}

export function summarize(values: readonly number[]): NumericSummary {
  const sorted = [...values].sort((a, b) => a - b);
  const sum = sorted.reduce((total, value) => total + value, 0);
  const mean = sorted.length > 0 ? sum / sorted.length : 0;
  return {
    count: sorted.length,
    min: sorted[0] ?? 0,
    p10: quantile(sorted, 0.1),
    median: quantile(sorted, 0.5),
    mean: Number(mean.toFixed(2)),
    p90: quantile(sorted, 0.9),
    max: sorted.at(-1) ?? 0,
  };
}

function incrementDistribution(distribution: Map<string, number>, value: number): void {
  const key = String(value);
  distribution.set(key, (distribution.get(key) ?? 0) + 1);
}

function sortedDistribution(distribution: Map<string, number>): Record<string, number> {
  return Object.fromEntries(
    [...distribution.entries()].sort(([a], [b]) => Number(a) - Number(b)),
  );
}

function pushMetric(metrics: Map<number, number[]>, day: number, value: number): void {
  const values = metrics.get(day) ?? [];
  values.push(value);
  metrics.set(day, values);
}

function summarizeDays(samples: readonly BalanceDaySample[]): Record<string, BalanceDaySummary> {
  const coins = new Map<number, number[]>();
  const rents = new Map<number, number[]>();
  const surplusCoins = new Map<number, number[]>();
  const surplusRatios = new Map<number, number[]>();
  for (const sample of samples) {
    pushMetric(coins, sample.day, sample.coinsBeforeScoring);
    pushMetric(rents, sample.day, sample.rentAmount);
    pushMetric(surplusCoins, sample.day, sample.surplusCoins);
    pushMetric(surplusRatios, sample.day, sample.surplusRatio);
  }
  return Object.fromEntries(
    [...coins.keys()].sort((a, b) => a - b).map((day) => [
      String(day),
      {
        samples: coins.get(day)?.length ?? 0,
        coinsBeforeScoring: summarize(coins.get(day) ?? []),
        rentAmount: summarize(rents.get(day) ?? []),
        surplusCoins: summarize(surplusCoins.get(day) ?? []),
        surplusRatio: summarize(surplusRatios.get(day) ?? []),
      },
    ]),
  );
}

function nearDeath(samples: readonly BalanceDaySample[]): boolean {
  if (samples.length === 0) return false;
  // Every run starts broke before its FIRST rent, so counting the opening tier made
  // this read 100% for everyone (degenerate — measured nothing). A run is near-death
  // only once it has climbed past the opening rent tier and still lands within one
  // rent payment of death on a due day.
  const openingRent = Math.min(...samples.map((sample) => sample.rentAmount));
  return samples.some(
    (sample) =>
      sample.rentAmount > openingRent &&
      sample.rentDueInDays <= 1 &&
      sample.coinsBeforeScoring <= sample.rentAmount,
  );
}

function buildPolicyReport(
  config: BalanceFlagConfigName,
  policy: BalancePolicyName,
  deps: EngineDeps,
  runs: number,
  seed: string,
  maxActions: number,
): BalancePolicyReport {
  const daysSurvived: number[] = [];
  const deepestRentSurvived: number[] = [];
  const totalCoinsEarned: number[] = [];
  const allSamples: BalanceDaySample[] = [];
  const survivalDistribution = new Map<string, number>();
  let gameOvers = 0;
  let firstRentSurvivals = 0;
  let nearDeaths = 0;

  for (let index = 0; index < runs; index += 1) {
    const run = measureRun(`${seed}-${config}-${policy}-${index}`, policy, deps, maxActions);
    daysSurvived.push(run.daysSurvived);
    deepestRentSurvived.push(run.deepestRentSurvived);
    totalCoinsEarned.push(run.totalCoinsEarned);
    allSamples.push(...run.samples);
    incrementDistribution(survivalDistribution, run.daysSurvived);
    if (run.gameOver) gameOvers += 1;
    if (run.deepestRentSurvived >= 1) firstRentSurvivals += 1;
    if (nearDeath(run.samples)) nearDeaths += 1;
  }

  return {
    policy,
    strategy: strategyForPolicy(policy),
    runs,
    daysSurvived: summarize(daysSurvived),
    survivalDistribution: sortedDistribution(survivalDistribution),
    deepestRentSurvived: summarize(deepestRentSurvived),
    totalCoinsEarned: summarize(totalCoinsEarned),
    gameOverRate: Number((gameOvers / runs).toFixed(3)),
    firstRentSurvivalRate: Number((firstRentSurvivals / runs).toFixed(3)),
    nearDeathRunRate: Number((nearDeaths / runs).toFixed(3)),
    surplusByDay: summarizeDays(allSamples),
  };
}

function computeBuildSwing(
  configs: readonly BalanceConfigReport[],
): Partial<Record<BalancePolicyName, number>> {
  const baseline = configs.find((config) => config.config === 'baseline');
  const allDepth = configs.find((config) => config.config === 'allDepth');
  if (!baseline || !allDepth) return {};
  const ratios: Partial<Record<BalancePolicyName, number>> = {};
  for (const policy of DEFAULT_BALANCE_POLICIES) {
    const base = baseline.policies[policy]?.totalCoinsEarned.median ?? 0;
    const depth = allDepth.policies[policy]?.totalCoinsEarned.median ?? 0;
    if (base > 0) ratios[policy] = Number((depth / base).toFixed(3));
  }
  return ratios;
}

export function runBalanceReport(options: BalanceOptions = {}): BalanceReport {
  const runs = options.runs ?? 80;
  const seed = options.seed ?? 'balance';
  const maxActions = options.maxActions ?? 600;
  const deps = options.deps ?? defaultDeps();
  const configNames = options.configs ?? BALANCE_FLAG_CONFIGS.map((config) => config.name);
  const policies = options.policies ?? DEFAULT_BALANCE_POLICIES;

  const configs = configNames.map((configName) => {
    const config = balanceFlagConfigByName(configName);
    return withBalanceFlagConfig(config, () => {
      const policyReports: BalanceConfigReport['policies'] = {
        floor: undefined,
        'ceiling-greedy': undefined,
        'ceiling-combo': undefined,
      };
      for (const policy of policies) {
        policyReports[policy] = buildPolicyReport(configName, policy, deps, runs, seed, maxActions);
      }
      return { config: configName, policies: policyReports };
    });
  });

  return {
    runsPerPolicy: runs,
    seed,
    maxActions,
    configs,
    buildSwingTotalCoinsRatio: computeBuildSwing(configs),
  };
}

function inRange(value: number, range: RangeTarget): boolean {
  return value >= range.min && value <= range.max;
}

function ceilingReports(report: BalanceReport): BalancePolicyReport[] {
  return report.configs.flatMap((config) =>
    (['ceiling-greedy', 'ceiling-combo'] as const)
      .map((policy) => config.policies[policy])
      .filter((policyReport): policyReport is BalancePolicyReport => Boolean(policyReport)),
  );
}

function maxConsecutiveMedianSurplusDays(
  policyReport: BalancePolicyReport,
  threshold: number,
): number {
  let longest = 0;
  let current = 0;
  for (const day of Object.keys(policyReport.surplusByDay).sort((a, b) => Number(a) - Number(b))) {
    const ratio = policyReport.surplusByDay[day]?.surplusRatio.median ?? 0;
    if (ratio > threshold) {
      current += 1;
      longest = Math.max(longest, current);
    } else {
      current = 0;
    }
  }
  return longest;
}

export function evaluateBalanceBands(
  report: BalanceReport,
  targets: BalanceTargetBands = FABLE_BALANCE_TARGET_BANDS,
): string[] {
  const violations: string[] = [];

  if (targets.ceilingMedianRunLengthDays) {
    for (const policyReport of ceilingReports(report)) {
      if (!inRange(policyReport.daysSurvived.median, targets.ceilingMedianRunLengthDays)) {
        violations.push(
          `${policyReport.policy} median survival ${policyReport.daysSurvived.median}d outside ` +
            `[${targets.ceilingMedianRunLengthDays.min}, ${targets.ceilingMedianRunLengthDays.max}]`,
        );
      }
    }
  }

  if (
    targets.ceilingMaxMedianSurplusRatio !== null &&
    targets.ceilingMaxConsecutiveDaysAboveSurplus !== null
  ) {
    for (const policyReport of ceilingReports(report)) {
      const consecutive = maxConsecutiveMedianSurplusDays(
        policyReport,
        targets.ceilingMaxMedianSurplusRatio,
      );
      if (consecutive > targets.ceilingMaxConsecutiveDaysAboveSurplus) {
        violations.push(
          `${policyReport.policy} median surplus stayed above ` +
            `${targets.ceilingMaxMedianSurplusRatio}x rent for ${consecutive} consecutive days`,
        );
      }
    }
  }

  if (targets.floorFirstRentSurvivalRate) {
    for (const config of report.configs) {
      const floor = config.policies.floor;
      if (floor && !inRange(floor.firstRentSurvivalRate, targets.floorFirstRentSurvivalRate)) {
        violations.push(
          `${config.config} floor first-rent survival ${floor.firstRentSurvivalRate} outside ` +
            `[${targets.floorFirstRentSurvivalRate.min}, ${targets.floorFirstRentSurvivalRate.max}]`,
        );
      }
    }
  }

  if (targets.nearDeathRunRate) {
    for (const config of report.configs) {
      for (const policyReport of Object.values(config.policies)) {
        if (!policyReport) continue;
        if (!inRange(policyReport.nearDeathRunRate, targets.nearDeathRunRate)) {
          violations.push(
            `${config.config}/${policyReport.policy} near-death rate ` +
              `${policyReport.nearDeathRunRate} outside ` +
              `[${targets.nearDeathRunRate.min}, ${targets.nearDeathRunRate.max}]`,
          );
        }
      }
    }
  }

  if (targets.buildSwingTotalCoinsRatio) {
    for (const [policy, ratio] of Object.entries(report.buildSwingTotalCoinsRatio)) {
      if (!inRange(ratio, targets.buildSwingTotalCoinsRatio)) {
        violations.push(
          `${policy} allDepth/baseline total-coins swing ${ratio} outside ` +
            `[${targets.buildSwingTotalCoinsRatio.min}, ${targets.buildSwingTotalCoinsRatio.max}]`,
        );
      }
    }
  }

  return violations;
}

export function assertBalanceBands(
  report: BalanceReport,
  targets: BalanceTargetBands = FABLE_BALANCE_TARGET_BANDS,
): void {
  const violations = evaluateBalanceBands(report, targets);
  if (violations.length > 0) {
    throw new Error(`Balance target band violations:\n${violations.map((v) => `- ${v}`).join('\n')}`);
  }
}
