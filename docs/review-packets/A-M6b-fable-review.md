# A-M6b Fable Review — Warm Opening

**Reviewer:** Fable, 2026-07-08. Reviews Codex's
[A-M6b-warm-opening-review.md](A-M6b-warm-opening-review.md).
**Verdict: APPROVE the landing behind `WARM_OPENING_ENABLED` (default OFF), with two rulings
applied in-review. The brief's floor-survival acceptance is NOT met and cannot be met by this
mechanic class — that gap is escalated as a design decision, not sent back for iteration.**

## First: the spec was mine and it was wrong

The brief demanded "≥2 offers costing ≤4 on days 1–2" — but the unchanged day-2 price floor is 8
(`dailyShopCost` day premium), so the day-2 guarantee was unsatisfiable as written. The
implementer's choice to degrade gracefully rather than fabricate discounts was **correct** and is
exactly the honest behavior the packet should get credit for. Scar recorded: brief constants must
be computed against the live curves they bind, not quoted from day-1 memory.

## Rulings applied in-review (by Fable)
1. **Day-aware ceiling:** 4 on day 1, **10 on day 2** (admits the unchanged-price tier-1 pool at
   8–10). Answers the packet's §8 question: yes — cheapest unchanged-price day-2 items, no price
   or item-table changes. Day-2 guarantee test added (`warmOpening.test.ts`).
2. **Replace cheapest-first, not priciest-first** (my brief said priciest; measured cost: day-9
   ceiling −6–7%). Swapping the non-qualifying offers *closest to the ceiling* keeps the
   guarantee while leaving premium stock for strong players.

## What I re-ran (executed)
- Suite 141/141; `tsc` clean (user's unrelated ShelfScene WIP stashed); OFF-path byte-identity
  covered by the flag-off generation test + pin + goldens + fixtures in the suite.
- **No-free-lunch after ruling 2 — CONFIRMED (same-seed A/B, seed `fable-review-m6b2`):** day-9
  ceiling ratio warm/base **1.000 greedy / 0.967 combo**, day-12 1.038/1.008 — inside ±5%
  (pre-ruling: 0.927/0.937, outside). Run length unchanged (27/27).
- **Floor re-measured (80-run balance report, day-2 fix active):** baseline 21.2→21.2%,
  buildSteering 25→31.3%, **loopV2 10→12.5%, allDepth 16.3→20.0%**. `--assert-bands` exit 0.

## The honest acceptance verdict

**Floor criterion (≥1.5× and ≥0.30) NOT met — and won't be by offer composition.** The measured
lift tops out at ~1.25×. The floor player's binding constraint is placement quality and low item
value, not shop availability; guaranteeing cheap stock can't triple their survival. Iterating
this mechanic further would be spec-chasing.

**Escalation to the human (with recommendation):** to reach the 40–70% aspiration, pick one:
1. **Free day-2 starter delivery** (recommended) — a second 1-of-3 free pick on day 2 under the
   flag; more stock without touching prices; needs a small phase-flow change + swing re-check.
2. **Welcome-week rent** — first cycle's rent reduced under v2; direct but softens the game's
   defining pressure at its most formative moment.
3. **Accept the cliff** — keep warm opening as a modest kindness and let the aspiration band stay
   aspirational.

```
Verdict: APPROVE landing (default OFF); floor acceptance NOT MET — escalated, not iterated.
Pre-fix failure reproduced: yes — day-2 pool emptiness confirmed in code and by the packet.
Rulings verified: day-2 guarantee test green; ±5% ceiling bound restored (executed A/B).
Tests cover the path: flag-off byte-identity, day-1+day-2 guarantees, determinism, degenerate
  pool, buyout+reroll safety; suite 141/141.
Out-of-scope changes: none by the implementer beyond the in-scope balance-config rows.
Risks remaining: beginner floor still 12.5–20% vs 40–70% aspiration — human design decision.
```
