# Prompt for Lane A (Codex) — Loop Redesign v2, Phase 3: Daily score-goal ladder

Copy below the line into a fresh Codex session in `/Users/gentlegen/Desktop/lucky-shelf`.
Context: `docs/loop-redesign-v2-spec.md` (Phase 3) + `docs/research-findings-depth-retention.md`
(mechanic #1, Balatro blinds — "validated"). Phase 1 daily shop (`LOOP_V2_ENABLED`), depth levers
(spotlight/order, default ON), and Phase 2c signature items (`SIGNATURE_ITEMS_ENABLED`) already landed
behind flags. This adds the **daily heartbeat**: a per-day coin target layered over the rent wall.

---

You are **Lane A (Codex)** on **Lucky Shelf** (follow `AGENTS.md`; `Neek,` prefix; env quirks below).
Phase 3 gives the loop a **per-day chase**: each day has a coin target; beat it → a small reward. Rent
stays the periodic hard wall (spec open-call #1, decided: **keep rent AND add a daily target**).

## The measured yield curve (trace this loop unit BEFORE tuning — the anchor for the target)
A prior scar (`unfillable daily goal in a 1-draft/day loop`) means the target MUST be calibrated to the
loop's real per-day payout, not guessed. I traced `dayTotal` at `openShop`, **1000 runs each, greedy &
combo, `LOOP_V2_ENABLED=1`** (depth levers default ON, signatures OFF). Greedy ≈ combo (near-identical):

| day | median | p25 | p90 |   | day | median | p25 | p90 |
|----:|-------:|----:|----:|---|----:|-------:|----:|----:|
| 1   | 21     | 15  | 31  |   | 7   | 79     | 62  | 114 |
| 2   | 31     | 23  | 51  |   | 8   | 84     | 68  | 118 |
| 3   | 44     | 33  | 74  |   | 9   | 87     | 72  | 121 |
| 4   | 51     | 35  | 87  |   | 10  | 88     | 73  | 121 |
| 5   | 65     | 47  | 107 |   | 11  | 89     | 76  | 124 |
| 6   | 77     | 58  | 115 |   | 12  | 89     | 77  | 123 |

**The curve rises fast days 1–6 (board filling via the v2 shop), then PLATEAUS at median ~89 from day
~8** (12-slot board saturates). Attrition is low (~5% of bots dead by day 12) — rent doesn't kill
competent play, so the target adds tension without a death spiral.

## The change (flag-gated, additive)
1. **Daily target** `target(day)` = a coin goal for that day, **anchored at ≈0.7× the greedy median**
   (≈ the p25–p30 band, so a competent player beats it ~75% of days — "beatable but not trivial").
   Starting ladder (fuzz-tune the exact form — table or saturating formula, your call):
   `d1 15 · d2 22 · d3 31 · d4 36 · d5 45 · d6 54 · d7 55 · d8 59 · d9 61 · d10+ 62 (cap)`.
   **HARD REQUIREMENT (the scar): the target must CAP below the measured yield plateau (~89 median /
   ~77 p25).** Do not let it keep climbing past day ~9 — a target above the plateau is unfillable by
   construction. Validate the late-day (day 9–12) hit-rate explicitly, not just the early ramp.
2. **Reward for beating it** — recommend **one free reroll token on the next day's shop** (keeps agency
   in the loop, does NOT directly inflate coins / undercut rent as the fail wall). *Alternatives to
   flag, your pick with fuzz evidence: a small flat coin bonus (e.g. +3) or a one-day shop discount —
   but if you pick a coin/discount reward you must show the game-over rate stays in band (see below).*
3. Rent is untouched — the target is a separate, softer beat layered over it.

## Flag + safety
- New `GOAL_LADDER_ENABLED = false` + `GOAL_LADDER_ENV_VAR` + `goalLadderEnabled()` in `economy.ts`,
  mirroring the other flags. Env override `GOAL_LADDER_ENABLED=1` for fuzz.
- The ladder is **calibrated for the v2 loop** (the traced curve above assumes `LOOP_V2_ENABLED`); the
  v1 1-draft/day curve is far lower, so gate/validate under loop-v2. State how the two flags relate.
- OFF ⇒ no target computed, no reward, no new events; **M0 goldens + determinism pin
  (`8d48e1c5a6ad14c9`, `src/sim/determinism.test.ts`) byte-identical.** Prove it.
- Any new `GameState` field (e.g. `dailyTarget?: number`, `targetMet?: boolean`, a reward/token count)
  is **additive + optional + flagged**, **no `ContractSchemaVersion` bump** (v1 saves/fixtures still
  parse) — same discipline as `spotlight`/`dailyOrder`.

## Boundaries
- Yours: `src/sim` (economy + engine target/reward plumbing), `src/contracts` (additive optional fields
  only), `scripts/fuzz.ts` + `src/sim/bots.ts` (metrics; a bot may "aim for" the target if needed),
  tests. **NOT yours:** `src/app`, `src/ui`, `src/juice` — Lane B renders the target HUD + reward
  afterward. Provide a selector/fields so Lane B can show the day's target, met/unmet, and reward.

## Acceptance criteria (observable)
1. **OFF:** `tsc` clean, all tests green, goldens byte-identical, determinism pin unchanged, fuzz
   medians match baseline.
2. **ON, unit tests:** target present per day; `targetMet` true iff `dayTotal >= target(day)`; the
   reward is granted exactly once on a met day and consumable in the loop; a mutation check (deleting
   the target/reward branch fails a test). Assert against the ladder constant, not magic numbers.
3. **Fuzz (ON), the balance gate — the scar:** report **per-day target hit-rate** for greedy & combo.
   Bands: hit-rate in **~65–85% of surviving days across the WHOLE curve incl. days 9–12** (NOT ~100%
   = trivial, NOT <50% = punishing); random bots rarely beat it. And **rent still bites**: game-over
   rate stays within ~±3pts of the no-ladder baseline (the reward must not trivialize the wall).
4. **Determinism:** same seed ON → identical (target is a pure function of day; reward state is seeded).

## Environment quirks (AGENTS.md)
Node v20 (`export PATH="$HOME/.nvm/versions/node/v20.19.4/bin:$PATH"`; never v23). `node_modules/.bin/tsc`,
`node_modules/.bin/vitest`, `node --import tsx`. Don't regress `babel.config.js`.

## Definition of done
1. `tsc` clean; tests green (existing + new); goldens/determinism byte-identical with the flag OFF.
2. Fuzz posted: per-day hit-rate (incl. late days) for greedy/combo + game-over-rate vs baseline.
3. Post `docs/review-packets/A-M5d-goal-ladder-review.md` (§8 format) with a **CCR** for the additive
   `GameState` fields + reward semantics (Fable sign-off; note NO schema-version bump) and a **Lane B
   handoff**: the fields/selector for the target HUD (day target, met/unmet, reward granted).
4. **STOP after the packet.** Flag stays OFF-reversible pending Fable sign-off + the relay's device
   feel-gate. Do not graduate; do not touch Lane B.

Start by reading `docs/loop-redesign-v2-spec.md` (Phase 3), the yield table above, and the rent/economy
code in `src/sim/economy.ts` + `src/sim/engine.ts`, then confirm understanding + ambiguities in one
short message before building.
