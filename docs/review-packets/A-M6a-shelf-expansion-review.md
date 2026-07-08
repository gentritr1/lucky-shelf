# A-M6a Review Packet - Shelf Expansion Coin Sink

## 1. Built vs. M6a criteria

- Added `SHELF_EXPANSION_ENABLED`, `SHELF_EXPANSION_ENV_VAR`, and `SHELF_EXPANSION_COST = 250` in `src/sim/economy.ts`. Default remains OFF; effective flag requires the run snapshot `loopV2 === true`.
- Added additive contract action `{ type: 'expandShelf' }` with no payload. No `ContractSchemaVersion` bump and no `ShelfSizeSchema` edit.
- Implemented legal/effect path: arrange/restock only, no held item, rows < 4, enough coins; subtracts cost, changes 3x4 to 4x4, appends row-major empty slots, no RNG.
- Exposed `expandShelf` in engine `legalActions` and `uiAffordances`. Flag OFF and v1 runs do not expose or accept it.
- Updated greedy/combo bots to expand from day 9 onward when the shelf is full and the bot keeps at least one rent bill in reserve; after expansion, paid offer buying keeps two rent bills in reserve.
- Added fuzz metrics: `expansionsPerRun`, `expansionRunRate`, `coinsBeforeScoringByDay`, `rentAmountByDay`, and `surplusRatioByDay`.
- Added degenerate-state tests: exact-cost expansion ends at 0, second expansion throws, held-item expansion throws, flag-off/v1 throws, OFF affordance/legal absence, expanded state JSON round-trip, and expanded buyout+reroll duplicate-id regression.
- Did not touch `GOAL_LADDER_TARGETS`, item data, rent/v1 constants, contract schema version, or any flag graduation.
- Restored a conflicting temporary local `TAG_SYNERGY_ENABLED = true` change back to `false` because the brief requires all v2 depth flags default OFF and the determinism OFF path depends on that.

## 2. Cost tuning evidence

Final value: `SHELF_EXPANSION_COST = 250`.

- Preliminary 150c pass failed the day-12 sink target: greedy day-12 surplus 5.843x, combo day-12 surplus 5.787x.
- 250c with day-9 expansion timing and two-rent post-expansion buy reserve meets the target in the final same-seed A/B below.

| strategy | expansionRunRate ON | day9 surplus OFF | day9 surplus ON | day12 surplus OFF | day12 surplus ON |
| --- | ---: | ---: | ---: | ---: | ---: |
| greedy | 0.85 | 6.431 | 2.49 | 6.955 | 2.809 |
| combo | 0.875 | 6.529 | 2.51 | 7.09 | 3.124 |

## 3. Exact commands run

```sh
PATH="$HOME/.nvm/versions/node/v23.3.0/bin:$PATH" node_modules/.bin/tsc --noEmit
PATH="$HOME/.nvm/versions/node/v23.3.0/bin:$PATH" node --import tsx scripts/validate-fixtures.ts
PATH="$HOME/.nvm/versions/node/v23.3.0/bin:$PATH" node_modules/.bin/vitest run
PATH="$HOME/.nvm/versions/node/v23.3.0/bin:$PATH" LOOP_V2_ENABLED=1 SIGNATURE_ITEMS_ENABLED=1 TAG_SYNERGY_ENABLED=1 BUILD_STEERING_ENABLED=1 GOAL_LADDER_ENABLED=1 SHELF_EXPANSION_ENABLED=1 node --import tsx scripts/fuzz.ts --runs 120 --strategy all --seed m6a-on
PATH="$HOME/.nvm/versions/node/v23.3.0/bin:$PATH" LOOP_V2_ENABLED=1 SIGNATURE_ITEMS_ENABLED=1 TAG_SYNERGY_ENABLED=1 BUILD_STEERING_ENABLED=1 GOAL_LADDER_ENABLED=1 node --import tsx scripts/fuzz.ts --runs 120 --strategy all --seed m6a-on
PATH="$HOME/.nvm/versions/node/v23.3.0/bin:$PATH" node --import tsx scripts/balance.ts --assert-bands
```

Additional required checks:

```sh
PATH="$HOME/.nvm/versions/node/v23.3.0/bin:$PATH" node --import tsx --input-type=module -e "const items = (await import('./src/items/index.ts')).default; const bots = (await import('./src/sim/bots.ts')).default; const hash = (await import('./src/sim/hash.ts')).default; const replay = (await import('./src/sim/replay.ts')).default; const deps = { table: items.loadItemTable(), combos: items.loadCombos() }; const bot = bots.playRun('determinism-fixture', 'random', deps, 60); const replayed = replay.runReplay({ seed: bot.seed, actions: bot.actions }, deps); console.log(hash.hashState(replayed));"
PATH="$HOME/.nvm/versions/node/v23.3.0/bin:$PATH" node_modules/.bin/vitest run src/sim/determinism.test.ts src/sim/goldens.test.ts --reporter verbose
PATH="$HOME/.nvm/versions/node/v23.3.0/bin:$PATH" LOOP_V2_ENABLED=1 SIGNATURE_ITEMS_ENABLED=1 TAG_SYNERGY_ENABLED=1 BUILD_STEERING_ENABLED=1 GOAL_LADDER_ENABLED=1 SHELF_EXPANSION_ENABLED=1 node --import tsx scripts/fuzz.ts --runs 400 --strategy all --seed m6a-goal-drift
# Mutation check temporarily neutered the expandShelf effect, then ran:
PATH="$HOME/.nvm/versions/node/v23.3.0/bin:$PATH" node_modules/.bin/vitest run src/sim/loopV2.test.ts --testNamePattern "expands a loop-v2 run from 3x4 to 4x4 exactly once at exact cost"
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
(node:34617) ExperimentalWarning: CommonJS module /Users/gentlegen/Desktop/lucky-shelf/node_modules/.pnpm/vitest@4.1.9_@types+node@26.1.0_vite@8.1.3_@types+node@26.1.0_esbuild@0.28.1_terser@5.48.0_tsx@4.23.0_yaml@2.9.0_/node_modules/vitest/dist/config.cjs is loading ES Module /Users/gentlegen/Desktop/lucky-shelf/node_modules/.pnpm/std-env@4.1.0/node_modules/std-env/dist/index.mjs using require().
Support for loading ES Module in require() is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)

 RUN  v4.1.9 /Users/gentlegen/Desktop/lucky-shelf


 Test Files  22 passed (22)
      Tests  132 passed (132)
   Start at  21:15:19
   Duration  20.47s (transform 4.68s, setup 0ms, import 16.32s, tests 40.93s, environment 5ms)
```

### determinism + M0 goldens verbose

Pinned hash print:

```text
8d48e1c5a6ad14c9
```

```text
(node:34657) ExperimentalWarning: CommonJS module /Users/gentlegen/Desktop/lucky-shelf/node_modules/.pnpm/vitest@4.1.9_@types+node@26.1.0_vite@8.1.3_@types+node@26.1.0_esbuild@0.28.1_terser@5.48.0_tsx@4.23.0_yaml@2.9.0_/node_modules/vitest/dist/config.cjs is loading ES Module /Users/gentlegen/Desktop/lucky-shelf/node_modules/.pnpm/std-env@4.1.0/node_modules/std-env/dist/index.mjs using require().
Support for loading ES Module in require() is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)

 RUN  v4.1.9 /Users/gentlegen/Desktop/lucky-shelf

 ✓ src/sim/goldens.test.ts > golden trace reproduction > reproduces m0-basic-wine-cheese 8ms
 ✓ src/sim/goldens.test.ts > golden trace reproduction > reproduces m0-wine-dine-combo 5ms
 ✓ src/sim/goldens.test.ts > golden trace reproduction > reproduces m0-mirror-copy 3ms
 ✓ src/sim/goldens.test.ts > golden trace reproduction > reproduces m0-shop-cat-row-aura 2ms
 ✓ src/sim/goldens.test.ts > golden trace reproduction > reproduces m0-scores-last-clock 1ms
 ✓ src/sim/goldens.test.ts > golden trace reproduction > reproduces m0-bamboo-transform 6ms
 ✓ src/sim/determinism.test.ts > determinism > fixed seed + fixed action list produces the pinned state hash 105ms
 ✓ src/sim/determinism.test.ts > determinism > 200 random-action replays hash identically when run twice 2206ms

 Test Files  2 passed (2)
      Tests  8 passed (8)
   Start at  21:15:19
   Duration  4.72s (transform 1.35s, setup 0ms, import 2.20s, tests 2.34s, environment 0ms)
```

### fuzz A/B - expansion ON

```json
{
  "generatedAt": "2026-07-08T19:12:18.600Z",
  "seedPrefix": "m6a-on",
  "loopV2Enabled": true,
  "goalLadderEnabled": true,
  "tagSynergyEnabled": true,
  "buildSteeringEnabled": true,
  "shelfExpansionEnabled": true,
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
        "mean": 2.3,
        "stddev": 4.1,
        "median": 0,
        "p90": 9,
        "p95": 14,
        "max": 19
      },
      "bestDayTotal": {
        "mean": 1.79,
        "stddev": 3.12,
        "median": 0,
        "p90": 6,
        "p95": 9,
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
          "mean": 1.79,
          "stddev": 3.12,
          "median": 0,
          "p90": 6,
          "p95": 9,
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
        "mean": 1.15,
        "stddev": 0.69,
        "median": 1,
        "p90": 2,
        "p95": 2,
        "max": 4
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
          "mean": 0.51,
          "stddev": 0.68,
          "median": 0,
          "p90": 1,
          "p95": 2,
          "max": 3
        },
        "2": {
          "mean": 0.19,
          "stddev": 0.43,
          "median": 0,
          "p90": 1,
          "p95": 1,
          "max": 2
        },
        "3": {
          "mean": 0.04,
          "stddev": 0.2,
          "median": 0,
          "p90": 0,
          "p95": 0,
          "max": 1
        }
      },
      "coinsBeforeScoringByDay": {
        "1": {
          "mean": 2.24,
          "stddev": 2.34,
          "median": 1,
          "p90": 7,
          "p95": 8,
          "max": 9
        },
        "2": {
          "mean": 1.9,
          "stddev": 2.08,
          "median": 1,
          "p90": 5,
          "p95": 7,
          "max": 10
        },
        "3": {
          "mean": 1.57,
          "stddev": 1.74,
          "median": 1,
          "p90": 4,
          "p95": 6,
          "max": 10
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
          "mean": 0.09,
          "stddev": 0.09,
          "median": 0.04,
          "p90": 0.28,
          "p95": 0.32,
          "max": 0.36
        },
        "2": {
          "mean": 0.08,
          "stddev": 0.08,
          "median": 0.04,
          "p90": 0.2,
          "p95": 0.28,
          "max": 0.4
        },
        "3": {
          "mean": 0.06,
          "stddev": 0.07,
          "median": 0.04,
          "p90": 0.16,
          "p95": 0.24,
          "max": 0.4
        }
      },
      "dayTotalByDay": {
        "1": {
          "mean": 1.65,
          "stddev": 3.02,
          "median": 0,
          "p90": 6,
          "p95": 9,
          "max": 18
        },
        "2": {
          "mean": 0.52,
          "stddev": 1.53,
          "median": 0,
          "p90": 2,
          "p95": 3,
          "max": 10
        },
        "3": {
          "mean": 0.13,
          "stddev": 0.71,
          "median": 0,
          "p90": 0,
          "p95": 0,
          "max": 6
        }
      },
      "itemsBoughtByDay": {
        "1": {
          "mean": 1.02,
          "stddev": 0.68,
          "median": 1,
          "p90": 2,
          "p95": 2,
          "max": 3
        },
        "2": {
          "mean": 0.12,
          "stddev": 0.35,
          "median": 0,
          "p90": 1,
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
      "spotlightHitRate": 0.025,
      "synergyFireDayRate": 0,
      "synergyFireRate": 0,
      "synergyFiresPerScoredDay": 0,
      "goalTargetHitRate": 0.003,
      "goalTargetHitRateByDay": {
        "1": {
          "hits": 1,
          "survivingDays": 120,
          "rate": 0.008
        },
        "2": {
          "hits": 0,
          "survivingDays": 120,
          "rate": 0
        },
        "3": {
          "hits": 0,
          "survivingDays": 120,
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
          "mean": 1.65,
          "stddev": 3.02,
          "median": 0,
          "p90": 6,
          "p95": 9,
          "max": 18
        },
        "2": {
          "mean": 0.52,
          "stddev": 1.53,
          "median": 0,
          "p90": 2,
          "p95": 3,
          "max": 10
        },
        "3": {
          "mean": 0.13,
          "stddev": 0.71,
          "median": 0,
          "p90": 0,
          "p95": 0,
          "max": 6
        }
      },
      "goalRewardsGranted": 1,
      "freeRerollsSpent": 1,
      "dominantEligibleTagCountDistribution": {
        "0": 292,
        "1": 66,
        "2": 2
      },
      "dominantEligibleTagCountByDay": {
        "1": {
          "mean": 0.38,
          "stddev": 0.52,
          "median": 0,
          "p90": 1,
          "p95": 1,
          "max": 2
        },
        "2": {
          "mean": 0.16,
          "stddev": 0.37,
          "median": 0,
          "p90": 1,
          "p95": 1,
          "max": 1
        },
        "3": {
          "mean": 0.04,
          "stddev": 0.2,
          "median": 0,
          "p90": 0,
          "p95": 0,
          "max": 1
        }
      },
      "finalDominantEligibleTagCount": {
        "mean": 0.04,
        "stddev": 0.2,
        "median": 0,
        "p90": 0,
        "p95": 0,
        "max": 1
      },
      "supplierTagDistribution": {
        "antique": 14,
        "drink": 11,
        "fancy": 11,
        "food": 14,
        "fragile": 14,
        "lucky": 16,
        "perishable": 10,
        "plant": 10,
        "sweet": 10,
        "utility": 10
      },
      "finalSupplierTagCount": {
        "mean": 0,
        "stddev": 0,
        "median": 0,
        "p90": 0,
        "p95": 0,
        "max": 0
      },
      "supplierTagCountByDay": {
        "1": {
          "mean": 0.13,
          "stddev": 0.36,
          "median": 0,
          "p90": 1,
          "p95": 1,
          "max": 2
        },
        "2": {
          "mean": 0.04,
          "stddev": 0.2,
          "median": 0,
          "p90": 0,
          "p95": 0,
          "max": 1
        },
        "3": {
          "mean": 0,
          "stddev": 0,
          "median": 0,
          "p90": 0,
          "p95": 0,
          "max": 0
        }
      }
    },
    {
      "strategy": "greedy",
      "runs": 120,
      "daysSurvived": {
        "mean": 26.75,
        "stddev": 5.99,
        "median": 30,
        "p90": 30,
        "p95": 33,
        "max": 33
      },
      "totalCoinsEarned": {
        "mean": 4261.73,
        "stddev": 2182.68,
        "median": 4651,
        "p90": 6451,
        "p95": 8661,
        "max": 10239
      },
      "bestDayTotal": {
        "mean": 237.46,
        "stddev": 120.22,
        "median": 233,
        "p90": 371,
        "p95": 412,
        "max": 862
      },
      "bestDayTotalBySignaturePickup": {
        "withSignature": {
          "mean": 327.89,
          "stddev": 131.29,
          "median": 334,
          "p90": 462,
          "p95": 584,
          "max": 862
        },
        "withoutSignature": {
          "mean": 197.14,
          "stddev": 89.1,
          "median": 205,
          "p90": 320,
          "p95": 360,
          "max": 389
        }
      },
      "deepestRentSurvived": {
        "mean": 7.92,
        "stddev": 2,
        "median": 9,
        "p90": 9,
        "p95": 10,
        "max": 10
      },
      "itemsBoughtPerRun": {
        "mean": 13.78,
        "stddev": 2.71,
        "median": 15,
        "p90": 16,
        "p95": 16,
        "max": 17
      },
      "expansionsPerRun": {
        "mean": 0.85,
        "stddev": 0.36,
        "median": 1,
        "p90": 1,
        "p95": 1,
        "max": 1
      },
      "expansionRunRate": 0.85,
      "signatureItemsBoughtPerRun": {
        "mean": 0.34,
        "stddev": 0.56,
        "median": 0,
        "p90": 1,
        "p95": 1,
        "max": 3
      },
      "signaturePickupRunRate": 0.308,
      "bestDayTotalBySignatureItem": {
        "brass-scale": {
          "mean": 256.9,
          "stddev": 70.15,
          "median": 268,
          "p90": 365,
          "p95": 365,
          "max": 365
        },
        "consignment-sign": {
          "mean": 422.67,
          "stddev": 76.03,
          "median": 390,
          "p90": 584,
          "p95": 584,
          "max": 584
        },
        "ledger-book": {
          "mean": 314.5,
          "stddev": 101.23,
          "median": 347,
          "p90": 424,
          "p95": 424,
          "max": 424
        },
        "lucky-cat": {
          "mean": 322.67,
          "stddev": 161.47,
          "median": 276,
          "p90": 412,
          "p95": 862,
          "max": 862
        },
        "window-display": {
          "mean": 411,
          "stddev": 320.29,
          "median": 222,
          "p90": 862,
          "p95": 862,
          "max": 862
        }
      },
      "signatureDominance": {
        "maxMedianItemId": "consignment-sign",
        "maxMedian": 390,
        "allSignatureMedian": 334,
        "maxToMedianRatio": 1.168
      },
      "boardOccupancyByDay": {
        "1": {
          "mean": 2.48,
          "stddev": 0.5,
          "median": 2,
          "p90": 3,
          "p95": 3,
          "max": 3
        },
        "2": {
          "mean": 4.47,
          "stddev": 1.12,
          "median": 4,
          "p90": 6,
          "p95": 6,
          "max": 8
        },
        "3": {
          "mean": 6.55,
          "stddev": 1.94,
          "median": 6,
          "p90": 9,
          "p95": 10,
          "max": 12
        },
        "4": {
          "mean": 7.93,
          "stddev": 2.53,
          "median": 7,
          "p90": 12,
          "p95": 12,
          "max": 12
        },
        "5": {
          "mean": 9.54,
          "stddev": 2.32,
          "median": 10,
          "p90": 12,
          "p95": 12,
          "max": 12
        },
        "6": {
          "mean": 10.71,
          "stddev": 1.82,
          "median": 12,
          "p90": 12,
          "p95": 12,
          "max": 12
        },
        "7": {
          "mean": 11.12,
          "stddev": 1.58,
          "median": 12,
          "p90": 12,
          "p95": 12,
          "max": 12
        },
        "8": {
          "mean": 11.55,
          "stddev": 1.22,
          "median": 12,
          "p90": 12,
          "p95": 12,
          "max": 12
        },
        "9": {
          "mean": 12.89,
          "stddev": 1.96,
          "median": 12,
          "p90": 16,
          "p95": 16,
          "max": 16
        },
        "10": {
          "mean": 13.15,
          "stddev": 2.01,
          "median": 12,
          "p90": 16,
          "p95": 16,
          "max": 16
        },
        "11": {
          "mean": 13.77,
          "stddev": 2.07,
          "median": 13,
          "p90": 16,
          "p95": 16,
          "max": 16
        },
        "12": {
          "mean": 14.3,
          "stddev": 1.91,
          "median": 16,
          "p90": 16,
          "p95": 16,
          "max": 16
        }
      },
      "coinsBeforeScoringByDay": {
        "1": {
          "mean": 0.68,
          "stddev": 1.01,
          "median": 0,
          "p90": 3,
          "p95": 3,
          "max": 4
        },
        "2": {
          "mean": 2.9,
          "stddev": 2.41,
          "median": 2,
          "p90": 7,
          "p95": 7,
          "max": 8
        },
        "3": {
          "mean": 6,
          "stddev": 5.13,
          "median": 6,
          "p90": 12,
          "p95": 12,
          "max": 37
        },
        "4": {
          "mean": 13.21,
          "stddev": 23.2,
          "median": 7,
          "p90": 21,
          "p95": 56,
          "max": 160
        },
        "5": {
          "mean": 43.71,
          "stddev": 70.92,
          "median": 15,
          "p90": 155,
          "p95": 225,
          "max": 364
        },
        "6": {
          "mean": 96.04,
          "stddev": 120.94,
          "median": 33,
          "p90": 279,
          "p95": 389,
          "max": 531
        },
        "7": {
          "mean": 151.43,
          "stddev": 160.59,
          "median": 105,
          "p90": 391,
          "p95": 536,
          "max": 657
        },
        "8": {
          "mean": 246.02,
          "stddev": 208.33,
          "median": 226,
          "p90": 531,
          "p95": 687,
          "max": 887
        },
        "9": {
          "mean": 158.84,
          "stddev": 117.42,
          "median": 127,
          "p90": 298,
          "p95": 417,
          "max": 597
        },
        "10": {
          "mean": 229.35,
          "stddev": 152.75,
          "median": 205,
          "p90": 467,
          "p95": 598,
          "max": 726
        },
        "11": {
          "mean": 294.25,
          "stddev": 213.34,
          "median": 221,
          "p90": 669,
          "p95": 802,
          "max": 931
        },
        "12": {
          "mean": 396.28,
          "stddev": 285.82,
          "median": 250,
          "p90": 873,
          "p95": 1004,
          "max": 1263
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
          "max": 0.16
        },
        "2": {
          "mean": 0.12,
          "stddev": 0.1,
          "median": 0.08,
          "p90": 0.28,
          "p95": 0.28,
          "max": 0.32
        },
        "3": {
          "mean": 0.24,
          "stddev": 0.21,
          "median": 0.24,
          "p90": 0.48,
          "p95": 0.48,
          "max": 1.48
        },
        "4": {
          "mean": 0.37,
          "stddev": 0.64,
          "median": 0.194,
          "p90": 0.583,
          "p95": 1.556,
          "max": 4.444
        },
        "5": {
          "mean": 1.21,
          "stddev": 1.97,
          "median": 0.417,
          "p90": 4.306,
          "p95": 6.25,
          "max": 10.111
        },
        "6": {
          "mean": 2.67,
          "stddev": 3.36,
          "median": 0.917,
          "p90": 7.75,
          "p95": 10.806,
          "max": 14.75
        },
        "7": {
          "mean": 2.97,
          "stddev": 3.15,
          "median": 2.059,
          "p90": 7.667,
          "p95": 10.51,
          "max": 12.882
        },
        "8": {
          "mean": 4.82,
          "stddev": 4.08,
          "median": 4.431,
          "p90": 10.412,
          "p95": 13.471,
          "max": 17.392
        },
        "9": {
          "mean": 3.11,
          "stddev": 2.3,
          "median": 2.49,
          "p90": 5.843,
          "p95": 8.176,
          "max": 11.706
        },
        "10": {
          "mean": 2.58,
          "stddev": 1.72,
          "median": 2.303,
          "p90": 5.247,
          "p95": 6.719,
          "max": 8.157
        },
        "11": {
          "mean": 3.31,
          "stddev": 2.4,
          "median": 2.483,
          "p90": 7.517,
          "p95": 9.011,
          "max": 10.461
        },
        "12": {
          "mean": 4.45,
          "stddev": 3.21,
          "median": 2.809,
          "p90": 9.809,
          "p95": 11.281,
          "max": 14.191
        }
      },
      "dayTotalByDay": {
        "1": {
          "mean": 23.31,
          "stddev": 7.57,
          "median": 21,
          "p90": 32,
          "p95": 36,
          "max": 50
        },
        "2": {
          "mean": 37.09,
          "stddev": 16.73,
          "median": 32,
          "p90": 64,
          "p95": 71,
          "max": 109
        },
        "3": {
          "mean": 57.3,
          "stddev": 29.81,
          "median": 52,
          "p90": 108,
          "p95": 133,
          "max": 156
        },
        "4": {
          "mean": 73.19,
          "stddev": 40.82,
          "median": 65,
          "p90": 135,
          "p95": 175,
          "max": 204
        },
        "5": {
          "mean": 91.75,
          "stddev": 42.13,
          "median": 87,
          "p90": 155,
          "p95": 174,
          "max": 190
        },
        "6": {
          "mean": 106.37,
          "stddev": 44.64,
          "median": 97,
          "p90": 168,
          "p95": 183,
          "max": 274
        },
        "7": {
          "mean": 112.83,
          "stddev": 45.43,
          "median": 110,
          "p90": 172,
          "p95": 194,
          "max": 230
        },
        "8": {
          "mean": 115.65,
          "stddev": 40.67,
          "median": 109,
          "p90": 167,
          "p95": 188,
          "max": 236
        },
        "9": {
          "mean": 139.1,
          "stddev": 60.83,
          "median": 129,
          "p90": 216,
          "p95": 234,
          "max": 396
        },
        "10": {
          "mean": 139.95,
          "stddev": 56.17,
          "median": 133,
          "p90": 212,
          "p95": 230,
          "max": 332
        },
        "11": {
          "mean": 154.49,
          "stddev": 66.96,
          "median": 151,
          "p90": 230,
          "p95": 277,
          "max": 420
        },
        "12": {
          "mean": 171.86,
          "stddev": 69.53,
          "median": 172,
          "p90": 250,
          "p95": 303,
          "max": 392
        }
      },
      "itemsBoughtByDay": {
        "1": {
          "mean": 1.48,
          "stddev": 0.5,
          "median": 1,
          "p90": 2,
          "p95": 2,
          "max": 2
        },
        "2": {
          "mean": 1.98,
          "stddev": 0.88,
          "median": 2,
          "p90": 3,
          "p95": 3,
          "max": 5
        },
        "3": {
          "mean": 2.17,
          "stddev": 1.05,
          "median": 2,
          "p90": 4,
          "p95": 4,
          "max": 5
        },
        "4": {
          "mean": 1.32,
          "stddev": 1.03,
          "median": 1,
          "p90": 3,
          "p95": 3,
          "max": 4
        },
        "5": {
          "mean": 1.63,
          "stddev": 1.1,
          "median": 2,
          "p90": 3,
          "p95": 3,
          "max": 5
        },
        "6": {
          "mean": 1.23,
          "stddev": 1.1,
          "median": 1,
          "p90": 3,
          "p95": 3,
          "max": 4
        },
        "7": {
          "mean": 0.41,
          "stddev": 0.66,
          "median": 0,
          "p90": 1,
          "p95": 2,
          "max": 3
        },
        "8": {
          "mean": 0.43,
          "stddev": 0.7,
          "median": 0,
          "p90": 1,
          "p95": 2,
          "max": 3
        },
        "9": {
          "mean": 1.34,
          "stddev": 1.51,
          "median": 1,
          "p90": 4,
          "p95": 4,
          "max": 4
        },
        "10": {
          "mean": 0.26,
          "stddev": 0.49,
          "median": 0,
          "p90": 1,
          "p95": 1,
          "max": 2
        },
        "11": {
          "mean": 0.62,
          "stddev": 0.9,
          "median": 0,
          "p90": 2,
          "p95": 3,
          "max": 3
        },
        "12": {
          "mean": 0.53,
          "stddev": 0.9,
          "median": 0,
          "p90": 2,
          "p95": 3,
          "max": 3
        }
      },
      "gameOverRate": 1,
      "diedAtRentCycle": {
        "mean": 8.92,
        "stddev": 2,
        "median": 10,
        "p90": 10,
        "p95": 11,
        "max": 11
      },
      "namedComboRunRate": 0.9,
      "orderFillRate": 0.502,
      "spotlightHitRate": 0.99,
      "synergyFireDayRate": 0.914,
      "synergyFireRate": 0.685,
      "synergyFiresPerScoredDay": 8.813,
      "goalTargetHitRate": 0.865,
      "goalTargetHitRateByDay": {
        "1": {
          "hits": 91,
          "survivingDays": 120,
          "rate": 0.758
        },
        "2": {
          "hits": 79,
          "survivingDays": 120,
          "rate": 0.658
        },
        "3": {
          "hits": 83,
          "survivingDays": 120,
          "rate": 0.692
        },
        "4": {
          "hits": 83,
          "survivingDays": 115,
          "rate": 0.722
        },
        "5": {
          "hits": 88,
          "survivingDays": 115,
          "rate": 0.765
        },
        "6": {
          "hits": 96,
          "survivingDays": 115,
          "rate": 0.835
        },
        "7": {
          "hits": 87,
          "survivingDays": 115,
          "rate": 0.757
        },
        "8": {
          "hits": 95,
          "survivingDays": 115,
          "rate": 0.826
        },
        "9": {
          "hits": 89,
          "survivingDays": 115,
          "rate": 0.774
        },
        "10": {
          "hits": 90,
          "survivingDays": 115,
          "rate": 0.783
        },
        "11": {
          "hits": 95,
          "survivingDays": 115,
          "rate": 0.826
        },
        "12": {
          "hits": 97,
          "survivingDays": 115,
          "rate": 0.843
        }
      },
      "goalTargetHitRateDays9To12": {
        "hits": 371,
        "survivingDays": 460,
        "rate": 0.807
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
          "mean": 23.31,
          "stddev": 7.57,
          "median": 21,
          "p90": 32,
          "p95": 36,
          "max": 50
        },
        "2": {
          "mean": 37.09,
          "stddev": 16.73,
          "median": 32,
          "p90": 64,
          "p95": 71,
          "max": 109
        },
        "3": {
          "mean": 57.3,
          "stddev": 29.81,
          "median": 52,
          "p90": 108,
          "p95": 133,
          "max": 156
        },
        "4": {
          "mean": 73.19,
          "stddev": 40.82,
          "median": 65,
          "p90": 135,
          "p95": 175,
          "max": 204
        },
        "5": {
          "mean": 91.75,
          "stddev": 42.13,
          "median": 87,
          "p90": 155,
          "p95": 174,
          "max": 190
        },
        "6": {
          "mean": 106.37,
          "stddev": 44.64,
          "median": 97,
          "p90": 168,
          "p95": 183,
          "max": 274
        },
        "7": {
          "mean": 112.83,
          "stddev": 45.43,
          "median": 110,
          "p90": 172,
          "p95": 194,
          "max": 230
        },
        "8": {
          "mean": 115.65,
          "stddev": 40.67,
          "median": 109,
          "p90": 167,
          "p95": 188,
          "max": 236
        },
        "9": {
          "mean": 139.1,
          "stddev": 60.83,
          "median": 129,
          "p90": 216,
          "p95": 234,
          "max": 396
        },
        "10": {
          "mean": 139.95,
          "stddev": 56.17,
          "median": 133,
          "p90": 212,
          "p95": 230,
          "max": 332
        },
        "11": {
          "mean": 154.49,
          "stddev": 66.96,
          "median": 151,
          "p90": 230,
          "p95": 277,
          "max": 420
        },
        "12": {
          "mean": 171.86,
          "stddev": 69.53,
          "median": 172,
          "p90": 250,
          "p95": 303,
          "max": 392
        }
      },
      "goalRewardsGranted": 2777,
      "freeRerollsSpent": 714,
      "dominantEligibleTagCountDistribution": {
        "1": 93,
        "2": 182,
        "3": 194,
        "4": 333,
        "5": 466,
        "6": 609,
        "7": 537,
        "8": 255,
        "9": 239,
        "10": 181,
        "11": 7,
        "12": 114
      },
      "dominantEligibleTagCountByDay": {
        "1": {
          "mean": 1.44,
          "stddev": 0.51,
          "median": 1,
          "p90": 2,
          "p95": 2,
          "max": 3
        },
        "2": {
          "mean": 2.36,
          "stddev": 0.9,
          "median": 2,
          "p90": 4,
          "p95": 4,
          "max": 5
        },
        "3": {
          "mean": 3.31,
          "stddev": 1.31,
          "median": 3,
          "p90": 5,
          "p95": 6,
          "max": 7
        },
        "4": {
          "mean": 4.06,
          "stddev": 1.64,
          "median": 4,
          "p90": 6,
          "p95": 7,
          "max": 9
        },
        "5": {
          "mean": 4.83,
          "stddev": 1.83,
          "median": 4,
          "p90": 7,
          "p95": 8,
          "max": 10
        },
        "6": {
          "mean": 5.41,
          "stddev": 2.02,
          "median": 5,
          "p90": 8,
          "p95": 9,
          "max": 12
        },
        "7": {
          "mean": 5.57,
          "stddev": 1.99,
          "median": 5,
          "p90": 8,
          "p95": 9,
          "max": 12
        },
        "8": {
          "mean": 5.75,
          "stddev": 1.86,
          "median": 6,
          "p90": 8,
          "p95": 9,
          "max": 12
        },
        "9": {
          "mean": 6.18,
          "stddev": 2.08,
          "median": 6,
          "p90": 9,
          "p95": 10,
          "max": 12
        },
        "10": {
          "mean": 6.29,
          "stddev": 2.09,
          "median": 6,
          "p90": 9,
          "p95": 10,
          "max": 12
        },
        "11": {
          "mean": 6.4,
          "stddev": 2.13,
          "median": 6,
          "p90": 9,
          "p95": 10,
          "max": 12
        },
        "12": {
          "mean": 6.62,
          "stddev": 2.08,
          "median": 6,
          "p90": 10,
          "p95": 10,
          "max": 12
        }
      },
      "finalDominantEligibleTagCount": {
        "mean": 6.65,
        "stddev": 2.23,
        "median": 6,
        "p90": 10,
        "p95": 10,
        "max": 12
      },
      "supplierTagDistribution": {
        "antique": 3,
        "drink": 5,
        "fancy": 6,
        "food": 50,
        "fragile": 8,
        "lucky": 21,
        "perishable": 5,
        "plant": 3,
        "utility": 19
      },
      "finalSupplierTagCount": {
        "mean": 5.93,
        "stddev": 2.87,
        "median": 6,
        "p90": 10,
        "p95": 10,
        "max": 12
      },
      "supplierTagCountByDay": {
        "1": {
          "mean": 1.13,
          "stddev": 0.74,
          "median": 1,
          "p90": 2,
          "p95": 2,
          "max": 3
        },
        "2": {
          "mean": 1.9,
          "stddev": 1.19,
          "median": 2,
          "p90": 4,
          "p95": 4,
          "max": 5
        },
        "3": {
          "mean": 2.8,
          "stddev": 1.66,
          "median": 3,
          "p90": 5,
          "p95": 6,
          "max": 7
        },
        "4": {
          "mean": 3.48,
          "stddev": 2.04,
          "median": 3,
          "p90": 6,
          "p95": 7,
          "max": 9
        },
        "5": {
          "mean": 4.19,
          "stddev": 2.35,
          "median": 4,
          "p90": 7,
          "p95": 8,
          "max": 10
        },
        "6": {
          "mean": 4.72,
          "stddev": 2.58,
          "median": 5,
          "p90": 8,
          "p95": 9,
          "max": 12
        },
        "7": {
          "mean": 4.91,
          "stddev": 2.56,
          "median": 5,
          "p90": 8,
          "p95": 9,
          "max": 12
        },
        "8": {
          "mean": 5.08,
          "stddev": 2.48,
          "median": 5,
          "p90": 8,
          "p95": 9,
          "max": 12
        },
        "9": {
          "mean": 5.52,
          "stddev": 2.73,
          "median": 5,
          "p90": 9,
          "p95": 10,
          "max": 12
        },
        "10": {
          "mean": 5.59,
          "stddev": 2.78,
          "median": 5,
          "p90": 9,
          "p95": 10,
          "max": 12
        },
        "11": {
          "mean": 5.7,
          "stddev": 2.81,
          "median": 6,
          "p90": 9,
          "p95": 10,
          "max": 12
        },
        "12": {
          "mean": 5.91,
          "stddev": 2.79,
          "median": 6,
          "p90": 10,
          "p95": 10,
          "max": 12
        }
      }
    },
    {
      "strategy": "combo",
      "runs": 120,
      "daysSurvived": {
        "mean": 26.52,
        "stddev": 6.46,
        "median": 30,
        "p90": 33,
        "p95": 33,
        "max": 36
      },
      "totalCoinsEarned": {
        "mean": 4253.45,
        "stddev": 2400.09,
        "median": 4633,
        "p90": 7487,
        "p95": 8723,
        "max": 12619
      },
      "bestDayTotal": {
        "mean": 239.36,
        "stddev": 128.52,
        "median": 226,
        "p90": 416,
        "p95": 445,
        "max": 754
      },
      "bestDayTotalBySignaturePickup": {
        "withSignature": {
          "mean": 297.51,
          "stddev": 105.17,
          "median": 321,
          "p90": 435,
          "p95": 445,
          "max": 468
        },
        "withoutSignature": {
          "mean": 215.41,
          "stddev": 129.61,
          "median": 201,
          "p90": 381,
          "p95": 433,
          "max": 754
        }
      },
      "deepestRentSurvived": {
        "mean": 7.84,
        "stddev": 2.15,
        "median": 9,
        "p90": 10,
        "p95": 10,
        "max": 11
      },
      "itemsBoughtPerRun": {
        "mean": 13.61,
        "stddev": 2.96,
        "median": 15,
        "p90": 16,
        "p95": 16,
        "max": 18
      },
      "expansionsPerRun": {
        "mean": 0.88,
        "stddev": 0.33,
        "median": 1,
        "p90": 1,
        "p95": 1,
        "max": 1
      },
      "expansionRunRate": 0.875,
      "signatureItemsBoughtPerRun": {
        "mean": 0.35,
        "stddev": 0.6,
        "median": 0,
        "p90": 1,
        "p95": 2,
        "max": 3
      },
      "signaturePickupRunRate": 0.292,
      "bestDayTotalBySignatureItem": {
        "brass-scale": {
          "mean": 310.45,
          "stddev": 86.62,
          "median": 330,
          "p90": 390,
          "p95": 468,
          "max": 468
        },
        "consignment-sign": {
          "mean": 358,
          "stddev": 71.84,
          "median": 378,
          "p90": 440,
          "p95": 440,
          "max": 440
        },
        "ledger-book": {
          "mean": 190.4,
          "stddev": 79.98,
          "median": 202,
          "p90": 321,
          "p95": 321,
          "max": 321
        },
        "lucky-cat": {
          "mean": 300,
          "stddev": 108.63,
          "median": 319,
          "p90": 435,
          "p95": 445,
          "max": 445
        },
        "window-display": {
          "mean": 387,
          "stddev": 58,
          "median": 445,
          "p90": 445,
          "p95": 445,
          "max": 445
        }
      },
      "signatureDominance": {
        "maxMedianItemId": "window-display",
        "maxMedian": 445,
        "allSignatureMedian": 321,
        "maxToMedianRatio": 1.386
      },
      "boardOccupancyByDay": {
        "1": {
          "mean": 2.47,
          "stddev": 0.5,
          "median": 2,
          "p90": 3,
          "p95": 3,
          "max": 3
        },
        "2": {
          "mean": 4.38,
          "stddev": 0.97,
          "median": 4,
          "p90": 6,
          "p95": 6,
          "max": 7
        },
        "3": {
          "mean": 6.47,
          "stddev": 1.74,
          "median": 6,
          "p90": 9,
          "p95": 10,
          "max": 12
        },
        "4": {
          "mean": 7.78,
          "stddev": 2.29,
          "median": 8,
          "p90": 11,
          "p95": 12,
          "max": 12
        },
        "5": {
          "mean": 9.65,
          "stddev": 2.38,
          "median": 10,
          "p90": 12,
          "p95": 12,
          "max": 12
        },
        "6": {
          "mean": 10.76,
          "stddev": 1.95,
          "median": 12,
          "p90": 12,
          "p95": 12,
          "max": 12
        },
        "7": {
          "mean": 11.1,
          "stddev": 1.89,
          "median": 12,
          "p90": 12,
          "p95": 12,
          "max": 12
        },
        "8": {
          "mean": 11.44,
          "stddev": 1.57,
          "median": 12,
          "p90": 12,
          "p95": 12,
          "max": 12
        },
        "9": {
          "mean": 12.76,
          "stddev": 2.27,
          "median": 12,
          "p90": 16,
          "p95": 16,
          "max": 16
        },
        "10": {
          "mean": 13.13,
          "stddev": 2.11,
          "median": 12,
          "p90": 16,
          "p95": 16,
          "max": 16
        },
        "11": {
          "mean": 13.76,
          "stddev": 2.1,
          "median": 14,
          "p90": 16,
          "p95": 16,
          "max": 16
        },
        "12": {
          "mean": 14.37,
          "stddev": 2.02,
          "median": 16,
          "p90": 16,
          "p95": 16,
          "max": 16
        }
      },
      "coinsBeforeScoringByDay": {
        "1": {
          "mean": 0.83,
          "stddev": 1.14,
          "median": 0,
          "p90": 3,
          "p95": 3,
          "max": 5
        },
        "2": {
          "mean": 3.06,
          "stddev": 2.28,
          "median": 3,
          "p90": 6,
          "p95": 7,
          "max": 7
        },
        "3": {
          "mean": 5.04,
          "stddev": 3.98,
          "median": 4,
          "p90": 11,
          "p95": 12,
          "max": 14
        },
        "4": {
          "mean": 9.93,
          "stddev": 12.9,
          "median": 7,
          "p90": 17,
          "p95": 40,
          "max": 92
        },
        "5": {
          "mean": 32.22,
          "stddev": 50.76,
          "median": 14,
          "p90": 98,
          "p95": 163,
          "max": 295
        },
        "6": {
          "mean": 90.01,
          "stddev": 99.06,
          "median": 38,
          "p90": 240,
          "p95": 290,
          "max": 491
        },
        "7": {
          "mean": 145.45,
          "stddev": 138.16,
          "median": 110,
          "p90": 339,
          "p95": 398,
          "max": 665
        },
        "8": {
          "mean": 236.99,
          "stddev": 182.61,
          "median": 209,
          "p90": 490,
          "p95": 565,
          "max": 845
        },
        "9": {
          "mean": 154.71,
          "stddev": 100.11,
          "median": 128,
          "p90": 282,
          "p95": 296,
          "max": 605
        },
        "10": {
          "mean": 215.84,
          "stddev": 133.81,
          "median": 194,
          "p90": 388,
          "p95": 442,
          "max": 790
        },
        "11": {
          "mean": 289.9,
          "stddev": 198.61,
          "median": 220,
          "p90": 587,
          "p95": 655,
          "max": 1080
        },
        "12": {
          "mean": 388.47,
          "stddev": 274.94,
          "median": 278,
          "p90": 790,
          "p95": 955,
          "max": 1332
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
          "stddev": 0.05,
          "median": 0,
          "p90": 0.12,
          "p95": 0.12,
          "max": 0.2
        },
        "2": {
          "mean": 0.12,
          "stddev": 0.09,
          "median": 0.12,
          "p90": 0.24,
          "p95": 0.28,
          "max": 0.28
        },
        "3": {
          "mean": 0.2,
          "stddev": 0.16,
          "median": 0.16,
          "p90": 0.44,
          "p95": 0.48,
          "max": 0.56
        },
        "4": {
          "mean": 0.28,
          "stddev": 0.36,
          "median": 0.194,
          "p90": 0.472,
          "p95": 1.111,
          "max": 2.556
        },
        "5": {
          "mean": 0.9,
          "stddev": 1.41,
          "median": 0.389,
          "p90": 2.722,
          "p95": 4.528,
          "max": 8.194
        },
        "6": {
          "mean": 2.5,
          "stddev": 2.75,
          "median": 1.056,
          "p90": 6.667,
          "p95": 8.056,
          "max": 13.639
        },
        "7": {
          "mean": 2.85,
          "stddev": 2.71,
          "median": 2.157,
          "p90": 6.647,
          "p95": 7.804,
          "max": 13.039
        },
        "8": {
          "mean": 4.65,
          "stddev": 3.58,
          "median": 4.098,
          "p90": 9.608,
          "p95": 11.078,
          "max": 16.569
        },
        "9": {
          "mean": 3.03,
          "stddev": 1.96,
          "median": 2.51,
          "p90": 5.529,
          "p95": 5.804,
          "max": 11.863
        },
        "10": {
          "mean": 2.43,
          "stddev": 1.5,
          "median": 2.18,
          "p90": 4.36,
          "p95": 4.966,
          "max": 8.876
        },
        "11": {
          "mean": 3.26,
          "stddev": 2.23,
          "median": 2.472,
          "p90": 6.596,
          "p95": 7.36,
          "max": 12.135
        },
        "12": {
          "mean": 4.36,
          "stddev": 3.09,
          "median": 3.124,
          "p90": 8.876,
          "p95": 10.73,
          "max": 14.966
        }
      },
      "dayTotalByDay": {
        "1": {
          "mean": 23.11,
          "stddev": 7.07,
          "median": 23,
          "p90": 31,
          "p95": 36,
          "max": 44
        },
        "2": {
          "mean": 35.91,
          "stddev": 14.55,
          "median": 34,
          "p90": 57,
          "p95": 65,
          "max": 88
        },
        "3": {
          "mean": 55.15,
          "stddev": 25.24,
          "median": 52,
          "p90": 92,
          "p95": 108,
          "max": 154
        },
        "4": {
          "mean": 72.79,
          "stddev": 36.97,
          "median": 66,
          "p90": 121,
          "p95": 141,
          "max": 238
        },
        "5": {
          "mean": 93.39,
          "stddev": 44.18,
          "median": 86,
          "p90": 152,
          "p95": 167,
          "max": 295
        },
        "6": {
          "mean": 105.23,
          "stddev": 43.61,
          "median": 100,
          "p90": 167,
          "p95": 190,
          "max": 223
        },
        "7": {
          "mean": 105.95,
          "stddev": 40.6,
          "median": 104,
          "p90": 156,
          "p95": 176,
          "max": 234
        },
        "8": {
          "mean": 111.82,
          "stddev": 41.67,
          "median": 110,
          "p90": 162,
          "p95": 193,
          "max": 234
        },
        "9": {
          "mean": 136.16,
          "stddev": 62.57,
          "median": 127,
          "p90": 216,
          "p95": 276,
          "max": 348
        },
        "10": {
          "mean": 142.75,
          "stddev": 65.77,
          "median": 136,
          "p90": 215,
          "p95": 270,
          "max": 430
        },
        "11": {
          "mean": 160.16,
          "stddev": 74.88,
          "median": 154,
          "p90": 253,
          "p95": 296,
          "max": 456
        },
        "12": {
          "mean": 175.46,
          "stddev": 78.49,
          "median": 172,
          "p90": 276,
          "p95": 328,
          "max": 433
        }
      },
      "itemsBoughtByDay": {
        "1": {
          "mean": 1.47,
          "stddev": 0.5,
          "median": 1,
          "p90": 2,
          "p95": 2,
          "max": 2
        },
        "2": {
          "mean": 1.91,
          "stddev": 0.74,
          "median": 2,
          "p90": 3,
          "p95": 3,
          "max": 4
        },
        "3": {
          "mean": 2.19,
          "stddev": 1.03,
          "median": 2,
          "p90": 4,
          "p95": 4,
          "max": 6
        },
        "4": {
          "mean": 1.28,
          "stddev": 0.98,
          "median": 1,
          "p90": 2,
          "p95": 3,
          "max": 4
        },
        "5": {
          "mean": 1.92,
          "stddev": 1.02,
          "median": 2,
          "p90": 3,
          "p95": 4,
          "max": 4
        },
        "6": {
          "mean": 1.12,
          "stddev": 1.1,
          "median": 1,
          "p90": 3,
          "p95": 3,
          "max": 4
        },
        "7": {
          "mean": 0.38,
          "stddev": 0.62,
          "median": 0,
          "p90": 1,
          "p95": 2,
          "max": 3
        },
        "8": {
          "mean": 0.34,
          "stddev": 0.66,
          "median": 0,
          "p90": 1,
          "p95": 2,
          "max": 3
        },
        "9": {
          "mean": 1.34,
          "stddev": 1.57,
          "median": 1,
          "p90": 4,
          "p95": 4,
          "max": 4
        },
        "10": {
          "mean": 0.25,
          "stddev": 0.59,
          "median": 0,
          "p90": 1,
          "p95": 1,
          "max": 4
        },
        "11": {
          "mean": 0.67,
          "stddev": 0.97,
          "median": 0,
          "p90": 2,
          "p95": 3,
          "max": 3
        },
        "12": {
          "mean": 0.61,
          "stddev": 0.91,
          "median": 0,
          "p90": 2,
          "p95": 2,
          "max": 4
        }
      },
      "gameOverRate": 1,
      "diedAtRentCycle": {
        "mean": 8.84,
        "stddev": 2.15,
        "median": 10,
        "p90": 11,
        "p95": 11,
        "max": 12
      },
      "namedComboRunRate": 0.883,
      "orderFillRate": 0.484,
      "spotlightHitRate": 0.989,
      "synergyFireDayRate": 0.906,
      "synergyFireRate": 0.678,
      "synergyFiresPerScoredDay": 8.695,
      "goalTargetHitRate": 0.871,
      "goalTargetHitRateByDay": {
        "1": {
          "hits": 93,
          "survivingDays": 120,
          "rate": 0.775
        },
        "2": {
          "hits": 80,
          "survivingDays": 120,
          "rate": 0.667
        },
        "3": {
          "hits": 86,
          "survivingDays": 120,
          "rate": 0.717
        },
        "4": {
          "hits": 90,
          "survivingDays": 116,
          "rate": 0.776
        },
        "5": {
          "hits": 94,
          "survivingDays": 116,
          "rate": 0.81
        },
        "6": {
          "hits": 93,
          "survivingDays": 116,
          "rate": 0.802
        },
        "7": {
          "hits": 90,
          "survivingDays": 116,
          "rate": 0.776
        },
        "8": {
          "hits": 90,
          "survivingDays": 116,
          "rate": 0.776
        },
        "9": {
          "hits": 90,
          "survivingDays": 116,
          "rate": 0.776
        },
        "10": {
          "hits": 89,
          "survivingDays": 114,
          "rate": 0.781
        },
        "11": {
          "hits": 95,
          "survivingDays": 114,
          "rate": 0.833
        },
        "12": {
          "hits": 97,
          "survivingDays": 114,
          "rate": 0.851
        }
      },
      "goalTargetHitRateDays9To12": {
        "hits": 371,
        "survivingDays": 458,
        "rate": 0.81
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
          "mean": 23.11,
          "stddev": 7.07,
          "median": 23,
          "p90": 31,
          "p95": 36,
          "max": 44
        },
        "2": {
          "mean": 35.91,
          "stddev": 14.55,
          "median": 34,
          "p90": 57,
          "p95": 65,
          "max": 88
        },
        "3": {
          "mean": 55.15,
          "stddev": 25.24,
          "median": 52,
          "p90": 92,
          "p95": 108,
          "max": 154
        },
        "4": {
          "mean": 72.79,
          "stddev": 36.97,
          "median": 66,
          "p90": 121,
          "p95": 141,
          "max": 238
        },
        "5": {
          "mean": 93.39,
          "stddev": 44.18,
          "median": 86,
          "p90": 152,
          "p95": 167,
          "max": 295
        },
        "6": {
          "mean": 105.23,
          "stddev": 43.61,
          "median": 100,
          "p90": 167,
          "p95": 190,
          "max": 223
        },
        "7": {
          "mean": 105.95,
          "stddev": 40.6,
          "median": 104,
          "p90": 156,
          "p95": 176,
          "max": 234
        },
        "8": {
          "mean": 111.82,
          "stddev": 41.67,
          "median": 110,
          "p90": 162,
          "p95": 193,
          "max": 234
        },
        "9": {
          "mean": 136.16,
          "stddev": 62.57,
          "median": 127,
          "p90": 216,
          "p95": 276,
          "max": 348
        },
        "10": {
          "mean": 142.75,
          "stddev": 65.77,
          "median": 136,
          "p90": 215,
          "p95": 270,
          "max": 430
        },
        "11": {
          "mean": 160.16,
          "stddev": 74.88,
          "median": 154,
          "p90": 253,
          "p95": 296,
          "max": 456
        },
        "12": {
          "mean": 175.46,
          "stddev": 78.49,
          "median": 172,
          "p90": 276,
          "p95": 328,
          "max": 433
        }
      },
      "goalRewardsGranted": 2772,
      "freeRerollsSpent": 744,
      "dominantEligibleTagCountDistribution": {
        "1": 109,
        "2": 190,
        "3": 256,
        "4": 454,
        "5": 406,
        "6": 529,
        "7": 374,
        "8": 281,
        "9": 372,
        "10": 133,
        "11": 79
      },
      "dominantEligibleTagCountByDay": {
        "1": {
          "mean": 1.43,
          "stddev": 0.56,
          "median": 1,
          "p90": 2,
          "p95": 2,
          "max": 3
        },
        "2": {
          "mean": 2.27,
          "stddev": 0.87,
          "median": 2,
          "p90": 3,
          "p95": 4,
          "max": 6
        },
        "3": {
          "mean": 3.17,
          "stddev": 1.25,
          "median": 3,
          "p90": 5,
          "p95": 5,
          "max": 8
        },
        "4": {
          "mean": 3.9,
          "stddev": 1.68,
          "median": 4,
          "p90": 6,
          "p95": 8,
          "max": 8
        },
        "5": {
          "mean": 4.74,
          "stddev": 1.98,
          "median": 4,
          "p90": 8,
          "p95": 8,
          "max": 10
        },
        "6": {
          "mean": 5.2,
          "stddev": 1.99,
          "median": 5,
          "p90": 8,
          "p95": 9,
          "max": 10
        },
        "7": {
          "mean": 5.34,
          "stddev": 2.03,
          "median": 5,
          "p90": 8,
          "p95": 9,
          "max": 10
        },
        "8": {
          "mean": 5.48,
          "stddev": 1.95,
          "median": 5,
          "p90": 8,
          "p95": 9,
          "max": 10
        },
        "9": {
          "mean": 5.9,
          "stddev": 2.19,
          "median": 6,
          "p90": 9,
          "p95": 10,
          "max": 11
        },
        "10": {
          "mean": 6.08,
          "stddev": 2.13,
          "median": 6,
          "p90": 9,
          "p95": 10,
          "max": 11
        },
        "11": {
          "mean": 6.25,
          "stddev": 2.17,
          "median": 6,
          "p90": 9,
          "p95": 10,
          "max": 11
        },
        "12": {
          "mean": 6.4,
          "stddev": 2.16,
          "median": 6,
          "p90": 9,
          "p95": 10,
          "max": 11
        }
      },
      "finalDominantEligibleTagCount": {
        "mean": 6.33,
        "stddev": 2.3,
        "median": 6,
        "p90": 9,
        "p95": 10,
        "max": 11
      },
      "supplierTagDistribution": {
        "drink": 11,
        "fancy": 11,
        "food": 43,
        "fragile": 10,
        "lucky": 12,
        "perishable": 10,
        "plant": 4,
        "sweet": 1,
        "utility": 18
      },
      "finalSupplierTagCount": {
        "mean": 5.77,
        "stddev": 2.74,
        "median": 6,
        "p90": 9,
        "p95": 10,
        "max": 11
      },
      "supplierTagCountByDay": {
        "1": {
          "mean": 1.18,
          "stddev": 0.72,
          "median": 1,
          "p90": 2,
          "p95": 2,
          "max": 3
        },
        "2": {
          "mean": 1.98,
          "stddev": 1.09,
          "median": 2,
          "p90": 3,
          "p95": 4,
          "max": 6
        },
        "3": {
          "mean": 2.82,
          "stddev": 1.53,
          "median": 3,
          "p90": 5,
          "p95": 5,
          "max": 8
        },
        "4": {
          "mean": 3.46,
          "stddev": 2.01,
          "median": 3,
          "p90": 6,
          "p95": 8,
          "max": 8
        },
        "5": {
          "mean": 4.31,
          "stddev": 2.34,
          "median": 4,
          "p90": 8,
          "p95": 8,
          "max": 10
        },
        "6": {
          "mean": 4.72,
          "stddev": 2.4,
          "median": 5,
          "p90": 8,
          "p95": 9,
          "max": 10
        },
        "7": {
          "mean": 4.84,
          "stddev": 2.45,
          "median": 5,
          "p90": 8,
          "p95": 9,
          "max": 10
        },
        "8": {
          "mean": 4.97,
          "stddev": 2.42,
          "median": 5,
          "p90": 8,
          "p95": 9,
          "max": 10
        },
        "9": {
          "mean": 5.36,
          "stddev": 2.68,
          "median": 5,
          "p90": 9,
          "p95": 10,
          "max": 11
        },
        "10": {
          "mean": 5.54,
          "stddev": 2.66,
          "median": 5,
          "p90": 9,
          "p95": 10,
          "max": 11
        },
        "11": {
          "mean": 5.69,
          "stddev": 2.71,
          "median": 6,
          "p90": 9,
          "p95": 10,
          "max": 11
        },
        "12": {
          "mean": 5.82,
          "stddev": 2.69,
          "median": 6,
          "p90": 9,
          "p95": 10,
          "max": 11
        }
      }
    }
  ],
  "elapsedMs": 52839
}
```

### fuzz A/B - expansion OFF same seed

```json
{
  "generatedAt": "2026-07-08T19:12:18.600Z",
  "seedPrefix": "m6a-on",
  "loopV2Enabled": true,
  "goalLadderEnabled": true,
  "tagSynergyEnabled": true,
  "buildSteeringEnabled": true,
  "shelfExpansionEnabled": false,
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
        "mean": 2.3,
        "stddev": 4.1,
        "median": 0,
        "p90": 9,
        "p95": 14,
        "max": 19
      },
      "bestDayTotal": {
        "mean": 1.79,
        "stddev": 3.12,
        "median": 0,
        "p90": 6,
        "p95": 9,
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
          "mean": 1.79,
          "stddev": 3.12,
          "median": 0,
          "p90": 6,
          "p95": 9,
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
        "mean": 1.15,
        "stddev": 0.69,
        "median": 1,
        "p90": 2,
        "p95": 2,
        "max": 4
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
          "mean": 0.51,
          "stddev": 0.68,
          "median": 0,
          "p90": 1,
          "p95": 2,
          "max": 3
        },
        "2": {
          "mean": 0.19,
          "stddev": 0.43,
          "median": 0,
          "p90": 1,
          "p95": 1,
          "max": 2
        },
        "3": {
          "mean": 0.04,
          "stddev": 0.2,
          "median": 0,
          "p90": 0,
          "p95": 0,
          "max": 1
        }
      },
      "coinsBeforeScoringByDay": {
        "1": {
          "mean": 2.24,
          "stddev": 2.34,
          "median": 1,
          "p90": 7,
          "p95": 8,
          "max": 9
        },
        "2": {
          "mean": 1.9,
          "stddev": 2.08,
          "median": 1,
          "p90": 5,
          "p95": 7,
          "max": 10
        },
        "3": {
          "mean": 1.57,
          "stddev": 1.74,
          "median": 1,
          "p90": 4,
          "p95": 6,
          "max": 10
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
          "mean": 0.09,
          "stddev": 0.09,
          "median": 0.04,
          "p90": 0.28,
          "p95": 0.32,
          "max": 0.36
        },
        "2": {
          "mean": 0.08,
          "stddev": 0.08,
          "median": 0.04,
          "p90": 0.2,
          "p95": 0.28,
          "max": 0.4
        },
        "3": {
          "mean": 0.06,
          "stddev": 0.07,
          "median": 0.04,
          "p90": 0.16,
          "p95": 0.24,
          "max": 0.4
        }
      },
      "dayTotalByDay": {
        "1": {
          "mean": 1.65,
          "stddev": 3.02,
          "median": 0,
          "p90": 6,
          "p95": 9,
          "max": 18
        },
        "2": {
          "mean": 0.52,
          "stddev": 1.53,
          "median": 0,
          "p90": 2,
          "p95": 3,
          "max": 10
        },
        "3": {
          "mean": 0.13,
          "stddev": 0.71,
          "median": 0,
          "p90": 0,
          "p95": 0,
          "max": 6
        }
      },
      "itemsBoughtByDay": {
        "1": {
          "mean": 1.02,
          "stddev": 0.68,
          "median": 1,
          "p90": 2,
          "p95": 2,
          "max": 3
        },
        "2": {
          "mean": 0.12,
          "stddev": 0.35,
          "median": 0,
          "p90": 1,
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
      "spotlightHitRate": 0.025,
      "synergyFireDayRate": 0,
      "synergyFireRate": 0,
      "synergyFiresPerScoredDay": 0,
      "goalTargetHitRate": 0.003,
      "goalTargetHitRateByDay": {
        "1": {
          "hits": 1,
          "survivingDays": 120,
          "rate": 0.008
        },
        "2": {
          "hits": 0,
          "survivingDays": 120,
          "rate": 0
        },
        "3": {
          "hits": 0,
          "survivingDays": 120,
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
          "mean": 1.65,
          "stddev": 3.02,
          "median": 0,
          "p90": 6,
          "p95": 9,
          "max": 18
        },
        "2": {
          "mean": 0.52,
          "stddev": 1.53,
          "median": 0,
          "p90": 2,
          "p95": 3,
          "max": 10
        },
        "3": {
          "mean": 0.13,
          "stddev": 0.71,
          "median": 0,
          "p90": 0,
          "p95": 0,
          "max": 6
        }
      },
      "goalRewardsGranted": 1,
      "freeRerollsSpent": 1,
      "dominantEligibleTagCountDistribution": {
        "0": 292,
        "1": 66,
        "2": 2
      },
      "dominantEligibleTagCountByDay": {
        "1": {
          "mean": 0.38,
          "stddev": 0.52,
          "median": 0,
          "p90": 1,
          "p95": 1,
          "max": 2
        },
        "2": {
          "mean": 0.16,
          "stddev": 0.37,
          "median": 0,
          "p90": 1,
          "p95": 1,
          "max": 1
        },
        "3": {
          "mean": 0.04,
          "stddev": 0.2,
          "median": 0,
          "p90": 0,
          "p95": 0,
          "max": 1
        }
      },
      "finalDominantEligibleTagCount": {
        "mean": 0.04,
        "stddev": 0.2,
        "median": 0,
        "p90": 0,
        "p95": 0,
        "max": 1
      },
      "supplierTagDistribution": {
        "antique": 14,
        "drink": 11,
        "fancy": 11,
        "food": 14,
        "fragile": 14,
        "lucky": 16,
        "perishable": 10,
        "plant": 10,
        "sweet": 10,
        "utility": 10
      },
      "finalSupplierTagCount": {
        "mean": 0,
        "stddev": 0,
        "median": 0,
        "p90": 0,
        "p95": 0,
        "max": 0
      },
      "supplierTagCountByDay": {
        "1": {
          "mean": 0.13,
          "stddev": 0.36,
          "median": 0,
          "p90": 1,
          "p95": 1,
          "max": 2
        },
        "2": {
          "mean": 0.04,
          "stddev": 0.2,
          "median": 0,
          "p90": 0,
          "p95": 0,
          "max": 1
        },
        "3": {
          "mean": 0,
          "stddev": 0,
          "median": 0,
          "p90": 0,
          "p95": 0,
          "max": 0
        }
      }
    },
    {
      "strategy": "greedy",
      "runs": 120,
      "daysSurvived": {
        "mean": 25.5,
        "stddev": 5.44,
        "median": 27,
        "p90": 30,
        "p95": 30,
        "max": 33
      },
      "totalCoinsEarned": {
        "mean": 2868.52,
        "stddev": 1319.44,
        "median": 2772,
        "p90": 4722,
        "p95": 5095,
        "max": 7000
      },
      "bestDayTotal": {
        "mean": 152.83,
        "stddev": 59.92,
        "median": 146,
        "p90": 228,
        "p95": 249,
        "max": 368
      },
      "bestDayTotalBySignaturePickup": {
        "withSignature": {
          "mean": 200.25,
          "stddev": 66.39,
          "median": 167,
          "p90": 296,
          "p95": 340,
          "max": 340
        },
        "withoutSignature": {
          "mean": 147.56,
          "stddev": 56.76,
          "median": 142,
          "p90": 216,
          "p95": 228,
          "max": 368
        }
      },
      "deepestRentSurvived": {
        "mean": 7.5,
        "stddev": 1.81,
        "median": 8,
        "p90": 9,
        "p95": 9,
        "max": 10
      },
      "itemsBoughtPerRun": {
        "mean": 10.89,
        "stddev": 1.6,
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
        "mean": 0.12,
        "stddev": 0.39,
        "median": 0,
        "p90": 1,
        "p95": 1,
        "max": 3
      },
      "signaturePickupRunRate": 0.1,
      "bestDayTotalBySignatureItem": {
        "brass-scale": {
          "mean": 159.25,
          "stddev": 42.13,
          "median": 152,
          "p90": 230,
          "p95": 230,
          "max": 230
        },
        "consignment-sign": {
          "mean": 318,
          "stddev": 22,
          "median": 340,
          "p90": 340,
          "p95": 340,
          "max": 340
        },
        "ledger-book": {
          "mean": 149,
          "stddev": 0,
          "median": 149,
          "p90": 149,
          "p95": 149,
          "max": 149
        },
        "lucky-cat": {
          "mean": 188.33,
          "stddev": 39.84,
          "median": 167,
          "p90": 248,
          "p95": 248,
          "max": 248
        },
        "window-display": {
          "mean": 149,
          "stddev": 0,
          "median": 149,
          "p90": 149,
          "p95": 149,
          "max": 149
        }
      },
      "signatureDominance": {
        "maxMedianItemId": "consignment-sign",
        "maxMedian": 340,
        "allSignatureMedian": 167,
        "maxToMedianRatio": 2.036
      },
      "boardOccupancyByDay": {
        "1": {
          "mean": 2.48,
          "stddev": 0.5,
          "median": 2,
          "p90": 3,
          "p95": 3,
          "max": 3
        },
        "2": {
          "mean": 4.47,
          "stddev": 1.12,
          "median": 4,
          "p90": 6,
          "p95": 6,
          "max": 8
        },
        "3": {
          "mean": 6.55,
          "stddev": 1.94,
          "median": 6,
          "p90": 9,
          "p95": 10,
          "max": 12
        },
        "4": {
          "mean": 7.93,
          "stddev": 2.53,
          "median": 7,
          "p90": 12,
          "p95": 12,
          "max": 12
        },
        "5": {
          "mean": 9.54,
          "stddev": 2.32,
          "median": 10,
          "p90": 12,
          "p95": 12,
          "max": 12
        },
        "6": {
          "mean": 10.71,
          "stddev": 1.82,
          "median": 12,
          "p90": 12,
          "p95": 12,
          "max": 12
        },
        "7": {
          "mean": 11.12,
          "stddev": 1.58,
          "median": 12,
          "p90": 12,
          "p95": 12,
          "max": 12
        },
        "8": {
          "mean": 11.55,
          "stddev": 1.22,
          "median": 12,
          "p90": 12,
          "p95": 12,
          "max": 12
        },
        "9": {
          "mean": 11.75,
          "stddev": 0.89,
          "median": 12,
          "p90": 12,
          "p95": 12,
          "max": 12
        },
        "10": {
          "mean": 11.81,
          "stddev": 0.77,
          "median": 12,
          "p90": 12,
          "p95": 12,
          "max": 12
        },
        "11": {
          "mean": 11.89,
          "stddev": 0.54,
          "median": 12,
          "p90": 12,
          "p95": 12,
          "max": 12
        },
        "12": {
          "mean": 11.95,
          "stddev": 0.29,
          "median": 12,
          "p90": 12,
          "p95": 12,
          "max": 12
        }
      },
      "coinsBeforeScoringByDay": {
        "1": {
          "mean": 0.68,
          "stddev": 1.01,
          "median": 0,
          "p90": 3,
          "p95": 3,
          "max": 4
        },
        "2": {
          "mean": 2.9,
          "stddev": 2.41,
          "median": 2,
          "p90": 7,
          "p95": 7,
          "max": 8
        },
        "3": {
          "mean": 6,
          "stddev": 5.13,
          "median": 6,
          "p90": 12,
          "p95": 12,
          "max": 37
        },
        "4": {
          "mean": 13.21,
          "stddev": 23.2,
          "median": 7,
          "p90": 21,
          "p95": 56,
          "max": 160
        },
        "5": {
          "mean": 43.71,
          "stddev": 70.92,
          "median": 15,
          "p90": 155,
          "p95": 225,
          "max": 364
        },
        "6": {
          "mean": 96.04,
          "stddev": 120.94,
          "median": 33,
          "p90": 279,
          "p95": 389,
          "max": 531
        },
        "7": {
          "mean": 151.43,
          "stddev": 160.59,
          "median": 105,
          "p90": 391,
          "p95": 536,
          "max": 657
        },
        "8": {
          "mean": 246.02,
          "stddev": 208.33,
          "median": 226,
          "p90": 531,
          "p95": 687,
          "max": 887
        },
        "9": {
          "mean": 352.26,
          "stddev": 245.94,
          "median": 328,
          "p90": 694,
          "p95": 856,
          "max": 1039
        },
        "10": {
          "mean": 417.69,
          "stddev": 278.26,
          "median": 381,
          "p90": 867,
          "p95": 963,
          "max": 1138
        },
        "11": {
          "mean": 536.03,
          "stddev": 315.27,
          "median": 500,
          "p90": 1028,
          "p95": 1145,
          "max": 1308
        },
        "12": {
          "mean": 651.44,
          "stddev": 348.56,
          "median": 619,
          "p90": 1189,
          "p95": 1313,
          "max": 1472
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
          "max": 0.16
        },
        "2": {
          "mean": 0.12,
          "stddev": 0.1,
          "median": 0.08,
          "p90": 0.28,
          "p95": 0.28,
          "max": 0.32
        },
        "3": {
          "mean": 0.24,
          "stddev": 0.21,
          "median": 0.24,
          "p90": 0.48,
          "p95": 0.48,
          "max": 1.48
        },
        "4": {
          "mean": 0.37,
          "stddev": 0.64,
          "median": 0.194,
          "p90": 0.583,
          "p95": 1.556,
          "max": 4.444
        },
        "5": {
          "mean": 1.21,
          "stddev": 1.97,
          "median": 0.417,
          "p90": 4.306,
          "p95": 6.25,
          "max": 10.111
        },
        "6": {
          "mean": 2.67,
          "stddev": 3.36,
          "median": 0.917,
          "p90": 7.75,
          "p95": 10.806,
          "max": 14.75
        },
        "7": {
          "mean": 2.97,
          "stddev": 3.15,
          "median": 2.059,
          "p90": 7.667,
          "p95": 10.51,
          "max": 12.882
        },
        "8": {
          "mean": 4.82,
          "stddev": 4.08,
          "median": 4.431,
          "p90": 10.412,
          "p95": 13.471,
          "max": 17.392
        },
        "9": {
          "mean": 6.91,
          "stddev": 4.82,
          "median": 6.431,
          "p90": 13.608,
          "p95": 16.784,
          "max": 20.373
        },
        "10": {
          "mean": 4.69,
          "stddev": 3.13,
          "median": 4.281,
          "p90": 9.742,
          "p95": 10.82,
          "max": 12.787
        },
        "11": {
          "mean": 6.02,
          "stddev": 3.54,
          "median": 5.618,
          "p90": 11.551,
          "p95": 12.865,
          "max": 14.697
        },
        "12": {
          "mean": 7.32,
          "stddev": 3.92,
          "median": 6.955,
          "p90": 13.36,
          "p95": 14.753,
          "max": 16.539
        }
      },
      "dayTotalByDay": {
        "1": {
          "mean": 23.31,
          "stddev": 7.57,
          "median": 21,
          "p90": 32,
          "p95": 36,
          "max": 50
        },
        "2": {
          "mean": 37.09,
          "stddev": 16.73,
          "median": 32,
          "p90": 64,
          "p95": 71,
          "max": 109
        },
        "3": {
          "mean": 57.3,
          "stddev": 29.81,
          "median": 52,
          "p90": 108,
          "p95": 133,
          "max": 156
        },
        "4": {
          "mean": 73.19,
          "stddev": 40.82,
          "median": 65,
          "p90": 135,
          "p95": 175,
          "max": 204
        },
        "5": {
          "mean": 91.75,
          "stddev": 42.13,
          "median": 87,
          "p90": 155,
          "p95": 174,
          "max": 190
        },
        "6": {
          "mean": 106.37,
          "stddev": 44.64,
          "median": 97,
          "p90": 168,
          "p95": 183,
          "max": 274
        },
        "7": {
          "mean": 112.83,
          "stddev": 45.43,
          "median": 110,
          "p90": 172,
          "p95": 194,
          "max": 230
        },
        "8": {
          "mean": 115.65,
          "stddev": 40.67,
          "median": 109,
          "p90": 167,
          "p95": 188,
          "max": 236
        },
        "9": {
          "mean": 119.58,
          "stddev": 42.15,
          "median": 118,
          "p90": 171,
          "p95": 194,
          "max": 274
        },
        "10": {
          "mean": 122.91,
          "stddev": 41.34,
          "median": 116,
          "p90": 181,
          "p95": 198,
          "max": 240
        },
        "11": {
          "mean": 119.22,
          "stddev": 38.07,
          "median": 113,
          "p90": 167,
          "p95": 182,
          "max": 236
        },
        "12": {
          "mean": 124.91,
          "stddev": 45.89,
          "median": 114,
          "p90": 187,
          "p95": 197,
          "max": 368
        }
      },
      "itemsBoughtByDay": {
        "1": {
          "mean": 1.48,
          "stddev": 0.5,
          "median": 1,
          "p90": 2,
          "p95": 2,
          "max": 2
        },
        "2": {
          "mean": 1.98,
          "stddev": 0.88,
          "median": 2,
          "p90": 3,
          "p95": 3,
          "max": 5
        },
        "3": {
          "mean": 2.17,
          "stddev": 1.05,
          "median": 2,
          "p90": 4,
          "p95": 4,
          "max": 5
        },
        "4": {
          "mean": 1.32,
          "stddev": 1.03,
          "median": 1,
          "p90": 3,
          "p95": 3,
          "max": 4
        },
        "5": {
          "mean": 1.63,
          "stddev": 1.1,
          "median": 2,
          "p90": 3,
          "p95": 3,
          "max": 5
        },
        "6": {
          "mean": 1.23,
          "stddev": 1.1,
          "median": 1,
          "p90": 3,
          "p95": 3,
          "max": 4
        },
        "7": {
          "mean": 0.41,
          "stddev": 0.66,
          "median": 0,
          "p90": 1,
          "p95": 2,
          "max": 3
        },
        "8": {
          "mean": 0.43,
          "stddev": 0.7,
          "median": 0,
          "p90": 1,
          "p95": 2,
          "max": 3
        },
        "9": {
          "mean": 0.2,
          "stddev": 0.51,
          "median": 0,
          "p90": 1,
          "p95": 2,
          "max": 2
        },
        "10": {
          "mean": 0.06,
          "stddev": 0.24,
          "median": 0,
          "p90": 0,
          "p95": 1,
          "max": 1
        },
        "11": {
          "mean": 0.08,
          "stddev": 0.3,
          "median": 0,
          "p90": 0,
          "p95": 1,
          "max": 2
        },
        "12": {
          "mean": 0.06,
          "stddev": 0.3,
          "median": 0,
          "p90": 0,
          "p95": 0,
          "max": 2
        }
      },
      "gameOverRate": 1,
      "diedAtRentCycle": {
        "mean": 8.5,
        "stddev": 1.81,
        "median": 9,
        "p90": 10,
        "p95": 10,
        "max": 11
      },
      "namedComboRunRate": 0.842,
      "orderFillRate": 0.424,
      "spotlightHitRate": 0.993,
      "synergyFireDayRate": 0.91,
      "synergyFireRate": 0.644,
      "synergyFiresPerScoredDay": 6.918,
      "goalTargetHitRate": 0.788,
      "goalTargetHitRateByDay": {
        "1": {
          "hits": 91,
          "survivingDays": 120,
          "rate": 0.758
        },
        "2": {
          "hits": 79,
          "survivingDays": 120,
          "rate": 0.658
        },
        "3": {
          "hits": 83,
          "survivingDays": 120,
          "rate": 0.692
        },
        "4": {
          "hits": 83,
          "survivingDays": 115,
          "rate": 0.722
        },
        "5": {
          "hits": 88,
          "survivingDays": 115,
          "rate": 0.765
        },
        "6": {
          "hits": 96,
          "survivingDays": 115,
          "rate": 0.835
        },
        "7": {
          "hits": 87,
          "survivingDays": 115,
          "rate": 0.757
        },
        "8": {
          "hits": 95,
          "survivingDays": 115,
          "rate": 0.826
        },
        "9": {
          "hits": 84,
          "survivingDays": 115,
          "rate": 0.73
        },
        "10": {
          "hits": 89,
          "survivingDays": 115,
          "rate": 0.774
        },
        "11": {
          "hits": 88,
          "survivingDays": 115,
          "rate": 0.765
        },
        "12": {
          "hits": 88,
          "survivingDays": 115,
          "rate": 0.765
        }
      },
      "goalTargetHitRateDays9To12": {
        "hits": 349,
        "survivingDays": 460,
        "rate": 0.759
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
          "mean": 23.31,
          "stddev": 7.57,
          "median": 21,
          "p90": 32,
          "p95": 36,
          "max": 50
        },
        "2": {
          "mean": 37.09,
          "stddev": 16.73,
          "median": 32,
          "p90": 64,
          "p95": 71,
          "max": 109
        },
        "3": {
          "mean": 57.3,
          "stddev": 29.81,
          "median": 52,
          "p90": 108,
          "p95": 133,
          "max": 156
        },
        "4": {
          "mean": 73.19,
          "stddev": 40.82,
          "median": 65,
          "p90": 135,
          "p95": 175,
          "max": 204
        },
        "5": {
          "mean": 91.75,
          "stddev": 42.13,
          "median": 87,
          "p90": 155,
          "p95": 174,
          "max": 190
        },
        "6": {
          "mean": 106.37,
          "stddev": 44.64,
          "median": 97,
          "p90": 168,
          "p95": 183,
          "max": 274
        },
        "7": {
          "mean": 112.83,
          "stddev": 45.43,
          "median": 110,
          "p90": 172,
          "p95": 194,
          "max": 230
        },
        "8": {
          "mean": 115.65,
          "stddev": 40.67,
          "median": 109,
          "p90": 167,
          "p95": 188,
          "max": 236
        },
        "9": {
          "mean": 119.58,
          "stddev": 42.15,
          "median": 118,
          "p90": 171,
          "p95": 194,
          "max": 274
        },
        "10": {
          "mean": 122.91,
          "stddev": 41.34,
          "median": 116,
          "p90": 181,
          "p95": 198,
          "max": 240
        },
        "11": {
          "mean": 119.22,
          "stddev": 38.07,
          "median": 113,
          "p90": 167,
          "p95": 182,
          "max": 236
        },
        "12": {
          "mean": 124.91,
          "stddev": 45.89,
          "median": 114,
          "p90": 187,
          "p95": 197,
          "max": 368
        }
      },
      "goalRewardsGranted": 2410,
      "freeRerollsSpent": 331,
      "dominantEligibleTagCountDistribution": {
        "1": 93,
        "2": 182,
        "3": 194,
        "4": 512,
        "5": 626,
        "6": 558,
        "7": 457,
        "8": 236,
        "9": 101,
        "10": 26,
        "11": 50,
        "12": 25
      },
      "dominantEligibleTagCountByDay": {
        "1": {
          "mean": 1.44,
          "stddev": 0.51,
          "median": 1,
          "p90": 2,
          "p95": 2,
          "max": 3
        },
        "2": {
          "mean": 2.36,
          "stddev": 0.9,
          "median": 2,
          "p90": 4,
          "p95": 4,
          "max": 5
        },
        "3": {
          "mean": 3.31,
          "stddev": 1.31,
          "median": 3,
          "p90": 5,
          "p95": 6,
          "max": 7
        },
        "4": {
          "mean": 4.06,
          "stddev": 1.64,
          "median": 4,
          "p90": 6,
          "p95": 7,
          "max": 9
        },
        "5": {
          "mean": 4.83,
          "stddev": 1.83,
          "median": 4,
          "p90": 7,
          "p95": 8,
          "max": 10
        },
        "6": {
          "mean": 5.41,
          "stddev": 2.02,
          "median": 5,
          "p90": 8,
          "p95": 9,
          "max": 12
        },
        "7": {
          "mean": 5.57,
          "stddev": 1.99,
          "median": 5,
          "p90": 8,
          "p95": 9,
          "max": 12
        },
        "8": {
          "mean": 5.75,
          "stddev": 1.86,
          "median": 6,
          "p90": 8,
          "p95": 9,
          "max": 12
        },
        "9": {
          "mean": 5.83,
          "stddev": 1.79,
          "median": 6,
          "p90": 8,
          "p95": 9,
          "max": 12
        },
        "10": {
          "mean": 5.86,
          "stddev": 1.75,
          "median": 6,
          "p90": 8,
          "p95": 9,
          "max": 12
        },
        "11": {
          "mean": 5.9,
          "stddev": 1.73,
          "median": 6,
          "p90": 8,
          "p95": 9,
          "max": 12
        },
        "12": {
          "mean": 5.92,
          "stddev": 1.71,
          "median": 6,
          "p90": 8,
          "p95": 9,
          "max": 12
        }
      },
      "finalDominantEligibleTagCount": {
        "mean": 5.77,
        "stddev": 1.85,
        "median": 6,
        "p90": 8,
        "p95": 9,
        "max": 12
      },
      "supplierTagDistribution": {
        "antique": 3,
        "drink": 5,
        "fancy": 6,
        "food": 50,
        "fragile": 8,
        "lucky": 21,
        "perishable": 5,
        "plant": 3,
        "utility": 19
      },
      "finalSupplierTagCount": {
        "mean": 5.02,
        "stddev": 2.49,
        "median": 5,
        "p90": 8,
        "p95": 9,
        "max": 12
      },
      "supplierTagCountByDay": {
        "1": {
          "mean": 1.13,
          "stddev": 0.74,
          "median": 1,
          "p90": 2,
          "p95": 2,
          "max": 3
        },
        "2": {
          "mean": 1.9,
          "stddev": 1.19,
          "median": 2,
          "p90": 4,
          "p95": 4,
          "max": 5
        },
        "3": {
          "mean": 2.8,
          "stddev": 1.66,
          "median": 3,
          "p90": 5,
          "p95": 6,
          "max": 7
        },
        "4": {
          "mean": 3.48,
          "stddev": 2.04,
          "median": 3,
          "p90": 6,
          "p95": 7,
          "max": 9
        },
        "5": {
          "mean": 4.19,
          "stddev": 2.35,
          "median": 4,
          "p90": 7,
          "p95": 8,
          "max": 10
        },
        "6": {
          "mean": 4.72,
          "stddev": 2.58,
          "median": 5,
          "p90": 8,
          "p95": 9,
          "max": 12
        },
        "7": {
          "mean": 4.91,
          "stddev": 2.56,
          "median": 5,
          "p90": 8,
          "p95": 9,
          "max": 12
        },
        "8": {
          "mean": 5.08,
          "stddev": 2.48,
          "median": 5,
          "p90": 8,
          "p95": 9,
          "max": 12
        },
        "9": {
          "mean": 5.13,
          "stddev": 2.45,
          "median": 5,
          "p90": 8,
          "p95": 9,
          "max": 12
        },
        "10": {
          "mean": 5.14,
          "stddev": 2.45,
          "median": 5,
          "p90": 8,
          "p95": 9,
          "max": 12
        },
        "11": {
          "mean": 5.15,
          "stddev": 2.43,
          "median": 5,
          "p90": 8,
          "p95": 9,
          "max": 12
        },
        "12": {
          "mean": 5.17,
          "stddev": 2.42,
          "median": 5,
          "p90": 8,
          "p95": 9,
          "max": 12
        }
      }
    },
    {
      "strategy": "combo",
      "runs": 120,
      "daysSurvived": {
        "mean": 25.05,
        "stddev": 5.65,
        "median": 27,
        "p90": 30,
        "p95": 30,
        "max": 33
      },
      "totalCoinsEarned": {
        "mean": 2735.25,
        "stddev": 1313.19,
        "median": 2782,
        "p90": 4490,
        "p95": 5144,
        "max": 7251
      },
      "bestDayTotal": {
        "mean": 146.58,
        "stddev": 62.48,
        "median": 143,
        "p90": 223,
        "p95": 254,
        "max": 399
      },
      "bestDayTotalBySignaturePickup": {
        "withSignature": {
          "mean": 163.6,
          "stddev": 72.16,
          "median": 165,
          "p90": 329,
          "p95": 329,
          "max": 329
        },
        "withoutSignature": {
          "mean": 145.04,
          "stddev": 61.29,
          "median": 143,
          "p90": 219,
          "p95": 244,
          "max": 399
        }
      },
      "deepestRentSurvived": {
        "mean": 7.35,
        "stddev": 1.88,
        "median": 8,
        "p90": 9,
        "p95": 9,
        "max": 10
      },
      "itemsBoughtPerRun": {
        "mean": 10.82,
        "stddev": 1.74,
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
        "stddev": 0.32,
        "median": 0,
        "p90": 0,
        "p95": 1,
        "max": 2
      },
      "signaturePickupRunRate": 0.083,
      "bestDayTotalBySignatureItem": {
        "brass-scale": {
          "mean": 199,
          "stddev": 0,
          "median": 199,
          "p90": 199,
          "p95": 199,
          "max": 199
        },
        "consignment-sign": {
          "mean": 165,
          "stddev": 0,
          "median": 165,
          "p90": 165,
          "p95": 165,
          "max": 165
        },
        "ledger-book": {
          "mean": 135,
          "stddev": 30,
          "median": 165,
          "p90": 165,
          "p95": 165,
          "max": 165
        },
        "lucky-cat": {
          "mean": 166.71,
          "stddev": 82.22,
          "median": 141,
          "p90": 329,
          "p95": 329,
          "max": 329
        }
      },
      "signatureDominance": {
        "maxMedianItemId": "brass-scale",
        "maxMedian": 199,
        "allSignatureMedian": 165,
        "maxToMedianRatio": 1.206
      },
      "boardOccupancyByDay": {
        "1": {
          "mean": 2.47,
          "stddev": 0.5,
          "median": 2,
          "p90": 3,
          "p95": 3,
          "max": 3
        },
        "2": {
          "mean": 4.38,
          "stddev": 0.97,
          "median": 4,
          "p90": 6,
          "p95": 6,
          "max": 7
        },
        "3": {
          "mean": 6.47,
          "stddev": 1.74,
          "median": 6,
          "p90": 9,
          "p95": 10,
          "max": 12
        },
        "4": {
          "mean": 7.78,
          "stddev": 2.29,
          "median": 8,
          "p90": 11,
          "p95": 12,
          "max": 12
        },
        "5": {
          "mean": 9.65,
          "stddev": 2.38,
          "median": 10,
          "p90": 12,
          "p95": 12,
          "max": 12
        },
        "6": {
          "mean": 10.76,
          "stddev": 1.95,
          "median": 12,
          "p90": 12,
          "p95": 12,
          "max": 12
        },
        "7": {
          "mean": 11.1,
          "stddev": 1.89,
          "median": 12,
          "p90": 12,
          "p95": 12,
          "max": 12
        },
        "8": {
          "mean": 11.44,
          "stddev": 1.57,
          "median": 12,
          "p90": 12,
          "p95": 12,
          "max": 12
        },
        "9": {
          "mean": 11.62,
          "stddev": 1.28,
          "median": 12,
          "p90": 12,
          "p95": 12,
          "max": 12
        },
        "10": {
          "mean": 11.79,
          "stddev": 0.87,
          "median": 12,
          "p90": 12,
          "p95": 12,
          "max": 12
        },
        "11": {
          "mean": 11.88,
          "stddev": 0.77,
          "median": 12,
          "p90": 12,
          "p95": 12,
          "max": 12
        },
        "12": {
          "mean": 11.91,
          "stddev": 0.63,
          "median": 12,
          "p90": 12,
          "p95": 12,
          "max": 12
        }
      },
      "coinsBeforeScoringByDay": {
        "1": {
          "mean": 0.83,
          "stddev": 1.14,
          "median": 0,
          "p90": 3,
          "p95": 3,
          "max": 5
        },
        "2": {
          "mean": 3.06,
          "stddev": 2.28,
          "median": 3,
          "p90": 6,
          "p95": 7,
          "max": 7
        },
        "3": {
          "mean": 5.04,
          "stddev": 3.98,
          "median": 4,
          "p90": 11,
          "p95": 12,
          "max": 14
        },
        "4": {
          "mean": 9.93,
          "stddev": 12.9,
          "median": 7,
          "p90": 17,
          "p95": 40,
          "max": 92
        },
        "5": {
          "mean": 32.22,
          "stddev": 50.76,
          "median": 14,
          "p90": 98,
          "p95": 163,
          "max": 295
        },
        "6": {
          "mean": 90.01,
          "stddev": 99.06,
          "median": 38,
          "p90": 240,
          "p95": 290,
          "max": 491
        },
        "7": {
          "mean": 145.45,
          "stddev": 138.16,
          "median": 110,
          "p90": 339,
          "p95": 398,
          "max": 665
        },
        "8": {
          "mean": 236.99,
          "stddev": 182.61,
          "median": 209,
          "p90": 490,
          "p95": 565,
          "max": 845
        },
        "9": {
          "mean": 339.42,
          "stddev": 222.83,
          "median": 333,
          "p90": 667,
          "p95": 727,
          "max": 1045
        },
        "10": {
          "mean": 407.16,
          "stddev": 253.25,
          "median": 380,
          "p90": 775,
          "p95": 849,
          "max": 1194
        },
        "11": {
          "mean": 519.28,
          "stddev": 289.64,
          "median": 507,
          "p90": 938,
          "p95": 1013,
          "max": 1394
        },
        "12": {
          "mean": 639.02,
          "stddev": 322.74,
          "median": 631,
          "p90": 1109,
          "p95": 1186,
          "max": 1606
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
          "stddev": 0.05,
          "median": 0,
          "p90": 0.12,
          "p95": 0.12,
          "max": 0.2
        },
        "2": {
          "mean": 0.12,
          "stddev": 0.09,
          "median": 0.12,
          "p90": 0.24,
          "p95": 0.28,
          "max": 0.28
        },
        "3": {
          "mean": 0.2,
          "stddev": 0.16,
          "median": 0.16,
          "p90": 0.44,
          "p95": 0.48,
          "max": 0.56
        },
        "4": {
          "mean": 0.28,
          "stddev": 0.36,
          "median": 0.194,
          "p90": 0.472,
          "p95": 1.111,
          "max": 2.556
        },
        "5": {
          "mean": 0.9,
          "stddev": 1.41,
          "median": 0.389,
          "p90": 2.722,
          "p95": 4.528,
          "max": 8.194
        },
        "6": {
          "mean": 2.5,
          "stddev": 2.75,
          "median": 1.056,
          "p90": 6.667,
          "p95": 8.056,
          "max": 13.639
        },
        "7": {
          "mean": 2.85,
          "stddev": 2.71,
          "median": 2.157,
          "p90": 6.647,
          "p95": 7.804,
          "max": 13.039
        },
        "8": {
          "mean": 4.65,
          "stddev": 3.58,
          "median": 4.098,
          "p90": 9.608,
          "p95": 11.078,
          "max": 16.569
        },
        "9": {
          "mean": 6.66,
          "stddev": 4.37,
          "median": 6.529,
          "p90": 13.078,
          "p95": 14.255,
          "max": 20.49
        },
        "10": {
          "mean": 4.57,
          "stddev": 2.85,
          "median": 4.27,
          "p90": 8.708,
          "p95": 9.539,
          "max": 13.416
        },
        "11": {
          "mean": 5.83,
          "stddev": 3.25,
          "median": 5.697,
          "p90": 10.539,
          "p95": 11.382,
          "max": 15.663
        },
        "12": {
          "mean": 7.18,
          "stddev": 3.63,
          "median": 7.09,
          "p90": 12.461,
          "p95": 13.326,
          "max": 18.045
        }
      },
      "dayTotalByDay": {
        "1": {
          "mean": 23.11,
          "stddev": 7.07,
          "median": 23,
          "p90": 31,
          "p95": 36,
          "max": 44
        },
        "2": {
          "mean": 35.91,
          "stddev": 14.55,
          "median": 34,
          "p90": 57,
          "p95": 65,
          "max": 88
        },
        "3": {
          "mean": 55.15,
          "stddev": 25.24,
          "median": 52,
          "p90": 92,
          "p95": 108,
          "max": 154
        },
        "4": {
          "mean": 72.79,
          "stddev": 36.97,
          "median": 66,
          "p90": 121,
          "p95": 141,
          "max": 238
        },
        "5": {
          "mean": 93.39,
          "stddev": 44.18,
          "median": 86,
          "p90": 152,
          "p95": 167,
          "max": 295
        },
        "6": {
          "mean": 105.23,
          "stddev": 43.61,
          "median": 100,
          "p90": 167,
          "p95": 190,
          "max": 223
        },
        "7": {
          "mean": 105.95,
          "stddev": 40.6,
          "median": 104,
          "p90": 156,
          "p95": 176,
          "max": 234
        },
        "8": {
          "mean": 111.82,
          "stddev": 41.67,
          "median": 110,
          "p90": 162,
          "p95": 193,
          "max": 234
        },
        "9": {
          "mean": 114.99,
          "stddev": 42.56,
          "median": 113,
          "p90": 169,
          "p95": 201,
          "max": 271
        },
        "10": {
          "mean": 117.34,
          "stddev": 39.72,
          "median": 116,
          "p90": 178,
          "p95": 193,
          "max": 218
        },
        "11": {
          "mean": 121.98,
          "stddev": 48.51,
          "median": 114,
          "p90": 174,
          "p95": 208,
          "max": 399
        },
        "12": {
          "mean": 120.29,
          "stddev": 45.57,
          "median": 117,
          "p90": 174,
          "p95": 204,
          "max": 354
        }
      },
      "itemsBoughtByDay": {
        "1": {
          "mean": 1.47,
          "stddev": 0.5,
          "median": 1,
          "p90": 2,
          "p95": 2,
          "max": 2
        },
        "2": {
          "mean": 1.91,
          "stddev": 0.74,
          "median": 2,
          "p90": 3,
          "p95": 3,
          "max": 4
        },
        "3": {
          "mean": 2.19,
          "stddev": 1.03,
          "median": 2,
          "p90": 4,
          "p95": 4,
          "max": 6
        },
        "4": {
          "mean": 1.28,
          "stddev": 0.98,
          "median": 1,
          "p90": 2,
          "p95": 3,
          "max": 4
        },
        "5": {
          "mean": 1.92,
          "stddev": 1.02,
          "median": 2,
          "p90": 3,
          "p95": 4,
          "max": 4
        },
        "6": {
          "mean": 1.12,
          "stddev": 1.1,
          "median": 1,
          "p90": 3,
          "p95": 3,
          "max": 4
        },
        "7": {
          "mean": 0.38,
          "stddev": 0.62,
          "median": 0,
          "p90": 1,
          "p95": 2,
          "max": 3
        },
        "8": {
          "mean": 0.34,
          "stddev": 0.66,
          "median": 0,
          "p90": 1,
          "p95": 2,
          "max": 3
        },
        "9": {
          "mean": 0.2,
          "stddev": 0.53,
          "median": 0,
          "p90": 1,
          "p95": 2,
          "max": 2
        },
        "10": {
          "mean": 0.06,
          "stddev": 0.27,
          "median": 0,
          "p90": 0,
          "p95": 1,
          "max": 2
        },
        "11": {
          "mean": 0.09,
          "stddev": 0.36,
          "median": 0,
          "p90": 0,
          "p95": 1,
          "max": 2
        },
        "12": {
          "mean": 0.04,
          "stddev": 0.18,
          "median": 0,
          "p90": 0,
          "p95": 0,
          "max": 1
        }
      },
      "gameOverRate": 1,
      "diedAtRentCycle": {
        "mean": 8.35,
        "stddev": 1.88,
        "median": 9,
        "p90": 10,
        "p95": 10,
        "max": 11
      },
      "namedComboRunRate": 0.808,
      "orderFillRate": 0.413,
      "spotlightHitRate": 0.993,
      "synergyFireDayRate": 0.901,
      "synergyFireRate": 0.638,
      "synergyFiresPerScoredDay": 6.831,
      "goalTargetHitRate": 0.786,
      "goalTargetHitRateByDay": {
        "1": {
          "hits": 93,
          "survivingDays": 120,
          "rate": 0.775
        },
        "2": {
          "hits": 80,
          "survivingDays": 120,
          "rate": 0.667
        },
        "3": {
          "hits": 86,
          "survivingDays": 120,
          "rate": 0.717
        },
        "4": {
          "hits": 90,
          "survivingDays": 116,
          "rate": 0.776
        },
        "5": {
          "hits": 94,
          "survivingDays": 116,
          "rate": 0.81
        },
        "6": {
          "hits": 93,
          "survivingDays": 116,
          "rate": 0.802
        },
        "7": {
          "hits": 90,
          "survivingDays": 116,
          "rate": 0.776
        },
        "8": {
          "hits": 90,
          "survivingDays": 116,
          "rate": 0.776
        },
        "9": {
          "hits": 87,
          "survivingDays": 116,
          "rate": 0.75
        },
        "10": {
          "hits": 84,
          "survivingDays": 114,
          "rate": 0.737
        },
        "11": {
          "hits": 87,
          "survivingDays": 114,
          "rate": 0.763
        },
        "12": {
          "hits": 84,
          "survivingDays": 114,
          "rate": 0.737
        }
      },
      "goalTargetHitRateDays9To12": {
        "hits": 342,
        "survivingDays": 458,
        "rate": 0.747
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
          "mean": 23.11,
          "stddev": 7.07,
          "median": 23,
          "p90": 31,
          "p95": 36,
          "max": 44
        },
        "2": {
          "mean": 35.91,
          "stddev": 14.55,
          "median": 34,
          "p90": 57,
          "p95": 65,
          "max": 88
        },
        "3": {
          "mean": 55.15,
          "stddev": 25.24,
          "median": 52,
          "p90": 92,
          "p95": 108,
          "max": 154
        },
        "4": {
          "mean": 72.79,
          "stddev": 36.97,
          "median": 66,
          "p90": 121,
          "p95": 141,
          "max": 238
        },
        "5": {
          "mean": 93.39,
          "stddev": 44.18,
          "median": 86,
          "p90": 152,
          "p95": 167,
          "max": 295
        },
        "6": {
          "mean": 105.23,
          "stddev": 43.61,
          "median": 100,
          "p90": 167,
          "p95": 190,
          "max": 223
        },
        "7": {
          "mean": 105.95,
          "stddev": 40.6,
          "median": 104,
          "p90": 156,
          "p95": 176,
          "max": 234
        },
        "8": {
          "mean": 111.82,
          "stddev": 41.67,
          "median": 110,
          "p90": 162,
          "p95": 193,
          "max": 234
        },
        "9": {
          "mean": 114.99,
          "stddev": 42.56,
          "median": 113,
          "p90": 169,
          "p95": 201,
          "max": 271
        },
        "10": {
          "mean": 117.34,
          "stddev": 39.72,
          "median": 116,
          "p90": 178,
          "p95": 193,
          "max": 218
        },
        "11": {
          "mean": 121.98,
          "stddev": 48.51,
          "median": 114,
          "p90": 174,
          "p95": 208,
          "max": 399
        },
        "12": {
          "mean": 120.29,
          "stddev": 45.57,
          "median": 117,
          "p90": 174,
          "p95": 204,
          "max": 354
        }
      },
      "goalRewardsGranted": 2362,
      "freeRerollsSpent": 344,
      "dominantEligibleTagCountDistribution": {
        "1": 109,
        "2": 190,
        "3": 294,
        "4": 613,
        "5": 475,
        "6": 440,
        "7": 361,
        "8": 341,
        "9": 115,
        "10": 68
      },
      "dominantEligibleTagCountByDay": {
        "1": {
          "mean": 1.43,
          "stddev": 0.56,
          "median": 1,
          "p90": 2,
          "p95": 2,
          "max": 3
        },
        "2": {
          "mean": 2.27,
          "stddev": 0.87,
          "median": 2,
          "p90": 3,
          "p95": 4,
          "max": 6
        },
        "3": {
          "mean": 3.17,
          "stddev": 1.25,
          "median": 3,
          "p90": 5,
          "p95": 5,
          "max": 8
        },
        "4": {
          "mean": 3.9,
          "stddev": 1.68,
          "median": 4,
          "p90": 6,
          "p95": 8,
          "max": 8
        },
        "5": {
          "mean": 4.74,
          "stddev": 1.98,
          "median": 4,
          "p90": 8,
          "p95": 8,
          "max": 10
        },
        "6": {
          "mean": 5.2,
          "stddev": 1.99,
          "median": 5,
          "p90": 8,
          "p95": 9,
          "max": 10
        },
        "7": {
          "mean": 5.34,
          "stddev": 2.03,
          "median": 5,
          "p90": 8,
          "p95": 9,
          "max": 10
        },
        "8": {
          "mean": 5.48,
          "stddev": 1.95,
          "median": 5,
          "p90": 8,
          "p95": 9,
          "max": 10
        },
        "9": {
          "mean": 5.57,
          "stddev": 1.89,
          "median": 5,
          "p90": 8,
          "p95": 9,
          "max": 10
        },
        "10": {
          "mean": 5.68,
          "stddev": 1.81,
          "median": 5,
          "p90": 8,
          "p95": 9,
          "max": 10
        },
        "11": {
          "mean": 5.71,
          "stddev": 1.81,
          "median": 6,
          "p90": 8,
          "p95": 9,
          "max": 10
        },
        "12": {
          "mean": 5.72,
          "stddev": 1.8,
          "median": 6,
          "p90": 8,
          "p95": 9,
          "max": 10
        }
      },
      "finalDominantEligibleTagCount": {
        "mean": 5.53,
        "stddev": 1.94,
        "median": 5,
        "p90": 8,
        "p95": 9,
        "max": 10
      },
      "supplierTagDistribution": {
        "drink": 11,
        "fancy": 11,
        "food": 43,
        "fragile": 10,
        "lucky": 12,
        "perishable": 10,
        "plant": 4,
        "sweet": 1,
        "utility": 18
      },
      "finalSupplierTagCount": {
        "mean": 4.97,
        "stddev": 2.42,
        "median": 5,
        "p90": 8,
        "p95": 9,
        "max": 10
      },
      "supplierTagCountByDay": {
        "1": {
          "mean": 1.18,
          "stddev": 0.72,
          "median": 1,
          "p90": 2,
          "p95": 2,
          "max": 3
        },
        "2": {
          "mean": 1.98,
          "stddev": 1.09,
          "median": 2,
          "p90": 3,
          "p95": 4,
          "max": 6
        },
        "3": {
          "mean": 2.82,
          "stddev": 1.53,
          "median": 3,
          "p90": 5,
          "p95": 5,
          "max": 8
        },
        "4": {
          "mean": 3.46,
          "stddev": 2.01,
          "median": 3,
          "p90": 6,
          "p95": 8,
          "max": 8
        },
        "5": {
          "mean": 4.31,
          "stddev": 2.34,
          "median": 4,
          "p90": 8,
          "p95": 8,
          "max": 10
        },
        "6": {
          "mean": 4.72,
          "stddev": 2.4,
          "median": 5,
          "p90": 8,
          "p95": 9,
          "max": 10
        },
        "7": {
          "mean": 4.84,
          "stddev": 2.45,
          "median": 5,
          "p90": 8,
          "p95": 9,
          "max": 10
        },
        "8": {
          "mean": 4.97,
          "stddev": 2.42,
          "median": 5,
          "p90": 8,
          "p95": 9,
          "max": 10
        },
        "9": {
          "mean": 5.02,
          "stddev": 2.41,
          "median": 5,
          "p90": 8,
          "p95": 9,
          "max": 10
        },
        "10": {
          "mean": 5.11,
          "stddev": 2.37,
          "median": 5,
          "p90": 8,
          "p95": 9,
          "max": 10
        },
        "11": {
          "mean": 5.13,
          "stddev": 2.38,
          "median": 5,
          "p90": 8,
          "p95": 9,
          "max": 10
        },
        "12": {
          "mean": 5.14,
          "stddev": 2.37,
          "median": 5,
          "p90": 8,
          "p95": 9,
          "max": 10
        }
      }
    }
  ],
  "elapsedMs": 34028
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

Build swing (allDepth median earned / baseline median earned):
  floor: 1.333x
  ceiling-greedy: 1.334x
  ceiling-combo: 1.428x

Aspirational beginner floor (NOT asserted — needs Fable to ease the opening): first-rent survival target [40, 70]%. Actual:
  baseline: 21.2%  (below target — gap)
  buildSteering: 25.0%  (below target — gap)
  loopV2: 10.0%  (below target — gap)
  allDepth: 16.3%  (below target — gap)
```

## 5. Goal-table drift report - 400-run full stack + expansion

### greedy

```json
{
  "goalTargetHitRateByDay": {
    "1": {
      "hits": 296,
      "survivingDays": 400,
      "rate": 0.74
    },
    "2": {
      "hits": 275,
      "survivingDays": 400,
      "rate": 0.688
    },
    "3": {
      "hits": 276,
      "survivingDays": 400,
      "rate": 0.69
    },
    "4": {
      "hits": 275,
      "survivingDays": 385,
      "rate": 0.714
    },
    "5": {
      "hits": 295,
      "survivingDays": 385,
      "rate": 0.766
    },
    "6": {
      "hits": 320,
      "survivingDays": 385,
      "rate": 0.831
    },
    "7": {
      "hits": 314,
      "survivingDays": 384,
      "rate": 0.818
    },
    "8": {
      "hits": 317,
      "survivingDays": 384,
      "rate": 0.826
    },
    "9": {
      "hits": 314,
      "survivingDays": 384,
      "rate": 0.818
    },
    "10": {
      "hits": 312,
      "survivingDays": 383,
      "rate": 0.815
    },
    "11": {
      "hits": 321,
      "survivingDays": 383,
      "rate": 0.838
    },
    "12": {
      "hits": 339,
      "survivingDays": 383,
      "rate": 0.885
    }
  },
  "goalTargetHitRateDays9To12": {
    "hits": 1286,
    "survivingDays": 1533,
    "rate": 0.839
  }
}
```

### combo

```json
{
  "goalTargetHitRateByDay": {
    "1": {
      "hits": 301,
      "survivingDays": 400,
      "rate": 0.752
    },
    "2": {
      "hits": 267,
      "survivingDays": 400,
      "rate": 0.667
    },
    "3": {
      "hits": 275,
      "survivingDays": 400,
      "rate": 0.688
    },
    "4": {
      "hits": 298,
      "survivingDays": 396,
      "rate": 0.753
    },
    "5": {
      "hits": 304,
      "survivingDays": 396,
      "rate": 0.768
    },
    "6": {
      "hits": 322,
      "survivingDays": 396,
      "rate": 0.813
    },
    "7": {
      "hits": 322,
      "survivingDays": 396,
      "rate": 0.813
    },
    "8": {
      "hits": 329,
      "survivingDays": 396,
      "rate": 0.831
    },
    "9": {
      "hits": 329,
      "survivingDays": 396,
      "rate": 0.831
    },
    "10": {
      "hits": 322,
      "survivingDays": 394,
      "rate": 0.817
    },
    "11": {
      "hits": 332,
      "survivingDays": 394,
      "rate": 0.843
    },
    "12": {
      "hits": 352,
      "survivingDays": 394,
      "rate": 0.893
    }
  },
  "goalTargetHitRateDays9To12": {
    "hits": 1335,
    "survivingDays": 1578,
    "rate": 0.846
  }
}
```

Full 400-run fuzz JSON:

```json
{
  "generatedAt": "2026-07-08T19:12:18.600Z",
  "seedPrefix": "m6a-goal-drift",
  "loopV2Enabled": true,
  "goalLadderEnabled": true,
  "tagSynergyEnabled": true,
  "buildSteeringEnabled": true,
  "shelfExpansionEnabled": true,
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
        "mean": 1.85,
        "stddev": 4,
        "median": 0,
        "p90": 6,
        "p95": 8,
        "max": 45
      },
      "bestDayTotal": {
        "mean": 1.46,
        "stddev": 2.74,
        "median": 0,
        "p90": 4,
        "p95": 6,
        "max": 27
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
          "mean": 1.46,
          "stddev": 2.74,
          "median": 0,
          "p90": 4,
          "p95": 6,
          "max": 27
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
        "mean": 1.05,
        "stddev": 0.67,
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
          "mean": 0.53,
          "stddev": 0.7,
          "median": 0,
          "p90": 1,
          "p95": 2,
          "max": 3
        },
        "2": {
          "mean": 0.14,
          "stddev": 0.38,
          "median": 0,
          "p90": 1,
          "p95": 1,
          "max": 3
        },
        "3": {
          "mean": 0.04,
          "stddev": 0.18,
          "median": 0,
          "p90": 0,
          "p95": 0,
          "max": 1
        }
      },
      "coinsBeforeScoringByDay": {
        "1": {
          "mean": 2.48,
          "stddev": 2.62,
          "median": 1,
          "p90": 7,
          "p95": 9,
          "max": 9
        },
        "2": {
          "mean": 2.17,
          "stddev": 2.23,
          "median": 1,
          "p90": 5,
          "p95": 7,
          "max": 16
        },
        "3": {
          "mean": 1.81,
          "stddev": 1.97,
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
          "mean": 0.1,
          "stddev": 0.1,
          "median": 0.04,
          "p90": 0.28,
          "p95": 0.36,
          "max": 0.36
        },
        "2": {
          "mean": 0.09,
          "stddev": 0.09,
          "median": 0.04,
          "p90": 0.2,
          "p95": 0.28,
          "max": 0.64
        },
        "3": {
          "mean": 0.07,
          "stddev": 0.08,
          "median": 0.04,
          "p90": 0.2,
          "p95": 0.28,
          "max": 0.44
        }
      },
      "dayTotalByDay": {
        "1": {
          "mean": 1.28,
          "stddev": 2.14,
          "median": 0,
          "p90": 3,
          "p95": 6,
          "max": 11
        },
        "2": {
          "mean": 0.44,
          "stddev": 2.04,
          "median": 0,
          "p90": 1,
          "p95": 3,
          "max": 27
        },
        "3": {
          "mean": 0.13,
          "stddev": 0.88,
          "median": 0,
          "p90": 0,
          "p95": 0,
          "max": 12
        }
      },
      "itemsBoughtByDay": {
        "1": {
          "mean": 0.97,
          "stddev": 0.68,
          "median": 1,
          "p90": 2,
          "p95": 2,
          "max": 3
        },
        "2": {
          "mean": 0.07,
          "stddev": 0.26,
          "median": 0,
          "p90": 0,
          "p95": 1,
          "max": 1
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
      "namedComboRunRate": 0.003,
      "orderFillRate": 0.003,
      "spotlightHitRate": 0.023,
      "synergyFireDayRate": 0.003,
      "synergyFireRate": 0.025,
      "synergyFiresPerScoredDay": 0.006,
      "goalTargetHitRate": 0,
      "goalTargetHitRateByDay": {
        "1": {
          "hits": 0,
          "survivingDays": 400,
          "rate": 0
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
          "mean": 1.28,
          "stddev": 2.14,
          "median": 0,
          "p90": 3,
          "p95": 6,
          "max": 11
        },
        "2": {
          "mean": 0.44,
          "stddev": 2.04,
          "median": 0,
          "p90": 1,
          "p95": 3,
          "max": 27
        },
        "3": {
          "mean": 0.13,
          "stddev": 0.88,
          "median": 0,
          "p90": 0,
          "p95": 0,
          "max": 12
        }
      },
      "goalRewardsGranted": 0,
      "freeRerollsSpent": 0,
      "dominantEligibleTagCountDistribution": {
        "0": 1000,
        "1": 189,
        "2": 8,
        "3": 3
      },
      "dominantEligibleTagCountByDay": {
        "1": {
          "mean": 0.39,
          "stddev": 0.55,
          "median": 0,
          "p90": 1,
          "p95": 1,
          "max": 3
        },
        "2": {
          "mean": 0.12,
          "stddev": 0.35,
          "median": 0,
          "p90": 1,
          "p95": 1,
          "max": 3
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
      "finalDominantEligibleTagCount": {
        "mean": 0.03,
        "stddev": 0.18,
        "median": 0,
        "p90": 0,
        "p95": 0,
        "max": 1
      },
      "supplierTagDistribution": {
        "antique": 42,
        "drink": 41,
        "fancy": 40,
        "food": 41,
        "fragile": 37,
        "lucky": 41,
        "perishable": 38,
        "plant": 35,
        "sweet": 48,
        "utility": 37
      },
      "finalSupplierTagCount": {
        "mean": 0.01,
        "stddev": 0.09,
        "median": 0,
        "p90": 0,
        "p95": 0,
        "max": 1
      },
      "supplierTagCountByDay": {
        "1": {
          "mean": 0.12,
          "stddev": 0.38,
          "median": 0,
          "p90": 1,
          "p95": 1,
          "max": 3
        },
        "2": {
          "mean": 0.05,
          "stddev": 0.26,
          "median": 0,
          "p90": 0,
          "p95": 0,
          "max": 3
        },
        "3": {
          "mean": 0.01,
          "stddev": 0.09,
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
        "mean": 27.38,
        "stddev": 6.16,
        "median": 30,
        "p90": 33,
        "p95": 33,
        "max": 39
      },
      "totalCoinsEarned": {
        "mean": 4752.7,
        "stddev": 2800.3,
        "median": 4923,
        "p90": 7889,
        "p95": 9437,
        "max": 22268
      },
      "bestDayTotal": {
        "mean": 269.01,
        "stddev": 183.52,
        "median": 245,
        "p90": 446,
        "p95": 534,
        "max": 2134
      },
      "bestDayTotalBySignaturePickup": {
        "withSignature": {
          "mean": 356.87,
          "stddev": 240.86,
          "median": 315,
          "p90": 534,
          "p95": 680,
          "max": 2134
        },
        "withoutSignature": {
          "mean": 216.3,
          "stddev": 108.02,
          "median": 218,
          "p90": 320,
          "p95": 388,
          "max": 697
        }
      },
      "deepestRentSurvived": {
        "mean": 8.13,
        "stddev": 2.05,
        "median": 9,
        "p90": 10,
        "p95": 10,
        "max": 12
      },
      "itemsBoughtPerRun": {
        "mean": 13.97,
        "stddev": 2.74,
        "median": 15,
        "p90": 16,
        "p95": 16,
        "max": 17
      },
      "expansionsPerRun": {
        "mean": 0.89,
        "stddev": 0.31,
        "median": 1,
        "p90": 1,
        "p95": 1,
        "max": 1
      },
      "expansionRunRate": 0.892,
      "signatureItemsBoughtPerRun": {
        "mean": 0.48,
        "stddev": 0.7,
        "median": 0,
        "p90": 1,
        "p95": 2,
        "max": 3
      },
      "signaturePickupRunRate": 0.375,
      "bestDayTotalBySignatureItem": {
        "brass-scale": {
          "mean": 287.14,
          "stddev": 123.76,
          "median": 286,
          "p90": 452,
          "p95": 514,
          "max": 619
        },
        "consignment-sign": {
          "mean": 563.64,
          "stddev": 340.18,
          "median": 494,
          "p90": 824,
          "p95": 1664,
          "max": 2134
        },
        "ledger-book": {
          "mean": 284.83,
          "stddev": 163.79,
          "median": 259,
          "p90": 501,
          "p95": 514,
          "max": 884
        },
        "lucky-cat": {
          "mean": 381.07,
          "stddev": 282.96,
          "median": 330,
          "p90": 534,
          "p95": 898,
          "max": 2134
        },
        "window-display": {
          "mean": 336.95,
          "stddev": 152.3,
          "median": 315,
          "p90": 446,
          "p95": 884,
          "max": 884
        }
      },
      "signatureDominance": {
        "maxMedianItemId": "consignment-sign",
        "maxMedian": 494,
        "allSignatureMedian": 315,
        "maxToMedianRatio": 1.568
      },
      "boardOccupancyByDay": {
        "1": {
          "mean": 2.4,
          "stddev": 0.49,
          "median": 2,
          "p90": 3,
          "p95": 3,
          "max": 3
        },
        "2": {
          "mean": 4.33,
          "stddev": 0.96,
          "median": 4,
          "p90": 6,
          "p95": 6,
          "max": 7
        },
        "3": {
          "mean": 6.4,
          "stddev": 1.66,
          "median": 6,
          "p90": 9,
          "p95": 9,
          "max": 12
        },
        "4": {
          "mean": 7.7,
          "stddev": 2.25,
          "median": 8,
          "p90": 11,
          "p95": 12,
          "max": 12
        },
        "5": {
          "mean": 9.52,
          "stddev": 2.31,
          "median": 10,
          "p90": 12,
          "p95": 12,
          "max": 12
        },
        "6": {
          "mean": 10.71,
          "stddev": 1.87,
          "median": 12,
          "p90": 12,
          "p95": 12,
          "max": 12
        },
        "7": {
          "mean": 11.13,
          "stddev": 1.65,
          "median": 12,
          "p90": 12,
          "p95": 12,
          "max": 12
        },
        "8": {
          "mean": 11.54,
          "stddev": 1.19,
          "median": 12,
          "p90": 12,
          "p95": 12,
          "max": 12
        },
        "9": {
          "mean": 12.98,
          "stddev": 1.97,
          "median": 12,
          "p90": 16,
          "p95": 16,
          "max": 16
        },
        "10": {
          "mean": 13.26,
          "stddev": 2.01,
          "median": 12,
          "p90": 16,
          "p95": 16,
          "max": 16
        },
        "11": {
          "mean": 13.86,
          "stddev": 1.98,
          "median": 14,
          "p90": 16,
          "p95": 16,
          "max": 16
        },
        "12": {
          "mean": 14.45,
          "stddev": 1.85,
          "median": 16,
          "p90": 16,
          "p95": 16,
          "max": 16
        }
      },
      "coinsBeforeScoringByDay": {
        "1": {
          "mean": 0.95,
          "stddev": 1.13,
          "median": 1,
          "p90": 3,
          "p95": 3,
          "max": 5
        },
        "2": {
          "mean": 3.2,
          "stddev": 2.42,
          "median": 3,
          "p90": 7,
          "p95": 7,
          "max": 9
        },
        "3": {
          "mean": 5.24,
          "stddev": 4.13,
          "median": 5,
          "p90": 11,
          "p95": 12,
          "max": 31
        },
        "4": {
          "mean": 10.34,
          "stddev": 17.13,
          "median": 8,
          "p90": 16,
          "p95": 19,
          "max": 192
        },
        "5": {
          "mean": 32.06,
          "stddev": 53.31,
          "median": 14,
          "p90": 95,
          "p95": 147,
          "max": 443
        },
        "6": {
          "mean": 87.74,
          "stddev": 103.65,
          "median": 29,
          "p90": 231,
          "p95": 292,
          "max": 670
        },
        "7": {
          "mean": 143.27,
          "stddev": 142.21,
          "median": 99,
          "p90": 344,
          "p95": 414,
          "max": 861
        },
        "8": {
          "mean": 238.09,
          "stddev": 186.72,
          "median": 213,
          "p90": 489,
          "p95": 569,
          "max": 1092
        },
        "9": {
          "mean": 149.71,
          "stddev": 102.13,
          "median": 127,
          "p90": 269,
          "p95": 309,
          "max": 886
        },
        "10": {
          "mean": 227.84,
          "stddev": 140.09,
          "median": 203,
          "p90": 384,
          "p95": 499,
          "max": 1086
        },
        "11": {
          "mean": 308.38,
          "stddev": 209.89,
          "median": 228,
          "p90": 598,
          "p95": 722,
          "max": 1339
        },
        "12": {
          "mean": 411.77,
          "stddev": 299.67,
          "median": 279,
          "p90": 819,
          "p95": 993,
          "max": 1647
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
          "mean": 0.04,
          "stddev": 0.05,
          "median": 0.04,
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
          "max": 0.36
        },
        "3": {
          "mean": 0.21,
          "stddev": 0.17,
          "median": 0.2,
          "p90": 0.44,
          "p95": 0.48,
          "max": 1.24
        },
        "4": {
          "mean": 0.29,
          "stddev": 0.48,
          "median": 0.222,
          "p90": 0.444,
          "p95": 0.528,
          "max": 5.333
        },
        "5": {
          "mean": 0.89,
          "stddev": 1.48,
          "median": 0.389,
          "p90": 2.639,
          "p95": 4.083,
          "max": 12.306
        },
        "6": {
          "mean": 2.44,
          "stddev": 2.88,
          "median": 0.806,
          "p90": 6.417,
          "p95": 8.111,
          "max": 18.611
        },
        "7": {
          "mean": 2.81,
          "stddev": 2.79,
          "median": 1.941,
          "p90": 6.745,
          "p95": 8.118,
          "max": 16.882
        },
        "8": {
          "mean": 4.67,
          "stddev": 3.66,
          "median": 4.176,
          "p90": 9.588,
          "p95": 11.157,
          "max": 21.412
        },
        "9": {
          "mean": 2.94,
          "stddev": 2,
          "median": 2.49,
          "p90": 5.275,
          "p95": 6.059,
          "max": 17.373
        },
        "10": {
          "mean": 2.56,
          "stddev": 1.57,
          "median": 2.281,
          "p90": 4.315,
          "p95": 5.607,
          "max": 12.202
        },
        "11": {
          "mean": 3.46,
          "stddev": 2.36,
          "median": 2.562,
          "p90": 6.719,
          "p95": 8.112,
          "max": 15.045
        },
        "12": {
          "mean": 4.63,
          "stddev": 3.37,
          "median": 3.135,
          "p90": 9.202,
          "p95": 11.157,
          "max": 18.506
        }
      },
      "dayTotalByDay": {
        "1": {
          "mean": 22.94,
          "stddev": 6.77,
          "median": 23,
          "p90": 31,
          "p95": 34,
          "max": 50
        },
        "2": {
          "mean": 35.76,
          "stddev": 14.77,
          "median": 33,
          "p90": 53,
          "p95": 62,
          "max": 130
        },
        "3": {
          "mean": 54.78,
          "stddev": 26.92,
          "median": 49,
          "p90": 88,
          "p95": 100,
          "max": 220
        },
        "4": {
          "mean": 70.04,
          "stddev": 36.7,
          "median": 61,
          "p90": 125,
          "p95": 139,
          "max": 251
        },
        "5": {
          "mean": 93.63,
          "stddev": 44.08,
          "median": 87,
          "p90": 157,
          "p95": 176,
          "max": 236
        },
        "6": {
          "mean": 107.16,
          "stddev": 40.33,
          "median": 106,
          "p90": 159,
          "p95": 174,
          "max": 227
        },
        "7": {
          "mean": 112.64,
          "stddev": 40.26,
          "median": 112,
          "p90": 161,
          "p95": 178,
          "max": 264
        },
        "8": {
          "mean": 119.4,
          "stddev": 41.78,
          "median": 118,
          "p90": 170,
          "p95": 190,
          "max": 349
        },
        "9": {
          "mean": 148.55,
          "stddev": 70.42,
          "median": 136,
          "p90": 235,
          "p95": 263,
          "max": 566
        },
        "10": {
          "mean": 151.6,
          "stddev": 69.19,
          "median": 142,
          "p90": 237,
          "p95": 276,
          "max": 436
        },
        "11": {
          "mean": 167.64,
          "stddev": 76.36,
          "median": 164,
          "p90": 250,
          "p95": 312,
          "max": 576
        },
        "12": {
          "mean": 185.39,
          "stddev": 86.46,
          "median": 179,
          "p90": 269,
          "p95": 335,
          "max": 697
        }
      },
      "itemsBoughtByDay": {
        "1": {
          "mean": 1.41,
          "stddev": 0.49,
          "median": 1,
          "p90": 2,
          "p95": 2,
          "max": 2
        },
        "2": {
          "mean": 1.93,
          "stddev": 0.73,
          "median": 2,
          "p90": 3,
          "p95": 3,
          "max": 4
        },
        "3": {
          "mean": 2.15,
          "stddev": 1.01,
          "median": 2,
          "p90": 3,
          "p95": 4,
          "max": 7
        },
        "4": {
          "mean": 1.27,
          "stddev": 1.01,
          "median": 1,
          "p90": 3,
          "p95": 3,
          "max": 4
        },
        "5": {
          "mean": 1.85,
          "stddev": 0.97,
          "median": 2,
          "p90": 3,
          "p95": 3,
          "max": 5
        },
        "6": {
          "mean": 1.2,
          "stddev": 1.02,
          "median": 1,
          "p90": 2,
          "p95": 3,
          "max": 4
        },
        "7": {
          "mean": 0.44,
          "stddev": 0.67,
          "median": 0,
          "p90": 1,
          "p95": 2,
          "max": 3
        },
        "8": {
          "mean": 0.42,
          "stddev": 0.74,
          "median": 0,
          "p90": 2,
          "p95": 2,
          "max": 3
        },
        "9": {
          "mean": 1.45,
          "stddev": 1.57,
          "median": 1,
          "p90": 4,
          "p95": 4,
          "max": 4
        },
        "10": {
          "mean": 0.26,
          "stddev": 0.54,
          "median": 0,
          "p90": 1,
          "p95": 1,
          "max": 4
        },
        "11": {
          "mean": 0.62,
          "stddev": 0.89,
          "median": 0,
          "p90": 2,
          "p95": 2,
          "max": 4
        },
        "12": {
          "mean": 0.59,
          "stddev": 0.91,
          "median": 0,
          "p90": 2,
          "p95": 2,
          "max": 3
        }
      },
      "gameOverRate": 1,
      "diedAtRentCycle": {
        "mean": 9.13,
        "stddev": 2.05,
        "median": 10,
        "p90": 11,
        "p95": 11,
        "max": 13
      },
      "namedComboRunRate": 0.865,
      "orderFillRate": 0.5,
      "spotlightHitRate": 0.993,
      "synergyFireDayRate": 0.913,
      "synergyFireRate": 0.696,
      "synergyFiresPerScoredDay": 9.038,
      "goalTargetHitRate": 0.884,
      "goalTargetHitRateByDay": {
        "1": {
          "hits": 296,
          "survivingDays": 400,
          "rate": 0.74
        },
        "2": {
          "hits": 275,
          "survivingDays": 400,
          "rate": 0.688
        },
        "3": {
          "hits": 276,
          "survivingDays": 400,
          "rate": 0.69
        },
        "4": {
          "hits": 275,
          "survivingDays": 385,
          "rate": 0.714
        },
        "5": {
          "hits": 295,
          "survivingDays": 385,
          "rate": 0.766
        },
        "6": {
          "hits": 320,
          "survivingDays": 385,
          "rate": 0.831
        },
        "7": {
          "hits": 314,
          "survivingDays": 384,
          "rate": 0.818
        },
        "8": {
          "hits": 317,
          "survivingDays": 384,
          "rate": 0.826
        },
        "9": {
          "hits": 314,
          "survivingDays": 384,
          "rate": 0.818
        },
        "10": {
          "hits": 312,
          "survivingDays": 383,
          "rate": 0.815
        },
        "11": {
          "hits": 321,
          "survivingDays": 383,
          "rate": 0.838
        },
        "12": {
          "hits": 339,
          "survivingDays": 383,
          "rate": 0.885
        }
      },
      "goalTargetHitRateDays9To12": {
        "hits": 1286,
        "survivingDays": 1533,
        "rate": 0.839
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
          "mean": 22.94,
          "stddev": 6.77,
          "median": 23,
          "p90": 31,
          "p95": 34,
          "max": 50
        },
        "2": {
          "mean": 35.76,
          "stddev": 14.77,
          "median": 33,
          "p90": 53,
          "p95": 62,
          "max": 130
        },
        "3": {
          "mean": 54.78,
          "stddev": 26.92,
          "median": 49,
          "p90": 88,
          "p95": 100,
          "max": 220
        },
        "4": {
          "mean": 70.04,
          "stddev": 36.7,
          "median": 61,
          "p90": 125,
          "p95": 139,
          "max": 251
        },
        "5": {
          "mean": 93.63,
          "stddev": 44.08,
          "median": 87,
          "p90": 157,
          "p95": 176,
          "max": 236
        },
        "6": {
          "mean": 107.16,
          "stddev": 40.33,
          "median": 106,
          "p90": 159,
          "p95": 174,
          "max": 227
        },
        "7": {
          "mean": 112.64,
          "stddev": 40.26,
          "median": 112,
          "p90": 161,
          "p95": 178,
          "max": 264
        },
        "8": {
          "mean": 119.4,
          "stddev": 41.78,
          "median": 118,
          "p90": 170,
          "p95": 190,
          "max": 349
        },
        "9": {
          "mean": 148.55,
          "stddev": 70.42,
          "median": 136,
          "p90": 235,
          "p95": 263,
          "max": 566
        },
        "10": {
          "mean": 151.6,
          "stddev": 69.19,
          "median": 142,
          "p90": 237,
          "p95": 276,
          "max": 436
        },
        "11": {
          "mean": 167.64,
          "stddev": 76.36,
          "median": 164,
          "p90": 250,
          "p95": 312,
          "max": 576
        },
        "12": {
          "mean": 185.39,
          "stddev": 86.46,
          "median": 179,
          "p90": 269,
          "p95": 335,
          "max": 697
        }
      },
      "goalRewardsGranted": 9678,
      "freeRerollsSpent": 2448,
      "dominantEligibleTagCountDistribution": {
        "1": 304,
        "2": 652,
        "3": 752,
        "4": 1046,
        "5": 1524,
        "6": 2370,
        "7": 1702,
        "8": 1063,
        "9": 832,
        "10": 405,
        "11": 238,
        "12": 62
      },
      "dominantEligibleTagCountByDay": {
        "1": {
          "mean": 1.44,
          "stddev": 0.53,
          "median": 1,
          "p90": 2,
          "p95": 2,
          "max": 3
        },
        "2": {
          "mean": 2.31,
          "stddev": 0.84,
          "median": 2,
          "p90": 3,
          "p95": 4,
          "max": 5
        },
        "3": {
          "mean": 3.23,
          "stddev": 1.24,
          "median": 3,
          "p90": 5,
          "p95": 5,
          "max": 9
        },
        "4": {
          "mean": 3.94,
          "stddev": 1.6,
          "median": 4,
          "p90": 6,
          "p95": 7,
          "max": 10
        },
        "5": {
          "mean": 4.74,
          "stddev": 1.79,
          "median": 5,
          "p90": 7,
          "p95": 8,
          "max": 10
        },
        "6": {
          "mean": 5.27,
          "stddev": 1.75,
          "median": 5,
          "p90": 8,
          "p95": 8,
          "max": 10
        },
        "7": {
          "mean": 5.48,
          "stddev": 1.77,
          "median": 6,
          "p90": 8,
          "p95": 9,
          "max": 11
        },
        "8": {
          "mean": 5.63,
          "stddev": 1.7,
          "median": 6,
          "p90": 8,
          "p95": 9,
          "max": 11
        },
        "9": {
          "mean": 6.06,
          "stddev": 1.98,
          "median": 6,
          "p90": 9,
          "p95": 10,
          "max": 12
        },
        "10": {
          "mean": 6.13,
          "stddev": 1.99,
          "median": 6,
          "p90": 9,
          "p95": 10,
          "max": 12
        },
        "11": {
          "mean": 6.32,
          "stddev": 1.98,
          "median": 6,
          "p90": 9,
          "p95": 10,
          "max": 12
        },
        "12": {
          "mean": 6.5,
          "stddev": 1.95,
          "median": 6,
          "p90": 9,
          "p95": 10,
          "max": 12
        }
      },
      "finalDominantEligibleTagCount": {
        "mean": 6.49,
        "stddev": 2.12,
        "median": 6,
        "p90": 9,
        "p95": 10,
        "max": 12
      },
      "supplierTagDistribution": {
        "antique": 7,
        "drink": 22,
        "fancy": 40,
        "food": 146,
        "fragile": 29,
        "lucky": 52,
        "perishable": 28,
        "plant": 7,
        "sweet": 4,
        "utility": 65
      },
      "finalSupplierTagCount": {
        "mean": 5.73,
        "stddev": 2.6,
        "median": 6,
        "p90": 9,
        "p95": 10,
        "max": 12
      },
      "supplierTagCountByDay": {
        "1": {
          "mean": 1.09,
          "stddev": 0.74,
          "median": 1,
          "p90": 2,
          "p95": 2,
          "max": 3
        },
        "2": {
          "mean": 1.84,
          "stddev": 1.14,
          "median": 2,
          "p90": 3,
          "p95": 4,
          "max": 5
        },
        "3": {
          "mean": 2.64,
          "stddev": 1.62,
          "median": 3,
          "p90": 5,
          "p95": 5,
          "max": 9
        },
        "4": {
          "mean": 3.24,
          "stddev": 2.05,
          "median": 3,
          "p90": 6,
          "p95": 7,
          "max": 10
        },
        "5": {
          "mean": 3.99,
          "stddev": 2.29,
          "median": 4,
          "p90": 7,
          "p95": 8,
          "max": 10
        },
        "6": {
          "mean": 4.48,
          "stddev": 2.33,
          "median": 4,
          "p90": 8,
          "p95": 8,
          "max": 10
        },
        "7": {
          "mean": 4.68,
          "stddev": 2.37,
          "median": 5,
          "p90": 8,
          "p95": 8,
          "max": 11
        },
        "8": {
          "mean": 4.82,
          "stddev": 2.33,
          "median": 5,
          "p90": 8,
          "p95": 8,
          "max": 11
        },
        "9": {
          "mean": 5.26,
          "stddev": 2.58,
          "median": 5,
          "p90": 9,
          "p95": 9,
          "max": 12
        },
        "10": {
          "mean": 5.32,
          "stddev": 2.6,
          "median": 5,
          "p90": 9,
          "p95": 10,
          "max": 12
        },
        "11": {
          "mean": 5.53,
          "stddev": 2.59,
          "median": 6,
          "p90": 9,
          "p95": 10,
          "max": 12
        },
        "12": {
          "mean": 5.72,
          "stddev": 2.57,
          "median": 6,
          "p90": 9,
          "p95": 10,
          "max": 12
        }
      }
    },
    {
      "strategy": "combo",
      "runs": 400,
      "daysSurvived": {
        "mean": 27.86,
        "stddev": 4.83,
        "median": 30,
        "p90": 33,
        "p95": 33,
        "max": 39
      },
      "totalCoinsEarned": {
        "mean": 4863.86,
        "stddev": 3006.46,
        "median": 4748,
        "p90": 8504,
        "p95": 9694,
        "max": 26140
      },
      "bestDayTotal": {
        "mean": 270.2,
        "stddev": 160.53,
        "median": 238,
        "p90": 446,
        "p95": 560,
        "max": 1354
      },
      "bestDayTotalBySignaturePickup": {
        "withSignature": {
          "mean": 351.8,
          "stddev": 195.4,
          "median": 308,
          "p90": 582,
          "p95": 728,
          "max": 1354
        },
        "withoutSignature": {
          "mean": 224.79,
          "stddev": 114.45,
          "median": 216,
          "p90": 335,
          "p95": 426,
          "max": 833
        }
      },
      "deepestRentSurvived": {
        "mean": 8.29,
        "stddev": 1.61,
        "median": 9,
        "p90": 10,
        "p95": 10,
        "max": 12
      },
      "itemsBoughtPerRun": {
        "mean": 14.19,
        "stddev": 2.14,
        "median": 15,
        "p90": 16,
        "p95": 16,
        "max": 18
      },
      "expansionsPerRun": {
        "mean": 0.92,
        "stddev": 0.28,
        "median": 1,
        "p90": 1,
        "p95": 1,
        "max": 1
      },
      "expansionRunRate": 0.917,
      "signatureItemsBoughtPerRun": {
        "mean": 0.46,
        "stddev": 0.69,
        "median": 0,
        "p90": 1,
        "p95": 2,
        "max": 3
      },
      "signaturePickupRunRate": 0.357,
      "bestDayTotalBySignatureItem": {
        "brass-scale": {
          "mean": 309.65,
          "stddev": 145.57,
          "median": 280,
          "p90": 491,
          "p95": 582,
          "max": 900
        },
        "consignment-sign": {
          "mean": 536.05,
          "stddev": 223.34,
          "median": 468,
          "p90": 900,
          "p95": 1020,
          "max": 1354
        },
        "ledger-book": {
          "mean": 237.71,
          "stddev": 145.23,
          "median": 216,
          "p90": 513,
          "p95": 662,
          "max": 662
        },
        "lucky-cat": {
          "mean": 338.63,
          "stddev": 159.26,
          "median": 313,
          "p90": 560,
          "p95": 666,
          "max": 767
        },
        "window-display": {
          "mean": 347.21,
          "stddev": 285.58,
          "median": 282,
          "p90": 380,
          "p95": 1354,
          "max": 1354
        }
      },
      "signatureDominance": {
        "maxMedianItemId": "consignment-sign",
        "maxMedian": 468,
        "allSignatureMedian": 308,
        "maxToMedianRatio": 1.519
      },
      "boardOccupancyByDay": {
        "1": {
          "mean": 2.5,
          "stddev": 0.5,
          "median": 2,
          "p90": 3,
          "p95": 3,
          "max": 3
        },
        "2": {
          "mean": 4.46,
          "stddev": 0.99,
          "median": 4,
          "p90": 6,
          "p95": 6,
          "max": 8
        },
        "3": {
          "mean": 6.54,
          "stddev": 1.68,
          "median": 6,
          "p90": 9,
          "p95": 10,
          "max": 12
        },
        "4": {
          "mean": 7.85,
          "stddev": 2.36,
          "median": 8,
          "p90": 12,
          "p95": 12,
          "max": 12
        },
        "5": {
          "mean": 9.59,
          "stddev": 2.3,
          "median": 10,
          "p90": 12,
          "p95": 12,
          "max": 12
        },
        "6": {
          "mean": 10.74,
          "stddev": 1.84,
          "median": 12,
          "p90": 12,
          "p95": 12,
          "max": 12
        },
        "7": {
          "mean": 11.11,
          "stddev": 1.65,
          "median": 12,
          "p90": 12,
          "p95": 12,
          "max": 12
        },
        "8": {
          "mean": 11.53,
          "stddev": 1.18,
          "median": 12,
          "p90": 12,
          "p95": 12,
          "max": 12
        },
        "9": {
          "mean": 13.03,
          "stddev": 2.02,
          "median": 12,
          "p90": 16,
          "p95": 16,
          "max": 16
        },
        "10": {
          "mean": 13.28,
          "stddev": 2.03,
          "median": 12,
          "p90": 16,
          "p95": 16,
          "max": 16
        },
        "11": {
          "mean": 13.96,
          "stddev": 2.01,
          "median": 14,
          "p90": 16,
          "p95": 16,
          "max": 16
        },
        "12": {
          "mean": 14.51,
          "stddev": 1.88,
          "median": 16,
          "p90": 16,
          "p95": 16,
          "max": 16
        }
      },
      "coinsBeforeScoringByDay": {
        "1": {
          "mean": 0.84,
          "stddev": 1.09,
          "median": 0,
          "p90": 3,
          "p95": 3,
          "max": 4
        },
        "2": {
          "mean": 3.16,
          "stddev": 2.34,
          "median": 3,
          "p90": 7,
          "p95": 7,
          "max": 9
        },
        "3": {
          "mean": 5.22,
          "stddev": 4.02,
          "median": 5,
          "p90": 11,
          "p95": 12,
          "max": 14
        },
        "4": {
          "mean": 11.48,
          "stddev": 20.04,
          "median": 7,
          "p90": 18,
          "p95": 44,
          "max": 247
        },
        "5": {
          "mean": 38.92,
          "stddev": 60.8,
          "median": 13,
          "p90": 135,
          "p95": 189,
          "max": 413
        },
        "6": {
          "mean": 96.67,
          "stddev": 114.15,
          "median": 37,
          "p90": 282,
          "p95": 334,
          "max": 655
        },
        "7": {
          "mean": 155.18,
          "stddev": 156.26,
          "median": 119,
          "p90": 374,
          "p95": 456,
          "max": 863
        },
        "8": {
          "mean": 251.99,
          "stddev": 209.66,
          "median": 232,
          "p90": 543,
          "p95": 621,
          "max": 1367
        },
        "9": {
          "mean": 158.93,
          "stddev": 123.13,
          "median": 127,
          "p90": 295,
          "p95": 357,
          "max": 1143
        },
        "10": {
          "mean": 234.2,
          "stddev": 169.49,
          "median": 197,
          "p90": 442,
          "p95": 554,
          "max": 1373
        },
        "11": {
          "mean": 320.83,
          "stddev": 249.53,
          "median": 229,
          "p90": 669,
          "p95": 778,
          "max": 1982
        },
        "12": {
          "mean": 439.13,
          "stddev": 351.65,
          "median": 302,
          "p90": 922,
          "p95": 1024,
          "max": 2761
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
          "max": 0.16
        },
        "2": {
          "mean": 0.13,
          "stddev": 0.09,
          "median": 0.12,
          "p90": 0.28,
          "p95": 0.28,
          "max": 0.36
        },
        "3": {
          "mean": 0.21,
          "stddev": 0.16,
          "median": 0.2,
          "p90": 0.44,
          "p95": 0.48,
          "max": 0.56
        },
        "4": {
          "mean": 0.32,
          "stddev": 0.56,
          "median": 0.194,
          "p90": 0.5,
          "p95": 1.222,
          "max": 6.861
        },
        "5": {
          "mean": 1.08,
          "stddev": 1.69,
          "median": 0.361,
          "p90": 3.75,
          "p95": 5.25,
          "max": 11.472
        },
        "6": {
          "mean": 2.69,
          "stddev": 3.17,
          "median": 1.028,
          "p90": 7.833,
          "p95": 9.278,
          "max": 18.194
        },
        "7": {
          "mean": 3.04,
          "stddev": 3.06,
          "median": 2.333,
          "p90": 7.333,
          "p95": 8.941,
          "max": 16.922
        },
        "8": {
          "mean": 4.94,
          "stddev": 4.11,
          "median": 4.549,
          "p90": 10.647,
          "p95": 12.176,
          "max": 26.804
        },
        "9": {
          "mean": 3.12,
          "stddev": 2.41,
          "median": 2.49,
          "p90": 5.784,
          "p95": 7,
          "max": 22.412
        },
        "10": {
          "mean": 2.63,
          "stddev": 1.9,
          "median": 2.213,
          "p90": 4.966,
          "p95": 6.225,
          "max": 15.427
        },
        "11": {
          "mean": 3.6,
          "stddev": 2.8,
          "median": 2.573,
          "p90": 7.517,
          "p95": 8.742,
          "max": 22.27
        },
        "12": {
          "mean": 4.93,
          "stddev": 3.95,
          "median": 3.393,
          "p90": 10.36,
          "p95": 11.506,
          "max": 31.022
        }
      },
      "dayTotalByDay": {
        "1": {
          "mean": 23.57,
          "stddev": 6.93,
          "median": 24,
          "p90": 32,
          "p95": 35,
          "max": 50
        },
        "2": {
          "mean": 35.77,
          "stddev": 14.32,
          "median": 34,
          "p90": 53,
          "p95": 64,
          "max": 103
        },
        "3": {
          "mean": 58.26,
          "stddev": 30.95,
          "median": 52,
          "p90": 97,
          "p95": 120,
          "max": 306
        },
        "4": {
          "mean": 74.04,
          "stddev": 40.04,
          "median": 64,
          "p90": 131,
          "p95": 154,
          "max": 222
        },
        "5": {
          "mean": 94.56,
          "stddev": 46.67,
          "median": 89,
          "p90": 152,
          "p95": 175,
          "max": 448
        },
        "6": {
          "mean": 108.83,
          "stddev": 46.92,
          "median": 104,
          "p90": 167,
          "p95": 190,
          "max": 309
        },
        "7": {
          "mean": 114.6,
          "stddev": 49.34,
          "median": 109,
          "p90": 176,
          "p95": 199,
          "max": 531
        },
        "8": {
          "mean": 119.17,
          "stddev": 45.22,
          "median": 115,
          "p90": 179,
          "p95": 202,
          "max": 374
        },
        "9": {
          "mean": 147.93,
          "stddev": 68.99,
          "median": 137,
          "p90": 230,
          "p95": 281,
          "max": 501
        },
        "10": {
          "mean": 154.96,
          "stddev": 83.25,
          "median": 139,
          "p90": 235,
          "p95": 300,
          "max": 816
        },
        "11": {
          "mean": 175.79,
          "stddev": 102.97,
          "median": 163,
          "p90": 270,
          "p95": 354,
          "max": 1016
        },
        "12": {
          "mean": 189.26,
          "stddev": 98.77,
          "median": 171,
          "p90": 297,
          "p95": 398,
          "max": 744
        }
      },
      "itemsBoughtByDay": {
        "1": {
          "mean": 1.5,
          "stddev": 0.5,
          "median": 1,
          "p90": 2,
          "p95": 2,
          "max": 2
        },
        "2": {
          "mean": 1.97,
          "stddev": 0.78,
          "median": 2,
          "p90": 3,
          "p95": 3,
          "max": 5
        },
        "3": {
          "mean": 2.16,
          "stddev": 0.98,
          "median": 2,
          "p90": 3,
          "p95": 4,
          "max": 7
        },
        "4": {
          "mean": 1.34,
          "stddev": 1.14,
          "median": 1,
          "p90": 3,
          "p95": 4,
          "max": 5
        },
        "5": {
          "mean": 1.79,
          "stddev": 1.03,
          "median": 2,
          "p90": 3,
          "p95": 3,
          "max": 4
        },
        "6": {
          "mean": 1.18,
          "stddev": 1.08,
          "median": 1,
          "p90": 3,
          "p95": 3,
          "max": 5
        },
        "7": {
          "mean": 0.39,
          "stddev": 0.61,
          "median": 0,
          "p90": 1,
          "p95": 2,
          "max": 3
        },
        "8": {
          "mean": 0.42,
          "stddev": 0.73,
          "median": 0,
          "p90": 2,
          "p95": 2,
          "max": 3
        },
        "9": {
          "mean": 1.51,
          "stddev": 1.58,
          "median": 1,
          "p90": 4,
          "p95": 4,
          "max": 4
        },
        "10": {
          "mean": 0.23,
          "stddev": 0.47,
          "median": 0,
          "p90": 1,
          "p95": 1,
          "max": 2
        },
        "11": {
          "mean": 0.69,
          "stddev": 0.96,
          "median": 0,
          "p90": 2,
          "p95": 3,
          "max": 4
        },
        "12": {
          "mean": 0.55,
          "stddev": 0.91,
          "median": 0,
          "p90": 2,
          "p95": 2,
          "max": 4
        }
      },
      "gameOverRate": 1,
      "diedAtRentCycle": {
        "mean": 9.29,
        "stddev": 1.61,
        "median": 10,
        "p90": 11,
        "p95": 11,
        "max": 13
      },
      "namedComboRunRate": 0.915,
      "orderFillRate": 0.493,
      "spotlightHitRate": 0.991,
      "synergyFireDayRate": 0.918,
      "synergyFireRate": 0.686,
      "synergyFiresPerScoredDay": 8.925,
      "goalTargetHitRate": 0.885,
      "goalTargetHitRateByDay": {
        "1": {
          "hits": 301,
          "survivingDays": 400,
          "rate": 0.752
        },
        "2": {
          "hits": 267,
          "survivingDays": 400,
          "rate": 0.667
        },
        "3": {
          "hits": 275,
          "survivingDays": 400,
          "rate": 0.688
        },
        "4": {
          "hits": 298,
          "survivingDays": 396,
          "rate": 0.753
        },
        "5": {
          "hits": 304,
          "survivingDays": 396,
          "rate": 0.768
        },
        "6": {
          "hits": 322,
          "survivingDays": 396,
          "rate": 0.813
        },
        "7": {
          "hits": 322,
          "survivingDays": 396,
          "rate": 0.813
        },
        "8": {
          "hits": 329,
          "survivingDays": 396,
          "rate": 0.831
        },
        "9": {
          "hits": 329,
          "survivingDays": 396,
          "rate": 0.831
        },
        "10": {
          "hits": 322,
          "survivingDays": 394,
          "rate": 0.817
        },
        "11": {
          "hits": 332,
          "survivingDays": 394,
          "rate": 0.843
        },
        "12": {
          "hits": 352,
          "survivingDays": 394,
          "rate": 0.893
        }
      },
      "goalTargetHitRateDays9To12": {
        "hits": 1335,
        "survivingDays": 1578,
        "rate": 0.846
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
          "mean": 23.57,
          "stddev": 6.93,
          "median": 24,
          "p90": 32,
          "p95": 35,
          "max": 50
        },
        "2": {
          "mean": 35.77,
          "stddev": 14.32,
          "median": 34,
          "p90": 53,
          "p95": 64,
          "max": 103
        },
        "3": {
          "mean": 58.26,
          "stddev": 30.95,
          "median": 52,
          "p90": 97,
          "p95": 120,
          "max": 306
        },
        "4": {
          "mean": 74.04,
          "stddev": 40.04,
          "median": 64,
          "p90": 131,
          "p95": 154,
          "max": 222
        },
        "5": {
          "mean": 94.56,
          "stddev": 46.67,
          "median": 89,
          "p90": 152,
          "p95": 175,
          "max": 448
        },
        "6": {
          "mean": 108.83,
          "stddev": 46.92,
          "median": 104,
          "p90": 167,
          "p95": 190,
          "max": 309
        },
        "7": {
          "mean": 114.6,
          "stddev": 49.34,
          "median": 109,
          "p90": 176,
          "p95": 199,
          "max": 531
        },
        "8": {
          "mean": 119.17,
          "stddev": 45.22,
          "median": 115,
          "p90": 179,
          "p95": 202,
          "max": 374
        },
        "9": {
          "mean": 147.93,
          "stddev": 68.99,
          "median": 137,
          "p90": 230,
          "p95": 281,
          "max": 501
        },
        "10": {
          "mean": 154.96,
          "stddev": 83.25,
          "median": 139,
          "p90": 235,
          "p95": 300,
          "max": 816
        },
        "11": {
          "mean": 175.79,
          "stddev": 102.97,
          "median": 163,
          "p90": 270,
          "p95": 354,
          "max": 1016
        },
        "12": {
          "mean": 189.26,
          "stddev": 98.77,
          "median": 171,
          "p90": 297,
          "p95": 398,
          "max": 744
        }
      },
      "goalRewardsGranted": 9864,
      "freeRerollsSpent": 2414,
      "dominantEligibleTagCountDistribution": {
        "1": 283,
        "2": 628,
        "3": 676,
        "4": 960,
        "5": 1494,
        "6": 2033,
        "7": 1902,
        "8": 1286,
        "9": 1063,
        "10": 566,
        "11": 234,
        "12": 20
      },
      "dominantEligibleTagCountByDay": {
        "1": {
          "mean": 1.48,
          "stddev": 0.53,
          "median": 1,
          "p90": 2,
          "p95": 2,
          "max": 3
        },
        "2": {
          "mean": 2.42,
          "stddev": 0.9,
          "median": 2,
          "p90": 4,
          "p95": 4,
          "max": 5
        },
        "3": {
          "mean": 3.46,
          "stddev": 1.28,
          "median": 3,
          "p90": 5,
          "p95": 6,
          "max": 7
        },
        "4": {
          "mean": 4.15,
          "stddev": 1.75,
          "median": 4,
          "p90": 7,
          "p95": 7,
          "max": 10
        },
        "5": {
          "mean": 4.89,
          "stddev": 1.86,
          "median": 5,
          "p90": 7,
          "p95": 8,
          "max": 10
        },
        "6": {
          "mean": 5.42,
          "stddev": 1.83,
          "median": 5,
          "p90": 8,
          "p95": 9,
          "max": 10
        },
        "7": {
          "mean": 5.6,
          "stddev": 1.83,
          "median": 6,
          "p90": 8,
          "p95": 9,
          "max": 10
        },
        "8": {
          "mean": 5.78,
          "stddev": 1.72,
          "median": 6,
          "p90": 8,
          "p95": 9,
          "max": 10
        },
        "9": {
          "mean": 6.22,
          "stddev": 1.91,
          "median": 6,
          "p90": 9,
          "p95": 10,
          "max": 11
        },
        "10": {
          "mean": 6.31,
          "stddev": 1.94,
          "median": 6,
          "p90": 9,
          "p95": 10,
          "max": 11
        },
        "11": {
          "mean": 6.54,
          "stddev": 1.98,
          "median": 6,
          "p90": 9,
          "p95": 10,
          "max": 12
        },
        "12": {
          "mean": 6.72,
          "stddev": 1.94,
          "median": 7,
          "p90": 9,
          "p95": 10,
          "max": 12
        }
      },
      "finalDominantEligibleTagCount": {
        "mean": 6.82,
        "stddev": 1.99,
        "median": 7,
        "p90": 9,
        "p95": 10,
        "max": 12
      },
      "supplierTagDistribution": {
        "antique": 3,
        "drink": 26,
        "fancy": 38,
        "food": 151,
        "fragile": 32,
        "lucky": 54,
        "perishable": 22,
        "plant": 6,
        "utility": 68
      },
      "finalSupplierTagCount": {
        "mean": 6.11,
        "stddev": 2.61,
        "median": 6,
        "p90": 9,
        "p95": 10,
        "max": 12
      },
      "supplierTagCountByDay": {
        "1": {
          "mean": 1.19,
          "stddev": 0.73,
          "median": 1,
          "p90": 2,
          "p95": 2,
          "max": 3
        },
        "2": {
          "mean": 2,
          "stddev": 1.19,
          "median": 2,
          "p90": 4,
          "p95": 4,
          "max": 5
        },
        "3": {
          "mean": 2.92,
          "stddev": 1.67,
          "median": 3,
          "p90": 5,
          "p95": 6,
          "max": 7
        },
        "4": {
          "mean": 3.56,
          "stddev": 2.16,
          "median": 3,
          "p90": 7,
          "p95": 7,
          "max": 10
        },
        "5": {
          "mean": 4.28,
          "stddev": 2.32,
          "median": 4,
          "p90": 7,
          "p95": 8,
          "max": 10
        },
        "6": {
          "mean": 4.8,
          "stddev": 2.36,
          "median": 5,
          "p90": 8,
          "p95": 9,
          "max": 10
        },
        "7": {
          "mean": 4.96,
          "stddev": 2.36,
          "median": 5,
          "p90": 8,
          "p95": 9,
          "max": 10
        },
        "8": {
          "mean": 5.1,
          "stddev": 2.32,
          "median": 5,
          "p90": 8,
          "p95": 9,
          "max": 10
        },
        "9": {
          "mean": 5.53,
          "stddev": 2.52,
          "median": 6,
          "p90": 9,
          "p95": 10,
          "max": 11
        },
        "10": {
          "mean": 5.63,
          "stddev": 2.56,
          "median": 6,
          "p90": 9,
          "p95": 10,
          "max": 11
        },
        "11": {
          "mean": 5.86,
          "stddev": 2.6,
          "median": 6,
          "p90": 9,
          "p95": 10,
          "max": 12
        },
        "12": {
          "mean": 6.04,
          "stddev": 2.57,
          "median": 6,
          "p90": 9,
          "p95": 10,
          "max": 12
        }
      }
    }
  ],
  "elapsedMs": 168177
}
```

## 6. Mutation check output

```text
(node:36410) ExperimentalWarning: CommonJS module /Users/gentlegen/Desktop/lucky-shelf/node_modules/.pnpm/vitest@4.1.9_@types+node@26.1.0_vite@8.1.3_@types+node@26.1.0_esbuild@0.28.1_terser@5.48.0_tsx@4.23.0_yaml@2.9.0_/node_modules/vitest/dist/config.cjs is loading ES Module /Users/gentlegen/Desktop/lucky-shelf/node_modules/.pnpm/std-env@4.1.0/node_modules/std-env/dist/index.mjs using require().
Support for loading ES Module in require() is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)

 RUN  v4.1.9 /Users/gentlegen/Desktop/lucky-shelf

 ❯ src/sim/loopV2.test.ts (10 tests | 1 failed | 9 skipped) 16ms
     × expands a loop-v2 run from 3x4 to 4x4 exactly once at exact cost 15ms

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  src/sim/loopV2.test.ts > shelf expansion coin sink > expands a loop-v2 run from 3x4 to 4x4 exactly once at exact cost
AssertionError: expected 250 to be +0 // Object.is equality

- Expected
+ Received

- 0
+ 250

 ❯ src/sim/loopV2.test.ts:188:27
    186|       const after = dispatch(state, { type: 'expandShelf' }, deps);
    187|
    188|       expect(after.coins).toBe(0);
       |                           ^
    189|       expect(after.shelf.size).toEqual({ rows: 4, cols: 4 });
    190|       expect(after.shelf.slots).toHaveLength(16);
 ❯ withShelfExpansion src/sim/loopV2.test.ts:36:12
 ❯ src/sim/loopV2.test.ts:179:28
 ❯ withLoopV2 src/sim/loopV2.test.ts:24:12
 ❯ src/sim/loopV2.test.ts:179:5

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


 Test Files  1 failed (1)
      Tests  1 failed | 9 skipped (10)
   Start at  21:15:56
   Duration  1.37s (transform 503ms, setup 0ms, import 758ms, tests 16ms, environment 0ms)
```

After restoring the real branch, the focused restore check passed:

```text
(node:37866) ExperimentalWarning: CommonJS module /Users/gentlegen/Desktop/lucky-shelf/node_modules/.pnpm/vitest@4.1.9_@types+node@26.1.0_vite@8.1.3_@types+node@26.1.0_esbuild@0.28.1_terser@5.48.0_tsx@4.23.0_yaml@2.9.0_/node_modules/vitest/dist/config.cjs is loading ES Module /Users/gentlegen/Desktop/lucky-shelf/node_modules/.pnpm/std-env@4.1.0/node_modules/std-env/dist/index.mjs using require().
Support for loading ES Module in require() is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)

 RUN  v4.1.9 /Users/gentlegen/Desktop/lucky-shelf


 Test Files  1 passed (1)
      Tests  10 passed (10)
   Start at  21:16:15
   Duration  1.88s (transform 522ms, setup 0ms, import 754ms, tests 553ms, environment 0ms)
```

## 7. Known issues + spec deviations

- No M6a spec deviations.
- The local worktree contains unrelated UI/catalog changes from outside this task. I left them in place except for the one-line nullable sprite source type narrowing in `src/app/index.tsx`, which was required for the exact `tsc --noEmit` command to pass.
- Goal ladder drift remains for Fable to rule on. I did not retune `GOAL_LADDER_TARGETS`.

## 8. Questions for Fable

- Confirm `SHELF_EXPANSION_COST = 250` as the reviewed M6a provisional cost.
- Confirm whether the goal-target hit rates in the 400-run drift report should trigger a later goal table retune.

## 9. Contract change request

- CCR: additive `Action` variant `{ type: 'expandShelf' }` with no payload. Old fixtures parse unchanged; expanded states round-trip through `GameStateSchema.parse(JSON round-trip)`. No schema version bump.

## 10. Stop point

STOP - `SHELF_EXPANSION_ENABLED` remains default OFF. No graduation, no sign-off claimed; Fable reviews this packet.
