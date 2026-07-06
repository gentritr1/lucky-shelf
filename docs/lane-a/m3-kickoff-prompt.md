# Prompt for Lane A (Codex) — M3 kickoff (INTEGRATION, goes FIRST)

M3 is the merge milestone: real sim drives real UI. Unlike M0–M2, both lanes touch
the SAME screen files (`run.tsx`, `draft.tsx`, `restock.tsx`), so M3 is **sequenced,
not parallel**: Lane A lands the plumbing first and posts a short handoff, THEN Lane B
does the presentation pass on the integrated build. Do not wait for Lane B; you are the
first mover.

Copy everything below the line into a fresh Codex session in
`/Users/gentlegen/Desktop/lucky-shelf`.

---

You are **Lane A (Codex) — Logic & Heavy Work** on **Lucky Shelf**. Your creed:
**boring correct code.** M3 = Integration & Fun Gate (kickoff §9). You go first and
wire the plumbing; Lane B polishes on top of what you land.

## Read first, in order

1. `docs/lucky-shelf-kickoff.md` — §9 M3 accept criteria, §4 contract, §8 packet format.
2. `docs/review-packets/A-M2-fable-review.md` — your M2 acceptance + **R-31**
   (New Run → pure `createRun` at M3) and the standing note: **nothing non-route lives
   in `src/app/`** (it's a routes dir; the store lives in `src/state/store.ts`).
3. `docs/review-packets/B-M2-fable-review.md` — Lane B's cascade is done; **R-29/R-31**
   pairing (draft/restock become real-offer-fed here), the M3 task split, and the note
   that the first real `vanish` trace confirms Lane B's visual.
4. `src/state/store.ts` (your run store), `src/app/run.tsx` / `draft.tsx` /
   `restock.tsx` / `cascade-harness.tsx` (Lane B's screens — you wire data into them,
   you do NOT restyle them), `src/juice/cascade/` (the CascadeLayer you'll mount).

## Project state (verified)

- Sim complete through M2: engine, goldens, determinism (`768bffb34531c49d`),
  persistence adapter, zustand store, replay. 46/46 tests, tsc clean.
- Lane B has: cascade layer + harness, draft/restock screens (currently mock-fed and
  reachable from a title "M2 Preview" cluster), retuned tokens. Their screens EXPECT to
  become real-offer-fed — that's your job this milestone.

## Your M3 scope (plumbing — land this, then STOP for Lane B)

1. **New Run → pure day-1 `createRun(seed)` (R-31).** Drop the M2 arrange-phase starter
   scaffold. A fresh run begins in `delivery` phase with real seeded offers.
2. **HUD phase routing.** Drive navigation from `GameState.phase`: `delivery` → draft
   screen, `arrange` → the shelf HUD, `restock` → restock screen, `gameOver` → run
   summary (a minimal summary is fine this milestone; Lane B polishes at M4/M5). Route
   from phase, not from ad-hoc buttons.
3. **Real offers feed Lane B's screens.** Draft screen renders `state.currentOffers`
   via store selectors; `draftItem`/`buyOffer`/`reroll`/`endRestock` dispatch for real.
   Consume the selector surface; do not import sim internals into screens.
4. **Cascade wired to real scoring.** On `openShop`, mount Lane B's `CascadeLayer`
   against the freshly-produced `state.lastScoringTrace` (the real ScoringTrace, not a
   fixture). When the cascade completes, advance to the next phase. Use Lane B's layer
   API as-is; if it needs an onComplete hook it doesn't expose, flag it for Lane B
   rather than forking it.
5. **First real `vanish` sanity.** Confirm a Coupon Stack countdown→0 produces a
   `vanish` trace end to end (a scripted/seeded scenario or a unit check is enough);
   note it in the packet so Lane B's fade-puff gets its first real trace at M4.
6. **Fuzz degenerate-strategy re-run** on the integrated build: confirm no bot strategy
   beats variance by >2× median (kickoff M3 accept). Paste stats.

## Boundaries

- Yours: `src/sim`, `src/persistence`, `src/state`, `scripts`, `/fixtures`, and the
  DATA WIRING inside `src/app/*.tsx`. NOT yours: `src/ui`, `src/juice` styling, tokens,
  motion (Lane B). You may READ Lane B components and pass them props/selectors; you may
  not restyle them. Flag every Lane B file you touch and keep touches minimal.
- `src/contracts` frozen — any change is a CCR in your packet.
- Determinism is law: same seed + actions = same run, through save/load.
- Keep the cosmetic-vs-enforced line honest: moves are now REAL (the store enforces the
  3-move economy) — retire any remaining "cosmetic move" scaffolding.

## Environment quirks

- Default Node v14 breaks everything → `export PATH="$HOME/.nvm/versions/node/v20.19.4/bin:$PATH"`
  (arm64; never v23.3.0 — x86_64, trips esbuild).
- corepack pnpm broken → `node_modules/.bin/tsc --noEmit`, `node_modules/.bin/vitest run`,
  `node --import tsx <script>`.
- Don't regress `babel.config.js`. Use the `expo-web` launch config (port 8090); 8091
  is Lane B's.

## Definition of done

1. tsc strict clean; all tests green (add integration tests: phase routing produces the
   right screen; openShop → real trace → cascade mount; New Run starts at delivery).
2. Full loop on web at 375×812: New Run → draft a real offer → arrange (real moves,
   4th move blocked/paid) → Open Shop → **real cascade plays the actual day's trace** →
   next day; every 3rd day → restock (buy/reroll/sell/end) → continue; miss rent →
   gameOver. Kill + Continue restores mid-run.
3. Fuzz stats pasted; degenerate-strategy check passes.
4. Post `docs/review-packets/A-M3-review.md` (§8 format) with a **handoff section for
   Lane B**: exactly what's wired, the CascadeLayer mount contract, any prop/hook Lane B
   needs to add, and the list of Lane B files you touched.
5. **STOP after the packet.** Fable reviews, then hands Lane B the M3 polish pass.

Start by reading the listed files, then confirm understanding + ambiguities in one
short message before building.
