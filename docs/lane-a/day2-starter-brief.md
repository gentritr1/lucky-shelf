# Lane A brief — A-M6c: Free day-2 starter delivery (`DAY2_STARTER_ENABLED`)

**Author:** Fable, 2026-07-08. **Implementer:** Codex.
**Decision context:** the human chose this over welcome-week rent / accepting the cliff, after
A-M6b's honest miss. **Review:** Fable re-runs everything below; no self-sign-off.

## Context (self-sufficient)

Lucky Shelf, deterministic sim in `src/sim`. All depth flags default OFF; OFF path pinned
byte-identical (hash `8d48e1c5a6ad14c9`, 6 goldens, 6 fixtures). Toolchain:
`PATH="$HOME/.nvm/versions/node/v23.3.0/bin:$PATH"`.

The beginner floor (the `floor` policy in `src/sim/balanceHarness.ts` — buys first affordable,
places first slot) clears the first 25-coin rent only **12.5–20%** of the time on the v2 configs
even with A-M6b's warm opening ON (see [A-M6b-fable-review](../review-packets/A-M6b-fable-review.md)).
Offer composition hit its ceiling of effect (~1.25× lift); the ruled next lever is **more free
stock**: a second free 1-of-3 delivery at the start of day 2, mirroring the day-1 starter.

Facts verified against live code (do not re-derive from memory):
- Delivery offers already cost 0 by construction (`offerCost` returns 0 for `kind !== 'restock'`).
- v1 already calls `generateOffers(seed, 2, 'delivery', …)` daily, so the day-2 delivery RNG
  derivation exists and collides with nothing; offerIds are kind-distinct from restock ids.
- `canChooseSupplier` requires `state.day === 1` — a day-2 delivery cannot re-open the supplier
  pick. Pin this with a test anyway.
- `routeForPhase('delivery') === '/draft'` — the screen exists; Lane B work is expected to be
  zero (flag any copy on `/draft` that assumes "opening" semantics as a note, don't change UI).

## Design (decided — implement as specified)

- New flag `DAY2_STARTER_ENABLED` (+ env var) in `src/sim/economy.ts`, default OFF, effective only
  for runs whose `loopV2` snapshot is true (mirror `goalLadderEnabled`). Separate flag from
  `WARM_OPENING_ENABLED` so the two beginner levers stay independently measurable; graduation may
  bundle them.
- Flow with the flag ON: after day 1 is scored, the rollover routes to **`delivery` with 3 free
  offers** (`generateOffers(seed, 2, 'delivery', …, supplierTagForOffers(state), …)`) instead of
  straight to the daily shop. Draft + place exactly like the day-1 starter; once the free item is
  placed, phase becomes `restock` with the standard day-2 daily-shop generation (same offers the
  old direct path produced — warm opening, if also ON, applies there as it does today).
- Day 2 only, once per run. Days 3+ unchanged. No new actions, no contract/schema surface.

## Non-goals
No prices/costs/rent/coins/item-table changes; no UI changes; no new Action or GameState fields;
no flag graduations; no `GOAL_LADDER_TARGETS` edits (report drift only).

## Observable acceptance criteria
1. **OFF byte-identity:** pin, goldens, fixtures, full suite green; flag-off v2 rollover state
   after day 1 is byte-identical (assert on sample seeds).
2. **Floor moves (the point):** 80-run balance report with a `DAY2_STARTER`-layered config for
   loopV2/allDepth (add config rows like A-M6b did), measured BOTH alone and combined with
   `WARM_OPENING`: combined `firstRentSurvivalRate` target **≥ 0.30** on both configs (aspiration
   floor is 0.40 — report the gap). If the mechanic tops out short of 0.30, **report the honest
   number and stop** — do not compensate by touching prices, rent, or offer counts. Fable rules
   on the measured reality.
3. **No free lunch:** ceiling day-9 median dayTotal within ±5% of same-seed baseline (120-run
   A/B); `balance.ts --assert-bands` exit 0 (run length [20,36], swing [1.3,2.0] — a free item
   for everyone nudges ceilings up; the swing band is the guardrail most at risk).
4. **Determinism:** 200-replay test green; same seed → same day-2 delivery offers.
5. **Supplier pick stays day-1-only:** test that day-2 delivery exposes no `chooseSupplier`
   (affordances + engine throw).
6. **Degenerate probes:** day-2 delivery with a full shelf must not dead-end (show by coin math
   that ≤ ~8 items are ownable by day 2 AND keep the liveness fuzz green with the flag in its
   config set); buyout+reroll on day 2 after the free placement mints no duplicate ids; goal
   ladder day-2 target still evaluated against the scored day total (report days 1–3 hit-rate
   drift, greedy+combo, 120 runs).
7. **Mutation check:** neuter the day-2 delivery branch, show which tests fail, restore.

## Exact verification commands (Fable re-runs at review)
```
PATH="$HOME/.nvm/versions/node/v23.3.0/bin:$PATH" node_modules/.bin/tsc --noEmit
PATH=… node --import tsx scripts/validate-fixtures.ts
PATH=… node_modules/.bin/vitest run
PATH=… LOOP_V2_ENABLED=1 WARM_OPENING_ENABLED=1 DAY2_STARTER_ENABLED=1 node --import tsx scripts/fuzz.ts --runs 120 --strategy all --seed m6c-on
PATH=… LOOP_V2_ENABLED=1 WARM_OPENING_ENABLED=1 node --import tsx scripts/fuzz.ts --runs 120 --strategy all --seed m6c-on   # same seed, starter off = the A/B
PATH=… node --import tsx scripts/balance.ts --assert-bands
```
Note: the whole-project `tsc` currently fails on the user's in-progress `src/juice/ShelfScene.tsx`
edit (a not-yet-written style). If that WIP is still unresolved when you run, stash exactly that
file for the typecheck and restore it, and say so in the packet — do not "fix" it.

## Deliverable
Review packet `docs/review-packets/A-M6c-day2-starter-review.md` in the A-M5a style: built vs
criteria, exact commands + outputs, floor before/after table (alone + combined with warm opening),
A/B JSON, known issues, questions for Fable, STOP line.

**STOP — land behind the flag, default OFF. No graduation. Fable reviews the packet.**
