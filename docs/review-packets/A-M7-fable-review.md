# A-M7 Fable Review — Unlock ladder

**Reviewer:** Fable, 2026-07-08. Reviews Codex's
[A-M7-unlock-ladder-review.md](A-M7-unlock-ladder-review.md).
**Verdict: APPROVE to land behind `UNLOCK_LADDER_ENABLED` (default OFF), with one
graduation-gating ruling the packet could not have known about (daily seeds, below).**

## What I re-ran / verified
- **Executed:** `tsc` clean, 6 fixtures validate, **191/191 tests** on the shared tree —
  including the ten unlock tests, which cover my acceptance list one-for-one: sidecar
  completeness vs the offerable pool, flag-off byte path (no `unlockedItemIds` field, full pool),
  starter-set fallback while the catalog is unloaded, the fresh-catalog drip via real greedy-bot
  merges, bot-reachability of the discovery/combo hooks, **replay-after-catalog-mutation**,
  locked-item-never-offered across fuzzed runs, full-unlock ≡ current pool, and small-pool
  buyout+reroll id-safety (the standing scar, correctly probed). 120-run ladder fuzz + assert
  re-run on my own seed (`fable-review-m7`) — green.
- **Code read — VERIFIED:** predicates read only existing persisted catalog stats (zero new
  persisted fields — zero wipe risk, as designed); the run pool is snapshotted onto additive
  optional `GameState.unlockedItemIds?` at createRun and every generation path (including the
  warm-opening replacement pool — correctly threaded) filters on the snapshot; store wiring
  respects the load-status fallback in the safe direction (starter set, never more);
  `nextUnlocks` handles the no-run-gates edge (`Math.min()` of empty → +Infinity) correctly.
- **Ladder table — APPROVED as shipped:** 16 always / 15 runsPlayed (1–20) / 2 discovery /
  3 combo; signature items stay double-gated behind `SIGNATURE_ITEMS_ENABLED`. The runsPlayed
  spine guarantees the drip even for weak players; discovery/combo hooks add texture without
  gating progress. CCR for `unlockedItemIds?` (additive, no bump): **APPROVED.**

## Graduation-gating ruling — daily seeds must pin a canonical pool
`startNewRun(dailySeedFor(date))` flows through the catalog-aware creation path, so with the
ladder ON, two players' dailies would draw from *different personal pools* — breaking the "same
shelf worldwide" invariant the daily mode and the future ghost/leaderboard moat (P3) depend on.
Not a defect in this packet (both flags are OFF and the brief didn't specify it — my omission),
but a **hard gate**: before `UNLOCK_LADDER_ENABLED` ships ON, daily-seeded runs must bypass
personal unlocks (full pool, or a canonical fixed set). Small change (branch on `isDailySeed` at
run creation); needs its own test ("two catalogs, same daily seed → identical offers").

Also carried forward: the tune-vs-stack scar — the packet's drift report is input to the final
goal-table retune when the graduating set is decided, not a standalone action.

```
Verdict: APPROVE behind UNLOCK_LADDER_ENABLED (default OFF).
Pre-fix failure ("nothing answers what do I get next run"): N/A — feature, not fix; the drip
  criterion is the positive assertion and its simulation test passes under my own suite run.
Tests cover the path: ten focused tests incl. replay integrity + leak fuzz; mutation check in
  packet (neutered filter → leak test fails).
Runtime/device verification: headless sim authoritative; Lane B surfaces (B-M5 parts 2–3) are
  the visible half and remain to be built.
Out-of-scope changes: none.
Risks remaining: daily-seed canonical pool (hard graduation gate, above); goal-table retune vs
  the final graduating set.
```
