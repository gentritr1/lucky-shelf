# A-M6a Fable Review — Shelf Expansion coin sink

**Reviewer:** Fable (design/balance authority), 2026-07-08. Reviews Codex's
[A-M6a-shelf-expansion-review.md](A-M6a-shelf-expansion-review.md).
**Verdict: APPROVE to land behind `SHELF_EXPANSION_ENABLED` (default OFF).**

## What I re-ran (not trusted from the packet)

- **OFF floor — VERIFIED (executed):** `tsc --noEmit` clean¹, 6 M0 fixtures validate, full suite
  green, determinism pin `8d48e1c5a6ad14c9` intact (pin test in suite). ¹Typecheck run with the
  user's unrelated in-progress `ShelfScene.tsx` edit stashed — that WIP references a not-yet-written
  style and is outside this packet.
- **Sink works — CONFIRMED (executed, independent seed `fable-review-m6a`, 120-run same-seed A/B):**
  day-9 median surplus 6.4–6.7× → **2.5–2.6×**; day-12 7.3–7.4× → **3.2–3.3×** (≤ 3.5 criterion
  met); expansionRunRate **0.90 greedy / 0.88 combo** (≥ 0.5 criterion met). Reproduces the
  packet's numbers on a seed the implementer never saw.
- **Guardrails — VERIFIED (executed):** `scripts/balance.ts --assert-bands` exit 0 on the combined
  tree (run length, build swing 1.33–1.43×).
- **Code read — VERIFIED:** additive `expandShelf` action (strict, no version bump); engine effect
  is RNG-free and appends row-major slots; `canExpandShelf` gates flag/phase/held/rows/coins
  identically in engine and uiAffordances; **spotlight rollover uses live `next.shelf.size`**
  (engine.ts) so expanded boards get row-3 spotlights deterministically — the interaction I
  specifically probed for.
- **Degenerate probes present — VERIFIED (read + suite):** exact-cost, second-expansion throw,
  held-item throw, flag-off throw, JSON round-trip, buyout+reroll-after-expansion.

## Findings (do not block landing; DO gate graduation)
1. **Goal-table drift, third occurrence of the scar.** With expansion ON the extra 4 slots lift
   late totals; my seed puts greedy days-9–12 goal hit at **0.855** (combo 0.797) — at/over the
   0.85 band top (packet's seed: 0.807). Rule stands: `GOAL_LADDER_TARGETS` must be re-tuned
   against the FINAL graduating flag set, which now includes expansion. Do not graduate the ladder
   and expansion together on today's table.
2. **Signature dominance wants an equal-n re-probe at graduation.** Natural-pickup dominance reads
   1.5–1.73 (n≈36; below the 2× line, and the equal-n=3000 probe stays authoritative), but
   expansion changes the environment signatures live in (more slots, ~31% pickup) — re-run the
   forced-seeding probe with expansion ON before flag-on ships.
3. **Lane B dependency:** `ShelfScene`/screens must render 4 rows before this flag can ship ON.
4. Cost 250 approved (150 measurably failed the sink target — packet's tuning evidence is sound).

```
Verdict: APPROVE behind SHELF_EXPANSION_ENABLED (default OFF).
Pre-fix failure (the 7x surplus): reproduced on my own seed's OFF arm (6.4–7.4x).
Fix verified against original scenario: executed — same-seed A/B, surplus 7.3x → 3.2x day 12.
Tests cover the path: packet's mutation check + degenerate probes; suite green at 141.
Runtime verification: headless sim (authoritative for Lane A); UI rendering explicitly deferred.
Out-of-scope changes: index.tsx nullable-sprite narrowing (accepted — required for tsc);
  TAG_SYNERGY_ENABLED stray local flip correctly restored to false by the implementer.
Risks remaining: findings 1–3 above, all graduation-gated.
```
