# Lane B — M1 Review Packet (Design System · Shelf Scene · Drag Feel · Shells)

**Milestone:** M1 (kickoff §9). **Lane:** B (UI & Presentation, Opus 4.8).
**Date:** 2026-07-06. **Status:** submitted for Fable review — STOP after this.

Review bar (Fable's words): *"would you keep touching it for no reason."* Drag-drop
feel is a device/recording judgement; §3 is the shot list for the human relay.

---

## 1. Built vs. M1 criteria (bullet-for-bullet)

### 1.1 Design system complete
- **TagChip** (`src/ui/components/TagChip.tsx`) — muted / accent.
- **SectionLabel** (`SectionLabel.tsx`) — eyebrow + optional trailing slot.
- **MovesPips** (`MovesPips.tsx`) — the daily 3-move budget as filled/spent pips
  (the scarcity constraint made visible before the drag).
- **Toggle** (`Toggle.tsx`) — settings switch, reduced-motion aware; **pulled
  forward from M5** because M1 has to *prove* reduced-motion (see §5 Q3).
- **prefs store** (`src/ui/prefs.ts`) — presentation-only zustand store
  (`reducedMotion`, `hapticsEnabled`). Not the run/meta store (Lane A owns that).
- Everything themes from `tokens.ts`; **no new color literals** outside tokens.

### 1.2 Skia shelf scene (`src/juice/`)
- **ShelfScene** — layered composition: `[depth frame] → [slot glow] → [items]`.
  The Skia canvas is **one swappable layer**; on web it's replaced by an RN
  `FallbackFrame` so motion/gesture verify without CanvasKit.
- **SkiaShelfFrame** — wood board vertical gradient, **soft inner-shadow wells**
  and **lit front-edge planks** (directly answers Fable's B-M0 note: "empty slots
  read flat; give wells a soft inner shadow and the shelf front-edge a highlight").
  **Device-verify-only** this milestone — see §4 (KI-1).
- **Idle micro-motion** — items breathe ≤1.5% scale on randomized 3–5 s loops
  (per-instance phase jitter so the shelf doesn't pulse in unison); **Shop Cat
  tail-flick** every 6–9 s (a two-beat rotate tic on the placeholder glyph).
  Verified live on web (§2.3). Reduced-motion stops all of it.
- **Slot glow** — nearest legal target breathes `palette.slotLegal` at 40% on a
  600 ms loop; illegal (occupied) target glows `palette.slotIllegal`. Legality is
  **contract-only** ("slot empty", R-16) — UI never computes rules.
- Budget: timing-only worklets, ≤2 shared values per sprite. Frame-cost claim is
  device-verify (§3 shot 5).

### 1.3 Drag-and-drop feel (motion-spec.md, implemented verbatim)
`DraggableItem.tsx` — all of §1–§3 of the spec:
- Grab: scale 1→1.08 spring `grab`, lift −6pt, `grabLift` haptic on activation.
- Velocity tilt ±3°, springs back at rest.
- Drag: 1:1 finger tracking, zero position smoothing.
- Neighbor parting: orthogonal neighbors of the grabbed slot drift ±6pt away,
  spring `neighborPart`.
- Drop (legal): settle spring `settle` (~4% overshoot) onto the target center,
  commit on settle; `dropSettle` + `placementTick` haptics.
- Drop (illegal / occupied): rubber-band return over 320 ms easing `rubber`,
  `invalidReturn` haptic. **No swap** (R-16).
- Sticky (`item.state.sticky`): 4 pt travel then rubber tension, always returns,
  `invalidReturn` on release. Sticky taught by feel (R-14 movement-lock only).
- **Haptics routed through one module** (`src/juice/haptics.ts`) keyed by
  `hapticMap`; no component calls `expo-haptics`. `cascadeStepHaptic` (escalation
  thresholds) pre-wired for M2.
- **Reduced-motion**: springs → 0-duration timing, glow steadies, breathing
  stops, haptics stay. Verified end-to-end (§2.3).

### 1.4 Title + HUD shells
- **Title** (`src/app/index.tsx`) — placeholder shop-front scene (awning, window,
  mascot cat on a shelf), Continue / New Run in the **bottom-60% reach zone**,
  settings gear top-right (out of the reach zone by design).
- **Run HUD** (`src/app/run.tsx`) — day eyebrow + phase, CoinCounter, RentChip
  (warm at dueInDays 2), MovesPips, the live ShelfScene, Open Shop. Moves
  decrement as items are rearranged (cosmetic; not rule-enforced).
- **Settings** (`src/app/settings.tsx`) — reduced-motion + haptics toggles (the
  M1 minimum to demonstrate reduced-motion; full settings is M5).
- Navigation is real (expo-router): title ↔ run, title ↔ settings, back — all
  verified (§2.2). `token-proof.tsx` deleted (it was declared "dies at M1").

---

## 2. Exact commands + manual script

### 2.1 Gates (all green)
```sh
export PATH="$HOME/.nvm/versions/node/v20.19.4/bin:$PATH"
node_modules/.bin/tsc --noEmit        # clean (strict, exactOptionalPropertyTypes)
node_modules/.bin/vitest run          # 33/33 pass — no sim/contract code touched
```

### 2.2 Web preview
```sh
# .claude/launch.json now has TWO configs: expo-web (8090) and expo-web-b (8091).
# The second was added because 8090 was held by a parallel session. Start either.
node node_modules/expo/bin/cli start --web --port 8091
```
Manual script @ **375×812**:
1. Title → tap **New Run** → Run HUD. Tap the **gear** on Title → Settings → **‹ Back**.
2. In the HUD, drag any item to an empty well → it lifts, neighbors part, settles
   with a bounce. Drag onto an **occupied** well → rubber-bands back. Drag the
   **honey-ringed cheese (1,1)** → it resists and snaps back (sticky).
3. Settings → toggle **Reduced motion** → return to HUD → breathing/springs are gone.

### 2.3 What I verified on web (screenshots captured; automation notes)
- Title / Run HUD / Settings all render at 375×812; **no runtime errors** on clean load.
- **Navigation** works (title→run, title→settings, back), client-side + fresh loads.
- **Idle breathing is live**: sampled a sprite's transform over 700 ms — cheese
  scale oscillated 1.0066→1.0025, cat 1.0140→1.0150 (both ≤ the 1.5% cap), with
  the breathing translateY. Reduced-motion ON → transform frozen at identity, no
  change across samples. **Reduced-motion proven end-to-end.**
- **Gesture pipeline activates cleanly under trusted input**: a real click on an
  item (testID `item-*`) fires grab→release with zero errors/warnings and all
  items keep rendering. (react-native-gesture-handler ignores *synthetic* pointer
  events, so the full pan/drop **feel** is not web-automatable — that's the §3
  recording's job, by design.)

---

## 3. Screen-recording shot list (for the human relay — device is the real target)

Record on a physical device (idle motion + haptics + Skia depth only exist there):
1. **Idle shelf, 8 s, no touch** — breathing + Shop Cat tail-flick; is it alive
   without being busy?
2. **Grab + carry + legal drop** — lift, neighbor parting, 1:1 tracking, settle
   bounce; slow enough to read the overshoot.
3. **Illegal drop (onto occupied)** — the rubber-band return + error haptic.
4. **Sticky item** — grab the honey-ringed cheese: the 4pt-then-tension resist.
5. **Perf HUD on** (Xcode/Android GPU profiler) during a fast drag — confirm 60 fps
   and the idle ≤2 ms/frame budget with the **Skia frame active** (KI-1).
6. **Reduced-motion on** (Settings) — same grab/drop, now snappy + still; haptics
   remain.

Feel bar to judge against: §1.3 + "would you keep touching it for no reason."

---

## 4. Known issues + spec deviations (nothing hidden)

- **KI-1 — Skia frame is device-verify-only.** This dev env doesn't serve the
  CanvasKit wasm; CanvasKit's emscripten `abort()` escapes a normal try/catch as
  an uncaught error and redboxes web. Per the kickoff's explicit fallback
  guidance, web is gated to the RN `FallbackFrame` (`WEB_SKIA_ENABLED=false` in
  `skiaWeb.ts`) and the Skia module is required native-only. The RN fallback
  already renders wells + lit planks; the *Skia* inner-shadow/gradient depth needs
  a device recording (§3) or a configured web wasm to sign off. **Not a spec
  deviation — the spec pre-authorized this path.**
- **KI-2 — Drag full-pan feel unverified on web.** GH ignores synthetic events
  (see §2.3); grab-activation is verified, full pan/drop is recording-gated.
- **KI-3 — `"shadow*" style props are deprecated. Use "boxShadow"` (web-only
  warning).** Emitted by the approved `shadows` tokens on react-native-web. Native
  needs `shadow*`; a web `boxShadow` mapping is a token-shape change I did not make
  unilaterally (tokens are your call). Cosmetic; no functional impact. Flagging as
  a candidate token tweak — happy to add a web branch if you want it silenced.
- **KI-4 — Moves are cosmetic in the shell.** The HUD decrements MovesPips on
  rearrange but does not enforce the 3-move economy (that's sim/rules, arrives at
  M3 integration). Drag stays enabled past 0 so the feel demo isn't gated.
- **No other deviations.** The motion spec is implemented as written; tokens
  unchanged; contract untouched.

---

## 5. Questions for Fable (assumptions stated; proceeding under them)

- **Q1 — token-proof screen.** Assumption: deleted (it was declared "dies at M1";
  its only inbound link was the index screen I replaced with Title). OK?
- **Q2 — mock arrange state.** No fixture carries `sticky:true` (Honey sets it
  *next* phase, R-5), so I hand-authored `src/juice/mockShelf.ts` (contract-valid,
  parsed through `GameStateSchema` at load) with one sticky item to demo
  resistance. I did **not** touch `/fixtures`. OK as the M1 drag mock?
- **Q3 — reduced-motion surfacing.** I pulled **Toggle** forward from M5 and built
  a minimal Settings screen purely to make reduced-motion demonstrable now. If you'd
  rather M1 ship reduced-motion as a code path only (no settings UI until M5), say so.
- **Q4 — `KI-3` shadow tokens.** Want me to add a web `boxShadow` mapping to the
  `shadows` tokens (silences the warning, keeps native identical), or leave tokens
  frozen until the M4 art pass?
- **Q5 — R-21 flag.** I added `GestureHandlerRootView` + `SafeAreaProvider` to
  `src/app/_layout.tsx` (Lane A's navigation shell). Required infra for gestures +
  insets; no nav behavior changed. Flagging per R-21 — confirm this is fine or
  tell me to relocate the wrap.

---

## 6. Contract change requests

**None.** `src/contracts` untouched; all UI consumes frozen v1 types + fixtures.
