/**
 * Balance report (Lane B): plays greedy runs and prints the coin-balance-vs-rent
 * surplus curve + a survival distribution, so "too easy / too hard" is a number,
 * not a vibe. Companion to the liveness fuzz (src/sim/liveness.test.ts).
 *
 *   node --import tsx scripts/balance.ts --runs 200
 *   LOOP_V2_ENABLED=1 SIGNATURE_ITEMS_ENABLED=1 TAG_SYNERGY_ENABLED=1 \
 *     BUILD_STEERING_ENABLED=1 GOAL_LADDER_ENABLED=1 node --import tsx scripts/balance.ts
 *
 * Greedy policy (approximates a competent player: fill the shelf, score daily,
 * sell to make room): a lower bound on real earnings — bots understate rewards.
 */
import type { Action, GameState } from '../src/contracts';
import { loadCombos, loadItemTable } from '../src/items';
import { createRun, dispatch, type EngineDeps } from '../src/sim/engine';
import { uiAffordances } from '../src/sim/uiAffordances';

const deps: EngineDeps = { table: loadItemTable(), combos: loadCombos() };

function arg(name: string, fallback: number): number {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? Number(process.argv[i + 1]) : fallback;
}

/** Pick the "fill the shelf and score" action from the screen-exposed set. */
function greedy(state: GameState, acts: Action[]): Action {
  const by = (t: Action['type']) => acts.filter((a) => a.type === t);
  const buys = by('buyOffer');
  if (buys.length) return buys[0]!; // buy while a slot is open
  const places = by('placeItem');
  if (places.length) return places[0]!;
  const drafts = by('draftItem');
  if (drafts.length) return drafts[0]!;
  const supplier = by('chooseSupplier');
  if (supplier.length) return supplier[0]!;
  const open = by('openShop');
  if (open.length) return open[0]!; // score the day once the shelf is set
  // held on a full shelf → sell one to make room
  const sells = by('sellItem');
  if (sells.length && state.heldItem) return sells[0]!;
  const end = by('endRestock');
  if (end.length) return end[0]!;
  return acts[0]!;
}

interface DaySample {
  day: number;
  coins: number; // money on hand at the start of the day (before scoring)
  rent: number; // rent owed this cycle
}

function playRun(seed: string): { samples: DaySample[]; daysSurvived: number } {
  let state = createRun(seed, deps);
  const samples: DaySample[] = [];
  let lastSampledDay = 0;
  for (let step = 0; step < 5000 && state.phase !== 'gameOver'; step += 1) {
    // Sample money-on-hand once per day, when the shelf is arranged and about to score.
    if (state.phase === 'arrange' && !state.heldItem && state.day !== lastSampledDay) {
      samples.push({ day: state.day, coins: state.coins, rent: state.rent.amount });
      lastSampledDay = state.day;
    }
    const acts = uiAffordances(state);
    if (!acts.length) break;
    state = dispatch(state, greedy(state, acts), deps);
  }
  return { samples, daysSurvived: state.runStats.daysSurvived };
}

function median(xs: number[]): number {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)]!;
}

const runs = arg('runs', 200);
const byDayCoins = new Map<number, number[]>();
const byDayRent = new Map<number, number>();
const survived: number[] = [];

for (let i = 0; i < runs; i += 1) {
  const { samples, daysSurvived } = playRun(`balance-${i}`);
  survived.push(daysSurvived);
  for (const s of samples) {
    (byDayCoins.get(s.day) ?? byDayCoins.set(s.day, []).get(s.day)!).push(s.coins);
    byDayRent.set(s.day, s.rent);
  }
}

console.log(`\nBalance report — ${runs} greedy runs (flags via env)`);
console.log(
  'CAVEAT: this greedy is a naive FLOOR policy (fills + scores, no combo/synergy search),\n' +
    'so it dies early and understates a competent player. Compare the CEILING via the\n' +
    'smarter strategy bot: `... scripts/fuzz.ts --strategy greedy` (survives ~30d, 4-7x rent).\n' +
    'The gap between the two is the skill cliff. A real balance pass measures BOTH.\n',
);
console.log(`daysSurvived: median ${median(survived)}, p90 ${median(survived) && [...survived].sort((a, b) => a - b)[Math.floor(runs * 0.9)]}, max ${Math.max(...survived)}`);
console.log(`\n day | money-on-hand (median) | rent | surplus ratio (money / rent)`);
console.log(`-----+------------------------+------+------------------------------`);
for (const day of [...byDayCoins.keys()].sort((a, b) => a - b).slice(0, 18)) {
  const coins = median(byDayCoins.get(day)!);
  const rent = byDayRent.get(day)!;
  const ratio = rent > 0 ? (coins / rent).toFixed(1) : '—';
  console.log(`  ${String(day).padStart(2)} | ${String(coins).padStart(22)} | ${String(rent).padStart(4)} | ${ratio}×`);
}
console.log('\nHealthy target band is a design/Fable call (surplus stays modest, survival bounded).');
