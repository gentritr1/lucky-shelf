# B-M0 Review Packet — Tokens & Proof Screen

## 1. Built vs. Milestone Criteria

- **Design tokens draft:** `src/ui/tokens.ts` — palette (six kickoff anchors +
  derived shades, zero color literals elsewhere), spacing/radii/type scales,
  shadow presets, motion durations/easings/springs, haptic choreography map with
  cascade escalation thresholds, accessibility constants (44 pt targets,
  bottom-60% reach zone), colorblind-safe 4-hue arrow palette.
- **Component inventory:** `docs/lane-b/component-inventory.md` — kit primitives
  (6 built), Skia scene graph plan, all 9 screens mapped to milestones.
- **Drag-and-drop motion spec (first-action requirement):**
  `docs/lane-b/motion-spec.md` — grab/drag/drop/cascade numbers: durations,
  bezier control points, spring configs, haptic map, escalation ladder.
- **Polished throwaway screen:** route `/token-proof`
  (`src/app/token-proof.tsx`) — full HUD composition: day header, CoinCounter,
  RentChip (warm state — rent due in 2), ShelfPreview rendered directly from the
  shared `m0-wine-dine-combo` fixture GameState, delivery row with 3 selectable
  OfferCards, primary/secondary WoodButtons. Proves: tokens theme everything,
  Lane B consumes fixtures with zero Lane A dependency.

## 2. Exact Commands + Manual Script

```bash
pnpm typecheck && pnpm test      # 33/33, Lane B additions compile strict
pnpm start                        # then: open /, tap "Lane B M0: token proof screen"
```

Manual script: ① launch → M0 status screen → follow link. ② Verify shelf shows
wine + 3 cheese from the fixture. ③ Tap each offer card — teal selection ring +
press-scale. ④ Press-and-hold both buttons — 0.97 scale, 44 pt height. ⑤ Check
RentChip renders the sunlight "warm" tone (dueInDays = 2 in fixture).

## 3. Recording Request (shot list for the human relay)

1. Cold open on `/token-proof`, portrait, light mode — 3 s hold.
2. Slow pan: header → rent chip → shelf → offers → buttons.
3. Offer card tap ×3 (selection ring movement), button press-and-hold.
4. Same screen with device font scaling at 130% (type-scale stress).

## 3b. Web Verification (done in session)

Screen verified live on Expo web at 375×812: full HUD composition fits one viewport,
offer selection ring works, RentChip renders the warm tone, both actions in the bottom
reach zone. Getting web running surfaced **two Lane A scaffold bugs, fixed in
`babel.config.js`** (cross-lane touch, flagged):

- `react-native-reanimated/plugin` → `react-native-worklets/plugin` (Reanimated 4 moved
  it; the old path throws at transformer init — Metro's opaque "transformFile of
  undefined" error).
- `babel-preset-expo` resolved via `createRequire(require.resolve('expo/package.json'))`
  — pnpm's strict node_modules doesn't hoist it to the root.

Device recording (with haptics) still requested below — web proves layout and tokens,
not feel.

## 4. Known Issues + Spec Deviations

- Proof screen uses emoji glyphs as sprite placeholders (kickoff:
  placeholder-first; Higgsfield pack is M4).
- Press feedback is Pressable style-scale, not the spec'd spring — Reanimated
  wiring is M1 scope; the spring configs already live in tokens.
- No SafeArea handling yet (padding approximation); Lane A's navigation shell
  gets SafeAreaProvider at M1 integration.
- Added one link into Lane A's `src/app/index.tsx` (Lane A file) — flagged as a
  cross-lane touch; revert on request.
- Dusk/ambience token variants deliberately deferred to M4 (single source of
  truth stays small until the art pass).
- On-device verification not possible in this session — recording requested
  above; typecheck + web static render are the M0 evidence.

## 5. Questions For Fable

1. Drag onto an occupied slot: hard-illegal (v1 spec) or swap gesture? (M2)
2. Cascade speed control: always visible, or unlocked after run 2?
3. Is the cascade skippable on rent-due days, or does tension demand watching?
4. Display font: commission with the Higgsfield pass (M4) or earlier? System
   font holds until then.
5. Confirm from A-M1 open item: Lane B does **not** key on `traceId` — Lane A
   may day-qualify ids and regenerate fixtures freely.

## 6. Contract Change Requests

- None. Contracts consumed as frozen; fixture pipeline worked untouched.
