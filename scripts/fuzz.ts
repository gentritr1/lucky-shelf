import { loadCombos, loadItemTable } from '../src/items';
import { playRun, type StrategyName } from '../src/sim/bots';

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

function summarize(values: readonly number[]): Record<string, number> {
  const sorted = [...values].sort((a, b) => a - b);
  const sum = sorted.reduce((total, value) => total + value, 0);
  return {
    mean: sorted.length ? Number((sum / sorted.length).toFixed(2)) : 0,
    median: quantile(sorted, 0.5),
    p90: quantile(sorted, 0.9),
    max: sorted.length ? (sorted[sorted.length - 1] ?? 0) : 0,
  };
}

function fuzzStrategy(strategy: StrategyName, args: FuzzArgs): Record<string, unknown> {
  const deps = { table: loadItemTable(), combos: loadCombos() };
  const daysSurvived: number[] = [];
  const coinsEarned: number[] = [];
  const bestDayTotals: number[] = [];
  const deepestRents: number[] = [];
  const rentDeaths: number[] = [];
  let gameOvers = 0;
  let comboRuns = 0;

  for (let index = 0; index < args.runs; index += 1) {
    const run = playRun(`${args.seed}-${strategy}-${index}`, strategy, deps, args.maxActions);
    const stats = run.finalState.runStats;
    daysSurvived.push(stats.daysSurvived);
    coinsEarned.push(stats.totalCoinsEarned);
    bestDayTotals.push(stats.bestDayTotal);
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
    deepestRentSurvived: summarize(deepestRents),
    gameOverRate: Number((gameOvers / args.runs).toFixed(3)),
    diedAtRentCycle: summarize(rentDeaths),
    namedComboRunRate: Number((comboRuns / args.runs).toFixed(3)),
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
    maxActions: args.maxActions,
    results: strategies.map((strategy) => fuzzStrategy(strategy, args)),
    elapsedMs: 0,
  };
  report.elapsedMs = Date.now() - startedAt;
  console.log(JSON.stringify(report, null, 2));
}

main();
