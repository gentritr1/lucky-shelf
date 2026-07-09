# Fable reviews — round 5 (2026-07-09): A-M8, A-M6a-G2, B-M10, B-M5 P2–3

Consolidated verdicts; combined-tree evidence executed by the reviewer: `tsc` clean, 6 fixtures,
**259/259 tests** (pin `8d48e1c5a6ad14c9` in-suite), plus an independent probe run (below).

## A-M8 placement-hint model — APPROVE
Pure leaf module exactly per brief: qualitative `active|none` + `comboTeased`, discovered-rules-
only (held item's own rules hint only once that item is discovered — stricter-correct reading),
achieved-combos-only teasing, empty-slot-only. Bench **1.011ms** median for the 15-slot worst
case (budget 10ms) — Lane B can call it per drag. Isolation grep in packet; nothing sim-side
imports it. Lane B UI surface (flag `PLACEMENT_HINT_ENABLED`) is a later brief and is **run.tsx
territory — blocked on the human's WIP + device window.**

## A-M6a-G2 dominance re-probe — GATE PASS (ruled)
Reviewer re-ran the permanent script on an independent seed (`fable-g2-verify`): equal-n
consignment-sign to-all-signature ratio **1.584** (packet 1.600) — under the 2.0 line; gate
**PASS**, expansion + signatures may graduate together on this axis. Rulings on the caveats:
- **Favorable-board ceiling 2.06–2.09× (consignment-sign, MAX-lift construction):** accepted.
  The gate authority is the equal-n median (per the original gate doc); a purpose-built board's
  tail construction crossing 2× is what a build-defining whole-shelf multiplier is FOR. Recorded
  watch flag: consignment-sign scales with slot count — first retune candidate if the shelf ever
  exceeds 16 slots or real play complains.
- **Lucky-cat × spotlight (the standing eyeball item): resolved numerically** — 0.980 median
  lift even beside a spotlighted hero (it still costs a scoring slot). Removed from the device-
  gate eyeball list.
- Trend note for the graduating-set pass: signature medians drift up with expansion (1.13 → 1.58
  pre/post) — inputs to the final goal-table retune, not a standalone action.

## B-M10 share polish — APPROVE
Codec is stable-forever by construction (hand-rolled FNV-1a, order-pinned 64-word cozy list,
frozen label pins in tests); "nickname, not a key" correctly documented. The receipt card is
honest ("closing day", no trace persistence). The snapshot test caught a real bug pre-review
(`trace.dayTotal` doesn't exist — total read from the terminal event, same lesson as
`cascadeTier.dayTotalOf`). Rulings on the two flagged items: **state → `juice/receipt` import
edge APPROVED** (pure text submodule, no Skia, no cycle — the boundary rule targets `@/sim`/
`@/items` value imports, not pure presentation models); **`fonts.mono` + `typeScale.receipt`
tokens APPROVED** (tokens are exactly where those belong). Best-day receipt = recorded follow-up.
Device shots join the batched gate.

## B-M5 Parts 2–3 (silhouettes + next-unlock teaser) — APPROVE
View-model layer is right: `locked ≠ undiscovered` with discovered-wins precedence (the daily
full-pool interaction handled), singular/plural hints, combo/item hints resolved to display
names, flag-off proven byte-identical at the view-model level, teaser null cases (flag off /
ladder exhausted) covered. Summary teaser reads the live catalog post-merge — correct choice
(the "one more run" prompt should reflect this run). Visuals join the batched device gate.

**Commit note:** `summary.tsx` carries both B-M10's seed-label line and B-M5's teaser — it lands
in the B-M5 commit (hunk staging unavailable), noted in both messages. `run.tsx`/`ShelfScene.tsx`
remain the human's WIP, untouched. B-M11's sequencing gate (B-M5 P2–3 on main) is now met;
Lane B queue: B-M9 (alone) → B-M11.
