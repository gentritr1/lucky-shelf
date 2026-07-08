# B-M4 review packet — Summary v2 + flow fixes (retention quick wins)

**Implementer:** Opus 4.8 (Claude Code session), 2026-07-08.
**Reviewer:** Fable (against the acceptance criteria + these simulator screenshots).
**Final visual authority:** the human device feel-gate.
**Brief:** [docs/lane-b/summary-v2-retention-brief.md](../lane-b/summary-v2-retention-brief.md).

> **STOP — I do not self-approve.** Fable reviews; the visual close-out belongs to
> the human device gate. This packet reports built-vs-criteria with evidence.

---

## 1. What was built (per work item)

| # | Item | File(s) | Status |
|---|------|---------|--------|
| 1 | Daily summary gets a **New Run** secondary button | `src/app/summary.tsx` | ✅ |
| 2 | **Best day** renders via `CoinCounter` (not `{n}c`) | `src/app/summary.tsx` | ✅ (folded into the personal-best rows) |
| 3 | **Personal bests + "New record!"** (persisted, additive) | `src/contracts/index.ts`, `src/persistence/catalog.ts`, `src/state/catalogStore.ts`, `src/app/summary.tsx` | ✅ |
| 4 | **Build-identity recap** line (synergy-gated) | `src/state/store.ts` (existing `buildIdentityView`), `src/app/summary.tsx` | ✅ |
| 5 | **Near-miss drama** line (≤ 5 coins to spare) | `src/contracts/index.ts`, `src/sim/engine.ts`, `src/state/store.ts`, `src/app/summary.tsx` | ✅ (CCR path — see §4) |

### Design decisions inside the brief's latitude
- **Personal-best rows** (`personalBestsView` in `catalogStore.ts`) show the three
  tracked bests: **Best day** (coin pill), **Longest run** (`Nd`), **Deepest rent**
  (`N`). Each row shows this run's value with either a gold **★ New record!** pill
  (beaten) or a faint **Best N** caption (not beaten). `isRecord` is *strictly greater*,
  so a tie is not celebrated and a `0` (e.g. died before first rent) never reads as a record.
- **Combos count**: the build-recap line carries the combos count when a build is
  present; when the recap is omitted (synergy off / no build), a standalone
  **Combos this run** row shows it instead — so combos appear exactly once, never lost.
- **`ScrollView` body**: the summary body scrolls, so the tallest state (records +
  near-miss) cannot truncate or overlap on short screens; actions stay pinned.
- **Record accent** (`RecordAccent`) pops in with the `overshoot` easing and snaps
  flat under reduced-motion (`useReducedMotion`), matching the juice-pass vocabulary.

---

## 2. Migration posture (persisted personal bests) — **additive, no wipe, no version bump**

Item 3 adds **one** persisted field: `CatalogStats.longestRun`. `bestDayTotal` and
`deepestRentSurvived` already persisted.

- **Schema**: `longestRun: nonNegativeIntSchema.default(0)` in `CatalogStatsSchema`
  (`src/contracts/index.ts`). `.default(0)` makes it **optional on load** — an older
  persisted catalog whose `stats` object omits `longestRun` still parses (Zod fills 0);
  it does **not** fall to the corrupt/version-mismatch path, so **no existing catalog
  data is wiped**. `CatalogSchemaVersion` and `CatalogSaveSchemaVersion` are **unchanged (1)**.
- **Semantics**: absent = unknown history → 0, then rebuilt by `Math.max(prev, daysSurvived)`
  on the next recorded run (`mergeRunIntoCatalog`). Matches the brief's "absent = derive
  from this run; never wipe".
- **Determinism/goldens**: the catalog is not part of the hashed `GameState`, so this
  field cannot touch the determinism pin or the M0 goldens.
- **Load test written BEFORE the UI** (`src/persistence/catalog.test.ts`):
  `"loads a pre-B-M4 catalog (stats without longestRun) without data loss"` feeds a
  hand-built legacy save (schemaVersion 1, `stats` with **no** `longestRun`) and asserts
  `status === 'loaded'`, every existing field preserved, `longestRun === 0`. Plus
  `"advances longestRun to the max daysSurvived across recorded runs"`.

---

## 3. Boundary + kit compliance

- **No new `@/sim` / `@/items` imports in `src/app/**`** — grep proof:
  ```
  $ grep -rnE "from '@/(sim|items)'|from '\.\./(sim|items)'|from '\.\./\.\./(sim|items)'" src/app
  (no matches)
  ```
  New data the screen needs is served by store view-models: `personalBestsView`
  (`catalogStore.ts`), `buildIdentityView` + `nearMissView` (`store.ts`).
- **No raw hex, no raw `<Text>` in `summary.tsx`** — grep proof:
  ```
  $ grep -nE "#[0-9a-fA-F]{3,6}|<Text[ >]|</Text>" src/app/summary.tsx
  (no matches)
  ```
  All colors/spacing/radii from `src/ui` tokens; all text via `AppText`/`CoinCounter`;
  the record pill uses `palette.goldDeep` + `radii.pill` + `borders.regular`.
- **Reduced motion** respected: `RecordAccent` reads `useReducedMotion()` and snaps.

---

## 4. Item 5 CCR for Fable — `RunStats.closestRentMargin`

I chose the **additive-contract-field** path (not the store-derivation fallback),
because the "closest rent margin across the whole run" cannot be reconstructed at
summary time from the store (it only holds the *last* day's trace and the terminal
state, not per-rent-cycle coin history).

**Change:** `RunStatsSchema` gains `closestRentMargin: nonNegativeIntSchema.optional()`
(`src/contracts/index.ts`). The engine writes it at the successful-rent-payment site
(`src/sim/engine.ts`), tracking `Math.min` of coins-left-after-rent across the run.
`nearMissView` (`store.ts`) surfaces it only when `≤ NEAR_MISS_MARGIN` (5).

**Why this is save- and pin-safe (please rule):**
- **Optional** → older saves/fixtures that omit it still parse. **No `ContractSchemaVersion` bump.**
- **Only written on a *successful* rent payment.** The M0 goldens hash scoring *traces*
  (not `runStats`), so they are structurally unaffected. The determinism-fixture run
  (`playRun('determinism-fixture','random',deps,60)`) reaches `gameOver` on **day 3
  before any successful payment** (`deepestRentSurvived: 0`, verified by probe), so the
  field stays `undefined` there and `stableStringify` drops it — **pin `8d48e1c5a6ad14c9`
  unchanged** (verified: determinism test green, inline snapshot unchanged).
- **Residual risk to flag:** the pin's safety currently rests on the pinned fixture
  dying before paying rent. If Fable ever re-pins with a *rent-surviving* fixture, this
  field would then participate in that hash (deterministically). Acceptable, but calling
  it out so a future re-pin is a conscious step, not a surprise.

---

## 5. Commands + outputs

Toolchain: `nvm use 23.3.0`; vitest/tsc run without `NODE_OPTIONS`.

```
$ npx tsc --noEmit -p tsconfig.json
(clean — exit 0)

$ npx vitest run
 Test Files  22 passed (22)
      Tests  132 passed (132)
```
(118 pre-existing + my new: 2 catalog migration/merge tests, 7 summary-view tests, plus
concurrent Lane A tests present in the same tree.)

**Determinism pin held** — `src/sim/determinism.test.ts` passed with its inline snapshot
`"8d48e1c5a6ad14c9"` (the test fails if the value shifts). **M0 goldens** (`goldens.test.ts`)
green.

New/changed tests exercising the B-M4 paths:
- `src/persistence/catalog.test.ts` — legacy-catalog load (no `longestRun`) → no data loss;
  `longestRun` advances on the max `daysSurvived`.
- `src/state/summaryViews.test.ts` — `personalBestsView` record/tie/zero logic;
  `nearMissView` null-when-absent, null-above-threshold, present-at/below-threshold, 0-coin.

---

## 6. Seeded simulator screenshots (acceptance criterion 2 + 3)

Verified on the **iOS simulator** (web preview cannot reach these screens). Captured via
the simctl seed→screenshot loop; the seed harness (`src/_verifySeed.ts` + a temporary
`<Redirect>` in `index.tsx`) was **fully removed** after capture (`grep -rn "TEMP-VERIFY"
src` → clean; `index.tsx` runtime re-verified showing the normal title — `title_check`).

| Criterion | Device | Shot | Shows |
|-----------|--------|------|-------|
| 2(a) non-daily, bests shown, no record | iPhone 16 Pro (393pt) | `B-M4-screens/a-nondaily-bests-no-record.png` | Best day 44 (CoinCounter) / Best 120; Longest run 8d / Best 15d; Deepest rent 2 / Best 5. No record pills, no near-miss. Also = the **build-recap-absent** half of 2(d) (v1). |
| 2(b) ≥1 "New record!" | iPhone 16 Pro | `B-M4-screens/b-new-record-and-near-miss.png` | ★ New record! ×3 + near-miss "Paid rent with 3 coins to spare". |
| 2(c) daily New Run button | iPhone 16 Pro | `B-M4-screens/c-daily-new-run-button.png` | Daily variant: Share Card (primary) / **New Run** / Catalog. |
| 2(d) build recap present | iPhone 16 Pro (TAG_SYNERGY on) | `B-M4-screens/d-build-recap-synergy-on.png` | "🍎 Food build · 2 combos" recap; standalone combos row correctly suppressed. |
| 3 SE-class width, no truncation/overlap | iPhone SE 3rd gen (375×667) | `B-M4-screens/se3-scenario-b-375pt.png` | Busiest state (records + near-miss): all rows + all three ★ pills fully visible, no horizontal truncation/overlap; buttons ≥44pt. |

Screenshot 2(d) required `TAG_SYNERGY_ENABLED` flipped on **only for that capture**; it is
back to `false` (shipping default) — grep confirms. The screenshot proves the recap
renders when the flag graduates.

---

## 7. Known issues / caveats

- **`prevStats` capture vs. catalog load race**: the summary freezes the standing bests at
  mount via `useCatalogStore.getState().catalog.stats`. The catalog is loaded at app boot
  (title), so by summary time it is loaded; if a cold session somehow reached summary before
  `loadCatalog` resolved, bests would read from the empty catalog (everything a record) —
  which is also *correct* for a genuine first run. Low-risk; noted for completeness.
- **Item 5 CCR** (§4) needs Fable's ruling on the contract field + the re-pin note.
- The working tree also contains **concurrent A-M6a (shelf-expansion) edits** by Lane A
  (`scripts/fuzz.ts`, `balanceHarness.ts`, `bots.ts`, `economy.ts`, `sim/index.ts`,
  `uiAffordances.ts`, `contracts.test.ts`, and parts of `engine.ts`). Those are **not mine**;
  my B-M4 diff is `summary.tsx`, `contracts/index.ts` (2 additive fields), `catalog.ts` +
  `catalog.test.ts`, `catalogStore.ts`, `store.ts`, `summaryViews.test.ts`, and the
  `closestRentMargin` block in `engine.ts`.

## 8. Device feel-gate iteration (human pass, 2026-07-08)

The human gate flagged three visual issues on device; all fixed and re-verified on the sim:

1. **"New record!" looked heavy** — it was a bordered gold pill stacked under the coin
   pill (two boxes). Redesigned to **light gold ★ star-text, no box** (`RecordAccent` in
   `summary.tsx`), so it reads as a celebratory caption in the same slot as the "Best N"
   caption. Pop animation + reduced-motion behaviour unchanged. (Updated shots: `b-…`, `se3-…`.)
2. **Coin digit sat a hair low** in the pill against the 18px dot — the shared
   `baloo2IconNudge` (+2) overshot for this size. Trimmed to **+1 on iOS for the pill
   only** (`CoinCounter.amount`); the slam variant keeps the helper value. Verified with a
   zoomed crop — digit now reads dead-centre. **Scope note:** the pill is the shared HUD
   coin chip, so this 1px improvement applies app-wide (same 18px-dot/20px-digit geometry);
   eyeballed on the summary pill, geometrically identical everywhere.
3. **Wordmark rendered in the system fallback on first launch** (FOUT) — `useFonts`
   rendered before Baloo 2 loaded, so "Lucky Shelf" flashed a wrong face and only corrected
   after a re-render/navigation. Fixed in `_layout.tsx`: hold the native splash
   (`SplashScreen.preventAutoHideAsync`) and **gate the first render on `fontsLoaded`**
   (`return null` until ready; `fontError` still lets the app through as a fail-safe). Cold
   relaunch now paints the title in Baloo 2 from the first frame — verified (`title_early`,
   `title_after_font`), no blank hang. **Scope note:** this touches the root layout (beyond
   the five B-M4 items) — a small, contained retention/polish fix; flagging it for Fable.
4. **Title wordmark clipped** — the "Lucky Shelf" "f" hook (and other ascender tops) read
   cut off. Cause: the title's `lineHeight: 48` on `fontSize: 44` (ratio 1.09) is far tighter
   than Baloo 2's natural metrics (~1.58× em), so iOS clipped the ascenders. Fixed to
   `lineHeight: 60` (~1.36×) in `index.tsx` — wordmark now uncropped and centred (verified,
   `wordmark_fixed`). **Audited the shared Baloo 2 tokens for the same issue** (`display`
   34/42 = 1.235, `title` 24/30 = 1.25, `heading` 18/24 = 1.33): "Day 14" and "Run Summary"
   crops show clean descenders/ascenders, so the tokens are safe at their sizes — left
   untouched to avoid shifting every screen's rhythm. Only the tight title override was at fault.

5. **Run screen: duplicate "YOUR SHELF"** — the build signpost panel's empty-state title
   (`run.tsx`, `BuildSignpost`) fell back to `'YOUR SHELF'`, identical to the `SectionLabel`
   above the grid (two identical labels on day 1). Renamed the panel's no-build title to
   **"YOUR BUILD"** (it becomes "{TAG} SHELF" once a build forms). Verified (`run_fixed2`).
6. **Run screen: spotlight "✨ WINDOW ×N" badge wrapped + overhung** — the tag was absolute
   inside the ring, so its width was clamped to ~slot width and the text wrapped to two lines
   and spilled off the right slot edge. Wrapped it in a centred full-width band
   (`spotlightTagWrap`) with `numberOfLines={1}` (`ShelfScene.tsx`) so it's a single-line pill
   centred above the slot. Verified (`run_fixed2`). **Note:** `ShelfScene.tsx` is under
   concurrent edit (an external reformat reverted this once); re-applied and confirmed present.

Items 5–6 are on the **run screen (Lane B, outside the five B-M4 items)** — polish caught
during the human device pass; flagged for Fable, same as items 3–4.

## 9. STOP

Fable reviews against the criteria; the human device feel-gate closes the visuals. Not
self-approved.
