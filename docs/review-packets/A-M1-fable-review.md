# Fable Review — A-M1 (Engine)

**Verdict: ACCEPTED** (2026-07-06), with three review patches applied and verified in
session. M1 acceptance criteria met: goldens reproduced by the real engine, determinism
suite green, exemplar-12 live, fuzz harness delivering stats. Fable now owes the 36-item
table + named combos authored against these stats.

## Verification (re-run independently during review)

- Typecheck clean; fixture validation clean; **33/33 tests** (post-patch).
- All six golden traces reproduced exactly by `resolveOpenShop`.
- Determinism: pinned hash `3b221c8b479e0ad5` (unchanged by review patches — the fixture
  bot's trajectory doesn't cross the patched paths); 200 double-hashed replays identical.
- Perf: 0.021 ms mean resolution on the densest fixture — ~760× inside the 16 ms budget.

## Rulings (binding)

- **R-10 (economy):** Engine shape approved. `agesDaily` gains an optional `maxValue`
  clamp (additive contract change, Fable-signed) so the table can plateau aging items.
- **R-11 (skill floor):** Random bots dying at rent 1 is acceptable; random ≠ novice.
  Re-examine at the M3 fun gate.
- **R-12 (Vintage Radio):** `echoLeftmostInRow` does **not** fire when the source itself
  is the row's leftmost item. "Leftmost" stays literal; bad placement costs the effect.
- **R-13 (Antique Clock):** Confirmed — no double with zero adjacent scored items.
- **R-14 (sticky):** Confirmed — sticky blocks movement only; selling stays legal.
- **R-15 (placeholder economics):** Sell/restock/reroll numbers accepted as provisional;
  frozen with the table.
- **Mirror double-dip (noted in review):** a Mirror in an aura row copies its neighbor's
  post-aura total and is then aura'd again. Approved as designed — "copies the scoring"
  means the final total, and the mirror is a row member like any other.
- `traceId` stays `trace-${seed}` for now; revisit with Lane B before M2 integration.

## Review patches (applied + tested in session)

- **F-1 (bug, fuzz-validity):** `legalActions` offered only `placeItem` while holding an
  item — with a full shelf that's a dead end for bots and UI affordances even though
  selling is legal. Selling is now offered while holding. This *unmasked* the packet's
  fuzz truncation: bots had been silently stalling at day ~9–12, which is why 88% of
  greedy runs "hit the action cap."
- **F-2 (= R-12):** Radio self-double removed; regression test added.
- **F-3 (= R-10):** `agesDaily.maxValue` in contract + rollover clamp in engine.

## Corrected fuzz read (post-patch, 100 greedy runs, seed `m1-fable-review`)

| metric | value |
|---|---|
| days survived (med / p90 / max) | 33 / 36 / 39 |
| died at rent cycle (med / max) | 11 / 13 |
| best day total (med / p90) | 114 / 181 |
| game-over rate | **1.00** — every run eventually loses to the sawtooth |

**T-1 (tuning target for the table pass):** the sawtooth beats greedy play — good — but
at ~33 days a run overshoots the 8–15 minute session pillar by ~2×. Target: strong play
dies around rent cycle 6–8 (~day 18–24). Levers, in preference order: rent growth 1.44 →
~1.5–1.55, item-table value compression, aging caps via `maxValue`. Decide with real
table data, not exemplar data.

## Owed next

- **Fable:** 36-item table (tags, rules, upgrade graph, aging caps) + ~20 named combos,
  authored against the engine + fuzz. Exemplar ids/names stay stable; provisional
  `cheese-wheel-tier-2` gets its real definition.
- **Lane B:** M0 packet (tokens draft, component inventory, throwaway screen) — still
  owed; nothing blocks it, fixtures + goldens have been ready since the freeze.
- **Lane A:** idle until the table lands (M2 scope: full-loop polish, saves, replay UX).
