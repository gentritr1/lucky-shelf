# GATE 1.2 — economy retune (build-swing band) — review packet

**Task:** A-M9, brief `docs/lane-a/economy-retune-gate12-brief.md`
**Implementer:** Opus 4.8 (Lane A) · **Date:** 2026-07-13 · **Branch:** `graduation-flip` on `4b5e243` · **Left uncommitted.**

## Summary

The like-for-like paired-cohort build-swing gate failed every ceiling arm (2.25–2.71× vs
band **[1.3, 2.0]**). Trimmed the v2-only `TAG_SYNERGY_LADDER` (primary lever) top-weighted, then
re-derived `GOAL_LADDER_TARGETS` against the new yields and validated out-of-sample. All four arms
now sit **1.616–1.92×** with run-length medians **27d** (band [20, 36]); graduating ceiling earnings
fell ~28%. No v1 constant, item, contract, scoring-order, band, or flag was touched.

## 1. Lever diff (old → new, rationale)

| Lever (`src/sim/economy.ts`) | Old | New | Rationale |
|---|---|---|---|
| `TAG_SYNERGY_LADDER` mult @ minCount 3 | 1.2 | **1.15** | Broadest lever (priority #1). Top-weighted trim: |
| … @ minCount 4 | 1.4 | **1.22** | the high rungs (5,6) — where the combo bot's focused |
| … @ minCount 5 | 1.6 | **1.26** | single-tag stacks live — were flattened hardest, |
| … @ minCount 6 | 1.8 | **1.30** | compressing the starter/combo outlier toward greedy. |
| `GOAL_LADDER_TARGETS` | `18,44,68,92,106,112,114,116,148,152,166,172` | **`19,41,61,75,86,94,96,96,112,116,129,136`** | Mandatory re-derive (scar rule) — new yields shifted the p25 day-total curve. |
| graduating determinism pin | `4d5b9f57ba63b916` | **`1adfc85f256b8512`** | ON-path hash of the shipping default; legitimately moves with the economy. |

**Levers NOT used, and why:** Signature price/availability (#2) was rejected — signature items are
**absent from the starter pool (0 of 5; all full-only)**, so trimming them would only pull the already
in-band `full` arms lower and *widen* the spread against the binding `starter/combo` arm.
`BUILD_STEER_BIAS` (#3) and sinks (#4) were left untouched — the ladder trim alone brought every arm
inside band with margin, and the ceiling `totalCoinsEarned` metric is gross scoring yield
(`runStats.totalCoinsEarned += dayTotal`), so coin sinks barely move it except via run length. Rent
growth (#5) left untouched — run-length band did not need re-centering.

## 2. Build swing — before/after (80-run authoritative gate)

Config-median ratio (graduating ÷ baseline) with paired per-seed distribution. Band **[1.3, 2.0]**.

| Arm | BEFORE ratio | BEFORE paired med (p10/p90) | AFTER ratio | AFTER paired med (p10/p90) | Result |
|---|---|---|---|---|---|
| starter/ceiling-greedy | 2.635 | 2.587 (1.35 / 4.233) | **1.90** | 1.88 (1.032 / 2.889) | in-band |
| starter/ceiling-combo  | 2.713 | 2.539 (1.729 / 3.381) | **1.92** | 1.921 (1.159 / 2.811) | in-band |
| full/ceiling-greedy    | 2.248 | 2.181 (0.914 / 3.189) | **1.616** | 1.603 (0.69 / 3.173) | in-band |
| full/ceiling-combo     | 2.416 | 2.227 (0.665 / 4.521) | **1.75** | 1.434 (0.505 / 3.874) | in-band |

Authoritative command exits **0** (`--assert-bands`, no violations).

## 3. Ceiling earnings & run length (graduating configs, 80-run)

| Config / policy | Earned BEFORE | Earned AFTER | Δ | Run-len median BEFORE→AFTER |
|---|---|---|---|---|
| graduating / greedy | 5286c | 3812c | −27.9% | 30d → **27d** |
| graduating / combo  | 5442c | 3851c | −29.2% | 30d → **27d** |
| graduatingFull / greedy | 4645c | 3338c | −28.1% | 30d → **27d** |
| graduatingFull / combo  | 4816c | 3488c | −27.6% | 30d → **27d** |

Baselines (denominators) unchanged: baselineStarter 2006c/2006c, baselineFull 2066c/1993c. The 30→27d
run-length drop is a side effect of lower yields (less surplus buffer against rent spikes) — **rent was
not touched**; 27d is comfortably inside [20, 36].

## 4. First-rent survival — before/after (report-only)

Ceiling first-rent survival stayed ~99–100% both arms both cohorts. Beginner FLOOR policy (aspirational
metric), graduating configs, 80-run:

| Config | FLOOR first-rent survival BEFORE | AFTER |
|---|---|---|
| graduating | 43.8% | **43.8%** (unchanged) |
| graduatingFull | 32.5% | **31.3%** (−1.2pp, one run / noise) |

The synergy ladder only fires at tag-count ≥3, which the opening (day 1–2, small shelf) rarely reaches,
so the beginner floor is essentially untouched. The 1.2pp graduatingFull dip is one run in 80 — flagged
per brief but within sampling noise; not a material worsening.

## 5. Goal table — before/after + out-of-sample validation

Re-derived: `node --import tsx scripts/goal-tune.ts --config graduating --runs 400 --seed gate12-retune-0713`
(pooled ceiling-bot p25 day totals). Day 8 raised 94→96 to keep the ladder monotone non-decreasing.

| Day | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| OLD target | 18 | 44 | 68 | 92 | 106 | 112 | 114 | 116 | 148 | 152 | 166 | 172 |
| NEW target | 19 | 41 | 61 | 75 | 86 | 94 | 96 | 96 | 112 | 116 | 129 | 136 |

**Out-of-sample validation** (`--seed gate12-retune-0713-v2`, 400 runs, currentHitRate = new table under
the reroll-feedback equilibrium): every day, both ceiling strategies, hit rate in **[0.65, 0.85]**:

```
day  target  hit greedy  hit combo
 1     19     0.723       0.685
 2     41     0.782       0.752
 3     61     0.762       0.715
 4     75     0.792       0.742
 5     86     0.779       0.759
 6     94     0.734       0.749
 7     96     0.714       0.732
 8     96     0.744       0.754
 9    112     0.744       0.747
10    116     0.754       0.747
11    129     0.796       0.739
12    136     0.786       0.762
```

(The OLD table under the trimmed economy measured 0.38–0.81 — under-band on the back half — which is why
the re-derive was mandatory.)

## 6. Determinism pins

- Frozen **v1 pin `8d48e1c5a6ad14c9`** — untouched and passing (line 29, byte-identical; the FROZEN test
  and the 200-replay test both pass).
- Graduating pin updated once with a dated comment: `4d5b9f57ba63b916` → `1adfc85f256b8512`.

## 7. Verification results

| Check | Command | Result |
|---|---|---|
| Authoritative swing gate | `node --import tsx scripts/balance.ts --runs 80 --config baselineStarter,baselineFull,graduating,graduatingFull --policy ceiling-greedy,ceiling-combo --assert-bands` | **exit 0**; 4/4 arms in band; run-len 27d |
| Typecheck | `npx tsc --noEmit` | exit 0 |
| Fixtures (7) | `node --import tsx scripts/validate-fixtures.ts` | exit 0, 7/7 valid (v1-pinned, unchanged) |
| Liveness fuzz | `node --import tsx scripts/fuzz.ts --runs 50` | exit 0, no dead ends |
| Full serial suite | `npx vitest run --no-file-parallelism` | **53 files / 373 tests — all passed** (after the §8 adjustment ruled by Fable; the pre-adjustment run was 372 passed / 1 failed) |

(`pnpm` itself is broken on the node v20.19.4 default — `node:sqlite` unavailable — so the underlying
scripts were run directly via `node --import tsx`, which is what the pnpm scripts wrap.)

## 8. `unlocks.test.ts` adjustment (RULED by Fable 2026-07-13, applied)

*"keeps discovery and combo unlock hooks reachable by real bot runs"* initially failed after the retune:
`consignment-sign` no longer unlocked in the test's fixed 28-run sequence, because its gate combo
**`fire-sale`** (`coupon-stack` + `price-gun` adjacent) was not achieved within those seeds.

**Diagnosis (probe evidence) — pre-existing brittleness, not a reachability regression:**

- `fire-sale` is intrinsically rare. 150-run full-pool `playRun` probe (seeds `fs-combo-*`/`fs-greedy-*`,
  2026-07-13): base economy **4/150 combo, 1/150 greedy**; retuned **6/150 combo, 2/150 greedy** — the
  retune made it *marginally more* reachable.
- Which run first lands a ~4–6% combo is seed-luck: base landed it at run 6 of the alternating sequence;
  the retune's legitimate trajectory reshuffle moved it to run 51 there.

**Restructure applied per ruling:** the 28-run block and all its other assertions are unchanged
(`brass-scale`, `ledger-book`, `lucky-cat`, `window-display`, price-gun/coupon-stack discoveries,
`lucky-cluster`, `cheese-board`); `consignment-sign`/`fire-sale` moved to a **bounded continuation** of
the same evolving catalog — combo-only runs from 29, breaking on first `fire-sale` achievement, then
asserting `fire-sale` achieved AND `consignment-sign` unlocked. Timeout bumped 60000 → 180000.

**Measured first-hit under the retuned economy: run 51** (deterministic). The implementer's initial
60-run cap left only 9 runs of headroom and was reported rather than raised blindly; Fable's review
sized the cap to **90** (~1.75× the measured first-hit) so the next legitimate retune has real margin —
the loop breaks on first hit, so the extra budget costs nothing until needed. Test file passes in ~41s;
full serial suite after the restructure: **53 files / 373 tests, 100% green**; `tsc --noEmit` clean
(re-verified by Fable post-bump).
