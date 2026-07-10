import { loadCombos, loadItemTable } from '../src/items';
import { playRun, type StrategyName } from '../src/sim/bots';
import {
  balanceFlagConfigByName,
  withBalanceFlagConfig,
  type BalanceFlagConfigName,
} from '../src/sim/balanceHarness';
import { GOAL_LADDER_TARGETS } from '../src/sim/economy';

/**
 * Goal-ladder tuning measurement (RELEASE-PLAN.md Gate 1.1).
 *
 * THE measurement script behind GOAL_LADDER_TARGETS — the "no brief threshold
 * without a measurement script" scar (fired 4×; see global CLAUDE.md §6). It
 * measures the day-total distribution of the ceiling bots (greedy + combo)
 * under a named flag config and derives a candidate target table from pooled
 * percentiles, then predicts the per-day hit rate each strategy would see.
 *
 *   node --import tsx scripts/goal-tune.ts --config graduating --runs 400 --seed graduation-0710
 *
 * A target at pooled percentile pX predicts a hit rate of ~(1 - X). The band
 * ruled by Fable (2026-07-08 rulings §goal-ladder) is 65–85% per reported day
 * (days 1–12), so candidates come from p25 (~75% hit, mid-band). The reward
 * feedback loop (goal hit → free reroll → richer shop) means predictions are
 * approximate: always re-validate a new table with a full `pnpm fuzz` run
 * under the same config before trusting it.
 */

interface Args {
  runs: number;
  seed: string;
  config: BalanceFlagConfigName;
  maxActions: number;
  percentile: number;
}

function parseArgs(argv: readonly string[]): Args {
  const args: Args = {
    runs: 400,
    seed: 'goal-tune',
    config: 'graduating',
    maxActions: 400,
    percentile: 0.25,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    const value = argv[index + 1];
    switch (flag) {
      case '--runs':
        args.runs = Number(value);
        index += 1;
        break;
      case '--seed':
        args.seed = value ?? args.seed;
        index += 1;
        break;
      case '--config':
        args.config = (value ?? args.config) as BalanceFlagConfigName;
        index += 1;
        break;
      case '--maxActions':
        args.maxActions = Number(value);
        index += 1;
        break;
      case '--percentile':
        args.percentile = Number(value);
        index += 1;
        break;
      default:
        break;
    }
  }
  return args;
}

const CEILING_STRATEGIES: readonly StrategyName[] = ['greedy', 'combo'];
const REPORT_DAYS = 12;

function percentileOf(sorted: readonly number[], q: number): number {
  if (sorted.length === 0) return 0;
  const index = Math.min(sorted.length - 1, Math.floor(q * (sorted.length - 1)));
  return sorted[index] ?? 0;
}

function hitRate(values: readonly number[], target: number): number {
  if (values.length === 0) return 0;
  const hits = values.filter((value) => value >= target).length;
  return Number((hits / values.length).toFixed(3));
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  const config = balanceFlagConfigByName(args.config);
  const deps = { table: loadItemTable(), combos: loadCombos() };

  // day -> strategy -> raw day totals across runs
  const totalsByDay = new Map<number, Map<StrategyName, number[]>>();

  withBalanceFlagConfig(config, () => {
    for (const strategy of CEILING_STRATEGIES) {
      for (let index = 0; index < args.runs; index += 1) {
        const run = playRun(`${args.seed}-${strategy}-${index}`, strategy, deps, args.maxActions);
        for (const [dayKey, dayTotal] of Object.entries(run.metrics.goalDayTotalByDay)) {
          const day = Number(dayKey);
          if (day > REPORT_DAYS) continue;
          const perStrategy = totalsByDay.get(day) ?? new Map<StrategyName, number[]>();
          const values = perStrategy.get(strategy) ?? [];
          values.push(dayTotal);
          perStrategy.set(strategy, values);
          totalsByDay.set(day, perStrategy);
        }
      }
    }
  });

  const days = [...totalsByDay.keys()].sort((a, b) => a - b);
  const candidate: number[] = [];
  const rows = days.map((day) => {
    const perStrategy = totalsByDay.get(day)!;
    const pooled = CEILING_STRATEGIES.flatMap((strategy) => perStrategy.get(strategy) ?? []).sort(
      (a, b) => a - b,
    );
    const target = percentileOf(pooled, args.percentile);
    candidate[day - 1] = target;
    return {
      day,
      samples: pooled.length,
      p15: percentileOf(pooled, 0.15),
      p25: percentileOf(pooled, 0.25),
      p35: percentileOf(pooled, 0.35),
      median: percentileOf(pooled, 0.5),
      candidateTarget: target,
      currentTarget: GOAL_LADDER_TARGETS[Math.min(day, GOAL_LADDER_TARGETS.length) - 1],
      predictedHitRate: Object.fromEntries(
        CEILING_STRATEGIES.map((strategy) => [strategy, hitRate(perStrategy.get(strategy) ?? [], target)]),
      ),
      currentHitRate: Object.fromEntries(
        CEILING_STRATEGIES.map((strategy) => [
          strategy,
          hitRate(
            perStrategy.get(strategy) ?? [],
            GOAL_LADDER_TARGETS[Math.min(day, GOAL_LADDER_TARGETS.length) - 1] ?? 0,
          ),
        ]),
      ),
    };
  });

  console.log(
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        args,
        flagConfig: config.name,
        note: 'candidateTarget = pooled ceiling-bot percentile; re-validate with pnpm fuzz (reward feedback loop shifts totals).',
        candidateTable: candidate,
        rows,
      },
      null,
      2,
    ),
  );
}

main();
