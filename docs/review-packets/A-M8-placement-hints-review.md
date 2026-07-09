# A-M8 Review Packet - Placement Hints

## 1. Built vs. criteria

- Added `src/sim/placementHints.ts` as a pure qualitative evaluator.
- API is `placementHints(state, heldItem, deps, known): PlacementHint[]`.
- `known` is passed as `{ discoveredItemIds, achievedComboIds }`; no Catalog or persistence type is imported.
- Each hint is exactly `{ slot, tier: 'none' | 'active', comboTeased: boolean }`.
- Hints are emitted for every empty placeable slot only; occupied slots, including blocker items such as Shop Cat, are excluded.
- `active` is discovered-rules-only: a caused `ruleFire` must involve the candidate slot as source or target, and the owning item for that rule must be in `discoveredItemIds`. A held item's own rules do not hint until that held item id is discovered.
- `comboTeased` is true only for newly completed named combo events whose `comboId` is already in `achievedComboIds`.
- No numbers, totals, rule names, rule ids, or coin previews are returned.
- No flag, engine, dispatcher, offer generation, bot, affordance, contract, catalog-field, fixture, golden, or item-table changes were made.
- Input state and held item are cloned for hypothetical placement and never mutated; the focused test deep-freezes and JSON-compares both.

## 2. Tests added

- `src/sim/placementHints.test.ts`
  - adjacency source discovered vs undiscovered source
  - held item own-rule discovery gate
  - achieved-only combo tease
  - empty-board and full-board edges
  - blocker/occupied slot exclusion
  - deep-freeze input purity assertion
  - 50 fuzzed boards: byte-equal repeat calls and every `active` hint has a qualifying discovered-source trace fire
  - structural guard: production files under `src/sim` must not import `placementHints`

## 3. Exact commands run

```sh
PATH="$HOME/.nvm/versions/node/v23.3.0/bin:$PATH" node_modules/.bin/tsc --noEmit
PATH="$HOME/.nvm/versions/node/v23.3.0/bin:$PATH" node_modules/.bin/vitest run src/sim/placementHints.test.ts
PATH="$HOME/.nvm/versions/node/v23.3.0/bin:$PATH" node --import tsx scripts/validate-fixtures.ts
PATH="$HOME/.nvm/versions/node/v23.3.0/bin:$PATH" node_modules/.bin/vitest run src/sim/determinism.test.ts src/sim/goldens.test.ts
PATH="$HOME/.nvm/versions/node/v23.3.0/bin:$PATH" node_modules/.bin/vitest run
PATH="$HOME/.nvm/versions/node/v23.3.0/bin:$PATH" node --import tsx -e '(async () => { const { performance } = await import("node:perf_hooks"); const items = (await import("./src/items/index.ts")).default; const contracts = (await import("./src/contracts/index.ts")).default; const grid = (await import("./src/sim/grid.ts")).default; const hints = (await import("./src/sim/placementHints.ts")).default; const table = items.loadItemTable(); const combos = items.loadCombos(); const instance = (itemId, index) => { const def = table.get(itemId); if (!def) throw new Error(`unknown item ${itemId}`); return { instanceId: `${itemId}-bench-${index}`, itemId: def.id, name: def.name, tier: def.tier, baseValue: def.baseValue, tags: [...def.tags], state: { ageDays: 0, growthDays: 0, countdown: null, sticky: false, blocked: def.rules.some((rule) => rule.kind === "blocksSlot"), transformedFromItemId: null } }; }; const size = { rows: 4, cols: 4 }; const occupiedSlot = { row: 0, col: 0 }; const occupiedItem = instance("wine-bottle", 1); const state = { schemaVersion: 1, runId: "run-placement-hints-bench", seed: "placement-hints-bench", phase: "arrange", day: 5, coins: 0, shelf: { size, slots: grid.rowMajorSlots(size).map((slot) => ({ slot, item: contracts.toSlotKey(slot) === contracts.toSlotKey(occupiedSlot) ? occupiedItem : null })) }, rent: { amount: 25, dueInDays: 3, cycle: 1 }, moves: { freeRemaining: 3, paidMoveCost: 2 }, currentOffers: [], heldItem: null, lastScoringTrace: null, runStats: { totalCoinsEarned: 0, deepestRentSurvived: 0, daysSurvived: 0, bestDayTotal: 0, bestComboIds: [] }, catalogDelta: { discoveredItemIds: [], discoveredComboIds: [] } }; const heldItem = instance("cheese-wheel", 2); const deps = { table, combos }; const known = { discoveredItemIds: ["wine-bottle", "cheese-wheel"], achievedComboIds: ["wine-and-dine", "cheese-board"] }; hints.placementHints(state, heldItem, deps, known); const times = []; let hintCount = 0; for (let i = 0; i < 100; i += 1) { const start = performance.now(); hintCount = hints.placementHints(state, heldItem, deps, known).length; times.push(performance.now() - start); } times.sort((a, b) => a - b); const medianMs = times[Math.floor(times.length / 2)]; console.log(JSON.stringify({ samples: times.length, hintCount, medianMs: Number(medianMs.toFixed(3)), budgetMs: 10 }, null, 2)); })();'
rg -n "(from|import|require\() ['\"][^'\"]*placementHints['\"]|export .* from ['\"][^'\"]*placementHints['\"]" src/sim -g "!*.test.ts"
```

## 4. Outputs

```text
tsc --noEmit:
(no stdout; exit 0)
```

```text
placementHints.test.ts:
Test Files  1 passed (1)
Tests       9 passed (9)
```

```text
validate-fixtures:
m0-basic-wine-cheese: 6 trace events
m0-wine-dine-combo: 13 trace events
m0-mirror-copy: 6 trace events
m0-shop-cat-row-aura: 9 trace events
m0-scores-last-clock: 5 trace events
m0-bamboo-transform: 6 trace events
Validated 6 M0 fixtures.
m2-arrange-sticky: 1 sticky item(s), arrange phase.
```

```text
determinism + goldens targeted run:
Test Files  2 passed (2)
Tests       8 passed (8)
```

Pin print:

```json
{
  "hash": "8d48e1c5a6ad14c9",
  "matchesBot": true
}
```

Full suite:

```text
Test Files  33 passed (33)
Tests       239 passed (239)
```

Structural grep:

```text
(no matches; rg exit 1)
```

## 5. Bench

Bench shape: 4x4 shelf, one existing Wine Bottle at `0,0`, held Cheese Wheel, 15 empty candidate slots, 100 calls after one warmup. This exercises the maximum candidate count specified by the brief.

```json
{
  "samples": 100,
  "hintCount": 15,
  "medianMs": 1.011,
  "budgetMs": 10
}
```

Result: PASS, median 1.011ms <= 10ms.

## 6. Structural byte-identity proof

- `src/sim/placementHints.ts` is not exported from `src/sim/index.ts`.
- The new structural test scans `src/sim/**/*.ts`, excluding tests and `placementHints.ts` itself, for static imports, exports, and `require()` references to `placementHints`.
- The explicit grep below also returned no production import matches:

```sh
rg -n "(from|import|require\() ['\"][^'\"]*placementHints['\"]|export .* from ['\"][^'\"]*placementHints['\"]" src/sim -g "!*.test.ts"
```

```text
(no matches; rg exit 1)
```

Because no production `src/sim` module imports the leaf module, engine, offer, bot, affordance, fixture, golden, and determinism byte paths remain untouched. The full floor above stayed green.

## 7. Lane B handoff

Lane B should gate any UI surface behind `PLACEMENT_HINT_ENABLED`.

Exact API:

```ts
import { placementHints } from '../sim/placementHints';

const hints = placementHints(
  state,
  heldItem,
  { table, combos },
  {
    discoveredItemIds,
    achievedComboIds,
  },
);
```

Returned shape:

```ts
type PlacementHint = {
  slot: Slot;
  tier: 'none' | 'active';
  comboTeased: boolean;
};
```

UI guidance:

- Treat `tier: 'active'` as "something known would happen here."
- Treat `tier: 'none'` as no known qualitative hint.
- Treat `comboTeased: true` as "this completes a combo the player has already achieved."
- Do not show coins, totals, rule ids, rule names, or undiscovered combo names from this surface; the module intentionally does not return them.

## 8. Known issues and questions

- Known issues: none.
- Questions for Fable: none.

## 9. Contract change requests

- None. No contract fields or schema changes.

STOP - A-M8 placement hints are implemented as a pure leaf module. Fable reviews.
