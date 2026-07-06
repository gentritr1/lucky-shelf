# Fable Review — B-M1 (Shelf Scene · Drag Feel · Shells)

**Verdict: ENGINEERING ACCEPTED** (2026-07-06); the **feel gate stays conditionally
open pending the §3 device recording** — by design, since the kickoff's M1 bar
("would you keep touching it for no reason") is explicitly a recording judgement.
Nothing blocks either lane's next milestone.

## Verified independently during review

- Gates re-run by Fable: tsc strict clean; **33/33 tests** (before and after the F-B1
  patch below).
- Boundary sweep: **zero** `src/sim` imports in Lane B code; expo-haptics referenced
  only by the gateway (tokens.ts hit is the map's doc comment); **zero** hex literals
  outside `tokens.ts`.
- Title + Run HUD inspected live at 375×812 on a fresh server: shop-front title with
  actions in the reach zone; HUD shows phase, coins, rent (warm), MovesPips, and the
  shelf with plinth-tiled sprites and the honey-ringed sticky item. (First look hit a
  "Got unexpected undefined" — stale Metro cache on my long-lived 8090 server, gone on
  restart. Noted as an env footgun, not a Lane B defect.)
- `DraggableItem.tsx` read line-by-line against motion-spec §1–§3: grab spring/lift,
  ±3° velocity tilt, 1:1 tracking, 6 pt neighbor parting, settle-then-commit,
  320 ms rubber return, 4 pt-then-tension sticky resist, occupancy-only legality
  (R-16). Faithful.
- Packet evidence discipline is exemplary — sampled transform matrices to prove the
  breathing cap and reduced-motion freeze. Keep doing this.

## Findings

- **F-B1 (patched in review, Fable-applied):** sticky grab fired `invalidReturn` at
  grab *and* release — double error haptic per touch. Spec says tension teaches during
  drag, one error at release. Sticky grabs are now silent; release keeps the single
  `invalidReturn`. One line in `DraggableItem.tsx`; suite green after.
- **F-B2 (copy nit, fix in passing at M2):** HUD hint reads "the honey-ringed **jar**
  is stuck" but the ringed sticky item in the mock is the **cheese** at (1,1).

## Rulings on §5 questions

- **R-22 (Q1):** token-proof deletion approved — it was born throwaway.
- **R-23 (Q2):** `mockShelf.ts` approved as the M1 drag mock — contract-parsed mock
  state in the juice layer is the right home; `/fixtures` stays engine-generated. When
  Lane A does the R-20 fixture regeneration at M2, add one engine-generated arrange
  fixture with a sticky item and retire the hand mock if convenient.
- **R-24 (Q3):** Toggle pull-forward approved. Accessibility that can't be
  demonstrated doesn't exist; minimal Settings stays as-is until M5.
- **R-25 (Q4):** Approved and pre-signed — add the web `boxShadow` branch **inside
  `tokens.ts`** at M2 start (native `shadow*` unchanged). Until then the warning is
  accepted noise.
- **R-26 (Q5):** `GestureHandlerRootView` + `SafeAreaProvider` in `_layout.tsx` stays
  — exactly the R-21 case. Lane A inherits the wrap as part of its M2 store wiring.

## Owed next

- **Human relay:** the §3 shot list on device — this closes the M1 feel gate. Shot 5
  (perf HUD with the Skia frame active) also closes KI-1.
- **Lane B — M2:** cascade animation end-to-end against the golden traces (arrows,
  count-ups on the R-6 beneficiary slot, persistent R-9 aura glow, combo banner,
  R-17 speed control, R-18 skip-to-slam), draft + restock screens. Plus R-25 token
  branch and the F-B2 copy fix.
- **Lane A — M2:** versioned saves, zustand store wiring (real dispatch behind the
  HUD's cosmetic moves — KI-4 retires), R-20 traceId migration + fixture regeneration.
