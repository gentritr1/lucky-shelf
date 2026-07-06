# Prompt for Lane B (Opus 4.8) — M3 polish pass (goes SECOND, after Lane A)

Lane A landed the M3 integration plumbing (accepted). This is Lane B's polish pass ON
the integrated build. Copy everything below the line into a fresh Opus 4.8 session in
`/Users/gentlegen/Desktop/lucky-shelf`.

---

You are **Lane B (Opus 4.8) — UI & Presentation** on **Lucky Shelf**. M3 is
integration: real sim now drives real UI. Lane A wired the plumbing and stopped; you
polish the integrated build to the fun-gate bar. The game is playable end to end right
now — your job is to make the seams disappear and the beats land.

## Read first, in order

1. `docs/review-packets/A-M3-fable-review.md` — the review of Lane A's integration; it
   carries YOUR M3 rulings **R-36, R-37, R-38** and findings F-M3-1/2/3.
2. `docs/review-packets/A-M3-review.md` — Lane A's packet, esp. §7 **Handoff for Lane B**
   (the CascadeLayer mount contract + the `onComplete` API you must add).
3. `docs/review-packets/B-M2-fable-review.md` — your prior rulings still owed:
   **R-33** (aura teal→sunlight-gold, ~0.3), **R-34** (combo banner: hold full opacity
   then dock to a corner chip so the slam owns the final beat).
4. `docs/lane-b/motion-spec.md` §4 (cascade), your `src/juice/cascade/*`, and
   `src/app/run.tsx` / `draft.tsx` / `restock.tsx` (Lane A wired data in; you own the
   presentation).

## Project state (verified by Fable on web)

- Full loop plays: New Run → `/draft` (real day-1 offers) → arrange → Open Shop → real
  `CascadeLayer` on the actual `lastScoringTrace` → Continue → next day. Restock, rent,
  gameOver→`/summary`, Continue-restore all work. 51/51 tests, tsc clean.
- Lane A's cascade mount (`run.tsx`) passes CascadeLayer: `gameState` (pre-openShop),
  `trace` (real `lastScoringTrace`), `rentDue` (dueInDays===1), `autoPlay`. Because
  CascadeLayer has **no `onComplete`**, Lane A bolted an external Continue button — so
  during a day's cascade the HUD header already reads the NEXT phase and two advance
  buttons coexist. That seam is the headline fix.

## Your M3 scope

1. **R-36 — cascade owns its beat (the big one).** Add `onComplete?: () => void` to
   `CascadeLayer` (fire it from `useCascadePlayer` at terminal `dayTotal`, and on skip).
   Rework the openShop moment so the cascade is a **modal overlay over the arrange HUD**
   — it plays over the shelf that scored, fires `onComplete`, and ONLY THEN does the
   phase advance/route happen. No next-phase header behind a running cascade; one
   advance affordance (the layer's own), not two. Coordinate the tiny wiring with Lane
   A's contract: expose `onComplete` and let it drive the route Lane A currently fires
   from its external button — leave the `dispatch(openShop)` call itself to Lane A's
   code, you own when the *route* happens (post-animation).
2. **R-33 — aura retune:** the persistent row band goes teal→**sunlight gold** (~0.3
   opacity); keep the ×mult label. One token/region; verify on golden 4.
3. **R-34 — combo banner dock:** hold full opacity from its event, then **dock to a
   small corner chip** at dayTotal so the slam owns the final beat (don't fade in
   place — I caught it ghost-pale mid-screen at M2).
4. **R-38 — glyph coverage:** complete `ITEM_GLYPHS` (`src/juice/glyphs.ts`) for all 36
   items. Placeholder emoji are fine (art is M4) but every item gets a distinct one;
   the `📦` fallback must never show in normal play (currently Tea Tin, Flower Vase,
   others fall through).
5. **Delivery-tray placement gesture (F-M3-3):** replace the first-empty-slot "Place
   Delivery" button with the real gesture — the drafted item rides in a tray and is
   dragged onto the shelf (your M1 drag feel), off-grid→grid.
6. **First real `vanish` visual:** Lane A's engine test confirms Coupon Stack→0 emits a
   `vanish` trace; make sure your fade-puff renders it in a real run (seed/scenario a
   coupon countdown or use the harness).
7. **Run summary polish is NOT M3** (R-37) — Lane A's minimal `/summary` stays; you give
   it the real best-combo mini-trace treatment at M4. Leave it.

## Boundaries

- Yours: `src/ui`, `src/juice`, and the PRESENTATION in `src/app/*.tsx` screens. Lane A
  owns data wiring, the store, `phaseRouting.ts`, dispatch calls. When you change the
  post-cascade route timing, do it through the `onComplete` seam — don't move Lane A's
  `dispatch`/selector logic.
- `src/contracts` frozen; `/fixtures` read-only (Lane A regenerates them).
- UI never computes rules — the cascade still renders only what the trace says.

## Environment quirks

Node v20.19.4 arm64 via PATH prepend (never v23.3.0); corepack pnpm broken →
`node_modules/.bin/*` directly; don't regress `babel.config.js`; `WEB_SKIA_ENABLED=false`
stands. Use the `expo-web-b` launch config (port 8091) — 8090 is the Fable session's.

## Definition of done

1. tsc strict clean; all tests green (add/extend as needed).
2. Web @ 375×812, full run: the cascade plays as an overlay, self-completes, THEN the
   day advances — no next-phase header behind it, one advance affordance. Aura reads
   gold; combo banner docks; every offered item has a real glyph; drafted item is
   drag-placed; a coupon `vanish` puffs. Screenshots captured.
3. Post `docs/review-packets/B-M3-review.md` (§8 format) with a device recording shot
   list (the accumulated B-M1 feel + B-M2 haptic + M3 overlay beats fold into one
   device pass for the human relay).
4. **STOP after the packet.** Fable runs the fun gate next.

Start by reading the listed files, then confirm understanding + ambiguities in one
short message before building.
