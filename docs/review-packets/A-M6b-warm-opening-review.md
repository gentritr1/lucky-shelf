# A-M6b Review Packet - Warm Opening

## 1. Built vs. M6b criteria

- Added `WARM_OPENING_ENABLED` and `WARM_OPENING_ENV_VAR` in `src/sim/economy.ts`; default OFF and effective only when the run's loop-v2 snapshot is true.
- Implemented warm-opening offer replacement inside `generateOffers` only. No `GameState`, `Action`, schema, contract version, starting coins, rent, item table, price, or cost curve change.
- Mechanic runs after normal generation for loop-v2 restock offers on days 1-2, including rerolls. It counts existing offers with unchanged `dailyShopCost <= 4`, then replaces most expensive offers first with cheapest eligible `<=4` candidates from the same weighted pool, chosen by `rngFor(seed, 'warmopen', day, salt)` tie-breaks.
- Replaced offers use the same standard offerId derivation: `restock-day-index-itemId-hash(salt)`.
- Added warm-opening rows to `BALANCE_FLAG_CONFIGS` so `scripts/balance.ts --assert-bands` prints before/after floor rates for each config while keeping existing baseline/allDepth build-swing comparison intact.
- Added fuzz output field `warmOpeningEnabled`.
- Added focused tests for flag-off byte identity, day-1 guarantee, deterministic rerolls, delivery/day-3 untouched output, degenerate cheap-pool exhaustion, and day-1 buyout+reroll duplicate-id safety.

## 2. Acceptance status

This is landed behind the flag, but the floor-survival acceptance is **not met** under the strict no-price/no-cost implementation.

Reason: the current unchanged `dailyShopCost` table has day-1 `<=4` candidates, but day 2 has zero `<=4` candidates. The implementation therefore attempts the day-2 guarantee and degrades gracefully when the pool is exhausted; it does not fabricate discounts or alter prices.

### Floor first-rent survival

| base config | base floor survival | warm config | warm floor survival | warm/base |
| --- | ---: | --- | ---: | ---: |
| baseline | 0.212 | baselineWarmOpening | 0.212 | 1x |
| buildSteering | 0.25 | buildSteeringWarmOpening | 0.313 | 1.252x |
| loopV2 | 0.1 | loopV2WarmOpening | 0.125 | 1.25x |
| allDepth | 0.163 | allDepthWarmOpening | 0.188 | 1.153x |

Required for `loopV2` and `allDepth`: `>= 1.5x` and `>= 0.30` absolute. Actual: `loopV2WarmOpening = 0.125`, `allDepthWarmOpening = 0.188`.

### Ceiling day-9 totals

| strategy | warm OFF day-9 median | warm ON day-9 median | ON/OFF | status |
| --- | ---: | ---: | ---: | --- |
| greedy | 87 | 82 | 0.943 | FAIL |
| combo | 91 | 90 | 0.989 | pass |

Required: within ±5%. Combo passes; greedy misses narrowly at `0.943x`.

## 3. Exact commands run

```sh
PATH="$HOME/.nvm/versions/node/v23.3.0/bin:$PATH" node_modules/.bin/tsc --noEmit
PATH="$HOME/.nvm/versions/node/v23.3.0/bin:$PATH" node --import tsx scripts/validate-fixtures.ts
PATH="$HOME/.nvm/versions/node/v23.3.0/bin:$PATH" node_modules/.bin/vitest run
PATH="$HOME/.nvm/versions/node/v23.3.0/bin:$PATH" LOOP_V2_ENABLED=1 WARM_OPENING_ENABLED=1 node --import tsx scripts/fuzz.ts --runs 120 --strategy all --seed m6b-on
PATH="$HOME/.nvm/versions/node/v23.3.0/bin:$PATH" LOOP_V2_ENABLED=1 node --import tsx scripts/fuzz.ts --runs 120 --strategy all --seed m6b-on
PATH="$HOME/.nvm/versions/node/v23.3.0/bin:$PATH" node --import tsx scripts/balance.ts --assert-bands
```

Additional checks:

```sh
PATH="$HOME/.nvm/versions/node/v23.3.0/bin:$PATH" node --import tsx --input-type=module -e "const items = (await import('./src/items/index.ts')).default; const bots = (await import('./src/sim/bots.ts')).default; const hash = (await import('./src/sim/hash.ts')).default; const replay = (await import('./src/sim/replay.ts')).default; const deps = { table: items.loadItemTable(), combos: items.loadCombos() }; const bot = bots.playRun('determinism-fixture', 'random', deps, 60); const replayed = replay.runReplay({ seed: bot.seed, actions: bot.actions }, deps); console.log(hash.hashState(replayed));"
PATH="$HOME/.nvm/versions/node/v23.3.0/bin:$PATH" node_modules/.bin/vitest run src/sim/determinism.test.ts src/sim/goldens.test.ts --reporter verbose
PATH="$HOME/.nvm/versions/node/v23.3.0/bin:$PATH" LOOP_V2_ENABLED=1 SIGNATURE_ITEMS_ENABLED=1 TAG_SYNERGY_ENABLED=1 BUILD_STEERING_ENABLED=1 GOAL_LADDER_ENABLED=1 WARM_OPENING_ENABLED=1 node --import tsx scripts/fuzz.ts --runs 400 --strategy all --seed m6b-goal-drift
# Mutation check temporarily disabled the warm-opening guarantee, then ran:
PATH="$HOME/.nvm/versions/node/v23.3.0/bin:$PATH" node_modules/.bin/vitest run src/sim/warmOpening.test.ts --testNamePattern "guarantees two cheap day-1"
```

## 4. Exact command outputs

### tsc --noEmit

```text
<no stdout>
```

### validate-fixtures

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

### vitest run

```text
(node:84172) ExperimentalWarning: CommonJS module /Users/gentlegen/Desktop/lucky-shelf/node_modules/.pnpm/vitest@4.1.9_@types+node@26.1.0_vite@8.1.3_@types+node@26.1.0_esbuild@0.28.1_terser@5.48.0_tsx@4.23.0_yaml@2.9.0_/node_modules/vitest/dist/config.cjs is loading ES Module /Users/gentlegen/Desktop/lucky-shelf/node_modules/.pnpm/std-env@4.1.0/node_modules/std-env/dist/index.mjs using require().
Support for loading ES Module in require() is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)

 RUN  v4.1.9 /Users/gentlegen/Desktop/lucky-shelf


 Test Files  23 passed (23)
      Tests  138 passed (138)
   Start at  21:34:08
   Duration  37.33s (transform 6.28s, setup 0ms, import 21.62s, tests 62.65s, environment 3ms)
```

### determinism hash and M0 goldens

Pinned hash print:

```text
8d48e1c5a6ad14c9
```

Verbose determinism/goldens:

```text
(node:85711) ExperimentalWarning: CommonJS module /Users/gentlegen/Desktop/lucky-shelf/node_modules/.pnpm/vitest@4.1.9_@types+node@26.1.0_vite@8.1.3_@types+node@26.1.0_esbuild@0.28.1_terser@5.48.0_tsx@4.23.0_yaml@2.9.0_/node_modules/vitest/dist/config.cjs is loading ES Module /Users/gentlegen/Desktop/lucky-shelf/node_modules/.pnpm/std-env@4.1.0/node_modules/std-env/dist/index.mjs using require().
Support for loading ES Module in require() is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)

 RUN  v4.1.9 /Users/gentlegen/Desktop/lucky-shelf

 ✓ src/sim/goldens.test.ts > golden trace reproduction > reproduces m0-basic-wine-cheese 6ms
 ✓ src/sim/goldens.test.ts > golden trace reproduction > reproduces m0-wine-dine-combo 5ms
 ✓ src/sim/goldens.test.ts > golden trace reproduction > reproduces m0-mirror-copy 3ms
 ✓ src/sim/goldens.test.ts > golden trace reproduction > reproduces m0-shop-cat-row-aura 2ms
 ✓ src/sim/goldens.test.ts > golden trace reproduction > reproduces m0-scores-last-clock 2ms
 ✓ src/sim/goldens.test.ts > golden trace reproduction > reproduces m0-bamboo-transform 2ms
 ✓ src/sim/determinism.test.ts > determinism > fixed seed + fixed action list produces the pinned state hash 73ms
 ✓ src/sim/determinism.test.ts > determinism > 200 random-action replays hash identically when run twice 899ms

 Test Files  2 passed (2)
      Tests  8 passed (8)
   Start at  21:35:01
   Duration  2.54s (transform 780ms, setup 0ms, import 1.58s, tests 996ms, environment 0ms)
```

### fuzz A/B - warm opening ON

```json
{
  "generatedAt": "2026-07-08T19:34:08.835Z",
  "seedPrefix": "m6b-on",
  "loopV2Enabled": true,
  "goalLadderEnabled": false,
  "tagSynergyEnabled": false,
  "buildSteeringEnabled": false,
  "shelfExpansionEnabled": false,
  "warmOpeningEnabled": true,
  "buildSteerBias": 2.5,
  "maxActions": 400,
  "results": [
    {
      "strategy": "random",
      "runs": 120,
      "daysSurvived": {
        "mean": 3,
        "stddev": 0,
        "median": 3,
        "p90": 3,
        "p95": 3,
        "max": 3
      },
      "totalCoinsEarned": {
        "mean": 1.32,
        "stddev": 3.82,
        "median": 0,
        "p90": 3,
        "p95": 6,
        "max": 33
      },
      "bestDayTotal": {
        "mean": 0.96,
        "stddev": 2.5,
        "median": 0,
        "p90": 2,
        "p95": 3,
        "max": 18
      },
      "bestDayTotalBySignaturePickup": {
        "withSignature": {
          "mean": 0,
          "stddev": 0,
          "median": 0,
          "p90": 0,
          "p95": 0,
          "max": 0
        },
        "withoutSignature": {
          "mean": 0.96,
          "stddev": 2.5,
          "median": 0,
          "p90": 2,
          "p95": 3,
          "max": 18
        }
      },
      "deepestRentSurvived": {
        "mean": 0,
        "stddev": 0,
        "median": 0,
        "p90": 0,
        "p95": 0,
        "max": 0
      },
      "itemsBoughtPerRun": {
        "mean": 1.38,
        "stddev": 0.91,
        "median": 2,
        "p90": 2,
        "p95": 3,
        "max": 3
      },
      "expansionsPerRun": {
        "mean": 0,
        "stddev": 0,
        "median": 0,
        "p90": 0,
        "p95": 0,
        "max": 0
      },
      "expansionRunRate": 0,
      "signatureItemsBoughtPerRun": {
        "mean": 0,
        "stddev": 0,
        "median": 0,
        "p90": 0,
        "p95": 0,
        "max": 0
      },
      "signaturePickupRunRate": 0,
      "bestDayTotalBySignatureItem": {},
      "signatureDominance": {
        "maxMedianItemId": null,
        "maxMedian": 0,
        "allSignatureMedian": 0,
        "maxToMedianRatio": 0
      },
      "boardOccupancyByDay": {
        "1": {
          "mean": 0.42,
          "stddev": 0.61,
          "median": 0,
          "p90": 1,
          "p95": 2,
          "max": 3
        },
        "2": {
          "mean": 0.17,
          "stddev": 0.47,
          "median": 0,
          "p90": 1,
          "p95": 1,
          "max": 3
        },
        "3": {
          "mean": 0.04,
          "stddev": 0.24,
          "median": 0,
          "p90": 0,
          "p95": 0,
          "max": 2
        }
      },
      "coinsBeforeScoringByDay": {
        "1": {
          "mean": 2.67,
          "stddev": 2.85,
          "median": 1,
          "p90": 8,
          "p95": 9,
          "max": 9
        },
        "2": {
          "mean": 2.35,
          "stddev": 2.33,
          "median": 1,
          "p90": 7,
          "p95": 7,
          "max": 9
        },
        "3": {
          "mean": 1.89,
          "stddev": 2.01,
          "median": 1,
          "p90": 5,
          "p95": 7,
          "max": 11
        }
      },
      "rentAmountByDay": {
        "1": {
          "mean": 25,
          "stddev": 0,
          "median": 25,
          "p90": 25,
          "p95": 25,
          "max": 25
        },
        "2": {
          "mean": 25,
          "stddev": 0,
          "median": 25,
          "p90": 25,
          "p95": 25,
          "max": 25
        },
        "3": {
          "mean": 25,
          "stddev": 0,
          "median": 25,
          "p90": 25,
          "p95": 25,
          "max": 25
        }
      },
      "surplusRatioByDay": {
        "1": {
          "mean": 0.11,
          "stddev": 0.11,
          "median": 0.04,
          "p90": 0.32,
          "p95": 0.36,
          "max": 0.36
        },
        "2": {
          "mean": 0.09,
          "stddev": 0.09,
          "median": 0.04,
          "p90": 0.28,
          "p95": 0.28,
          "max": 0.36
        },
        "3": {
          "mean": 0.08,
          "stddev": 0.08,
          "median": 0.04,
          "p90": 0.2,
          "p95": 0.28,
          "max": 0.44
        }
      },
      "dayTotalByDay": {
        "1": {
          "mean": 0.95,
          "stddev": 2.5,
          "median": 0,
          "p90": 2,
          "p95": 3,
          "max": 18
        },
        "2": {
          "mean": 0.26,
          "stddev": 0.95,
          "median": 0,
          "p90": 1,
          "p95": 2,
          "max": 8
        },
        "3": {
          "mean": 0.11,
          "stddev": 0.79,
          "median": 0,
          "p90": 0,
          "p95": 0,
          "max": 8
        }
      },
      "itemsBoughtByDay": {
        "1": {
          "mean": 1.29,
          "stddev": 0.9,
          "median": 1,
          "p90": 2,
          "p95": 3,
          "max": 3
        },
        "2": {
          "mean": 0.09,
          "stddev": 0.37,
          "median": 0,
          "p90": 0,
          "p95": 1,
          "max": 3
        },
        "3": {
          "mean": 0,
          "stddev": 0,
          "median": 0,
          "p90": 0,
          "p95": 0,
          "max": 0
        }
      },
      "gameOverRate": 1,
      "diedAtRentCycle": {
        "mean": 1,
        "stddev": 0,
        "median": 1,
        "p90": 1,
        "p95": 1,
        "max": 1
      },
      "namedComboRunRate": 0,
      "orderFillRate": 0,
      "spotlightHitRate": 0.014,
      "synergyFireDayRate": 0,
      "synergyFireRate": 0,
      "synergyFiresPerScoredDay": 0,
      "goalTargetHitRate": 0,
      "goalTargetHitRateByDay": {},
      "goalTargetHitRateDays9To12": {
        "hits": 0,
        "survivingDays": 0,
        "rate": 0
      },
      "goalTargetByDay": {},
      "goalDayTotalByDay": {},
      "goalRewardsGranted": 0,
      "freeRerollsSpent": 0,
      "dominantEligibleTagCountDistribution": {
        "0": 307,
        "1": 48,
        "2": 5
      },
      "dominantEligibleTagCountByDay": {
        "1": {
          "mean": 0.32,
          "stddev": 0.5,
          "median": 0,
          "p90": 1,
          "p95": 1,
          "max": 2
        },
        "2": {
          "mean": 0.13,
          "stddev": 0.39,
          "median": 0,
          "p90": 1,
          "p95": 1,
          "max": 2
        },
        "3": {
          "mean": 0.03,
          "stddev": 0.22,
          "median": 0,
          "p90": 0,
          "p95": 0,
          "max": 2
        }
      },
      "finalDominantEligibleTagCount": {
        "mean": 0.03,
        "stddev": 0.22,
        "median": 0,
        "p90": 0,
        "p95": 0,
        "max": 2
      },
      "supplierTagDistribution": {},
      "finalSupplierTagCount": {
        "mean": 0,
        "stddev": 0,
        "median": 0,
        "p90": 0,
        "p95": 0,
        "max": 0
      },
      "supplierTagCountByDay": {}
    },
    {
      "strategy": "greedy",
      "runs": 120,
      "daysSurvived": {
        "mean": 23.5,
        "stddev": 4.05,
        "median": 24,
        "p90": 27,
        "p95": 27,
        "max": 30
      },
      "totalCoinsEarned": {
        "mean": 1893.5,
        "stddev": 655.61,
        "median": 1859,
        "p90": 2683,
        "p95": 3073,
        "max": 4077
      },
      "bestDayTotal": {
        "mean": 117.42,
        "stddev": 40.17,
        "median": 113,
        "p90": 167,
        "p95": 195,
        "max": 267
      },
      "bestDayTotalBySignaturePickup": {
        "withSignature": {
          "mean": 0,
          "stddev": 0,
          "median": 0,
          "p90": 0,
          "p95": 0,
          "max": 0
        },
        "withoutSignature": {
          "mean": 117.42,
          "stddev": 40.17,
          "median": 113,
          "p90": 167,
          "p95": 195,
          "max": 267
        }
      },
      "deepestRentSurvived": {
        "mean": 6.83,
        "stddev": 1.35,
        "median": 7,
        "p90": 8,
        "p95": 8,
        "max": 9
      },
      "itemsBoughtPerRun": {
        "mean": 11.07,
        "stddev": 1.27,
        "median": 11,
        "p90": 12,
        "p95": 12,
        "max": 13
      },
      "expansionsPerRun": {
        "mean": 0,
        "stddev": 0,
        "median": 0,
        "p90": 0,
        "p95": 0,
        "max": 0
      },
      "expansionRunRate": 0,
      "signatureItemsBoughtPerRun": {
        "mean": 0,
        "stddev": 0,
        "median": 0,
        "p90": 0,
        "p95": 0,
        "max": 0
      },
      "signaturePickupRunRate": 0,
      "bestDayTotalBySignatureItem": {},
      "signatureDominance": {
        "maxMedianItemId": null,
        "maxMedian": 0,
        "allSignatureMedian": 0,
        "maxToMedianRatio": 0
      },
      "boardOccupancyByDay": {
        "1": {
          "mean": 2.78,
          "stddev": 0.41,
          "median": 3,
          "p90": 3,
          "p95": 3,
          "max": 3
        },
        "2": {
          "mean": 4.61,
          "stddev": 0.93,
          "median": 5,
          "p90": 6,
          "p95": 6,
          "max": 7
        },
        "3": {
          "mean": 6.55,
          "stddev": 1.56,
          "median": 6,
          "p90": 9,
          "p95": 10,
          "max": 11
        },
        "4": {
          "mean": 7.73,
          "stddev": 2.11,
          "median": 7,
          "p90": 11,
          "p95": 12,
          "max": 12
        },
        "5": {
          "mean": 9.25,
          "stddev": 2.2,
          "median": 9,
          "p90": 12,
          "p95": 12,
          "max": 12
        },
        "6": {
          "mean": 10.43,
          "stddev": 1.83,
          "median": 11,
          "p90": 12,
          "p95": 12,
          "max": 12
        },
        "7": {
          "mean": 10.82,
          "stddev": 1.67,
          "median": 12,
          "p90": 12,
          "p95": 12,
          "max": 12
        },
        "8": {
          "mean": 11.36,
          "stddev": 1.33,
          "median": 12,
          "p90": 12,
          "p95": 12,
          "max": 12
        },
        "9": {
          "mean": 11.69,
          "stddev": 0.92,
          "median": 12,
          "p90": 12,
          "p95": 12,
          "max": 12
        },
        "10": {
          "mean": 11.82,
          "stddev": 0.62,
          "median": 12,
          "p90": 12,
          "p95": 12,
          "max": 12
        },
        "11": {
          "mean": 11.92,
          "stddev": 0.37,
          "median": 12,
          "p90": 12,
          "p95": 12,
          "max": 12
        },
        "12": {
          "mean": 11.98,
          "stddev": 0.13,
          "median": 12,
          "p90": 12,
          "p95": 12,
          "max": 12
        }
      },
      "coinsBeforeScoringByDay": {
        "1": {
          "mean": 0.32,
          "stddev": 0.56,
          "median": 0,
          "p90": 1,
          "p95": 2,
          "max": 2
        },
        "2": {
          "mean": 3.27,
          "stddev": 2.51,
          "median": 3,
          "p90": 7,
          "p95": 7,
          "max": 9
        },
        "3": {
          "mean": 6.82,
          "stddev": 6.53,
          "median": 6,
          "p90": 12,
          "p95": 15,
          "max": 48
        },
        "4": {
          "mean": 9.09,
          "stddev": 13.47,
          "median": 6,
          "p90": 15,
          "p95": 20,
          "max": 109
        },
        "5": {
          "mean": 25.11,
          "stddev": 36.32,
          "median": 15,
          "p90": 64,
          "p95": 118,
          "max": 235
        },
        "6": {
          "mean": 55.47,
          "stddev": 69.25,
          "median": 22,
          "p90": 146,
          "p95": 212,
          "max": 348
        },
        "7": {
          "mean": 84.35,
          "stddev": 94.53,
          "median": 40,
          "p90": 218,
          "p95": 290,
          "max": 441
        },
        "8": {
          "mean": 142.03,
          "stddev": 128.08,
          "median": 121,
          "p90": 314,
          "p95": 412,
          "max": 569
        },
        "9": {
          "mean": 211.96,
          "stddev": 156.6,
          "median": 211,
          "p90": 423,
          "p95": 518,
          "max": 667
        },
        "10": {
          "mean": 247.54,
          "stddev": 169.37,
          "median": 251,
          "p90": 468,
          "p95": 558,
          "max": 722
        },
        "11": {
          "mean": 329.97,
          "stddev": 191.61,
          "median": 346,
          "p90": 564,
          "p95": 671,
          "max": 850
        },
        "12": {
          "mean": 413.78,
          "stddev": 207.77,
          "median": 435,
          "p90": 668,
          "p95": 780,
          "max": 948
        }
      },
      "rentAmountByDay": {
        "1": {
          "mean": 25,
          "stddev": 0,
          "median": 25,
          "p90": 25,
          "p95": 25,
          "max": 25
        },
        "2": {
          "mean": 25,
          "stddev": 0,
          "median": 25,
          "p90": 25,
          "p95": 25,
          "max": 25
        },
        "3": {
          "mean": 25,
          "stddev": 0,
          "median": 25,
          "p90": 25,
          "p95": 25,
          "max": 25
        },
        "4": {
          "mean": 36,
          "stddev": 0,
          "median": 36,
          "p90": 36,
          "p95": 36,
          "max": 36
        },
        "5": {
          "mean": 36,
          "stddev": 0,
          "median": 36,
          "p90": 36,
          "p95": 36,
          "max": 36
        },
        "6": {
          "mean": 36,
          "stddev": 0,
          "median": 36,
          "p90": 36,
          "p95": 36,
          "max": 36
        },
        "7": {
          "mean": 51,
          "stddev": 0,
          "median": 51,
          "p90": 51,
          "p95": 51,
          "max": 51
        },
        "8": {
          "mean": 51,
          "stddev": 0,
          "median": 51,
          "p90": 51,
          "p95": 51,
          "max": 51
        },
        "9": {
          "mean": 51,
          "stddev": 0,
          "median": 51,
          "p90": 51,
          "p95": 51,
          "max": 51
        },
        "10": {
          "mean": 89,
          "stddev": 0,
          "median": 89,
          "p90": 89,
          "p95": 89,
          "max": 89
        },
        "11": {
          "mean": 89,
          "stddev": 0,
          "median": 89,
          "p90": 89,
          "p95": 89,
          "max": 89
        },
        "12": {
          "mean": 89,
          "stddev": 0,
          "median": 89,
          "p90": 89,
          "p95": 89,
          "max": 89
        }
      },
      "surplusRatioByDay": {
        "1": {
          "mean": 0.01,
          "stddev": 0.02,
          "median": 0,
          "p90": 0.04,
          "p95": 0.08,
          "max": 0.08
        },
        "2": {
          "mean": 0.13,
          "stddev": 0.1,
          "median": 0.12,
          "p90": 0.28,
          "p95": 0.28,
          "max": 0.36
        },
        "3": {
          "mean": 0.27,
          "stddev": 0.26,
          "median": 0.24,
          "p90": 0.48,
          "p95": 0.6,
          "max": 1.92
        },
        "4": {
          "mean": 0.25,
          "stddev": 0.37,
          "median": 0.167,
          "p90": 0.417,
          "p95": 0.556,
          "max": 3.028
        },
        "5": {
          "mean": 0.7,
          "stddev": 1.01,
          "median": 0.417,
          "p90": 1.778,
          "p95": 3.278,
          "max": 6.528
        },
        "6": {
          "mean": 1.54,
          "stddev": 1.92,
          "median": 0.611,
          "p90": 4.056,
          "p95": 5.889,
          "max": 9.667
        },
        "7": {
          "mean": 1.65,
          "stddev": 1.85,
          "median": 0.784,
          "p90": 4.275,
          "p95": 5.686,
          "max": 8.647
        },
        "8": {
          "mean": 2.78,
          "stddev": 2.51,
          "median": 2.373,
          "p90": 6.157,
          "p95": 8.078,
          "max": 11.157
        },
        "9": {
          "mean": 4.16,
          "stddev": 3.07,
          "median": 4.137,
          "p90": 8.294,
          "p95": 10.157,
          "max": 13.078
        },
        "10": {
          "mean": 2.78,
          "stddev": 1.9,
          "median": 2.82,
          "p90": 5.258,
          "p95": 6.27,
          "max": 8.112
        },
        "11": {
          "mean": 3.71,
          "stddev": 2.15,
          "median": 3.888,
          "p90": 6.337,
          "p95": 7.539,
          "max": 9.551
        },
        "12": {
          "mean": 4.65,
          "stddev": 2.33,
          "median": 4.888,
          "p90": 7.506,
          "p95": 8.764,
          "max": 10.652
        }
      },
      "dayTotalByDay": {
        "1": {
          "mean": 22.68,
          "stddev": 7.57,
          "median": 22,
          "p90": 32,
          "p95": 37,
          "max": 50
        },
        "2": {
          "mean": 37.15,
          "stddev": 16.49,
          "median": 34,
          "p90": 58,
          "p95": 67,
          "max": 112
        },
        "3": {
          "mean": 50.57,
          "stddev": 20.76,
          "median": 46,
          "p90": 77,
          "p95": 85,
          "max": 149
        },
        "4": {
          "mean": 57.24,
          "stddev": 26.52,
          "median": 50,
          "p90": 94,
          "p95": 113,
          "max": 162
        },
        "5": {
          "mean": 68.93,
          "stddev": 24.8,
          "median": 69,
          "p90": 101,
          "p95": 110,
          "max": 177
        },
        "6": {
          "mean": 78.92,
          "stddev": 24.55,
          "median": 78,
          "p90": 109,
          "p95": 123,
          "max": 172
        },
        "7": {
          "mean": 81.09,
          "stddev": 27.8,
          "median": 77,
          "p90": 111,
          "p95": 125,
          "max": 209
        },
        "8": {
          "mean": 85.82,
          "stddev": 24.93,
          "median": 83,
          "p90": 112,
          "p95": 128,
          "max": 176
        },
        "9": {
          "mean": 84.29,
          "stddev": 24.45,
          "median": 82,
          "p90": 112,
          "p95": 125,
          "max": 227
        },
        "10": {
          "mean": 88.89,
          "stddev": 24.9,
          "median": 87,
          "p90": 117,
          "p95": 123,
          "max": 248
        },
        "11": {
          "mean": 87.8,
          "stddev": 20.55,
          "median": 85,
          "p90": 114,
          "p95": 127,
          "max": 148
        },
        "12": {
          "mean": 91.38,
          "stddev": 27.62,
          "median": 88,
          "p90": 116,
          "p95": 136,
          "max": 261
        }
      },
      "itemsBoughtByDay": {
        "1": {
          "mean": 1.78,
          "stddev": 0.41,
          "median": 2,
          "p90": 2,
          "p95": 2,
          "max": 2
        },
        "2": {
          "mean": 1.82,
          "stddev": 0.75,
          "median": 2,
          "p90": 3,
          "p95": 3,
          "max": 4
        },
        "3": {
          "mean": 2.11,
          "stddev": 0.96,
          "median": 2,
          "p90": 4,
          "p95": 4,
          "max": 4
        },
        "4": {
          "mean": 1.17,
          "stddev": 0.89,
          "median": 1,
          "p90": 2,
          "p95": 3,
          "max": 4
        },
        "5": {
          "mean": 1.57,
          "stddev": 0.79,
          "median": 2,
          "p90": 3,
          "p95": 3,
          "max": 3
        },
        "6": {
          "mean": 1.21,
          "stddev": 0.91,
          "median": 1,
          "p90": 2,
          "p95": 3,
          "max": 3
        },
        "7": {
          "mean": 0.39,
          "stddev": 0.5,
          "median": 0,
          "p90": 1,
          "p95": 1,
          "max": 2
        },
        "8": {
          "mean": 0.55,
          "stddev": 0.72,
          "median": 0,
          "p90": 2,
          "p95": 2,
          "max": 2
        },
        "9": {
          "mean": 0.34,
          "stddev": 0.64,
          "median": 0,
          "p90": 1,
          "p95": 2,
          "max": 3
        },
        "10": {
          "mean": 0.04,
          "stddev": 0.2,
          "median": 0,
          "p90": 0,
          "p95": 0,
          "max": 1
        },
        "11": {
          "mean": 0.1,
          "stddev": 0.33,
          "median": 0,
          "p90": 0,
          "p95": 1,
          "max": 2
        },
        "12": {
          "mean": 0.06,
          "stddev": 0.27,
          "median": 0,
          "p90": 0,
          "p95": 1,
          "max": 2
        }
      },
      "gameOverRate": 1,
      "diedAtRentCycle": {
        "mean": 7.83,
        "stddev": 1.35,
        "median": 8,
        "p90": 9,
        "p95": 9,
        "max": 10
      },
      "namedComboRunRate": 0.742,
      "orderFillRate": 0.447,
      "spotlightHitRate": 0.996,
      "synergyFireDayRate": 0,
      "synergyFireRate": 0,
      "synergyFiresPerScoredDay": 0,
      "goalTargetHitRate": 0,
      "goalTargetHitRateByDay": {},
      "goalTargetHitRateDays9To12": {
        "hits": 0,
        "survivingDays": 0,
        "rate": 0
      },
      "goalTargetByDay": {},
      "goalDayTotalByDay": {},
      "goalRewardsGranted": 0,
      "freeRerollsSpent": 0,
      "dominantEligibleTagCountDistribution": {
        "1": 124,
        "2": 257,
        "3": 573,
        "4": 984,
        "5": 677,
        "6": 162,
        "7": 1,
        "8": 42
      },
      "dominantEligibleTagCountByDay": {
        "1": {
          "mean": 1.29,
          "stddev": 0.45,
          "median": 1,
          "p90": 2,
          "p95": 2,
          "max": 2
        },
        "2": {
          "mean": 1.98,
          "stddev": 0.68,
          "median": 2,
          "p90": 3,
          "p95": 3,
          "max": 4
        },
        "3": {
          "mean": 2.73,
          "stddev": 0.88,
          "median": 3,
          "p90": 4,
          "p95": 4,
          "max": 6
        },
        "4": {
          "mean": 3.06,
          "stddev": 1,
          "median": 3,
          "p90": 4,
          "p95": 5,
          "max": 7
        },
        "5": {
          "mean": 3.49,
          "stddev": 1.15,
          "median": 3,
          "p90": 5,
          "p95": 5,
          "max": 8
        },
        "6": {
          "mean": 3.85,
          "stddev": 1.18,
          "median": 4,
          "p90": 5,
          "p95": 5,
          "max": 8
        },
        "7": {
          "mean": 3.98,
          "stddev": 1.16,
          "median": 4,
          "p90": 5,
          "p95": 6,
          "max": 8
        },
        "8": {
          "mean": 4.1,
          "stddev": 1.12,
          "median": 4,
          "p90": 5,
          "p95": 6,
          "max": 8
        },
        "9": {
          "mean": 4.22,
          "stddev": 1.07,
          "median": 4,
          "p90": 5,
          "p95": 6,
          "max": 8
        },
        "10": {
          "mean": 4.26,
          "stddev": 1.05,
          "median": 4,
          "p90": 5,
          "p95": 6,
          "max": 8
        },
        "11": {
          "mean": 4.3,
          "stddev": 1.01,
          "median": 4,
          "p90": 5,
          "p95": 6,
          "max": 8
        },
        "12": {
          "mean": 4.32,
          "stddev": 1,
          "median": 4,
          "p90": 5,
          "p95": 6,
          "max": 8
        }
      },
      "finalDominantEligibleTagCount": {
        "mean": 4.26,
        "stddev": 1.06,
        "median": 4,
        "p90": 5,
        "p95": 6,
        "max": 8
      },
      "supplierTagDistribution": {},
      "finalSupplierTagCount": {
        "mean": 0,
        "stddev": 0,
        "median": 0,
        "p90": 0,
        "p95": 0,
        "max": 0
      },
      "supplierTagCountByDay": {}
    },
    {
      "strategy": "combo",
      "runs": 120,
      "daysSurvived": {
        "mean": 23.32,
        "stddev": 5.62,
        "median": 24,
        "p90": 27,
        "p95": 27,
        "max": 30
      },
      "totalCoinsEarned": {
        "mean": 1992.8,
        "stddev": 802.43,
        "median": 1959,
        "p90": 2896,
        "p95": 3152,
        "max": 4055
      },
      "bestDayTotal": {
        "mean": 122.29,
        "stddev": 47.78,
        "median": 119,
        "p90": 186,
        "p95": 214,
        "max": 261
      },
      "bestDayTotalBySignaturePickup": {
        "withSignature": {
          "mean": 0,
          "stddev": 0,
          "median": 0,
          "p90": 0,
          "p95": 0,
          "max": 0
        },
        "withoutSignature": {
          "mean": 122.29,
          "stddev": 47.78,
          "median": 119,
          "p90": 186,
          "p95": 214,
          "max": 261
        }
      },
      "deepestRentSurvived": {
        "mean": 6.78,
        "stddev": 1.87,
        "median": 7,
        "p90": 8,
        "p95": 8,
        "max": 9
      },
      "itemsBoughtPerRun": {
        "mean": 10.73,
        "stddev": 1.93,
        "median": 11,
        "p90": 12,
        "p95": 12,
        "max": 13
      },
      "expansionsPerRun": {
        "mean": 0,
        "stddev": 0,
        "median": 0,
        "p90": 0,
        "p95": 0,
        "max": 0
      },
      "expansionRunRate": 0,
      "signatureItemsBoughtPerRun": {
        "mean": 0,
        "stddev": 0,
        "median": 0,
        "p90": 0,
        "p95": 0,
        "max": 0
      },
      "signaturePickupRunRate": 0,
      "bestDayTotalBySignatureItem": {},
      "signatureDominance": {
        "maxMedianItemId": null,
        "maxMedian": 0,
        "allSignatureMedian": 0,
        "maxToMedianRatio": 0
      },
      "boardOccupancyByDay": {
        "1": {
          "mean": 2.77,
          "stddev": 0.42,
          "median": 3,
          "p90": 3,
          "p95": 3,
          "max": 3
        },
        "2": {
          "mean": 4.73,
          "stddev": 1.07,
          "median": 5,
          "p90": 6,
          "p95": 6,
          "max": 7
        },
        "3": {
          "mean": 6.77,
          "stddev": 2.02,
          "median": 7,
          "p90": 10,
          "p95": 10,
          "max": 11
        },
        "4": {
          "mean": 7.97,
          "stddev": 2.56,
          "median": 8,
          "p90": 12,
          "p95": 12,
          "max": 12
        },
        "5": {
          "mean": 9.46,
          "stddev": 2.37,
          "median": 10,
          "p90": 12,
          "p95": 12,
          "max": 12
        },
        "6": {
          "mean": 10.52,
          "stddev": 2.08,
          "median": 12,
          "p90": 12,
          "p95": 12,
          "max": 12
        },
        "7": {
          "mean": 10.93,
          "stddev": 1.79,
          "median": 12,
          "p90": 12,
          "p95": 12,
          "max": 12
        },
        "8": {
          "mean": 11.4,
          "stddev": 1.48,
          "median": 12,
          "p90": 12,
          "p95": 12,
          "max": 12
        },
        "9": {
          "mean": 11.65,
          "stddev": 1.13,
          "median": 12,
          "p90": 12,
          "p95": 12,
          "max": 12
        },
        "10": {
          "mean": 11.8,
          "stddev": 0.81,
          "median": 12,
          "p90": 12,
          "p95": 12,
          "max": 12
        },
        "11": {
          "mean": 11.89,
          "stddev": 0.71,
          "median": 12,
          "p90": 12,
          "p95": 12,
          "max": 12
        },
        "12": {
          "mean": 11.94,
          "stddev": 0.57,
          "median": 12,
          "p90": 12,
          "p95": 12,
          "max": 12
        }
      },
      "coinsBeforeScoringByDay": {
        "1": {
          "mean": 0.38,
          "stddev": 0.62,
          "median": 0,
          "p90": 1,
          "p95": 2,
          "max": 2
        },
        "2": {
          "mean": 3.17,
          "stddev": 3.01,
          "median": 3,
          "p90": 7,
          "p95": 8,
          "max": 18
        },
        "3": {
          "mean": 7.33,
          "stddev": 5.46,
          "median": 7,
          "p90": 13,
          "p95": 17,
          "max": 30
        },
        "4": {
          "mean": 12.88,
          "stddev": 16.73,
          "median": 9,
          "p90": 29,
          "p95": 50,
          "max": 105
        },
        "5": {
          "mean": 35.07,
          "stddev": 48.54,
          "median": 15,
          "p90": 115,
          "p95": 142,
          "max": 236
        },
        "6": {
          "mean": 73.9,
          "stddev": 84.33,
          "median": 26,
          "p90": 215,
          "p95": 245,
          "max": 338
        },
        "7": {
          "mean": 110.79,
          "stddev": 108.13,
          "median": 75,
          "p90": 279,
          "p95": 308,
          "max": 412
        },
        "8": {
          "mean": 175.83,
          "stddev": 142.08,
          "median": 162,
          "p90": 372,
          "p95": 411,
          "max": 551
        },
        "9": {
          "mean": 253.75,
          "stddev": 170.55,
          "median": 247,
          "p90": 498,
          "p95": 548,
          "max": 690
        },
        "10": {
          "mean": 294.01,
          "stddev": 186.67,
          "median": 283,
          "p90": 543,
          "p95": 624,
          "max": 766
        },
        "11": {
          "mean": 382.86,
          "stddev": 205.2,
          "median": 375,
          "p90": 626,
          "p95": 750,
          "max": 891
        },
        "12": {
          "mean": 477.91,
          "stddev": 223.4,
          "median": 484,
          "p90": 768,
          "p95": 897,
          "max": 1016
        }
      },
      "rentAmountByDay": {
        "1": {
          "mean": 25,
          "stddev": 0,
          "median": 25,
          "p90": 25,
          "p95": 25,
          "max": 25
        },
        "2": {
          "mean": 25,
          "stddev": 0,
          "median": 25,
          "p90": 25,
          "p95": 25,
          "max": 25
        },
        "3": {
          "mean": 25,
          "stddev": 0,
          "median": 25,
          "p90": 25,
          "p95": 25,
          "max": 25
        },
        "4": {
          "mean": 36,
          "stddev": 0,
          "median": 36,
          "p90": 36,
          "p95": 36,
          "max": 36
        },
        "5": {
          "mean": 36,
          "stddev": 0,
          "median": 36,
          "p90": 36,
          "p95": 36,
          "max": 36
        },
        "6": {
          "mean": 36,
          "stddev": 0,
          "median": 36,
          "p90": 36,
          "p95": 36,
          "max": 36
        },
        "7": {
          "mean": 51,
          "stddev": 0,
          "median": 51,
          "p90": 51,
          "p95": 51,
          "max": 51
        },
        "8": {
          "mean": 51,
          "stddev": 0,
          "median": 51,
          "p90": 51,
          "p95": 51,
          "max": 51
        },
        "9": {
          "mean": 51,
          "stddev": 0,
          "median": 51,
          "p90": 51,
          "p95": 51,
          "max": 51
        },
        "10": {
          "mean": 89,
          "stddev": 0,
          "median": 89,
          "p90": 89,
          "p95": 89,
          "max": 89
        },
        "11": {
          "mean": 89,
          "stddev": 0,
          "median": 89,
          "p90": 89,
          "p95": 89,
          "max": 89
        },
        "12": {
          "mean": 89,
          "stddev": 0,
          "median": 89,
          "p90": 89,
          "p95": 89,
          "max": 89
        }
      },
      "surplusRatioByDay": {
        "1": {
          "mean": 0.02,
          "stddev": 0.02,
          "median": 0,
          "p90": 0.04,
          "p95": 0.08,
          "max": 0.08
        },
        "2": {
          "mean": 0.13,
          "stddev": 0.12,
          "median": 0.12,
          "p90": 0.28,
          "p95": 0.32,
          "max": 0.72
        },
        "3": {
          "mean": 0.29,
          "stddev": 0.22,
          "median": 0.28,
          "p90": 0.52,
          "p95": 0.68,
          "max": 1.2
        },
        "4": {
          "mean": 0.36,
          "stddev": 0.46,
          "median": 0.25,
          "p90": 0.806,
          "p95": 1.389,
          "max": 2.917
        },
        "5": {
          "mean": 0.97,
          "stddev": 1.35,
          "median": 0.417,
          "p90": 3.194,
          "p95": 3.944,
          "max": 6.556
        },
        "6": {
          "mean": 2.05,
          "stddev": 2.34,
          "median": 0.722,
          "p90": 5.972,
          "p95": 6.806,
          "max": 9.389
        },
        "7": {
          "mean": 2.17,
          "stddev": 2.12,
          "median": 1.471,
          "p90": 5.471,
          "p95": 6.039,
          "max": 8.078
        },
        "8": {
          "mean": 3.45,
          "stddev": 2.79,
          "median": 3.176,
          "p90": 7.294,
          "p95": 8.059,
          "max": 10.804
        },
        "9": {
          "mean": 4.98,
          "stddev": 3.34,
          "median": 4.843,
          "p90": 9.765,
          "p95": 10.745,
          "max": 13.529
        },
        "10": {
          "mean": 3.3,
          "stddev": 2.1,
          "median": 3.18,
          "p90": 6.101,
          "p95": 7.011,
          "max": 8.607
        },
        "11": {
          "mean": 4.3,
          "stddev": 2.31,
          "median": 4.213,
          "p90": 7.034,
          "p95": 8.427,
          "max": 10.011
        },
        "12": {
          "mean": 5.37,
          "stddev": 2.51,
          "median": 5.438,
          "p90": 8.629,
          "p95": 10.079,
          "max": 11.416
        }
      },
      "dayTotalByDay": {
        "1": {
          "mean": 23.6,
          "stddev": 9.94,
          "median": 22,
          "p90": 37,
          "p95": 40,
          "max": 60
        },
        "2": {
          "mean": 37.95,
          "stddev": 17.23,
          "median": 36,
          "p90": 65,
          "p95": 70,
          "max": 84
        },
        "3": {
          "mean": 52.75,
          "stddev": 24.8,
          "median": 48,
          "p90": 90,
          "p95": 105,
          "max": 122
        },
        "4": {
          "mean": 63.18,
          "stddev": 29.83,
          "median": 58,
          "p90": 98,
          "p95": 109,
          "max": 178
        },
        "5": {
          "mean": 72.95,
          "stddev": 28.9,
          "median": 69,
          "p90": 109,
          "p95": 129,
          "max": 185
        },
        "6": {
          "mean": 83.4,
          "stddev": 30.63,
          "median": 81,
          "p90": 119,
          "p95": 142,
          "max": 210
        },
        "7": {
          "mean": 84.82,
          "stddev": 27.86,
          "median": 84,
          "p90": 121,
          "p95": 139,
          "max": 198
        },
        "8": {
          "mean": 90.52,
          "stddev": 28.46,
          "median": 85,
          "p90": 132,
          "p95": 143,
          "max": 190
        },
        "9": {
          "mean": 93.28,
          "stddev": 30.52,
          "median": 90,
          "p90": 121,
          "p95": 132,
          "max": 248
        },
        "10": {
          "mean": 93.97,
          "stddev": 24.83,
          "median": 92,
          "p90": 128,
          "p95": 139,
          "max": 179
        },
        "11": {
          "mean": 97.87,
          "stddev": 32.04,
          "median": 91,
          "p90": 135,
          "p95": 162,
          "max": 231
        },
        "12": {
          "mean": 92.53,
          "stddev": 22.48,
          "median": 93,
          "p90": 123,
          "p95": 129,
          "max": 166
        }
      },
      "itemsBoughtByDay": {
        "1": {
          "mean": 1.77,
          "stddev": 0.42,
          "median": 2,
          "p90": 2,
          "p95": 2,
          "max": 2
        },
        "2": {
          "mean": 1.97,
          "stddev": 0.86,
          "median": 2,
          "p90": 3,
          "p95": 3,
          "max": 4
        },
        "3": {
          "mean": 2.14,
          "stddev": 1.12,
          "median": 2,
          "p90": 4,
          "p95": 4,
          "max": 4
        },
        "4": {
          "mean": 1.17,
          "stddev": 0.92,
          "median": 1,
          "p90": 2,
          "p95": 3,
          "max": 4
        },
        "5": {
          "mean": 1.56,
          "stddev": 1.01,
          "median": 2,
          "p90": 3,
          "p95": 3,
          "max": 4
        },
        "6": {
          "mean": 1.07,
          "stddev": 0.94,
          "median": 1,
          "p90": 2,
          "p95": 2,
          "max": 4
        },
        "7": {
          "mean": 0.34,
          "stddev": 0.54,
          "median": 0,
          "p90": 1,
          "p95": 1,
          "max": 2
        },
        "8": {
          "mean": 0.47,
          "stddev": 0.69,
          "median": 0,
          "p90": 2,
          "p95": 2,
          "max": 2
        },
        "9": {
          "mean": 0.26,
          "stddev": 0.54,
          "median": 0,
          "p90": 1,
          "p95": 2,
          "max": 2
        },
        "10": {
          "mean": 0.09,
          "stddev": 0.34,
          "median": 0,
          "p90": 0,
          "p95": 1,
          "max": 2
        },
        "11": {
          "mean": 0.09,
          "stddev": 0.34,
          "median": 0,
          "p90": 0,
          "p95": 1,
          "max": 2
        },
        "12": {
          "mean": 0.04,
          "stddev": 0.25,
          "median": 0,
          "p90": 0,
          "p95": 0,
          "max": 2
        }
      },
      "gameOverRate": 1,
      "diedAtRentCycle": {
        "mean": 7.78,
        "stddev": 1.87,
        "median": 8,
        "p90": 9,
        "p95": 9,
        "max": 10
      },
      "namedComboRunRate": 0.725,
      "orderFillRate": 0.48,
      "spotlightHitRate": 0.994,
      "synergyFireDayRate": 0,
      "synergyFireRate": 0,
      "synergyFiresPerScoredDay": 0,
      "goalTargetHitRate": 0,
      "goalTargetHitRateByDay": {},
      "goalTargetHitRateDays9To12": {
        "hits": 0,
        "survivingDays": 0,
        "rate": 0
      },
      "goalTargetByDay": {},
      "goalDayTotalByDay": {},
      "goalRewardsGranted": 0,
      "freeRerollsSpent": 0,
      "dominantEligibleTagCountDistribution": {
        "1": 113,
        "2": 269,
        "3": 579,
        "4": 933,
        "5": 485,
        "6": 254,
        "7": 166
      },
      "dominantEligibleTagCountByDay": {
        "1": {
          "mean": 1.41,
          "stddev": 0.51,
          "median": 1,
          "p90": 2,
          "p95": 2,
          "max": 3
        },
        "2": {
          "mean": 2.08,
          "stddev": 0.73,
          "median": 2,
          "p90": 3,
          "p95": 4,
          "max": 4
        },
        "3": {
          "mean": 2.77,
          "stddev": 1.08,
          "median": 3,
          "p90": 4,
          "p95": 5,
          "max": 6
        },
        "4": {
          "mean": 3.2,
          "stddev": 1.29,
          "median": 3,
          "p90": 5,
          "p95": 6,
          "max": 7
        },
        "5": {
          "mean": 3.67,
          "stddev": 1.34,
          "median": 3,
          "p90": 6,
          "p95": 6,
          "max": 7
        },
        "6": {
          "mean": 3.97,
          "stddev": 1.33,
          "median": 4,
          "p90": 6,
          "p95": 6,
          "max": 7
        },
        "7": {
          "mean": 4.08,
          "stddev": 1.31,
          "median": 4,
          "p90": 6,
          "p95": 7,
          "max": 7
        },
        "8": {
          "mean": 4.22,
          "stddev": 1.3,
          "median": 4,
          "p90": 6,
          "p95": 7,
          "max": 7
        },
        "9": {
          "mean": 4.33,
          "stddev": 1.22,
          "median": 4,
          "p90": 6,
          "p95": 7,
          "max": 7
        },
        "10": {
          "mean": 4.37,
          "stddev": 1.2,
          "median": 4,
          "p90": 6,
          "p95": 7,
          "max": 7
        },
        "11": {
          "mean": 4.38,
          "stddev": 1.18,
          "median": 4,
          "p90": 6,
          "p95": 7,
          "max": 7
        },
        "12": {
          "mean": 4.39,
          "stddev": 1.18,
          "median": 4,
          "p90": 6,
          "p95": 7,
          "max": 7
        }
      },
      "finalDominantEligibleTagCount": {
        "mean": 4.25,
        "stddev": 1.28,
        "median": 4,
        "p90": 6,
        "p95": 7,
        "max": 7
      },
      "supplierTagDistribution": {},
      "finalSupplierTagCount": {
        "mean": 0,
        "stddev": 0,
        "median": 0,
        "p90": 0,
        "p95": 0,
        "max": 0
      },
      "supplierTagCountByDay": {}
    }
  ],
  "elapsedMs": 33064
}
```

### fuzz A/B - warm opening OFF same seed

```json
{
  "generatedAt": "2026-07-08T19:34:08.801Z",
  "seedPrefix": "m6b-on",
  "loopV2Enabled": true,
  "goalLadderEnabled": false,
  "tagSynergyEnabled": false,
  "buildSteeringEnabled": false,
  "shelfExpansionEnabled": false,
  "warmOpeningEnabled": false,
  "buildSteerBias": 2.5,
  "maxActions": 400,
  "results": [
    {
      "strategy": "random",
      "runs": 120,
      "daysSurvived": {
        "mean": 3,
        "stddev": 0,
        "median": 3,
        "p90": 3,
        "p95": 3,
        "max": 3
      },
      "totalCoinsEarned": {
        "mean": 1.17,
        "stddev": 3.05,
        "median": 0,
        "p90": 3,
        "p95": 6,
        "max": 18
      },
      "bestDayTotal": {
        "mean": 0.84,
        "stddev": 2.14,
        "median": 0,
        "p90": 2,
        "p95": 6,
        "max": 18
      },
      "bestDayTotalBySignaturePickup": {
        "withSignature": {
          "mean": 0,
          "stddev": 0,
          "median": 0,
          "p90": 0,
          "p95": 0,
          "max": 0
        },
        "withoutSignature": {
          "mean": 0.84,
          "stddev": 2.14,
          "median": 0,
          "p90": 2,
          "p95": 6,
          "max": 18
        }
      },
      "deepestRentSurvived": {
        "mean": 0,
        "stddev": 0,
        "median": 0,
        "p90": 0,
        "p95": 0,
        "max": 0
      },
      "itemsBoughtPerRun": {
        "mean": 1.1,
        "stddev": 0.78,
        "median": 1,
        "p90": 2,
        "p95": 2,
        "max": 3
      },
      "expansionsPerRun": {
        "mean": 0,
        "stddev": 0,
        "median": 0,
        "p90": 0,
        "p95": 0,
        "max": 0
      },
      "expansionRunRate": 0,
      "signatureItemsBoughtPerRun": {
        "mean": 0,
        "stddev": 0,
        "median": 0,
        "p90": 0,
        "p95": 0,
        "max": 0
      },
      "signaturePickupRunRate": 0,
      "bestDayTotalBySignatureItem": {},
      "signatureDominance": {
        "maxMedianItemId": null,
        "maxMedian": 0,
        "allSignatureMedian": 0,
        "maxToMedianRatio": 0
      },
      "boardOccupancyByDay": {
        "1": {
          "mean": 0.33,
          "stddev": 0.52,
          "median": 0,
          "p90": 1,
          "p95": 1,
          "max": 2
        },
        "2": {
          "mean": 0.12,
          "stddev": 0.37,
          "median": 0,
          "p90": 1,
          "p95": 1,
          "max": 2
        },
        "3": {
          "mean": 0.03,
          "stddev": 0.18,
          "median": 0,
          "p90": 0,
          "p95": 0,
          "max": 1
        }
      },
      "coinsBeforeScoringByDay": {
        "1": {
          "mean": 2.88,
          "stddev": 2.83,
          "median": 2,
          "p90": 9,
          "p95": 9,
          "max": 9
        },
        "2": {
          "mean": 2.3,
          "stddev": 2.3,
          "median": 1,
          "p90": 6,
          "p95": 7,
          "max": 9
        },
        "3": {
          "mean": 1.81,
          "stddev": 1.95,
          "median": 1,
          "p90": 5,
          "p95": 7,
          "max": 9
        }
      },
      "rentAmountByDay": {
        "1": {
          "mean": 25,
          "stddev": 0,
          "median": 25,
          "p90": 25,
          "p95": 25,
          "max": 25
        },
        "2": {
          "mean": 25,
          "stddev": 0,
          "median": 25,
          "p90": 25,
          "p95": 25,
          "max": 25
        },
        "3": {
          "mean": 25,
          "stddev": 0,
          "median": 25,
          "p90": 25,
          "p95": 25,
          "max": 25
        }
      },
      "surplusRatioByDay": {
        "1": {
          "mean": 0.12,
          "stddev": 0.11,
          "median": 0.08,
          "p90": 0.36,
          "p95": 0.36,
          "max": 0.36
        },
        "2": {
          "mean": 0.09,
          "stddev": 0.09,
          "median": 0.04,
          "p90": 0.24,
          "p95": 0.28,
          "max": 0.36
        },
        "3": {
          "mean": 0.07,
          "stddev": 0.08,
          "median": 0.04,
          "p90": 0.2,
          "p95": 0.28,
          "max": 0.36
        }
      },
      "dayTotalByDay": {
        "1": {
          "mean": 0.83,
          "stddev": 2.13,
          "median": 0,
          "p90": 2,
          "p95": 6,
          "max": 18
        },
        "2": {
          "mean": 0.24,
          "stddev": 0.95,
          "median": 0,
          "p90": 0,
          "p95": 2,
          "max": 6
        },
        "3": {
          "mean": 0.09,
          "stddev": 0.63,
          "median": 0,
          "p90": 0,
          "p95": 0,
          "max": 6
        }
      },
      "itemsBoughtByDay": {
        "1": {
          "mean": 1.01,
          "stddev": 0.76,
          "median": 1,
          "p90": 2,
          "p95": 2,
          "max": 3
        },
        "2": {
          "mean": 0.09,
          "stddev": 0.37,
          "median": 0,
          "p90": 0,
          "p95": 1,
          "max": 3
        },
        "3": {
          "mean": 0,
          "stddev": 0,
          "median": 0,
          "p90": 0,
          "p95": 0,
          "max": 0
        }
      },
      "gameOverRate": 1,
      "diedAtRentCycle": {
        "mean": 1,
        "stddev": 0,
        "median": 1,
        "p90": 1,
        "p95": 1,
        "max": 1
      },
      "namedComboRunRate": 0,
      "orderFillRate": 0,
      "spotlightHitRate": 0.014,
      "synergyFireDayRate": 0,
      "synergyFireRate": 0,
      "synergyFiresPerScoredDay": 0,
      "goalTargetHitRate": 0,
      "goalTargetHitRateByDay": {},
      "goalTargetHitRateDays9To12": {
        "hits": 0,
        "survivingDays": 0,
        "rate": 0
      },
      "goalTargetByDay": {},
      "goalDayTotalByDay": {},
      "goalRewardsGranted": 0,
      "freeRerollsSpent": 0,
      "dominantEligibleTagCountDistribution": {
        "0": 315,
        "1": 43,
        "2": 2
      },
      "dominantEligibleTagCountByDay": {
        "1": {
          "mean": 0.28,
          "stddev": 0.46,
          "median": 0,
          "p90": 1,
          "p95": 1,
          "max": 2
        },
        "2": {
          "mean": 0.09,
          "stddev": 0.32,
          "median": 0,
          "p90": 0,
          "p95": 1,
          "max": 2
        },
        "3": {
          "mean": 0.03,
          "stddev": 0.16,
          "median": 0,
          "p90": 0,
          "p95": 0,
          "max": 1
        }
      },
      "finalDominantEligibleTagCount": {
        "mean": 0.03,
        "stddev": 0.16,
        "median": 0,
        "p90": 0,
        "p95": 0,
        "max": 1
      },
      "supplierTagDistribution": {},
      "finalSupplierTagCount": {
        "mean": 0,
        "stddev": 0,
        "median": 0,
        "p90": 0,
        "p95": 0,
        "max": 0
      },
      "supplierTagCountByDay": {}
    },
    {
      "strategy": "greedy",
      "runs": 120,
      "daysSurvived": {
        "mean": 23.2,
        "stddev": 4.36,
        "median": 24,
        "p90": 27,
        "p95": 27,
        "max": 27
      },
      "totalCoinsEarned": {
        "mean": 1864.67,
        "stddev": 607.06,
        "median": 1899,
        "p90": 2666,
        "p95": 2839,
        "max": 3337
      },
      "bestDayTotal": {
        "mean": 115.56,
        "stddev": 33.97,
        "median": 115,
        "p90": 157,
        "p95": 171,
        "max": 261
      },
      "bestDayTotalBySignaturePickup": {
        "withSignature": {
          "mean": 0,
          "stddev": 0,
          "median": 0,
          "p90": 0,
          "p95": 0,
          "max": 0
        },
        "withoutSignature": {
          "mean": 115.56,
          "stddev": 33.97,
          "median": 115,
          "p90": 157,
          "p95": 171,
          "max": 261
        }
      },
      "deepestRentSurvived": {
        "mean": 6.73,
        "stddev": 1.45,
        "median": 7,
        "p90": 8,
        "p95": 8,
        "max": 8
      },
      "itemsBoughtPerRun": {
        "mean": 11.03,
        "stddev": 1.44,
        "median": 11,
        "p90": 12,
        "p95": 12,
        "max": 13
      },
      "expansionsPerRun": {
        "mean": 0,
        "stddev": 0,
        "median": 0,
        "p90": 0,
        "p95": 0,
        "max": 0
      },
      "expansionRunRate": 0,
      "signatureItemsBoughtPerRun": {
        "mean": 0,
        "stddev": 0,
        "median": 0,
        "p90": 0,
        "p95": 0,
        "max": 0
      },
      "signaturePickupRunRate": 0,
      "bestDayTotalBySignatureItem": {},
      "signatureDominance": {
        "maxMedianItemId": null,
        "maxMedian": 0,
        "allSignatureMedian": 0,
        "maxToMedianRatio": 0
      },
      "boardOccupancyByDay": {
        "1": {
          "mean": 2.44,
          "stddev": 0.5,
          "median": 2,
          "p90": 3,
          "p95": 3,
          "max": 3
        },
        "2": {
          "mean": 4.15,
          "stddev": 0.84,
          "median": 4,
          "p90": 5,
          "p95": 6,
          "max": 6
        },
        "3": {
          "mean": 6.02,
          "stddev": 1.32,
          "median": 6,
          "p90": 8,
          "p95": 8,
          "max": 10
        },
        "4": {
          "mean": 7.09,
          "stddev": 1.92,
          "median": 7,
          "p90": 10,
          "p95": 11,
          "max": 12
        },
        "5": {
          "mean": 8.79,
          "stddev": 2.2,
          "median": 9,
          "p90": 12,
          "p95": 12,
          "max": 12
        },
        "6": {
          "mean": 10.11,
          "stddev": 1.99,
          "median": 11,
          "p90": 12,
          "p95": 12,
          "max": 12
        },
        "7": {
          "mean": 10.52,
          "stddev": 1.89,
          "median": 12,
          "p90": 12,
          "p95": 12,
          "max": 12
        },
        "8": {
          "mean": 11.18,
          "stddev": 1.43,
          "median": 12,
          "p90": 12,
          "p95": 12,
          "max": 12
        },
        "9": {
          "mean": 11.62,
          "stddev": 0.99,
          "median": 12,
          "p90": 12,
          "p95": 12,
          "max": 12
        },
        "10": {
          "mean": 11.68,
          "stddev": 0.94,
          "median": 12,
          "p90": 12,
          "p95": 12,
          "max": 12
        },
        "11": {
          "mean": 11.84,
          "stddev": 0.66,
          "median": 12,
          "p90": 12,
          "p95": 12,
          "max": 12
        },
        "12": {
          "mean": 11.92,
          "stddev": 0.44,
          "median": 12,
          "p90": 12,
          "p95": 12,
          "max": 12
        }
      },
      "coinsBeforeScoringByDay": {
        "1": {
          "mean": 0.8,
          "stddev": 1.05,
          "median": 0,
          "p90": 3,
          "p95": 3,
          "max": 5
        },
        "2": {
          "mean": 3.63,
          "stddev": 2.55,
          "median": 3,
          "p90": 7,
          "p95": 7,
          "max": 9
        },
        "3": {
          "mean": 5.81,
          "stddev": 5,
          "median": 6,
          "p90": 11,
          "p95": 12,
          "max": 37
        },
        "4": {
          "mean": 8.5,
          "stddev": 5.69,
          "median": 9,
          "p90": 16,
          "p95": 16,
          "max": 21
        },
        "5": {
          "mean": 16.54,
          "stddev": 20.55,
          "median": 12,
          "p90": 36,
          "p95": 80,
          "max": 115
        },
        "6": {
          "mean": 38.41,
          "stddev": 47.34,
          "median": 20,
          "p90": 125,
          "p95": 144,
          "max": 212
        },
        "7": {
          "mean": 63.79,
          "stddev": 69.69,
          "median": 29,
          "p90": 177,
          "p95": 212,
          "max": 299
        },
        "8": {
          "mean": 114.68,
          "stddev": 103.14,
          "median": 98,
          "p90": 265,
          "p95": 301,
          "max": 412
        },
        "9": {
          "mean": 181.56,
          "stddev": 135.27,
          "median": 180,
          "p90": 353,
          "p95": 412,
          "max": 580
        },
        "10": {
          "mean": 216.29,
          "stddev": 148.01,
          "median": 232,
          "p90": 412,
          "p95": 456,
          "max": 645
        },
        "11": {
          "mean": 294.02,
          "stddev": 171.06,
          "median": 312,
          "p90": 501,
          "p95": 555,
          "max": 760
        },
        "12": {
          "mean": 377.88,
          "stddev": 187.43,
          "median": 388,
          "p90": 597,
          "p95": 666,
          "max": 901
        }
      },
      "rentAmountByDay": {
        "1": {
          "mean": 25,
          "stddev": 0,
          "median": 25,
          "p90": 25,
          "p95": 25,
          "max": 25
        },
        "2": {
          "mean": 25,
          "stddev": 0,
          "median": 25,
          "p90": 25,
          "p95": 25,
          "max": 25
        },
        "3": {
          "mean": 25,
          "stddev": 0,
          "median": 25,
          "p90": 25,
          "p95": 25,
          "max": 25
        },
        "4": {
          "mean": 36,
          "stddev": 0,
          "median": 36,
          "p90": 36,
          "p95": 36,
          "max": 36
        },
        "5": {
          "mean": 36,
          "stddev": 0,
          "median": 36,
          "p90": 36,
          "p95": 36,
          "max": 36
        },
        "6": {
          "mean": 36,
          "stddev": 0,
          "median": 36,
          "p90": 36,
          "p95": 36,
          "max": 36
        },
        "7": {
          "mean": 51,
          "stddev": 0,
          "median": 51,
          "p90": 51,
          "p95": 51,
          "max": 51
        },
        "8": {
          "mean": 51,
          "stddev": 0,
          "median": 51,
          "p90": 51,
          "p95": 51,
          "max": 51
        },
        "9": {
          "mean": 51,
          "stddev": 0,
          "median": 51,
          "p90": 51,
          "p95": 51,
          "max": 51
        },
        "10": {
          "mean": 89,
          "stddev": 0,
          "median": 89,
          "p90": 89,
          "p95": 89,
          "max": 89
        },
        "11": {
          "mean": 89,
          "stddev": 0,
          "median": 89,
          "p90": 89,
          "p95": 89,
          "max": 89
        },
        "12": {
          "mean": 89,
          "stddev": 0,
          "median": 89,
          "p90": 89,
          "p95": 89,
          "max": 89
        }
      },
      "surplusRatioByDay": {
        "1": {
          "mean": 0.03,
          "stddev": 0.04,
          "median": 0,
          "p90": 0.12,
          "p95": 0.12,
          "max": 0.2
        },
        "2": {
          "mean": 0.15,
          "stddev": 0.1,
          "median": 0.12,
          "p90": 0.28,
          "p95": 0.28,
          "max": 0.36
        },
        "3": {
          "mean": 0.23,
          "stddev": 0.2,
          "median": 0.24,
          "p90": 0.44,
          "p95": 0.48,
          "max": 1.48
        },
        "4": {
          "mean": 0.24,
          "stddev": 0.16,
          "median": 0.25,
          "p90": 0.444,
          "p95": 0.444,
          "max": 0.583
        },
        "5": {
          "mean": 0.46,
          "stddev": 0.57,
          "median": 0.333,
          "p90": 1,
          "p95": 2.222,
          "max": 3.194
        },
        "6": {
          "mean": 1.07,
          "stddev": 1.31,
          "median": 0.556,
          "p90": 3.472,
          "p95": 4,
          "max": 5.889
        },
        "7": {
          "mean": 1.25,
          "stddev": 1.37,
          "median": 0.569,
          "p90": 3.471,
          "p95": 4.157,
          "max": 5.863
        },
        "8": {
          "mean": 2.25,
          "stddev": 2.02,
          "median": 1.922,
          "p90": 5.196,
          "p95": 5.902,
          "max": 8.078
        },
        "9": {
          "mean": 3.56,
          "stddev": 2.65,
          "median": 3.529,
          "p90": 6.922,
          "p95": 8.078,
          "max": 11.373
        },
        "10": {
          "mean": 2.43,
          "stddev": 1.66,
          "median": 2.607,
          "p90": 4.629,
          "p95": 5.124,
          "max": 7.247
        },
        "11": {
          "mean": 3.3,
          "stddev": 1.92,
          "median": 3.506,
          "p90": 5.629,
          "p95": 6.236,
          "max": 8.539
        },
        "12": {
          "mean": 4.25,
          "stddev": 2.11,
          "median": 4.36,
          "p90": 6.708,
          "p95": 7.483,
          "max": 10.124
        }
      },
      "dayTotalByDay": {
        "1": {
          "mean": 21.38,
          "stddev": 6.5,
          "median": 21,
          "p90": 30,
          "p95": 34,
          "max": 37
        },
        "2": {
          "mean": 34.96,
          "stddev": 12.84,
          "median": 34,
          "p90": 53,
          "p95": 55,
          "max": 92
        },
        "3": {
          "mean": 47.65,
          "stddev": 17.59,
          "median": 45,
          "p90": 72,
          "p95": 84,
          "max": 111
        },
        "4": {
          "mean": 53.79,
          "stddev": 20.55,
          "median": 51,
          "p90": 80,
          "p95": 88,
          "max": 120
        },
        "5": {
          "mean": 64.74,
          "stddev": 21.32,
          "median": 65,
          "p90": 91,
          "p95": 100,
          "max": 115
        },
        "6": {
          "mean": 77.42,
          "stddev": 25.42,
          "median": 76,
          "p90": 108,
          "p95": 118,
          "max": 186
        },
        "7": {
          "mean": 79.68,
          "stddev": 25.37,
          "median": 77,
          "p90": 107,
          "p95": 118,
          "max": 209
        },
        "8": {
          "mean": 87.79,
          "stddev": 24.49,
          "median": 84,
          "p90": 117,
          "p95": 133,
          "max": 176
        },
        "9": {
          "mean": 87.34,
          "stddev": 21.68,
          "median": 87,
          "p90": 109,
          "p95": 116,
          "max": 227
        },
        "10": {
          "mean": 87.9,
          "stddev": 19.57,
          "median": 85,
          "p90": 117,
          "p95": 120,
          "max": 137
        },
        "11": {
          "mean": 88.82,
          "stddev": 19.61,
          "median": 87,
          "p90": 115,
          "p95": 127,
          "max": 148
        },
        "12": {
          "mean": 90.9,
          "stddev": 25,
          "median": 87,
          "p90": 116,
          "p95": 127,
          "max": 261
        }
      },
      "itemsBoughtByDay": {
        "1": {
          "mean": 1.44,
          "stddev": 0.5,
          "median": 1,
          "p90": 2,
          "p95": 2,
          "max": 2
        },
        "2": {
          "mean": 1.71,
          "stddev": 0.64,
          "median": 2,
          "p90": 2,
          "p95": 3,
          "max": 3
        },
        "3": {
          "mean": 2.06,
          "stddev": 0.84,
          "median": 2,
          "p90": 3,
          "p95": 4,
          "max": 4
        },
        "4": {
          "mean": 1.02,
          "stddev": 0.88,
          "median": 1,
          "p90": 2,
          "p95": 3,
          "max": 4
        },
        "5": {
          "mean": 1.74,
          "stddev": 0.82,
          "median": 2,
          "p90": 3,
          "p95": 3,
          "max": 4
        },
        "6": {
          "mean": 1.34,
          "stddev": 0.82,
          "median": 1,
          "p90": 2,
          "p95": 2,
          "max": 3
        },
        "7": {
          "mean": 0.44,
          "stddev": 0.56,
          "median": 0,
          "p90": 1,
          "p95": 1,
          "max": 2
        },
        "8": {
          "mean": 0.68,
          "stddev": 0.78,
          "median": 0,
          "p90": 2,
          "p95": 2,
          "max": 2
        },
        "9": {
          "mean": 0.44,
          "stddev": 0.71,
          "median": 0,
          "p90": 2,
          "p95": 2,
          "max": 3
        },
        "10": {
          "mean": 0.07,
          "stddev": 0.25,
          "median": 0,
          "p90": 0,
          "p95": 1,
          "max": 1
        },
        "11": {
          "mean": 0.16,
          "stddev": 0.41,
          "median": 0,
          "p90": 1,
          "p95": 1,
          "max": 2
        },
        "12": {
          "mean": 0.08,
          "stddev": 0.3,
          "median": 0,
          "p90": 0,
          "p95": 1,
          "max": 2
        }
      },
      "gameOverRate": 1,
      "diedAtRentCycle": {
        "mean": 7.73,
        "stddev": 1.45,
        "median": 8,
        "p90": 9,
        "p95": 9,
        "max": 9
      },
      "namedComboRunRate": 0.733,
      "orderFillRate": 0.442,
      "spotlightHitRate": 0.995,
      "synergyFireDayRate": 0,
      "synergyFireRate": 0,
      "synergyFiresPerScoredDay": 0,
      "goalTargetHitRate": 0,
      "goalTargetHitRateByDay": {},
      "goalTargetHitRateDays9To12": {
        "hits": 0,
        "survivingDays": 0,
        "rate": 0
      },
      "goalTargetByDay": {},
      "goalDayTotalByDay": {},
      "goalRewardsGranted": 0,
      "freeRerollsSpent": 0,
      "dominantEligibleTagCountDistribution": {
        "1": 137,
        "2": 217,
        "3": 613,
        "4": 834,
        "5": 671,
        "6": 212,
        "7": 18,
        "8": 63,
        "9": 19
      },
      "dominantEligibleTagCountByDay": {
        "1": {
          "mean": 1.29,
          "stddev": 0.45,
          "median": 1,
          "p90": 2,
          "p95": 2,
          "max": 2
        },
        "2": {
          "mean": 1.89,
          "stddev": 0.7,
          "median": 2,
          "p90": 3,
          "p95": 3,
          "max": 4
        },
        "3": {
          "mean": 2.69,
          "stddev": 0.86,
          "median": 3,
          "p90": 4,
          "p95": 4,
          "max": 6
        },
        "4": {
          "mean": 3.02,
          "stddev": 1.01,
          "median": 3,
          "p90": 4,
          "p95": 5,
          "max": 7
        },
        "5": {
          "mean": 3.59,
          "stddev": 1.21,
          "median": 4,
          "p90": 5,
          "p95": 5,
          "max": 8
        },
        "6": {
          "mean": 3.92,
          "stddev": 1.27,
          "median": 4,
          "p90": 5,
          "p95": 6,
          "max": 9
        },
        "7": {
          "mean": 4.09,
          "stddev": 1.29,
          "median": 4,
          "p90": 6,
          "p95": 6,
          "max": 9
        },
        "8": {
          "mean": 4.26,
          "stddev": 1.26,
          "median": 4,
          "p90": 6,
          "p95": 6,
          "max": 9
        },
        "9": {
          "mean": 4.37,
          "stddev": 1.24,
          "median": 4,
          "p90": 6,
          "p95": 6,
          "max": 9
        },
        "10": {
          "mean": 4.38,
          "stddev": 1.23,
          "median": 4,
          "p90": 6,
          "p95": 6,
          "max": 9
        },
        "11": {
          "mean": 4.44,
          "stddev": 1.19,
          "median": 4,
          "p90": 6,
          "p95": 6,
          "max": 9
        },
        "12": {
          "mean": 4.45,
          "stddev": 1.18,
          "median": 4,
          "p90": 6,
          "p95": 6,
          "max": 9
        }
      },
      "finalDominantEligibleTagCount": {
        "mean": 4.39,
        "stddev": 1.23,
        "median": 4,
        "p90": 6,
        "p95": 6,
        "max": 9
      },
      "supplierTagDistribution": {},
      "finalSupplierTagCount": {
        "mean": 0,
        "stddev": 0,
        "median": 0,
        "p90": 0,
        "p95": 0,
        "max": 0
      },
      "supplierTagCountByDay": {}
    },
    {
      "strategy": "combo",
      "runs": 120,
      "daysSurvived": {
        "mean": 22.77,
        "stddev": 5.97,
        "median": 24,
        "p90": 27,
        "p95": 27,
        "max": 27
      },
      "totalCoinsEarned": {
        "mean": 1930.78,
        "stddev": 807.29,
        "median": 1997,
        "p90": 2789,
        "p95": 3152,
        "max": 3508
      },
      "bestDayTotal": {
        "mean": 117.68,
        "stddev": 42.72,
        "median": 115,
        "p90": 172,
        "p95": 192,
        "max": 223
      },
      "bestDayTotalBySignaturePickup": {
        "withSignature": {
          "mean": 0,
          "stddev": 0,
          "median": 0,
          "p90": 0,
          "p95": 0,
          "max": 0
        },
        "withoutSignature": {
          "mean": 117.68,
          "stddev": 42.72,
          "median": 115,
          "p90": 172,
          "p95": 192,
          "max": 223
        }
      },
      "deepestRentSurvived": {
        "mean": 6.59,
        "stddev": 1.99,
        "median": 7,
        "p90": 8,
        "p95": 8,
        "max": 8
      },
      "itemsBoughtPerRun": {
        "mean": 10.62,
        "stddev": 1.97,
        "median": 11,
        "p90": 12,
        "p95": 12,
        "max": 13
      },
      "expansionsPerRun": {
        "mean": 0,
        "stddev": 0,
        "median": 0,
        "p90": 0,
        "p95": 0,
        "max": 0
      },
      "expansionRunRate": 0,
      "signatureItemsBoughtPerRun": {
        "mean": 0,
        "stddev": 0,
        "median": 0,
        "p90": 0,
        "p95": 0,
        "max": 0
      },
      "signaturePickupRunRate": 0,
      "bestDayTotalBySignatureItem": {},
      "signatureDominance": {
        "maxMedianItemId": null,
        "maxMedian": 0,
        "allSignatureMedian": 0,
        "maxToMedianRatio": 0
      },
      "boardOccupancyByDay": {
        "1": {
          "mean": 2.49,
          "stddev": 0.5,
          "median": 2,
          "p90": 3,
          "p95": 3,
          "max": 3
        },
        "2": {
          "mean": 4.28,
          "stddev": 0.99,
          "median": 4,
          "p90": 6,
          "p95": 6,
          "max": 7
        },
        "3": {
          "mean": 6.19,
          "stddev": 1.86,
          "median": 6,
          "p90": 9,
          "p95": 10,
          "max": 11
        },
        "4": {
          "mean": 7.27,
          "stddev": 2.51,
          "median": 7,
          "p90": 12,
          "p95": 12,
          "max": 12
        },
        "5": {
          "mean": 8.82,
          "stddev": 2.5,
          "median": 9,
          "p90": 12,
          "p95": 12,
          "max": 12
        },
        "6": {
          "mean": 10.04,
          "stddev": 2.29,
          "median": 11,
          "p90": 12,
          "p95": 12,
          "max": 12
        },
        "7": {
          "mean": 10.5,
          "stddev": 2.04,
          "median": 12,
          "p90": 12,
          "p95": 12,
          "max": 12
        },
        "8": {
          "mean": 11.09,
          "stddev": 1.71,
          "median": 12,
          "p90": 12,
          "p95": 12,
          "max": 12
        },
        "9": {
          "mean": 11.46,
          "stddev": 1.36,
          "median": 12,
          "p90": 12,
          "p95": 12,
          "max": 12
        },
        "10": {
          "mean": 11.63,
          "stddev": 1.11,
          "median": 12,
          "p90": 12,
          "p95": 12,
          "max": 12
        },
        "11": {
          "mean": 11.77,
          "stddev": 0.95,
          "median": 12,
          "p90": 12,
          "p95": 12,
          "max": 12
        },
        "12": {
          "mean": 11.85,
          "stddev": 0.74,
          "median": 12,
          "p90": 12,
          "p95": 12,
          "max": 12
        }
      },
      "coinsBeforeScoringByDay": {
        "1": {
          "mean": 0.8,
          "stddev": 1.1,
          "median": 0,
          "p90": 3,
          "p95": 3,
          "max": 5
        },
        "2": {
          "mean": 3.16,
          "stddev": 2.59,
          "median": 3,
          "p90": 7,
          "p95": 7,
          "max": 13
        },
        "3": {
          "mean": 6.91,
          "stddev": 4.76,
          "median": 7,
          "p90": 13,
          "p95": 14,
          "max": 23
        },
        "4": {
          "mean": 10.35,
          "stddev": 9.27,
          "median": 9,
          "p90": 17,
          "p95": 29,
          "max": 55
        },
        "5": {
          "mean": 24.84,
          "stddev": 31.42,
          "median": 14,
          "p90": 77,
          "p95": 103,
          "max": 140
        },
        "6": {
          "mean": 55.46,
          "stddev": 67.46,
          "median": 23,
          "p90": 167,
          "p95": 206,
          "max": 262
        },
        "7": {
          "mean": 86.62,
          "stddev": 91.17,
          "median": 33,
          "p90": 234,
          "p95": 279,
          "max": 310
        },
        "8": {
          "mean": 144.69,
          "stddev": 126.28,
          "median": 123,
          "p90": 327,
          "p95": 375,
          "max": 438
        },
        "9": {
          "mean": 214.91,
          "stddev": 158.19,
          "median": 212,
          "p90": 430,
          "p95": 478,
          "max": 566
        },
        "10": {
          "mean": 255.41,
          "stddev": 170.96,
          "median": 267,
          "p90": 497,
          "p95": 521,
          "max": 631
        },
        "11": {
          "mean": 341.04,
          "stddev": 193.32,
          "median": 369,
          "p90": 602,
          "p95": 629,
          "max": 752
        },
        "12": {
          "mean": 434.64,
          "stddev": 213.1,
          "median": 476,
          "p90": 702,
          "p95": 752,
          "max": 948
        }
      },
      "rentAmountByDay": {
        "1": {
          "mean": 25,
          "stddev": 0,
          "median": 25,
          "p90": 25,
          "p95": 25,
          "max": 25
        },
        "2": {
          "mean": 25,
          "stddev": 0,
          "median": 25,
          "p90": 25,
          "p95": 25,
          "max": 25
        },
        "3": {
          "mean": 25,
          "stddev": 0,
          "median": 25,
          "p90": 25,
          "p95": 25,
          "max": 25
        },
        "4": {
          "mean": 36,
          "stddev": 0,
          "median": 36,
          "p90": 36,
          "p95": 36,
          "max": 36
        },
        "5": {
          "mean": 36,
          "stddev": 0,
          "median": 36,
          "p90": 36,
          "p95": 36,
          "max": 36
        },
        "6": {
          "mean": 36,
          "stddev": 0,
          "median": 36,
          "p90": 36,
          "p95": 36,
          "max": 36
        },
        "7": {
          "mean": 51,
          "stddev": 0,
          "median": 51,
          "p90": 51,
          "p95": 51,
          "max": 51
        },
        "8": {
          "mean": 51,
          "stddev": 0,
          "median": 51,
          "p90": 51,
          "p95": 51,
          "max": 51
        },
        "9": {
          "mean": 51,
          "stddev": 0,
          "median": 51,
          "p90": 51,
          "p95": 51,
          "max": 51
        },
        "10": {
          "mean": 89,
          "stddev": 0,
          "median": 89,
          "p90": 89,
          "p95": 89,
          "max": 89
        },
        "11": {
          "mean": 89,
          "stddev": 0,
          "median": 89,
          "p90": 89,
          "p95": 89,
          "max": 89
        },
        "12": {
          "mean": 89,
          "stddev": 0,
          "median": 89,
          "p90": 89,
          "p95": 89,
          "max": 89
        }
      },
      "surplusRatioByDay": {
        "1": {
          "mean": 0.03,
          "stddev": 0.04,
          "median": 0,
          "p90": 0.12,
          "p95": 0.12,
          "max": 0.2
        },
        "2": {
          "mean": 0.13,
          "stddev": 0.1,
          "median": 0.12,
          "p90": 0.28,
          "p95": 0.28,
          "max": 0.52
        },
        "3": {
          "mean": 0.28,
          "stddev": 0.19,
          "median": 0.28,
          "p90": 0.52,
          "p95": 0.56,
          "max": 0.92
        },
        "4": {
          "mean": 0.29,
          "stddev": 0.26,
          "median": 0.25,
          "p90": 0.472,
          "p95": 0.806,
          "max": 1.528
        },
        "5": {
          "mean": 0.69,
          "stddev": 0.87,
          "median": 0.389,
          "p90": 2.139,
          "p95": 2.861,
          "max": 3.889
        },
        "6": {
          "mean": 1.54,
          "stddev": 1.87,
          "median": 0.639,
          "p90": 4.639,
          "p95": 5.722,
          "max": 7.278
        },
        "7": {
          "mean": 1.7,
          "stddev": 1.79,
          "median": 0.647,
          "p90": 4.588,
          "p95": 5.471,
          "max": 6.078
        },
        "8": {
          "mean": 2.84,
          "stddev": 2.48,
          "median": 2.412,
          "p90": 6.412,
          "p95": 7.353,
          "max": 8.588
        },
        "9": {
          "mean": 4.21,
          "stddev": 3.1,
          "median": 4.157,
          "p90": 8.431,
          "p95": 9.373,
          "max": 11.098
        },
        "10": {
          "mean": 2.87,
          "stddev": 1.92,
          "median": 3,
          "p90": 5.584,
          "p95": 5.854,
          "max": 7.09
        },
        "11": {
          "mean": 3.83,
          "stddev": 2.17,
          "median": 4.146,
          "p90": 6.764,
          "p95": 7.067,
          "max": 8.449
        },
        "12": {
          "mean": 4.88,
          "stddev": 2.39,
          "median": 5.348,
          "p90": 7.888,
          "p95": 8.449,
          "max": 10.652
        }
      },
      "dayTotalByDay": {
        "1": {
          "mean": 21.32,
          "stddev": 8.23,
          "median": 21,
          "p90": 31,
          "p95": 38,
          "max": 52
        },
        "2": {
          "mean": 35.32,
          "stddev": 15.69,
          "median": 31,
          "p90": 59,
          "p95": 66,
          "max": 79
        },
        "3": {
          "mean": 48.96,
          "stddev": 22.3,
          "median": 45,
          "p90": 82,
          "p95": 90,
          "max": 119
        },
        "4": {
          "mean": 57.32,
          "stddev": 24.91,
          "median": 55,
          "p90": 91,
          "p95": 101,
          "max": 142
        },
        "5": {
          "mean": 69.92,
          "stddev": 28.51,
          "median": 64,
          "p90": 108,
          "p95": 125,
          "max": 185
        },
        "6": {
          "mean": 79.8,
          "stddev": 30.37,
          "median": 77,
          "p90": 111,
          "p95": 125,
          "max": 210
        },
        "7": {
          "mean": 82.92,
          "stddev": 27.37,
          "median": 83,
          "p90": 121,
          "p95": 128,
          "max": 160
        },
        "8": {
          "mean": 88.92,
          "stddev": 27.52,
          "median": 86,
          "p90": 116,
          "p95": 137,
          "max": 190
        },
        "9": {
          "mean": 91.64,
          "stddev": 26.02,
          "median": 91,
          "p90": 123,
          "p95": 127,
          "max": 214
        },
        "10": {
          "mean": 93.78,
          "stddev": 24.87,
          "median": 92,
          "p90": 125,
          "p95": 133,
          "max": 179
        },
        "11": {
          "mean": 98.22,
          "stddev": 30.14,
          "median": 92,
          "p90": 135,
          "p95": 161,
          "max": 199
        },
        "12": {
          "mean": 95.45,
          "stddev": 25.82,
          "median": 92,
          "p90": 125,
          "p95": 139,
          "max": 192
        }
      },
      "itemsBoughtByDay": {
        "1": {
          "mean": 1.49,
          "stddev": 0.5,
          "median": 1,
          "p90": 2,
          "p95": 2,
          "max": 2
        },
        "2": {
          "mean": 1.78,
          "stddev": 0.78,
          "median": 2,
          "p90": 3,
          "p95": 3,
          "max": 4
        },
        "3": {
          "mean": 1.99,
          "stddev": 1.08,
          "median": 2,
          "p90": 4,
          "p95": 4,
          "max": 4
        },
        "4": {
          "mean": 1.08,
          "stddev": 0.97,
          "median": 1,
          "p90": 3,
          "p95": 3,
          "max": 4
        },
        "5": {
          "mean": 1.62,
          "stddev": 0.89,
          "median": 2,
          "p90": 3,
          "p95": 3,
          "max": 4
        },
        "6": {
          "mean": 1.23,
          "stddev": 0.95,
          "median": 1,
          "p90": 2,
          "p95": 3,
          "max": 4
        },
        "7": {
          "mean": 0.39,
          "stddev": 0.54,
          "median": 0,
          "p90": 1,
          "p95": 1,
          "max": 2
        },
        "8": {
          "mean": 0.59,
          "stddev": 0.74,
          "median": 0,
          "p90": 2,
          "p95": 2,
          "max": 2
        },
        "9": {
          "mean": 0.37,
          "stddev": 0.61,
          "median": 0,
          "p90": 1,
          "p95": 2,
          "max": 2
        },
        "10": {
          "mean": 0.09,
          "stddev": 0.34,
          "median": 0,
          "p90": 0,
          "p95": 1,
          "max": 2
        },
        "11": {
          "mean": 0.14,
          "stddev": 0.42,
          "median": 0,
          "p90": 1,
          "p95": 1,
          "max": 2
        },
        "12": {
          "mean": 0.07,
          "stddev": 0.26,
          "median": 0,
          "p90": 0,
          "p95": 1,
          "max": 1
        }
      },
      "gameOverRate": 1,
      "diedAtRentCycle": {
        "mean": 7.59,
        "stddev": 1.99,
        "median": 8,
        "p90": 9,
        "p95": 9,
        "max": 9
      },
      "namedComboRunRate": 0.775,
      "orderFillRate": 0.487,
      "spotlightHitRate": 0.993,
      "synergyFireDayRate": 0,
      "synergyFireRate": 0,
      "synergyFiresPerScoredDay": 0,
      "goalTargetHitRate": 0,
      "goalTargetHitRateByDay": {},
      "goalTargetHitRateDays9To12": {
        "hits": 0,
        "survivingDays": 0,
        "rate": 0
      },
      "goalTargetByDay": {},
      "goalDayTotalByDay": {},
      "goalRewardsGranted": 0,
      "freeRerollsSpent": 0,
      "dominantEligibleTagCountDistribution": {
        "1": 119,
        "2": 289,
        "3": 510,
        "4": 753,
        "5": 529,
        "6": 386,
        "7": 112,
        "8": 35
      },
      "dominantEligibleTagCountByDay": {
        "1": {
          "mean": 1.38,
          "stddev": 0.5,
          "median": 1,
          "p90": 2,
          "p95": 2,
          "max": 3
        },
        "2": {
          "mean": 2.02,
          "stddev": 0.71,
          "median": 2,
          "p90": 3,
          "p95": 3,
          "max": 4
        },
        "3": {
          "mean": 2.67,
          "stddev": 1.02,
          "median": 2,
          "p90": 4,
          "p95": 5,
          "max": 6
        },
        "4": {
          "mean": 3.11,
          "stddev": 1.24,
          "median": 3,
          "p90": 5,
          "p95": 6,
          "max": 6
        },
        "5": {
          "mean": 3.68,
          "stddev": 1.4,
          "median": 3,
          "p90": 6,
          "p95": 6,
          "max": 7
        },
        "6": {
          "mean": 4.07,
          "stddev": 1.39,
          "median": 4,
          "p90": 6,
          "p95": 6,
          "max": 8
        },
        "7": {
          "mean": 4.22,
          "stddev": 1.38,
          "median": 4,
          "p90": 6,
          "p95": 6,
          "max": 8
        },
        "8": {
          "mean": 4.38,
          "stddev": 1.37,
          "median": 4,
          "p90": 6,
          "p95": 7,
          "max": 8
        },
        "9": {
          "mean": 4.49,
          "stddev": 1.32,
          "median": 4,
          "p90": 6,
          "p95": 7,
          "max": 8
        },
        "10": {
          "mean": 4.51,
          "stddev": 1.31,
          "median": 4,
          "p90": 6,
          "p95": 7,
          "max": 8
        },
        "11": {
          "mean": 4.53,
          "stddev": 1.29,
          "median": 4,
          "p90": 6,
          "p95": 7,
          "max": 8
        },
        "12": {
          "mean": 4.54,
          "stddev": 1.28,
          "median": 4,
          "p90": 6,
          "p95": 7,
          "max": 8
        }
      },
      "finalDominantEligibleTagCount": {
        "mean": 4.39,
        "stddev": 1.38,
        "median": 4,
        "p90": 6,
        "p95": 7,
        "max": 8
      },
      "supplierTagDistribution": {},
      "finalSupplierTagCount": {
        "mean": 0,
        "stddev": 0,
        "median": 0,
        "p90": 0,
        "p95": 0,
        "max": 0
      },
      "supplierTagCountByDay": {}
    }
  ],
  "elapsedMs": 33403
}
```

### balance --assert-bands

```text

Balance report — 80 runs per policy/config (seed "balance", maxActions 600)
Policies: FLOOR = screen-affordance naive player; CEILING = bot policies using engine legal actions.
Guardrail bands (--assert-bands enforces): ceiling run length [20, 36]d; build swing [1.3, 2]x. Surplus/tension deferred to Fable.

Config: baseline
  FLOOR            survival median 3d (p90 24, max 27); first-rent survival 21.2%; near-death 21.2%; earned median 18c
  CEILING(greedy)  survival median 27d (p90 30, max 33); first-rent survival 100.0%; near-death 100.0%; earned median 2077c
  CEILING(combo)   survival median 27d (p90 30, max 30); first-rent survival 98.8%; near-death 98.8%; earned median 1925c

  day |                FLOOR |      CEILING(greedy) |       CEILING(combo)
  ----+----------------------+----------------------+----------------------
    1 |            0c/25c 0x |            0c/25c 0x |            0c/25c 0x
    2 |         2c/25c 0.08x |        12c/25c 0.48x |         9c/25c 0.36x
    3 |         8c/25c 0.32x |        28c/25c 1.12x |        24c/25c 0.96x
    4 |         3c/36c 0.08x |        19c/36c 0.53x |        15c/36c 0.42x
    5 |        25c/36c 0.69x |        58c/36c 1.61x |        55c/36c 1.53x
    6 |        55c/36c 1.53x |       112c/36c 3.11x |       101c/36c 2.81x
    7 |        24c/51c 0.47x |       122c/51c 2.39x |       105c/51c 2.06x
    8 |        75c/51c 1.47x |       203c/51c 3.98x |       176c/51c 3.45x
    9 |       129c/51c 2.53x |       289c/51c 5.67x |       258c/51c 5.06x
   10 |       131c/81c 1.62x |       326c/81c 4.03x |       286c/81c 3.53x
   11 |       200c/81c 2.47x |       413c/81c 5.10x |       385c/81c 4.75x
   12 |       263c/81c 3.25x |       507c/81c 6.26x |       463c/81c 5.72x
   13 |      248c/129c 1.92x |      511c/129c 3.96x |      448c/129c 3.47x
   14 |      329c/129c 2.55x |      599c/129c 4.64x |      527c/129c 4.08x
   15 |      398c/129c 3.08x |      692c/129c 5.36x |      627c/129c 4.86x
   16 |      333c/206c 1.62x |      641c/206c 3.11x |      580c/206c 2.82x
   17 |      400c/206c 1.94x |      721c/206c 3.50x |      658c/206c 3.19x
   18 |      468c/206c 2.27x |      820c/206c 3.98x |      749c/206c 3.64x

Config: baselineWarmOpening
  FLOOR            survival median 3d (p90 24, max 27); first-rent survival 21.2%; near-death 21.2%; earned median 18c
  CEILING(greedy)  survival median 27d (p90 30, max 30); first-rent survival 100.0%; near-death 100.0%; earned median 1953c
  CEILING(combo)   survival median 27d (p90 30, max 30); first-rent survival 100.0%; near-death 100.0%; earned median 2050c

  day |                FLOOR |      CEILING(greedy) |       CEILING(combo)
  ----+----------------------+----------------------+----------------------
    1 |            0c/25c 0x |            0c/25c 0x |            0c/25c 0x
    2 |         2c/25c 0.08x |         9c/25c 0.36x |         9c/25c 0.36x
    3 |         9c/25c 0.36x |        28c/25c 1.12x |        28c/25c 1.12x
    4 |         2c/36c 0.06x |        15c/36c 0.42x |        20c/36c 0.56x
    5 |        27c/36c 0.75x |        56c/36c 1.56x |        62c/36c 1.72x
    6 |        53c/36c 1.47x |       104c/36c 2.89x |       114c/36c 3.17x
    7 |        25c/51c 0.49x |       118c/51c 2.31x |       122c/51c 2.39x
    8 |        81c/51c 1.59x |       187c/51c 3.67x |       201c/51c 3.94x
    9 |       142c/51c 2.78x |       268c/51c 5.25x |       286c/51c 5.61x
   10 |       165c/81c 2.04x |       298c/81c 3.68x |       308c/81c 3.80x
   11 |          243c/81c 3x |       386c/81c 4.76x |       404c/81c 4.99x
   12 |       302c/81c 3.73x |       476c/81c 5.88x |       506c/81c 6.25x
   13 |      287c/129c 2.23x |      479c/129c 3.71x |      511c/129c 3.96x
   14 |      344c/129c 2.67x |      558c/129c 4.33x |      590c/129c 4.57x
   15 |      400c/129c 3.10x |      642c/129c 4.98x |      680c/129c 5.27x
   16 |      337c/206c 1.64x |      598c/206c 2.90x |      649c/206c 3.15x
   17 |      409c/206c 1.99x |      685c/206c 3.33x |      743c/206c 3.61x
   18 |      474c/206c 2.30x |      772c/206c 3.75x |      821c/206c 3.98x

Config: buildSteering
  FLOOR            survival median 3d (p90 27, max 27); first-rent survival 25.0%; near-death 25.0%; earned median 19c
  CEILING(greedy)  survival median 27d (p90 30, max 33); first-rent survival 98.8%; near-death 98.8%; earned median 2037c
  CEILING(combo)   survival median 27d (p90 30, max 30); first-rent survival 98.8%; near-death 98.8%; earned median 2058c

  day |                FLOOR |      CEILING(greedy) |       CEILING(combo)
  ----+----------------------+----------------------+----------------------
    1 |            0c/25c 0x |            0c/25c 0x |            0c/25c 0x
    2 |         2c/25c 0.08x |        12c/25c 0.48x |        12c/25c 0.48x
    3 |         9c/25c 0.36x |        33c/25c 1.32x |        33c/25c 1.32x
    4 |         2c/36c 0.06x |        24c/36c 0.67x |        21c/36c 0.58x
    5 |        18c/36c 0.50x |        68c/36c 1.89x |        65c/36c 1.81x
    6 |        43c/36c 1.19x |       117c/36c 3.25x |       114c/36c 3.17x
    7 |         9c/51c 0.18x |       129c/51c 2.53x |       129c/51c 2.53x
    8 |        61c/51c 1.20x |       203c/51c 3.98x |       205c/51c 4.02x
    9 |       121c/51c 2.37x |       289c/51c 5.67x |       294c/51c 5.76x
   10 |       129c/81c 1.59x |       330c/81c 4.07x |       323c/81c 3.99x
   11 |       187c/81c 2.31x |       425c/81c 5.25x |       422c/81c 5.21x
   12 |       285c/81c 3.52x |       520c/81c 6.42x |       529c/81c 6.53x
   13 |      307c/129c 2.38x |      528c/129c 4.09x |      538c/129c 4.17x
   14 |      371c/129c 2.88x |      611c/129c 4.74x |      648c/129c 5.02x
   15 |      430c/129c 3.33x |      695c/129c 5.39x |      743c/129c 5.76x
   16 |      374c/206c 1.82x |      646c/206c 3.14x |      686c/206c 3.33x
   17 |      430c/206c 2.09x |      712c/206c 3.46x |      757c/206c 3.67x
   18 |      502c/206c 2.44x |      789c/206c 3.83x |      848c/206c 4.12x

Config: buildSteeringWarmOpening
  FLOOR            survival median 3d (p90 24, max 27); first-rent survival 31.3%; near-death 31.3%; earned median 21c
  CEILING(greedy)  survival median 27d (p90 30, max 33); first-rent survival 97.5%; near-death 97.5%; earned median 2069c
  CEILING(combo)   survival median 27d (p90 30, max 30); first-rent survival 97.5%; near-death 97.5%; earned median 2048c

  day |                FLOOR |      CEILING(greedy) |       CEILING(combo)
  ----+----------------------+----------------------+----------------------
    1 |            0c/25c 0x |            0c/25c 0x |            0c/25c 0x
    2 |         3c/25c 0.12x |        12c/25c 0.48x |        12c/25c 0.48x
    3 |         9c/25c 0.36x |        33c/25c 1.32x |        33c/25c 1.32x
    4 |         1c/36c 0.03x |        24c/36c 0.67x |        23c/36c 0.64x
    5 |        24c/36c 0.67x |        65c/36c 1.81x |        65c/36c 1.81x
    6 |        50c/36c 1.39x |       113c/36c 3.14x |       117c/36c 3.25x
    7 |        27c/51c 0.53x |       117c/51c 2.29x |       130c/51c 2.55x
    8 |        75c/51c 1.47x |       203c/51c 3.98x |          204c/51c 4x
    9 |       135c/51c 2.65x |       274c/51c 5.37x |       276c/51c 5.41x
   10 |       138c/81c 1.70x |       299c/81c 3.69x |       313c/81c 3.86x
   11 |       202c/81c 2.49x |       396c/81c 4.89x |       406c/81c 5.01x
   12 |       282c/81c 3.48x |       494c/81c 6.10x |       493c/81c 6.09x
   13 |      264c/129c 2.05x |      508c/129c 3.94x |      505c/129c 3.92x
   14 |      322c/129c 2.50x |      592c/129c 4.59x |      577c/129c 4.47x
   15 |      399c/129c 3.09x |      679c/129c 5.26x |      701c/129c 5.43x
   16 |      334c/206c 1.62x |      644c/206c 3.13x |      661c/206c 3.21x
   17 |      410c/206c 1.99x |      732c/206c 3.55x |      756c/206c 3.67x
   18 |      475c/206c 2.31x |      816c/206c 3.96x |      838c/206c 4.07x

Config: loopV2
  FLOOR            survival median 3d (p90 3, max 27); first-rent survival 10.0%; near-death 10.0%; earned median 24c
  CEILING(greedy)  survival median 24d (p90 27, max 27); first-rent survival 95.0%; near-death 95.0%; earned median 1873c
  CEILING(combo)   survival median 24d (p90 27, max 30); first-rent survival 92.5%; near-death 92.5%; earned median 1925c

  day |                FLOOR |      CEILING(greedy) |       CEILING(combo)
  ----+----------------------+----------------------+----------------------
    1 |            0c/25c 0x |            0c/25c 0x |            0c/25c 0x
    2 |         5c/25c 0.20x |         3c/25c 0.12x |         2c/25c 0.08x
    3 |         7c/25c 0.28x |         5c/25c 0.20x |         3c/25c 0.12x
    4 |         4c/36c 0.11x |         7c/36c 0.19x |         8c/36c 0.22x
    5 |        10c/36c 0.28x |        14c/36c 0.39x |        12c/36c 0.33x
    6 |         7c/36c 0.19x |        26c/36c 0.72x |        16c/36c 0.44x
    7 |        12c/51c 0.23x |        65c/51c 1.27x |        25c/51c 0.49x
    8 |         9c/51c 0.18x |       142c/51c 2.78x |        70c/51c 1.37x
    9 |        25c/51c 0.49x |       231c/51c 4.53x |       161c/51c 3.16x
   10 |        10c/89c 0.11x |       261c/89c 2.93x |       198c/89c 2.23x
   11 |        35c/89c 0.39x |       338c/89c 3.80x |       272c/89c 3.06x
   12 |        24c/89c 0.27x |       419c/89c 4.71x |       381c/89c 4.28x
   13 |      456c/155c 2.94x |      411c/155c 2.65x |      385c/155c 2.48x
   14 |      561c/155c 3.62x |      497c/155c 3.21x |      483c/155c 3.12x
   15 |      654c/155c 4.22x |      577c/155c 3.72x |      585c/155c 3.77x
   16 |      604c/271c 2.23x |      513c/271c 1.89x |      528c/271c 1.95x
   17 |      703c/271c 2.59x |      617c/271c 2.28x |      609c/271c 2.25x
   18 |      802c/271c 2.96x |      695c/271c 2.56x |      710c/271c 2.62x

Config: loopV2WarmOpening
  FLOOR            survival median 3d (p90 6, max 27); first-rent survival 12.5%; near-death 12.5%; earned median 24c
  CEILING(greedy)  survival median 24d (p90 27, max 30); first-rent survival 96.3%; near-death 96.3%; earned median 1941c
  CEILING(combo)   survival median 24d (p90 27, max 27); first-rent survival 95.0%; near-death 95.0%; earned median 1839c

  day |                FLOOR |      CEILING(greedy) |       CEILING(combo)
  ----+----------------------+----------------------+----------------------
    1 |            0c/25c 0x |            0c/25c 0x |            0c/25c 0x
    2 |         5c/25c 0.20x |         3c/25c 0.12x |         2c/25c 0.08x
    3 |         7c/25c 0.28x |         4c/25c 0.16x |         4c/25c 0.16x
    4 |         6c/36c 0.17x |         7c/36c 0.19x |         6c/36c 0.17x
    5 |        11c/36c 0.31x |        13c/36c 0.36x |        14c/36c 0.39x
    6 |        12c/36c 0.33x |        21c/36c 0.58x |        20c/36c 0.56x
    7 |        23c/51c 0.45x |        46c/51c 0.90x |        62c/51c 1.22x
    8 |        17c/51c 0.33x |       129c/51c 2.53x |       131c/51c 2.57x
    9 |        35c/51c 0.69x |       207c/51c 4.06x |       211c/51c 4.14x
   10 |        33c/89c 0.37x |       239c/89c 2.69x |       244c/89c 2.74x
   11 |        76c/89c 0.85x |       326c/89c 3.66x |       347c/89c 3.90x
   12 |       139c/89c 1.56x |       434c/89c 4.88x |       420c/89c 4.72x
   13 |      163c/155c 1.05x |      429c/155c 2.77x |      411c/155c 2.65x
   14 |      263c/155c 1.70x |      529c/155c 3.41x |      496c/155c 3.20x
   15 |      386c/155c 2.49x |      601c/155c 3.88x |      596c/155c 3.85x
   16 |      324c/271c 1.20x |      560c/271c 2.07x |      535c/271c 1.97x
   17 |      411c/271c 1.52x |      653c/271c 2.41x |      620c/271c 2.29x
   18 |      498c/271c 1.84x |      751c/271c 2.77x |      710c/271c 2.62x

Config: allDepth
  FLOOR            survival median 3d (p90 6, max 24); first-rent survival 16.3%; near-death 16.3%; earned median 24c
  CEILING(greedy)  survival median 27d (p90 30, max 33); first-rent survival 97.5%; near-death 97.5%; earned median 2771c
  CEILING(combo)   survival median 27d (p90 30, max 33); first-rent survival 100.0%; near-death 100.0%; earned median 2748c

  day |                FLOOR |      CEILING(greedy) |       CEILING(combo)
  ----+----------------------+----------------------+----------------------
    1 |            0c/25c 0x |            0c/25c 0x |            0c/25c 0x
    2 |         5c/25c 0.20x |         2c/25c 0.08x |         3c/25c 0.12x
    3 |         8c/25c 0.32x |         4c/25c 0.16x |         5c/25c 0.20x
    4 |         2c/36c 0.06x |         7c/36c 0.19x |         8c/36c 0.22x
    5 |        10c/36c 0.28x |        11c/36c 0.31x |        14c/36c 0.39x
    6 |        13c/36c 0.36x |           36c/36c 1x |        25c/36c 0.69x
    7 |         4c/51c 0.08x |       112c/51c 2.20x |        82c/51c 1.61x
    8 |        24c/51c 0.47x |       208c/51c 4.08x |       180c/51c 3.53x
    9 |        32c/51c 0.63x |       295c/51c 5.78x |       312c/51c 6.12x
   10 |        28c/89c 0.32x |       376c/89c 4.22x |       383c/89c 4.30x
   11 |        18c/89c 0.20x |       506c/89c 5.68x |       489c/89c 5.49x
   12 |        24c/89c 0.27x |       610c/89c 6.85x |       604c/89c 6.79x
   13 |       57c/155c 0.37x |      650c/155c 4.19x |         620c/155c 4x
   14 |       21c/155c 0.14x |      761c/155c 4.91x |      714c/155c 4.61x
   15 |      169c/155c 1.09x |      876c/155c 5.65x |      822c/155c 5.30x
   16 |      130c/271c 0.48x |      815c/271c 3.01x |      788c/271c 2.91x
   17 |      215c/271c 0.79x |      940c/271c 3.47x |      919c/271c 3.39x
   18 |      275c/271c 1.01x |     1051c/271c 3.88x |     1029c/271c 3.80x

Config: allDepthWarmOpening
  FLOOR            survival median 3d (p90 12, max 27); first-rent survival 18.8%; near-death 18.8%; earned median 28c
  CEILING(greedy)  survival median 27d (p90 30, max 33); first-rent survival 98.8%; near-death 98.8%; earned median 2758c
  CEILING(combo)   survival median 27d (p90 30, max 33); first-rent survival 96.3%; near-death 96.3%; earned median 2702c

  day |                FLOOR |      CEILING(greedy) |       CEILING(combo)
  ----+----------------------+----------------------+----------------------
    1 |            0c/25c 0x |            0c/25c 0x |            0c/25c 0x
    2 |         4c/25c 0.16x |         2c/25c 0.08x |         3c/25c 0.12x
    3 |         5c/25c 0.20x |         5c/25c 0.20x |         6c/25c 0.24x
    4 |         4c/36c 0.11x |         7c/36c 0.19x |        10c/36c 0.28x
    5 |        13c/36c 0.36x |        19c/36c 0.53x |        18c/36c 0.50x
    6 |        20c/36c 0.56x |        55c/36c 1.53x |        42c/36c 1.17x
    7 |        10c/51c 0.20x |       117c/51c 2.29x |       122c/51c 2.39x
    8 |        15c/51c 0.29x |       230c/51c 4.51x |       221c/51c 4.33x
    9 |        31c/51c 0.61x |       349c/51c 6.84x |       351c/51c 6.88x
   10 |         9c/89c 0.10x |       403c/89c 4.53x |       417c/89c 4.68x
   11 |        37c/89c 0.42x |       507c/89c 5.70x |       537c/89c 6.03x
   12 |        50c/89c 0.56x |       599c/89c 6.73x |       667c/89c 7.49x
   13 |      148c/155c 0.95x |      638c/155c 4.12x |      696c/155c 4.49x
   14 |      253c/155c 1.63x |      767c/155c 4.95x |      787c/155c 5.08x
   15 |      354c/155c 2.28x |      866c/155c 5.59x |      902c/155c 5.82x
   16 |      285c/271c 1.05x |      843c/271c 3.11x |      885c/271c 3.27x
   17 |      357c/271c 1.32x |      939c/271c 3.46x |     1013c/271c 3.74x
   18 |      429c/271c 1.58x |     1068c/271c 3.94x |     1140c/271c 4.21x

Build swing (allDepth median earned / baseline median earned):
  floor: 1.333x
  ceiling-greedy: 1.334x
  ceiling-combo: 1.428x

Aspirational beginner floor (NOT asserted — needs Fable to ease the opening): first-rent survival target [40, 70]%. Actual:
  baseline: 21.2%  (below target — gap)
  baselineWarmOpening: 21.2%  (below target — gap)
  buildSteering: 25.0%  (below target — gap)
  buildSteeringWarmOpening: 31.3%  (below target — gap)
  loopV2: 10.0%  (below target — gap)
  loopV2WarmOpening: 12.5%  (below target — gap)
  allDepth: 16.3%  (below target — gap)
  allDepthWarmOpening: 18.8%  (below target — gap)
```

## 5. Goal-table report - 400-run full stack + warm opening

### greedy

```json
{
  "goalTargetHitRateByDay": {
    "1": {
      "hits": 324,
      "survivingDays": 400,
      "rate": 0.81
    },
    "2": {
      "hits": 294,
      "survivingDays": 400,
      "rate": 0.735
    },
    "3": {
      "hits": 289,
      "survivingDays": 400,
      "rate": 0.723
    }
  }
}
```

### combo

```json
{
  "goalTargetHitRateByDay": {
    "1": {
      "hits": 320,
      "survivingDays": 400,
      "rate": 0.8
    },
    "2": {
      "hits": 299,
      "survivingDays": 400,
      "rate": 0.748
    },
    "3": {
      "hits": 295,
      "survivingDays": 400,
      "rate": 0.738
    }
  }
}
```

Full 400-run fuzz JSON:

```json
{
  "generatedAt": "2026-07-08T19:35:01.542Z",
  "seedPrefix": "m6b-goal-drift",
  "loopV2Enabled": true,
  "goalLadderEnabled": true,
  "tagSynergyEnabled": true,
  "buildSteeringEnabled": true,
  "shelfExpansionEnabled": false,
  "warmOpeningEnabled": true,
  "buildSteerBias": 2.5,
  "maxActions": 400,
  "results": [
    {
      "strategy": "random",
      "runs": 400,
      "daysSurvived": {
        "mean": 3,
        "stddev": 0,
        "median": 3,
        "p90": 3,
        "p95": 3,
        "max": 3
      },
      "totalCoinsEarned": {
        "mean": 1.57,
        "stddev": 3.07,
        "median": 0,
        "p90": 6,
        "p95": 9,
        "max": 26
      },
      "bestDayTotal": {
        "mean": 1.24,
        "stddev": 2.34,
        "median": 0,
        "p90": 4,
        "p95": 6,
        "max": 18
      },
      "bestDayTotalBySignaturePickup": {
        "withSignature": {
          "mean": 0,
          "stddev": 0,
          "median": 0,
          "p90": 0,
          "p95": 0,
          "max": 0
        },
        "withoutSignature": {
          "mean": 1.24,
          "stddev": 2.34,
          "median": 0,
          "p90": 4,
          "p95": 6,
          "max": 18
        }
      },
      "deepestRentSurvived": {
        "mean": 0,
        "stddev": 0,
        "median": 0,
        "p90": 0,
        "p95": 0,
        "max": 0
      },
      "itemsBoughtPerRun": {
        "mean": 1.31,
        "stddev": 0.81,
        "median": 1,
        "p90": 2,
        "p95": 3,
        "max": 3
      },
      "expansionsPerRun": {
        "mean": 0,
        "stddev": 0,
        "median": 0,
        "p90": 0,
        "p95": 0,
        "max": 0
      },
      "expansionRunRate": 0,
      "signatureItemsBoughtPerRun": {
        "mean": 0,
        "stddev": 0,
        "median": 0,
        "p90": 0,
        "p95": 0,
        "max": 0
      },
      "signaturePickupRunRate": 0,
      "bestDayTotalBySignatureItem": {},
      "signatureDominance": {
        "maxMedianItemId": null,
        "maxMedian": 0,
        "allSignatureMedian": 0,
        "maxToMedianRatio": 0
      },
      "boardOccupancyByDay": {
        "1": {
          "mean": 0.47,
          "stddev": 0.66,
          "median": 0,
          "p90": 1,
          "p95": 2,
          "max": 3
        },
        "2": {
          "mean": 0.15,
          "stddev": 0.39,
          "median": 0,
          "p90": 1,
          "p95": 1,
          "max": 3
        },
        "3": {
          "mean": 0.03,
          "stddev": 0.16,
          "median": 0,
          "p90": 0,
          "p95": 0,
          "max": 1
        }
      },
      "coinsBeforeScoringByDay": {
        "1": {
          "mean": 2.44,
          "stddev": 2.71,
          "median": 1,
          "p90": 8,
          "p95": 9,
          "max": 9
        },
        "2": {
          "mean": 2.29,
          "stddev": 2.43,
          "median": 1,
          "p90": 7,
          "p95": 9,
          "max": 12
        },
        "3": {
          "mean": 1.88,
          "stddev": 2.16,
          "median": 1,
          "p90": 5,
          "p95": 7,
          "max": 13
        }
      },
      "rentAmountByDay": {
        "1": {
          "mean": 25,
          "stddev": 0,
          "median": 25,
          "p90": 25,
          "p95": 25,
          "max": 25
        },
        "2": {
          "mean": 25,
          "stddev": 0,
          "median": 25,
          "p90": 25,
          "p95": 25,
          "max": 25
        },
        "3": {
          "mean": 25,
          "stddev": 0,
          "median": 25,
          "p90": 25,
          "p95": 25,
          "max": 25
        }
      },
      "surplusRatioByDay": {
        "1": {
          "mean": 0.1,
          "stddev": 0.11,
          "median": 0.04,
          "p90": 0.32,
          "p95": 0.36,
          "max": 0.36
        },
        "2": {
          "mean": 0.09,
          "stddev": 0.1,
          "median": 0.04,
          "p90": 0.28,
          "p95": 0.36,
          "max": 0.48
        },
        "3": {
          "mean": 0.08,
          "stddev": 0.09,
          "median": 0.04,
          "p90": 0.2,
          "p95": 0.28,
          "max": 0.52
        }
      },
      "dayTotalByDay": {
        "1": {
          "mean": 1.17,
          "stddev": 2.16,
          "median": 0,
          "p90": 4,
          "p95": 6,
          "max": 18
        },
        "2": {
          "mean": 0.34,
          "stddev": 1.3,
          "median": 0,
          "p90": 1,
          "p95": 2,
          "max": 18
        },
        "3": {
          "mean": 0.07,
          "stddev": 0.54,
          "median": 0,
          "p90": 0,
          "p95": 0,
          "max": 9
        }
      },
      "itemsBoughtByDay": {
        "1": {
          "mean": 1.21,
          "stddev": 0.83,
          "median": 1,
          "p90": 2,
          "p95": 2,
          "max": 3
        },
        "2": {
          "mean": 0.09,
          "stddev": 0.3,
          "median": 0,
          "p90": 0,
          "p95": 1,
          "max": 2
        },
        "3": {
          "mean": 0.01,
          "stddev": 0.09,
          "median": 0,
          "p90": 0,
          "p95": 0,
          "max": 1
        }
      },
      "gameOverRate": 1,
      "diedAtRentCycle": {
        "mean": 1,
        "stddev": 0,
        "median": 1,
        "p90": 1,
        "p95": 1,
        "max": 1
      },
      "namedComboRunRate": 0,
      "orderFillRate": 0,
      "spotlightHitRate": 0.021,
      "synergyFireDayRate": 0,
      "synergyFireRate": 0,
      "synergyFiresPerScoredDay": 0,
      "goalTargetHitRate": 0.001,
      "goalTargetHitRateByDay": {
        "1": {
          "hits": 1,
          "survivingDays": 400,
          "rate": 0.003
        },
        "2": {
          "hits": 0,
          "survivingDays": 400,
          "rate": 0
        },
        "3": {
          "hits": 0,
          "survivingDays": 400,
          "rate": 0
        }
      },
      "goalTargetHitRateDays9To12": {
        "hits": 0,
        "survivingDays": 0,
        "rate": 0
      },
      "goalTargetByDay": {
        "1": {
          "mean": 18,
          "stddev": 0,
          "median": 18,
          "p90": 18,
          "p95": 18,
          "max": 18
        },
        "2": {
          "mean": 28,
          "stddev": 0,
          "median": 28,
          "p90": 28,
          "p95": 28,
          "max": 28
        },
        "3": {
          "mean": 40,
          "stddev": 0,
          "median": 40,
          "p90": 40,
          "p95": 40,
          "max": 40
        }
      },
      "goalDayTotalByDay": {
        "1": {
          "mean": 1.17,
          "stddev": 2.16,
          "median": 0,
          "p90": 4,
          "p95": 6,
          "max": 18
        },
        "2": {
          "mean": 0.34,
          "stddev": 1.3,
          "median": 0,
          "p90": 1,
          "p95": 2,
          "max": 18
        },
        "3": {
          "mean": 0.07,
          "stddev": 0.54,
          "median": 0,
          "p90": 0,
          "p95": 0,
          "max": 9
        }
      },
      "goalRewardsGranted": 1,
      "freeRerollsSpent": 1,
      "dominantEligibleTagCountDistribution": {
        "0": 1005,
        "1": 189,
        "2": 6
      },
      "dominantEligibleTagCountByDay": {
        "1": {
          "mean": 0.36,
          "stddev": 0.51,
          "median": 0,
          "p90": 1,
          "p95": 1,
          "max": 2
        },
        "2": {
          "mean": 0.12,
          "stddev": 0.33,
          "median": 0,
          "p90": 1,
          "p95": 1,
          "max": 1
        },
        "3": {
          "mean": 0.02,
          "stddev": 0.15,
          "median": 0,
          "p90": 0,
          "p95": 0,
          "max": 1
        }
      },
      "finalDominantEligibleTagCount": {
        "mean": 0.02,
        "stddev": 0.15,
        "median": 0,
        "p90": 0,
        "p95": 0,
        "max": 1
      },
      "supplierTagDistribution": {
        "antique": 38,
        "drink": 35,
        "fancy": 35,
        "food": 45,
        "fragile": 27,
        "lucky": 48,
        "perishable": 41,
        "plant": 42,
        "sweet": 46,
        "utility": 43
      },
      "finalSupplierTagCount": {
        "mean": 0,
        "stddev": 0.05,
        "median": 0,
        "p90": 0,
        "p95": 0,
        "max": 1
      },
      "supplierTagCountByDay": {
        "1": {
          "mean": 0.13,
          "stddev": 0.35,
          "median": 0,
          "p90": 1,
          "p95": 1,
          "max": 2
        },
        "2": {
          "mean": 0.04,
          "stddev": 0.21,
          "median": 0,
          "p90": 0,
          "p95": 0,
          "max": 1
        },
        "3": {
          "mean": 0,
          "stddev": 0.05,
          "median": 0,
          "p90": 0,
          "p95": 0,
          "max": 1
        }
      }
    },
    {
      "strategy": "greedy",
      "runs": 400,
      "daysSurvived": {
        "mean": 26.25,
        "stddev": 3.89,
        "median": 27,
        "p90": 30,
        "p95": 30,
        "max": 33
      },
      "totalCoinsEarned": {
        "mean": 2976.68,
        "stddev": 1303.29,
        "median": 2826,
        "p90": 4694,
        "p95": 5286,
        "max": 7942
      },
      "bestDayTotal": {
        "mean": 161.24,
        "stddev": 67.74,
        "median": 150,
        "p90": 241,
        "p95": 283,
        "max": 475
      },
      "bestDayTotalBySignaturePickup": {
        "withSignature": {
          "mean": 199.48,
          "stddev": 91.33,
          "median": 181,
          "p90": 332,
          "p95": 432,
          "max": 475
        },
        "withoutSignature": {
          "mean": 156.03,
          "stddev": 62.05,
          "median": 147,
          "p90": 235,
          "p95": 268,
          "max": 444
        }
      },
      "deepestRentSurvived": {
        "mean": 7.75,
        "stddev": 1.3,
        "median": 8,
        "p90": 9,
        "p95": 9,
        "max": 10
      },
      "itemsBoughtPerRun": {
        "mean": 11.15,
        "stddev": 1.08,
        "median": 11,
        "p90": 12,
        "p95": 12,
        "max": 13
      },
      "expansionsPerRun": {
        "mean": 0,
        "stddev": 0,
        "median": 0,
        "p90": 0,
        "p95": 0,
        "max": 0
      },
      "expansionRunRate": 0,
      "signatureItemsBoughtPerRun": {
        "mean": 0.13,
        "stddev": 0.35,
        "median": 0,
        "p90": 1,
        "p95": 1,
        "max": 2
      },
      "signaturePickupRunRate": 0.12,
      "bestDayTotalBySignatureItem": {
        "brass-scale": {
          "mean": 193.57,
          "stddev": 53.32,
          "median": 201,
          "p90": 272,
          "p95": 305,
          "max": 305
        },
        "consignment-sign": {
          "mean": 256.18,
          "stddev": 91.1,
          "median": 252,
          "p90": 432,
          "p95": 464,
          "max": 464
        },
        "ledger-book": {
          "mean": 96.33,
          "stddev": 18.21,
          "median": 105,
          "p90": 113,
          "p95": 113,
          "max": 113
        },
        "lucky-cat": {
          "mean": 166.5,
          "stddev": 86.63,
          "median": 152,
          "p90": 228,
          "p95": 475,
          "max": 475
        }
      },
      "signatureDominance": {
        "maxMedianItemId": "consignment-sign",
        "maxMedian": 252,
        "allSignatureMedian": 181,
        "maxToMedianRatio": 1.392
      },
      "boardOccupancyByDay": {
        "1": {
          "mean": 2.77,
          "stddev": 0.42,
          "median": 3,
          "p90": 3,
          "p95": 3,
          "max": 3
        },
        "2": {
          "mean": 4.97,
          "stddev": 1.1,
          "median": 5,
          "p90": 6,
          "p95": 7,
          "max": 8
        },
        "3": {
          "mean": 7.3,
          "stddev": 1.99,
          "median": 7,
          "p90": 10,
          "p95": 11,
          "max": 12
        },
        "4": {
          "mean": 8.59,
          "stddev": 2.47,
          "median": 9,
          "p90": 12,
          "p95": 12,
          "max": 12
        },
        "5": {
          "mean": 10.07,
          "stddev": 2.23,
          "median": 11,
          "p90": 12,
          "p95": 12,
          "max": 12
        },
        "6": {
          "mean": 10.92,
          "stddev": 1.75,
          "median": 12,
          "p90": 12,
          "p95": 12,
          "max": 12
        },
        "7": {
          "mean": 11.24,
          "stddev": 1.5,
          "median": 12,
          "p90": 12,
          "p95": 12,
          "max": 12
        },
        "8": {
          "mean": 11.62,
          "stddev": 1.01,
          "median": 12,
          "p90": 12,
          "p95": 12,
          "max": 12
        },
        "9": {
          "mean": 11.84,
          "stddev": 0.61,
          "median": 12,
          "p90": 12,
          "p95": 12,
          "max": 12
        },
        "10": {
          "mean": 11.9,
          "stddev": 0.49,
          "median": 12,
          "p90": 12,
          "p95": 12,
          "max": 12
        },
        "11": {
          "mean": 11.96,
          "stddev": 0.24,
          "median": 12,
          "p90": 12,
          "p95": 12,
          "max": 12
        },
        "12": {
          "mean": 11.99,
          "stddev": 0.07,
          "median": 12,
          "p90": 12,
          "p95": 12,
          "max": 12
        }
      },
      "coinsBeforeScoringByDay": {
        "1": {
          "mean": 0.33,
          "stddev": 0.58,
          "median": 0,
          "p90": 1,
          "p95": 2,
          "max": 2
        },
        "2": {
          "mean": 2.9,
          "stddev": 2.35,
          "median": 2,
          "p90": 6,
          "p95": 7,
          "max": 9
        },
        "3": {
          "mean": 5.59,
          "stddev": 4.27,
          "median": 5,
          "p90": 11,
          "p95": 12,
          "max": 29
        },
        "4": {
          "mean": 17.19,
          "stddev": 28.61,
          "median": 9,
          "p90": 48,
          "p95": 86,
          "max": 172
        },
        "5": {
          "mean": 56.41,
          "stddev": 75.74,
          "median": 19,
          "p90": 177,
          "p95": 225,
          "max": 363
        },
        "6": {
          "mean": 125.8,
          "stddev": 129.74,
          "median": 76,
          "p90": 317,
          "p95": 402,
          "max": 563
        },
        "7": {
          "mean": 185.58,
          "stddev": 174.49,
          "median": 146,
          "p90": 450,
          "p95": 528,
          "max": 695
        },
        "8": {
          "mean": 280.76,
          "stddev": 223.21,
          "median": 248,
          "p90": 610,
          "p95": 701,
          "max": 907
        },
        "9": {
          "mean": 387.23,
          "stddev": 265.01,
          "median": 357,
          "p90": 764,
          "p95": 872,
          "max": 1084
        },
        "10": {
          "mean": 453.76,
          "stddev": 295.28,
          "median": 414,
          "p90": 853,
          "p95": 999,
          "max": 1264
        },
        "11": {
          "mean": 570.77,
          "stddev": 329.3,
          "median": 525,
          "p90": 1011,
          "p95": 1163,
          "max": 1615
        },
        "12": {
          "mean": 690.46,
          "stddev": 362.3,
          "median": 628,
          "p90": 1185,
          "p95": 1380,
          "max": 1855
        }
      },
      "rentAmountByDay": {
        "1": {
          "mean": 25,
          "stddev": 0,
          "median": 25,
          "p90": 25,
          "p95": 25,
          "max": 25
        },
        "2": {
          "mean": 25,
          "stddev": 0,
          "median": 25,
          "p90": 25,
          "p95": 25,
          "max": 25
        },
        "3": {
          "mean": 25,
          "stddev": 0,
          "median": 25,
          "p90": 25,
          "p95": 25,
          "max": 25
        },
        "4": {
          "mean": 36,
          "stddev": 0,
          "median": 36,
          "p90": 36,
          "p95": 36,
          "max": 36
        },
        "5": {
          "mean": 36,
          "stddev": 0,
          "median": 36,
          "p90": 36,
          "p95": 36,
          "max": 36
        },
        "6": {
          "mean": 36,
          "stddev": 0,
          "median": 36,
          "p90": 36,
          "p95": 36,
          "max": 36
        },
        "7": {
          "mean": 51,
          "stddev": 0,
          "median": 51,
          "p90": 51,
          "p95": 51,
          "max": 51
        },
        "8": {
          "mean": 51,
          "stddev": 0,
          "median": 51,
          "p90": 51,
          "p95": 51,
          "max": 51
        },
        "9": {
          "mean": 51,
          "stddev": 0,
          "median": 51,
          "p90": 51,
          "p95": 51,
          "max": 51
        },
        "10": {
          "mean": 89,
          "stddev": 0,
          "median": 89,
          "p90": 89,
          "p95": 89,
          "max": 89
        },
        "11": {
          "mean": 89,
          "stddev": 0,
          "median": 89,
          "p90": 89,
          "p95": 89,
          "max": 89
        },
        "12": {
          "mean": 89,
          "stddev": 0,
          "median": 89,
          "p90": 89,
          "p95": 89,
          "max": 89
        }
      },
      "surplusRatioByDay": {
        "1": {
          "mean": 0.01,
          "stddev": 0.02,
          "median": 0,
          "p90": 0.04,
          "p95": 0.08,
          "max": 0.08
        },
        "2": {
          "mean": 0.12,
          "stddev": 0.09,
          "median": 0.08,
          "p90": 0.24,
          "p95": 0.28,
          "max": 0.36
        },
        "3": {
          "mean": 0.22,
          "stddev": 0.17,
          "median": 0.2,
          "p90": 0.44,
          "p95": 0.48,
          "max": 1.16
        },
        "4": {
          "mean": 0.48,
          "stddev": 0.79,
          "median": 0.25,
          "p90": 1.333,
          "p95": 2.389,
          "max": 4.778
        },
        "5": {
          "mean": 1.57,
          "stddev": 2.1,
          "median": 0.528,
          "p90": 4.917,
          "p95": 6.25,
          "max": 10.083
        },
        "6": {
          "mean": 3.49,
          "stddev": 3.6,
          "median": 2.111,
          "p90": 8.806,
          "p95": 11.167,
          "max": 15.639
        },
        "7": {
          "mean": 3.64,
          "stddev": 3.42,
          "median": 2.863,
          "p90": 8.824,
          "p95": 10.353,
          "max": 13.627
        },
        "8": {
          "mean": 5.51,
          "stddev": 4.38,
          "median": 4.863,
          "p90": 11.961,
          "p95": 13.745,
          "max": 17.784
        },
        "9": {
          "mean": 7.59,
          "stddev": 5.2,
          "median": 7,
          "p90": 14.98,
          "p95": 17.098,
          "max": 21.255
        },
        "10": {
          "mean": 5.1,
          "stddev": 3.32,
          "median": 4.652,
          "p90": 9.584,
          "p95": 11.225,
          "max": 14.202
        },
        "11": {
          "mean": 6.41,
          "stddev": 3.7,
          "median": 5.899,
          "p90": 11.36,
          "p95": 13.067,
          "max": 18.146
        },
        "12": {
          "mean": 7.76,
          "stddev": 4.07,
          "median": 7.056,
          "p90": 13.315,
          "p95": 15.506,
          "max": 20.843
        }
      },
      "dayTotalByDay": {
        "1": {
          "mean": 25.78,
          "stddev": 8.76,
          "median": 25,
          "p90": 39,
          "p95": 42,
          "max": 50
        },
        "2": {
          "mean": 40.7,
          "stddev": 17.62,
          "median": 38,
          "p90": 67,
          "p95": 77,
          "max": 96
        },
        "3": {
          "mean": 63.1,
          "stddev": 35.07,
          "median": 53,
          "p90": 113,
          "p95": 132,
          "max": 229
        },
        "4": {
          "mean": 79.19,
          "stddev": 42.89,
          "median": 70,
          "p90": 145,
          "p95": 159,
          "max": 228
        },
        "5": {
          "mean": 96.72,
          "stddev": 47.88,
          "median": 90,
          "p90": 161,
          "p95": 178,
          "max": 361
        },
        "6": {
          "mean": 106.32,
          "stddev": 50.42,
          "median": 98,
          "p90": 166,
          "p95": 183,
          "max": 444
        },
        "7": {
          "mean": 111.16,
          "stddev": 45.54,
          "median": 106,
          "p90": 170,
          "p95": 192,
          "max": 361
        },
        "8": {
          "mean": 116.8,
          "stddev": 44.29,
          "median": 111,
          "p90": 171,
          "p95": 189,
          "max": 357
        },
        "9": {
          "mean": 119.18,
          "stddev": 42.53,
          "median": 114,
          "p90": 174,
          "p95": 191,
          "max": 346
        },
        "10": {
          "mean": 120.72,
          "stddev": 43.5,
          "median": 116,
          "p90": 177,
          "p95": 198,
          "max": 399
        },
        "11": {
          "mean": 121.79,
          "stddev": 44.07,
          "median": 116,
          "p90": 179,
          "p95": 204,
          "max": 407
        },
        "12": {
          "mean": 124.46,
          "stddev": 47.72,
          "median": 116,
          "p90": 188,
          "p95": 213,
          "max": 409
        }
      },
      "itemsBoughtByDay": {
        "1": {
          "mean": 1.77,
          "stddev": 0.42,
          "median": 2,
          "p90": 2,
          "p95": 2,
          "max": 2
        },
        "2": {
          "mean": 2.2,
          "stddev": 0.92,
          "median": 2,
          "p90": 3,
          "p95": 4,
          "max": 5
        },
        "3": {
          "mean": 2.43,
          "stddev": 1.17,
          "median": 2,
          "p90": 4,
          "p95": 5,
          "max": 6
        },
        "4": {
          "mean": 1.32,
          "stddev": 1.06,
          "median": 1,
          "p90": 3,
          "p95": 3,
          "max": 5
        },
        "5": {
          "mean": 1.54,
          "stddev": 1,
          "median": 2,
          "p90": 3,
          "p95": 3,
          "max": 5
        },
        "6": {
          "mean": 0.86,
          "stddev": 0.95,
          "median": 1,
          "p90": 2,
          "p95": 3,
          "max": 4
        },
        "7": {
          "mean": 0.32,
          "stddev": 0.58,
          "median": 0,
          "p90": 1,
          "p95": 2,
          "max": 2
        },
        "8": {
          "mean": 0.38,
          "stddev": 0.71,
          "median": 0,
          "p90": 2,
          "p95": 2,
          "max": 3
        },
        "9": {
          "mean": 0.22,
          "stddev": 0.55,
          "median": 0,
          "p90": 1,
          "p95": 2,
          "max": 3
        },
        "10": {
          "mean": 0.05,
          "stddev": 0.24,
          "median": 0,
          "p90": 0,
          "p95": 1,
          "max": 2
        },
        "11": {
          "mean": 0.06,
          "stddev": 0.3,
          "median": 0,
          "p90": 0,
          "p95": 1,
          "max": 3
        },
        "12": {
          "mean": 0.04,
          "stddev": 0.21,
          "median": 0,
          "p90": 0,
          "p95": 0,
          "max": 2
        }
      },
      "gameOverRate": 1,
      "diedAtRentCycle": {
        "mean": 8.75,
        "stddev": 1.3,
        "median": 9,
        "p90": 10,
        "p95": 10,
        "max": 11
      },
      "namedComboRunRate": 0.787,
      "orderFillRate": 0.432,
      "spotlightHitRate": 0.994,
      "synergyFireDayRate": 0.916,
      "synergyFireRate": 0.63,
      "synergyFiresPerScoredDay": 6.87,
      "goalTargetHitRate": 0.79,
      "goalTargetHitRateByDay": {
        "1": {
          "hits": 324,
          "survivingDays": 400,
          "rate": 0.81
        },
        "2": {
          "hits": 294,
          "survivingDays": 400,
          "rate": 0.735
        },
        "3": {
          "hits": 289,
          "survivingDays": 400,
          "rate": 0.723
        },
        "4": {
          "hits": 295,
          "survivingDays": 396,
          "rate": 0.745
        },
        "5": {
          "hits": 309,
          "survivingDays": 396,
          "rate": 0.78
        },
        "6": {
          "hits": 313,
          "survivingDays": 396,
          "rate": 0.79
        },
        "7": {
          "hits": 307,
          "survivingDays": 394,
          "rate": 0.779
        },
        "8": {
          "hits": 309,
          "survivingDays": 394,
          "rate": 0.784
        },
        "9": {
          "hits": 308,
          "survivingDays": 394,
          "rate": 0.782
        },
        "10": {
          "hits": 295,
          "survivingDays": 393,
          "rate": 0.751
        },
        "11": {
          "hits": 290,
          "survivingDays": 393,
          "rate": 0.738
        },
        "12": {
          "hits": 299,
          "survivingDays": 393,
          "rate": 0.761
        }
      },
      "goalTargetHitRateDays9To12": {
        "hits": 1192,
        "survivingDays": 1573,
        "rate": 0.758
      },
      "goalTargetByDay": {
        "1": {
          "mean": 18,
          "stddev": 0,
          "median": 18,
          "p90": 18,
          "p95": 18,
          "max": 18
        },
        "2": {
          "mean": 28,
          "stddev": 0,
          "median": 28,
          "p90": 28,
          "p95": 28,
          "max": 28
        },
        "3": {
          "mean": 40,
          "stddev": 0,
          "median": 40,
          "p90": 40,
          "p95": 40,
          "max": 40
        },
        "4": {
          "mean": 46,
          "stddev": 0,
          "median": 46,
          "p90": 46,
          "p95": 46,
          "max": 46
        },
        "5": {
          "mean": 56,
          "stddev": 0,
          "median": 56,
          "p90": 56,
          "p95": 56,
          "max": 56
        },
        "6": {
          "mean": 66,
          "stddev": 0,
          "median": 66,
          "p90": 66,
          "p95": 66,
          "max": 66
        },
        "7": {
          "mean": 74,
          "stddev": 0,
          "median": 74,
          "p90": 74,
          "p95": 74,
          "max": 74
        },
        "8": {
          "mean": 80,
          "stddev": 0,
          "median": 80,
          "p90": 80,
          "p95": 80,
          "max": 80
        },
        "9": {
          "mean": 86,
          "stddev": 0,
          "median": 86,
          "p90": 86,
          "p95": 86,
          "max": 86
        },
        "10": {
          "mean": 90,
          "stddev": 0,
          "median": 90,
          "p90": 90,
          "p95": 90,
          "max": 90
        },
        "11": {
          "mean": 90,
          "stddev": 0,
          "median": 90,
          "p90": 90,
          "p95": 90,
          "max": 90
        },
        "12": {
          "mean": 90,
          "stddev": 0,
          "median": 90,
          "p90": 90,
          "p95": 90,
          "max": 90
        }
      },
      "goalDayTotalByDay": {
        "1": {
          "mean": 25.78,
          "stddev": 8.76,
          "median": 25,
          "p90": 39,
          "p95": 42,
          "max": 50
        },
        "2": {
          "mean": 40.7,
          "stddev": 17.62,
          "median": 38,
          "p90": 67,
          "p95": 77,
          "max": 96
        },
        "3": {
          "mean": 63.1,
          "stddev": 35.07,
          "median": 53,
          "p90": 113,
          "p95": 132,
          "max": 229
        },
        "4": {
          "mean": 79.19,
          "stddev": 42.89,
          "median": 70,
          "p90": 145,
          "p95": 159,
          "max": 228
        },
        "5": {
          "mean": 96.72,
          "stddev": 47.88,
          "median": 90,
          "p90": 161,
          "p95": 178,
          "max": 361
        },
        "6": {
          "mean": 106.32,
          "stddev": 50.42,
          "median": 98,
          "p90": 166,
          "p95": 183,
          "max": 444
        },
        "7": {
          "mean": 111.16,
          "stddev": 45.54,
          "median": 106,
          "p90": 170,
          "p95": 192,
          "max": 361
        },
        "8": {
          "mean": 116.8,
          "stddev": 44.29,
          "median": 111,
          "p90": 171,
          "p95": 189,
          "max": 357
        },
        "9": {
          "mean": 119.18,
          "stddev": 42.53,
          "median": 114,
          "p90": 174,
          "p95": 191,
          "max": 346
        },
        "10": {
          "mean": 120.72,
          "stddev": 43.5,
          "median": 116,
          "p90": 177,
          "p95": 198,
          "max": 399
        },
        "11": {
          "mean": 121.79,
          "stddev": 44.07,
          "median": 116,
          "p90": 179,
          "p95": 204,
          "max": 407
        },
        "12": {
          "mean": 124.46,
          "stddev": 47.72,
          "median": 116,
          "p90": 188,
          "p95": 213,
          "max": 409
        }
      },
      "goalRewardsGranted": 8294,
      "freeRerollsSpent": 1061,
      "dominantEligibleTagCountDistribution": {
        "1": 281,
        "2": 604,
        "3": 833,
        "4": 1829,
        "5": 2037,
        "6": 2315,
        "7": 1537,
        "8": 648,
        "9": 261,
        "10": 129,
        "11": 26
      },
      "dominantEligibleTagCountByDay": {
        "1": {
          "mean": 1.48,
          "stddev": 0.57,
          "median": 1,
          "p90": 2,
          "p95": 2,
          "max": 3
        },
        "2": {
          "mean": 2.4,
          "stddev": 0.87,
          "median": 2,
          "p90": 4,
          "p95": 4,
          "max": 5
        },
        "3": {
          "mean": 3.45,
          "stddev": 1.33,
          "median": 3,
          "p90": 5,
          "p95": 6,
          "max": 8
        },
        "4": {
          "mean": 4.16,
          "stddev": 1.77,
          "median": 4,
          "p90": 7,
          "p95": 7,
          "max": 10
        },
        "5": {
          "mean": 4.84,
          "stddev": 1.83,
          "median": 5,
          "p90": 7,
          "p95": 8,
          "max": 11
        },
        "6": {
          "mean": 5.22,
          "stddev": 1.75,
          "median": 5,
          "p90": 7,
          "p95": 8,
          "max": 11
        },
        "7": {
          "mean": 5.4,
          "stddev": 1.7,
          "median": 5,
          "p90": 7,
          "p95": 8,
          "max": 11
        },
        "8": {
          "mean": 5.54,
          "stddev": 1.62,
          "median": 6,
          "p90": 8,
          "p95": 8,
          "max": 11
        },
        "9": {
          "mean": 5.62,
          "stddev": 1.56,
          "median": 6,
          "p90": 8,
          "p95": 8,
          "max": 11
        },
        "10": {
          "mean": 5.65,
          "stddev": 1.54,
          "median": 6,
          "p90": 8,
          "p95": 8,
          "max": 11
        },
        "11": {
          "mean": 5.68,
          "stddev": 1.52,
          "median": 6,
          "p90": 8,
          "p95": 8,
          "max": 11
        },
        "12": {
          "mean": 5.69,
          "stddev": 1.51,
          "median": 6,
          "p90": 8,
          "p95": 8,
          "max": 11
        }
      },
      "finalDominantEligibleTagCount": {
        "mean": 5.63,
        "stddev": 1.57,
        "median": 6,
        "p90": 8,
        "p95": 8,
        "max": 11
      },
      "supplierTagDistribution": {
        "antique": 7,
        "drink": 18,
        "fancy": 24,
        "food": 147,
        "fragile": 34,
        "lucky": 52,
        "perishable": 27,
        "plant": 15,
        "sweet": 3,
        "utility": 73
      },
      "finalSupplierTagCount": {
        "mean": 4.82,
        "stddev": 2.2,
        "median": 5,
        "p90": 7,
        "p95": 8,
        "max": 11
      },
      "supplierTagCountByDay": {
        "1": {
          "mean": 1.14,
          "stddev": 0.76,
          "median": 1,
          "p90": 2,
          "p95": 2,
          "max": 3
        },
        "2": {
          "mean": 1.99,
          "stddev": 1.15,
          "median": 2,
          "p90": 4,
          "p95": 4,
          "max": 5
        },
        "3": {
          "mean": 2.93,
          "stddev": 1.72,
          "median": 3,
          "p90": 5,
          "p95": 6,
          "max": 8
        },
        "4": {
          "mean": 3.58,
          "stddev": 2.15,
          "median": 3,
          "p90": 7,
          "p95": 7,
          "max": 10
        },
        "5": {
          "mean": 4.18,
          "stddev": 2.26,
          "median": 4,
          "p90": 7,
          "p95": 8,
          "max": 11
        },
        "6": {
          "mean": 4.5,
          "stddev": 2.27,
          "median": 5,
          "p90": 7,
          "p95": 8,
          "max": 11
        },
        "7": {
          "mean": 4.64,
          "stddev": 2.26,
          "median": 5,
          "p90": 7,
          "p95": 8,
          "max": 11
        },
        "8": {
          "mean": 4.75,
          "stddev": 2.24,
          "median": 5,
          "p90": 7,
          "p95": 8,
          "max": 11
        },
        "9": {
          "mean": 4.8,
          "stddev": 2.21,
          "median": 5,
          "p90": 7,
          "p95": 8,
          "max": 11
        },
        "10": {
          "mean": 4.84,
          "stddev": 2.2,
          "median": 5,
          "p90": 7,
          "p95": 8,
          "max": 11
        },
        "11": {
          "mean": 4.86,
          "stddev": 2.19,
          "median": 5,
          "p90": 7,
          "p95": 8,
          "max": 11
        },
        "12": {
          "mean": 4.89,
          "stddev": 2.16,
          "median": 5,
          "p90": 7,
          "p95": 8,
          "max": 11
        }
      }
    },
    {
      "strategy": "combo",
      "runs": 400,
      "daysSurvived": {
        "mean": 26.27,
        "stddev": 3.96,
        "median": 27,
        "p90": 30,
        "p95": 30,
        "max": 33
      },
      "totalCoinsEarned": {
        "mean": 3008.49,
        "stddev": 1325.6,
        "median": 2851,
        "p90": 4667,
        "p95": 5321,
        "max": 9332
      },
      "bestDayTotal": {
        "mean": 160.74,
        "stddev": 68.09,
        "median": 150,
        "p90": 239,
        "p95": 280,
        "max": 593
      },
      "bestDayTotalBySignaturePickup": {
        "withSignature": {
          "mean": 179.63,
          "stddev": 98.56,
          "median": 162,
          "p90": 279,
          "p95": 406,
          "max": 593
        },
        "withoutSignature": {
          "mean": 158.93,
          "stddev": 64.13,
          "median": 150,
          "p90": 236,
          "p95": 278,
          "max": 538
        }
      },
      "deepestRentSurvived": {
        "mean": 7.76,
        "stddev": 1.32,
        "median": 8,
        "p90": 9,
        "p95": 9,
        "max": 10
      },
      "itemsBoughtPerRun": {
        "mean": 11.16,
        "stddev": 1.12,
        "median": 11,
        "p90": 12,
        "p95": 12,
        "max": 14
      },
      "expansionsPerRun": {
        "mean": 0,
        "stddev": 0,
        "median": 0,
        "p90": 0,
        "p95": 0,
        "max": 0
      },
      "expansionRunRate": 0,
      "signatureItemsBoughtPerRun": {
        "mean": 0.09,
        "stddev": 0.29,
        "median": 0,
        "p90": 0,
        "p95": 1,
        "max": 2
      },
      "signaturePickupRunRate": 0.087,
      "bestDayTotalBySignatureItem": {
        "brass-scale": {
          "mean": 170.22,
          "stddev": 52.92,
          "median": 167,
          "p90": 279,
          "p95": 279,
          "max": 279
        },
        "consignment-sign": {
          "mean": 233.17,
          "stddev": 38.75,
          "median": 248,
          "p90": 280,
          "p95": 280,
          "max": 280
        },
        "ledger-book": {
          "mean": 124.56,
          "stddev": 31.36,
          "median": 125,
          "p90": 175,
          "p95": 175,
          "max": 175
        },
        "lucky-cat": {
          "mean": 209.7,
          "stddev": 154.89,
          "median": 142,
          "p90": 593,
          "p95": 593,
          "max": 593
        },
        "window-display": {
          "mean": 140,
          "stddev": 22,
          "median": 162,
          "p90": 162,
          "p95": 162,
          "max": 162
        }
      },
      "signatureDominance": {
        "maxMedianItemId": "consignment-sign",
        "maxMedian": 248,
        "allSignatureMedian": 162,
        "maxToMedianRatio": 1.531
      },
      "boardOccupancyByDay": {
        "1": {
          "mean": 2.79,
          "stddev": 0.41,
          "median": 3,
          "p90": 3,
          "p95": 3,
          "max": 3
        },
        "2": {
          "mean": 4.92,
          "stddev": 1.11,
          "median": 5,
          "p90": 6,
          "p95": 7,
          "max": 8
        },
        "3": {
          "mean": 7.21,
          "stddev": 1.94,
          "median": 7,
          "p90": 10,
          "p95": 11,
          "max": 12
        },
        "4": {
          "mean": 8.52,
          "stddev": 2.4,
          "median": 8,
          "p90": 12,
          "p95": 12,
          "max": 12
        },
        "5": {
          "mean": 10.1,
          "stddev": 2.19,
          "median": 11,
          "p90": 12,
          "p95": 12,
          "max": 12
        },
        "6": {
          "mean": 11.04,
          "stddev": 1.64,
          "median": 12,
          "p90": 12,
          "p95": 12,
          "max": 12
        },
        "7": {
          "mean": 11.34,
          "stddev": 1.4,
          "median": 12,
          "p90": 12,
          "p95": 12,
          "max": 12
        },
        "8": {
          "mean": 11.69,
          "stddev": 0.97,
          "median": 12,
          "p90": 12,
          "p95": 12,
          "max": 12
        },
        "9": {
          "mean": 11.85,
          "stddev": 0.66,
          "median": 12,
          "p90": 12,
          "p95": 12,
          "max": 12
        },
        "10": {
          "mean": 11.88,
          "stddev": 0.58,
          "median": 12,
          "p90": 12,
          "p95": 12,
          "max": 12
        },
        "11": {
          "mean": 11.95,
          "stddev": 0.36,
          "median": 12,
          "p90": 12,
          "p95": 12,
          "max": 12
        },
        "12": {
          "mean": 11.97,
          "stddev": 0.23,
          "median": 12,
          "p90": 12,
          "p95": 12,
          "max": 12
        }
      },
      "coinsBeforeScoringByDay": {
        "1": {
          "mean": 0.34,
          "stddev": 0.58,
          "median": 0,
          "p90": 1,
          "p95": 2,
          "max": 2
        },
        "2": {
          "mean": 3.06,
          "stddev": 2.33,
          "median": 3,
          "p90": 6,
          "p95": 7,
          "max": 9
        },
        "3": {
          "mean": 5.6,
          "stddev": 5.55,
          "median": 5,
          "p90": 11,
          "p95": 12,
          "max": 51
        },
        "4": {
          "mean": 17.3,
          "stddev": 30.2,
          "median": 10,
          "p90": 35,
          "p95": 84,
          "max": 189
        },
        "5": {
          "mean": 53.64,
          "stddev": 77.38,
          "median": 17,
          "p90": 169,
          "p95": 228,
          "max": 372
        },
        "6": {
          "mean": 121.4,
          "stddev": 132.71,
          "median": 74,
          "p90": 320,
          "p95": 397,
          "max": 605
        },
        "7": {
          "mean": 184.86,
          "stddev": 175.81,
          "median": 139,
          "p90": 433,
          "p95": 537,
          "max": 901
        },
        "8": {
          "mean": 282.88,
          "stddev": 225.79,
          "median": 253,
          "p90": 596,
          "p95": 713,
          "max": 1208
        },
        "9": {
          "mean": 393.04,
          "stddev": 263.84,
          "median": 368,
          "p90": 750,
          "p95": 884,
          "max": 1498
        },
        "10": {
          "mean": 461.74,
          "stddev": 297.12,
          "median": 425,
          "p90": 852,
          "p95": 1007,
          "max": 1629
        },
        "11": {
          "mean": 580.41,
          "stddev": 334.17,
          "median": 540,
          "p90": 1014,
          "p95": 1162,
          "max": 1852
        },
        "12": {
          "mean": 704.29,
          "stddev": 371.29,
          "median": 649,
          "p90": 1190,
          "p95": 1355,
          "max": 2306
        }
      },
      "rentAmountByDay": {
        "1": {
          "mean": 25,
          "stddev": 0,
          "median": 25,
          "p90": 25,
          "p95": 25,
          "max": 25
        },
        "2": {
          "mean": 25,
          "stddev": 0,
          "median": 25,
          "p90": 25,
          "p95": 25,
          "max": 25
        },
        "3": {
          "mean": 25,
          "stddev": 0,
          "median": 25,
          "p90": 25,
          "p95": 25,
          "max": 25
        },
        "4": {
          "mean": 36,
          "stddev": 0,
          "median": 36,
          "p90": 36,
          "p95": 36,
          "max": 36
        },
        "5": {
          "mean": 36,
          "stddev": 0,
          "median": 36,
          "p90": 36,
          "p95": 36,
          "max": 36
        },
        "6": {
          "mean": 36,
          "stddev": 0,
          "median": 36,
          "p90": 36,
          "p95": 36,
          "max": 36
        },
        "7": {
          "mean": 51,
          "stddev": 0,
          "median": 51,
          "p90": 51,
          "p95": 51,
          "max": 51
        },
        "8": {
          "mean": 51,
          "stddev": 0,
          "median": 51,
          "p90": 51,
          "p95": 51,
          "max": 51
        },
        "9": {
          "mean": 51,
          "stddev": 0,
          "median": 51,
          "p90": 51,
          "p95": 51,
          "max": 51
        },
        "10": {
          "mean": 89,
          "stddev": 0,
          "median": 89,
          "p90": 89,
          "p95": 89,
          "max": 89
        },
        "11": {
          "mean": 89,
          "stddev": 0,
          "median": 89,
          "p90": 89,
          "p95": 89,
          "max": 89
        },
        "12": {
          "mean": 89,
          "stddev": 0,
          "median": 89,
          "p90": 89,
          "p95": 89,
          "max": 89
        }
      },
      "surplusRatioByDay": {
        "1": {
          "mean": 0.01,
          "stddev": 0.02,
          "median": 0,
          "p90": 0.04,
          "p95": 0.08,
          "max": 0.08
        },
        "2": {
          "mean": 0.12,
          "stddev": 0.09,
          "median": 0.12,
          "p90": 0.24,
          "p95": 0.28,
          "max": 0.36
        },
        "3": {
          "mean": 0.22,
          "stddev": 0.22,
          "median": 0.2,
          "p90": 0.44,
          "p95": 0.48,
          "max": 2.04
        },
        "4": {
          "mean": 0.48,
          "stddev": 0.84,
          "median": 0.278,
          "p90": 0.972,
          "p95": 2.333,
          "max": 5.25
        },
        "5": {
          "mean": 1.49,
          "stddev": 2.15,
          "median": 0.472,
          "p90": 4.694,
          "p95": 6.333,
          "max": 10.333
        },
        "6": {
          "mean": 3.37,
          "stddev": 3.69,
          "median": 2.056,
          "p90": 8.889,
          "p95": 11.028,
          "max": 16.806
        },
        "7": {
          "mean": 3.62,
          "stddev": 3.45,
          "median": 2.725,
          "p90": 8.49,
          "p95": 10.529,
          "max": 17.667
        },
        "8": {
          "mean": 5.55,
          "stddev": 4.43,
          "median": 4.961,
          "p90": 11.686,
          "p95": 13.98,
          "max": 23.686
        },
        "9": {
          "mean": 7.71,
          "stddev": 5.17,
          "median": 7.216,
          "p90": 14.706,
          "p95": 17.333,
          "max": 29.373
        },
        "10": {
          "mean": 5.19,
          "stddev": 3.34,
          "median": 4.775,
          "p90": 9.573,
          "p95": 11.315,
          "max": 18.303
        },
        "11": {
          "mean": 6.52,
          "stddev": 3.75,
          "median": 6.067,
          "p90": 11.393,
          "p95": 13.056,
          "max": 20.809
        },
        "12": {
          "mean": 7.91,
          "stddev": 4.17,
          "median": 7.292,
          "p90": 13.371,
          "p95": 15.225,
          "max": 25.91
        }
      },
      "dayTotalByDay": {
        "1": {
          "mean": 25.54,
          "stddev": 8.69,
          "median": 25,
          "p90": 37,
          "p95": 44,
          "max": 62
        },
        "2": {
          "mean": 40.17,
          "stddev": 17.94,
          "median": 37,
          "p90": 64,
          "p95": 76,
          "max": 112
        },
        "3": {
          "mean": 63.38,
          "stddev": 33.9,
          "median": 55,
          "p90": 110,
          "p95": 139,
          "max": 197
        },
        "4": {
          "mean": 78.58,
          "stddev": 41.84,
          "median": 72,
          "p90": 139,
          "p95": 164,
          "max": 231
        },
        "5": {
          "mean": 98.3,
          "stddev": 48.19,
          "median": 92,
          "p90": 165,
          "p95": 178,
          "max": 494
        },
        "6": {
          "mean": 110.01,
          "stddev": 49.04,
          "median": 102,
          "p90": 173,
          "p95": 189,
          "max": 391
        },
        "7": {
          "mean": 113.21,
          "stddev": 46.7,
          "median": 107,
          "p90": 166,
          "p95": 186,
          "max": 406
        },
        "8": {
          "mean": 117.56,
          "stddev": 41.18,
          "median": 116,
          "p90": 169,
          "p95": 186,
          "max": 373
        },
        "9": {
          "mean": 121.4,
          "stddev": 43.83,
          "median": 114,
          "p90": 177,
          "p95": 200,
          "max": 384
        },
        "10": {
          "mean": 122.45,
          "stddev": 44.28,
          "median": 118,
          "p90": 169,
          "p95": 206,
          "max": 405
        },
        "11": {
          "mean": 125.62,
          "stddev": 47.45,
          "median": 118,
          "p90": 178,
          "p95": 198,
          "max": 494
        },
        "12": {
          "mean": 123.33,
          "stddev": 43.15,
          "median": 118,
          "p90": 173,
          "p95": 203,
          "max": 425
        }
      },
      "itemsBoughtByDay": {
        "1": {
          "mean": 1.79,
          "stddev": 0.41,
          "median": 2,
          "p90": 2,
          "p95": 2,
          "max": 2
        },
        "2": {
          "mean": 2.13,
          "stddev": 0.93,
          "median": 2,
          "p90": 3,
          "p95": 4,
          "max": 5
        },
        "3": {
          "mean": 2.4,
          "stddev": 1.12,
          "median": 2,
          "p90": 4,
          "p95": 5,
          "max": 6
        },
        "4": {
          "mean": 1.33,
          "stddev": 1.09,
          "median": 1,
          "p90": 3,
          "p95": 3,
          "max": 5
        },
        "5": {
          "mean": 1.62,
          "stddev": 1.06,
          "median": 2,
          "p90": 3,
          "p95": 3,
          "max": 4
        },
        "6": {
          "mean": 0.97,
          "stddev": 1.02,
          "median": 1,
          "p90": 2,
          "p95": 3,
          "max": 4
        },
        "7": {
          "mean": 0.3,
          "stddev": 0.58,
          "median": 0,
          "p90": 1,
          "p95": 2,
          "max": 3
        },
        "8": {
          "mean": 0.36,
          "stddev": 0.7,
          "median": 0,
          "p90": 2,
          "p95": 2,
          "max": 3
        },
        "9": {
          "mean": 0.16,
          "stddev": 0.46,
          "median": 0,
          "p90": 1,
          "p95": 1,
          "max": 2
        },
        "10": {
          "mean": 0.04,
          "stddev": 0.2,
          "median": 0,
          "p90": 0,
          "p95": 0,
          "max": 2
        },
        "11": {
          "mean": 0.07,
          "stddev": 0.3,
          "median": 0,
          "p90": 0,
          "p95": 1,
          "max": 3
        },
        "12": {
          "mean": 0.03,
          "stddev": 0.16,
          "median": 0,
          "p90": 0,
          "p95": 0,
          "max": 1
        }
      },
      "gameOverRate": 1,
      "diedAtRentCycle": {
        "mean": 8.76,
        "stddev": 1.32,
        "median": 9,
        "p90": 10,
        "p95": 10,
        "max": 11
      },
      "namedComboRunRate": 0.845,
      "orderFillRate": 0.417,
      "spotlightHitRate": 0.994,
      "synergyFireDayRate": 0.922,
      "synergyFireRate": 0.638,
      "synergyFiresPerScoredDay": 6.959,
      "goalTargetHitRate": 0.827,
      "goalTargetHitRateByDay": {
        "1": {
          "hits": 320,
          "survivingDays": 400,
          "rate": 0.8
        },
        "2": {
          "hits": 299,
          "survivingDays": 400,
          "rate": 0.748
        },
        "3": {
          "hits": 295,
          "survivingDays": 400,
          "rate": 0.738
        },
        "4": {
          "hits": 294,
          "survivingDays": 395,
          "rate": 0.744
        },
        "5": {
          "hits": 325,
          "survivingDays": 395,
          "rate": 0.823
        },
        "6": {
          "hits": 335,
          "survivingDays": 395,
          "rate": 0.848
        },
        "7": {
          "hits": 325,
          "survivingDays": 394,
          "rate": 0.825
        },
        "8": {
          "hits": 330,
          "survivingDays": 394,
          "rate": 0.838
        },
        "9": {
          "hits": 318,
          "survivingDays": 394,
          "rate": 0.807
        },
        "10": {
          "hits": 308,
          "survivingDays": 394,
          "rate": 0.782
        },
        "11": {
          "hits": 320,
          "survivingDays": 394,
          "rate": 0.812
        },
        "12": {
          "hits": 317,
          "survivingDays": 394,
          "rate": 0.805
        }
      },
      "goalTargetHitRateDays9To12": {
        "hits": 1263,
        "survivingDays": 1576,
        "rate": 0.801
      },
      "goalTargetByDay": {
        "1": {
          "mean": 18,
          "stddev": 0,
          "median": 18,
          "p90": 18,
          "p95": 18,
          "max": 18
        },
        "2": {
          "mean": 28,
          "stddev": 0,
          "median": 28,
          "p90": 28,
          "p95": 28,
          "max": 28
        },
        "3": {
          "mean": 40,
          "stddev": 0,
          "median": 40,
          "p90": 40,
          "p95": 40,
          "max": 40
        },
        "4": {
          "mean": 46,
          "stddev": 0,
          "median": 46,
          "p90": 46,
          "p95": 46,
          "max": 46
        },
        "5": {
          "mean": 56,
          "stddev": 0,
          "median": 56,
          "p90": 56,
          "p95": 56,
          "max": 56
        },
        "6": {
          "mean": 66,
          "stddev": 0,
          "median": 66,
          "p90": 66,
          "p95": 66,
          "max": 66
        },
        "7": {
          "mean": 74,
          "stddev": 0,
          "median": 74,
          "p90": 74,
          "p95": 74,
          "max": 74
        },
        "8": {
          "mean": 80,
          "stddev": 0,
          "median": 80,
          "p90": 80,
          "p95": 80,
          "max": 80
        },
        "9": {
          "mean": 86,
          "stddev": 0,
          "median": 86,
          "p90": 86,
          "p95": 86,
          "max": 86
        },
        "10": {
          "mean": 90,
          "stddev": 0,
          "median": 90,
          "p90": 90,
          "p95": 90,
          "max": 90
        },
        "11": {
          "mean": 90,
          "stddev": 0,
          "median": 90,
          "p90": 90,
          "p95": 90,
          "max": 90
        },
        "12": {
          "mean": 90,
          "stddev": 0,
          "median": 90,
          "p90": 90,
          "p95": 90,
          "max": 90
        }
      },
      "goalDayTotalByDay": {
        "1": {
          "mean": 25.54,
          "stddev": 8.69,
          "median": 25,
          "p90": 37,
          "p95": 44,
          "max": 62
        },
        "2": {
          "mean": 40.17,
          "stddev": 17.94,
          "median": 37,
          "p90": 64,
          "p95": 76,
          "max": 112
        },
        "3": {
          "mean": 63.38,
          "stddev": 33.9,
          "median": 55,
          "p90": 110,
          "p95": 139,
          "max": 197
        },
        "4": {
          "mean": 78.58,
          "stddev": 41.84,
          "median": 72,
          "p90": 139,
          "p95": 164,
          "max": 231
        },
        "5": {
          "mean": 98.3,
          "stddev": 48.19,
          "median": 92,
          "p90": 165,
          "p95": 178,
          "max": 494
        },
        "6": {
          "mean": 110.01,
          "stddev": 49.04,
          "median": 102,
          "p90": 173,
          "p95": 189,
          "max": 391
        },
        "7": {
          "mean": 113.21,
          "stddev": 46.7,
          "median": 107,
          "p90": 166,
          "p95": 186,
          "max": 406
        },
        "8": {
          "mean": 117.56,
          "stddev": 41.18,
          "median": 116,
          "p90": 169,
          "p95": 186,
          "max": 373
        },
        "9": {
          "mean": 121.4,
          "stddev": 43.83,
          "median": 114,
          "p90": 177,
          "p95": 200,
          "max": 384
        },
        "10": {
          "mean": 122.45,
          "stddev": 44.28,
          "median": 118,
          "p90": 169,
          "p95": 206,
          "max": 405
        },
        "11": {
          "mean": 125.62,
          "stddev": 47.45,
          "median": 118,
          "p90": 178,
          "p95": 198,
          "max": 494
        },
        "12": {
          "mean": 123.33,
          "stddev": 43.15,
          "median": 118,
          "p90": 173,
          "p95": 203,
          "max": 425
        }
      },
      "goalRewardsGranted": 8696,
      "freeRerollsSpent": 1086,
      "dominantEligibleTagCountDistribution": {
        "1": 283,
        "2": 540,
        "3": 784,
        "4": 1575,
        "5": 1960,
        "6": 2095,
        "7": 1889,
        "8": 1056,
        "9": 275,
        "10": 52
      },
      "dominantEligibleTagCountByDay": {
        "1": {
          "mean": 1.48,
          "stddev": 0.54,
          "median": 1,
          "p90": 2,
          "p95": 2,
          "max": 3
        },
        "2": {
          "mean": 2.44,
          "stddev": 0.89,
          "median": 2,
          "p90": 4,
          "p95": 4,
          "max": 5
        },
        "3": {
          "mean": 3.53,
          "stddev": 1.34,
          "median": 3,
          "p90": 5,
          "p95": 6,
          "max": 9
        },
        "4": {
          "mean": 4.22,
          "stddev": 1.72,
          "median": 4,
          "p90": 7,
          "p95": 7,
          "max": 10
        },
        "5": {
          "mean": 4.98,
          "stddev": 1.77,
          "median": 5,
          "p90": 7,
          "p95": 8,
          "max": 10
        },
        "6": {
          "mean": 5.43,
          "stddev": 1.69,
          "median": 5,
          "p90": 8,
          "p95": 8,
          "max": 10
        },
        "7": {
          "mean": 5.59,
          "stddev": 1.65,
          "median": 6,
          "p90": 8,
          "p95": 8,
          "max": 10
        },
        "8": {
          "mean": 5.75,
          "stddev": 1.56,
          "median": 6,
          "p90": 8,
          "p95": 8,
          "max": 10
        },
        "9": {
          "mean": 5.81,
          "stddev": 1.54,
          "median": 6,
          "p90": 8,
          "p95": 8,
          "max": 10
        },
        "10": {
          "mean": 5.82,
          "stddev": 1.54,
          "median": 6,
          "p90": 8,
          "p95": 8,
          "max": 10
        },
        "11": {
          "mean": 5.85,
          "stddev": 1.52,
          "median": 6,
          "p90": 8,
          "p95": 8,
          "max": 10
        },
        "12": {
          "mean": 5.86,
          "stddev": 1.51,
          "median": 6,
          "p90": 8,
          "p95": 8,
          "max": 10
        }
      },
      "finalDominantEligibleTagCount": {
        "mean": 5.82,
        "stddev": 1.55,
        "median": 6,
        "p90": 8,
        "p95": 8,
        "max": 10
      },
      "supplierTagDistribution": {
        "antique": 6,
        "drink": 20,
        "fancy": 31,
        "food": 155,
        "fragile": 23,
        "lucky": 49,
        "perishable": 27,
        "plant": 7,
        "sweet": 2,
        "utility": 80
      },
      "finalSupplierTagCount": {
        "mean": 5.04,
        "stddev": 2.3,
        "median": 5,
        "p90": 8,
        "p95": 8,
        "max": 10
      },
      "supplierTagCountByDay": {
        "1": {
          "mean": 1.14,
          "stddev": 0.76,
          "median": 1,
          "p90": 2,
          "p95": 2,
          "max": 3
        },
        "2": {
          "mean": 2,
          "stddev": 1.19,
          "median": 2,
          "p90": 3,
          "p95": 4,
          "max": 5
        },
        "3": {
          "mean": 2.98,
          "stddev": 1.73,
          "median": 3,
          "p90": 5,
          "p95": 6,
          "max": 9
        },
        "4": {
          "mean": 3.65,
          "stddev": 2.13,
          "median": 4,
          "p90": 7,
          "p95": 7,
          "max": 10
        },
        "5": {
          "mean": 4.3,
          "stddev": 2.31,
          "median": 4,
          "p90": 7,
          "p95": 8,
          "max": 10
        },
        "6": {
          "mean": 4.71,
          "stddev": 2.31,
          "median": 5,
          "p90": 8,
          "p95": 8,
          "max": 10
        },
        "7": {
          "mean": 4.86,
          "stddev": 2.31,
          "median": 5,
          "p90": 8,
          "p95": 8,
          "max": 10
        },
        "8": {
          "mean": 4.98,
          "stddev": 2.3,
          "median": 5,
          "p90": 8,
          "p95": 8,
          "max": 10
        },
        "9": {
          "mean": 5.05,
          "stddev": 2.27,
          "median": 5,
          "p90": 8,
          "p95": 8,
          "max": 10
        },
        "10": {
          "mean": 5.06,
          "stddev": 2.27,
          "median": 5,
          "p90": 8,
          "p95": 8,
          "max": 10
        },
        "11": {
          "mean": 5.09,
          "stddev": 2.27,
          "median": 5,
          "p90": 8,
          "p95": 8,
          "max": 10
        },
        "12": {
          "mean": 5.09,
          "stddev": 2.26,
          "median": 6,
          "p90": 8,
          "p95": 8,
          "max": 10
        }
      }
    }
  ],
  "elapsedMs": 104788
}
```

## 6. Degenerate-pool and mutation checks

Focused warm-opening restore run, including the degenerate-pool test:

```text
(node:89126) ExperimentalWarning: CommonJS module /Users/gentlegen/Desktop/lucky-shelf/node_modules/.pnpm/vitest@4.1.9_@types+node@26.1.0_vite@8.1.3_@types+node@26.1.0_esbuild@0.28.1_terser@5.48.0_tsx@4.23.0_yaml@2.9.0_/node_modules/vitest/dist/config.cjs is loading ES Module /Users/gentlegen/Desktop/lucky-shelf/node_modules/.pnpm/std-env@4.1.0/node_modules/std-env/dist/index.mjs using require().
Support for loading ES Module in require() is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)

 RUN  v4.1.9 /Users/gentlegen/Desktop/lucky-shelf


 Test Files  1 passed (1)
      Tests  6 passed (6)
   Start at  21:38:43
   Duration  1.35s (transform 441ms, setup 0ms, import 686ms, tests 100ms, environment 0ms)
```

Mutation check output:

```text
(node:88116) ExperimentalWarning: CommonJS module /Users/gentlegen/Desktop/lucky-shelf/node_modules/.pnpm/vitest@4.1.9_@types+node@26.1.0_vite@8.1.3_@types+node@26.1.0_esbuild@0.28.1_terser@5.48.0_tsx@4.23.0_yaml@2.9.0_/node_modules/vitest/dist/config.cjs is loading ES Module /Users/gentlegen/Desktop/lucky-shelf/node_modules/.pnpm/std-env@4.1.0/node_modules/std-env/dist/index.mjs using require().
Support for loading ES Module in require() is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)

 RUN  v4.1.9 /Users/gentlegen/Desktop/lucky-shelf

 ❯ src/sim/warmOpening.test.ts (6 tests | 1 failed | 5 skipped) 21ms
     × guarantees two cheap day-1 daily-shop offers without changing prices or offer-id shape 19ms

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  src/sim/warmOpening.test.ts > warm opening offer guarantee > guarantees two cheap day-1 daily-shop offers without changing prices or offer-id shape
AssertionError: expected 1 to be greater than or equal to 2
 ❯ src/sim/warmOpening.test.ts:80:39
     78|
     79|       expect(cheapOfferCount(normal)).toBeLessThan(2);
     80|       expect(cheapOfferCount(warmed)).toBeGreaterThanOrEqual(2);
       |                                       ^
     81|       for (const offer of warmed) {
     82|         expect(offer.cost).toBe(dailyShopCost(offer.item, 1));
 ❯ withEnv src/sim/warmOpening.test.ts:26:12
 ❯ src/sim/warmOpening.test.ts:75:5

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


 Test Files  1 failed (1)
      Tests  1 failed | 5 skipped (6)
   Start at  21:38:29
   Duration  1.27s (transform 453ms, setup 0ms, import 663ms, tests 21ms, environment 0ms)
```

## 7. Known issues + spec deviations

- Acceptance miss: `loopV2WarmOpening` and `allDepthWarmOpening` do not hit the requested floor first-rent survival target.
- Spec tension: day 2 has no unchanged-price `dailyShopCost <= 4` candidates in the current item table. The code degrades gracefully rather than changing prices/cost curves or item data.
- Greedy day-9 ceiling total is `0.943x` of same-seed warm-off baseline, just outside the ±5% band.
- The local worktree contains unrelated UI/catalog changes from outside this task. I did not revert them.

## 8. Questions for Fable

- Should day-2 warm opening use the cheapest unchanged-price day-2 items even though their costs are above 4, or should Fable add/retune item data to create real day-2 `<=4` candidates?
- If the floor target remains hard, which constraint should yield: day-2 `<=4`, no price changes, or no item-table changes?

## 9. Contract change request

None. This phase adds no contract/schema surface.

## 10. Stop point

STOP - `WARM_OPENING_ENABLED` remains default OFF. No graduation, no sign-off claimed; Fable reviews this packet.
