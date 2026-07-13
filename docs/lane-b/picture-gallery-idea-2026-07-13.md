# Idea capture — collection picture gallery ("buy items, reveal a painting")

**Status: NOT SCHEDULED — feature freeze until Gate 3 data (RELEASE-PLAN).** Human-proposed
2026-07-13 during the round-3 device session; Fable design ruling recorded here so the idea is
build-ready the moment the freeze lifts (or the human explicitly lifts it early). Asset
generation is external (Midjourney, human-run) and can proceed NOW — art has no code freeze.

## The idea (human)

Buying/collecting items gradually assembles a full painting, jigsaw-style. 3–4 paintings that get
progressively more premium. Unlocked paintings are downloadable.

## Fable design ruling (fit to the game's identity pillars)

- **Pieces map to real collection milestones, not coin spend.** Each painting is a grid of pieces;
  a piece reveals on a FIRST-TIME event the catalog already records: new item discovered, new combo
  achieved, runs completed, records set. This keeps it variety-not-power (pure cosmetic), anti-casino
  (you cannot buy art with coins — you earn it by playing wider), and zero-economy-impact (no
  contract/scoring change; reads the existing persisted catalog only — and the catalog store has
  load-guard scars: read-only consumption, never merge-write).
- **Escalating premium = escalating milestone rarity**, not price: painting 1 ≈ early discoveries
  (first ~12 catalog entries), painting 2 ≈ combo achievements, painting 3 ≈ deep-run records +
  signature discoveries, painting 4 ≈ near-complete catalog. Numbers must be derived from measured
  catalog progression curves at brief time (threshold scar: name the measurement script).
- **Reveal moment** joins the discovery-moment system (B-M11): on unlock, the piece flips in on the
  catalog/gallery screen; reduced-motion = instant. No mid-run interruptions.
- **Download** = the existing `react-native-view-shot` share pipeline (B-M10) pointed at the full
  painting view; saves/shares the finished art. No new dependencies.
- **Flag:** `PICTURE_GALLERY_ENABLED`, default OFF, additive persisted field only if strictly needed
  (prefer deriving reveal state from the catalog itself — zero new persistence = zero wipe risk).

## Asset spec (human runs Midjourney now if desired)

Four paintings, one shared style so the gallery reads as a set. Square (1:1) so piece grids are
clean (3×3 for painting 1–2, 4×4 for 3–4). No text in image. Style anchor matches the shipped
gouache sprites + title hero: flat gouache, storybook, cream paper ground, warm wood, mint/teal
accents, soft dusk golds. Prompts live in the session log / chat; final picks go through
`sprite-generation-pipeline`-style crop/resize before wiring.

## Art status (reviewed by Fable 2026-07-13, files in ~/Desktop/lucky-shelf-images/)

- **#1 still-life — KEEP** (palette/content on-brand; large cream margins → prefer reveal-grid use
  or tighter crop for slide tiles).
- **#2 counter cat — RE-ROLL** (background drifted white vs cream; pseudo-text on book spines +
  scale label; empty top-left). Re-roll with cream background + full-bleed + `--no text, letters,
  words, labels, typography`.
- **#3 stockroom — KEEP, crop inside its painted border** (border format mismatch vs 1/2; best
  full-bleed puzzle candidate).
- **#4 storefront — RE-ROLL for text** (gibberish fascia lettering; optionally soften toward
  gouache — style jump is acceptable as the premium capstone, text is not).
- Set-level: palette/subjects consistent; formats need unifying (vignette vs full-bleed, borders).
- **RE-ROLLS DONE (2026-07-13, human-approved style-transfer path):** the two MJ keepers were
  uploaded to Higgsfield as style anchors (explicit human approval — they are unreleased art) and
  flux_kontext generated style-matched replacements; four candidates saved as
  `~/Desktop/lucky-shelf-images/rerolled-counter-cat-{A,B}.png` and `rerolled-storefront-{A,B}.png`,
  all text-free. Fable recommends **cat A** (cream-vignette format pairs with keeper #1) and
  **storefront B** (painted-border watercolor format pairs with keeper #3); human picks final.
  An earlier text-only recraft_v4_1 attempt produced nice standalones but a visibly different,
  flatter style — kept only as fallback references in the session log.

## Assembly ceremony (human idea, Fable-shaped): reveal + slide puzzle combined

Pieces are EARNED via milestones (unchanged — the anti-casino spine). When a painting's final piece
unlocks, the gallery offers a one-time **assembly ceremony**: a 3×3 slide puzzle (always 3×3, even
for 4×4-reveal paintings — 4×4 slide frustrates) the player pushes together before the painting
"hangs". Conditions from the accessibility floor: skippable ("Hang it for me" button, same reward),
tap-swap alternative for VoiceOver (reuse the shelf tap-move pattern), reduced-motion instant
slides. Requires full-bleed art so every tile has visual anchors. Zero economy impact; the solve
grants nothing but the hang + download.

## When it can be built

After Gate 3 (external alpha) per the freeze — or earlier only by explicit human override recorded
here. Brief must include: milestone→piece mapping derived from measured catalog curves, byte-identical
flag-off path, catalog read-only guarantee, and device screenshots of reveal/HC/130%.
