# Lucky Shelf — handoff context (for starting a new conversation)

Last updated 2026-07-07. Read this first, then `docs/loop-redesign-v2-spec.md`.

## What the game is
Cozy shopkeeper roguelike (React Native / Expo, native `ios/` project with Skia). You place items
on a **3×4 shelf** (drag-drop); "Open Shop" runs a **deterministic scoring cascade** (adjacency
rules, auras, named combos). **Rent** every 3 days, escalating, is the fail wall. Permanent Catalog
meta. 36 base items + 5 signature items. Repo at `/Users/gentlegen/Desktop/lucky-shelf`.

## Where the project is
A **loop redesign** is underway to fix a device verdict: *too linear, one decision/day, no build
identity*. Direction = deepen the loop toward a Luck-be-a-Landlord/Balatro shape. Spec + research:
`docs/loop-redesign-v2-spec.md`, `docs/research-findings-depth-retention.md`.

**Landed behind flags (all reviewed), in `src/sim/economy.ts`:**
- **Depth levers** (default **ON**): Front Window spotlight (×3 slot) + Today's Order (tag-set ×1.5).
  `SPOTLIGHT_ENABLED`, `DEMAND_*`.
- **Loop v2 Phase 1** (default OFF, `LOOP_V2_ENABLED`): every day is a buy-multiple daily shop
  (reuses the `restock` phase) + starting coins → board fills faster. APPROVED (orchestrator).
- **Signature items Phase 2c** (default OFF, `SIGNATURE_ITEMS_ENABLED`): 5 run-defining items that
  bend scoring (brass-scale, ledger-book, lucky-cat, consignment-sign, window-display). APPROVED
  behind flag — see `docs/review-packets/A-M5b-fable-review.md`.

OFF path is byte-identical (determinism pin `8d48e1c5a6ad14c9`, goldens unchanged). To feel v2 on
device: flip `LOOP_V2_ENABLED` + New Run.

## Verified state
- `tsc --noEmit` clean; **79 tests** pass; 6 M0 goldens unchanged.
- **All Lane B UI verified on the iOS simulator** (iPhone 16 Pro): coin centering (pill+slam+offer
  cards), both top bars centered, cascade footer (double-shelf) fixed, restock rebuilt as a clean
  daily-shop list, tier-1 pip removed, selection contrast, assets shrunk ~96% (sprites 1024→256,
  backgrounds PNG→JPG). See memory `ios-ui-verify-on-simulator`.

## Open loops / next work
1. **Graduation gates** before any flag ships ON: real **Fable sign-off** on the v2 economy + the
   signature scoring rule kinds (CCRs in the Codex packets); **device feel-gate** (does the fuller
   board feel like real decisions?); **re-measure signature dominance** with forced-signature seeding
   — `lucky-cat` hit 2.45× median in one run (yellow flag, tiny sample).
2. **Remaining redesign phases:** 2a tag-archetype multipliers, 2b build-steering (supplier pick),
   Phase 3 daily score-goal ladder, Phase 4 balance + more item variety + final UI polish.
3. **Git:** work is committed on a branch off `main` (not merged, not pushed).

## How we work (important)
- **Lane split:** Codex = Lane A (sim/scoring/economy/persistence/fixtures/fuzz); Opus = Lane B
  (UI/screens/juice/cascade). Briefs for Codex live in `docs/lane-a/`; Codex reads `AGENTS.md`.
- **Review:** Fable is unavailable, so an **independent fresh-context Opus** reviews Lane B (the
  implementer never self-signs-off); the orchestrator reviews Lane A. See memory
  `reviewer-workflow-opus-split`. Reviews re-run the scenario (fuzz A/B, mutation check), not the diff.
- **Verify RN/iOS UI on the simulator**, not web (web can't reach drag-gated gameplay screens). Build:
  boot a sim, `CI=1 npx expo run:ios --device "iPhone 16 Pro"` (node v20 on PATH), drive with
  computer-use. iOS text-centering needs `transform: translateY` (includeFontPadding is Android-only).

## Key files & docs
- Flags/economy: `src/sim/economy.ts`. Scoring: `src/sim/scoring.ts`. Engine/loop: `src/sim/engine.ts`.
- UI: `src/app/{run,restock,draft,index}.tsx`, `src/ui/components/{CoinCounter,OfferCard}.tsx`,
  `src/juice/{ShelfScene,cascade/*}.tsx`.
- Spec: `docs/loop-redesign-v2-spec.md`. Research: `docs/research-*.md`. Briefs: `docs/lane-a/*`.
  Review packets: `docs/review-packets/A-M5*`.
- Project memory index: `~/.claude/projects/-Users-gentlegen-Desktop-lucky-shelf/memory/MEMORY.md`.
