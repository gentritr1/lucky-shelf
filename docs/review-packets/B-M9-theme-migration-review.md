# B-M9 — runtime-theme migration — review packet

**Implementer:** Opus 4.8 (Lane B). **Brief:** `docs/lane-b/runtime-theme-migration-brief.md`
(spun out of the B-M7 "Wiring reality" escalation). **Nature:** mechanical adoption of the
existing, tested B-M7 funnels — no new design. **Committed** (9 commits, one screen each).
**STOP — Fable reviews.**

**Verdict I'm asking Fable to rule:** APPROVE the static-`StyleSheet` → runtime-factory migration
across every `src/app` screen (run.tsx excepted — human WIP), with the documented raw-`<Text>` and
known-limit exceptions below. The whole acceptance is **byte-identical output at default prefs**, which
is proven per screen by a factory-at-defaults equality test; high contrast now reaches these screens
for the first time. The one thing needing an eyeball is the batched device gate (deferred shots below).

---

## What shipped

Two shared helpers in `src/ui`, then one screen per commit:

- **`src/ui/useThemedStyles.ts`** — `useThemedStyles(factory)`: resolves the live palette for the
  high-contrast pref and memoizes the sheet, keyed on `(textScale, highContrast)`. A screen defines a
  module-scope `makeStyles(palette)` factory (reading colors from the **passed** palette) and calls
  `const styles = useThemedStyles(makeStyles)`.
- **`src/ui/prefs.ts` `usePalette()`** — selector returning `resolvePalette(useHighContrast())`, for
  **inline** themed color props (`AppText color={…}`, icon tints) so they re-theme too. AppText only
  HC-remaps its *default* color, so screens passing an explicit `color={palette.X}` needed this to
  actually react to high contrast.

Both resolve to the **base `palette` object by identity** at default prefs
(`resolvePalette(false) === palette`), so every migrated surface is byte-identical at defaults; the
high-contrast path is the new behavior.

### Per-screen table (screen → commit → equality proof)

| # | Screen | Commit | Equality proof (headless) |
|---|--------|--------|---------------------------|
| — | `useThemedStyles` + `usePalette` helper | `b1956d8` | (mechanism; exercised by every table below) |
| 1 | `settings.tsx` | `b1956d8` | `settings.styles.test.ts` — 2 ✅ |
| 2 | `index.tsx` | `4a64d4d` | `index.styles.test.ts` — 2 ✅ |
| 3 | `catalog.tsx` | `b7476dc` | `catalog.styles.test.ts` — 2 ✅ |
| 4 | `cascade-harness.tsx` | `fe49128` | `cascade-harness.styles.test.ts` — 2 ✅ |
| 5 | `share.tsx` | `80a7212` | `share.styles.test.ts` — 2 ✅ |
| 6 | `draft.tsx` | `419916c` | `draft.styles.test.ts` — 2 ✅ |
| 7 | `summary.tsx` | `cd74f02` | `summary.styles.test.ts` — 2 ✅ |
| 8 | `restock.tsx` | `60ffbec` | `restock.styles.test.ts` — 2 ✅ |
| 9 | `_layout.tsx` (root frame) | `c4aad97` | `_layout.styles.test.ts` — 2 ✅ |

Ordering was smallest-file-first (settings 210 → … → restock 613); `_layout` last as the shared frame.
`summary.tsx` and `_layout.tsx` were not in the B-M7 packet's 8-screen list but read `palette`
statically into `StyleSheet.create`, so they were migrated too to make the acceptance grep clean.

### How the equality test proves byte-identity (design)

Each `*.styles.test.ts` transcribes the **original** static sheet independently as
`expected(p)` (parametrized by palette), then asserts:

```
expect(makeStyles(palette)).toEqual(expected(palette));                 // default prefs → byte-identical
expect(makeStyles(highContrastPalette)).toEqual(expected(highContrastPalette)); // every themed prop threads the ARG
```

`resolvePalette(false) === palette` and `resolvePalette(true) === highContrastPalette` are proven in
`tokens.test.ts`, so the two palettes stand in for the two pref states. The second assertion is the
leak-guard: a prop that accidentally read module-scope `palette` instead of the factory argument would
**not** re-theme where its token is HC-overridden, and would diverge here. `expected(p)` is authored
from the pre-migration source (not copied from the factory), so a token swap in the factory diverges.

The factories are headlessly testable because each lives in a sibling `*.styles.ts` that imports only
`@/ui/tokens` (pure; the vitest `react-native` stub covers `Platform`/`StyleSheet`) — the screen
`.tsx` (with its expo-router/Skia/RN-component imports) is never imported by a test.

---

## Evidence per acceptance criterion

### (1) Per-screen factory-at-defaults equality test green; suite + tsc green after every commit

```
$ npx tsc --noEmit        # clean after every screen (TSC=0)
$ npx vitest run <9 *.styles.test.ts> src/ui/tokens.test.ts
  Test Files  10 passed (10)
       Tests  25 passed (25)     # 9 screens × 2 + 7 tokens
```
Each commit was made only after `tsc` clean + the screen's equality test green; sequential full-suite
runs during the sweep were green (259 → 273 as tests were added).

**Honesty note — 2 pre-existing flaky tests.** A later isolated run surfaced intermittent failures in
`src/sim/unlocks.test.ts` and `src/sim/balanceHarness.test.ts` (the latter is documented-flaky in
project memory; both are fuzz/balance harnesses with ~750s of test time). **These are outside this
change's import graph** — proof: their imports are `../contracts ../items ../persistence/catalog
./balanceHarness ./bots ./economy ./engine ./hash ./replay ./unlocks vitest`; **none** is a
`src/ui` or `src/app` module, and this entire diff is confined to `src/app` + `src/ui` (`git status`
shows nothing outside those two trees). There is no side-effect path (the additions are a zustand
selector + pure StyleSheet factories; sim tests never import `@/ui`). They passed in the per-screen
sequential runs earlier this session. I flag them rather than claim a clean full suite; they are a
pre-existing environmental flake for the sim owner, not a B-M9 regression.

### (2) Grep proof — no `src/app` screen reads `palette.*` into a static `StyleSheet.create`

```
$ grep -rln 'StyleSheet\.create' src/app/*.tsx
  src/app/run.tsx                       # ONLY remaining — the allowed exception (below)

$ grep -n 'import' src/app/*.styles.ts | grep -i palette
  (nothing) — factories import `type Palette` only; they receive palette as a PARAMETER

$ grep -h 'export function makeStyles' src/app/*.styles.ts
  export function makeStyles(palette: Palette) {   # ×9 — every factory is parametrized
```

So every migrated screen's themed sheet is now a runtime factory threaded from `usePalette`/
`useThemedStyles`; the only `palette.` textually inside a factory is the **parameter**, not the
imported token. No raw hex color literals were introduced (`grep -rnE '#[0-9a-fA-F]{6}'` over the
migrated `.tsx`/`.styles.ts` → none). House rules held: tokens-only, no per-screen font math added, no
per-component color fork (all HC comes through `resolvePalette`/`useThemedStyles`).

**Allowed exceptions (explicit):**
- **`run.tsx`** — brief says *do not touch* (human WIP; its "YOUR SHELF"→"YOUR BUILD" edit landed in
  `1dba09e` during this task). It still has a static themed sheet (31 `palette.`/`StyleSheet.create`
  refs). It should be migrated last / coordinated with the human — same mechanical pattern applies.
- **`ShelfScene.tsx` (Skia)** — known limit (below), not a `StyleSheet.create` case.

### Raw-`<Text>` audit (AppText adoption sweep)

Migrated screens route block copy through `AppText`. Surviving raw `<Text>` = **7**, all documented
non-scalable typographic exceptions (each carries an inline `raw <Text> exception` comment). Their
**colors are still parametrized** through the factory, so they re-theme under high contrast — only
their *size* is fixed:

| Screen | Raw `<Text>` | Why it can't be AppText |
|--------|-------------|-------------------------|
| share | `heroNumber` | bespoke 64px numeral, **no type role / font family** — AppText would inject the display face |
| draft | `supplierEmoji` | decorative emoji glyph (fontSize only), icon-like |
| restock | `sellGlyph`, `shopThumbGlyph` | decorative glyph icons |
| restock | `rerollCost`, `shopBuyText` | **coin-adjacent digits** needing `baloo2IconNudge` beside the coin dot (the brief's named exception) |
| restock | `signatureBadgeText` | bespoke 9px badge, no type role / font family |

`settings / index / catalog / cascade-harness / summary` have **0** raw `<Text>`.

---

## Known limits & incidental notes

- **`ShelfScene.tsx` (Skia) — known limit, not solved (per brief).** Its colors are canvas-side
  (Skia paints), not React `StyleSheet`, so `useThemedStyles` does not reach them. High contrast will
  **not** re-theme the shelf canvas until a separate Skia-side pass threads `resolvePalette` into the
  scene's paints. Flagged, not attempted here.
- **Size-pinned captions do not scale with large-text.** Several screens carry *pre-existing*
  sub-role fixed sizes (catalog 9–13px grid captions; share/restock 10–15px). These are preserved
  **byte-identically** (removing them would change the default look — forbidden by the acceptance), so
  they stay fixed under the large-text pref. Normalizing them to scalable roles is a separate design
  task, out of B-M9's byte-identity scope. Text without a size override *does* scale.
- **`textScale` in the memo key.** `useThemedStyles` keys on `(textScale, highContrast)` per the
  brief, but today factories consume only the palette — text size flows through `AppText`/
  `scaleTypeStyle`, never a StyleSheet. The key includes `textScale` for forward-correctness and to
  match the brief's spec; it is not a bug that no factory reads it.
- **restock dead styles.** `offerCol / costRibbon / costText / buy / buyText` are pre-existing
  unreferenced styles (grep-confirmed 0 JSX refs). Transcribed **verbatim** into the factory to keep
  the migration a pure mechanical move (no hidden cleanup). A follow-up could delete them.
- **`_layout.tsx` re-render.** The root frame now subscribes to the prefs store via
  `useThemedStyles`/`usePalette`; a prefs toggle re-renders the frame (rare, correct — that is how the
  theme propagates). `COLUMN_MAX = 460` moved into `_layout.styles.ts` (pre-existing raw number,
  preserved).

---

## Deferred device shots (batched gate queue)

Native build is historically flaky here; verify per memory `ios-ui-verify-on-simulator`. Prefs
AsyncStorage key **`luckyShelf:prefs:v1`**. Capture on **iPhone SE (375pt)**.

1. **Large text @1.3 on a migrated gameplay-adjacent screen (restock).** Seed
   `{"schemaVersion":1,"reducedMotion":false,"hapticsEnabled":true,"musicEnabled":true,"sfxEnabled":true,"textScale":1.3,"highContrast":false}`,
   open **/restock**. **Acceptance:** AppText-rendered copy (headers, captions, buy/sell names) grows
   without truncation/overlap at SE width; the coin-nudge digits + glyph icons stay put (expected —
   fixed exceptions). Also confirm the mono **share receipt** at 1.3× still dot-leader-aligns and does
   not overflow its card (the receipt now scales via `AppText variant="receipt"`).
2. **High-contrast on the same screen.** Seed `highContrast:true`, open /restock and /summary.
   **Acceptance:** backgrounds/borders/text all darken/lighten together (no half-themed surface);
   grayscale check still legible. Note the ShelfScene canvas will be unchanged (known limit).

---

## Honesty ledger

- **Visuals UNVERIFIED by eyeball** — no device shots yet (batched gate). Byte-identity at defaults is
  proven headlessly (equality tests), but the large-text/high-contrast *look* on device is deferred.
- **2 pre-existing flaky sim tests** flagged above (outside this diff's import graph) — not fixed here.
- **run.tsx not migrated** (human WIP, per brief) — the one remaining static-palette screen.
- **ShelfScene Skia** re-theme not attempted (known limit, per brief).
