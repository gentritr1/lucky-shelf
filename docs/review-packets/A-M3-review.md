# A-M3 Review Packet — Lane A

## 1. Built vs. milestone criteria

- **New Run → pure `createRun(seed)` (R-31):** `startNewRun()` and the store default now use the engine's day-1 `createRun`. Fresh runs begin in `delivery`, with an empty shelf and real seeded offers. The M2 arrange starter scaffold was removed from the store.
- **HUD phase routing:** added `src/state/phaseRouting.ts`. Routes are now derived from `GameState.phase`: `delivery` → `/draft`, `arrange`/`openShop` → `/run`, `restock` → `/restock`, `gameOver` → `/summary`. Title New Run/Continue route through this helper; screens redirect away when their phase is no longer authoritative.
- **Real offers feed Lane B screens:** `src/app/draft.tsx` renders `state.currentOffers` and dispatches real `draftItem`. `src/app/restock.tsx` renders real restock offers and dispatches `buyOffer`, `reroll`, `sellItem`, `placeItem`, and `endRestock`. No sim internals were imported into the screens.
- **Cascade wired to real scoring:** `src/app/run.tsx` captures the pre-`openShop` shelf, dispatches `openShop`, then mounts Lane B's `CascadeLayer` with the real `lastScoringTrace`. The cascade receives the shelf that actually scored, so transform/vanish visuals have their source items available.
- **First real `vanish` sanity:** added an engine test for Coupon Stack countdown `0` that emits a `vanish` trace event and removes the item from the shelf.
- **Restock loop coverage:** added an engine test for real restock `buyOffer` → `placeItem` → `reroll` → `endRestock`.
- **Run summary:** added a minimal `/summary` route for `gameOver`. Lane B can polish this in M4/M5.

## 2. Commands + output

`PATH="$HOME/.nvm/versions/node/v20.19.4/bin:$PATH" node_modules/.bin/tsc --noEmit`

```text
clean
```

`PATH="$HOME/.nvm/versions/node/v20.19.4/bin:$PATH" node_modules/.bin/vitest run`

```text
Test Files  9 passed (9)
Tests       51 passed (51)
```

`PATH="$HOME/.nvm/versions/node/v20.19.4/bin:$PATH" node --import tsx scripts/validate-fixtures.ts`

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

`PATH="$HOME/.nvm/versions/node/v20.19.4/bin:$PATH" node --import tsx scripts/fuzz.ts --runs 200 --strategy all --seed m3-integrated --max-actions 400`

```json
{
  "seedPrefix": "m3-integrated",
  "maxActions": 400,
  "results": [
    {
      "strategy": "random",
      "runs": 200,
      "daysSurvived": { "mean": 3.03, "median": 3, "p90": 3, "max": 6 },
      "totalCoinsEarned": { "mean": 5.66, "median": 4, "p90": 13, "max": 38 },
      "bestDayTotal": { "mean": 3.46, "median": 3, "p90": 7, "max": 14 },
      "deepestRentSurvived": { "mean": 0.01, "median": 0, "p90": 0, "max": 1 },
      "gameOverRate": 1,
      "diedAtRentCycle": { "mean": 1.01, "median": 1, "p90": 1, "max": 2 },
      "namedComboRunRate": 0
    },
    {
      "strategy": "greedy",
      "runs": 200,
      "daysSurvived": { "mean": 18.93, "median": 24, "p90": 27, "max": 30 },
      "totalCoinsEarned": { "mean": 1097.53, "median": 1289, "p90": 1869, "max": 2714 },
      "bestDayTotal": { "mean": 68.66, "median": 80, "p90": 111, "max": 153 },
      "deepestRentSurvived": { "mean": 5.31, "median": 7, "p90": 8, "max": 9 },
      "gameOverRate": 1,
      "diedAtRentCycle": { "mean": 6.31, "median": 8, "p90": 9, "max": 10 },
      "namedComboRunRate": 0.725
    },
    {
      "strategy": "combo",
      "runs": 200,
      "daysSurvived": { "mean": 17.84, "median": 24, "p90": 27, "max": 30 },
      "totalCoinsEarned": { "mean": 1021.79, "median": 1233, "p90": 1941, "max": 2721 },
      "bestDayTotal": { "mean": 64.63, "median": 77, "p90": 113, "max": 149 },
      "deepestRentSurvived": { "mean": 4.95, "median": 7, "p90": 8, "max": 9 },
      "gameOverRate": 1,
      "diedAtRentCycle": { "mean": 5.95, "median": 8, "p90": 9, "max": 10 },
      "namedComboRunRate": 0.715
    }
  ],
  "elapsedMs": 34162
}
```

Degenerate-strategy check: greedy and combo both have median deepest rent `7`; neither beats the other by >2× median. Random is intentionally much weaker.

## 3. Manual web script

Verified on the existing Expo web server at `http://localhost:8090`, viewport 375×812.

1. Title → New Run → routed to `/draft`.
2. Day 1 delivery showed real seeded offers. Draft → `/run`; Place Delivery → Open Shop.
3. Real cascade mounted on `/run` from `lastScoringTrace`; `dayTotal` resolved; Continue routed to next delivery.
4. Low-scoring branch reached `gameOver` after day-3 rent; Continue routed to `/summary`.
5. Fresh stronger branch: Day 1 Cheese Wheel, Day 2 Bread Loaf, Day 3 Bread Loaf.
6. Day-3 cascade showed `Bakery Corner`, `dayTotal 14`, rent paid exactly, then Continue routed to `/restock`.
7. Restock displayed real offers and `0` post-rent coins; buy buttons were correctly unaffordable. Sell mode sold Cheese Wheel, coins moved `0 → 2`, End Restock routed to day-4 `/draft`.
8. Hard navigation to title → Continue restored the saved day-4 delivery state.

## 4. Known issues + spec deviations

- **Cascade completion hook:** `CascadeLayer` does not expose `onComplete`. Lane A mounted the real trace without forking Lane B's layer and added an explicit Continue button outside the layer. Automatic route advance after animation completion needs a small Lane B API addition.
- **Restock buy was not manually clicked in the browser pass** because the verified rent-survival branch had `0` coins after exact rent payment. Real buy/place/reroll/end is covered by the new engine test.
- **Draft/place gesture is still minimal plumbing:** delivery draft routes to the shelf HUD, where the held item is placed with a first-empty-slot button. Lane B's M3 tray placement gesture can replace this presentation without contract changes.
- No known contract, scoring-order, or item-table deviations.

## 5. Questions for Fable

- Is the explicit post-cascade Continue acceptable for Lane A's plumbing handoff, with Lane B adding `onComplete` during the M3 polish pass?
- Should the minimal `/summary` route stay as Lane A scaffolding until M4/M5, or should Lane B replace it during M3 polish?

## 6. Contract change requests

- None. `src/contracts` was not changed.

## 7. Handoff for Lane B

- **Cascade mount contract:** `run.tsx` calls `CascadeLayer` as:
  - `gameState`: pre-`openShop` state, preserving items that may transform or vanish.
  - `trace`: post-dispatch `state.lastScoringTrace`.
  - `rentDue`: `beforeOpenShop.rent.dueInDays === 1`.
  - `autoPlay`: `true`.
- **Needed API:** add optional `onComplete?: () => void` to `CascadeLayer` or expose completion through a callback from `useCascadePlayer`. Lane A can then remove the external Continue button and route when the trace reaches terminal `dayTotal`.
- **Lane B-owned screen files touched for data wiring:** `src/app/run.tsx`, `src/app/draft.tsx`, `src/app/restock.tsx`, `src/app/index.tsx`. No `src/ui/**` or `src/juice/**` files were edited.
- **New Lane A scaffolding files:** `src/state/phaseRouting.ts`, `src/app/summary.tsx`.

**STOP — awaiting Fable review, then Lane B M3 polish.**
