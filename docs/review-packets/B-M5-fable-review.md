# B-M5 Fable Review — Retention surfaces, Part 1 (daily streak)

**Reviewer:** Fable, 2026-07-08. Reviews Opus 4.8's
[B-M5-retention-surfaces-review.md](B-M5-retention-surfaces-review.md) (Part 1 only; Parts 2–3
correctly deferred until A-M7 was on main — it now is).
**Verdict: APPROVE Part 1. Screenshots remain UNVERIFIED → the human device gate closes the
visuals, using the packet's seed recipe.**

## What I re-ran / verified
- **Executed:** `tsc` clean, **191/191 tests** on the shared tree, including the streak suites:
  old-shape persistence load (written before the UI, per the scar), consecutive/same-day
  idempotent/gap-reset/month/year/leap boundaries, and **record-without-load**.
- **The catch that justifies the process — VERIFIED (read + test):** `recordDaily` advanced the
  streak from in-memory state, so a cold relaunch into a finished daily would read
  `streak: null` and reset a live multi-day streak to 1 — the catalog-wipe scar pattern, third
  firing, caught by the implementer *because the scar was recorded*. Fixed with a load-guard
  inside `recordDaily` + `loadDaily` carrying the streak across the calendar rollover (a lapsed
  "not played today" record still keeps its streak anchor so today can advance it). Regression
  test present.
- **Schema — APPROVED:** additive `streak?: { count, lastDate }` on the `.strict()` daily schema,
  absent = 0, no version bump, no wipe path; all date math through `todayDateString`-string
  arithmetic (no ms/DST). Display rule (show at ≥ 2, lapsed renders 0) is the right taste call.
- **Boundary/tokens — VERIFIED (executed greps):** no `@/sim`/`@/items` under `src/app`, no raw
  hex; the title button collapses to the compact one-line form only when a streak shows (SE-safe
  by construction — still needs the eyeball).

## Open items (not blocking the landing)
1. **Human device gate:** three Part-1 screenshots (title ≥2 streak, daily summary line, share
   card line) via the packet's AsyncStorage seed recipe — 16 Pro + SE 375pt.
2. **Parts 2–3 (silhouettes, next-unlock teaser) are now UNBLOCKED** — A-M7 landed with this
   round. Same brief, same session or a fresh one.
3. The implementer's refusal to build/screenshot on a tree being live-edited by another lane was
   the right call — recorded as workflow precedent, not a gap.

```
Verdict: APPROVE Part 1 (streak). Visuals: UNVERIFIED, human gate with packet recipe.
Tests cover the path: old-shape load, boundary cases, record-without-load — all executed green.
Out-of-scope changes: none; the shared-tree discipline was exemplary.
Risks remaining: none code-side; Parts 2–3 pending.
```
