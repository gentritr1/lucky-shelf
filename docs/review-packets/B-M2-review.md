# Lane B — M2 Review Packet (Cascade ∥ Draft ∥ Restock)

**Milestone bar (kickoff §9):** *"Fable can follow every coin in a recorded cascade
without pausing."* Built against all six engine-verified goldens, verbatim.

---

## 1. Built vs. milestone criteria (bullet-for-bullet)

**Cascade animation (the crown jewel)** — `src/juice/cascade/`

- ✅ Consumes a `ScoringTrace` event list **verbatim, sequentially**. Pure model
  (`cascadeState.ts`) folds events → per-step render frames; `useCascadePlayer.ts`
  walks the index on a timer. No rules computed in the UI — it renders only what the
  trace says.
- ✅ Cadence **260 ms/event at 1×, 130 ms at 2×** (`motion.durations.cascadeStep / speed`).
- ✅ **SpeedControl 1× / 2× / skip always visible (R-17)**; **skip jumps to `dayTotal`
  and still plays the slam**, plus the rent thud on due days (R-18, wired; harness has a
  rent-due toggle to demonstrate it since no golden carries `dueInDays 0`).
- ✅ `itemBase`: slot value tag pops in + open-window highlight (slot lifts 3 pt).
- ✅ `ruleFire`: arrow draws `sourceSlot → targetSlot` (`arrowPalette` cycles per source);
  **count-up ticks on the R-6 beneficiary** — the slot whose *resolution window is open*,
  not always `targetSlot`. **Fixtures 1 (beneficiary = source) and 4 (beneficiary =
  target) both correct** — locked by unit test.
- ✅ `rowAura`: teal row band sweeps in and **persists until `dayTotal` (R-9)**, carrying
  a **`×mult` label (R-27)** that explains the otherwise-silent aura jumps (fixture 4:
  wine 8→12, honey 2→3).
- ✅ `comboNamed`: ember banner drops with `overshoot`/settle spring + `comboBanner`
  haptic; **no coin change (R-2)** — the total flows from the underlying rules.
- ✅ `itemTotal`: total stamps and is final (R-7 — nothing retro-ticks it).
- ✅ `transform` / `vanish`: glyph-swap pop / fade puff, after totals, before `dayTotal`.
- ✅ `dayTotal`: **coin-counter slam** via the new `CoinCounter` `slam` variant
  (`dayTotalSlam` impact-heavy).
- ✅ Haptic escalation through the existing gateway `cascadeStepHaptic`
  (`cascadeEscalation` thresholds); audio is placeholder-only (M3).
- ✅ **Reduced motion (R-28):** same event sequence, same cadence, same haptics — every
  step resolves instantly (durations → 0). Stepped card-flip, sequence + readability
  preserved. Verified error-free end-to-end.

**Cascade harness screen** — `src/app/cascade-harness.tsx`

- ✅ Dev route; **trace picker across all six goldens**, auto-plays on select,
  **play-again** (owned by the layer). Rent-due toggle for R-18.

**Delivery draft screen** — `src/app/draft.tsx`

- ✅ **1-of-3 OfferCards → draft**; the drafted item **lands on the shelf and is dragged
  into place** using the accepted M1 drag feel (`ShelfScene`). Mock-fed (R-29).

**Restock screen** — `src/app/restock.tsx`

- ✅ Offers with **ember cost ribbons**, **reroll** button (with fee), **sell-mode
  toggle** (Buy/Sell views), **endRestock**. Coins move locally (mock-fed, R-29).

**Cleanups**

- ✅ **R-25:** web `boxShadow` branch added **inside `tokens.ts`** (`shadow()` helper);
  native `shadow*`/elevation byte-identical. Web deprecation warning silenced.
- ✅ **F-B2:** the "honey-ringed jar" HUD hint no longer exists (Lane A's `run.tsx`
  rewrite dropped it; the copy is gone). Retired `mockShelf.ts` (its dead comment was the
  last carrier). Nothing to patch — noted rather than invented.
- ✅ **CoinCounter count-up + slam variants** (`animate`, `from`, `slam`, `variant`);
  HUD default behavior unchanged (opt-in).
- ✅ **R-23:** adopted `fixtures/m2-arrange-sticky.json` as the drag base state
  (`goldens.ts → stickyArrangeState`) and **retired `mockShelf.ts`**.
- ✅ Centralized placeholder glyphs in `src/juice/glyphs.ts` (`ITEM_GLYPHS`, `glyphFor`).

---

## 2. Run / test commands + manual script

```bash
# Node v20.19.4 arm64 via PATH prepend; corepack pnpm broken → .bin directly.
export PATH=/Users/<you>/.nvm/versions/node/v20.19.4/bin:$PATH
./node_modules/.bin/tsc --noEmit          # strict, clean
./node_modules/.bin/vitest run            # 46 passed (8 files)
```

- **New unit test:** `src/juice/cascade/cascadeState.test.ts` — 7 cases that lock the R-6
  beneficiary derivation, R-9 aura persistence, combo capture, and transform against the
  goldens **in pure TS** (no device needed). This is the machine-checkable half of
  Pillar 2.

**Web manual script** (launch `expo-web-b`, port 8091, 375×812):

1. Title → **M2 Preview → Cascade** → harness. Play each of the six day chips.
2. Golden **4 (Shop Cat Row Aura)**: watch the row band + `×1.5` label persist to
   `dayTotal`; wine ends 12, honey 3, day total 15 — both jumps explained by the aura.
3. Golden **2 (Wine and Dine)**: combo banner drops after the totals; day total 22.
4. Golden **5 (Antique Clock Scores Last)**: fishbowl resolves before the clock; 9.
5. Toggle **Rent-due day** on golden 4, press **Skip** → jumps to the slam (device: +
   rent thud).
6. Title → **Draft**: pick an offer → Draft → the item lands on the shelf, draggable.
7. Title → **Restock**: buy (coins drop, ribbon→Bought), reroll, flip **Sell**, endRestock.
8. Settings → **Reduced motion** on → replay a cascade: steps snap, sequence + haptics kept.

---

## 3. Screen recordings requested (device shot list)

Web verification stands in (screenshots below were captured at 375×812); these close the
device gaps — arrows/sparks and haptics are device-only, and the reduced-motion *feel* and
count-up *motion* don't read in a still.

1. **Golden 4 — aura + grant** (the headline): full play. Show the source→target arrow on
   the honey→wine `ruleFire`, the persistent `×1.5` band, and the wine 8→12 / honey 2→3
   count-ups landing under the lit aura. *This is the R-27 Pillar-2 shot.*
2. **Golden 2 — named combo**: the three `ruleFire` arrows off the wine (palette cycling),
   the running climb 4→7→10→13, then the "Wine And Dine" banner drop + `comboBanner`
   haptic.
3. **Golden 5 — scoresLast**: fishbowl resolving before the first-slot clock — proves the
   cascade animates trace order, not grid order.
4. **Haptic ladder**: golden 2 or 4 with the device mic'd or captions — light→medium→heavy
   as `runningTotal` climbs (`cascadeEscalation` 25/60).
5. **Speed + skip (R-17/R-18)**: 1×→2× mid-cascade, then skip-to-slam on a rent-due day
   (the thud).
6. **Reduced motion (R-28)**: same golden at reduced motion — stepped snaps, haptics kept.
7. **Draft drag-place** and **Restock buy/sell** for completeness.

**Web screenshots captured (in-thread):** harness start; golden 4 persistent aura +
`×1.5` + day total 15; golden 2 combo banner + 22; golden 5 totals; golden 6 transform + 6;
draft pick; draft drag-place; restock buy; restock sell.

---

## 4. Known issues + spec deviations

- **Draft/Restock reachable from the *title* screen's "M2 Preview" cluster, not the run
  HUD.** `run.tsx` is Lane-A-in-flight (your heads-up), so I did not edit it. The HUD phase
  transitions that route to draft/restock are Lane A M3 wiring; the screens themselves are
  done and navigable. Flagging as the one DoD-wording deviation.
- **Draft "drag-place" reuses `ShelfScene`:** the drafted item lands on the first empty
  slot and is draggable into position (accepted M1 feel). A true from-a-delivery-tray
  off-grid placement gesture is M3 polish.
- **`vanish` is implemented but unexercised by the six goldens** (Coupon Stack isn't in
  them). Logic is covered in `applyEvent`; the fade-puff renders, but there's no golden to
  screenshot. First real `vanish` trace at integration will confirm the visual.
- **Arrows are RN-drawn** (web-verifiable, my KI-1 pattern); the richer **Skia particle
  spark is device-only** and not built this milestone. Arrow *draw* is sub-260 ms and
  couldn't be frozen in a still — it's on the device shot list (#1, #2).
- **`WEB_SKIA_ENABLED=false` still stands** — the cascade shelf uses the RN board, same as
  M1. Skia depth frame remains device-verify-only.
- Empty-list suspicion satisfied: the deviations above are real.

---

## 5. Questions for Fable

1. **Aura band contrast:** teal at ~0.2 opacity over the wood reads a touch olive/muted
   (see golden-4 shot). Readable, but do you want the persistent aura warmer/brighter, or
   is muted-until-`dayTotal` the right restraint? (Cheap to retune — one token.)
2. **Combo banner dwell:** the banner currently persists from its event through `dayTotal`
   (so it's co-visible with the slam). Keep it up as a "trophy," or fade it before the slam
   so the payoff owns the final beat? I went trophy; easy to flip.
3. **Count-up origin on aura totals:** fixture 4's wine tag ticks 8→12 at `itemTotal` while
   the `×1.5` band is lit. Reads clean to me as "the aura did the last 4." Confirm that
   satisfies "every coin explained," or you'd want an explicit multiply beat on the tag.

## 6. Contract change requests

- **None.** Lane B consumed `src/contracts` unchanged; `/fixtures` consumed read-only.
- **Build-config note (R-21, flagged not requested):** added a `@/*` alias to
  `vitest.config.ts` so pure `juice`/`ui` modules that import `@/contracts` are unit-testable
  under vitest (matches Metro/Babel resolution). Additive; existing tests unaffected (46/46).

---

## Rulings honored

R-2, R-6, R-7, R-9, R-17, R-18, R-23, R-25, R-27, R-28, R-29 — all implemented as ruled.

**STOP — awaiting M2 review.**
