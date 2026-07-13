# B-M15 — Catalog restyle: "Collector's Journal" (mockup variant 3, precision pass)

**Ruled by:** Fable, 2026-07-13 (human-directed: "update the layout to be as premium as the 3rd
concept — be precise to it"). **Implementer:** Opus 4.8 (Lane B). **Branch:** `graduation-flip`,
START ONLY after B-M14 (picture gallery) lands — B-M14 adds a Gallery entry to this same screen;
integrate it into the new layout, do not drop it.

## Intent

Restyle the Catalog screen to the human-chosen "Collector's Journal" concept: a handcrafted paper
journal header card + stamp-like rarity cards, visually rich, gently animated — the premium
"collecting feels great" read. This is a RESTYLE: same data the view models already pay, same
navigation (rarity tabs → album grid → showcase modal), no new mechanics.

**Design kinship:** the Run Summary just shipped a paper-receipt language (deckled edge, ledger
leaders, star stamps — see `src/app/summary.tsx`). The journal is the catalog's dialect of the SAME
language: reuse its texture ideas and tokens so the app reads as one hand.

## The mockup-affordance filter (scar fired on the LAST catalog round — non-negotiable)

The concept sheet contains fake affordances. Precision to the mockup applies to LOOK, not to
invented data. Explicitly:

**Real — render (all already in `src/state/catalogStore.ts` view models):**
- Completion % (`completionPct`) as the large journal number.
- "N / M items discovered".
- Combos achieved/total (existing combo view) as the green wax-seal-style badge.
- NEXT MILESTONE row = the EXISTING `nextUnlockTeaserView` (real predicate, real progress bar,
  silhouette thumb) restyled into the journal row with its "8/9" fraction.
- Stats cells: Runs, Best day, Longest run, Deepest rent — with dotted leaders, receipt-style.
- Per-rarity stamp cards: rarity name, icon, discovered/total count.

**Fake — strip or substitute:**
- "All-time 3364c": there is NO persisted lifetime-coins stat. Do NOT add one (additive persisted
  fields = wipe-risk surface for a display number). Use Longest run as the fourth cell.
- Per-rarity "Reach N runs" goal lines: only render on a stamp when a REAL locked item of that
  rarity has a numeric `runsPlayed` predicate (the per-item progress view exists) — show the
  nearest such real goal; otherwise the stamp shows count only. Never fabricate a per-rarity goal.
- The 0/25/50/75/100% milestone track: render as PASSIVE scale dots filled by real completionPct.
  No medals, no rewards at 25/50/75 — nothing may imply a payout the sim doesn't have.
- No dates, no "premium" copy, no decorative text implying features.

## Layout spec (precise to variant 3)

1. **Journal header card** (replaces the current progress-card arrangement): paper card with a
   subtle journal treatment — stitched/edge border, a slightly rotated page feel is fine if cheap;
   inside: script-style "Collector's Journal" title line (Baloo2 italic styling — no new fonts),
   big completionPct + "COMPLETE" caption on the left; "N / M items discovered" top right; the
   milestone dot-scale beneath (first dot = star when >0%); combos wax-seal badge left of the NEXT
   MILESTONE row (teaser restyled: silhouette thumb, label, progress bar + fraction right); then
   the four stat cells in a leader-dotted row. The Shelf-Growth progress card's CONTENT merges into
   this card (do not show two competing progress cards; keep its filling-shelf motif if it fits,
   else retire it — record which).
2. **Rarity stamps** (replaces the current rarity tab chips): postage-stamp look — serrated edge
   (reuse/adapt the summary deckle technique), pastel tint per rarity from HC-safe token pairs,
   rarity icon, discovered/total, optional REAL goal line per the filter above. They remain the
   TAB control (selected state = pressed/inked stamp; accessibilityRole tab preserved).
3. **Album grid + showcase modal + trophy shelf (combos tab)**: keep current structure; only
   re-skin surfaces that visually clash with the journal (list what you touched).
4. **Gallery entry (from B-M14)**: give it a journal-native home — e.g. a "Paintings" page-corner
   card under the header — same flag gating as B-M14 built.

## Motion ("visually rich and animated" — within discipline)

- Mount: gentle stagger of journal card → stamps → grid (expo-router already animates screen
  mounts — the scar says blanket entrances get masked; stagger INSIDE the screen, short and subtle,
  spring pattern from `screen-animations` memory).
- completionPct bar/dots and teaser progress animate to value on mount (400–600ms, once).
- Stamp select: the established press-spring. New-discovery accent (existing pattern) unchanged.
- Reduced motion: ALL of the above instant. No particles, no loops, no Skia.

## Discipline

- Themed factories + tokens only (`useThemedStyles`/`usePalette`); new decorative colors become
  tokens with HC pairs; AA at normal contrast, AAA HC where the app already does.
- 130% text: nothing clips; the header card may grow/scroll per the screen's existing behavior.
- VoiceOver: header reads one sensible summary ("Collection 21 percent complete, 9 of 41 items…"),
  stamps keep tab semantics + counts, teaser keeps its existing label.
- View models: reuse existing selectors; any NEW derived display value is a pure view-model
  function in `src/state/` with tests (no screen-side math, no new persistence, catalogStore
  mutations forbidden).
- Route hygiene: no new files under `src/app` except existing routes; styles in
  `src/screen-styles/catalog.styles.ts` (+test transcription updated, coverage not weakened).

## Verification

`npx tsc --noEmit`; `npx vitest run --no-file-parallelism` 100% green; fixtures 7/7 untouched; sim
shots (booted iPhone 16 Pro, recipe in `ios-ui-verify-on-simulator.md` memory) to
`docs/review-packets/shots-b-m15/`: journal header with real mixed progress, rarity stamps row
(one selected), combos tab, 130%, high contrast, plus a zoom crop of one stamp. Revert all seed
scaffolding (list carriers). Packet `docs/review-packets/B-M15-collectors-journal.md`: mockup→real
mapping table (rendered vs stripped, with reasons), files touched, executed-vs-inferred
verification, shots, open gates (mount-stagger motion = human eyeball).

## Non-goals

New stats or persistence, milestone rewards, catalog data changes, gallery internals (B-M14 owns
them), share card, sim/economy/contracts/fixtures, committing (Fable reviews first).
