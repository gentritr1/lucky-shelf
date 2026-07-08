/**
 * Balance report: floor and ceiling policies across the supported depth-flag
 * configs. Measurement only; target bands stay TODO(fable) until Fable/human
 * supplies the "soft spot" numbers.
 *
 *   node --import tsx scripts/balance.ts
 *   node --import tsx scripts/balance.ts --runs 200 --policy all --config all
 *   node --import tsx scripts/balance.ts --json
 */
import {
  BALANCE_FLAG_CONFIGS,
  DEFAULT_BALANCE_POLICIES,
  FABLE_BALANCE_TARGET_BANDS,
  assertBalanceBands,
  runBalanceReport,
  type BalanceConfigReport,
  type BalanceFlagConfigName,
  type BalancePolicyName,
  type BalancePolicyReport,
} from '../src/sim/balanceHarness';

interface Args {
  runs: number;
  seed: string;
  maxActions: number;
  configs: readonly BalanceFlagConfigName[];
  policies: readonly BalancePolicyName[];
  json: boolean;
  assertBands: boolean;
}

const DAY_LIMIT = 18;

function parseArgs(argv: readonly string[]): Args {
  const args: Args = {
    runs: 80,
    seed: 'balance',
    maxActions: 600,
    configs: BALANCE_FLAG_CONFIGS.map((config) => config.name),
    policies: DEFAULT_BALANCE_POLICIES,
    json: false,
    assertBands: false,
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
      case '--max-actions':
        args.maxActions = Number(value);
        index += 1;
        break;
      case '--config':
        args.configs = parseConfigs(value);
        index += 1;
        break;
      case '--policy':
        args.policies = parsePolicies(value);
        index += 1;
        break;
      case '--json':
        args.json = true;
        break;
      case '--assert-bands':
        args.assertBands = true;
        break;
      default:
        throw new Error(`Unknown flag: ${flag}`);
    }
  }

  if (!Number.isInteger(args.runs) || args.runs <= 0) {
    throw new Error(`--runs must be a positive integer, got ${args.runs}.`);
  }
  if (!Number.isInteger(args.maxActions) || args.maxActions <= 0) {
    throw new Error(`--max-actions must be a positive integer, got ${args.maxActions}.`);
  }
  return args;
}

function parseConfigs(value: string | undefined): readonly BalanceFlagConfigName[] {
  if (!value || value === 'all') return BALANCE_FLAG_CONFIGS.map((config) => config.name);
  const names = value.split(',').map((name) => name.trim());
  const allowed = new Set(BALANCE_FLAG_CONFIGS.map((config) => config.name));
  for (const name of names) {
    if (!allowed.has(name as BalanceFlagConfigName)) {
      throw new Error(`Unknown --config value: ${name}`);
    }
  }
  return names as BalanceFlagConfigName[];
}

function parsePolicies(value: string | undefined): readonly BalancePolicyName[] {
  if (!value || value === 'all') return DEFAULT_BALANCE_POLICIES;
  const names = value.split(',').map((name) => name.trim());
  const allowed = new Set(DEFAULT_BALANCE_POLICIES);
  for (const name of names) {
    if (!allowed.has(name as BalancePolicyName)) {
      throw new Error(`Unknown --policy value: ${name}`);
    }
  }
  return names as BalancePolicyName[];
}

function fmt(value: number, digits = 1): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(digits);
}

function policyLabel(policy: BalancePolicyName): string {
  switch (policy) {
    case 'floor':
      return 'FLOOR';
    case 'ceiling-greedy':
      return 'CEILING(greedy)';
    case 'ceiling-combo':
      return 'CEILING(combo)';
  }
}

function printPolicySummary(report: BalancePolicyReport): void {
  console.log(
    `  ${policyLabel(report.policy).padEnd(16)} ` +
      `survival median ${report.daysSurvived.median}d ` +
      `(p90 ${report.daysSurvived.p90}, max ${report.daysSurvived.max}); ` +
      `first-rent survival ${(report.firstRentSurvivalRate * 100).toFixed(1)}%; ` +
      `near-death ${(report.nearDeathRunRate * 100).toFixed(1)}%; ` +
      `earned median ${report.totalCoinsEarned.median}c`,
  );
}

function printSurplusTable(config: BalanceConfigReport): void {
  const policies = DEFAULT_BALANCE_POLICIES.filter((policy) => config.policies[policy]);
  console.log('\n  day | ' + policies.map((policy) => policyLabel(policy).padStart(20)).join(' | '));
  console.log('  ----+' + policies.map(() => '----------------------').join('+'));
  for (let day = 1; day <= DAY_LIMIT; day += 1) {
    const cells = policies.map((policy) => {
      const summary = config.policies[policy]?.surplusByDay[String(day)];
      if (!summary) return ' '.repeat(20);
      const coins = summary.coinsBeforeScoring.median;
      const rent = summary.rentAmount.median;
      const ratio = summary.surplusRatio.median;
      return `${fmt(coins, 0)}c/${fmt(rent, 0)}c ${fmt(ratio, 2)}x`.padStart(20);
    });
    if (cells.every((cell) => cell.trim() === '')) continue;
    console.log(`  ${String(day).padStart(3)} | ${cells.join(' | ')}`);
  }
}

function printReport(report: ReturnType<typeof runBalanceReport>): void {
  console.log(
    `\nBalance report — ${report.runsPerPolicy} runs per policy/config ` +
      `(seed "${report.seed}", maxActions ${report.maxActions})`,
  );
  console.log(
    'Policies: FLOOR = screen-affordance naive player; CEILING = bot policies using engine legal actions.',
  );
  if (Object.values(FABLE_BALANCE_TARGET_BANDS).every((value) => value === null)) {
    console.log('Target bands: TODO(fable); pass --assert-bands after targets are filled.\n');
  }

  for (const config of report.configs) {
    console.log(`Config: ${config.config}`);
    for (const policy of DEFAULT_BALANCE_POLICIES) {
      const policyReport = config.policies[policy];
      if (policyReport) printPolicySummary(policyReport);
    }
    printSurplusTable(config);
    console.log('');
  }

  const swing = Object.entries(report.buildSwingTotalCoinsRatio);
  if (swing.length > 0) {
    console.log('Build swing (allDepth median earned / baseline median earned):');
    for (const [policy, ratio] of swing) {
      console.log(`  ${policy}: ${ratio}x`);
    }
  }
}

const args = parseArgs(process.argv.slice(2));
const report = runBalanceReport({
  runs: args.runs,
  seed: args.seed,
  maxActions: args.maxActions,
  configs: args.configs,
  policies: args.policies,
});

if (args.assertBands) assertBalanceBands(report);

if (args.json) {
  console.log(JSON.stringify(report, null, 2));
} else {
  printReport(report);
}
