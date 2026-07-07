import { loadCombos, loadItemTable } from '../src/items';
import { playRun, type StrategyName } from '../src/sim/bots';
import { loopV2Enabled } from '../src/sim/economy';

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

const DAY_METRIC_REPORT_LIMIT = 8;

interface NumericSummary {
  mean: number;
  stddev: number;
  median: number;
  p90: number;
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
  const boardOccupancyByDay = new Map<string, number[]>();
  const itemsBoughtByDay = new Map<string, number[]>();
  let gameOvers = 0;
  let comboRuns = 0;
  let signatureRuns = 0;
  let scoredDays = 0;
  let orderMetDays = 0;
  let spotlightHitDays = 0;

  for (let index = 0; index < args.runs; index += 1) {
    const run = playRun(`${args.seed}-${strategy}-${index}`, strategy, deps, args.maxActions);
    const stats = run.finalState.runStats;
    scoredDays += run.metrics.scoredDays;
    orderMetDays += run.metrics.orderMetDays;
    spotlightHitDays += run.metrics.spotlightHitDays;
    itemsBoughtPerRun.push(run.metrics.itemsBought);
    signatureItemsBoughtPerRun.push(run.metrics.signatureItemsBought);
    for (const [day, occupancy] of Object.entries(run.metrics.occupancyByDay)) {
      pushDayMetric(boardOccupancyByDay, day, occupancy);
      pushDayMetric(itemsBoughtByDay, day, run.metrics.itemsBoughtByDay[day] ?? 0);
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
    signatureItemsBoughtPerRun: summarize(signatureItemsBoughtPerRun),
    signaturePickupRunRate: Number((signatureRuns / args.runs).toFixed(3)),
    bestDayTotalBySignatureItem: summarizeMetricMap(bestDayTotalsBySignatureItem),
    signatureDominance: signatureDominance(
      bestDayTotalsBySignatureItem,
      bestDayTotalsWithSignature,
    ),
    boardOccupancyByDay: summarizeDayMetrics(boardOccupancyByDay),
    itemsBoughtByDay: summarizeDayMetrics(itemsBoughtByDay),
    gameOverRate: Number((gameOvers / args.runs).toFixed(3)),
    diedAtRentCycle: summarize(rentDeaths),
    namedComboRunRate: Number((comboRuns / args.runs).toFixed(3)),
    orderFillRate: scoredDays === 0 ? 0 : Number((orderMetDays / scoredDays).toFixed(3)),
    spotlightHitRate: scoredDays === 0 ? 0 : Number((spotlightHitDays / scoredDays).toFixed(3)),
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
    maxActions: args.maxActions,
    results: strategies.map((strategy) => fuzzStrategy(strategy, args)),
    elapsedMs: 0,
  };
  report.elapsedMs = Date.now() - startedAt;
  console.log(JSON.stringify(report, null, 2));
}

main();
