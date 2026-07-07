# Prompt for Lane A (Codex) — Depth-levers prototype: sim stewardship + coverage

Copy everything below the line into a fresh Codex session in `/Users/gentlegen/Desktop/lucky-shelf`.

Context for the human relay (not for Codex): Opus/Lane B prototyped two flagged "depth"
levers to answer a device play-test that judged the loop too shallow ("too short / no
mechanic"). The levers work and pass tests, but the prototype touched **Lane A files**
(sim/scoring/economy/contracts) without Lane A stewardship or Fable sign-off, and the new
scoring branches have **no targeted tests** (only the determinism hash-pin moved). This
brief hands the *sim side* to Codex to own properly. Presentation (the shelf marker + HUD
banner) stays Lane B and is out of scope.

---

You are **Lane A (Codex)** on **Lucky Shelf**. Follow `AGENTS.md` (start replies with
`Neek,`; env quirks below). Two flagged prototype levers were landed by Lane B and now need
Lane A stewardship: **tests, a fuzz metric, and a contract-change request** — NOT redesign.

## Read first, in order
1. `docs/lucky-shelf-kickoff.md` — pillars, contract-freeze rules, review-packet format (§8).
2. `.claude` project memory is not available to you; instead read these two design notes the
   relay will paste if needed: the levers are (a) **Front Window** — one deterministic
   spotlight slot/day multiplies the item placed there; (b) **Today's Order** — a
   rent-cycle-long tag-collection goal that multiplies matching items when filled.
3. The prototype code, all behind flags in `src/sim/economy.ts`
   (`SPOTLIGHT_ENABLED/_MULT`, `DEMAND_ENABLED/_MULT/_COUNT/_TAG_POOL`):
   - `src/sim/engine.ts` — `pickSpotlight` (per-day) + `pickCycleOrder` (per rent cycle);
     populated in `createRun` and the `openShop` rollover.
   - `src/sim/scoring.ts` — two mult branches emitted as `ruleFire` events (ruleIds
     `'spotlight'`, `'order'`), applied after ambient auras, order before spotlight.
   - `src/contracts/index.ts` — additive optional `spotlight?: Slot|null` and
     `dailyOrder?: DailyOrder|null` on `GameState` (+ `DailyOrderSchema`). No version bump.

## Your scope (do exactly this, nothing more)

1. **Behavioral unit tests** (`src/sim/*.test.ts`) for both branches. Write them against the
   **flag constants**, not hardcoded magnitudes, so they survive tuning:
   - Spotlight: a hand-built `GameState` with `spotlight` set to an occupied slot → that
     slot's `itemTotal` equals the no-spotlight total × `SPOTLIGHT_MULT` (floored), and a
     `ruleFire{ruleId:'spotlight'}` is emitted in that slot's window. Spotlight on an empty
     or blocked slot → no effect, no event.
   - Order: a shelf with ≥ `DEMAND_COUNT` items carrying the order tag → each matching
     item ×`DEMAND_MULT` with a `ruleFire{ruleId:'order'}`; with < count → no effect.
     One test that an item hit by BOTH order and spotlight applies order then spotlight
     (order inside, spotlight last).
   - Determinism: assert `pickCycleOrder` returns the SAME order for all 3 days of a rent
     cycle and a (usually) different one after rent resets; `pickSpotlight` rotates per day.
2. **Golden-trace safety:** confirm (and assert in a test comment) that with both flags
   OFF the M0 fixtures reproduce byte-identically — the fixtures omit both fields, so the
   branches are dead. Do NOT add spotlight/order into any M0 fixture; these are prototype,
   not canon.
3. **Fuzz instrumentation** (`scripts/fuzz.ts` + `src/sim/bots.ts` if needed): add two
   per-strategy metrics — `orderFillRate` (fraction of scored days where the order was met)
   and `spotlightHitRate` (fraction where the spotlight slot was occupied). These tell the
   relay whether the levers are reachable, which the current stats can't show. Keep output
   shape backward-compatible (new keys only).
4. **File the contract/scoring CCR.** In your review packet, record as a Contract Change
   Request for Fable sign-off: the two additive `GameState` fields + `DailyOrderSchema`, and
   the scoring-order insertion (order mult, then spotlight mult, after ambient auras). State
   explicitly that they are **additive + optional + flagged**, that `ContractSchemaVersion`
   was deliberately NOT bumped (v1 saves and fixtures still parse), and that they must not
   graduate from prototype until Fable signs off.

## Non-goals / boundaries (do not cross)
- **Do not touch presentation:** `src/juice/ShelfScene.tsx` (the spotlight marker) and
  `src/app/run.tsx` (the OrderBanner) are Lane B. Leave them alone.
- **Do not retune magnitudes** (`_MULT`, `_COUNT`, cadence) — the relay owns that after the
  device feel-gate. If a test forces a magnitude assumption, assert against the constant.
- **Do not remove or weaken** the determinism hash-pin; if your tests legitimately shift it,
  update it consciously with a one-line reason (as the existing comment instructs).
- No redesign of the mechanics; no new levers.

## Environment quirks (from AGENTS.md)
Node v20 only (`export PATH="$HOME/.nvm/versions/node/v20.19.4/bin:$PATH"`; never v23).
corepack pnpm broken → use `node_modules/.bin/tsc --noEmit`, `node_modules/.bin/vitest run`,
`node --import tsx <script>`. Don't regress `babel.config.js`.

## Definition of done
1. `tsc --noEmit` clean; all tests green (existing + your new spotlight/order tests).
2. The new behavioral tests **fail if either mult branch is deleted** (prove they exercise
   the real path, not a tautology) — note in the packet how you confirmed this.
3. Fuzz emits `orderFillRate` + `spotlightHitRate`; paste a 100-run sample for greedy/combo.
4. Post `docs/review-packets/A-M4b-levers-review.md` (§8 format) with the CCR above and a
   one-paragraph handoff: these are prototypes pending a device feel-gate; magnitudes and
   graduation are the relay's call.
5. **STOP after the packet.** Do not merge/graduate; do not touch Lane B presentation.

Start by reading the listed files + the prototype code, then confirm understanding +
ambiguities in one short message before writing tests.
