# A-M4b Review Packet — Depth-levers prototype stewardship

## 1. Built vs. milestone criteria

- **Spotlight behavioral coverage:** added `src/sim/depthLevers.test.ts` coverage for an occupied Front Window slot multiplying that slot's final total by `SPOTLIGHT_MULT` and emitting `ruleFire` with `ruleId: 'spotlight'` in that slot's window.
- **Spotlight no-op coverage:** added empty-slot and blocked-slot cases. An empty spotlight leaves the trace/day total unchanged; a blocked spotlight slot emits no `spotlight` event and stays at total `0`.
- **Today's Order behavioral coverage:** added count-met coverage using `DEMAND_COUNT` and `DEMAND_MULT`, with one `ruleFire` `ruleId: 'order'` per matching item. Added count-short coverage with no `order` event.
- **Combined branch ordering:** added a same-slot order+spotlight test proving `order` fires before `spotlight`, and the final total is `floor(floor(base * DEMAND_MULT) * SPOTLIGHT_MULT)`.
- **Determinism coverage:** exported `pickSpotlight` and `pickCycleOrder` from `src/sim/engine.ts` for direct tests. Added assertions that cycle orders are stable within a rent cycle and rotate after rent-cycle reset for a deterministic seed, and that spotlight picks rotate by day.
- **Golden safety:** extended `src/sim/goldens.test.ts` to assert M0 fixtures omit both `spotlight` and `dailyOrder`, then reproduce byte-identical traces. No M0 fixture was edited; the branches are dead for those fixture states.
- **Fuzz instrumentation:** extended `BotRun.metrics` and `scripts/fuzz.ts` with backward-compatible `orderFillRate` and `spotlightHitRate` keys per strategy.

## 2. Commands + output

`PATH="$HOME/.nvm/versions/node/v20.19.4/bin:$PATH" node_modules/.bin/tsc --noEmit`

```text
clean
```

`PATH="$HOME/.nvm/versions/node/v20.19.4/bin:$PATH" node_modules/.bin/vitest run`

```text
Test Files  12 passed (12)
Tests       64 passed (64)
```

Focused depth-lever mutation check:

```text
Temporarily disabled both scoring branches by changing the two branch guards in
src/sim/scoring.ts to `false && ...`, then ran:

PATH="$HOME/.nvm/versions/node/v20.19.4/bin:$PATH" node_modules/.bin/vitest run src/sim/depthLevers.test.ts

Result: 3 failures, exactly on the occupied spotlight total/event, order total/event,
and combined order-before-spotlight assertions. Restored the production guards and
reran the file: 5 passed (5).
```

## 3. Fuzz output

`PATH="$HOME/.nvm/versions/node/v20.19.4/bin:$PATH" node --import tsx scripts/fuzz.ts --runs 100 --strategy all --seed m4b-levers --max-actions 400`

```json
{
  "generatedAt": "2026-07-07T14:30:36.157Z",
  "seedPrefix": "m4b-levers",
  "maxActions": 400,
  "results": [
    {
      "strategy": "random",
      "runs": 100,
      "daysSurvived": { "mean": 3, "median": 3, "p90": 3, "max": 3 },
      "totalCoinsEarned": { "mean": 5.25, "median": 3, "p90": 16, "max": 26 },
      "bestDayTotal": { "mean": 3.65, "median": 2, "p90": 9, "max": 18 },
      "deepestRentSurvived": { "mean": 0, "median": 0, "p90": 0, "max": 0 },
      "gameOverRate": 1,
      "diedAtRentCycle": { "mean": 1, "median": 1, "p90": 1, "max": 1 },
      "namedComboRunRate": 0,
      "orderFillRate": 0,
      "spotlightHitRate": 0.063
    },
    {
      "strategy": "greedy",
      "runs": 100,
      "daysSurvived": { "mean": 27.81, "median": 27, "p90": 30, "max": 30 },
      "totalCoinsEarned": { "mean": 2181.46, "median": 2062, "p90": 2793, "max": 3292 },
      "bestDayTotal": { "mean": 140.2, "median": 133, "p90": 205, "max": 320 },
      "deepestRentSurvived": { "mean": 8.27, "median": 8, "p90": 9, "max": 9 },
      "gameOverRate": 1,
      "diedAtRentCycle": { "mean": 9.27, "median": 9, "p90": 10, "max": 10 },
      "namedComboRunRate": 1,
      "orderFillRate": 0.443,
      "spotlightHitRate": 0.991
    },
    {
      "strategy": "combo",
      "runs": 100,
      "daysSurvived": { "mean": 27.54, "median": 27, "p90": 30, "max": 30 },
      "totalCoinsEarned": { "mean": 2135.64, "median": 2039, "p90": 2790, "max": 3475 },
      "bestDayTotal": { "mean": 129.88, "median": 131, "p90": 173, "max": 212 },
      "deepestRentSurvived": { "mean": 8.18, "median": 8, "p90": 9, "max": 9 },
      "gameOverRate": 1,
      "diedAtRentCycle": { "mean": 9.18, "median": 9, "p90": 10, "max": 10 },
      "namedComboRunRate": 0.99,
      "orderFillRate": 0.455,
      "spotlightHitRate": 0.997
    }
  ],
  "elapsedMs": 29438
}
```

## 4. Known issues + spec deviations

- These mechanics remain prototypes behind `SPOTLIGHT_ENABLED` and `DEMAND_ENABLED`. Magnitudes, count, cadence, and whether they graduate are not Lane A calls.
- `pickSpotlight` and `pickCycleOrder` are now exported from `src/sim/engine.ts` for deterministic test coverage. They are still sim internals; no UI code should import them.
- The M0 fixture safety test proves the current fixture states omit prototype fields and remain byte-identical. I did not edit fixtures or add spotlight/order into goldens.
- Existing dirty Lane B presentation files (`src/app/run.tsx`, `src/juice/ShelfScene.tsx`) were not touched.

## 5. Questions for Fable

- Please confirm whether the additive optional `GameState.spotlight` / `GameState.dailyOrder` fields and the new scoring-order insertion are acceptable as a flagged prototype surface, or whether these should be backed out until formally promoted.
- If the levers survive the device feel-gate, should `DailyOrder` be renamed before contract graduation? "Today's Order" currently lasts a rent cycle, not a single day.

## 6. Contract change requests

- **CCR — flagged prototype fields:** `GameState` now has additive optional `spotlight?: Slot | null` and `dailyOrder?: DailyOrder | null`; `DailyOrderSchema` is `{ tag: string, count: positiveInt }`.
- **CCR — scoring-order insertion:** after incoming/own multipliers and ambient auras, matching items receive Today's Order multiplier (`ruleId: 'order'`), then the Front Window spotlight multiplier (`ruleId: 'spotlight'`) applies last in the item window.
- **Versioning note:** `ContractSchemaVersion` was deliberately **not** bumped. The fields are optional/additive, v1 saves and M0 fixtures still parse, and fixture states omitting both fields reproduce byte-identical traces.
- **Graduation note:** these must not graduate from prototype or become canon until Fable signs off.

## 7. Handoff

These are prototypes pending the device feel-gate. Lane A has taken stewardship of the sim surface by adding behavioral coverage, determinism coverage, golden-trace safety, fuzz reachability metrics, and this CCR. Presentation remains Lane B-owned; magnitudes and graduation are the relay/Fable call.

**STOP — awaiting Fable review/sign-off before any graduation or further tuning.**
