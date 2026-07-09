import type { GameState, ItemDefinition, ItemInstance, ItemInstanceState, Shelf, Slot } from '../src/contracts';
import { toSlotKey } from '../src/contracts';
import { isSignatureItem, loadCombos, loadItemTable, type ItemTable } from '../src/items';
import {
  LOOP_V2_ENV_VAR,
  SHELF_EXPANSION_ENV_VAR,
  SIGNATURE_ITEMS_ENV_VAR,
  TAG_SYNERGY_ENV_VAR,
  offerWeight,
} from '../src/sim/economy';
import { rowMajorSlots } from '../src/sim/grid';
import { rngFor, type Rng } from '../src/sim/rng';
import { resolveOpenShop } from '../src/sim/scoring';

interface Args {
  seed: string;
  boards: number;
  ceilingBoards: number;
}

interface PlacedDefinition {
  slot: Slot;
  itemId: string;
}

interface BoardSpec {
  boardId: string;
  day: number;
  reservedSlot: Slot;
  placed: readonly PlacedDefinition[];
  spotlight?: Slot;
}

interface NumericSummary {
  n: number;
  median: number;
  p90: number;
  p95: number;
  max: number;
}

interface EqualNRow {
  itemId: string;
  n: number;
  median: number;
  p90: number;
  p95: number;
  max: number;
  liftVsBaseline: number;
  toAllSignatureMedian: number;
}

interface FavorableRow {
  itemId: string;
  n: number;
  signatureMedian: number;
  fillerMedian: number;
  medianLift: number;
  maxLift: number;
  maxLiftFiller: string;
}

interface LuckySpotlightRow {
  arm: string;
  n: number;
  luckyCatMedian: number;
  fillerMedian: number;
  medianLift: number;
  maxLift: number;
  maxLiftFiller: string;
}

const EXPANDED_SIZE = { rows: 4, cols: 4 } as const;
const DEFAULT_BOARDS = 3000;
const DEFAULT_CEILING_BOARDS = 300;
const SIGNATURE_SLOT: Slot = { row: 1, col: 1 };

function parseArgs(argv: readonly string[]): Args {
  const args: Args = {
    seed: 'sigdom-expansion',
    boards: DEFAULT_BOARDS,
    ceilingBoards: DEFAULT_CEILING_BOARDS,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    const value = argv[index + 1];
    switch (flag) {
      case '--':
        break;
      case '--seed':
        args.seed = value ?? args.seed;
        index += 1;
        break;
      case '--boards':
        args.boards = Number(value);
        index += 1;
        break;
      case '--ceiling-boards':
        args.ceilingBoards = Number(value);
        index += 1;
        break;
      default:
        throw new Error(`Unknown flag: ${flag}`);
    }
  }
  if (!Number.isInteger(args.boards) || args.boards <= 0) {
    throw new Error(`--boards must be a positive integer, got ${args.boards}.`);
  }
  if (!Number.isInteger(args.ceilingBoards) || args.ceilingBoards <= 0) {
    throw new Error(`--ceiling-boards must be a positive integer, got ${args.ceilingBoards}.`);
  }
  return args;
}

function withEnv<T>(env: Record<string, string | undefined>, fn: () => T): T {
  const previous: Record<string, string | undefined> = {};
  for (const key of Object.keys(env)) {
    previous[key] = process.env[key];
    const value = env[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
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

function transformTargetIds(table: ItemTable): Set<string> {
  const targets = new Set<string>();
  for (const definition of table.values()) {
    if (definition.upgradesToItemId) targets.add(definition.upgradesToItemId);
    for (const rule of definition.rules) {
      if (rule.kind === 'transformsAdjacent') targets.add(rule.toItemId);
    }
  }
  return targets;
}

function nonSignatureDefinitions(table: ItemTable): ItemDefinition[] {
  return [...table.values()].filter((definition) => !isSignatureItem(definition));
}

function nonSignatureOfferableDefinitions(table: ItemTable): ItemDefinition[] {
  const transformTargets = transformTargetIds(table);
  return nonSignatureDefinitions(table).filter((definition) => !transformTargets.has(definition.id));
}

function signatureDefinitions(table: ItemTable): ItemDefinition[] {
  return [...table.values()].filter(isSignatureItem).sort((a, b) => a.id.localeCompare(b.id));
}

function quantile(sorted: readonly number[], q: number): number {
  if (sorted.length === 0) return 0;
  const index = Math.min(sorted.length - 1, Math.floor(q * sorted.length));
  return sorted[index] ?? 0;
}

function summarize(values: readonly number[]): NumericSummary {
  const sorted = [...values].sort((a, b) => a - b);
  return {
    n: sorted.length,
    median: quantile(sorted, 0.5),
    p90: quantile(sorted, 0.9),
    p95: quantile(sorted, 0.95),
    max: sorted.length === 0 ? 0 : sorted[sorted.length - 1] ?? 0,
  };
}

function ratio(numerator: number, denominator: number): number {
  if (denominator === 0) return numerator === 0 ? 1 : Number.POSITIVE_INFINITY;
  return Number((numerator / denominator).toFixed(3));
}

function weightedPick<T>(
  rng: Rng,
  values: readonly T[],
  weight: (value: T) => number,
): T {
  const weighted = values.map((value) => ({ value, weight: Math.max(0, weight(value)) }));
  const total = weighted.reduce((sum, entry) => sum + entry.weight, 0);
  if (total <= 0) return rng.pick(values);
  let cursor = rng.next() * total;
  for (const entry of weighted) {
    cursor -= entry.weight;
    if (cursor <= 0) return entry.value;
  }
  const last = weighted.at(-1);
  if (!last) throw new Error('weightedPick requires at least one value.');
  return last.value;
}

function countdownFor(definition: ItemDefinition): number | null {
  const countdown = definition.rules.find((rule) => rule.kind === 'countdownVanish');
  return countdown?.kind === 'countdownVanish' ? countdown.days : null;
}

function agedBaseValue(
  definition: ItemDefinition,
  rng: Rng,
  day: number,
): { baseValue: number; ageDays: number } {
  let baseValue = definition.baseValue;
  let maxAgeDays = 0;
  for (const rule of definition.rules) {
    if (rule.kind !== 'agesDaily') continue;
    const ageDays = rng.int(Math.min(day, 8) + 1);
    maxAgeDays = Math.max(maxAgeDays, ageDays);
    baseValue += rule.flatPerDay * ageDays;
    if (rule.minValue !== undefined) baseValue = Math.max(rule.minValue, baseValue);
    if (rule.maxValue !== undefined) baseValue = Math.min(rule.maxValue, baseValue);
  }
  return { baseValue, ageDays: maxAgeDays };
}

function instanceFor(
  table: ItemTable,
  itemId: string,
  instanceId: string,
  rng: Rng,
  day: number,
): ItemInstance {
  const definition = table.get(itemId);
  if (!definition) throw new Error(`Unknown item id: ${itemId}`);
  const aged = agedBaseValue(definition, rng, day);
  const countdown = countdownFor(definition);
  const state: ItemInstanceState = {
    ageDays: aged.ageDays,
    growthDays: definition.rules.some((rule) => rule.kind === 'growsEachDay')
      ? rng.int(Math.min(day, 8) + 1)
      : 0,
    countdown: countdown === null ? null : rng.int(countdown + 1),
    sticky: false,
    blocked: definition.rules.some((rule) => rule.kind === 'blocksSlot'),
    transformedFromItemId: null,
  };
  return {
    instanceId,
    itemId: definition.id,
    name: definition.name,
    tier: definition.tier,
    baseValue: aged.baseValue,
    tags: [...definition.tags],
    state,
  };
}

function stateFor(
  table: ItemTable,
  board: BoardSpec,
  fill: PlacedDefinition | null,
): GameState {
  const placed = new Map<string, PlacedDefinition>();
  for (const entry of board.placed) placed.set(toSlotKey(entry.slot), entry);
  if (fill) placed.set(toSlotKey(fill.slot), fill);
  const shelf: Shelf = {
    size: EXPANDED_SIZE,
    slots: rowMajorSlots(EXPANDED_SIZE).map((slot, index) => {
      const entry = placed.get(toSlotKey(slot));
      const rng = rngFor(board.boardId, 'instance', index, entry?.itemId ?? 'empty');
      return {
        slot,
        item: entry
          ? instanceFor(table, entry.itemId, `${board.boardId}-${entry.itemId}-${index}`, rng, board.day)
          : null,
      };
    }),
  };
  const state: GameState = {
    schemaVersion: 1,
    runId: `run-${board.boardId}`,
    seed: board.boardId,
    phase: 'openShop',
    day: board.day,
    coins: 0,
    shelf,
    rent: { amount: 57, dueInDays: 1, cycle: 4 },
    moves: { freeRemaining: 3, paidMoveCost: 5 },
    currentOffers: [],
    heldItem: null,
    lastScoringTrace: null,
    runStats: {
      totalCoinsEarned: 0,
      deepestRentSurvived: 0,
      daysSurvived: board.day - 1,
      bestDayTotal: 0,
      bestComboIds: [],
    },
    catalogDelta: { discoveredItemIds: [], discoveredComboIds: [] },
  };
  if (board.spotlight) state.spotlight = board.spotlight;
  return state;
}

function scoreBoard(table: ItemTable, combos: ReturnType<typeof loadCombos>, board: BoardSpec, fill: PlacedDefinition | null): number {
  return resolveOpenShop(stateFor(table, board, fill), table, combos).dayTotal;
}

function shuffledSlots(rng: Rng, slots: readonly Slot[]): Slot[] {
  const copy = [...slots];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = rng.int(index + 1);
    const current = copy[index];
    const swap = copy[swapIndex];
    if (!current || !swap) throw new Error('Slot shuffle index out of bounds.');
    copy[index] = swap;
    copy[swapIndex] = current;
  }
  return copy;
}

function makeRealisticBoards(
  seed: string,
  count: number,
  pool: readonly ItemDefinition[],
): BoardSpec[] {
  const slots = rowMajorSlots(EXPANDED_SIZE);
  const boards: BoardSpec[] = [];
  for (let index = 0; index < count; index += 1) {
    const rng = rngFor(seed, 'realistic-board', index);
    const day = 9 + rng.int(10);
    const reservedSlot = rng.pick(slots);
    const candidates = shuffledSlots(rng, slots.filter((slot) => toSlotKey(slot) !== toSlotKey(reservedSlot)));
    const occupiedCount = 10 + rng.int(6);
    const placed = candidates.slice(0, occupiedCount).map((slot) => {
      const definition = weightedPick(rng, pool, (item) => {
        const base = offerWeight(item, day, null);
        return Math.max(1, base) * Math.max(1, item.baseValue + item.tier);
      });
      return { slot, itemId: definition.id };
    });
    boards.push({
      boardId: `${seed}-realistic-${index}`,
      day,
      reservedSlot,
      placed,
    });
  }
  return boards;
}

function definitionsWithAnyTag(definitions: readonly ItemDefinition[], tags: readonly string[]): ItemDefinition[] {
  const wanted = new Set(tags);
  return definitions.filter((definition) => definition.tags.some((tag) => wanted.has(tag)));
}

function highBaseDefinitions(definitions: readonly ItemDefinition[]): ItemDefinition[] {
  return [...definitions]
    .sort((a, b) => b.baseValue - a.baseValue || b.tier - a.tier || a.id.localeCompare(b.id))
    .slice(0, 12);
}

function favorablePoolFor(
  itemId: string,
  nonSignaturePool: readonly ItemDefinition[],
): ItemDefinition[] {
  if (itemId === 'brass-scale') {
    return definitionsWithAnyTag(nonSignaturePool, ['food', 'perishable', 'sweet']);
  }
  if (itemId === 'ledger-book') {
    return definitionsWithAnyTag(nonSignaturePool, ['antique']);
  }
  if (itemId === 'consignment-sign') {
    return [
      ...definitionsWithAnyTag(nonSignaturePool, ['food', 'fancy', 'antique']),
      ...highBaseDefinitions(nonSignaturePool),
    ];
  }
  if (itemId === 'lucky-cat' || itemId === 'window-display') {
    return highBaseDefinitions(nonSignaturePool);
  }
  return highBaseDefinitions(nonSignaturePool);
}

function makeFavorableBoards(
  seed: string,
  itemId: string,
  count: number,
  pool: readonly ItemDefinition[],
): BoardSpec[] {
  const slots = rowMajorSlots(EXPANDED_SIZE).filter((slot) => toSlotKey(slot) !== toSlotKey(SIGNATURE_SLOT));
  const highBase = highBaseDefinitions(pool);
  const boards: BoardSpec[] = [];
  for (let index = 0; index < count; index += 1) {
    const rng = rngFor(seed, 'favorable-board', itemId, index);
    const day = 12 + rng.int(7);
    const placed = shuffledSlots(rng, slots).map((slot, slotIndex) => {
      let definition: ItemDefinition;
      if (itemId === 'consignment-sign' && slotIndex < 4) {
        const tagPool = definitionsWithAnyTag(pool, ['food']);
        definition = rng.pick(tagPool.length > 0 ? tagPool : pool);
      } else if ((itemId === 'lucky-cat' || itemId === 'window-display') && slotIndex < 4) {
        definition = highBase[slotIndex % highBase.length] ?? rng.pick(pool);
      } else {
        definition = weightedPick(rng, pool, (item) => Math.max(1, item.baseValue * 3 + item.tier));
      }
      return { slot, itemId: definition.id };
    });
    boards.push({
      boardId: `${seed}-favorable-${itemId}-${index}`,
      day,
      reservedSlot: SIGNATURE_SLOT,
      placed,
    });
  }
  return boards;
}

function bestOtherSlot(table: ItemTable, board: BoardSpec): Slot {
  let best: { slot: Slot; baseValue: number } | null = null;
  for (const placed of board.placed) {
    const definition = table.get(placed.itemId);
    if (!definition) throw new Error(`Unknown item id: ${placed.itemId}`);
    if (!best || definition.baseValue > best.baseValue) {
      best = { slot: placed.slot, baseValue: definition.baseValue };
    }
  }
  if (!best) throw new Error('Lucky-cat spotlight boards require at least one other item.');
  return best.slot;
}

function makeLuckySpotlightBoards(
  seed: string,
  count: number,
  pool: readonly ItemDefinition[],
  table: ItemTable,
  spotlightHero: boolean,
): BoardSpec[] {
  return makeFavorableBoards(`${seed}-${spotlightHero ? 'spotlight' : 'no-spotlight'}`, 'lucky-cat', count, pool)
    .map((board) => {
      if (!spotlightHero) return board;
      return { ...board, spotlight: bestOtherSlot(table, board) };
    });
}

function bestFillerScore(
  table: ItemTable,
  combos: ReturnType<typeof loadCombos>,
  board: BoardSpec,
  fillerCandidates: readonly ItemDefinition[],
): { itemId: string; total: number } {
  let best: { itemId: string; total: number } | null = null;
  for (const filler of fillerCandidates) {
    const total = scoreBoard(table, combos, board, { slot: board.reservedSlot, itemId: filler.id });
    if (!best || total > best.total || (total === best.total && filler.id.localeCompare(best.itemId) < 0)) {
      best = { itemId: filler.id, total };
    }
  }
  if (!best) throw new Error('No filler candidates.');
  return best;
}

function runEqualN(
  table: ItemTable,
  combos: ReturnType<typeof loadCombos>,
  boards: readonly BoardSpec[],
  signatures: readonly ItemDefinition[],
): { rows: EqualNRow[]; baseline: NumericSummary; allSignatureMedian: number; maxToAllSigRatio: number } {
  const baselineScores = boards.map((board) => scoreBoard(table, combos, board, null));
  const baseline = summarize(baselineScores);
  const allSignatureScores: number[] = [];
  const rows: EqualNRow[] = [];

  for (const signature of signatures) {
    const scores = boards.map((board) =>
      scoreBoard(table, combos, board, { slot: board.reservedSlot, itemId: signature.id }),
    );
    allSignatureScores.push(...scores);
    const summary = summarize(scores);
    rows.push({
      itemId: signature.id,
      n: summary.n,
      median: summary.median,
      p90: summary.p90,
      p95: summary.p95,
      max: summary.max,
      liftVsBaseline: ratio(summary.median, baseline.median),
      toAllSignatureMedian: 0,
    });
  }

  const allSignatureMedian = summarize(allSignatureScores).median;
  for (const row of rows) row.toAllSignatureMedian = ratio(row.median, allSignatureMedian);
  const maxToAllSigRatio = Math.max(...rows.map((row) => row.toAllSignatureMedian));
  return { rows, baseline, allSignatureMedian, maxToAllSigRatio };
}

function runFavorable(
  table: ItemTable,
  combos: ReturnType<typeof loadCombos>,
  seed: string,
  count: number,
  signatures: readonly ItemDefinition[],
  nonSignaturePool: readonly ItemDefinition[],
  fillerCandidates: readonly ItemDefinition[],
): FavorableRow[] {
  return signatures.map((signature) => {
    const boards = makeFavorableBoards(seed, signature.id, count, favorablePoolFor(signature.id, nonSignaturePool));
    const signatureScores: number[] = [];
    const fillerScores: number[] = [];
    let maxLift = 0;
    let maxLiftFiller = '';
    for (const board of boards) {
      const signatureTotal = scoreBoard(table, combos, board, {
        slot: board.reservedSlot,
        itemId: signature.id,
      });
      const filler = bestFillerScore(table, combos, board, fillerCandidates);
      const lift = ratio(signatureTotal, filler.total);
      signatureScores.push(signatureTotal);
      fillerScores.push(filler.total);
      if (lift > maxLift) {
        maxLift = lift;
        maxLiftFiller = filler.itemId;
      }
    }
    const signatureSummary = summarize(signatureScores);
    const fillerSummary = summarize(fillerScores);
    return {
      itemId: signature.id,
      n: signatureSummary.n,
      signatureMedian: signatureSummary.median,
      fillerMedian: fillerSummary.median,
      medianLift: ratio(signatureSummary.median, fillerSummary.median),
      maxLift,
      maxLiftFiller,
    };
  });
}

function runLuckySpotlight(
  table: ItemTable,
  combos: ReturnType<typeof loadCombos>,
  seed: string,
  count: number,
  nonSignaturePool: readonly ItemDefinition[],
  fillerCandidates: readonly ItemDefinition[],
): LuckySpotlightRow[] {
  return [false, true].map((spotlightHero) => {
    const boards = makeLuckySpotlightBoards(seed, count, highBaseDefinitions(nonSignaturePool), table, spotlightHero);
    const luckyScores: number[] = [];
    const fillerScores: number[] = [];
    let maxLift = 0;
    let maxLiftFiller = '';
    for (const board of boards) {
      const luckyTotal = scoreBoard(table, combos, board, {
        slot: board.reservedSlot,
        itemId: 'lucky-cat',
      });
      const filler = bestFillerScore(table, combos, board, fillerCandidates);
      const lift = ratio(luckyTotal, filler.total);
      luckyScores.push(luckyTotal);
      fillerScores.push(filler.total);
      if (lift > maxLift) {
        maxLift = lift;
        maxLiftFiller = filler.itemId;
      }
    }
    const luckySummary = summarize(luckyScores);
    const fillerSummary = summarize(fillerScores);
    return {
      arm: spotlightHero ? 'hero spotlight ON' : 'no spotlight',
      n: luckySummary.n,
      luckyCatMedian: luckySummary.median,
      fillerMedian: fillerSummary.median,
      medianLift: ratio(luckySummary.median, fillerSummary.median),
      maxLift,
      maxLiftFiller,
    };
  });
}

function markdownTable(headers: readonly string[], rows: readonly (readonly string[])[]): string {
  const header = `| ${headers.join(' | ')} |`;
  const divider = `| ${headers.map(() => '---').join(' | ')} |`;
  const body = rows.map((row) => `| ${row.join(' | ')} |`);
  return [header, divider, ...body].join('\n');
}

function printReport(
  args: Args,
  equalN: ReturnType<typeof runEqualN>,
  favorable: readonly FavorableRow[],
  luckySpotlight: readonly LuckySpotlightRow[],
): void {
  const verdict = equalN.maxToAllSigRatio < 2 ? 'PASS' : 'FAIL';
  const maxFavorable = Math.max(...favorable.map((row) => row.maxLift));
  const spotlightArm = luckySpotlight.find((row) => row.arm === 'hero spotlight ON');
  if (!spotlightArm) throw new Error('Missing lucky-cat spotlight arm.');

  console.log('# Signature dominance expansion re-probe');
  console.log('');
  console.log(`Verdict by equal-n 2x gate: ${verdict}`);
  console.log(`Seed: ${args.seed}`);
  console.log(`Realistic 4x4 boards per cell: ${args.boards}`);
  console.log(`Favorable/spotlight boards per cell: ${args.ceilingBoards}`);
  console.log(`All-signature aggregate median: ${equalN.allSignatureMedian}`);
  console.log(`maxToAllSigRatio: ${equalN.maxToAllSigRatio.toFixed(3)}`);
  console.log(`Favorable-board max lift: ${maxFavorable.toFixed(3)}`);
  console.log(`Lucky-cat hero-spotlight median lift: ${spotlightArm.medianLift.toFixed(3)}`);
  console.log('');

  console.log('## Equal-n realistic 4x4 boards');
  console.log(markdownTable(
    ['cell', 'n', 'median', 'p90', 'p95', 'max', 'lift vs no-sig median', 'to all-sig median'],
    [
      [
        'no-signature baseline',
        String(equalN.baseline.n),
        String(equalN.baseline.median),
        String(equalN.baseline.p90),
        String(equalN.baseline.p95),
        String(equalN.baseline.max),
        '1.000',
        '-',
      ],
      ...equalN.rows.map((row) => [
        row.itemId,
        String(row.n),
        String(row.median),
        String(row.p90),
        String(row.p95),
        String(row.max),
        row.liftVsBaseline.toFixed(3),
        row.toAllSignatureMedian.toFixed(3),
      ]),
    ],
  ));
  console.log('');

  console.log('## Favorable-board ceiling');
  console.log(markdownTable(
    ['item', 'n', 'signature median', 'best filler median', 'median lift', 'max lift', 'max-lift filler'],
    favorable.map((row) => [
      row.itemId,
      String(row.n),
      String(row.signatureMedian),
      String(row.fillerMedian),
      row.medianLift.toFixed(3),
      row.maxLift.toFixed(3),
      row.maxLiftFiller,
    ]),
  ));
  console.log('');

  console.log('## Lucky-cat x spotlight arm');
  console.log(markdownTable(
    ['arm', 'n', 'lucky-cat median', 'best filler median', 'median lift', 'max lift', 'max-lift filler'],
    luckySpotlight.map((row) => [
      row.arm,
      String(row.n),
      String(row.luckyCatMedian),
      String(row.fillerMedian),
      row.medianLift.toFixed(3),
      row.maxLift.toFixed(3),
      row.maxLiftFiller,
    ]),
  ));
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  withEnv(
    {
      [LOOP_V2_ENV_VAR]: '1',
      [SHELF_EXPANSION_ENV_VAR]: '1',
      [SIGNATURE_ITEMS_ENV_VAR]: '1',
      [TAG_SYNERGY_ENV_VAR]: undefined,
    },
    () => {
      const table = loadItemTable();
      const combos = loadCombos();
      const signatures = signatureDefinitions(table);
      const realisticPool = nonSignatureOfferableDefinitions(table);
      const nonSignaturePool = nonSignatureDefinitions(table);
      const fillerCandidates = highBaseDefinitions(nonSignaturePool);
      const realisticBoards = makeRealisticBoards(args.seed, args.boards, realisticPool);
      const equalN = runEqualN(table, combos, realisticBoards, signatures);
      const favorable = runFavorable(
        table,
        combos,
        args.seed,
        args.ceilingBoards,
        signatures,
        nonSignaturePool,
        fillerCandidates,
      );
      const luckySpotlight = runLuckySpotlight(
        table,
        combos,
        args.seed,
        args.ceilingBoards,
        nonSignaturePool,
        fillerCandidates,
      );

      printReport(args, equalN, favorable, luckySpotlight);
    },
  );
}

main();
