# Lane B brief — B-M5: Retention surfaces — daily streak, unlock silhouettes, next-unlock teaser

**Author:** Fable, 2026-07-08. **Implementer:** Opus 4.8 (Claude Code session).
**Sequencing:** Part 1 (streak) is independent — start now. Parts 2–3 consume Lane A's A-M7
unlock module — start them only after A-M7 lands on main.
**Review:** Fable + the human device gate for visuals. No self-sign-off.

## Context (self-sufficient)

Expo/RN app; screens `src/app/*.tsx`; kit + tokens in `src/ui` (AppText, tokens only — no raw
hex/Text); screens consume store view-models only (never import `@/sim`/`@/items` in `src/app`).
Verify on the iOS simulator with seeded screenshots (memory `ios-ui-verify-on-simulator`);
headless: `pnpm typecheck && pnpm test`.

Facts verified against live code:
- `dailyStore` (`src/state/dailyStore.ts`) persists only TODAY's `{date, playedToday, result}` —
  **a streak is NOT derivable from history.** It needs an additive persisted field.
- Catalog wipe scar (`docs/review-packets/B-M4-fable-review.md`): any record path that merges
  and saves a lazily-loaded store must load-guard inside the method and ship a
  record-without-load regression test (`src/state/catalogStore.test.ts` is the template).

## Part 1 — Daily streak (independent, start now)
- Extend the daily persistence with an additive `streak?: { count: number; lastDate: string }`
  (absent = 0 — old saves load loss-free; **write the old-shape load test BEFORE the UI**, per
  the scar). `recordDaily` updates it: consecutive-calendar-day (lastDate == yesterday → +1;
  lastDate == today → unchanged; else reset to 1). Timezone rule: reuse `todayDateString()`
  exactly — no new date math.
- Surfaces: title-screen daily button shows the streak when ≥ 2 ("Daily ✓ · 🔥 4"); daily summary
  and the share card gain one streak line. Tokens only; SE-width safe.

## Part 2 — Catalog silhouettes (after A-M7)
- Locked items render as silhouettes in the catalog album with their unlock hint ("Reach 6 runs",
  "Discover the Ice Box") — data from A-M7's `unlockedItemIds`/`nextUnlocks` via a store
  view-model you add (`unlockLadderView`); flag-gated exactly like the sim
  (`UNLOCK_LADDER_ENABLED` off → today's catalog rendering byte-identical).
- Silhouette treatment: existing sprite tinted to a dark shape on the standard card (no new art).
  Undiscovered-but-unlocked items keep today's "?" treatment — locked ≠ undiscovered; the two
  states must read differently.

## Part 3 — "Next unlock" teaser on the run summary (after A-M7)
- One row under the personal bests: nearest locked item (silhouette thumb + hint), from
  `nextUnlocks`. Omitted entirely when the flag is off or the pool is exhausted. This is the
  single strongest "one more run" prompt the roadmap has — keep it quiet and warm, not a popup.

## Non-goals
No sim/economy changes; no unlock predicate logic in Lane B (consume the module); no new
navigation; no notification/reminder systems; no flag graduations.

## Acceptance criteria
1. `pnpm typecheck` + full suite green; old-shape daily persistence loads with zero data loss
   (test written first); streak math unit-tested (consecutive, same-day idempotent, gap reset,
   month/year boundaries via `todayDateString` strings).
2. Seeded simulator screenshots (16 Pro + iPhone SE 375pt): (a) title with a ≥2 streak,
   (b) daily summary + share card with the streak line, (c) catalog showing locked-silhouette vs
   undiscovered-"?" vs unlocked side by side, (d) summary with the next-unlock teaser, and one
   flag-off catalog shot proving byte-identical rendering.
3. Boundary greps clean; tokens only; tap targets ≥ 44×44pt; no truncation at 375pt.

## Deliverable
`docs/review-packets/B-M5-retention-surfaces-review.md`: built vs criteria, commands + outputs,
screenshots, the daily-persistence migration note + load test, known issues, STOP line.
**STOP — Fable reviews; visuals close on the human device gate.**
