# A-M5d Goal Ladder Review Packet

## 1. Built vs. criteria

- Added `GOAL_LADDER_ENABLED = false`, `GOAL_LADDER_ENV_VAR`, and `goalLadderEnabled()` in `src/sim/economy.ts`.
- `goalLadderEnabled()` is effective only when `LOOP_V2_ENABLED` is also on. The ladder is calibrated to the loop-v2 daily shop yield curve; v1 remains untouched.
- Added capped ladder `GOAL_LADDER_TARGETS = [16, 24, 34, 39, 49, 59, 62, 68, 72, 74]`; day 10+ caps at 74, below the measured late plateau / p25 band.
- Added optional contract fields, no schema-version bump:
  - `dailyTarget?: number`
  - `dailyTargetResult?: { day, target, dayTotal, targetMet, rewardKind:'freeReroll', rewardGranted }`
  - `freeRerollTokens?: number`
- On `openShop`, the engine records `dailyTargetResult`; `targetMet` is exactly `dayTotal >= target`.
- Reward is one next-shop free reroll token. The token is 0/1, not accumulating: a hit sets it to 1, a miss clears stale reward state.
- Existing `reroll` action consumes a free token before coins; action surface is unchanged.
- `legalActions` exposes `reroll` when either a free token exists or the player can pay `REROLL_COST`.
- Bots/fuzz now report `dayTotalByDay`, `goalTargetHitRate`, per-day hit rates through day 12, late days 9-12, rewards granted, and free rerolls spent.
- Greedy/combo bots consume a free reroll when no buy is available and shelf space remains.
- Added focused tests in `src/sim/goalLadder.test.ts` plus contract parse coverage.

## 2. Commands run

```sh
env PATH=/Users/gentlegen/.nvm/versions/node/v20.19.4/bin:$PATH node_modules/.bin/tsc --noEmit
env PATH=/Users/gentlegen/.nvm/versions/node/v20.19.4/bin:$PATH node --import tsx scripts/validate-fixtures.ts
env PATH=/Users/gentlegen/.nvm/versions/node/v20.19.4/bin:$PATH node_modules/.bin/vitest run
env PATH=/Users/gentlegen/.nvm/versions/node/v20.19.4/bin:$PATH LOOP_V2_ENABLED=1 node --import tsx scripts/fuzz.ts --runs 1000 --strategy all --seed goal-ladder-baseline-final
env PATH=/Users/gentlegen/.nvm/versions/node/v20.19.4/bin:$PATH LOOP_V2_ENABLED=1 GOAL_LADDER_ENABLED=1 node --import tsx scripts/fuzz.ts --runs 1000 --strategy all --seed goal-ladder-final
```

## 3. Output summary

- Typecheck: clean.
- Fixtures: `Validated 6 M0 fixtures`; sticky fixture validated.
- Tests: `17 passed (17)`, `101 passed (101)`.
- Determinism pin remains `8d48e1c5a6ad14c9`.
- OFF fuzz (`LOOP_V2_ENABLED=1`, ladder off): all goal fields empty/zero.
- OFF day-total medians:
  - Greedy days 1-12: `20,31,45,52,66,77,79,84,86,87,88,90`
  - Combo days 1-12: `21,32,45,52,66,77,79,84,88,88,88,90`
- ON tuned hit rates:
  - Random: overall `0.001`; rarely beats target.
  - Greedy: overall `0.819`; days 1-12 `0.749,0.741,0.732,0.720,0.740,0.749,0.758,0.786,0.804,0.770,0.812,0.819`; days 9-12 `0.801`.
  - Combo: overall `0.806`; days 1-12 `0.755,0.775,0.725,0.712,0.746,0.761,0.764,0.780,0.772,0.743,0.786,0.789`; days 9-12 `0.772`.
- Rent bite: game-over rate stayed `1.000` for random/greedy/combo in OFF and ON fuzz, so the free reroll does not trivialize the rent wall in this bot sample.

## 4. Known issues + spec deviations

- The provided starting ladder was too easy in the first 1000-run ON fuzz: greedy/combo late hit rate was about 90%. I tuned upward to the current table while keeping the cap below the measured late p25/plateau band.
- Free rerolls are not coin rewards and do not inflate rent payment directly. They are intentionally 0/1 next-shop tokens; unused tokens do not stockpile.
- Random bots die early and rarely provide day 9-12 target samples. Greedy/combo are the meaningful late-curve gate here.

## 5. Questions for Fable

- Approve tuned target table `[16,24,34,39,49,59,62,68,72,74]` and day 10+ cap at 74?
- Approve next-shop free reroll token semantics: hit sets token to 1, miss clears it, `reroll` spends token before coins?
- Should Lane A keep the token as a visible count for Lane B, or should Lane B treat it as boolean because it is currently capped at 1?

## 6. Contract change request

CCR requested: additive optional `GameState` fields for Phase 3 goal HUD/reward state:

- `dailyTarget?: number`
- `dailyTargetResult?: DailyTargetResult`
- `freeRerollTokens?: number`

No `ContractSchemaVersion` bump. Existing v1 saves/fixtures parse unchanged, and flag-off runs do not create these fields.

Lane B handoff:

- Show current target from `GameState.dailyTarget` when present.
- Show last result from `GameState.dailyTargetResult`: `targetMet`, `dayTotal`, `target`, `rewardGranted`.
- Show free reroll affordance from `GameState.freeRerollTokens ?? 0`.
- No Lane B state mutation needed; use existing `reroll` action.
