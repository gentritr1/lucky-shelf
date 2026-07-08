/**
 * B-M6 cascade-spectacle frequency measurement.
 *
 * Classifies every scored day of N full-stack fuzz runs into cascadeTier and
 * reports the tier distribution — the apex-frequency evidence the brief asks for
 * (target: apex in ~30–60% of RUNS, ≈ one apex per 2–3 runs; big ≈ 1–2 days/run).
 *
 * It reuses the recorded actions from `playRun` and re-drives them through the
 * exported `dispatch` so it can read each day's `lastScoringTrace` + `dailyTarget`
 * — no sim/bot changes, fully deterministic.
 *
 *   NODE_OPTIONS=--experimental-sqlite node --import tsx scripts/cascade-tiers.ts --runs 120
 */
import { loadCombos, loadItemTable } from '../src/items';
import { createRun, dispatch } from '../src/sim';
import { playRun, type StrategyName } from '../src/sim/bots';
import {
  BUILD_STEERING_ENV_VAR,
  DAY2_STARTER_ENV_VAR,
  GOAL_LADDER_ENV_VAR,
  LOOP_V2_ENV_VAR,
  SHELF_EXPANSION_ENV_VAR,
  SIGNATURE_ITEMS_ENV_VAR,
  TAG_SYNERGY_ENV_VAR,
} from '../src/sim/economy';
import {
  CASCADE_TIER_THRESHOLDS as THRESHOLDS,
  ruleFireCount,
  type CascadeTier,
} from '../src/juice/cascade/cascadeTier';

// Full-stack: every depth flag on (mirrors balanceHarness `allDepth` + expansion).
for (const v of [
  LOOP_V2_ENV_VAR,
  SIGNATURE_ITEMS_ENV_VAR,
  TAG_SYNERGY_ENV_VAR,
  BUILD_STEERING_ENV_VAR,
  GOAL_LADDER_ENV_VAR,
  SHELF_EXPANSION_ENV_VAR,
  DAY2_STARTER_ENV_VAR,
]) {
  process.env[v] = '1';
}

function arg(name: string, fallback: string): string {
  const i = process.argv.indexOf(name);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1]! : fallback;
}

const RUNS = Number(arg('--runs', '120'));
const SEED = arg('--seed', 'cascade-tiers');
const STRATEGIES: StrategyName[] = ['random', 'greedy', 'combo'];
const deps = { table: loadItemTable(), combos: loadCombos() };

interface DayObs {
  run: number;
  dayTotal: number;
  target: number | undefined;
  fires: number;
  ratio: number | undefined; // dayTotal / target when a target exists
}
const obs: DayObs[] = [];

for (let r = 0; r < RUNS; r += 1) {
  const strategy = STRATEGIES[r % STRATEGIES.length]!;
  const seed = `${SEED}-${strategy}-${r}`;
  const run = playRun(seed, strategy, deps);

  // Re-drive the recorded actions to observe each day's trace + target.
  // (playRun was called with no createRunOptions, so a plain createRun matches.)
  let state = createRun(seed, deps);
  for (const action of run.actions) {
    const before = state;
    state = dispatch(before, action, deps);
    if (action.type !== 'openShop') continue;
    const trace = state.lastScoringTrace;
    if (!trace) continue;
    const target = before.dailyTarget;
    const dayTotal = trace.events.at(-1)?.kind === 'dayTotal' ? (trace.events.at(-1) as { coins: number }).coins : 0;
    obs.push({
      run: r,
      dayTotal,
      target,
      fires: ruleFireCount(trace),
      ratio: target && target > 0 ? dayTotal / target : undefined,
    });
  }
}

function pct(n: number, d: number): string {
  return d === 0 ? '0.0%' : `${((100 * n) / d).toFixed(1)}%`;
}
function percentiles(values: number[], qs: number[]): number[] {
  const s = [...values].sort((a, b) => a - b);
  return qs.map((q) => s[Math.min(s.length - 1, Math.floor(q * s.length))] ?? 0);
}

const scoredDays = obs.length;
const ratios = obs.filter((o) => o.ratio !== undefined).map((o) => o.ratio!);
const fires = obs.map((o) => o.fires);

console.log(`\nB-M6 cascade-tier RAW distributions — full stack, ${RUNS} runs, seed "${SEED}"`);
console.log(`scored days: ${scoredDays} (avg ${(scoredDays / RUNS).toFixed(1)}/run); days with a target: ${ratios.length}\n`);
const rq = percentiles(ratios, [0.5, 0.75, 0.9, 0.95, 0.98, 0.99]);
console.log(`dayTotal/target ratio: p50 ${rq[0]!.toFixed(2)}  p75 ${rq[1]!.toFixed(2)}  p90 ${rq[2]!.toFixed(2)}  p95 ${rq[3]!.toFixed(2)}  p98 ${rq[4]!.toFixed(2)}  p99 ${rq[5]!.toFixed(2)}`);
const fq = percentiles(fires, [0.5, 0.75, 0.9, 0.95, 0.98, 0.99]);
console.log(`ruleFires/day:         p50 ${fq[0]}  p75 ${fq[1]}  p90 ${fq[2]}  p95 ${fq[3]}  p98 ${fq[4]}  p99 ${fq[5]}  max ${Math.max(...fires)}`);

// Distribution under the CURRENT exported thresholds.
const dayTier: Record<CascadeTier, number> = { normal: 0, big: 0, apex: 0 };
const runApex = new Set<number>();
const runBig = new Set<number>();
for (const o of obs) {
  const t = classify(o);
  dayTier[t] += 1;
  if (t === 'apex') runApex.add(o.run);
  if (t === 'big') runBig.add(o.run);
}
console.log(`\nunder current thresholds ${JSON.stringify({ ...THRESHOLDS })}:`);
console.log('per DAY:');
for (const tier of ['normal', 'big', 'apex'] as const) {
  console.log(`  ${tier.padEnd(7)} ${String(dayTier[tier]).padStart(5)}  ${pct(dayTier[tier], scoredDays)}`);
}
console.log(`per RUN: apex ${runApex.size}/${RUNS} ${pct(runApex.size, RUNS)}  big ${runBig.size}/${RUNS} ${pct(runBig.size, RUNS)}`);
console.log(`big days/run ${(dayTier.big / RUNS).toFixed(2)}  apex days/run ${(dayTier.apex / RUNS).toFixed(2)}`);

// Sweep candidate thresholds (target: apex 30–60% of runs, ≈one per 2–3 runs).
console.log('\nsweep (apexMult, apexFires) → runs-with-apex%, apex-days/run:');
for (const am of [3.0, 3.5, 4.0, 4.5, 5.0]) {
  for (const af of [40, 45, 50, 55]) {
    const ra = new Set<number>();
    let ad = 0;
    for (const o of obs) {
      const isApex = o.fires >= af || (o.ratio !== undefined && o.ratio >= am);
      if (isApex) { ra.add(o.run); ad += 1; }
    }
    console.log(`  (${am.toFixed(1)}, ${af})  runs ${pct(ra.size, RUNS).padStart(6)}  apex-days/run ${(ad / RUNS).toFixed(2)}`);
  }
}
console.log('\nsweep big (bigMult) → big-days/run (target 1–2):');
for (const bm of [1.3, 1.5, 1.8, 2.0]) {
  let bd = 0;
  const rb = new Set<number>();
  for (const o of obs) {
    if (o.ratio !== undefined && o.ratio >= bm && !(o.ratio >= THRESHOLDS.apexTargetMult || o.fires >= THRESHOLDS.apexRuleFires)) { bd += 1; rb.add(o.run); }
  }
  console.log(`  bigMult ${bm}  big-days/run ${(bd / RUNS).toFixed(2)}  runs-with-big ${pct(rb.size, RUNS)}`);
}

function classify(o: DayObs): CascadeTier {
  const T = THRESHOLDS;
  const hasTarget = o.target !== undefined && o.target > 0;
  if (o.fires >= T.apexRuleFires) return 'apex';
  if (hasTarget && o.ratio! >= T.apexTargetMult) return 'apex';
  if (hasTarget) { if (o.ratio! >= T.bigTargetMult) return 'big'; }
  else if (o.fires >= T.bigRuleFires) return 'big';
  return 'normal';
}
