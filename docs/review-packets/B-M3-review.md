# Lane B — M3 Review Packet (Integration Polish)

**Milestone bar (kickoff §9):** *"The seams disappear and the beats land — the
integrated build reads as one game, ready for the fun gate."*

M3 rulings owed: **R-36** (cascade overlay + `onComplete`), **R-33** (aura
teal→gold), **R-34** (combo banner dock), **R-38** (glyph coverage), plus
**F-M3-3** (delivery-tray gesture) and the first real `vanish`. Pre-build
rulings **R-39/R-40/R-41** (see `B-M3-prebuild-rulings.md`) are folded in below.

---

## 1. Built vs. milestone criteria (bullet-for-bullet)

- **R-36 — cascade owns its beat (the headline).** `CascadeLayer` now takes
  `onComplete?: () => void` (+ `completeLabel`). When the cascade reaches the
  terminal `dayTotal` — by playing through OR by skip — the transport
  (speed/skip/play-pause) **retires** and a single advance affordance appears
  (`Collect ▸`, or `See Results ▸` when the next route is `/summary`). `onComplete`
  fires only on that tap (R-39: no auto-advance; the tap is required in
  reduced-motion too). In `run.tsx` the cascade is a **modal scrim overlay** over
  the arrange HUD; the HUD behind it reads the **pre-openShop snapshot**
  (`cascadeMount.gameState`) so the header shows the day that scored, never the
  phase the sim already advanced to (R-40). The route fires from `onComplete`; the
  external Continue button and the double-affordance/next-phase-header seam
  (F-M3-1) are gone. Lane A's `dispatch(openShop)` and selectors are untouched — I
  own only *when the route fires* and *which state the view reads*.
- **R-33 / R-41 — aura retune.** New purpose-named tokens `auraGold` (`#FFD9A0`)
  and `auraGoldEdge` (`#D99A1B`); the row band is gold at ~0.30 opacity with a
  goldDeep border. The `×mult` label was lifted out of the faded fill so it stays
  crisp at full opacity. `accentTeal` is untouched (still used elsewhere).
- **R-34 — combo banner dock.** The trophy holds **full opacity** from its
  `comboNamed` event; when `dayTotal` lands it **docks** — scales to 0.58 and
  translates to the top-right corner — instead of fading in place. It survives the
  slam, smaller.
- **R-38 — glyph coverage.** `ITEM_GLYPHS` now covers all 36 table items (22 added);
  a script asserts 0 items fall through. The `📦` fallback remains only as a guard
  for unknown ids and never shows in normal play.
- **F-M3-3 — delivery-tray placement gesture.** The first-empty-slot button is
  replaced by a tray below the shelf: the drafted/purchased item rides on a
  parchment plate and is dragged onto an empty slot (off-grid → grid) with the M1
  drag feel — grab lift, 1:1 tracking, velocity tilt, settle-with-overshoot, legal
  slot-glow, rubber-band return. Legality is contract-only ("slot empty"); a legal
  drop dispatches the existing `placeItem` action. Implemented by extending
  `ShelfScene` (`heldItem`/`onPlace`) so the drag reuses the shelf's own
  coordinate math + occupancy; new `DeliveryTrayItem` carries the gesture. Applies
  to both arrange (delivery) and restock (purchase).
- **First real `vanish`.** The vanish is now a **puff** (swell + fade), not a plain
  fade: the sprite scales 1→1.35 as opacity goes 1→0 over the 300 ms morph window.
  A hand-authored Lane B demo trace in the cascade-harness ("Coupon vanish (demo)")
  makes a Coupon Stack puff on demand — no `/fixtures` touched.
- **R-37 — summary untouched** (M4 work), as ruled.

## 2. Run / test commands + output

```bash
# Node v20.19.4 arm64 via PATH prepend; corepack pnpm broken → .bin directly.
PATH="$HOME/.nvm/versions/node/v20.19.4/bin:$PATH" node_modules/.bin/tsc --noEmit
# → clean (strict, exactOptionalPropertyTypes)

PATH="$HOME/.nvm/versions/node/v20.19.4/bin:$PATH" node_modules/.bin/vitest run
# → Test Files 9 passed (9) · Tests 51 passed (51)
```

Glyph-coverage assertion (0 items fall through to 📦): all 36 table ids mapped.

## 3. Verified on web @ 375×812 (runtime values, not eyeballed)

Server: `expo-web-b3` on port 8092 (8090/8091 held by parallel sessions).
Full loop walked: Title → New Run → `/draft` (real offers) → `/run` arrange.
Console: **no errors** across the session.

- **R-38 glyphs** — offers drew `Tea Tin 🍵`, `Chocolate Box 🍫`, `Postcard Rack ✉️`,
  `Bread Loaf 🍞` (all four were in the missing-22); no `📦` anywhere.
- **R-33 aura** (golden 4) — computed band = `rgb(255,217,160)` @ **opacity 0.30**,
  border goldDeep; **0 teal elements** on the page. `×mult` label crisp.
- **R-34 banner** (golden 2) — computed banner `transform: matrix(0.58,0,0,0.58,
  +102,-4)`, **opacity 1**: docked to a top-right chip at full opacity, not
  ghost-pale, not fading in place.
- **R-36 completion affordance** (harness) — at `dayTotal` the transport retires and
  a single `Collect ▸` button appears. One affordance, owned by the layer.
- **`vanish` puff** (coupon demo) — sampled the coupon wrapper through the anim:
  `opacity 1 → 0.36 → 0.03 → 0` while `scale 1 → 1.22 → 1.34 → 1.35`, then gone.
- **Delivery tray UI** — renders: "DELIVERY — DRAG TO A SHELF SLOT" label, parchment
  plate, draggable item with value badge; no stray "Run Complete" button while an
  item is held.

## 4. Device-verify-only (web gesture limitation — see project memory)

`react-native-gesture-handler` won't activate a `Pan` from synthetic OR trusted
single-click input on web, so the **tray drop cannot be driven on web**. That
gates two things behind a device pass:

1. **Tray drag→drop feel + actual placement** — the drop, settle-onto-slot, and
   `placeItem` dispatch. (The dispatched action is unchanged from the old button
   path; only the trigger differs.)
2. **run.tsx cascade overlay end-to-end** — because reaching Open Shop requires
   placing the delivery first. The overlay *content* (board, gold aura, docked
   banner, totals, single Collect affordance) is fully web-verified via the
   cascade-harness, which mounts the identical `CascadeLayer`. What remains
   device-only is the run.tsx wrapping: scrim over the arrange HUD, the snapshot
   header not flipping to the next phase, and Collect firing the route.

Also device-only as always: haptic ladder / taptics (no web haptics).

## 5. Device recording shot list (one pass, folds in B-M1 + B-M2)

1. **Grab/drag/drop feel (B-M1):** grab lift + tilt, 1:1 tracking, legal settle
   overshoot, illegal rubber-band, sticky resistance.
2. **Cascade haptic ladder (B-M2):** light→medium→heavy escalation across a
   climbing cascade; combo-banner + dayTotal-slam + rent-thud on a rent-due day.
3. **NEW — delivery-tray placement:** drag the tray item onto an empty slot; land
   the settle; confirm the shelf updates and the tray clears.
4. **NEW — cascade overlay beat (R-36/R-39):** Open Shop → cascade plays as an
   overlay over the scored shelf, header still reads the scored day, transport
   retires at `dayTotal`, then the single `Collect ▸` tap routes onward. Confirm
   the tap is required (no auto-advance), including in reduced-motion.
5. **NEW — aura gold + banner dock + vanish puff** in a live run for feel (stills
   are in §3; the device pass judges motion + timing).

## 6. Questions for Fable

- **R-39 skip semantics:** I implemented "onComplete fires immediately on skip" as
  *skip jumps to the done-state and reveals the single `Collect ▸`; the tap then
  routes* — so skip still lands the `dayTotal` slam and the Cash-Out gate your
  Balatro framing depends on, rather than routing away mid-slam. Flagging in case
  you meant skip should route without the extra tap; it's a one-line change.
- **Overlay scrim vs. full-cover:** the overlay dims the arrange HUD behind an ink
  scrim (0.55). Confirm that reads right on device, or if you'd prefer the cascade
  board sit on an opaque panel.

## 7. Contract change requests

- None. `src/contracts` and `/fixtures` untouched. The coupon-vanish demo trace is
  hand-authored Lane B harness tooling, not a fixture.

## Rulings honored

R-36 ✅ (overlay + `onComplete`, one affordance, route post-animation) · R-37 ✅
(summary left for M4) · R-38 ✅ (36/36 glyphs) · R-33 ✅ (gold band @ 0.30) ·
R-34 ✅ (full-opacity dock) · R-39 ✅ (tap-to-collect, no auto-advance, reduced-motion
waits) · R-40 ✅ (snapshot header; sim stays animation-agnostic) · R-41 ✅
(purpose-named `auraGold`).

**STOP — awaiting Fable review, then the fun gate.**
