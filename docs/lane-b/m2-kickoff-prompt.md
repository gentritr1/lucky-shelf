# Prompt for Lane B (Opus 4.8) — M2 kickoff

Copy everything below the line into a fresh Opus 4.8 session running in
`/Users/gentlegen/Desktop/lucky-shelf`.

---

You are **Lane B (Opus 4.8) — UI & Presentation** on **Lucky Shelf**. Your M1
(shelf scene, drag feel, shells) was **accepted** — read the review first. M2 is the
crown jewel: **the cascade.** Pillar 2 is law: every coin explained; if the UI can't
animate it from the trace, the trace is wrong and that's a Lane A bug — but nothing in
the six goldens is wrong, they're engine-verified.

## Read first, in order

1. `docs/review-packets/B-M1-fable-review.md` — your acceptance + rulings R-22…R-26,
   two findings (F-B1 already patched by Fable in `DraggableItem.tsx` — sticky grabs
   are now silent; F-B2 copy nit is yours this milestone).
2. `docs/lucky-shelf-kickoff.md` §4 (TraceEvent vocabulary — includes CCR-1's
   `vanish`), §6 (your lane), §9 (M2 accept: "Fable can follow every coin in a
   recorded cascade without pausing").
3. `docs/lane-b/motion-spec.md` §4 — your own cascade spec, Fable-approved.
4. Trace semantics rulings: `A-M0-fable-review.md` **R-6** (a ruleFire's count-up
   ticks on the slot whose runningTotal it modifies — sourceSlot is whose rule it is,
   arrow flows source→target), **R-9** (once rowAura fires, the row glow persists
   until dayTotal), R-2 (comboNamed = catalog moment, no coins), R-7 (itemTotal is
   final). `B-M0-fable-review.md` **R-17** (speed control visible from run 1),
   **R-18** (skip lands on dayTotal slam + rent thud).
5. `fixtures/m0-fixtures.json` — six golden traces; build the cascade against ALL six
   (they cover: flat adjacency, perAdjacent ×3 + comboNamed, mirror copy, rowAura +
   neighbor grant, scoresLast deferral, transform).

## Project state (verified)

- Your M1 kit + juice layer all live; 33/33 tests green; tokens unchanged.
- Lane A may be running M2 in parallel (saves + store wiring + R-20 fixture
  regeneration). The regenerated fixtures only change `traceId` format (you confirmed
  you don't key on it) and may add a 7th sticky arrange fixture (R-23) so you can
  retire `mockShelf.ts` — adopt it if it lands, don't block on it.

## Your M2 scope

1. **CascadeLayer** (`src/juice/`) — consume a ScoringTrace event list verbatim,
   sequentially, per motion-spec §4:
   - cadence 260 ms/event at 1×; **SpeedControl 1× / 2× / skip always visible (R-17)**;
     skip jumps to dayTotal and still plays the slam (+ rent thud on due days, R-18).
   - `itemBase`: slot pulse + value tag pop.
   - `ruleFire`: arrow draws sourceSlot→targetSlot (180 ms, `arrowPalette` cycling per
     source); **count-up ticks on the beneficiary slot per R-6** (the slot whose
     runningTotal moved — NOT always the targetSlot; fixtures 1 vs 4 differ exactly
     here, get both right).
   - `rowAura`: row glow sweep that **persists until dayTotal (R-9)**.
   - `comboNamed`: banner with `overshoot` easing + `comboBanner` haptic; contributing
     slots twinkle; no coin change (R-2).
   - `itemTotal`: total stamps and is final (R-7 — nothing may retro-tick it).
   - `transform` / `vanish`: morph / puff after totals, before dayTotal.
   - `dayTotal`: coin-counter slam via `dayTotalSlam`.
   - Haptic escalation via the existing gateway's `cascadeStepHaptic`
     (`cascadeEscalation` thresholds); audio is placeholder hooks only (M3).
   - Reduced-motion: cascade becomes stepped card-flips (instant transforms, kept
     sequence + haptics) — propose exact behavior in your packet if this reading is
     wrong.
2. **Cascade harness screen** — a dev-facing route that loads ANY of the six golden
   traces and plays them (this is how Fable reviews M2: recording of goldens 2, 4,
   5 back-to-back). Add "play again" + trace picker. Tasteful but dev-tier polish.
3. **Delivery draft screen** — 1-of-3 OfferCards (kit exists) → draft → the drafted
   item drag-places onto the shelf (mock or store state, whichever Lane A has landed).
4. **Restock screen** — offers with cost ribbons, reroll button, sell mode toggle,
   endRestock. Mock-data-driven if the store isn't wired yet.
5. **Cleanups assigned in review:** R-25 — add the web `boxShadow` branch inside
   `tokens.ts` (pre-signed token change; native `shadow*` identical). F-B2 — HUD hint
   says "honey-ringed jar", the sticky item is the cheese; fix the copy.
6. **CoinCounter count-up + slam variants** (your inventory marked M2).

## Boundaries

- Yours: `src/ui`, `src/juice`, screen files in `src/app`. NOT yours: `src/sim`,
  `src/items`, `src/persistence`, `src/contracts` (frozen; CCR via packet if truly
  needed), `/fixtures` (Lane A regenerates them — you consume).
- UI never computes rules: the cascade renders ONLY what the trace says. If a trace
  seems to imply math the events don't show, that's a packet question, not a UI patch.
- If Lane A's store lands mid-milestone, consume selectors only; never import sim
  internals. Coordinate nothing else — fixtures + contracts are the seam.
- Skia remains a swappable layer with the RN fallback on web (your KI-1 pattern);
  arrows/sparks may be Skia native + simplified RN web equivalents — flag whatever is
  device-verify-only.

## Environment quirks

Same as M1, verbatim: Node v20.19.4 arm64 via PATH prepend (never v23.3.0); corepack
pnpm broken → `node_modules/.bin/*` directly; don't regress `babel.config.js`;
CanvasKit wasm not served here → `WEB_SKIA_ENABLED=false` stands. **Use the
`expo-web-b` launch config (port 8091)** — 8090 belongs to the Fable session. A Lane A
session may be editing `src/app/store.ts`, `run.tsx` wiring, `src/persistence` —
leave those alone.

## Definition of done

1. tsc strict clean; all existing tests green (plus any you add).
2. Web at 375×812: harness plays all six goldens end-to-end, no runtime errors;
   every event kind visibly distinct; R-6/R-9/R-17/R-18 behaviors demonstrable;
   screenshots captured (start, mid-cascade with persistent aura, combo banner,
   dayTotal slam).
3. Draft + restock screens navigable from the HUD.
4. Post `docs/review-packets/B-M2-review.md` (§8 format) with a recording shot list —
   the M2 bar is "Fable can follow every coin in a recorded cascade without pausing";
   include goldens 2 (combo), 4 (aura + grant), 5 (scoresLast) in the shot list.
5. **STOP after the packet.**

Start by reading the listed files, then confirm understanding + ambiguities in one
short message before building.
