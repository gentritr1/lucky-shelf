# Lane A brief — A-M6a: Shelf Expansion coin sink (`SHELF_EXPANSION_ENABLED`)

**Author:** Fable (design + balance authority), 2026-07-08. **Implementer:** Codex.
**Review:** Fable re-runs everything below on the packet; the implementer never self-signs-off.

## Context (self-sufficient — do not assume access to any conversation)

Lucky Shelf is a deterministic single-player shelf-building roguelite. Sim code lives in `src/sim`,
contracts in `src/contracts`, item data in `src/items`. The loop-v2 depth features
(`LOOP_V2_ENABLED` daily shop, `TAG_SYNERGY_ENABLED`, `BUILD_STEERING_ENABLED`,
`SIGNATURE_ITEMS_ENABLED`, `GOAL_LADDER_ENABLED` in `src/sim/economy.ts`) are all **default OFF**;
the OFF path is pinned byte-identical by the determinism hash `8d48e1c5a6ad14c9`
(`src/sim/determinism.test.ts`), 6 M0 goldens, and 6 M0 fixtures. That invariant is absolute.

The measured problem (see `docs/review-packets/FABLE-RULINGS-2026-07-08.md`, implementation
record): with all v2 flags on, ceiling bots hold a ~5–7× coin surplus over rent from day ~6
because the 12-slot shelf saturates and nothing else absorbs coins. Rent-curve tuning cannot fix
it — every steeper variant breached the run-length `[20,36]d` or build-swing `[1.3,2.0]×`
guardrails (`src/sim/balanceHarness.ts`, enforced by `scripts/balance.ts --assert-bands`). The
ruled fix is a **coin sink: one purchasable shelf row**.

Toolchain: `PATH="$HOME/.nvm/versions/node/v23.3.0/bin:$PATH"`, then `node_modules/.bin/tsc`,
`node_modules/.bin/vitest run`, `node --import tsx scripts/…`.

## Design (decided — implement as specified)

- New flag `SHELF_EXPANSION_ENABLED` (+ `SHELF_EXPANSION_ENV_VAR`) in `src/sim/economy.ts`,
  default OFF. Effective only when the run's `loopV2` snapshot is true (mirror
  `goalLadderEnabled`'s pattern).
- New action `{ type: 'expandShelf' }` (no payload). Legal when: flag effective, phase is
  `restock` or `arrange`, `heldItem` is null, `shelf.size.rows < 4`, and
  `coins >= SHELF_EXPANSION_COST`.
- Effect: `coins -= SHELF_EXPANSION_COST`; `shelf.size.rows += 1`; append one row of empty slots
  in row-major order. **3×4 → 4×4 exactly once per run** — `ShelfSizeSchema` already allows
  `rows ≤ 4`, so there is **no schema edit at all**. No RNG involved.
- `export const SHELF_EXPANSION_COST = 150;` — provisional; you may fuzz-tune within [100, 250]
  to hit the acceptance numbers, and must report the final value + the tuning evidence.
- Expose the action in `src/sim/uiAffordances.ts` (this is what the liveness fuzz walks) and in
  `legalActions`. Greedy/combo bots (`src/sim/bots.ts`) should expand when they can afford it
  while keeping ≥ the next rent bill in reserve — exact heuristic is yours; the acceptance
  criteria below are outcome-level.
- Fuzz metrics (`scripts/fuzz.ts`): add `expansionsPerRun` and keep the existing
  surplus/`dayTotalByDay` reporting working with 16-slot shelves.

## Non-goals
- No UI/rendering work (Lane B gets a separate brief; `ShelfScene` handling 4 rows is theirs).
- No item-table changes, no `GOAL_LADDER_TARGETS` changes (report drift, don't retune — the table
  is Fable's), no v1 constant changes, no flag graduations, no `ContractSchemaVersion` bump.

## Contract change request (include in your packet)
- CCR: additive `Action` variant `expandShelf` (no payload). Old fixtures must parse unchanged;
  new states must round-trip (`GameStateSchema.parse(JSON round-trip)` — see
  `src/sim/invariants.test.ts`).

## Observable acceptance criteria (each verified by the exact method below)
1. **OFF byte-identity:** determinism pin `8d48e1c5a6ad14c9` unchanged; 6 goldens + 6 fixtures
   validate; full `vitest run` green; with the flag off, `expandShelf` is never legal and never
   emitted by `uiAffordances`.
2. **Mechanism used:** with the full stack ON (all five v2 flags + expansion), ≥50% of
   greedy-bot runs buy the expansion (120-run fuzz).
3. **Sink works (the point):** same-seed A/B, 120 runs, full stack with vs without
   `SHELF_EXPANSION_ENABLED`: day-12 median surplus ratio (`coins/rentAmount`, see
   `daySample` in `balanceHarness.ts`) drops to **≤ 3.5** with expansion (from ~4.1), and day-9
   median surplus is directionally lower. Report both tables.
4. **Guardrails hold:** `node --import tsx scripts/balance.ts --assert-bands` exits 0
   (run length `[20,36]`, swing `[1.3,2.0]`).
5. **Liveness:** the uiAffordances dead-end fuzz stays green (no state where a 16-slot shelf
   strands the player).
6. **Goal-table drift report:** 400-run fuzz, full stack + expansion, report
   `goalTargetHitRateByDay` for greedy+combo. Do not retune the table; Fable rules on the report.
7. **Degenerate-state probes (tests):** expand with exactly `SHELF_EXPANSION_COST` coins (legal,
   ends at 0); expand at 4 rows throws; expand with `heldItem` throws; expand with flag-off or
   v1 run throws; buyout+reroll after expansion mints no duplicate ids (extend the existing
   `loopV2.test.ts` regression); mutation check — neuter the expansion branch and show which of
   your tests fail, then restore.

## Exact verification commands (Fable re-runs these at review)
```
PATH="$HOME/.nvm/versions/node/v23.3.0/bin:$PATH" node_modules/.bin/tsc --noEmit
PATH=… node --import tsx scripts/validate-fixtures.ts
PATH=… node_modules/.bin/vitest run
PATH=… LOOP_V2_ENABLED=1 SIGNATURE_ITEMS_ENABLED=1 TAG_SYNERGY_ENABLED=1 BUILD_STEERING_ENABLED=1 GOAL_LADDER_ENABLED=1 SHELF_EXPANSION_ENABLED=1 node --import tsx scripts/fuzz.ts --runs 120 --strategy all --seed m6a-on
PATH=… LOOP_V2_ENABLED=1 SIGNATURE_ITEMS_ENABLED=1 TAG_SYNERGY_ENABLED=1 BUILD_STEERING_ENABLED=1 GOAL_LADDER_ENABLED=1 node --import tsx scripts/fuzz.ts --runs 120 --strategy all --seed m6a-on   # same seed, expansion off = the A/B
PATH=… node --import tsx scripts/balance.ts --assert-bands
```

## Deliverable
A review packet `docs/review-packets/A-M6a-shelf-expansion-review.md` in the style of
`A-M5a-loop-v2-phase1-review.md`: built-vs-criteria, exact commands + outputs, fuzz A/B JSON,
known issues/spec deviations, questions for Fable, the CCR, and a STOP line.

**STOP — land behind the flag, default OFF. No graduation. Fable reviews the packet.**
