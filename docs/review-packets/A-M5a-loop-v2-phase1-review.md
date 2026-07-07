# A-M5a Review Packet - Loop Redesign v2 Phase 1

## 1. Built vs. Phase 1 criteria

- Added `LOOP_V2_ENABLED` in `src/sim/economy.ts`, default OFF. Runtime test/fuzz toggle is `LOOP_V2_ENABLED=1`.
- Flag OFF keeps the current loop: day-1 delivery, 3 free delivery offers, restock only after every 3rd scored day, old restock offer count/costs.
- Flag ON starts day 1 with 8 coins and the existing free 1-of-3 delivery as the opening hand. After that starter is placed, the run routes into a paid daily shop.
- Flag ON uses `restock` as the daily-shop phase: 4 paid offers, `buyOffer`, `placeItem`, `reroll`, `sellItem`, `moveItem`, then `endRestock`.
- Flag ON changes `endRestock` to return to `arrange`; `openShop` then scores the day and routes the next day back to `restock`.
- Rent sawtooth, scoring, `GameState`, `Action`, and `ScoringTrace` schemas are unchanged. No ContractSchemaVersion bump.
- Added fuzz metrics for `itemsBoughtPerRun`, `boardOccupancyByDay`, and `itemsBoughtByDay`.
- Added focused v2 tests for daily-shop routing, buy-multiple/place, starter/starting coins once, default-off behavior, and same-seed v2-vs-v1 faster fill arc.

## 2. Exact commands run

```sh
PATH="$HOME/.nvm/versions/node/v20.19.4/bin:$PATH" node_modules/.bin/tsc --noEmit
PATH="$HOME/.nvm/versions/node/v20.19.4/bin:$PATH" node_modules/.bin/vitest run
PATH="$HOME/.nvm/versions/node/v20.19.4/bin:$PATH" node --import tsx scripts/fuzz.ts --runs 100 --strategy all --seed loop-v2-off
PATH="$HOME/.nvm/versions/node/v20.19.4/bin:$PATH" LOOP_V2_ENABLED=1 node --import tsx scripts/fuzz.ts --runs 100 --strategy all --seed loop-v2-on
```

Mutation-style check:

```sh
# Temporarily changed the v2 openShop rollover back to delivery, then ran:
PATH="$HOME/.nvm/versions/node/v20.19.4/bin:$PATH" node_modules/.bin/vitest run src/sim/loopV2.test.ts --testNamePattern "routes the day-one starter"
```

## 3. Test / fuzz / determinism output

```text
tsc --noEmit: clean
vitest run: 14 files passed, 71 tests passed
M0 goldens: covered by src/sim/goldens.test.ts in the full run; fixtures remain byte-identical with flag OFF.
Mutation check: failed as expected with "expected 'delivery' to be 'restock'" at src/sim/loopV2.test.ts:78, then passed after restoration.
```

### Fuzz OFF - `LOOP_V2_ENABLED=false`

```json
{
  "seedPrefix": "loop-v2-off",
  "loopV2Enabled": false,
  "greedy": {
    "daysSurvivedMedian": 27,
    "deepestRentSurvivedMedian": 8,
    "totalCoinsEarnedMedian": 2084,
    "itemsBoughtPerRunMedian": 3,
    "boardOccupancyMedianByDay": { "1": 1, "2": 2, "3": 3, "4": 5, "5": 6, "6": 7, "7": 9, "8": 10 },
    "itemsBoughtMedianByDay": { "1": 0, "2": 0, "3": 0, "4": 1, "5": 0, "6": 0, "7": 1, "8": 0 }
  },
  "combo": {
    "daysSurvivedMedian": 27,
    "deepestRentSurvivedMedian": 8,
    "totalCoinsEarnedMedian": 1979,
    "itemsBoughtPerRunMedian": 3,
    "boardOccupancyMedianByDay": { "1": 1, "2": 2, "3": 3, "4": 5, "5": 6, "6": 7, "7": 9, "8": 10 },
    "itemsBoughtMedianByDay": { "1": 0, "2": 0, "3": 0, "4": 1, "5": 0, "6": 0, "7": 1, "8": 0 }
  }
}
```

### Fuzz ON - `LOOP_V2_ENABLED=1`

```json
{
  "seedPrefix": "loop-v2-on",
  "loopV2Enabled": true,
  "greedy": {
    "daysSurvivedMedian": 27,
    "deepestRentSurvivedMedian": 8,
    "totalCoinsEarnedMedian": 2200,
    "itemsBoughtPerRunMedian": 11,
    "boardOccupancyMedianByDay": { "1": 3, "2": 4, "3": 6, "4": 7, "5": 9, "6": 11, "7": 12, "8": 12 },
    "itemsBoughtMedianByDay": { "1": 2, "2": 2, "3": 2, "4": 1, "5": 2, "6": 1, "7": 0, "8": 0 }
  },
  "combo": {
    "daysSurvivedMedian": 27,
    "deepestRentSurvivedMedian": 8,
    "totalCoinsEarnedMedian": 2213,
    "itemsBoughtPerRunMedian": 11,
    "boardOccupancyMedianByDay": { "1": 2, "2": 4, "3": 6, "4": 7, "5": 9, "6": 11, "7": 12, "8": 12 },
    "itemsBoughtMedianByDay": { "1": 1, "2": 2, "3": 2, "4": 1, "5": 2, "6": 1, "7": 0, "8": 0 }
  }
}
```

Fuzz read: day-3 median occupancy moves from 3 items to 6 items. Greedy and combo both median deepest rent 8; median total coins are within 1.01x, so neither dominates by >2x.

## 4. Known issues + spec deviations

- The v2 daily shop reuses the `restock` phase and `/restock` route. This is intentional for Phase 1; Lane B can retitle or replace that screen without a contract change.
- The day-1 opening hand is implemented as the existing 1-of-3 delivery. The paid shop appears immediately after placing that starter, before the first `openShop`.
- Random bot remains poor because it can sell/skip nonsensically; Phase 1 acceptance is based on greedy + combo.
- The v2 cost curve is provisional: `dailyShopCost = max(3, baseValue * 2 + tier + (day - 1) * 5)`. This is the current fuzz-tuned surface, not a final Fable balance ruling.

## 5. Questions for Fable

- Confirm the day-aware v2 shop cost curve is acceptable as a Phase 1 tuning surface, or provide target medians for day-1/day-2/day-3 buys.
- Confirm the free day-1 starter should remain a 1-of-3 choice instead of a single deterministic starter item.
- Confirm `/restock` should be renamed/presented as Daily Shop by Lane B, or whether a distinct `/shop` route is preferred before screen work starts.

## 6. Contract change requests

- CCR: Economy + phase-flow change, additive/flagged only. `LOOP_V2_ENABLED` default OFF preserves the current loop. ON changes starting coins, restock offer count/costs, post-starter routing, post-score routing, and `endRestock` destination.
- No `GameState`, `Action`, `TraceEvent`, or schema-version change was made. The existing `DeliveryOffer.cost`, `currentOffers`, `heldItem`, `coins`, and `phase: 'restock'` contract surface carries the daily shop.
- Needs Fable sign-off before the flag can graduate or default ON.

## 7. Lane B handoff

- Route to use now: `/restock`, driven by `GameState.phase === 'restock'`.
- Screen identity under v2: treat `restock` as the daily paid shop, not a once-per-cycle special shop.
- Selectors already available: `runSelectors.phase`, `coins`, `offers`, `shelf`, `moves`, `lastRejectedAction`, `rejectedActionCount`, and full `gameState`.
- Shop state shape:
  - `gameState.currentOffers`: up to 4 `DeliveryOffer`s with `cost > 0` when v2 is ON.
  - `gameState.coins`: spendable coins.
  - `gameState.heldItem`: non-null after `buyOffer`; the player must place it before buying/rerolling/ending.
  - `gameState.shelf`: authoritative placement grid for `placeItem`, `moveItem`, and `sellItem`.
- Actions:
  - `buyOffer({ offerIndex })`: subtracts offer cost, puts bought item in `heldItem`, removes the offer.
  - `placeItem({ slot })`: places `heldItem`; during v2 day-1 starter placement this routes to the first daily shop.
  - `reroll()`: costs `REROLL_COST` (2), refreshes current shop offers deterministically.
  - `sellItem({ slot })` and `moveItem({ from, to })`: legal in restock as today.
  - `endRestock()`: in v2, clears offers and routes to `arrange` for the same day; in v1, routes to `delivery`.
  - `openShop()`: still only legal from `arrange`; after scoring in v2, the next day is a new `restock` shop.
- Day-1 v2 sequence:
  1. `delivery`: 3 free starter offers, costs 0.
  2. `draftItem` then `placeItem`: phase becomes `restock`, day remains 1, coins remain 8 minus any later purchases.
  3. Buy/place zero or more paid offers.
  4. `endRestock`: phase becomes `arrange`.
  5. `openShop`: scores day 1, then phase becomes `restock` for day 2.

## 8. Stop point

STOP - flag remains OFF by default and reversible until Fable signs off and the relay accepts the device feel-gate.
