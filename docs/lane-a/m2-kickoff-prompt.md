# Prompt for Lane A (Codex) — M2 kickoff

Copy everything below the line into a fresh Codex (or Claude) session running in
`/Users/gentlegen/Desktop/lucky-shelf`.

---

You are **Lane A (Codex) — Logic & Heavy Work** on **Lucky Shelf** (cozy spatial
roguelite, portrait phones). Your creed from the kickoff: **boring correct code.**

## Read first, in order

1. `docs/lucky-shelf-kickoff.md` — full brief; your lane is §5, the Contract is §4,
   working agreement §8 (post a review packet, then STOP).
2. `docs/review-packets/A-M1-fable-review.md` — your M1 was accepted with rulings
   R-10…R-15. `A-M0-fable-review.md` has R-1…R-9 and freeze terms.
3. `docs/review-packets/B-M1-fable-review.md` — rulings R-20, R-23, R-26 assign you
   work this milestone (details below).
4. `src/contracts/index.ts` (frozen v1 — changes need a CCR + Fable sign-off),
   `src/sim/` (yours, all green), `src/items/` (Fable's data, don't redesign),
   `src/persistence/README.md` (your own M0 AsyncStorage rationale — now build it).

## Project state (verified)

- Engine complete through M1: rule engine, goldens reproduced, determinism suite
  (pinned hash in `src/sim/determinism.test.ts`), fuzz harness, dispatcher, replay.
  36-item table + 20 combos live. 33/33 tests green, tsc strict clean.
- Lane B has shipped Title/HUD/Settings shells + drag feel. The HUD currently uses a
  **mock** state (`src/juice/mockShelf.ts`) and **cosmetic** moves (their KI-4).
  Your store wiring this milestone is what retires that.

## Your M2 scope

1. **Persistence adapter** (`src/persistence/`) — versioned saves per your README:
   AsyncStorage, `schemaVersion`-gated, zod-parsed on load (corrupt/mismatched saves
   fail safe to a fresh state, never crash). Save = GameState snapshot + enough meta
   to Continue. Autosave on every dispatch that changes state. Unit-test round-trip +
   corruption + version-mismatch paths with an in-memory AsyncStorage mock.
2. **Zustand run store** (`src/app/store.ts` or similar) — wraps the pure sim:
   `dispatch(action)` → `src/sim` dispatch → set new GameState → autosave. Expose
   narrow selectors (shelf, coins, day, rent, moves, phase, offers, lastScoringTrace).
   Lane B consumes ONLY contracts types + these selectors — design the selector
   surface so they never need sim internals. EngineError from an illegal action must
   surface as a rejected action (no crash, no state change).
3. **R-20 traceId migration** — `traceId` becomes `trace-${seed}-d${day}` in
   `src/sim/scoring.ts`, then **regenerate all six fixtures from the engine** (write a
   small script: load fixture GameStates, run `resolveOpenShop`, replace the stored
   traces; hand-verify totals are unchanged — only traceIds may differ). Goldens test
   must stay meaningful (engine output === fixtures). Update the pinned determinism
   hash consciously (one-line snapshot update, note it in the packet).
4. **R-23 sticky fixture** — add ONE engine-generated arrange-phase fixture with a
   sticky item so Lane B can retire `mockShelf.ts`. NOTE: `FixtureCollectionSchema`
   is `.length(6)` in the frozen contract — changing it to 7 is a **Contract Change
   Request** in your packet (recommend `.min(6)`), OR ship the 7th fixture in a
   separate file outside the collection. Your call; state it in the packet.
5. **Wire the Run HUD to the real store** — replace the mock in `src/app/run.tsx`
   with store selectors + real dispatch for moveItem (retires Lane B's KI-4: the
   3-move economy becomes enforced; drag commit calls dispatch and a rejected move
   rubber-bands — coordinate via the existing `onCommitMove` callback, don't rewrite
   Lane B's juice components). Keep `src/app/_layout.tsx`'s GestureHandlerRootView +
   SafeAreaProvider wrap (R-26 — it stays).

## Boundaries

- Yours: `src/sim`, `src/persistence`, `src/app` scaffolding/store/wiring, `scripts/`,
  `/fixtures` (regeneration is R-20-sanctioned). NOT yours: `src/ui`, `src/juice`
  (Lane B) — the one exception is the minimal `run.tsx` data wiring above; touch
  presentation as little as possible and flag every Lane B file you edit in the packet.
- `src/contracts` is frozen — any change is a CCR in your packet (see item 4).
- `/src/sim` and `/src/items` must keep running under plain Node (no RN imports).
  Persistence may import AsyncStorage but keep a pure interface so tests run in Node.
- Determinism is law (Pillar 5): same seed + actions = same run, including through
  save/load round-trips.

## Environment quirks (will bite you otherwise)

- Default Node is v14 and breaks everything. Prepend
  `export PATH="$HOME/.nvm/versions/node/v20.19.4/bin:$PATH"` (arm64; do NOT use
  v23.3.0 — x86_64, trips arm64 esbuild).
- `pnpm` via corepack is broken here. Use `node_modules/.bin/tsc --noEmit`,
  `node_modules/.bin/vitest run`, `node --import tsx <script>`.
- Don't regress `babel.config.js` (pnpm + Reanimated 4 fixes live there).
- A Lane B session may be working in parallel: do not edit `src/ui/**`,
  `src/juice/**` (except the sanctioned `run.tsx` wiring), or
  `docs/lane-b/**`. If you need a dev server, use the `expo-web` launch config
  (port 8090); 8091 belongs to Lane B.

## Definition of done

1. tsc strict clean; ALL tests green (existing 33 + your new persistence/store/fixture
   tests). Goldens still engine-verified after regeneration.
2. `pnpm m1` equivalent by direct binaries + a fresh 100-run greedy fuzz sanity check
   (numbers should match `docs/review-packets/fable-item-table-v1.md` within noise —
   your changes must not move the economy).
3. Full manual loop on web: Title → New Run → drag (moves decrement for real, 4th
   move blocked or paid per economy) → Open Shop → next day; kill the app; Continue
   restores the exact state (hash-compare in a test).
4. Post `docs/review-packets/A-M2-review.md` (§8 format: built vs criteria, exact
   commands, outputs pasted, known issues — empty list is suspicious, questions for
   Fable, CCRs incl. the fixture-count decision).
5. **STOP after the packet.** Fable reviews before M3 integration.

Start by reading the listed files, then confirm understanding + ambiguities in one
short message before building.
