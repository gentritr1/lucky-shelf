# A-M7 Review Packet - Unlock Ladder

## 1. Built vs. criteria

- Added `UNLOCK_LADDER_ENABLED` / `UNLOCK_LADDER_ENV_VAR`, default OFF.
- Added sidecar `src/sim/unlocks.ts`; `items.json` was not edited.
- Unlock predicates read only existing catalog data: `stats.runsPlayed`,
  `discoveredItemIds`, and `achievedComboIds`. No persisted catalog field, no
  migration, no `CatalogSchemaVersion` bump.
- Added optional additive `GameState.unlockedItemIds?: string[]`; no
  `ContractSchemaVersion` bump. Flag OFF never writes it.
- `createRun(seed, deps, { unlockedItemIds })` snapshots a sorted unlock pool
  when the flag is ON. Missing/unloaded catalog falls back to starter unlocks.
- All offer generation paths use the run snapshot when present: initial offers,
  supplier choice, daily/restock rollover, reroll, and v1 restock.
- Signature items still require `SIGNATURE_ITEMS_ENABLED`; ladder filtering is
  an additional gate on top.
- Added focused tests for OFF behavior, loaded-catalog store wiring, replay
  integrity, greedy-bot drip, gated-hook reachability, locked-item fuzz,
  full-unlock reachability, starter pool width, and small-pool reroll IDs.

## 2. Final ladder table

Run-count predicates use completed catalog runs. `runsPlayed: 1` means it lands
after the first completed run and is available in the second run.

| Item | Predicate | Rationale |
|---|---:|---|
| wine-bottle | always | Kickoff exemplar; drink/fancy anchor. |
| cheese-wheel | always | Kickoff exemplar; aging + cheese grammar. |
| honey-jar | always | Kickoff exemplar; sticky/sweet support. |
| lucky-bamboo | always | Kickoff exemplar; lucky/plant growth. |
| coupon-stack | always | Kickoff exemplar; paper/deal countdown. |
| bread-loaf | always | Early food/perishable density. |
| candle | always | Early light hook. |
| flower-vase | always | Early plant/fragile hook. |
| penny-jar | always | Early lucky hook. |
| mirror | always | Kickoff exemplar; copy behavior. |
| shop-cat | always | Kickoff exemplar; row aura/blocker. |
| price-gun | always | Kickoff exemplar; column/deal utility. |
| fishbowl | always | Kickoff exemplar; loner/water. |
| ice-box | always | Kickoff exemplar; cold/perishable payoff. |
| antique-clock | always | Kickoff exemplar; scores-last rule. |
| vintage-radio | always | Kickoff exemplar; row echo. |
| apple-basket | runsPlayed 1 | First drip; more perishable/food. |
| tea-tin | runsPlayed 2 | Opens drink routes. |
| dice-cup | runsPlayed 3 | More lucky/toy support. |
| postcard-rack | runsPlayed 4 | Paper route support. |
| soap-bar | runsPlayed 5 | Utility filler by run 6. |
| chocolate-box | runsPlayed 6 | Sweet/fancy payoff. |
| record-crate | runsPlayed 7 | Music/paper bridge. |
| music-box | runsPlayed 8 | Music/antique bridge. |
| oil-painting | runsPlayed 9 | Fragile/fancy antique. |
| samovar | runsPlayed 10 | Drink/antique/fancy. |
| antique-register | runsPlayed 12 | Late antique/tool. |
| observation-hive | runsPlayed 14 | Plant/sweet late bridge. |
| golden-scale | runsPlayed 16 | Tier-4 lucky/fancy/tool. |
| maneki-neko | runsPlayed 18 | Tier-4 lucky/mascot. |
| orrery | runsPlayed 20 | Final non-signature unlock. |
| brass-scale | itemDiscovered price-gun | Signature; discovery hook, tool/fancy. |
| ledger-book | itemDiscovered coupon-stack | Signature; discovery hook, paper/deal. |
| window-display | comboAchieved cheese-board | Signature; reachable combo hook. |
| consignment-sign | comboAchieved fire-sale | Signature; reachable combo hook. |
| lucky-cat | comboAchieved lucky-cluster | Signature; reachable combo hook. |

## 3. Exact commands run

```sh
PATH="$HOME/.nvm/versions/node/v23.3.0/bin:$PATH" node_modules/.bin/tsc --noEmit
PATH="$HOME/.nvm/versions/node/v23.3.0/bin:$PATH" node --import tsx scripts/validate-fixtures.ts
PATH="$HOME/.nvm/versions/node/v23.3.0/bin:$PATH" node_modules/.bin/vitest run
PATH="$HOME/.nvm/versions/node/v23.3.0/bin:$PATH" LOOP_V2_ENABLED=1 SIGNATURE_ITEMS_ENABLED=1 TAG_SYNERGY_ENABLED=1 BUILD_STEERING_ENABLED=1 GOAL_LADDER_ENABLED=1 SHELF_EXPANSION_ENABLED=1 WARM_OPENING_ENABLED=1 DAY2_STARTER_ENABLED=1 UNLOCK_LADDER_ENABLED=1 node --import tsx scripts/fuzz.ts --runs 120 --strategy all --seed m7-on
PATH="$HOME/.nvm/versions/node/v23.3.0/bin:$PATH" LOOP_V2_ENABLED=1 SIGNATURE_ITEMS_ENABLED=1 TAG_SYNERGY_ENABLED=1 BUILD_STEERING_ENABLED=1 GOAL_LADDER_ENABLED=1 SHELF_EXPANSION_ENABLED=1 WARM_OPENING_ENABLED=1 DAY2_STARTER_ENABLED=1 node --import tsx scripts/fuzz.ts --runs 120 --strategy all --seed m7-on
PATH="$HOME/.nvm/versions/node/v23.3.0/bin:$PATH" node --import tsx scripts/balance.ts --assert-bands
```

## 4. Outputs

```text
tsc --noEmit: clean

validate-fixtures:
m0-basic-wine-cheese: 6 trace events
m0-wine-dine-combo: 13 trace events
m0-mirror-copy: 6 trace events
m0-shop-cat-row-aura: 9 trace events
m0-scores-last-clock: 5 trace events
m0-bamboo-transform: 6 trace events
Validated 6 M0 fixtures.
m2-arrange-sticky: 1 sticky item(s), arrange phase.

vitest run:
Test Files  27 passed (27)
Tests       179 passed (179)
goldens: src/sim/goldens.test.ts reproduced all 6 M0 scoring traces.

determinism pin:
{ "hash": "8d48e1c5a6ad14c9", "matchesBot": true, "unlockedItemIds": false }

balance --assert-bands:
passed; build swing allDepth/baseline remained within [1.3, 2.0].
```

## 5. Drip simulation

Full depth stack + unlock ladder, fresh catalog, greedy bot runs, catalog merged
after each run with `mergeRunIntoCatalog`.

```text
starterCount: 16
fullNonSignaturePoolRun: 20
finalRunsPlayed: 22

run 1:  +apple-basket, +brass-scale
run 2:  +tea-tin
run 3:  +dice-cup, +ledger-book, +window-display
run 4:  +postcard-rack
run 5:  +soap-bar
run 6:  +chocolate-box
run 7:  +record-crate
run 8:  +music-box
run 9:  +oil-painting
run 10: +consignment-sign, +samovar
run 12: +antique-register
run 14: +observation-hive
run 16: +golden-scale
run 17: +lucky-cat
run 18: +maneki-neko
run 20: +orrery
```

Gated hooks reached by bots:

```text
itemDiscovered: price-gun -> brass-scale
itemDiscovered: coupon-stack -> ledger-book
comboAchieved: cheese-board -> window-display
comboAchieved: fire-sale -> consignment-sign
comboAchieved: lucky-cluster -> lucky-cat
```

## 6. Replay integrity

Test: `src/sim/unlocks.test.ts` replays a flagged greedy run after mutating the
live catalog from an 8-run snapshot to a 22-run snapshot. Replay passes only the
saved run snapshot (`GameState.unlockedItemIds`) back through `runReplay` options.

```text
hashState(replayed) === hashState(original finalState)
replayed.unlockedItemIds === originalSnapshot
mutatedSnapshot !== originalSnapshot
```

Note: a replay artifact that starts from a changed live catalog must carry the
saved run snapshot. The contract surface for that is the additive
`GameState.unlockedItemIds?`; old `{ seed, actions }` callers remain unchanged
and flag-off byte-identical.

## 7. Drift report

120 runs, seed `m7-on`, full depth stack. Ladder ON uses fresh-catalog starter
snapshot; ladder OFF uses the current full pool.

Goal hit rates:

| Strategy | Ladder | Day 1 | Day 2 | Day 3 | Day 4 | Day 5 |
|---|---|---:|---:|---:|---:|---:|
| random | ON | 0.000 | 0.000 | 0.000 | n/a | n/a |
| random | OFF | 0.000 | 0.000 | 0.000 | n/a | n/a |
| greedy | ON | 0.608 | 0.950 | 0.950 | 0.950 | 0.958 |
| greedy | OFF | 0.667 | 0.875 | 0.825 | 0.833 | 0.850 |
| combo | ON | 0.625 | 0.933 | 0.925 | 0.950 | 0.975 |
| combo | OFF | 0.733 | 0.933 | 0.900 | 0.908 | 0.908 |

Floor first-rent survival, same full stack, 120-run floor-policy probe:

```text
ON:  44/120 = 0.367
OFF: 34/120 = 0.283
```

## 8. Degenerate probes

- Empty/unloaded catalog snapshot gives the 16-item starter pool.
- Starter day-1 positive-weight pool is >= `OFFERS_PER_DELIVERY +
  LOOP_V2_DAILY_SHOP_OFFERS`.
- Full unlock snapshot equals today's offerable pool exactly.
- Small-pool buyout + reroll does not mint duplicate instance ids.
- Locked-item-never-offered fuzz covers 200 seeds.

## 9. Mutation check

Temporarily changed the snapshot filter from:

```ts
!unlocked || unlocked.has(definition.id)
```

to:

```ts
!unlocked || true
```

Then ran:

```sh
PATH="$HOME/.nvm/versions/node/v23.3.0/bin:$PATH" node_modules/.bin/vitest run src/sim/unlocks.test.ts --testNamePattern "never offers locked items"
```

Expected failure occurred:

```text
FAIL src/sim/unlocks.test.ts > unlock ladder > never offers locked items inside snapshot-limited fuzzed runs
AssertionError: expected false to be true
src/sim/unlocks.test.ts:248
```

Restored the filter and reran the targeted test:

```text
Test Files  1 passed (1)
Tests       1 passed | 8 skipped (9)
```

## 10. Known issues and questions

- None known in the flag-off path.
- Replay note above is the main CCR detail: flagged replay needs the saved run
  snapshot when the live catalog has changed.

## 11. Contract change request

CCR: Add optional `GameState.unlockedItemIds?: string[]`.

- Additive and optional; old fixtures/saves parse.
- No `ContractSchemaVersion` bump.
- Absent means full-pool v1 behavior.
- Present means offer generation filters by this run's frozen snapshot.

STOP - A-M7 unlock ladder is implemented behind `UNLOCK_LADDER_ENABLED`, default OFF. Fable reviews.
