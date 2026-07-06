# A-M1 Review Packet — Engine

## 1. Built vs. Milestone Criteria

- **Full rule engine (all primitives):** `src/sim/scoring.ts` interprets every contract
  rule kind: `adjacentTo`, `perAdjacent`, `copiesNeighbor`, `auraRow`, `auraColumn`,
  `scoresLast`, `transformsAdjacent`*, `blocksSlot` (+ row/shelf multiplier effects),
  `onSell`, `growsEachDay`, plus the CCR-1 primitives (`agesDaily`, `grantsAdjacent`,
  `lonerBonus`, `multIfAdjacentMinTotal`, `echoLeftmostInRow`, `countdownVanish`).
  *`transformsAdjacent` has schema + offer-pool handling; no exemplar exercises it yet —
  first item table usage will need a unit test.
- **Real trace emission matching goldens:** `src/sim/goldens.test.ts` deep-equals engine
  output against all six M0 golden traces — event kinds, order, deltas, running totals, ids.
- **Determinism suite green:** `src/sim/determinism.test.ts` — pinned state hash
  `3b221c8b479e0ad5` for a fixed seed + action list; 200 random-action replays hashed
  twice, identical.
- **Exemplar-12 live:** `src/items/exemplars.json` (+ provisional `cheese-wheel-tier-2`
  transform target), zod-validated with upgrade-graph integrity checks.
- **Fuzz harness v1:** `scripts/fuzz.ts`, headless, seeded, three strategy bots
  (random / greedy / combo-seeking), JSON stats to stdout.
- Also built (pulled forward from M2 because determinism + fuzz need it): dispatcher over
  the full Action surface, rent sawtooth, seeded tier-weighted offer generation, replay
  runner. All economy constants are provisional (§5).

## 2. Exact Commands

```bash
pnpm m1                       # typecheck + fixture validation + tests + 50-run fuzz smoke
pnpm fuzz -- --runs 5000 --strategy greedy
pnpm fuzz -- --runs 100 --strategy all --seed m1-packet
```

## 3. Verification Output

Tests: **5 files, 32 passed** (contracts 4, goldens 6, rules 12, engine 8, determinism 2).

Fuzz (`--runs 100 --strategy all --seed m1-packet`), key lines:

| strategy | days survived (med/max) | coins earned (med) | best day (med) | game-over rate | died at rent |
|----------|------------------------|--------------------|----------------|----------------|--------------|
| random   | 3 / 3                  | 3                  | 3              | 1.00           | cycle 1      |
| greedy   | 9 / 12*                | 468                | 107            | 0.12           | cycle 1      |
| combo    | 9 / 12*                | 488                | 111            | 0.08           | cycle 1      |

*capped by `--max-actions 400`, not by death — see §5, the v1 economy is too generous.

Performance: mean `resolveOpenShop` on the densest fixture = **0.021 ms** over 10k
iterations (budget: <16 ms on device). 300 full bot runs in 5.5 s.

## 4. Known Issues + Spec Deviations

- `traceId` is `trace-${seed}` to match the hand-written goldens; multi-day runs reuse the
  id. Contract doesn't constrain the format — proposing `trace-${seed}-d${day}` once
  Lane B confirms it doesn't key on traceId (fixtures would be regenerated).
- Money floors after every multiplier application and again at `itemTotal` (ints
  everywhere). No golden exercises a fractional path; Fable should confirm floor vs round.
- Blocked items emit `itemBase` with their real `baseValue` but always total 0 (R-3).
  Only matters if a blocker ever has nonzero base (Shop Cat is 0).
- `dispatch` returns `gameOver` state on missed rent with the day's trace attached; the
  scored day still counts in `runStats.daysSurvived`.
- Coupon Stack provisional numbers: `countdownVanish.days = 1`, decay to floor 0.
- The environment's default Node (v14) breaks pnpm/corepack; verified with
  `~/.nvm/versions/node/v20.19.4` (arm64). Recommend an `.nvmrc`.

## 5. Questions For Fable

1. **Economy is too generous** (v1 numbers were placeholders, but the shape matters):
   greedy sustains ~100c/day by day 9 while rent cycle 4 asks 74. Aged cheese + Cat/Radio
   multipliers compound faster than 1.44^n. Rebalance in the 36-item table, or steepen
   rent, or cap aging?
2. **Random play never survives the first rent** (100/100 deaths at cycle 1). Intended
   skill floor, or should day 1–3 offers be more forgiving?
3. Vintage Radio: if the radio itself is the row's leftmost item, it currently doubles
   itself (plain kickoff reading). Keep, or exclude self?
4. Antique Clock with zero adjacent scored items: currently does **not** double (ruled:
   condition needs ≥1 scored neighbor). Confirm.
5. May players sell sticky items? Currently yes (sticky blocks moves only).
6. Sell price v1 is `floor(base/2)` + onSell modifiers; restock cost is `base + 2×tier`;
   reroll costs 2. All placeholder — tune with the table.

## 6. Contract Change Requests

- **CCR-1 — already Fable-approved and folded into frozen v1** (see
  `docs/review-packets/A-M0-fable-review.md`): six new rule primitives + `vanish` trace
  event + `ItemDefinition.upgradesToItemId`. No further requests.
