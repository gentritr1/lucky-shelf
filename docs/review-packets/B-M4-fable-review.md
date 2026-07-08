# B-M4 Fable Review — Summary v2 retention surface

**Reviewer:** Fable, 2026-07-08. Reviews Opus 4.8's
[B-M4-summary-v2-review.md](B-M4-summary-v2-review.md).
**Verdict: APPROVE with one review-found P0 fixed in-review** (details below). Visual close-out
remains the human device gate, per the brief.

## What I re-ran / verified (not trusted from the packet)

- **Suite — VERIFIED (executed):** 141/141 green including the packet's migration load test and
  the new `summaryViews` tests; `tsc` clean (user's unrelated ShelfScene WIP stashed for the run).
- **Boundary — VERIFIED (executed):** grep for `@/sim`/`@/items` imports under `src/app/` returns
  nothing.
- **Screenshots — EYEBALLED:** record/near-miss state and the iPhone SE 375pt shot. Stat rows
  clean, star-text record marks read well, New Run present on the daily variant. Note: on SE the
  "Combos this run" row can sit below the ScrollView fold (scrollable, not truncated) — acceptable;
  flag for the device gate since the scroll indicator is hidden.
- **CCR ruling — `RunStats.closestRentMargin?`: APPROVED.** Additive optional, no version bump,
  written only on successful rent payment; packet correctly notes the pinned determinism run dies
  day 3, so the hash is untouched — VERIFIED by the pin test passing. Recorded posture: if the
  determinism fixture is ever re-pinned with a rent-surviving trajectory, this field joins the
  hash *by design* (it is real run state).
- **`CatalogStats.longestRun` with `.default(0)`: APPROVED** — old catalogs parse and backfill;
  the packet's load test proves no wipe on old-shape data.
- **Font-gate `_layout.tsx` change: accepted as out-of-scope-but-contained** (splash held until
  `useFonts` resolves, error path falls through). Device-verified by the implementer's FOUT check.

## Review-found P0, fixed during this review (by Fable, not the implementer)

**The permanent catalog was being wiped for any player who finished a run without opening the
Catalog screen that session.** `recordRunEnd` merged into the in-memory catalog, and *nothing at
boot ever loaded it* — only the catalog screen did — so the merge ran against `emptyCatalog()` and
`saveCatalog` overwrote the persisted file with just that run. **Pre-existing since the M4 merge
point, NOT introduced by B-M4** — but B-M4's personal-bests feature sits directly on it (bests
would reset every session and mark false "New record!"s), which is how review surfaced it.

- Reproduced first — CONFIRMED (executed): seeded persistence with a prior catalog (2 discoveries,
  best-day 500), recorded a run on a fresh store without loading → persisted catalog lost both
  discoveries, best-day overwritten to 121.
- Fix: `recordRunEnd` now load-guards the catalog before merging (with a re-checked runId guard
  across the await); `_layout` hydrates the catalog once at boot; `recordRunEnd` stashes the
  authoritative pre-merge stats keyed by runId, and the summary prefers that stash over its mount
  snapshot (kills the false-record edge on cold relaunch into a finished run).
- Regression tests added: `src/state/catalogStore.test.ts` (wipe survival + stash correctness);
  both fail against the pre-fix store and pass now.

```
Verdict: APPROVE (with the P0 above fixed in-review).
Pre-fix failure reproduced: yes — executed repro, prior catalog destroyed on disk.
Fix verified against original scenario: executed — same repro now preserves + merges (test).
Tests added: catalogStore.test.ts covers the exact failing path (record without load).
Runtime/device verification: headless for store logic; visuals remain the human device gate.
Out-of-scope changes by implementer: font gate (accepted, noted above).
Risks remaining: cold-relaunch first-frames may briefly show mount-snapshot bests before the
  stash lands (cosmetic, self-correcting); device gate to confirm the SE fold behavior.
```
