# A-M5d Fable-stand-in Review — Daily Goal Ladder (Phase 3)

**Reviewer:** Opus orchestrator (Fable unavailable; see project memory `reviewer-workflow-opus-split`).
Reviews Codex's Phase 3 ([A-M5d-goal-ladder-review.md](A-M5d-goal-ladder-review.md)).
**This is a stand-in verdict — real Fable sign-off is still REQUIRED before the flag graduates.**
**Verdict: APPROVE to land behind `GOAL_LADDER_ENABLED`** (default off).

## What I re-ran (not trusted from the packet)
- **OFF path byte-identical — VERIFIED (executed):** determinism pin unchanged `8d48e1c5a6ad14c9`;
  6 M0 fixtures validated; `tsc` clean; 101 tests green. OFF is gated by construction —
  `goalLadderEnabled()` requires `LOOP_V2` too, `createRun` doesn't add the goal fields when off, and
  `freeRerollTokens()` returns 0 (reroll charges coins exactly as before).
- **The scar (target must cap below the yield plateau) — VERIFIED (executed):** live
  `GOAL_LADDER_TARGETS = [16,24,34,39,49,59,62,68,72,74]`, cap **74** for day ≥10. My earlier v2 yield
  trace put the day-8+ plateau at **median ~89 / p25 ~77**, so 74 sits *below* the p25 — the late-game
  target stays beatable, not the unfillable-goal trap.
- **Late-day hit rate — CONFIRMED (executed, my own 800-run ON fuzz, independent seed
  `rev-goal-independent`):** greedy days 9–12 **0.746**, combo **0.769** (per-day 9–12: greedy
  0.736/0.726/0.753/0.771, combo 0.753/0.750/0.777/0.796); overall greedy 0.791 / combo 0.808; random
  0.001. **All inside the 65–85% band across the whole curve, including the late plateau** — reproduces
  Codex's numbers on a different seed. **Game-over rate stayed 1.000**, so the free-reroll reward does
  not flatten the rent wall.
- **Contract additive — VERIFIED (executed):** `dailyTarget?`, `dailyTargetResult?` (new
  `DailyTargetResultSchema`), `freeRerollTokens?` — all optional; **no `ContractSchemaVersion` bump**;
  `contracts.test.ts` covers parse; 6 M0 fixtures still validate.
- **Reward semantics — VERIFIED (read + tests):** token is 0/1 (a hit sets 1, a miss clears stale
  state — does not accumulate); `reroll` spends the free token *before* coins; `legalActions` exposes
  reroll on free-token-or-coins. Existing `Action` surface unchanged.
- **Tests cover the path — VERIFIED (executed):** forcing `targetMet` to never fire failed 2
  goal-ladder tests (grant + consume-token) → restored → green. Not tautological.

## Findings / open questions for real Fable (do NOT block landing behind the flag; DO gate graduation)
1. **Targets were tuned UP from the brief's starting values** `[15..62]` → `[16,24,34,39,49,59,62,68,72,74]`
   because the originals gave ~90% late hit (too easy). Legitimate fuzz-tuning; I re-verified the new
   table lands in-band. **Approve the tuned table + the day-10 cap of 74.**
2. **Confirm reward semantics:** one next-shop free reroll, token 0/1 (not accumulating), spent before
   coins.
3. **Lane B question (Codex's):** keep `freeRerollTokens` as a visible count, or expose as boolean
   since it's currently capped at 1? (Recommend keeping the int for forward-compat.)

## Verdict block
```
Verdict: APPROVE to land behind GOAL_LADDER_ENABLED (default off; requires LOOP_V2). Stand-in only.
OFF byte-identical: VERIFIED (executed) — pin 8d48e1c5a6ad14c9, fixtures, tsc, 101 tests; gated by flags.
Scar (target caps below plateau): VERIFIED — cap 74 < p25 ~77 < median ~89 (traced v2 yield).
Late-day hit rate in-band: CONFIRMED (executed) — independent 800-run fuzz, greedy 0.746 / combo 0.769
  days 9-12, overall 0.79/0.81, random 0.001, game-over 1.000.
Additive contract: VERIFIED (executed) — 3 optional fields + DailyTargetResultSchema, no version bump.
Reward semantics: VERIFIED — token 0/1, spent before coins; Action surface unchanged.
Tests cover the path: VERIFIED (executed) — forcing targetMet off fails 2 goal-ladder tests.
Out-of-scope: none — Lane A only (economy/contracts/engine/bots/fuzz + tests).
Graduation gates (before flag-on ships): (a) real Fable sign-off on the additive-fields CCR + the tuned
  target table/cap + reward semantics; (b) device feel-gate.
```

**STOP — flag stays OFF-reversible until the graduation gates clear.**
