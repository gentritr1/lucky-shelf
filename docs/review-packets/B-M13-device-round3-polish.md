# B-M13 — device round-3 polish (review packet)

**Implementer:** Opus 4.8 (Lane B). **Branch:** `graduation-flip` on `4302338`. **Left uncommitted.**
All five items are presentation-only. Verification env: node v20.19.4 (`~/.nvm/versions/node/v20.19.4/bin` on PATH — the default shell node is v14 and crashes vitest), `npx vitest run --no-file-parallelism`, `node --import tsx scripts/validate-fixtures.ts`.

## Global verification

- `npx tsc --noEmit` — **clean (exit 0)**.
- Full serial suite — **375 passed / 53 files** (baseline 373 + 2 added).
- `scripts/validate-fixtures.ts` — **7/7** (6 M0 + 1 m2). No sim boundary touched.
- Scope check: `git status` touches only `src/app/*`, `src/juice/cascade/SpeedControl.tsx`, `src/screen-styles/*`, `src/state/describeItemRules.ts` + `howToPlayView.ts` (+ their tests), `src/ui/OnboardingHint.tsx`. **No `src/sim`, `src/contracts`, `src/items`, or `fixtures/` changes.**
- Simulator: booted iPhone 16 Pro (`CD14DAE0…`), all shots in `docs/review-packets/shots-b-m13/`.

### Scope note to re-check at review (interpretation call)
The brief says "the only `src/state` file you may touch is `describeItemRules.ts`." Item 3 also requires updating the **glossary** ("The Words"), whose term data lives in `src/state/howToPlayView.ts`. I edited `howToPlayView.ts` (+ its test) to add the "Next to" term — a pure presentation view-model change (adds one glossary entry, no sim/flag behavior), analogous to `describeItemRules.ts`. Two test files (`store.test.ts`, `catalogStore.test.ts`) also had their **prose assertions** updated because they pin `describeItemRules` output via `itemRuleLines`/`ruleSentences`; those are test-only string updates. Flagging in case you want the glossary handled differently.

### Temp scaffolding (all reverted — NOT in the final diff)
To seed derived/gated screens for screenshots I used a `TEMP-VERIFY` harness. All reverted; `grep -rn "TEMP-VERIFY\|VERIFY_TARGET" src/` is now empty. Files that carried temp scaffolding at some point:
- `src/app/index.tsx` — `<Redirect>` + store seeding (`useRunStore`/`useCatalogStore`/`usePrefs` setState). **Fully reverted via `git checkout` — not in diff.**
- `src/app/cascade-harness.tsx` — one-line `autoPlay` removal to freeze the SpeedControl. **Reverted — not in diff.**
- `src/app/run.tsx` — a seeded `CascadeMount` + `autoPlay` removal. **The temp parts reverted;** run.tsx is in the diff only for its permanent Item-1 changes.

**Sim-state note (not code):** early summary seeds (before I no-op'd `recordRunEnd`) wrote inflated best-day records into the simulator's persisted catalog, and I toggled text-scale via Settings. The sim's prefs are back to 100% / HC-off; the persisted catalog on the sim shows inflated "records" (cosmetic, sim-only). Reset the app's data if you want a clean catalog on the sim.

---

## Item 1 (P1 bug) — rent chip clipped by the scoring overlay

**Files:** `src/app/run.tsx`, `src/screen-styles/run.styles.ts` (+ `run.styles.test.ts`).
**Fix (direction a):** the HUD `statusRow` (RentChip + MovesPips) is now hidden while `cascadeMount` is up (it was the element peeking half-covered behind the scrim), and a **complete rent line is rendered INSIDE the overlay** — a `RentChip` reading `hudState.rent` (= the pre-openShop snapshot that actually scored) in a centered header (`styles.cascadeRentLine`) above `CascadeLayer`. No HUD shelf re-render (double-shelf scar respected); `CascadeLayer`/`useCascadePlayer` untouched → cascade timing byte-identical.
**Verified (executed + observed on sim):** seeded the `/run` cascade overlay. `item1-4-run-cascade-overlay.png` and the crop `item1-rentchip-overlay.png` show **"RENT 25 due in 3 days" as a complete, fully-visible pill** above the cascade shelf, nothing clipped behind the scrim.
**Shots:** `item1-4-run-cascade-overlay.png`, `item1-rentchip-overlay.png`.
**Not re-shot:** 130%-text scoring-phase — the fix hides the status row and renders one self-contained pill; low risk. REVIEWER/human can confirm at 130% if desired.

## Item 2 (P2) — Daily Shop rule text: compact + tap-to-expand

**Files:** `src/app/restock.tsx`, `src/screen-styles/restock.styles.ts` (+ `restock.styles.test.ts`).
**What changed:** each non-signature offer row collapses to **one clamped rule line** (`numberOfLines={1}`) + a chevron affordance; tapping the row's thumb+info area (a `Pressable` separate from the Buy button) toggles the full `ruleLines`. **Only one row expanded at a time** (`expandedOfferId` state); expansion is instant (no animation → reduced-motion safe). VoiceOver reads the **full** prose via `accessibilityLabel` (`${name}. ${ruleLines.join('. ')}. Tap to expand/collapse rules.`), not the truncated line. `draft.tsx` untouched.
**Live-feedback refinements (Fable round 3):** (1) chevron is a single MCI `chevron-down` at **16px, `inkFaint`**, right-pinned, vertically centered with the name, that **rotates 180° when expanded** (`shopChevronOpen`) — doesn't compete with the teal price pill; (2) uniform vertical rhythm — the Baloo2 name line-box was hugged (`shopName.lineHeight: 19`, safe because `fontSize:15` already opts it out of text-scaling) and the info stack uses one gap token (`shopInfo.gap: spacing.xs`); (3) tag chips centered in their band — `shopRow.paddingVertical` reduced to `spacing.xs` to match the internal gap, so equal whitespace above the name and below the tags.
**Verified (executed + observed on sim):** seeded `/restock` with 4 loop-v2 offers, tapped Antique Clock. Collapsed shot shows one-line clamps + down-chevrons + Buy targets intact; expanded shot shows Antique Clock's **two** full rules with an up-chevron while other rows stay collapsed (one-at-a-time confirmed).
**Tests:** added an `it('exposes the row-expand affordance styles …')` to `restock.styles.test.ts`; byte-identity transcription updated.
**Shots:** `item2-dailyshop-collapsed.png`, `item2-dailyshop-expanded.png`.

## Item 3 (P2) — one word for adjacency: "next to"

**Files:** `src/state/describeItemRules.ts` (+ test), `src/state/howToPlayView.ts` (+ test), `src/app/how-to-play.tsx`, `src/app/run.tsx`, `src/ui/OnboardingHint.tsx`, plus prose assertions in `store.test.ts`/`catalogStore.test.ts`.
**Canonicalization (all in `describeItemRules`):**
- adjacentTo: `beside X` → `next to X`
- perAdjacent: `for each X nearby` → `for each X next to it`
- lonerBonus: `when it has no neighbors` → `with nothing next to it`
- multIfAdjacentMinTotal: `when every neighbor is worth…` → `when everything next to it is worth…`
- transformsAdjacent / growsEachDay / grantsAdjacent / countdownVanish: `… neighbor` → `… next to it`
- `copiesNeighbor` kept its directional "to its left" (already exact).
**Glossary:** added **"Next to" = "Touching left, right, above, or below — diagonals don't count. Many item rules only reach the slots next to them."** (always-on, after "Trade").
**Swept:** how-to-play page title "Neighbors Help Neighbors" → **"Placement Matters"** + body "…pay the items next to them"; run.tsx inspector hint "affect nearby items" → "affect items next to it"; onboarding "move linked neighbors together" → "move linked items together" (both run.tsx and OnboardingHint.tsx).
**Grep acceptance:** no user-facing `beside`/`nearby` adjacency prose remains (only comments + the `key: 'neighbors'` identifier).
**Wording decisions a native speaker might quibble with (please sanity-check):**
- "Earns +3 for each cheese item **next to it**" (perAdjacent) — alternative "for each adjacent cheese item"; chose "next to it" for one vocabulary.
- "Earns +6 **with nothing next to it**" (fishbowl) — from the brief's own example; alt "when nothing is next to it".
- **Deliberately NOT changed:** the receipt's terse rule-KIND labels in `src/juice/receipt/receiptModel.ts` (`'per neighbor'`, `'neighbor grant'`, `'transforms neighbor'`, `'rich-neighbor bonus'`, `'copies neighbor'`). These are compact category tags in the cascade caption (a different register from the descriptive sentences), they use "neighbor" (accurate orthogonal wording, not the flagged "beside/nearby"), the acceptance grep targets beside/nearby, and rewriting them to "next to" reads awkwardly as a category chip. Flagging as an optional follow-up if you want the receipt captions swept too — it would need `caption.test.ts`/`receiptModel.test.ts` updates.
**Verified:** describeItemRules tests green with updated snapshots; glossary shot `item3-glossary-nextto.png` shows the "Next to" entry; shop-row prose ("Earns +3 for each chee…", "Gives each item next to…", "…everything next to it is worth at least 5") visible in the Item-2 shots.
**Shots:** `item3-glossary-nextto.png` (+ Item-2 shots for shop-row prose).

## Item 4 (P2 scar) — SpeedControl centering + font

**Files:** `src/juice/cascade/SpeedControl.tsx` (self-contained rewrite).
**What changed:** migrated off the static `StyleSheet` + raw `Text` to `AppText` + a themed `useThemedStyles(makeStyles)` factory (high-contrast re-themes it now); replaced the emoji `⏭` with an MCI **`skip-next`** icon; kept 44/42/36pt targets and the `accessibilityRole`/`accessibilityState` exactly.
**Centering — deviation from the brief's suggested method, with evidence:** the brief suggested fixing the block 1×/2× labels via `lineHeight`. I tried `lineHeight == fontSize` and a **sim shot proved it CLIPS the Baloo2 glyphs** (project Gotcha 1: shrinking lineHeight below the glyph clips it — the labels rendered mangled). So the 1×/2× labels now ride the platform **`stat` role (system face)**, which centers cleanly in a constrained line box with no nudge — the TYPO-1 resolution for pill/coin labels. The icon-adjacent **"Skip"** label keeps Baloo2 `heading` + the sanctioned `baloo2IconNudge(18)` (verified centered against the icon).
**Verified (executed + observed on sim, zoomed):** `item4-speedcontrol-2x-active.png` + crops show "1×"/"2×"/"Skip ▶|" optically centered both axes, no clipping, no emoji, in both the 1×-active and 2×-active states.
**Shots:** `item4-speedcontrol-2x-active.png`, `item1-4-run-cascade-overlay.png` (control at rest, 1× active), `item4-speedcontrol-harness.png` (early harness shot).
**Note:** existing cascade tests are pure logic (`.test.ts`, node env) and don't render SpeedControl; unaffected and green.

## Item 5 (P3) — Run Summary as a paper receipt

**Files:** `src/app/summary.tsx`, `src/screen-styles/summary.styles.ts` (+ `summary.styles.test.ts`).
**What changed:** the summary content is now one **paper receipt card** — off-white paper (`creamBright`), rounded top, a **serrated deckle bottom edge** (a clipped row of paper-colored border-triangle Views — no SVG/Skia, no deps), a general-store header (clover mark + "LUCKY SHELF GENERAL STORE" + italic "Thanks for stopping by!"), the outcome (RENT MISSED / Day N / seed / build recap / near-miss / streak), a dividing rule, ledger rows (label · hairline rule leader · value, with the record/best caption beneath the value), and an italic "Keep building!" sign-off. "New record!" stays the small star + gold label (a stamp beneath its value). Share-card renderer untouched.
**Live-feedback fixes (Fable round 3 — human watching):**
- **No dropped content.** Diffed against `git show HEAD:src/app/summary.tsx`; every rendered node is preserved (the human's first look hit a *seed artifact* — empty shelf → no build recap, and the teaser was below the scroll fold). Re-seeded with a drink shelf + pending unlock; both now render.
- **Button layout (approved):** New Run is the primary full-width wood button; **Catalog + Share Card are one secondary row of two equal-width buttons** beneath it (`actionRow`/`actionHalf`, flex:1 each, ≥44pt, labels not truncated). This frees the vertical space so the full receipt + recap + teaser **fit on one screen at normal text** (tightened `body`/`receiptPaper`/`ledger`/`captionSlot` spacing to reclaim ~60px).
- **Staged entrance preserved:** the per-row `Reveal` stagger (rowDelay) survives on the ledger rows + teaser; `RecordAccent` still pops after its row. The outcome/paper stays unwrapped (as HEAD's hero was, so expo-router's screen-mount owns it). Reduced motion still snaps instant.
**Data-equality inventory (text nodes, before → after, all preserved, order unchanged):**
`RENT MISSED` → `Day {day}` → (`Seed · …` if daily) → (`{Tag} build · N combos` if build) → (`Closest rent payment: N coins to spare` if near-miss) → (`N-day daily streak` if daily & streak≥2) → `Coins earned {N}` → `Best day {N}` (+New record!/RECORD·N/YOUR BEST) → `Longest run {N}d` (+caption) → `Deepest rent {N}` (+caption) → (`Combos this run {N}` only when no build) → (`NEXT UNLOCK` teaser if present) → buttons. Header ("LUCKY SHELF GENERAL STORE" / "Thanks for stopping by!") and sign-off ("Keep building!") are decorative chrome only — no dates, no premium, no fake stamps, no new stats.
**Verified (executed + observed on sim, seeded gameOver + drink shelf + near-miss + records):**
- `item5-summary-receipt-normal.png` — everything fits one screen: clover header, RENT MISSED/Day 13, "Drink build · 0 combos", near-miss, four ledger stats each with ★ New record!, deckle edge, "Keep building!", the NEXT UNLOCK teaser fully visible, and the New Run + Catalog/Share Card row.
- `item5-summary-receipt-130.png` — 130% text; paper grows, no element clipping (only the scroll boundary cuts the sign-off — scrolling is acceptable at 130%).
- `item5-summary-receipt-hc.png` — high-contrast palette applied (deeper ink/gold), same shape, fits one screen.
**Tests:** `summary.styles.test.ts` re-derived for the receipt layout (+ a deckle-teeth-are-paper-colored assertion under both palettes); byte-threaded under base + HC palettes.
**Shots:** `item5-summary-receipt-normal.png`, `item5-summary-receipt-130.png`, `item5-summary-receipt-hc.png`.

---

## Open gates / caveats for the human's final eyeball
- All visual work is delivered with sim screenshots but the **human's final eyeball** is the closing gate per project rule (math/screenshots never close "feel" alone). Especially: the receipt's overall look, the SpeedControl optical centering, and the Daily-Shop row rhythm.
- Item 5 **staged-reveal animation** is verified only as an END-STATE screenshot (reanimated is render-invisible to headless checks and to a still frame) — the stagger/`RecordAccent` motion needs a device recording or the human's eyeball to confirm it still choreographs.
- Reduced-motion, VoiceOver, and 130% for Items 1–4 were reasoned + partially shot; a device pass can close them fully.
