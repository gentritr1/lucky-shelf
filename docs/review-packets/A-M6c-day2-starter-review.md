# A-M6c Review Packet - Day-2 Starter Delivery

## 1. Built vs. criteria

- Added `DAY2_STARTER_ENABLED` / `DAY2_STARTER_ENV_VAR` in `src/sim/economy.ts`, default OFF.
- The flag is effective only when the run's `loopV2` snapshot is true, matching the goal-ladder/shelf-expansion pattern.
- With `LOOP_V2_ENABLED=1 DAY2_STARTER_ENABLED=1`, scoring day 1 now rolls to `phase: 'delivery'` on day 2 with 3 free `delivery` offers.
- After the day-2 free item is drafted and placed, the run routes to `phase: 'restock'` and generates the same day-2 paid shop offers the old direct path produced.
- Day 3+ remains the existing v2 daily-shop rollover.
- No `Action`, `GameState`, schema, item table, price, cost, rent, starting coin, or offer-count changes were made.
- Added balance configs: `loopV2Day2Starter`, `loopV2WarmOpeningDay2Starter`, `allDepthDay2Starter`, `allDepthWarmOpeningDay2Starter`.
- Added focused tests for flag-off v2 rollover, deterministic day-2 delivery offers, old day-2 shop preservation, supplier day-1-only lockout, full-shelf liveness, day-2 buyout+reroll duplicate IDs, and goal-ladder day-2 evaluation.

Acceptance status: the implementation is behind the flag and verified, but the measured floor misses the requested `>= 0.30` combined target. No compensating tuning was done.

## 2. Exact verification commands and outputs

```sh
PATH="$HOME/.nvm/versions/node/v23.3.0/bin:$PATH" node_modules/.bin/tsc --noEmit
```

Output:

```text
(no stdout; exit 0)
```

```sh
PATH="$HOME/.nvm/versions/node/v23.3.0/bin:$PATH" node --import tsx scripts/validate-fixtures.ts
```

Output:

```text
m0-basic-wine-cheese: 6 trace events
m0-wine-dine-combo: 13 trace events
m0-mirror-copy: 6 trace events
m0-shop-cat-row-aura: 9 trace events
m0-scores-last-clock: 5 trace events
m0-bamboo-transform: 6 trace events
Validated 6 M0 fixtures.
m2-arrange-sticky: 1 sticky item(s), arrange phase.
```

```sh
PATH="$HOME/.nvm/versions/node/v23.3.0/bin:$PATH" node_modules/.bin/vitest run
```

Output:

```text
RUN  v4.1.9 /Users/gentlegen/Desktop/lucky-shelf

Test Files  25 passed (25)
Tests  147 passed (147)
Duration  31.95s
```

This includes the pinned determinism hash `8d48e1c5a6ad14c9`, the 200 random-action replay test, and the 6 M0 golden trace tests.

```sh
PATH="$HOME/.nvm/versions/node/v23.3.0/bin:$PATH" LOOP_V2_ENABLED=1 WARM_OPENING_ENABLED=1 DAY2_STARTER_ENABLED=1 node --import tsx scripts/fuzz.ts --runs 120 --strategy all --seed m6c-on
```

Output: full JSON emitted and exited 0. Decision fields from that JSON:

```json
{
  "seedPrefix": "m6c-on",
  "loopV2Enabled": true,
  "warmOpeningEnabled": true,
  "day2StarterEnabled": true,
  "results": {
    "random": { "daysSurvivedMedian": 3, "totalCoinsEarnedMedian": 1 },
    "greedy": { "daysSurvivedMedian": 24, "totalCoinsEarnedMedian": 1963, "day9DayTotalMedian": 87 },
    "combo": { "daysSurvivedMedian": 24, "totalCoinsEarnedMedian": 1960, "day9DayTotalMedian": 86 }
  }
}
```

```sh
PATH="$HOME/.nvm/versions/node/v23.3.0/bin:$PATH" LOOP_V2_ENABLED=1 WARM_OPENING_ENABLED=1 node --import tsx scripts/fuzz.ts --runs 120 --strategy all --seed m6c-on
```

Output: full JSON emitted and exited 0. Decision fields from that JSON:

```json
{
  "seedPrefix": "m6c-on",
  "loopV2Enabled": true,
  "warmOpeningEnabled": true,
  "day2StarterEnabled": false,
  "results": {
    "random": { "daysSurvivedMedian": 3, "totalCoinsEarnedMedian": 0 },
    "greedy": { "daysSurvivedMedian": 24, "totalCoinsEarnedMedian": 1973, "day9DayTotalMedian": 90 },
    "combo": { "daysSurvivedMedian": 24, "totalCoinsEarnedMedian": 1947, "day9DayTotalMedian": 91 }
  }
}
```

```sh
PATH="$HOME/.nvm/versions/node/v23.3.0/bin:$PATH" node --import tsx scripts/balance.ts --assert-bands
```

Output excerpt:

```text
Balance report - 80 runs per policy/config (seed "balance", maxActions 600)
Guardrail bands (--assert-bands enforces): ceiling run length [20, 36]d; build swing [1.3, 2]x.

Config: loopV2Day2Starter
  FLOOR            survival median 3d (p90 21, max 27); first-rent survival 26.3%; near-death 26.3%; earned median 31c
  CEILING(greedy)  survival median 24d (p90 27, max 27); first-rent survival 100.0%; near-death 100.0%; earned median 1911c
  CEILING(combo)   survival median 24d (p90 27, max 27); first-rent survival 100.0%; near-death 100.0%; earned median 2024c

Config: loopV2WarmOpeningDay2Starter
  FLOOR            survival median 3d (p90 12, max 27); first-rent survival 27.5%; near-death 27.5%; earned median 32c
  CEILING(greedy)  survival median 24d (p90 27, max 27); first-rent survival 100.0%; near-death 100.0%; earned median 1861c
  CEILING(combo)   survival median 24d (p90 27, max 30); first-rent survival 98.8%; near-death 98.8%; earned median 1949c

Config: allDepthDay2Starter
  FLOOR            survival median 3d (p90 21, max 27); first-rent survival 25.0%; near-death 25.0%; earned median 37c
  CEILING(greedy)  survival median 27d (p90 30, max 36); first-rent survival 100.0%; near-death 100.0%; earned median 2968c
  CEILING(combo)   survival median 27d (p90 30, max 33); first-rent survival 100.0%; near-death 100.0%; earned median 2919c

Config: allDepthWarmOpeningDay2Starter
  FLOOR            survival median 3d (p90 12, max 27); first-rent survival 23.7%; near-death 23.7%; earned median 36c
  CEILING(greedy)  survival median 27d (p90 30, max 36); first-rent survival 98.8%; near-death 98.8%; earned median 3092c
  CEILING(combo)   survival median 27d (p90 30, max 33); first-rent survival 100.0%; near-death 100.0%; earned median 2844c

Build swing (allDepth median earned / baseline median earned):
  floor: 1.333x
  ceiling-greedy: 1.334x
  ceiling-combo: 1.428x
```

Exit code: 0.

Starter-layer ceiling swing versus baseline, computed from the same 80-run report:

| Config | Greedy swing | Combo swing |
| --- | ---: | ---: |
| `allDepthDay2Starter` | 1.429x | 1.516x |
| `allDepthWarmOpeningDay2Starter` | 1.488x | 1.477x |

Both starter-layer ceiling swings remain inside `[1.3, 2.0]`.

## 3. Floor before/after table

80 runs, seed `balance`, maxActions 600, policy `floor`.

| Config family | Baseline | Starter alone | Warm alone | Warm + starter | Combined target |
| --- | ---: | ---: | ---: | ---: | --- |
| `loopV2` | 0.100 | 0.263 | 0.100 | 0.275 | FAIL, below 0.30 by 0.025 |
| `allDepth` | 0.163 | 0.250 | 0.138 | 0.237 | FAIL, below 0.30 by 0.063 |

The mechanic improves the floor but tops out short of acceptance. I stopped there and did not touch prices, costs, rent, coins, item tables, or offer counts.

## 4. Same-seed A/B JSON

120 runs, seed prefix `m6c-on`, maxActions 400, `LOOP_V2_ENABLED=1 WARM_OPENING_ENABLED=1`, comparing starter OFF vs ON. Median calculation matches `scripts/fuzz.ts` (`Math.floor(0.5 * n)`).

```json
{
  "seedPrefix": "m6c-on",
  "runs": 120,
  "maxActions": 400,
  "off": {
    "label": "warmOpeningOnly",
    "day2StarterEnabled": false,
    "strategies": {
      "random": {
        "daysSurvived": { "samples": 120, "median": 3, "min": 3, "max": 3 },
        "totalCoinsEarned": { "samples": 120, "median": 0, "min": 0, "max": 28 },
        "day9DayTotal": { "samples": 0, "median": null, "min": null, "max": null },
        "day2Occupancy": { "samples": 120, "median": 0, "min": 0, "max": 2 }
      },
      "greedy": {
        "daysSurvived": { "samples": 120, "median": 24, "min": 3, "max": 30 },
        "totalCoinsEarned": { "samples": 120, "median": 1973, "min": 42, "max": 5292 },
        "day9DayTotal": { "samples": 115, "median": 90, "min": 34, "max": 320 },
        "day2Occupancy": { "samples": 120, "median": 4, "min": 3, "max": 7 }
      },
      "combo": {
        "daysSurvived": { "samples": 120, "median": 24, "min": 3, "max": 27 },
        "totalCoinsEarned": { "samples": 120, "median": 1947, "min": 24, "max": 3494 },
        "day9DayTotal": { "samples": 114, "median": 91, "min": 30, "max": 208 },
        "day2Occupancy": { "samples": 120, "median": 4, "min": 2, "max": 7 }
      }
    }
  },
  "on": {
    "label": "warmOpeningPlusDay2Starter",
    "day2StarterEnabled": true,
    "strategies": {
      "random": {
        "daysSurvived": { "samples": 120, "median": 3, "min": 3, "max": 3 },
        "totalCoinsEarned": { "samples": 120, "median": 1, "min": 0, "max": 29 },
        "day9DayTotal": { "samples": 0, "median": null, "min": null, "max": null },
        "day2Occupancy": { "samples": 120, "median": 0, "min": 0, "max": 2 }
      },
      "greedy": {
        "daysSurvived": { "samples": 120, "median": 24, "min": 18, "max": 33 },
        "totalCoinsEarned": { "samples": 120, "median": 1963, "min": 832, "max": 6787 },
        "day9DayTotal": { "samples": 120, "median": 87, "min": 50, "max": 274 },
        "day2Occupancy": { "samples": 120, "median": 5, "min": 4, "max": 8 }
      },
      "combo": {
        "daysSurvived": { "samples": 120, "median": 24, "min": 3, "max": 27 },
        "totalCoinsEarned": { "samples": 120, "median": 1960, "min": 39, "max": 3431 },
        "day9DayTotal": { "samples": 118, "median": 86, "min": 47, "max": 194 },
        "day2Occupancy": { "samples": 120, "median": 5, "min": 3, "max": 8 }
      }
    }
  },
  "deltas": {
    "random": { "day9MedianBefore": null, "day9MedianAfter": null, "deltaPct": null },
    "greedy": { "day9MedianBefore": 90, "day9MedianAfter": 87, "deltaPct": -3.33 },
    "combo": { "day9MedianBefore": 91, "day9MedianAfter": 86, "deltaPct": -5.49 }
  }
}
```

Ceiling note: greedy day-9 median stays within +/-5%; combo is 0.49 percentage points outside the lower guardrail at -5.49%. I did not tune around it.

## 5. Degenerate probes

- Full-shelf day-2 delivery: covered by `src/sim/day2Starter.test.ts`; synthetic full shelf drafts the free item, UI affordances expose sell-to-make-room, placement completes into day-2 restock.
- Liveness with the flag in a config set: `src/sim/liveness.test.ts` now includes `DAY2_STARTER_ENABLED=1` in `allDepth`; full suite passed.
- Ordinary no-reroll coin math caps day-2 ownership around 8 items: day-1 free starter (1) + max two day-1 shop buys from 8 starting coins at min cost 3 (2) + day-2 free starter (1) + four day-2 shop offers (4) = 8. Rich/reroll edge cases are covered separately.
- Buyout+reroll after day-2 free placement: covered by `keeps day-2 buyout plus reroll duplicate-id safe after the free placement`; restored test pass output:

```text
Test Files  1 passed (1)
Tests  6 passed (6)
```

Goal ladder day 1-3 hit-rate drift, 120 runs, greedy+combo, `LOOP_V2_ENABLED=1 GOAL_LADDER_ENABLED=1 WARM_OPENING_ENABLED=1`, starter OFF vs ON:

```json
{
  "seedPrefix": "m6c-goal",
  "runs": 120,
  "drift": {
    "greedy": {
      "1": { "before": 0.608, "after": 0.608, "delta": 0 },
      "2": { "before": 0.617, "after": 0.858, "delta": 0.241 },
      "3": { "before": 0.558, "after": 0.825, "delta": 0.267 }
    },
    "combo": {
      "1": { "before": 0.542, "after": 0.542, "delta": 0 },
      "2": { "before": 0.575, "after": 0.783, "delta": 0.208 },
      "3": { "before": 0.567, "after": 0.85, "delta": 0.283 }
    }
  }
}
```

## 6. Mutation check

Temporary mutation: changed the day-1 scored rollover guard in `src/sim/engine.ts` to `false && day2StarterEnabled(...)`, then ran:

```sh
PATH="$HOME/.nvm/versions/node/v23.3.0/bin:$PATH" node_modules/.bin/vitest run src/sim/day2Starter.test.ts
```

Output:

```text
src/sim/day2Starter.test.ts (6 tests | 4 failed)
  × routes day 2 through a deterministic free delivery and then the old day-2 shop
  × keeps supplier choice day-1-only during the day-2 delivery
  × keeps day-2 buyout plus reroll duplicate-id safe after the free placement
  × evaluates the goal ladder against the scored day total after the day-2 starter

AssertionError: expected 'restock' to be 'delivery'
EngineError: Action not legal in phase restock.

Test Files  1 failed (1)
Tests  4 failed | 2 passed (6)
```

Restored the branch and re-ran:

```text
Test Files  1 passed (1)
Tests  6 passed (6)
```

## 7. Known issues and spec deviations

- Combined floor miss: `loopV2WarmOpeningDay2Starter` reached 0.275; `allDepthWarmOpeningDay2Starter` reached 0.237. Both are below the requested 0.30. No compensation was applied.
- Day-9 ceiling A/B: combo median day total moved from 91 to 86 (-5.49%), slightly outside the +/-5% note. Greedy moved from 90 to 87 (-3.33%).
- `balance.ts --assert-bands` still exits 0. Build swing remains in band: floor 1.333x, greedy 1.334x, combo 1.428x.
- No `ShelfScene.tsx` stash was needed; `tsc --noEmit` passed with the current WIP present.
- `/draft` copy appears generic enough for day-2 delivery: `DAY ${gameState.day} DELIVERY - DRAFT ONE` and `The other offers leave when you draft.` No UI edits made.
- The working tree had unrelated Lane B/docs changes before this packet. I did not revert or edit them.

## 8. Questions for Fable

- Does Fable want to keep this flag as a measured-but-insufficient lever, or reject it because the combined floor missed 0.30?
- Should the combo day-9 A/B miss (-5.49%) block this even though `balance.ts --assert-bands` passes?
- Should future `allDepth` balance configs include shelf expansion, or continue matching the current balance harness definition?

## 9. Contract changes

None. No new contract fields, actions, trace events, schema versions, item data, prices, rent, coin constants, or offer counts.

STOP - `DAY2_STARTER_ENABLED` remains default OFF. No graduation. Fable reviews.
