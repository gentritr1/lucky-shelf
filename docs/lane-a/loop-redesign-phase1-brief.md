# Prompt for Lane A (Codex) — Loop Redesign v2, Phase 1: Decision density

Copy everything below the line into a fresh Codex session in `/Users/gentlegen/Desktop/lucky-shelf`.
Full spec: `docs/loop-redesign-v2-spec.md`. This brief is Phase 1 only. Lane A goes FIRST;
Opus/Lane B builds the shop screen on your handoff.

---

You are **Lane A (Codex)** on **Lucky Shelf**. Follow `AGENTS.md` (start replies with `Neek,`;
env quirks below). Device play-test verdict: the loop is too linear — one low-stakes decision
per day ("just 1 item a day"). Phase 1 fixes the root cause: **decision density**. Read
`docs/loop-redesign-v2-spec.md` first (root cause, what we KEEP, phases, open calls already
decided: keep rent + add target later, free draft → day-1 starter, board stays 3×4).

## The change (Phase 1 only — logic/economy, flag-gated)
Today: each day = draft 1-of-3 free (`delivery`), place, open shop; a buy-multiple shop
(`restock`) only every 3rd day. **Phase 1: make every day a buy-multiple shop.** The engine
already has the mechanic — `buyOffer` / `reroll` / `placeItem` / `endRestock` in the `restock`
phase. Reuse it as the daily acquisition verb instead of the 1-item delivery draft.

1. **Starting coins** (~6–8, tune by fuzz) so day 1 you can already buy 2–3 items.
2. **A daily shop** of ~4 offers with costs (not the free 1-of-3 draft). Reroll available.
   Buy as many as you can afford; place each (existing tray drag). Free draft survives only as
   the **day-1 opening hand** (open call #2, decided).
3. **Cost curve** so early-tier items are cheap enough to fill the board in days, not weeks.
   Rebalance `restockCost` / starting economy as needed — this is the tuning surface.
4. **Keep the rent sawtooth** exactly (daily score target is Phase 3, not now).
5. **Flag it:** `LOOP_V2_ENABLED` (or similar) in `src/sim/economy.ts`. OFF ⇒ today's loop,
   byte-identical (delivery/restock cadence, offers, goldens all unchanged). ON ⇒ daily shop.

## Boundaries
- Yours: `src/sim`, `src/sim/economy.ts`, `src/persistence` (if phase-flow state changes),
  `src/state` (selectors the shop screen needs), `src/contracts` (additive/flagged only),
  `scripts`, tests. **NOT yours:** the shop SCREEN / `src/app/*` UI and `src/ui`, `src/juice`
  — Opus/Lane B builds the daily-shop screen on your handoff. Leave a `/shop` (or reuse
  `/restock`) route note for Lane B; don't style it.
- `GameState`/`Action`/`TraceEvent` scoring stays frozen; determinism + golden traces stay
  green. Any contract addition is additive + optional + flagged (no `ContractSchemaVersion`
  bump), same pattern as the spotlight/dailyOrder fields.
- Do not touch the spotlight/order prototype flags; they compose with this independently.

## Acceptance criteria (observable)
1. Flag OFF: `tsc` clean, all tests green, M0 goldens byte-identical, fuzz medians match
   today's baseline (greedy/combo deepest rent ~7–8). Prove the OFF path is unchanged.
2. Flag ON, fuzz A/B (100 runs, greedy + combo): report **board occupancy by day** (median
   shelf should be ~half full by day 3, vs ~3 items today) and **items bought/day**. Placement
   should branch (not a forced single line); no strategy dominates another >2× median.
3. New unit tests for the daily-shop dispatch path (buy-multiple → place → next day is a shop,
   not a 1-item delivery), and that starting coins + day-1 hand are applied once.
4. A scripted arc (like the M4 arc): play a v2 run, assert the board fills faster than a v1 run
   on the same seed.

## Verification method (run these, paste results)
`node_modules/.bin/tsc --noEmit`; `node_modules/.bin/vitest run`;
`node --import tsx scripts/fuzz.ts --runs 100` with flag ON and OFF (paste both), plus your new
occupancy/buys metrics. Mutation-style check: confirm a test fails if the daily-shop routing is
reverted to 1-item delivery.

## Environment quirks (AGENTS.md)
Node v20 only (`export PATH="$HOME/.nvm/versions/node/v20.19.4/bin:$PATH"`; never v23).
corepack pnpm broken → `node_modules/.bin/tsc`, `node_modules/.bin/vitest`, `node --import tsx`.
Don't regress `babel.config.js`.

## Definition of done
1. tsc clean; all tests green (existing + new); goldens byte-identical with flag OFF.
2. Fuzz A/B posted with occupancy + buys metrics; balance sane (no degenerate dominance).
3. Post `docs/review-packets/A-M5a-loop-v2-phase1-review.md` (§8 format) with:
   - a **CCR** for the economy + phase-flow change (additive/flagged, no version bump, needs
     Fable sign-off to graduate);
   - a **handoff for Lane B**: the exact phase/state shape the daily-shop screen consumes
     (offers, coins, which actions advance the day, any new selectors), and the route to use.
4. **STOP after the packet.** Flag stays OFF-reversible until Fable signs off and the relay
   accepts the device feel-gate.

Start by reading the spec + the current `engine.ts`/`economy.ts`/`restock.tsx` flow, then
confirm understanding + ambiguities in one short message before building.
