# B-M15 — Catalog restyle: "Collector's Journal" — review packet

**Implementer:** Opus 4.8 (Lane B). **Branch:** `graduation-flip` (from `cd7cf70`). **Status:**
implementation + tests complete, **uncommitted** (Fable reviews first). Brief:
`docs/lane-b/catalog-collectors-journal-brief.md`.

## What shipped

A restyle of the Catalog screen to the Collector's Journal concept:

1. **Journal header card** (`JournalHeader`) replaces the Shelf-Growth `CompletionHeader`: a paper
   page (creamBright bed, gold frame + inset "stitch" hairline), a hand-titled masthead
   ("Collector's Journal", Baloo2 italic + clover), the big `completionPct` + "COMPLETE" on the
   left, "N / M items discovered" on the right, a **passive milestone dot-scale** (0/25/50/75/100)
   filled by real `completionPct` (first mark = star once >0%), a combos **wax-seal** badge left of
   the **NEXT MILESTONE** row (the existing `nextUnlockTeaserView`, restyled, with its real
   silhouette/hint/progress fraction), then the four best-run stats as **receipt-leader lines**:
   Runs, Best day, Longest run, Deepest rent.
2. **Rarity postage-stamp tabs** (`RarityStampTabs`) replace both the ITEMS/COMBOS segmented control
   and the rarity legend chips: a horizontal strip of serrated stamps (summary deckle-tooth
   technique), pastel per-rarity tint, rarity icon, discovered/total, and — only when a real
   runsPlayed-gated locked item exists in that band — the nearest such goal line. The stamps are the
   tab control (`accessibilityRole="tab"`, selected/inked state, press-spring); a combos stamp opens
   the trophy shelf.
3. **Album grid + showcase modal + trophy shelf**: structurally unchanged. The rarity grid, item
   cards (`ItemStamp`/`FoundStamp`/`LockedStamp`/`MysteryStamp`), both modals, `RecipeDiagram`, and
   the combo `ComboMedal` trophy shelf are byte-for-byte the same components — only the header/tabs
   around them changed.
4. **Gallery entry (B-M14)**: `GalleryEntryCard` kept exactly (same flag gating,
   `pictureGalleryEnabled()`), now wrapped in the mount stagger as a journal-native card. Flag-off ⇒
   not rendered.

**Motion:** in-screen stagger (`StaggerReveal`: journal → gallery → stamps → page, 70ms steps, subtle
translateY+fade, `settle` duration); completion % and milestone dots animate to value on one
`useCountUp` (~600ms, once); teaser + progress bars animate to value (`ProgressTrack`); stamp
press-springs. All snap under reduced motion. No particles/loops/Skia. Uniform scale only (Fabric
scar); every animated `.value` is read inside a worklet or drives width as a plain number.

## Mockup → real mapping (the affordance filter — scar-critical)

| Concept element | Verdict | How it renders / why stripped |
|---|---|---|
| Big completion % | **REAL** | `view.completionPct`, count-up on mount |
| "N / M items discovered" | **REAL** | `view.itemsDiscovered` / `view.itemsTotal` |
| Combos badge (green wax seal) | **REAL** | `view.combosAchieved` / `view.combosTotal`; deep-teal seal |
| NEXT MILESTONE row | **REAL** | existing `nextUnlockTeaserView` (real predicate, hint, "N/M" + fill); fallback = `nearestIncompleteBand` |
| Stat cells: Runs, Best day, Longest run, Deepest rent | **REAL** | `catalog.stats.{runsPlayed,bestDayTotal,longestRun,deepestRentSurvived}` |
| Per-rarity stamp: name, icon, discovered/total | **REAL** | `catalogBands()` per-band counts |
| Per-rarity goal line ("Reach N runs") | **REAL, conditional** | `rarityGoalForItems()` — shown **only** when the band has a real locked runsPlayed item; else count-only. Never fabricated. |
| "All-time 3364c" fourth stat | **STRIPPED** | There is no persisted lifetime-coins display stat; adding one = a wipe-risk persisted field for a number. Replaced with **Longest run** (real, already persisted). |
| 0/25/50/75/100% milestone track | **SUBSTITUTED** | Rendered as PASSIVE scale dots filled by real `completionPct`. No medals, no rewards at 25/50/75 — nothing implies a payout the sim doesn't pay. |
| Wooden 41-well mini-shelf (Shelf-Growth) | **RETIRED** | Its wood clashed with the paper journal, and it duplicated the progress read. The milestone dot-scale + discovered count + per-rarity stamp counts carry "filling up". Recorded here per brief. |
| Dates / "premium" copy / decorative feature text | **NOT ADDED** | none present |

## Interpretation calls (flagged for the reviewer)

- **The concept image is not in the repo.** The brief references "variant 3 / the concept sheet"; no
  image file exists under `docs/`. I matched the **text layout spec** in the brief, not a rendered
  mockup. Pixel-level fidelity to the unseen sheet is therefore unverifiable.
- **Rarity stamps as a *filtering* tab control.** The brief calls them "the TAB control", with a
  "selected/inked" state, and the Intent's navigation line reads "rarity tabs → album grid →
  showcase". The shipped screen's rarity chips were a *passive legend*, not a tab. I resolved this by
  making the stamps a real tab control that **filters** the album grid to one band (the combos stamp
  shows the trophy shelf), which satisfies the "tab / selected / rarity → grid" language while
  keeping each band's grid markup unchanged. The cost: the items are no longer all-stacked at once
  (the header's dot-scale + counts now carry the overview). **If the human wanted all bands stacked
  with the stamps as a passive legend, this is the one call to redirect** — the stamp components +
  grid stay; only the render wiring changes.
- **Default selected page = COMMON.** Rarest-first order (HEIRLOOM…COMMON) leads the strip, but
  defaulting the *filter* to HEIRLOOM would open on an empty aspirational page. COMMON is the
  populated band, so a fresh open shows a filled grid.

## Files touched

- `src/state/catalogStore.ts` — added pure view models `milestoneScaleView`, `rarityGoalForItems`
  (+ `MILESTONE_MARKS`, `MilestoneMark`, `RarityGoal`). No store mutations, no persistence, no schema.
- `src/state/catalogStore.test.ts` — +7 tests (4 milestone, 3 rarity-goal).
- `src/screen-styles/catalog.styles.ts` — journal / stamp-tab / milestone / wax-seal styles added;
  Shelf-Growth (summary/growth/mini-shelf), segmented-tab, and legend styles removed; grid / stamp /
  combo / medal / recipe / modal / gallery styles kept verbatim.
- `src/screen-styles/catalog.styles.test.ts` — transcription mirror updated to the new sheet, both
  base and high-contrast palette assertions kept (coverage not weakened).
- `src/app/catalog.tsx` — new `JournalHeader`, `MilestoneScale`, `WaxSeal`, `JournalStat`,
  `NextMilestoneRow`, `ProgressTrack`, `StaggerReveal`, `RarityStampTabs`, `RarityStamp`,
  `ComboStamp`, `StampFrame`, `StampTeeth`, `BandPage`; removed `CompletionHeader`, `MiniShelf`,
  `MiniShelfPopCell`, `NextOnShelf`, `SegmentedTabs`, `ItemsTab`, `LegendChip`, `Stat`,
  `CompletionNumber`, `miniFill`, `MINI_POP_MAX`. Deep links `?tab=combos` / `?item=` / `?combo=`
  preserved (`?tab=items` → COMMON page).

No changes to sim / contracts / items / fixtures (confirmed by `git status`).

## Verification

**Executed & observed:**
- `npx tsc --noEmit` → exit 0 (clean).
- `npx vitest run --no-file-parallelism` → **418 passed / 57 files** (baseline 411 + 7 new;
  transcription byte-identity + HC both green).
- `node --import tsx scripts/validate-fixtures.ts` → OK (7/7, untouched).
- **iOS simulator (booted iPhone 16 Pro, Metro reload + `simctl` screenshot)** — seeded a
  mixed-progress catalog (9/41 items, 4/20 combos = 21%, runsPlayed=4 so locked runsPlayed goals
  render) via clearly-marked TEMP-VERIFY scaffolding, **since reverted** (grep for TEMP-VERIFY / seed
  markers = clean; `index.tsx` restored byte-identical). Shots in `docs/review-packets/shots-b-m15/`:
  - `01-journal-header-mixed.png` — journal header with real mixed progress (21%, 9/41, 4/20 seal,
    star-lit milestone scale, "Reach 5 runs" 4/5 tick, leader-dotted stats) + stamp strip + COMMON grid.
  - `02-rarity-stamps.png` — the stamp strip (HEIRLOOM 0/4, RARE 1/11, FINE 3/12, COMMON 5/14 with
    real goal lines), COMMON selected.
  - `03-combos-trophy.png` — combos stamp selected → the trophy shelf renders under the new tab.
  - `04-textscale-130.png` — 130% text; header scales, NEXT MILESTONE wraps to two lines, all stat
    values fully visible (no clipping).
  - `05-high-contrast.png` — HC palette; darker ink, deep-teal seal with cream count reads clearly.
  - `06-stamp-zoom.png` — 2× crop of the RARE/FINE stamps (icon, count, goal line + fill).

**Inferred (read, not executed):**
- Reduced-motion instant paths (all `useReducedMotion` snaps) are code-verified, not sim-captured.
- VoiceOver labels (header summary, wax-seal, stamp tab semantics) are code-verified, not screen-reader tested.
- Wax-seal contrast: creamBright on **tealDark** computes ~5.6:1 (AA-normal pass); accentTeal was
  ~3.7:1 (fail) → switched the seal bed to tealDark. Hand-computed, not measured by the contrast script.

## Open gates / items for the reviewer

1. **Mount-stagger + progress motion = human eyeball.** Reanimated is invisible to headless checks;
   the stagger and to-value animations need a device/sim watch (the static end-states are captured).
2. **Serration prominence (taste).** The postage-stamp teeth read *subtly* at the shipped pastel
   tint (cream teeth on a cream page). Faithful to the deckle technique, but if a stronger perforated
   read is wanted, deepen the tint or the tooth color — a taste call for the human.
3. **Selected stamp can sit off-screen.** With COMMON/COMBOS selected, the inked stamp is at/beyond
   the strip's right edge (no auto-scroll-to-selected). Minor; add `scrollTo` if desired.
4. **Interpretation calls** above (filtering-tab model; missing concept image) — confirm before merge.
5. **Gallery card visual** not sim-captured (flag off by default); its integration is code-verified
   (kept gating + wrapped in the stagger).
6. **Dev LogBox notice.** After repeated fast-refresh reloads a generic "Open debugger to view
   warnings" toast appeared (shots 02/05); the **first clean load (shot 01) had none**, and it
   correlates with the temp-scaffold reload churn. RN JS warnings route to Metro's console, not
   os_log, so I could not capture the text headlessly — worth a glance at Metro output, but not
   attributable to the shipping components from the evidence.
