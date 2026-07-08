# B-M7 — Accessibility floor — review packet

**Implementer:** Opus 4.8 (Lane B). **Brief:** `docs/lane-b/accessibility-floor-brief.md`.
**Status:** built + headless-verified; **visuals DEFERRED to the human device gate** (seed recipes
below). **Not committed** — the working tree carries three lanes' work (see *Tree state*). **STOP —
Fable reviews.**

**Verdict I'm asking Fable to rule:** APPROVE the token/mechanism layer + the persistence + the
color+shape fix as landed, and rule on the one escalation — the **live app-wide wiring of
textScale/highContrast is staged, not done**, because the codebase bakes type and color into static
`StyleSheet.create` (details in §"Wiring reality"). That is a genuine architecture call, not an
oversight.

---

## TL;DR of what shipped

| # | Brief item | State |
|---|---|---|
| 1 | Prefs persistence audit + additive persisted prefs + old-shape test | ✅ **DONE** — `usePrefs` did **not** persist; now does, old-shape load test written **first** and green |
| 2 | Large text (`textScale` 1 / 1.15 / 1.3) through `AppText`/`typeScale`, no per-screen math | ✅ **mechanism DONE** — central `scaleTypeStyle`, applied only in `AppText`; ⚠️ reach limited by static StyleSheet (§Wiring reality) |
| 3 | High contrast as token-level mapping, no per-component fork; report ratios | ✅ **mapping + ratios DONE**; ⚠️ live app-wide swap staged (§Wiring reality) |
| 4 | Color+shape everywhere; audit table | ✅ **DONE** — one real offender (drop glow) **fixed**; rest already glyph-paired (table below) |
| 5 | Settings "Comfort" group, existing Toggle kit; haptics/sound unchanged | ✅ **DONE** — Comfort panel (Large Text 3-way + High Contrast); motion/sound/haptics untouched |

**Acceptance criteria:** (1) suite + `tsc` green ✅, old-shape load test green ✅, headless test proving
`textScale` maps through the type system green ✅; (2) audit table with every row resolved/deferred ✅;
(3) contrast numbers for both palettes ✅; (4) device shots deferred with seed recipes ✅.

---

## Commands + outputs

```
$ nvm use 23.3.0
$ npx tsc --noEmit
# clean (no output)

$ node --import tsx scripts/validate-fixtures.ts
Validated 6 M0 fixtures.   # determinism floor intact

$ npx vitest run
 Test Files  32 passed (32)
      Tests  230 passed (230)     # was 223; +6 prefs, +7 tokens

$ npx vitest run src/persistence/prefs.test.ts src/ui/tokens.test.ts
 Test Files  2 passed (2)
      Tests  13 passed (13)
```

Determinism pin + 6 M0 goldens are inside the 230 and pass → **OFF/default path byte-identical**
(`scaleTypeStyle(x,1) === x` by identity; `resolvePalette(false) === palette`; `AppText` at scale 1 /
HC off injects no color and returns the same style objects; no `@/sim` touched).

---

## 1. Prefs persistence (audit result: it did NOT persist)

`usePrefs` was a plain in-memory zustand store — **every launch reset reduced-motion / sound /
haptics**, and would have reset the new comfort prefs too. Added persistence following the existing
`src/persistence/*` pattern (zod schema + `KeyValueStorage`), **all fields optional → old shapes load
loss-free** (the same additive shape as the B-M5 `streak` field).

- `src/persistence/prefs.ts` — `PrefsSaveSchema` (non-strict, every field optional), `DEFAULT_PREFS`,
  `createPrefsPersistence(storage)` with `loadPrefs()` merging over defaults + `savePrefs()`.
- `src/ui/prefs.ts` — hydrates via `loadPrefs()` (lazy AsyncStorage import, like `onboardingStore`);
  **writes are load-guarded** (`if (!get().loaded) return;`) so pre-hydration defaults can never
  clobber a real save (the standing catalog-wipe scar).
- `src/app/_layout.tsx` — `usePrefs.getState().loadPrefs()` at boot (alongside catalog hydrate).
- `src/persistence/prefs.test.ts` — **old-shape test written first**; 6 cases:
  1. **OLD-SHAPE** (only the 4 original toggles, no `textScale`/`highContrast`) → old fields preserved
     verbatim, new fields defaulted (the anti-wipe proof).
  2. empty store → all defaults. 3. corrupt blob → all defaults. 4. unknown/future field ignored,
     known fields still load. 5. out-of-range `textScale` (2.5) → safe fallback to 1 (never a wild
     scale). 6. full round-trip save→load identity.

## 2. Large text — central mechanism (`textScale`)

- `scaleTypeStyle(base, scale)` in `tokens.ts` — the **one** place text grows; scales only
  `fontSize`/`lineHeight`, preserves weight/family/letterSpacing/tabular-nums; `scale === 1` returns
  the base object unchanged.
- `AppText` is the **sole caller** — reads the pref and applies it. No screen does font math.
- `src/ui/tokens.test.ts` proves it headlessly: identity at scale 1; every `typeScale` role scales at
  1.15 and 1.3; body genuinely grows (not a silent no-op); non-size fields preserved.
- Settings rows were converted from raw `<Text>` + `...typeScale` to `AppText` so the Comfort screen
  itself scales (dogfood + the device-gate surface). I **removed** the hint `fontSize: 13` override —
  it would have pinned hint text unscaled (that override *is* per-screen font math, forbidden).

## 3. High contrast — token mapping + measured ratios

`highContrastPalette` in `tokens.ts` is a **token-level alternate** (`{ ...palette, <overrides> }`);
`resolvePalette(highContrast)` selects it. Ink darker, cream lighter, chip/border edges deeper — **no
per-component color fork**. `tokens.test.ts` asserts the HC palette has the exact same key set as
`palette` (structurally a drop-in, can't fork).

**WCAG 2.1 contrast ratios** (`scripts/contrast-check.ts`, re-runnable; hexes mirror `tokens.ts`):

| Pair | Normal | Normal grade | High-contrast | HC grade |
|---|---|---|---|---|
| body text (ink / wallCream) | **11.11:1** | AAA | **16.55:1** | AAA |
| coin text (ink / creamBright) | **12.74:1** | AAA | **17.83:1** | AAA |
| hint text (inkFaint / wallCream) | 3.66:1 | AA-large only | **8.80:1** | AAA |
| tag text (inkFaint / parchment) | 3.33:1 | AA-large only | **7.59:1** | AAA |
| soft text (inkSoft / wallCream) | 7.42:1 | AAA | **13.28:1** | AAA |

Reading: **body and coin text already clear AA (indeed AAA) in the normal palette** — the brief's
≥4.5 target is met by default. The real gap the normal palette has is **faint small text** (hints,
tag chips) at 3.3–3.7:1 (AA-large only, fails AA for <18pt). **High contrast lifts every pair to AAA
(≥7.59:1)** — that's the concrete win the toggle buys. Note the coin *text* is `palette.ink` on cream
(the gold is only the decorative dot), so it inherits the strong ink contrast; gold is never a text
color.

## 4. Color+shape audit table

Every surface that encodes a **tag** or **state** by color. "Color-only" = would a colorblind /
grayscale user lose information? Legend: ✅ already redundant · 🔧 fixed this pass · ➖ not a
color-encoded state.

| Surface | File | Color-only? | Redundant cue / resolution |
|---|---|---|---|
| **Legal / illegal drop glow** (green vs red) | `ShelfScene.tsx` `SlotGlow` | **YES** — hue-only red/green (SC 1.4.1 trap) | 🔧 **FIXED** — ✓ (legal) / ✕ (illegal) glyph cross-fades on the hovered slot, in its own full-opacity overlay; gesture-driven so it shows in reduced-motion too. *Visual accept device-gated.* |
| Build-identity signpost (accent border/hero) | `run.tsx` `BuildSignpost` | No | ✅ `tagEmoji` glyph + "TAG SHELF" text label beside the color |
| Supplier archetype card (accent border) | `draft.tsx` | No | ✅ `tagEmoji` glyph + tag label |
| Summary build header (accent color text) | `summary.tsx` | No | ✅ `tagEmoji` prefix + tag word |
| Cascade rule-arrows (hue per source) | `cascade/CascadeArrow.tsx` | No | ✅ hue is a *grouping* aid on the already colorblind-safe `arrowPalette` (hue+lightness separated); the payload is the arrow's geometry/direction + the on-slot ×N/+N pops, not color |
| Spotlight "front window" slot | `ShelfScene.tsx` `SpotlightMarker` | No | ✅ gold ring (shape) + "✨ WINDOW ×N" text |
| "New record!" flourish | `summary.tsx` | No | ✅ ★ glyph + "New record!" text |
| Daily streak | `summary/index/share` | No | ✅ 🔥 glyph + "N-day streak" text |
| Rent proximity (calm→warm→alarm color + breath) | `RentChip.tsx` | No | ✅ the day count is rendered as text ("N days"); color/breath are redundant reinforcement |
| `TagChip` accent vs muted tone | `TagChip.tsx` | No | ✅ the tag **label text** is always shown; accent/muted is de-emphasis, and `tone="accent"` is not used by any screen today (only default `muted` in restock/OfferCard) |
| Coin dot (gold) | `CoinCounter.tsx` | ➖ | decorative shape, not a state; amount is text |

**Deferred rows: none.** The one color-only *state* (drop glow) is fixed structurally; its visual
polish (mark size 0.42×slot, placement, legibility over the tint at SE width) is the device-gate item.

## 5. Settings "Comfort" group

New top panel: **Large text** (3-step segmented `100% / 115% / 130%`, `radiogroup`/`radio` a11y roles)
+ **High contrast** (existing `Toggle`). Motion / Sound / Feedback panels unchanged; haptics + sound
toggles untouched (per non-goals).

---

## ⚠️ Wiring reality — the one thing to rule on

The brief's mechanism assumes `AppText`/`typeScale` and `palette` are the universal funnels. **They
are not, as consumed today:**

- **8 screens render raw `<Text>` with `...typeScale.*` baked into `StyleSheet.create` at module
  load** (index, catalog, run, draft, restock, share, cascade-harness, + settings before this pass).
  `AppText` is used in only 2 screens (share, summary) + a few kit components.
- `palette` is likewise read **statically** inside `StyleSheet.create` across ~every component.

Static `StyleSheet.create` captures values once at module load, so a runtime pref **cannot** re-theme
those reads live. Consequently, **today**:
- `textScale` visibly scales: `AppText`-rendered text (share, summary, kit: WoodButton/TopBar/RentChip/
  SectionLabel/MovesPips) **and the Settings screen** (migrated to `AppText` this pass). It does **not**
  yet scale the raw-`<Text>` screens.
- `highContrast` re-themes only `AppText`'s **default** text color today; static StyleSheet
  backgrounds/borders/explicit colors are unchanged.

**Why I did not "just wire it all":** making the prefs effective app-wide requires migrating the
static reads to a runtime path (a `useTheme()`/`usePalette()` + `AppText`-everywhere migration). The
correct fixes are exactly the two things the **hard rules forbid me from faking** — per-screen font
math and per-component color forks. Doing the migration inside this brief would be a broad refactor of
every screen smuggled into an "accessibility floor" change (a §6 red flag) and needs the device gate
regardless. So I built the **central, correct mechanism + the token mapping + the measured ratios +
the persisted prefs + the settings UI**, and I'm staging the wiring.

**Recommendation for Fable:** approve a follow-up "adopt the runtime theme/scale path" brief that
(a) routes screens' text through `AppText` and (b) replaces static `palette` reads with
`resolvePalette(highContrast)` via a hook — mechanical, no new tokens, and the device gate accepts it.
This packet delivers the layer that follow-up builds on. **This is the escalation the brief's framing
("structure closes headlessly now, visuals later") anticipated at the token level; I'm flagging that
it also applies to the screen wiring.**

---

## Deferred device screenshots (human device gate)

Build/run per memory `ios-ui-verify-on-simulator` (native build historically flaky here). Prefs
AsyncStorage key: **`luckyShelf:prefs:v1`**. Capture on **iPhone 16 Pro** and **iPhone SE (375pt)**.

1. **Settings — Comfort group.** Fresh launch → Settings. Confirm: Comfort panel on top; Large Text
   segmented (100/115/130) with 100% selected; High Contrast toggle; motion/sound/haptics below
   unchanged. Tap 130% → the settings screen's own text grows (it's on `AppText`).
   - Seed to land already-large: `luckyShelf:prefs:v1` =
     `{"schemaVersion":1,"reducedMotion":false,"hapticsEnabled":true,"musicEnabled":true,"sfxEnabled":true,"textScale":1.3,"highContrast":false}`
2. **Large text @1.3 on a gameplay screen at SE width.** Seed `textScale:1.3`, open the run/summary
   screen. **Acceptance: no truncation / overlap of `AppText`-rendered copy on SE.** (Expectation
   check: raw-`<Text>` screens will NOT scale yet — that's the staged wiring above, not a bug in this
   pass. Confirm the AppText surfaces — summary, share, HUD chips — survive 1.3 without clipping.)
3. **High-contrast run screen.** Seed `highContrast:true`, open a gameplay screen. Confirm the
   `AppText` default-color text darkens; note (expected) that statically-styled surfaces are unchanged
   pending the wiring migration. Judge whether the partial effect is acceptable to ship as-is or should
   wait for the full migration (Fable's call).
4. **Tag surfaces (color+shape).** During a drag over the shelf, capture a **legal** hover (green tint
   + **✓**) and an **illegal** hover (red tint + **✕**) — the core color+shape proof. Also a
   build-identity signpost (accent + `tagEmoji`) and a supplier card. **Acceptance: legal/illegal is
   distinguishable in grayscale** (screenshot → desaturate), and the ✓/✕ reads at SE slot size.

---

## Tree state — IMPORTANT for whoever commits

The checkout carries **three lanes' uncommitted work**. Do **not** sweep them into one commit.

**B-M7 (mine) — commit these together:**
- `src/persistence/prefs.ts` (new), `src/persistence/prefs.test.ts` (new), `src/persistence/asyncStorage.ts`
- `src/ui/tokens.ts`, `src/ui/tokens.test.ts` (new), `src/ui/prefs.ts`, `src/ui/components/AppText.tsx`, `src/ui/index.ts`
- `src/app/settings.tsx`, `src/app/_layout.tsx`
- `src/juice/ShelfScene.tsx` — **only the `SlotGlow` ✓/✕ addition + its `dropMark*` styles are mine**
- `scripts/contrast-check.ts` (new), `src/test/react-native.stub.ts` (new), `vitest.config.ts` (RN alias)

**NOT mine — leave / route to their owners:**
- `src/app/run.tsx` — pre-existing WIP ("YOUR SHELF" → "YOUR BUILD"), present before this task.
- `src/juice/ShelfScene.tsx` — the **spotlight-tag centering** lines were pre-existing WIP; my SlotGlow
  change sits on top. Whoever splits commits must separate these.
- `src/juice/receipt/` + `docs/review-packets/B-M8-receipt-cascade-review.md` — parallel **B-M8** work.

**Infra note for Fable:** `vitest.config.ts` gains a `react-native` → stub alias
(`src/test/react-native.stub.ts`, Platform/StyleSheet only) so the ui/token layer is unit-testable in
the node env (no test imported RN before). Additive; only modules importing `react-native` resolve to
it, so sim/state tests are untouched (32 files / 230 tests green).

## Known gaps / honesty ledger
- **Visuals UNVERIFIED** — no screenshots (device gate). Seed recipes above. The color+shape ✓/✕ and
  the large-text/high-contrast look are **unverified by eyeball** (my §2 scar: feel/visual work needs
  device acceptance) — flagged, not claimed done.
- **App-wide live effect is staged** (§Wiring reality) — the honest headline of this pass.
- Did not commit (shared, multi-lane tree).
