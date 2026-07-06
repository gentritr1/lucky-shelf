# Fable Review — A-M3 (Integration Plumbing)

**Verdict: ACCEPTED** (2026-07-06). Lane A's half of the merge is solid: real sim drives
real UI end to end. I played a full loop myself on web (below). This unblocks Lane B's
M3 polish pass; the **fun gate stays open** until that pass + device recordings land,
which is correct — the fun gate judges the *integrated, polished* build, not the plumbing.

## Verified independently (not just packet-read)

- Gates re-run: tsc clean; **51/51 tests** (9 files); fixtures valid.
- **Full playable loop, Fable-driven, web @ 375×812:** New Run → routed to `/draft` at
  **Day 1 delivery with real seeded offers** (Wine/Tea Tin/Lucky Bamboo) → Draft Wine →
  `/run` arrange → Place Delivery → Open Shop → **real CascadeLayer played the actual
  `lastScoringTrace`** (wine base 4, dayTotal 4) → Continue → **Day 2 delivery, fresh
  real offers**. R-31 (pure `createRun` day-1 start) and phase-routing both confirmed
  live.
- **Fuzz degenerate check (200 runs × 3 strategies, integrated build):** greedy and
  combo both median deepest-rent 7; neither beats the other by >2× — **M3 economy
  criterion passes**. Numbers match table-v1 within noise; integration didn't move the
  economy.
- `vanish` and restock buy/place/reroll/end covered by the new engine tests (the
  browser rent-survival branch legitimately had 0 coins post-rent, so the test carries
  the buy path — acceptable, the test is real).

## Findings (all → Lane B M3 polish, none block acceptance)

- **F-M3-1 (the handoff item, confirmed live):** `CascadeLayer` has no `onComplete`, so
  Lane A mounted it as-is and bolted an external Continue button. I saw the seam: while
  day 1's cascade plays, the HUD header already reads "DAY 2 Delivery," and two advance
  affordances coexist (external Continue + the layer's own Play again). Works, but the
  cascade should **own its beat as an overlay you haven't navigated past**. This is
  Lane B's to fix — it owns the layer (see R-36).
- **F-M3-2 (new, found in review):** the placeholder glyph map is incomplete now that
  offers draw from the full 36-item table — Tea Tin and Flower Vase render as 📦. The
  `📦` fallback should never appear in normal play (see R-38).
- **F-M3-3:** draft "place" is still a first-empty-slot button, not the delivery-tray
  gesture — Lane A flagged it; it's Lane B M3 scope as planned.

## Rulings on §5 questions + findings

- **R-36 (Q1 / F-M3-1):** Explicit post-cascade Continue is **accepted as the plumbing
  handoff**. Lane B adds `onComplete?: () => void` to `CascadeLayer` (surfaced from
  `useCascadePlayer` at terminal `dayTotal`), and reworks the openShop moment so the
  cascade is a **modal overlay over the arrange HUD** — it plays, fires `onComplete`,
  and only then does the phase advance/route happen. No "DAY 2" header behind a day-1
  cascade, one advance affordance. Lane A rewires the route to the callback once it
  exists.
- **R-37 (Q2 / summary):** Minimal Lane A `/summary` **stays for M3**. Lane B gives it
  the real treatment at **M4**, where it shares the best-combo mini-trace replay tech
  with the Catalog (kickoff §9). Don't gate M3 on it; don't delete it either.
- **R-38 (F-M3-2):** Lane B completes `ITEM_GLYPHS` for all 36 items in the polish pass.
  Placeholder emoji are still fine (art is M4), but every item gets a distinct one; the
  📦 fallback must not show in normal play.

## The moment

This is the milestone the whole two-lane structure was built to reach: a contract frozen
at M0, an engine and a presentation layer built independently against fixtures, now
meeting with the seam holding. The loop plays. Next stop is whether it's *fun*.

## Next: Lane B M3 polish (then the fun gate)

- R-36 cascade overlay + `onComplete`; R-33 aura teal→gold retune; R-34 banner dock;
  R-38 glyph coverage; delivery-tray placement gesture (F-M3-3); first real `vanish`
  visual; then wire Lane A's route to the new callback.
- After that: **Fable fun gate** — full runs via your device recordings + the fuzz
  degenerate re-run (already passing). "Is a full run genuinely moreish with placeholder
  art?"
