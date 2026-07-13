# B-M14 — Picture Gallery ("The Paintings") — review packet

**Implementer:** Opus 4.8 (Lane B). **Branch:** `graduation-flip` (started `129cd54`). **Status:**
implemented, UNCOMMITTED, flag default OFF. Brief: `docs/lane-b/picture-gallery-brief.md`.

Four paintings revealed piece-by-piece from the ALREADY-persisted catalog, hung via a one-time 3×3
slide-puzzle ceremony, shareable via the existing view-shot pipeline. Zero sim/contract/economy/
fixture/pin impact (verified: no such file is in the diff).

## Flag discipline

`PICTURE_GALLERY_ENABLED` (default **false**) lives in the NEW UI module `src/ui/featureFlags.ts` —
NOT `src/sim/economy.ts`, NOT in `BALANCE_FLAG_ENV_KEYS`. The env override (`PICTURE_GALLERY=…`
shape, `'1'`/`'0'`) exists only so unit tests can exercise both flag worlds; on device the compiled
default holds. Flag OFF ⇒:
- no Catalog entry card (`catalog.tsx` renders it only under `pictureGalleryEnabled()`);
- the `/gallery` route bounces to `/` before reading any store (file-based routing means the URL
  exists regardless, so the screen self-guards);
- boot hydration of `galleryStore` is skipped (`_layout.tsx`), and `galleryStore.loadGallery` /
  `hangPainting` are themselves no-ops that never touch storage when off.

Flip-to-ON is the one-line change in `featureFlags.ts` after the human eyeball (Fable does it).

## Derived thresholds (the threshold scar — NOTHING invented)

Producing/asserting script: **`scripts/gallery-thresholds.ts`**
(`node --import tsx scripts/gallery-thresholds.ts`). It reads `loadItemTable()`, `loadCombos()`, and
`UNLOCK_LADDER`, and asserts completability, strict monotonicity, and P1-earlier-than-P4. Live
counts it read: **41 items, 20 combos, 5 signature items, RUNS_CAP = 20** (the max `runsPlayed` gate
in the unlock ladder). Executed output:

| # | painting | reveal grid | pieces | source metric | thresholds | final / reachable max |
|---|----------|-------------|--------|---------------|-----------|-----------------------|
| 1 | still-life (First Shelf) | 3×3 | 9 | distinct items discovered | 1,2,4,6,8,10,12,14,16 | 16 / 41 items |
| 2 | counter-cat (The Counter Cat) | 3×3 | 9 | named combos achieved | 1,2,3,4,5,6,7,9,11 | 11 / 20 combos |
| 3 | stockroom (Golden Hour Stockroom) | 4×4 | 16 | stockroom score* | 1,2,3,4,5,6,7,8,9,10,12,14,16,18,21,24 | 24 / 25 floor |
| 4 | dusk (The Lucky Shelf at Dusk) | 4×4 | 16 | items + combos | 8,13,18,23,28,32,36,40,43,46,49,52,54,56,57,58 | 58 / 61 entries |

*Stockroom score = `min(runsPlayed, RUNS_CAP=20)` + signature discoveries (0–5) + record tiers
(best-day/longest-run/deepest-rent, ACCELERATORS only). Completability is proven by the
**runs+signatures FLOOR = 20 + 5 = 25 ≥ 24**, so completion never depends on the unbounded record
tiers — they only fill the stockroom faster. Note: the reveal grid (16 cells) is distinct from the
assembly puzzle, which is ALWAYS 3×3 (a 4×4 slide frustrates).

**Escalation (c):** P1 completes at 39.0% of its pool (16/41); P4 at 95.1% (58/61) — P1 meaningfully
earlier. Assertions also enforced as unit tests in `src/state/galleryModel.test.ts`.

Report-only pacing note (not a blocking band): under this mapping P1 asks for 16 discoveries, P2 for
11 combos, P3 for ~20 runs' worth of play plus signatures, and P4 for a near-complete catalog — an
escalating-rarity arc, richest last.

## Assets

Source in `~/Desktop/lucky-shelf-images/`, processed with `sips` into `assets/gallery/` (1024×1024
JPEG q≈85). Paintings 3 & 4 were cropped a centred 884² square (70px inset — clears the ~60px
painted-paper border + deckle) then resized to 1024, so the bundled asset is the interior only.

| file | source | processing | size |
|------|--------|-----------|------|
| painting-1-still-life.jpg | `…a_small_wooden__0dc5d3e4…png` | q85, no crop (cream-ground square) | 237 KB |
| painting-2-counter-cat.jpg | `rerolled-counter-cat-A.png` | q85, no crop (cream vignette) | 252 KB |
| painting-3-stockroom.jpg | `…interior_of_a_t_e5577aa8…png` | crop 884² inside border → 1024, q85 | 372 KB |
| painting-4-storefront.jpg | `rerolled-storefront-B.png` | crop 884² inside border → 1024, q85 | 429 KB |

All ≤ ~450 KB. Wired through the literal-require map `src/ui/gallery/paintingImages.ts` (sprites.ts
pattern). Verified visually (Read of the processed jpgs): crops removed the cream border/deckle
cleanly, full-bleed interior.

## Persistence (isolated, scar-compliant)

`src/persistence/gallery.ts` — own key `luckyShelf:gallery:v1`, shape `{ hungPaintingIds: string[] }`
only (revealed pieces are DERIVED, never stored). `src/state/galleryStore.ts` applies every scar:
flag-gated read/write, **load-guard before any write** (a hang hydrates first, so a write-before-load
can't wipe a prior save), corrupt/missing/version-mismatch → empty set without wiping anything, and a
round-trip incl. the write-before-load attack — all tested. The catalog store is READ-ONLY here.

## Verification

Commands run under node v20.19.4 (`~/.nvm/versions/node/v20.19.4/bin`); pnpm broken → raw commands.

- **`npx tsc --noEmit`** — clean. (executed & observed)
- **`npx vitest run --no-file-parallelism`** — **411 passed / 411** (375 baseline + 36 new). (executed & observed)
- **`node --import tsx scripts/validate-fixtures.ts`** — 7/7, untouched. (executed & observed)
- **`node --import tsx scripts/gallery-thresholds.ts`** — ALL ASSERTIONS PASSED. (executed & observed)
- **Diff scope** — `git status` shows NO `src/sim`, `src/contracts`, `src/items`, or `fixtures`
  file. (executed & observed)
- **Byte-identical flag-off** — `galleryStore` test proves flag-off `loadGallery`/`hangPainting`
  touch no storage; `catalog.styles.test.ts` byte-identity still green (new gallery-entry keys added
  to both sheet and its independent transcription; they render only when the flag is on). The route
  self-guard + catalog conditional render mean no gallery UI is reachable off. (executed & observed)

### Per-item, on the iOS Simulator (booted iPhone 16 Pro, `simctl` + computer-use)

Seed harness was a TEMP-VERIFY block in `index.tsx` + the flag const flipped true; **both fully
reverted** — `git diff src/app/index.tsx` is empty, flag is back to `false`, no `TEMP-VERIFY`/`SEED_`
markers remain (grep clean), and the sim's seeded AsyncStorage was cleared + relaunched to a clean
title. Shots in `docs/review-packets/shots-b-m14/`:

| shot | what it proves | register |
|------|----------------|----------|
| 01-mixed-progress.png | First Shelf partial 4/9 — windowed cells + parchment silhouettes, teal progress | executed & observed |
| 02-assemble-cta.png | Counter Cat complete 9/9 → **Assemble** CTA | executed & observed |
| 03-stockroom-partial.png | 4×4 reveal grid partial 11/16 | executed & observed |
| 03b-dusk-low.png | 4×4 reveal grid low 4/16 (locked-feeling P4) | executed & observed |
| 04-hung-painting-share.png | hung First Shelf: full painting + flavor + **Share Painting** | executed & observed |
| 05-mid-puzzle.png | assembly ceremony: scrambled 3×3 puzzle + gap + "Hang it for me" | executed & observed |
| 06-text-130.png | 130% large-text pass — headings/captions/pill/button scale, no overlap | executed & observed |
| 07-high-contrast.png | high-contrast pass — sheet re-themes (darker ink / lighter cream) | executed & observed |

Additionally **tap-to-slide verified on device**: tapping the tile right of the gap slid it into the
gap and moved the gap right (observed via zoom of the framebuffer before/after). Solvability/parity,
legal-move reducer, solved detection, and hang-for-me equivalence are covered by
`src/ui/gallery/slidePuzzle.test.ts` + `galleryStore.test.ts` (executed & observed via vitest).

## Open gates (need a human/Fable pass)

1. **Ceremony feel** (human eyeball): tile-slide is an instant re-render swap (no tween) — chosen
   deliberately to avoid the Fabric transform scars and to satisfy reduced-motion (instant snaps).
   Whether a slide tween is worth adding is a taste call; motion beyond end-states is not
   sim-verifiable headlessly.
2. **Flag flip to ON** — deferred to Fable after the eyeball (non-goal for this task).
3. **Threshold pacing** — the numbers are proven completable/monotone/escalating, but the *feel* of
   the curve (how many runs to each painting) is a tuning call better judged from Gate-3 alpha data;
   the report-only note above is the current read, not a measured band.

## Files (all uncommitted)

New: `src/ui/featureFlags.ts`, `src/state/galleryModel.ts` (+test), `src/state/galleryStore.ts`
(+test), `src/persistence/gallery.ts` (+test), `src/ui/gallery/slidePuzzle.ts` (+test),
`src/ui/gallery/paintingImages.ts`, `src/app/gallery.tsx`, `src/screen-styles/gallery.styles.ts`,
`scripts/gallery-thresholds.ts`, `assets/gallery/*.jpg` (×4), this packet + shots.
Modified: `src/app/_layout.tsx` (flag-gated boot hydration), `src/app/catalog.tsx` (flag-gated entry
card), `src/screen-styles/catalog.styles.ts` (+ entry-card styles) and `.test.ts` (transcription),
`src/persistence/asyncStorage.ts` (wire gallery persistence), `src/ui/index.ts` (re-export flag).

NOT mine (pre-existing working-tree edits): `docs/lane-b/picture-gallery-idea-2026-07-13.md`,
`docs/lane-b/catalog-collectors-journal-brief.md` (a separate B-M15 brief).
