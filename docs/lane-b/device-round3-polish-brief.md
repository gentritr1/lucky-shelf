# B-M13 — device round-3 polish (human feedback 2026-07-13)

**Ruled by:** Fable. **Implementer:** Opus 4.8 (Lane B). **Branch:** `graduation-flip` on `4302338`, clean tree.
**Source:** the human played the current build on the iPhone 16 Pro simulator (post-intuitiveness,
post-retune) and returned five polish items. Overall verdict was positive ("way more intuitive") —
these are refinements, not redesigns. All five are pure presentation: **no sim behavior, contracts,
economy numbers, scoring, or flag changes.** The only `src/state` file you may touch is
`describeItemRules.ts` (+ its test), which is UI-side prose interpretation.

Project ground rules that apply here (do not relearn):
- Theme styles via `useThemedStyles`/`usePalette` factories and `src/ui/tokens.ts` tokens — never raw
  values, never new static StyleSheets on themed screens (`SpeedControl.tsx` currently has a static
  sheet + raw `Text`; see item 4).
- Text next to icon glyphs in Baloo2 needs the established `baloo2IconNudge()` treatment
  (`src/ui` — see the helper's own docs; context trap: do NOT nudge block-centered button text that
  has no adjacent icon).
- Emoji glyphs in UI were purged in favor of MCI icons (`@expo/vector-icons`) in the 07-11 polish
  round — do not reintroduce emoji; replace the one you'll find in item 4.
- Every visual item must not regress: 130% text scale, high contrast, reduced motion, VoiceOver
  labels. Normal-mode secondary text must keep AA (inkFaint was recently tuned to pass — don't
  darken/lighten it).
- Screens read view models from `src/state/store.ts`; never value-import `@/sim` or `@/items` in a
  screen.

---

## Item 1 (P1, bug) — rent chip clipped by the scoring overlay

**Symptom (screenshot evidence):** during Open Shop scoring, the cascade overlay
(`src/app/run.tsx` `styles.cascadeOverlay` + `src/juice/cascade/CascadeLayer.tsx`) draws its own
shelf HIGHER on screen than the HUD shelf, and the underlying HUD `statusRow` (`RentChip`,
`MovesPips`) peeks out half-covered behind the scrim — "RENT 36 due in 2 days" is clipped mid-pill.
Looks broken exactly when the player most needs the rent context (the day's payout vs rent).

**Fix direction (choose the cleanest, justify in the packet):**
(a) hide the HUD `statusRow`/`BuildSignpost` entirely while `cascadeMount` is up (the overlay
already owns the screen and already receives `rentDue`) and render rent context INSIDE the overlay
in a stable spot — e.g. a rent line near the Day Total area; or
(b) align the overlay's shelf to the HUD shelf's true position so nothing appears to move and the
status row stays fully visible above it.
Do NOT leave any half-visible HUD element behind the scrim. Note the existing comment in run.tsx:
the overlay draws its own shelf deliberately (double-shelf misalignment scar) — do not re-render
the HUD shelf under it.

**Acceptance:** seeded scoring-phase screenshots (normal + 130% text) show either a fully visible
rent chip or a deliberate, complete rent line inside the overlay — zero clipped elements anywhere
behind the scrim. Cascade timing/beats byte-identical (no `useCascadePlayer` changes).

## Item 2 (P2) — Daily Shop rule text: keep the information, shrink the footprint

**Symptom:** each Daily Shop row (`src/app/restock.tsx`) shows full rule prose always; with 4 rows
it reads text-heavy ("looks just a bit bad"). The human asked for a tooltip-like treatment: hints
available, less space.

**Fix direction:** compact row by default — item name, price, tags, and rule prose clamped to ONE
line with ellipsis. Tapping the row (not the Buy button) expands it inline (accordion) or shows the
existing inspector-card pattern with the full `itemRuleLines` prose; only one row expanded at a
time; expansion is instant under reduced motion. VoiceOver must still read the FULL rule prose on
the row itself (accessibilityLabel), not the truncated line — screen-reader users don't get the
visual truncation. Delivery/draft screen (`draft.tsx`) is fine as-is (selected-offer rules) — do
not change it.

**Guardrail:** this must not regress the audit's core win (rules visible AT the decision point).
The one-line clamp must show the rule's leading clause, and expansion must be a single tap with a
visible affordance (chevron or "more"). If the interpreter's first line is uninformative for some
item, fix the line ORDER in the view model, not the interpreter semantics.

**Acceptance:** screenshots of the 4-offer shop, collapsed and expanded, normal + 130% + HC; no
clipping; Buy targets stay ≥44pt; a `restock` styles/behavior test covering the expansion state.

## Item 3 (P2) — one word for adjacency, everywhere

**Fact:** adjacency in the sim is ORTHOGONAL-only (`src/sim/grid.ts` `NEIGHBOR_OFFSETS`: left,
right, above, below). The prose currently uses THREE terms for it (`describeItemRules.ts`):
"beside" (adjacentTo), "nearby" (perAdjacent), "neighbor(s)" (transforms/isolated/etc.). "Beside"
falsely implies horizontal-only; "nearby" implies radius. The human flagged exactly this.

**Fix direction:** canonicalize on **"next to"** in ALL rule prose:
- adjacentTo: "Earns +3 next to a cheese item" / "Scores ×1.5 next to a lucky item"
- perAdjacent: "Earns +3 for each cheese item next to it"
- isolated: "Earns +4 with nothing next to it"
- transformsAdjacent / vanishing gifts / threshold rules: same substitution, keep sentence shape.
- `copiesNeighbor` has a direction ("to its left") — keep directional wording, it is already exact.
Update `describeItemRules.test.ts` expectations to the new canonical wording (these tests pin
prose — updating them IS the point; do not delete any case). Update the "The Words" glossary page
(How to Play) to define **Next to** = "touching left, right, above, or below — diagonals don't
count", replacing any beside/nearby/neighbor entries, and sweep How-to-Play copy + onboarding hint
copy + any receipt/caption strings for the old terms so ONE vocabulary ships. Grep for
`beside|nearby|neighbor` across `src/` user-facing strings; leave code identifiers (e.g.
`copiesNeighbor`, `neighborsOf`) untouched.

**Acceptance:** grep shows no user-facing "beside/nearby" adjacency prose left (identifiers
exempt); glossary defines "Next to" with the diagonal exclusion; describeItemRules tests green with
updated snapshots; a screenshot of the glossary entry and one shop row with the new prose.

## Item 4 (P2, known scar) — SpeedControl centering + font

**Symptom (screenshot):** "1×", "2×", "Skip ⏭" sit visibly high/uncentered in their pills during
the cascade.

**Facts:** `src/juice/cascade/SpeedControl.tsx` uses raw `Text` + a static StyleSheet + typeScale
tokens directly, and an EMOJI glyph (⏭) beside Baloo2 text — the exact icon-adjacent Baloo2
centering scar, plus a leftover from before the emoji→MCI migration.

**Fix direction:** migrate SpeedControl to `AppText` + the themed-styles factory pattern; replace
⏭ with the appropriate MCI icon (match how other icon+label buttons do it); apply
`baloo2IconNudge()` ONLY where the label sits beside an icon (the 1×/2× labels are block-centered
pill text — the documented context trap says do not nudge those; fix their centering with layout,
e.g. lineHeight/includeFontPadding/textAlignVertical per the helper's docs). Keep 44pt targets and
the accessibility roles/states exactly as they are.

**Acceptance:** a ZOOMED screenshot of the control at rest and with 2× active — labels optically
centered both axes; no emoji in the JSX; component uses AppText/usePalette; existing cascade tests
green.

## Item 5 (P3) — Run Summary as a paper receipt ("Receipt Ledger" concept)

The human picked a concept direction (an AI mockup — you cannot see it; this prose is the spec):
the summary's stats block becomes a **paper receipt card**: slightly off-white paper on the scene
background, a subtle deckled/serrated bottom edge (and optionally top), header
"LUCKY SHELF GENERAL STORE" with a small clover mark and "Thanks for stopping by!" sub-line,
then ledger rows (label left, value right, dotted/rule leaders between them), a light handwritten
sign-off line (e.g. italic "Keep building!") at the bottom. "New record!" becomes a small
star + gold label sitting under/next to the value it belongs to (a stamp feel), replacing the
current chip treatment the human dislikes.

**Hard constraints (the mockup-affordance scar — mockups carry fake content):** the receipt shows
EXACTLY the data the current summary v2 already renders — outcome/day headline, build recap line,
coins earned, best day, longest run, deepest rent, their real New-record flags, the near-miss line
("Closest rent payment: N coins to spare"), and the existing next-unlock teaser if present. NO
dates, NO premium/upsell, NO signatures/stamps that imply mechanics (a decorative flourish is fine;
a fake postage stamp with a date is not). Do not add/remove/reorder any STAT the sim doesn't pay.
The one-story render order (B-M12) must not change. Buttons (New Run / Catalog / Share) stay
outside the paper, current behavior untouched. The share-card renderer is SEPARATE — do not touch
it in this brief.

**Implementation notes:** pure styles + local decorative components in the summary screen's themed
factory; deckle edge via a small SVG/Skia-free approach (zigzag border view or repeated triangles)
— NO new dependencies, NO Skia on this screen; must render identically-shaped in HC (use HC
palette tokens) and at 130% text (paper grows, nothing clips); reduced motion: no new animation at
all (any entrance stays whatever the screen already does).

**Acceptance:** screenshots normal / 130% / HC of a summary with at least one New record flag and
the near-miss line visible; equality of DATA rendered before/after (list the text nodes in the
packet); existing summary tests green (update style tests only where they pin the old chip look).

---

## Verification & deliverables (all items)

- `npx tsc --noEmit` clean; full serial suite `npx vitest run --no-file-parallelism` green
  (373 baseline + whatever you add); `node --import tsx scripts/validate-fixtures.ts` 7/7 (nothing
  here should touch it — if fixtures move, you broke the sim boundary: STOP and report).
- Node v20.19.4 default; `pnpm` scripts are broken on it (`node:sqlite`) — run the underlying
  `node --import tsx` / `npx` commands directly.
- Simulator screenshots: the recipe is in the project memory file
  `~/.claude/projects/-Users-gentlegen-Desktop-lucky-shelf/memory/ios-ui-verify-on-simulator.md`
  (simctl seed technique; the app is installed on the booted iPhone 16 Pro sim). Save all shots to
  `docs/review-packets/shots-b-m13/` with descriptive names. If the sim genuinely cannot be driven
  from your session, say so explicitly per item and mark those acceptance shots as REVIEWER TODO —
  do not claim visual verification you didn't perform.
- Review packet `docs/review-packets/B-M13-device-round3-polish.md`: per item — what changed, why,
  screenshot paths (or TODO), tests added/updated, and any wording decision you made that a native
  English speaker might quibble with (list alternatives).
- **Leave everything uncommitted.** Fable reviews (including re-running your failing paths) before
  anything lands; the human gets final eyeball on all five (visual work never closes on math alone).

## Non-goals

Drag feel, cascade timing/juice budget, share card, draft-screen layout, any economy/balance
number, placement-hint UI (separate flagged brief), discovery jingle, new features of any kind
(freeze until Gate 3).
