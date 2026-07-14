# B-M14 — Picture Gallery ("The Paintings"): milestone-earned art + slide-puzzle hanging

**Ruled by:** Fable, 2026-07-13. **Human decision:** feature freeze explicitly OVERRIDDEN for this
one feature ("build the gallery"). **Implementer:** Opus 4.8 (Lane B). **Branch:** `graduation-flip`
on `129cd54`, clean tree. Design authority: `docs/lane-b/picture-gallery-idea-2026-07-13.md` (read it).

## What it is

Four gallery paintings, each revealed piece-by-piece by collection milestones the game ALREADY
persists, then "hung" via a one-time 3×3 slide-puzzle assembly ceremony. Hung paintings can be
shared/saved via the existing share pipeline. Pure additive meta-UI: **zero sim, contract, item,
scoring, economy, fixture, or determinism-pin impact.** Anti-casino line: pieces are NEVER
purchasable; no coins involved anywhere.

## Flag

`PICTURE_GALLERY_ENABLED`, **default OFF**, in a NEW UI-level module (e.g. `src/ui/featureFlags.ts`)
— NOT `src/sim/economy.ts` and NOT in `BALANCE_FLAG_ENV_KEYS` (it has zero balance meaning; keep the
balance harness's flag world untouched). OFF = no gallery route access, no menu/catalog entry, no
new persistence reads/writes; the app is byte-identical in behavior. Flip-to-ON is a separate
one-line commit after the human eyeball.

## Assets (files are OUTSIDE the repo — process them in)

Source files in `~/Desktop/lucky-shelf-images/`:

1. Still-life keeper: `gentlegen_flat_gouache_storybook_illustration_a_small_wooden__0dc5d3e4-*.png`
2. Counter cat: `rerolled-counter-cat-A.png` (Fable-recommended pick)
3. Stockroom keeper: `gentlegen_flat_gouache_storybook_illustration_interior_of_a_t_e5577aa8-*.png`
   — **crop INSIDE its painted paper border** (the artwork has a painted frame; the bundled asset
   must be the interior only, square)
4. Storefront: `rerolled-storefront-B.png` — also crop inside its paper border.

Pipeline (macOS `sips` is available): square-crop where needed → resize to 1024×1024 → export JPEG
(quality ~85, no alpha needed) into `assets/gallery/` as `painting-1-still-life.jpg` …
`painting-4-storefront.jpg`. Each ≤ ~450KB; state final sizes in the packet. Wire through a typed
require map (follow the `sprites.ts` + manifest pattern). Keep painting metadata (title, piece grid,
source metric, flavor line) in ONE pure module.

## Unlock model (pure + derived; ZERO new progress persistence)

Piece counts: paintings 1–2 are 3×3 (9 pieces), 3–4 are 4×4 (16 pieces). Progress derives from the
persisted catalog (`catalogStore` — READ ONLY; the catalog-wipe scar means you never merge-write it):

- **P1 "First Shelf"** — distinct items discovered.
- **P2 "The Counter Cat"** — named combos achieved.
- **P3 "Golden Hour Stockroom"** — a monotone cross-run ladder over existing catalog stats
  (runs played, best-day, longest-run, deepest-rent tiers, signature discoveries).
- **P4 "The Lucky Shelf at Dusk"** — overall catalog completion (discoveries + combos together).

**Threshold scar (fired 5×, non-negotiable):** every piece threshold must be DERIVED from the real
tables/data, not invented. Write a small derivation script or test that reads `loadItemTable()` /
`loadCombos()` and the unlock pools, and asserts: (a) every painting is COMPLETABLE (its final
threshold is achievable given the real counts — e.g. never demand 9 combos if fewer exist, never
demand more discoveries than the offerable pool), (b) thresholds are strictly monotone, (c) P1
completes meaningfully earlier than P4 (escalating-rarity intent). Name the script/test in code
comments and in the packet, with the derived numbers printed. A report-only pacing note (e.g. which
run count a ceiling-bot corpus reaches each painting at) is welcome; do NOT create a blocking band.

The mapping lives in a pure module (e.g. `src/state/galleryModel.ts`) with unit tests: catalog
snapshot in → per-painting `{piecesRevealed, total, complete}` out. Screens consume a view model
via the store-boundary pattern (never import `@/items` or `@/sim` values in screens).

## New persistence (ONE tiny store, additive, isolated)

Only "hung" needs storing (revealed pieces are derivable). New `galleryStore` with its OWN storage
key (never touching run saves or the catalog key): `{ hungPaintingIds: string[] }`. Apply every
persistence scar: load-guard before any write (never save without having loaded — the
record-without-load overwrite scar), hydration on boot gated by the flag, corrupt data → treated as
empty without wiping anything else, and load/persist round-trip tests including the
write-before-load attack. Flag OFF ⇒ the store is never read or written.

## Gallery UI

Route `src/app/gallery.tsx` (+ themed styles in `src/screen-styles/gallery.styles.ts` — NEVER
co-located under `src/app`, that's the router scar; verify with getRoutes if you add the route).
Entry point: a Gallery card/button on the Catalog screen (flag-gated) — follow the catalog's
existing visual language. Do not add it to mid-run screens.

- One card per painting: title, piece grid rendered as cells that window the full image (per-cell
  `overflow:hidden` + offset Image — do NOT ship pre-sliced piece assets), unrevealed cells =
  parchment/silhouette treatment (reuse the established silhouette pattern), progress caption in
  plain language naming the SOURCE ("Discover new items to reveal pieces", "6 of 9").
- Complete + not hung → "Assemble" CTA. Hung → full painting, flavor line, Share/Save button using
  the existing `react-native-view-shot` share pipeline (B-M10 pattern; reuse, don't fork).
- No mid-run interruptions ever: new-piece states surface only when visiting the gallery (the
  catalog "new" accent pattern). No toasts during runs.

## Assembly ceremony (the human's slide puzzle)

On "Assemble": the completed painting's image scrambles into a **3×3 slide puzzle** (8 tiles + one
gap — 3×3 for ALL paintings including the 4×4-reveal ones; 4×4 slide puzzles frustrate). Seeded
scramble that is (a) deterministic per painting, (b) **solvable — enforce the 15-puzzle parity
invariant with a unit test**, (c) not already solved. Interaction: TAP a tile orthogonally adjacent
to the gap to slide it (tap-to-slide is also the accessible path; add clear accessibility labels
"tile 3, row 1 column 3, movable"). Reduced motion: instant snaps. Solved → brief settle beat →
painting "hangs" (persist via galleryStore) → return to gallery with the full painting. A
**"Hang it for me"** button is always visible and grants the identical result (accessibility floor:
the puzzle must never gate the reward). No coins, no rewards beyond the hang + share.

Keep the puzzle logic in a pure module (`src/ui/gallery/slidePuzzle.ts` or similar) with tests:
scramble parity/solvability, legal-move reducer, solved detection, "hang for me" equivalence.

## Verification (node v20.19.4 default; pnpm broken — use raw commands)

- `npx tsc --noEmit` clean; `npx vitest run --no-file-parallelism` 100% green (375 baseline + yours);
  `node --import tsx scripts/validate-fixtures.ts` 7/7 (untouched); determinism pins untouched —
  if any sim file is in your diff you are out of scope, stop.
- Flag OFF check: with the flag at its default OFF, grep/assert no gallery route entry is reachable
  and no gallery storage key is touched (test it).
- Simulator (booted iPhone 16 Pro, recipe in project memory `ios-ui-verify-on-simulator.md`):
  shots to `docs/review-packets/shots-b-m14/` — gallery with mixed progress (partial P1, locked
  P4), a completed painting's Assemble CTA, mid-puzzle state, hung painting with Share, plus 130%
  text and high-contrast passes of the gallery. Revert every seed scaffold afterward (list which
  files carried it).
- Packet `docs/review-packets/B-M14-picture-gallery.md`: derived thresholds table + the script that
  produced them, asset sizes, per-item verification (executed-and-observed vs inferred), shots,
  open gates (human eyeball on ceremony feel; puzzle motion is sim-verifiable only as end-states).

## Non-goals

Coin purchases of pieces (never), mid-run toasts, 4×4 slide puzzles, new dependencies, Skia,
sim/contract/economy/fixture changes, share-card renderer changes, flipping the flag ON (Fable does
that after the human eyeball), committing (leave everything uncommitted for Fable review).
