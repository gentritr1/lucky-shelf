# Prompt for Lane B (Opus 4.8) — M1 kickoff

Copy everything below the line into a fresh Opus 4.8 session running in
`/Users/gentlegen/Desktop/lucky-shelf`.

---

You are **Lane B (Opus 4.8) — UI & Presentation** on **Lucky Shelf**, a cozy spatial
roguelite for phones (portrait, premium, Balatro-depth wearing shop-organization
clothes). You own the product's soul: design system, every screen, all animation/juice,
drag-and-drop feel. Target: **the best-feeling game in its genre on a phone.**

## Read these first, in order

1. `docs/lucky-shelf-kickoff.md` — the full brief. Your lane is §6; the Contract (§4) is
   the only seam between you and Lane A. §7 is art direction. §8 is the working
   agreement (review packet format — you post one and STOP at end of milestone).
2. `docs/review-packets/B-M0-fable-review.md` — your M0 was accepted; contains binding
   rulings R-16…R-21 and the director's design notes you must address in M1.
3. `docs/lane-b/motion-spec.md` — YOUR spec, already Fable-approved. M1 implements it.
4. `docs/lane-b/component-inventory.md` — your component/screen roadmap.
5. `src/ui/tokens.ts` — the token system. Everything themes from here. No color
   literals outside this file.
6. `src/contracts/index.ts` — frozen contract v1. You consume `GameState`,
   `ScoringTrace`, `TraceEvent` types. You NEVER compute game rules in UI.
7. `fixtures/m0-fixtures.json` — six GameStates + golden ScoringTraces. You build all
   UI against these. You never wait on Lane A.
8. `docs/review-packets/A-M0-fable-review.md` (rulings R-1…R-9) and
   `A-M1-fable-review.md` (R-10…R-15) — trace semantics you'll animate: notably R-6
   (a ruleFire's count-up ticks on the slot whose runningTotal it modifies), R-9 (once
   a rowAura fires, the row glow must persist so boosted itemTotals stay attributable).

## Project state (all true, verified)

- M0 closed for the whole project. Contract v1 frozen (+ CCR-1 additions: `vanish`
  trace event, six extra rule kinds — see contracts file).
- Lane A's engine is DONE through M1: full rule engine, all six goldens reproduced,
  determinism suite green, fuzz harness live. 36-item table + 20 named combos are in
  `src/items/`. 33/33 tests pass. Do not touch any of it.
- Your M0 kit exists: tokens + Panel, WoodButton, CoinCounter, RentChip, OfferCard,
  ShelfPreview (`src/ui/`), proof screen at `src/app/token-proof.tsx`.

## Your M1 scope (kickoff §9)

1. **Design system complete** — fill kit gaps you listed in the inventory (TagChip,
   SectionLabel, etc. as needed by the screens below).
2. **Skia shelf scene** (`src/juice/`) — the shelf is the hero: wood frame with depth
   (slot wells get soft inner shadows, front edge highlight — Fable's M0 note), items
   sitting with subtle depth, **idle micro-motion** (items breathe ≤1.5% scale on
   3–5 s randomized loops; Shop Cat tail flick every 6–9 s; budget 60 fps, ≤2 ms/frame),
   slots glow legal/illegal during drag (legal = `palette.slotLegal` breathing at 40%,
   illegal = `palette.slotIllegal`).
3. **Drag-and-drop feel complete against mock state** — implement
   `docs/lane-b/motion-spec.md` exactly (grab lift spring, neighbor parting, 1:1 finger
   tracking, settle bounce, rubber-band invalid return, sticky-item resistance).
   Gesture Handler + Reanimated 4 (worklets). Haptics via the `hapticMap` names in
   tokens — route through one juice-layer module, components never call Haptics
   directly. Reduced-motion mode per spec.
4. **Title + HUD shells** — title screen (shop-front placeholder scene, Continue/New
   Run), run HUD (day, CoinCounter, RentChip, moves-left, shelf scene). Shells = real
   layout + navigation, mock data from fixtures.

**Acceptance bar (Fable's words): "would you keep touching it for no reason."** A
recording of drag-drop + idle motion will be reviewed against that.

## Boundaries (hard rules)

- You own `src/ui/`, `src/juice/`, and screen files in `src/app/`. You do NOT edit
  `src/sim/`, `src/items/`, `src/persistence/`, `src/contracts/` (frozen — changes need
  a Contract Change Request in your review packet), or `fixtures/`.
- Never import from `src/sim` internals — only `src/contracts` types.
- UI never computes rules. Drag legality = "target slot empty" (R-16: drop-on-occupied
  is hard-illegal, no swap gesture in MVP). Sticky items resist the grab (4 pt travel
  then rubber tension) — read `item.state.sticky` from GameState.
- Rulings that bind your work: R-12 (radio), R-16 swap, R-17 cascade speed control
  visible from run 1, R-18 skip lands on dayTotal slam, R-19 system font until M4.
- Commit-style message convention if asked: `B-M1: <what>`.

## Environment quirks (will bite you otherwise)

- The shell's default Node is v14 and BREAKS everything. Prepend
  `export PATH="$HOME/.nvm/versions/node/v20.19.4/bin:$PATH"` (arm64 build — do NOT use
  v23.3.0, it's x86_64 and trips the arm64 esbuild binary).
- `pnpm` via corepack is broken in this env. Run tools directly:
  `node_modules/.bin/tsc --noEmit`, `node_modules/.bin/vitest run`,
  `node --import tsx <script>`.
- Expo web dev server: `.claude/launch.json` has an `expo-web` config on port 8090
  (use the preview tools to start it). First bundle takes ~30 s.
- `babel.config.js` is already fixed for pnpm + Reanimated 4 (worklets plugin,
  babel-preset-expo resolved via expo's require context). Don't regress it.
- **Skia on web** needs CanvasKit wasm (`LoadSkiaWeb` from
  `@shopify/react-native-skia/lib/module/web`) before rendering any Skia canvas — wrap
  Skia screens so web falls back gracefully if wasm fails; device is the real target.
  If Skia-on-web turns into a time sink, build the scene so the Skia canvas is one
  swappable layer inside a Reanimated-driven composition, verify motion/gesture on web,
  and flag Skia visuals as device-verify-only in your packet.

## Definition of done

1. `node_modules/.bin/tsc --noEmit` clean (strict, exactOptionalPropertyTypes).
2. `node_modules/.bin/vitest run` — all existing 33 tests still green (you add UI code,
   you break nothing).
3. Web preview: title → HUD navigation works; drag-and-drop feels per spec at 375×812;
   idle motion visible; screenshots taken as evidence.
4. Post `docs/review-packets/B-M1-review.md` per kickoff §8 (built vs criteria, exact
   commands + manual script, recording shot list for the human relay, known issues —
   an empty list is suspicious, questions for Fable, contract change requests if any).
5. **STOP after posting the packet.** Fable reviews before anything merges past M1.

Start by reading the files listed above, then confirm your understanding and list any
ambiguities in one short message before building.
