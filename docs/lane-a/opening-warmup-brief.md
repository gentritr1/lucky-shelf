# Lane A brief — A-M6b: Warm Opening (`WARM_OPENING_ENABLED`)

**Author:** Fable (design + balance authority), 2026-07-08. **Implementer:** Codex.
**Sequencing:** start AFTER A-M6a lands (both touch `economy.ts`/fuzz surfaces).
**Review:** Fable re-runs everything below on the packet; the implementer never self-signs-off.

## Context (self-sufficient — do not assume access to any conversation)

Lucky Shelf: deterministic sim in `src/sim`, contracts in `src/contracts`. All loop-v2 depth
flags default OFF; the OFF path is pinned byte-identical (determinism hash `8d48e1c5a6ad14c9`,
6 goldens, 6 fixtures). Toolchain: `PATH="$HOME/.nvm/versions/node/v23.3.0/bin:$PATH"`.

The measured problem (`docs/review-packets/FABLE-RULINGS-2026-07-08.md`, implementation record):
the **beginner floor is far below target** — the `floor` policy in `src/sim/balanceHarness.ts`
(`floorAction`: buys the first affordable offer, places in the first slot, never optimizes)
clears the first 25-coin rent only **10–25%** of the time across flag configs, worst (~10%) under
`loopV2`. The human's aspirational band is 40–70% (`ASPIRATIONAL_TARGET_BANDS`, deliberately not
asserted).

**A cost discount is the WRONG fix — it was tried and reverted**: cheaper day-2 prices collapsed
the build-swing guardrail to 1.13 (ceiling bots stuff the shelf with cheap stock; builds stop
mattering). The ruled mechanic instead guarantees cheap items are *offered*, without touching any
price.

## Design (decided — implement as specified)

- New flag `WARM_OPENING_ENABLED` (+ env var) in `src/sim/economy.ts`, default OFF; effective
  only when the run's `loopV2` snapshot is true.
- Mechanic: on **days 1 and 2**, every daily-shop (`restock`) offer generation — including
  rerolls — must contain **≥ 2 offers with cost ≤ 4** (cost via the existing, unchanged
  `dailyShopCost`).
- Implementation shape: after normal `generateOffers` output, if fewer than 2 offers cost ≤ 4,
  deterministically replace the most expensive offers (highest cost first, stable tie-break by
  offer index) with the cheapest eligible items from the same weighted pool that are not already
  offered, chosen via a seeded derivation (`rngFor(seed, 'warmopen', day, salt)`), until the
  guarantee holds or the pool is exhausted. **No price changes anywhere.** Replaced offers keep
  the standard offerId derivation so the buyout-reroll uniqueness fix (salt folds coins + live
  instanceIds — see `loopV2.test.ts` regression) still holds.
- Guarantee applies to `restock` generations on days 1–2 only; delivery offers (free starters)
  are untouched.

## Non-goals
- No price/cost changes (the reverted-lever scar), no starting-coins change, no rent change,
- no `GameState`/`Action`/schema surface at all (this is generation-internal → **no CCR**),
- no tutorial/UI work, no flag graduations, no `GOAL_LADDER_TARGETS` edits (report drift only).

## Observable acceptance criteria
1. **OFF byte-identity:** pin `8d48e1c5a6ad14c9`, goldens, fixtures, full suite green; with the
   flag off, generation output is byte-identical (assert offer ids equal on a sample of seeds).
2. **Floor moves (the point):** at the 80-run balance report with `WARM_OPENING_ENABLED=1`
   layered onto each config's env, the `loopV2` and `allDepth` configs' floor
   `firstRentSurvivalRate` is **≥ 1.5× the same-seed baseline AND ≥ 0.30 absolute**. Report all
   configs' before/after.
3. **No free lunch for ceilings:** greedy/combo day-9 median `dayTotalByDay` within ±5% of the
   same-seed no-warm baseline (120-run fuzz A/B); `scripts/balance.ts --assert-bands` exits 0
   (swing `[1.3,2.0]` is the guardrail this mechanic historically broke — watch it).
4. **Determinism:** same seed → identical guaranteed offers; the 200-replay determinism test
   stays green; rerolling on day 1–2 re-applies the guarantee deterministically.
5. **Goal-table report:** 400-run full-stack fuzz + warm opening: report days 1–3
   `goalTargetHitRateByDay` (the cheap-stock arc may lift early totals — Fable rules on the
   numbers; do not retune).
6. **Degenerate-state probes (tests):** a pool with < 2 items costing ≤ 4 on day 1 (construct a
   filtered table — guarantee degrades gracefully, no throw, no infinite loop); day-1 buyout +
   reroll keeps the guarantee AND mints no duplicate ids; day 3 generation is untouched
   byte-for-byte; mutation check — disable the guarantee and show which tests fail, restore.

## Exact verification commands (Fable re-runs these at review)
```
PATH="$HOME/.nvm/versions/node/v23.3.0/bin:$PATH" node_modules/.bin/tsc --noEmit
PATH=… node --import tsx scripts/validate-fixtures.ts
PATH=… node_modules/.bin/vitest run
PATH=… LOOP_V2_ENABLED=1 WARM_OPENING_ENABLED=1 node --import tsx scripts/fuzz.ts --runs 120 --strategy all --seed m6b-on
PATH=… LOOP_V2_ENABLED=1 node --import tsx scripts/fuzz.ts --runs 120 --strategy all --seed m6b-on   # same seed, warm off = the A/B
PATH=… node --import tsx scripts/balance.ts --assert-bands
```
(The balance report itself prints per-config floor first-rent survival — capture it for
criterion 2; if the script needs a temporary env hook to layer `WARM_OPENING_ENABLED` onto its
configs, adding that config row to `BALANCE_FLAG_CONFIGS` is in scope — flag it in the packet.)

## Deliverable
Review packet `docs/review-packets/A-M6b-warm-opening-review.md` in the `A-M5a` style: built vs
criteria, exact commands + outputs, A/B JSON, known issues/deviations, questions for Fable, STOP
line. Note explicitly: **no contract change** in this phase.

**STOP — land behind the flag, default OFF. No graduation. Fable reviews the packet.**
