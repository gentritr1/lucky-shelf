import { loadCombos, loadItemTable } from '../src/items';
import { playRun, type StrategyName } from '../src/sim/bots';
import {
  BUILD_STEER_BIAS,
  buildSteeringEnabled,
  goalLadderEnabled,
  loopV2Enabled,
  shelfExpansionEnabled,
  tagSynergyEnabled,
  warmOpeningEnabled,
} from '../src/sim/economy';

/**
 * Fuzz harness v1 (kickoff §5): headless seeded runs with strategy bots,
 * JSON stats out. Fable uses this to tune the item table and rent curve.
 *
 *   pnpm fuzz -- --runs 5000 --strategy greedy
 *   pnpm fuzz -- --runs 200 --strategy all --seed nightly-42
 */

interface FuzzArgs {
  runs: number;
  strategy: StrategyName | 'all';
  seed: string;
  maxActions: number;
}

const DAY_METRIC_REPORT_LIMIT = 12;

interface NumericSummary {
  mean: number;
  stddev: number;
  median: number;
  p90: number;
  p95: number;
  max: number;
}

function parseArgs(argv: readonly string[]): FuzzArgs {
  const args: FuzzArgs = { runs: 100, strategy: 'all', seed: 'fuzz', maxActions: 400 };
  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    const value = argv[index + 1];
    switch (flag) {
      case '--runs':
        args.runs = Number(value);
        index += 1;
        break;
      case '--strategy':
        if (value === 'random' || value === 'greedy' || value === 'combo' || value === 'all') {
          args.strategy = value;
        } else {
          throw new Error(`Unknown strategy: ${value}`);
        }
        index += 1;
        break;
      case '--seed':
        args.seed = value ?? 'fuzz';
        index += 1;
        break;
      case '--max-actions':
        args.maxActions = Number(value);
        index += 1;
        break;
      default:
        throw new Error(`Unknown flag: ${flag}`);
    }
  }
  if (!Number.isInteger(args.runs) || args.runs <= 0) {
    throw new Error(`--runs must be a positive integer, got ${args.runs}.`);
  }
  return args;
}

function quantile(sorted: readonly number[], q: number): number {
  if (sorted.length === 0) return 0;
  const index = Math.min(sorted.length - 1, Math.floor(q * sorted.length));
  return sorted[index] ?? 0;
}

function summarize(values: readonly number[]): NumericSummary {
  const sorted = [...values].sort((a, b) => a - b);
  const sum = sorted.reduce((total, value) => total + value, 0);
  const mean = sorted.length ? sum / sorted.length : 0;
  const variance = sorted.length
    ? sorted.reduce((total, value) => total + (value - mean) ** 2, 0) / sorted.length
    : 0;
  return {
    mean: sorted.length ? Number(mean.toFixed(2)) : 0,
    stddev: Number(Math.sqrt(variance).toFixed(2)),
    median: quantile(sorted, 0.5),
    p90: quantile(sorted, 0.9),
    p95: quantile(sorted, 0.95),
    max: sorted.length ? (sorted[sorted.length - 1] ?? 0) : 0,
  };
}

function pushDayMetric(metrics: Map<string, number[]>, day: string, value: number): void {
  const values = metrics.get(day) ?? [];
  values.push(value);
  metrics.set(day, values);
}

function summarizeDayMetrics(metrics: Map<string, number[]>): Record<string, NumericSummary> {
  return Object.fromEntries(
    [...metrics.entries()]
      .filter(([day]) => Number(day) <= DAY_METRIC_REPORT_LIMIT)
      .sort(([dayA], [dayB]) => Number(dayA) - Number(dayB))
      .map(([day, values]) => [day, summarize(values)]),
  );
}

function summarizeMetricMap(metrics: Map<string, number[]>): Record<string, NumericSummary> {
  return Object.fromEntries(
    [...metrics.entries()]
      .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
      .map(([key, values]) => [key, summarize(values)]),
  );
}

function incrementDistribution(distribution: Map<string, number>, key: string): void {
  distribution.set(key, (distribution.get(key) ?? 0) + 1);
}

function sortedDistribution(distribution: Map<string, number>): Record<string, number> {
  return Object.fromEntries(
    [...distribution.entries()].sort(([keyA], [keyB]) => Number(keyA) - Number(keyB)),
  );
}

function incrementCount(metrics: Map<string, number>, key: string, value = 1): void {
  metrics.set(key, (metrics.get(key) ?? 0) + value);
}

function summarizeRateByDay(
  hitsByDay: Map<string, number>,
  attemptsByDay: Map<string, number>,
): Record<string, { hits: number; survivingDays: number; rate: number }> {
  return Object.fromEntries(
    [...attemptsByDay.entries()]
      .filter(([day]) => Number(day) <= DAY_METRIC_REPORT_LIMIT)
      .sort(([dayA], [dayB]) => Number(dayA) - Number(dayB))
      .map(([day, attempts]) => {
        const hits = hitsByDay.get(day) ?? 0;
        return [
          day,
          {
            hits,
            survivingDays: attempts,
            rate: attempts === 0 ? 0 : Number((hits / attempts).toFixed(3)),
          },
        ];
      }),
  );
}

function summarizeRateForDayRange(
  hitsByDay: Map<string, number>,
  attemptsByDay: Map<string, number>,
  firstDay: number,
  lastDay: number,
): { hits: number; survivingDays: number; rate: number } {
  let hits = 0;
  let attempts = 0;
  for (let day = firstDay; day <= lastDay; day += 1) {
    const key = String(day);
    hits += hitsByDay.get(key) ?? 0;
    attempts += attemptsByDay.get(key) ?? 0;
  }
  return {
    hits,
    survivingDays: attempts,
    rate: attempts === 0 ? 0 : Number((hits / attempts).toFixed(3)),
  };
}

function signatureDominance(
  byItem: Map<string, number[]>,
  allSignatureBestDays: readonly number[],
): Record<string, number | string | null> {
  if (byItem.size === 0 || allSignatureBestDays.length === 0) {
    return { maxMedianItemId: null, maxMedian: 0, allSignatureMedian: 0, maxToMedianRatio: 0 };
  }
  let maxMedianItemId: string | null = null;
  let maxMedian = 0;
  for (const [itemId, values] of byItem.entries()) {
    const median = summarize(values).median;
    if (median > maxMedian) {
      maxMedian = median;
      maxMedianItemId = itemId;
    }
  }
  const allSignatureMedian = summarize(allSignatureBestDays).median;
  return {
    maxMedianItemId,
    maxMedian,
    allSignatureMedian,
    maxToMedianRatio:
      allSignatureMedian === 0 ? 0 : Number((maxMedian / allSignatureMedian).toFixed(3)),
  };
}

function fuzzStrategy(strategy: StrategyName, args: FuzzArgs): Record<string, unknown> {
  const deps = { table: loadItemTable(), combos: loadCombos() };
  const daysSurvived: number[] = [];
  const coinsEarned: number[] = [];
  const bestDayTotals: number[] = [];
  const bestDayTotalsWithSignature: number[] = [];
  const bestDayTotalsWithoutSignature: number[] = [];
  const bestDayTotalsBySignatureItem = new Map<string, number[]>();
  const deepestRents: number[] = [];
  const rentDeaths: number[] = [];
  const itemsBoughtPerRun: number[] = [];
  const signatureItemsBoughtPerRun: number[] = [];
  const expansionsPerRun: number[] = [];
  const boardOccupancyByDay = new Map<string, number[]>();
  const coinsBeforeScoringByDay = new Map<string, number[]>();
  const rentAmountByDay = new Map<string, number[]>();
  const surplusRatioByDay = new Map<string, number[]>();
  const dayTotalByDay = new Map<string, number[]>();
  const itemsBoughtByDay = new Map<string, number[]>();
  const dominantEligibleTagCountByDay = new Map<string, number[]>();
  const dominantEligibleTagCountDistribution = new Map<string, number>();
  const supplierTagCountByDay = new Map<string, number[]>();
  const supplierTagDistribution = new Map<string, number>();
  const goalTargetAttemptsByDay = new Map<string, number>();
  const goalTargetHitsByDay = new Map<string, number>();
  const goalTargetByDay = new Map<string, number[]>();
  const goalDayTotalByDay = new Map<string, number[]>();
  const finalDominantEligibleTagCounts: number[] = [];
  const finalSupplierTagCounts: number[] = [];
  let gameOvers = 0;
  let comboRuns = 0;
  let signatureRuns = 0;
  let scoredDays = 0;
  let orderMetDays = 0;
  let spotlightHitDays = 0;
  let synergyFireDays = 0;
  let synergyFires = 0;
  let scoredOccupiedSlots = 0;
  let goalTargetDays = 0;
  let goalMetDays = 0;
  let goalRewardsGranted = 0;
  let freeRerollsSpent = 0;

  for (let index = 0; index < args.runs; index += 1) {
    const run = playRun(`${args.seed}-${strategy}-${index}`, strategy, deps, args.maxActions);
    const stats = run.finalState.runStats;
    scoredDays += run.metrics.scoredDays;
    orderMetDays += run.metrics.orderMetDays;
    spotlightHitDays += run.metrics.spotlightHitDays;
    synergyFireDays += run.metrics.synergyFireDays;
    synergyFires += run.metrics.synergyFires;
    scoredOccupiedSlots += run.metrics.scoredOccupiedSlots;
    goalTargetDays += run.metrics.goalTargetDays;
    goalMetDays += run.metrics.goalMetDays;
    goalRewardsGranted += run.metrics.goalRewardsGranted;
    freeRerollsSpent += run.metrics.freeRerollsSpent;
    itemsBoughtPerRun.push(run.metrics.itemsBought);
    signatureItemsBoughtPerRun.push(run.metrics.signatureItemsBought);
    expansionsPerRun.push(run.metrics.expansionsPerRun);
    finalDominantEligibleTagCounts.push(run.metrics.finalDominantEligibleTagCount);
    finalSupplierTagCounts.push(run.metrics.finalSupplierTagCount);
    if (run.metrics.supplierTag) {
      incrementDistribution(supplierTagDistribution, run.metrics.supplierTag);
    }
    for (const [day, occupancy] of Object.entries(run.metrics.occupancyByDay)) {
      pushDayMetric(boardOccupancyByDay, day, occupancy);
      pushDayMetric(itemsBoughtByDay, day, run.metrics.itemsBoughtByDay[day] ?? 0);
    }
    for (const [day, coins] of Object.entries(run.metrics.coinsBeforeScoringByDay)) {
      pushDayMetric(coinsBeforeScoringByDay, day, coins);
    }
    for (const [day, rent] of Object.entries(run.metrics.rentAmountByDay)) {
      pushDayMetric(rentAmountByDay, day, rent);
    }
    for (const [day, ratio] of Object.entries(run.metrics.surplusRatioByDay)) {
      pushDayMetric(surplusRatioByDay, day, ratio);
    }
    for (const [day, dayTotal] of Object.entries(run.metrics.dayTotalByDay)) {
      pushDayMetric(dayTotalByDay, day, dayTotal);
    }
    for (const [day, count] of Object.entries(run.metrics.dominantEligibleTagCountByDay)) {
      pushDayMetric(dominantEligibleTagCountByDay, day, count);
      incrementDistribution(dominantEligibleTagCountDistribution, String(count));
    }
    for (const [day, count] of Object.entries(run.metrics.supplierTagCountByDay)) {
      pushDayMetric(supplierTagCountByDay, day, count);
    }
    for (const [day, count] of Object.entries(run.metrics.goalTargetEvaluationsByDay)) {
      incrementCount(goalTargetAttemptsByDay, day, count);
    }
    for (const [day, count] of Object.entries(run.metrics.goalTargetHitsByDay)) {
      incrementCount(goalTargetHitsByDay, day, count);
    }
    for (const [day, target] of Object.entries(run.metrics.goalTargetByDay)) {
      pushDayMetric(goalTargetByDay, day, target);
    }
    for (const [day, dayTotal] of Object.entries(run.metrics.goalDayTotalByDay)) {
      pushDayMetric(goalDayTotalByDay, day, dayTotal);
    }
    daysSurvived.push(stats.daysSurvived);
    coinsEarned.push(stats.totalCoinsEarned);
    bestDayTotals.push(stats.bestDayTotal);
    if (run.metrics.signatureItemsBought > 0) {
      signatureRuns += 1;
      bestDayTotalsWithSignature.push(stats.bestDayTotal);
      for (const itemId of Object.keys(run.metrics.signatureItemsBoughtById)) {
        pushDayMetric(bestDayTotalsBySignatureItem, itemId, stats.bestDayTotal);
      }
    } else {
      bestDayTotalsWithoutSignature.push(stats.bestDayTotal);
    }
    deepestRents.push(stats.deepestRentSurvived);
    if (run.finalState.phase === 'gameOver') {
      gameOvers += 1;
      rentDeaths.push(run.finalState.rent.cycle);
    }
    if (run.finalState.catalogDelta.discoveredComboIds.length > 0) {
      comboRuns += 1;
    }
  }

  return {
    strategy,
    runs: args.runs,
    daysSurvived: summarize(daysSurvived),
    totalCoinsEarned: summarize(coinsEarned),
    bestDayTotal: summarize(bestDayTotals),
    bestDayTotalBySignaturePickup: {
      withSignature: summarize(bestDayTotalsWithSignature),
      withoutSignature: summarize(bestDayTotalsWithoutSignature),
    },
    deepestRentSurvived: summarize(deepestRents),
    itemsBoughtPerRun: summarize(itemsBoughtPerRun),
    expansionsPerRun: summarize(expansionsPerRun),
    expansionRunRate: Number(
      (expansionsPerRun.filter((count) => count > 0).length / args.runs).toFixed(3),
    ),
    signatureItemsBoughtPerRun: summarize(signatureItemsBoughtPerRun),
    signaturePickupRunRate: Number((signatureRuns / args.runs).toFixed(3)),
    bestDayTotalBySignatureItem: summarizeMetricMap(bestDayTotalsBySignatureItem),
    signatureDominance: signatureDominance(
      bestDayTotalsBySignatureItem,
      bestDayTotalsWithSignature,
    ),
    boardOccupancyByDay: summarizeDayMetrics(boardOccupancyByDay),
    coinsBeforeScoringByDay: summarizeDayMetrics(coinsBeforeScoringByDay),
    rentAmountByDay: summarizeDayMetrics(rentAmountByDay),
    surplusRatioByDay: summarizeDayMetrics(surplusRatioByDay),
    dayTotalByDay: summarizeDayMetrics(dayTotalByDay),
    itemsBoughtByDay: summarizeDayMetrics(itemsBoughtByDay),
    gameOverRate: Number((gameOvers / args.runs).toFixed(3)),
    diedAtRentCycle: summarize(rentDeaths),
    namedComboRunRate: Number((comboRuns / args.runs).toFixed(3)),
    orderFillRate: scoredDays === 0 ? 0 : Number((orderMetDays / scoredDays).toFixed(3)),
    spotlightHitRate: scoredDays === 0 ? 0 : Number((spotlightHitDays / scoredDays).toFixed(3)),
    synergyFireDayRate: scoredDays === 0 ? 0 : Number((synergyFireDays / scoredDays).toFixed(3)),
    synergyFireRate:
      scoredOccupiedSlots === 0 ? 0 : Number((synergyFires / scoredOccupiedSlots).toFixed(3)),
    synergyFiresPerScoredDay: scoredDays === 0 ? 0 : Number((synergyFires / scoredDays).toFixed(3)),
    goalTargetHitRate:
      goalTargetDays === 0 ? 0 : Number((goalMetDays / goalTargetDays).toFixed(3)),
    goalTargetHitRateByDay: summarizeRateByDay(goalTargetHitsByDay, goalTargetAttemptsByDay),
    goalTargetHitRateDays9To12: summarizeRateForDayRange(
      goalTargetHitsByDay,
      goalTargetAttemptsByDay,
      9,
      12,
    ),
    goalTargetByDay: summarizeDayMetrics(goalTargetByDay),
    goalDayTotalByDay: summarizeDayMetrics(goalDayTotalByDay),
    goalRewardsGranted,
    freeRerollsSpent,
    dominantEligibleTagCountDistribution: sortedDistribution(dominantEligibleTagCountDistribution),
    dominantEligibleTagCountByDay: summarizeDayMetrics(dominantEligibleTagCountByDay),
    finalDominantEligibleTagCount: summarize(finalDominantEligibleTagCounts),
    supplierTagDistribution: Object.fromEntries(
      [...supplierTagDistribution.entries()].sort(([tagA], [tagB]) => tagA.localeCompare(tagB)),
    ),
    finalSupplierTagCount: summarize(finalSupplierTagCounts),
    supplierTagCountByDay: summarizeDayMetrics(supplierTagCountByDay),
  };
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  const strategies: StrategyName[] =
    args.strategy === 'all' ? ['random', 'greedy', 'combo'] : [args.strategy];

  const startedAt = Date.now();
  const report = {
    generatedAt: new Date().toISOString(),
    seedPrefix: args.seed,
    loopV2Enabled: loopV2Enabled(),
    goalLadderEnabled: goalLadderEnabled(),
    tagSynergyEnabled: tagSynergyEnabled(),
    buildSteeringEnabled: buildSteeringEnabled(),
    shelfExpansionEnabled: shelfExpansionEnabled(),
    warmOpeningEnabled: warmOpeningEnabled(),
    buildSteerBias: BUILD_STEER_BIAS,
    maxActions: args.maxActions,
    results: strategies.map((strategy) => fuzzStrategy(strategy, args)),
    elapsedMs: 0,
  };
  report.elapsedMs = Date.now() - startedAt;
  console.log(JSON.stringify(report, null, 2));
}

main();
