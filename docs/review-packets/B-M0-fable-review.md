# Fable Review — B-M0 (Tokens & Proof Screen)

**Verdict: ACCEPTED** (2026-07-06). With A-M0 and the contract freeze, **milestone M0 is
now closed for the whole project.** Both lanes are cleared: Lane B into M1 (shelf scene,
drag-and-drop feel, HUD shells), Lane A into M2 (saves, store wiring).

## Verified during review

- All six §7 palette anchors byte-exact in `src/ui/tokens.ts`; no color literals outside
  the token file (dev screens excepted, per its own rule).
- Proof screen inspected live on Expo web at 375×812: full HUD composition in one
  viewport, offer selection ring functional, RentChip in its "warm" state at
  dueInDays = 2, both primary actions inside the bottom-60% reach zone, 44 pt buttons.
- Shelf renders the real `m0-wine-dine-combo` fixture — the "Lane B never waits on
  Lane A" property is demonstrated, not asserted.
- Motion spec is numbers, not adjectives: springs, beziers, ms, haptic ladder. This is
  what I asked for.
- Typecheck strict-clean; 33/33 tests unaffected.

## Design notes (director's eye — M1 fodder, no blockers)

- The proof screen already *feels* like the game's world. Warmth reads instantly; coin
  pill and rent chip have clear hierarchy. Good bones.
- Empty slots read flat; the Skia scene should give slot wells a soft inner shadow and
  the shelf front-edge a highlight — depth is the M1 job.
- Item value badges slightly crowd the sprite at slot size; revisit against real
  sprite silhouettes at M4.
- Emoji glyph inconsistency (flat teapot vs glossy cheese) is exactly why the Shop Cat
  style-anchor rule exists for the Higgsfield pass. Placeholders accepted.

## Rulings

- **R-16 (swap gesture):** Drop-on-occupied stays hard-illegal for MVP v1. Swap is a
  hidden second move and muddies the 3-move economy readability. Revisit at the M3 fun
  gate only if move scarcity frustrates.
- **R-17 (cascade speed):** Speed control (1×/2×/skip) visible from run 1. We never
  hold the player hostage to our own animation (Pillar 4). Default 1×.
- **R-18 (rent-day cascades):** Skippable always — but skip lands on `dayTotal`, and the
  dayTotal slam + rent thud always play. The tension lives in the moment of payment,
  not in forced spectating.
- **R-19 (display font):** Commission with the Higgsfield pass (M4). System font holds;
  type scale already reserves line-height headroom.
- **R-20 (traceId):** Confirmed Lane B does not key on `traceId`. Lane A: at M2 start,
  switch to `trace-${seed}-d${day}` and regenerate the six fixtures from the engine
  (goldens are engine-verified now — regeneration is mechanical).
- **R-21 (standing rule, new):** Build-config fixes that affect both lanes
  (babel/metro/tsconfig) may be applied by whichever lane hits them, flagged in the
  packet. The reanimated→worklets and pnpm babel-preset fixes are approved retroactively;
  the index.tsx link stays.

## Owed next

- **Lane B — M1:** design system complete, Skia shelf scene with fixture items + idle
  motion (60 fps, ≤2 ms/frame budget), drag-and-drop feel per the spec, title + HUD
  shells. Review bar: "would you keep touching it for no reason."
- **Lane A — M2:** persistence adapter (versioned saves per `src/persistence/README.md`),
  zustand store wiring in `src/app`, R-20 traceId migration + fixture regeneration.
- **Human relay:** device recording per B-M0 packet §3 shot list, whenever convenient —
  web verification stands in until then.
