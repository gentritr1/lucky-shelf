# A-M9 — Gate 1.2 economy retune (build-swing band)

**Ruled by:** Fable, 2026-07-13. **Implementer:** Opus 4.8 (Lane A). **Branch:** `graduation-flip`, on top of `4b5e243`.

## Context (self-contained)

Lucky Shelf is a deterministic shelf-building survival game. The graduating v2 depth stack
(LOOP_V2 + SIGNATURE_ITEMS + TAG_SYNERGY + BUILD_STEERING + GOAL_LADDER + SHELF_EXPANSION +
UNLOCK_LADDER + DAY2_STARTER, warm opening OFF) must not multiply ceiling-bot earnings beyond the
approved **build-swing band [1.3×, 2.0×]** relative to the v1 baseline. The corrected like-for-like
paired-cohort gate (fixed 2026-07-12: starter vs starter, full vs full, paired seeds) currently
**fails every ceiling arm**:

```
starter/ceiling-greedy 2.635×   starter/ceiling-combo 2.713×
full/ceiling-greedy    2.248×   full/ceiling-combo    2.416×
(paired medians 2.587 / 2.539 / 2.181 / 2.227; band [1.3, 2.0])
```

Authoritative gate command (Fable re-ran it 2026-07-13; numbers reproduce exactly — the harness is
deterministic):

```sh
node --import tsx scripts/balance.ts \
  --runs 80 \
  --config baselineStarter,baselineFull,graduating,graduatingFull \
  --policy ceiling-greedy,ceiling-combo \
  --assert-bands
```

Swing metric: median `totalCoinsEarned` (graduating ÷ baseline) per cohort per policy — see
`src/sim/balanceHarness.ts` (`BUILD_SWING_CONFIG_PAIRS`, `computeBuildSwingByCohort`,
`FABLE_BALANCE_TARGET_BANDS`). Total earned compounds per-day yield × run length, so both matter.

## Fable's ruling — direction and lever priority

Bring all four arms inside **[1.3, 2.0]** by trimming the **v2 multiplier stack's output**, not by
widening the band and not primarily by steepening rent (rent shortens runs without making builds
less explosive, and it worsens the already-poor beginner floor). Target roughly a 15–30% cut in
graduating total earnings. **Do not overshoot below 1.3× in any arm — depth must still visibly pay.**

Lever priority (all are v2-only constants in `src/sim/economy.ts`; the v1 path never reads them):

1. **`TAG_SYNERGY_LADDER`** (currently 1.2/1.4/1.6/1.8 at 3/4/5/6 items). The broadest lever: on a
   steered shelf nearly every item collects a rung, and it compounds with spotlight ×3 and
   signature rules. Trim magnitudes and/or raise `minCount` steps.
2. **Signature item power via price/availability:** `SIGNATURE_ITEM_DAY_PREMIUM`,
   `SIGNATURE_ITEM_TIER_PREMIUM`, `SIGNATURE_ITEM_WEIGHT_MULT`, and the signature branch of
   `dailyShopCost`/`restockCost`. Do NOT change signature scoring rules themselves (item-table/CCR
   territory).
3. **`BUILD_STEER_BIAS`** (2.5): less steering → less reliable synergy ladders. Use sparingly —
   steering is a core legibility feature; do not gut the feeling that the supplier pick matters.
4. **Throughput/sinks:** non-signature `dailyShopCost` day premium (currently `(day−1)×5`),
   `SHELF_EXPANSION_COST` (250). Allowed as trim, not as the primary lever.
5. **`LOOP_V2_RENT_GROWTH_LATE` / `LOOP_V2_RENT_GROWTH_LATE_FROM_CYCLE`:** only if the run-length
   band `[20, 36]d` median needs re-centering after yield trims. Prefer leaving it.

**Forbidden:** any v1 constant (`STARTING_RENT`, `RENT_GROWTH`, `RENT_GROWTH_LATE*`, base
`restockCost`/`sellPrice` formulas as seen by v1, `REROLL_COST`, `FREE_MOVES_PER_DAY`,
`OFFERS_PER_*`), anything in `src/items/` or `src/contracts/`, scoring order, the approved bands in
`balanceHarness.ts`, `LOOP_V2_DAILY_SHOP_OFFERS` (4 offers = the decision-density feature),
`SPOTLIGHT_MULT`/`DEMAND_*` (shared with v1 baseline — changing them moves both sides of the
ratio and the M0 world), removing/adding flags, and any UI change.

## Mandatory follow-through — the goal table (scar rule, fired 5×)

`GOAL_LADDER_TARGETS` is anchored to measured graduating yields. After ANY yield change you MUST
re-derive it with the existing measurement script and validate out-of-sample, exactly like the
2026-07-10 retune:

```sh
node --import tsx scripts/goal-tune.ts --config graduating --runs 400 --seed gate12-retune-0713
# then validate on a DIFFERENT seed, e.g.:
node --import tsx scripts/goal-tune.ts --config graduating --runs 400 --seed gate12-retune-0713-v2
```

Acceptance: every day's hit rate for both ceiling strategies in **[0.65, 0.85]** on the
out-of-sample seed. Update the `GOAL_LADDER_TARGETS` comment to name the new script run.

## Determinism pins

- The **frozen v1 pin `8d48e1c5a6ad14c9`** in `src/sim/determinism.test.ts` must remain untouched
  and passing — if it changes, you touched the v1 path; revert and rethink.
- The **graduating pin `4d5b9f57ba63b916`** WILL legitimately change (it hashes shipping-default
  economy). Update it once, deliberately, with a comment naming this retune and date.
- All 7 fixtures (`pnpm fixtures:validate`) must stay valid unchanged — they are v1-pinned.

## Method requirements

- Iterate cheaply (e.g. `--runs 30`) to search, but the acceptance evidence is the **80-run
  authoritative command above** — swing is only stable there.
- Environment: node v20.19.4 (already default). Run the test suite **serially**:
  `npx vitest run --no-file-parallelism` (parallel runs hit runner contention timeouts).
- Also re-run: `npx tsc --noEmit`, `pnpm fixtures:validate`,
  `node --import tsx scripts/fuzz.ts --runs 50` (liveness must find no dead ends).

## Deliverables

1. The retuned constants in `src/sim/economy.ts` (+ goal table), with comments naming the
   measurement commands/seeds that produced each number.
2. Updated graduating pin + any tests that legitimately pin retuned values (each updated test must
   keep exercising its original failing path — do not weaken or delete assertions).
3. A review packet `docs/review-packets/GATE12-economy-retune-2026-07-13.md` containing: the lever
   diff (old→new with rationale), before/after swing table (all four arms + paired medians +
   p10/p90), run-length medians, first-rent survival before/after (report-only; do not make it
   worse without flagging it), goal-table before/after with out-of-sample hit rates, and the exact
   commands run.
4. **Leave everything uncommitted.** Fable reviews by re-running the gate before anything lands.

## Acceptance criteria (observable; Fable will re-run these verbatim)

1. Authoritative 80-run command exits 0; all four swing arms in [1.3, 2.0]; ceiling run-length
   medians in [20, 36].
2. Goal-table out-of-sample hit rates all in [0.65, 0.85].
3. v1 pin unchanged; fixtures 7/7; `tsc` clean; full serial suite green; 50-run liveness fuzz clean.
4. Review packet complete per above.

## Non-goals

Beginner-floor improvement (separate, evidence-gated), supplier-choice timing (ruled separately:
unchanged pending alpha data), any feature work (freeze until Gate 3), committing.
