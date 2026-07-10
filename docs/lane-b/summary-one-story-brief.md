# B-M12 — Summary "one story" pass (Gate 1.4 of RELEASE-PLAN.md)

_Lane B brief. Implementer: Opus 4.8. Reviewer: Fable. 2026-07-10._

## Context (self-contained)
Lucky Shelf's run summary (`src/app/summary.tsx`) ends every run with a header
"RENT MISSED / Day N". A few lines below it, the B-M4 near-miss stat renders
"Paid rent with N coins to spare" — that stat is `runStats.closestRentMargin`,
the tightest *successful* rent payment from an EARLIER cycle of the same run
(view model: `nearMissView` in `src/state/store.ts:311`). On one screen the
player reads "you missed rent" and "you paid rent" with no cycle context — an
external critique (2026-07-10) flagged this as the summary telling two
conflicting stories.

The summary's target narrative order (top → bottom): why the run ended → what
build emerged → the near-miss drama → stats/bests → next reason to play
(next-unlock teaser). Most pieces already exist; this is a copy + ordering
pass, not a feature.

## Task
1. **Fix the contradiction**: relabel the near-miss line so it cannot read as
   describing the final day. Use `Closest rent payment: {N} coins to spare`
   (keep the existing `plural()` helper for the coin count). Do not add new
   data fields to make this work — the label change alone resolves it.
2. **One-story audit**: check the render order in `summary.tsx` against the
   narrative order above and fix any element that's out of order or reads
   ambiguously, USING ONLY data already available on the screen (gameState,
   existing view models). Small copy edits are in scope; new view models are
   not, with one exception: if a one-line change inside an existing view model
   (e.g. `nearMissView`) improves label clarity, that's fine — with a unit test.

## Non-goals (hard boundaries)
- NO changes to `src/sim/`, `src/contracts/`, `src/items/` — no engine, no
  persistence, no new runStats fields.
- NO receipt-cascade UI surface (that's a separate device-gated Lane B item).
- NO layout/theming rework: the screen was just migrated to runtime theming
  (`useThemedStyles`/`usePalette`, commit `cdba62a`) — keep that pattern
  exactly; do not reintroduce static StyleSheets.
- NO new dependencies, no navigation changes.

## Acceptance criteria (observable)
- The string "Paid rent with" no longer appears in `src/app/summary.tsx`; the
  near-miss line reads "Closest rent payment: …" (or names the cycle/day
  explicitly if you find a cleaner phrasing — but it must be impossible to
  read as the final day's outcome).
- Render order in `summary.tsx` matches the narrative order above.
- `npx vitest run` fully green (was 291 passing) on node 20.19.4 — the repo
  shell may default to an older node; check `node --version` first.
- `npx tsc --noEmit` clean.
- Any view-model logic change carries a unit test in the matching `.test.ts`.
- Diff touches ONLY `src/app/summary.tsx`, optionally `src/state/store.ts`
  (+ its test). Anything else = out of scope, will be flagged at review.

## Verification method at review (what Fable will run)
- `git diff --stat` scope check against the file list above.
- `npx vitest run` + `npx tsc --noEmit` re-run independently.
- Read of the final render order vs the narrative order.
- Device screenshot is NOT required now — it lands in the Gate 2 batched
  device pass (deliberately deferred).
