# B-M5 Retention surfaces — review packet (Part 1: daily streak)

**Implementer:** Opus 4.8 (Claude Code session). **Date:** 2026-07-08.
**Base:** `main` @ `29909fe`. **Reviewers:** Fable + the human device gate (visuals). **No self-sign-off.**

## Scope shipped this pass — Part 1 only (daily streak)

Per the brief's sequencing, **Part 1 (daily streak) is done**; **Parts 2–3 (catalog silhouettes,
next-unlock teaser) are NOT started** because they consume Lane A's A-M7 unlock module and **A-M7
has not landed on `main`** (see "Tree state" below). Part 1 is independent and additive — no flag.

### Files (mine only)
- `src/persistence/daily.ts` — additive `streak?` schema field + pure date/streak helpers.
- `src/persistence/daily.test.ts` — old-shape (pre-streak) load test + streak-math + boundary tests.
- `src/state/dailyStore.ts` — carry streak across day rollover; **load-guarded** `recordDaily`.
- `src/state/dailyStore.test.ts` (new) — store-level streak + **record-without-load** regression.
- `src/app/index.tsx` — title daily button shows `· 🔥 N` when the live streak ≥ 2.
- `src/app/summary.tsx` — daily summary gains one streak line.
- `src/app/share.tsx` — share card gains one streak line.

## Built vs. acceptance criteria

| Criterion | Status | Evidence |
|---|---|---|
| 1. `pnpm typecheck` green | ✅ (my files) | `tsc --noEmit` — zero errors in my files. See note on tree churn. |
| 1. Full suite green | ✅ | `vitest run` → **27 files, 179 tests passed**. |
| 1. Old-shape daily load, zero loss, **test written first** | ✅ | `daily.test.ts` "loads a pre-streak (old-shape) record with zero data loss" + `dailyStore.test.ts` "loads an old-shape … streak null". Written before any UI edit. |
| 1. Streak math: consecutive / same-day idempotent / gap reset / month & year boundary | ✅ | `advanceStreak` suite: consecutive (+1), same-day (unchanged), gap (→1), month `02-28→03-01`, year `12-31→01-01`; plus `previousDateString` leap-day `2028-03-01→2028-02-29`. All via `todayDateString` strings. |
| 2. Seeded sim screenshots (title / summary / share streak line) | ⏳ **UNVERIFIED — human device gate** | Native build is historically broken here (memory `device-feel-gate-round1`) **and** the working tree is being actively mutated by Lane A's in-flight A-M7 (see below), so no isolated build is possible right now. Deterministic seed recipe below. |
| 2. Catalog silhouette / flag-off byte-identical shots | ➖ N/A this pass | Part 2/3 — gated on A-M7 landing on `main`. |
| 3. Boundary greps clean (`@/sim`/`@/items` under `src/app`) | ✅ | `grep -rn '@/sim\|@/items…' src/app/` → CLEAN. |
| 3. Tokens only, no raw hex | ✅ | `grep -nE '#[0-9a-fA-F]{3,6}'` over my 5 changed source files → none. New share-card line uses `AppText`. |
| 3. Tap targets ≥ 44×44pt; no truncation at 375pt | ✅ (logic) / ⏳ (pixels) | No new tap targets — streak is inline in an existing `WoodButton` label (min-height = `touch.minTargetPt`) and in inline text. Labels kept compact (see design note) so they stay one line; `WoodButton` wraps (never ellipsizes) as a backstop. Final pixel check = device gate. |

## Commands & outputs

```
$ npx tsc --noEmit            # my files: MY FILES CLEAN (zero errors)
$ npx vitest run              # Test Files 27 passed (27) / Tests 179 passed (179)
$ npx vitest run src/persistence/daily.test.ts src/state/dailyStore.test.ts
                              # Test Files 2 passed (2) / Tests 25 passed (25)
$ grep -rn '@/sim|@/items|../sim|../items' src/app/     # CLEAN
$ grep -nE '#[0-9a-fA-F]{3,6}' <my 5 source files>      # NO RAW HEX
```

## Daily-persistence migration note + the load test

**Migration = purely additive.** `DailyRecordSchema` gains `streak: DailyStreakSchema.optional()`.
Because the schema is `.strict()`, "strict" only rejects *unknown* keys — a **missing optional key
still parses**, so the current shipping shape (`{schemaVersion, date, result}`, no `streak`) loads
loss-free (`streak` reads `undefined` → treated as no streak). New writes always include `streak`.
**No schema-version bump, no wipe risk, determinism pin untouched** (daily save is separate from the
sim trajectory pin). The old-shape load test was written **before** any UI, per the catalog-wipe scar:

```ts
// src/persistence/daily.test.ts
it('loads a pre-streak (old-shape) record with zero data loss', async () => {
  const oldShape = JSON.stringify({ schemaVersion: 1, date: '2026-07-07',
    result: { daysSurvived: 9, coinsEarned: 300, deepestRentSurvived: 3, bestDayTotal: 60, combosThisRun: 2 } });
  const p = createDailyPersistence(memoryStorage({ [DailySaveKey]: oldShape }));
  const loaded = await p.loadDaily();
  expect(loaded?.result.daysSurvived).toBe(9);
  expect(loaded?.streak).toBeUndefined();
});
```

**Catalog-wipe scar, applied to the streak (the key design decision).** `recordDaily` advances the
streak from the store's in-memory `streak`. If a daily run ends on a **cold store that was never
`loadDaily()`'d** (e.g. cold relaunch straight into a finished run), the in-memory streak is `null`
and the streak would reset to 1 — silently wiping a live multi-day streak. Fix: `recordDaily`
**load-guards** (`if (!get().loaded) await get().loadDaily()`) before advancing, and `loadDaily`
carries the persisted streak forward **even when the record is from a prior day** (a new calendar
day reads "not played today" but the streak must still be there to increment). Regression test:

```ts
// src/state/dailyStore.test.ts — "does not wipe a live streak when recording before the store is loaded"
// Seeds a persisted streak {count:6, lastDate:'2026-07-07'}, then calls recordDaily on a NEVER-loaded
// store with today='2026-07-08' → expects streak {count:7, lastDate:'2026-07-08'} (not reset to 1),
// and the persisted record to match.
```

## Streak semantics (for the reviewer)

- **Persisted** `streak = {count, lastDate}`; `lastDate` is always a `todayDateString()` value.
- **Advance** (on record): no prior → 1; `lastDate == today` → unchanged; `lastDate == yesterday` →
  +1; else → 1. "Yesterday" = `previousDateString()` (local `Date` calendar normalisation, no ms
  math → no DST drift; handles month/year/leap boundaries).
- **Display** (`displayStreakCount`): the stored count while the streak is live (last played today
  **or** yesterday), else **0** — a lapsed streak reads as broken until the next play. Surfaces show
  it only at **≥ 2**, so a streak of 1 never renders and "🔥 2" appears exactly when earned.
- Title label design: with a live streak the button uses the compact `Daily ✓ · 🔥 4` /
  `Daily Shelf · 🔥 4` (matches the brief's example and stays one line on SE); without a streak the
  fuller `Daily ✓ — View Card` copy is unchanged.

## Screenshot seed recipe (for the human device gate)

AsyncStorage key: **`luckyShelf:daily:v1`** (seed per memory `ios-ui-verify-on-simulator`; dates
below assume "today" = 2026-07-08 — substitute the sim's real today/yesterday).

1. **Title with a live streak** (shows `Daily ✓ · 🔥 4`): seed
   `{"schemaVersion":1,"date":"2026-07-08","result":{"daysSurvived":9,"coinsEarned":300,"deepestRentSurvived":3,"bestDayTotal":60,"combosThisRun":2},"streak":{"count":4,"lastDate":"2026-07-08"}}`
   → launch → title daily button. (Not-played variant `Daily Shelf · 🔥 4`: set `date`/`lastDate`
   to **yesterday** `2026-07-07`.)
2. **Summary + share streak line** (`🔥 4-day daily streak` / `🔥 4-DAY STREAK`): seed a streak of 3
   from **yesterday** — `"streak":{"count":3,"lastDate":"2026-07-07"}`, `date:"2026-07-07"` — then
   **play today's daily to completion**; the run-end record advances it to 4 and both surfaces show it.
- Capture on **iPhone 16 Pro** and **iPhone SE (375pt)**; confirm no wrap/truncation of the daily
  button label and the streak lines on SE.

## Tree state — IMPORTANT for whoever lands this

The working tree is **not clean and is being actively modified by Lane A's in-flight A-M7 unlock
ladder** (untracked `src/sim/unlocks.ts`, `unlocks.test.ts`; modified `src/sim/*`,
`src/contracts/index.ts`, `src/state/store.ts`, `scripts/fuzz.ts`). Observed live: `tsc` reported an
error in `unlocks.test.ts`, then reported clean ~60s later — A-M7 is mid-edit in this shared
checkout. **I did not commit** — committing here would sweep up Lane A's uncommitted work. My Part-1
files are listed above; land them as an isolated set. A-M7 is **not on `main`**, so Parts 2–3 of this
brief remain correctly deferred.

## Known issues / open gaps
- **Visuals UNVERIFIED** — no screenshots captured (device gate + unstable tree). Seed recipe above.
- **Parts 2–3 pending A-M7 on `main`.** Ready to resume once it lands; they add a `unlockLadderView`
  store view-model and are `UNLOCK_LADDER_ENABLED`-gated (flag-off catalog byte-identical).
- Minor: on a consecutive-day play, the summary streak line briefly shows the pre-increment count
  (N) on first paint, then re-renders to N+1 after the record effect. Ends correct; no action needed.

## STOP
Part 1 implemented and headlessly green. **STOP — Fable reviews; the human device gate closes the
visuals** (seed recipe above). Parts 2–3 resume when A-M7 lands on `main`.
