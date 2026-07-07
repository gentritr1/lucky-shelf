# A-M5e Build Steering Review Packet

## 1. Built vs. milestone criteria

- Implemented recommended path B: additive `chooseSupplier { tag }` action plus optional `GameState.supplierTag?: string | null`.
- Added default-off `BUILD_STEERING_ENABLED`, `BUILD_STEERING_ENV_VAR`, `buildSteeringEnabled()`, `BUILD_STEERING_ELIGIBLE_TAGS`, and `BUILD_STEER_BIAS = 2.5` in `src/sim/economy.ts`.
- Reused the Phase 2a eligible tag set (`TAG_SYNERGY_ELIGIBLE_TAGS`, derived from `DEMAND_TAG_POOL`) so steering only targets tags with enough table depth.
- Made supplier choice mandatory while the flag is on at opening delivery: legal actions expose only `chooseSupplier` choices until one is picked. OFF exposes no new legal action.
- `chooseSupplier` is legal once at run start only: flag on, `delivery` phase, day 1, no scored days, `supplierTag == null`, eligible tag. Invalid, repeated, post-draft, and flag-off choices throw `EngineError`.
- `generateOffers(..., supplierTag = null)` remains call-compatible. When the flag is off or `supplierTag` is absent, offer weights are byte-identical. When on, items carrying the leaned tag multiply their `offerWeight` by `BUILD_STEER_BIAS`; off-archetype items remain in the pool.
- Wired all engine offer generation points to pass `supplierTag` when the flag is on: opening choice, Loop v2 starter shop, day rollover delivery/restock, reroll, and legacy restock cadence.
- Extended bots and fuzz with deterministic supplier selection plus supplier metrics: `supplierTagDistribution`, `finalSupplierTagCount`, and `supplierTagCountByDay`. Existing fuzz keys remain present.
- Added focused tests for OFF absence, ON legal/illegal action flow, deterministic regenerated offers, weight bias, off-tag variety, ON bot determinism, replay determinism with `chooseSupplier`, and Loop v2 daily-shop carry-through.
- No app, UI, juice, item table, fixture, or schema-version changes.

## 2. Exact test/run commands

```sh
PATH="$HOME/.nvm/versions/node/v20.19.4/bin:$PATH" node_modules/.bin/tsc --noEmit
PATH="$HOME/.nvm/versions/node/v20.19.4/bin:$PATH" node_modules/.bin/vitest run
PATH="$HOME/.nvm/versions/node/v20.19.4/bin:$PATH" node --import tsx scripts/validate-fixtures.ts

PATH="$HOME/.nvm/versions/node/v20.19.4/bin:$PATH" LOOP_V2_ENABLED=1 TAG_SYNERGY_ENABLED=1 node --import tsx scripts/fuzz.ts --runs 100 --strategy greedy --seed build-steering-ab
PATH="$HOME/.nvm/versions/node/v20.19.4/bin:$PATH" LOOP_V2_ENABLED=1 TAG_SYNERGY_ENABLED=1 BUILD_STEERING_ENABLED=1 node --import tsx scripts/fuzz.ts --runs 100 --strategy greedy --seed build-steering-ab
PATH="$HOME/.nvm/versions/node/v20.19.4/bin:$PATH" LOOP_V2_ENABLED=1 TAG_SYNERGY_ENABLED=1 node --import tsx scripts/fuzz.ts --runs 100 --strategy combo --seed build-steering-ab
PATH="$HOME/.nvm/versions/node/v20.19.4/bin:$PATH" LOOP_V2_ENABLED=1 TAG_SYNERGY_ENABLED=1 BUILD_STEERING_ENABLED=1 node --import tsx scripts/fuzz.ts --runs 100 --strategy combo --seed build-steering-ab
```

Mutation check:

```sh
# Temporarily changed the leaned-tag branch from `weight *= BUILD_STEER_BIAS` to `weight *= 1`.
PATH="$HOME/.nvm/versions/node/v20.19.4/bin:$PATH" node_modules/.bin/vitest run src/sim/buildSteering.test.ts -t "multiplies leaned-tag offer weight"
```

## 3. Test/fuzz/determinism output

- Typecheck: clean.
- Tests: `16 passed (16)`, `93 passed (93)`.
- Fixtures: validated 6 M0 fixtures and `m2-arrange-sticky`; M0 fixture trace event counts unchanged.
- OFF determinism pin remains `8d48e1c5a6ad14c9` through the existing determinism test.
- ON determinism: added same-seed greedy bot action equality, replay equality with `chooseSupplier`, and final-state hash equality.
- Mutation check: neutralizing the bias failed the focused test with `expected 7 to be 17.5`; restored code and reran green verification.

Fuzz used `LOOP_V2_ENABLED=1`, `TAG_SYNERGY_ENABLED=1`, `SIGNATURE_ITEMS_ENABLED` off, same seed prefix `build-steering-ab`.

| Strategy | Steering | Best day median | Best day p95 | Game over rate | Final dominant tag median | Final supplier tag median |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| greedy | off | 142 | 244 | 1.000 | 5 | 0 |
| greedy | on | 145 | 233 | 1.000 | 6 | 5 |
| combo | off | 146 | 252 | 1.000 | 5 | 0 |
| combo | on | 143 | 246 | 1.000 | 6 | 5 |

Dominant eligible-tag count distribution across scored shelves:

| Strategy | Steering | Distribution |
| --- | --- | --- |
| greedy | off | `{0:1, 1:120, 2:208, 3:400, 4:665, 5:622, 6:522, 7:104, 8:130}` |
| greedy | on | `{1:86, 2:191, 3:260, 4:450, 5:459, 6:600, 7:370, 8:298, 9:130, 10:51}` |
| combo | off | `{1:108, 2:192, 3:440, 4:676, 5:658, 6:517, 7:260, 8:29}` |
| combo | on | `{1:81, 2:174, 3:219, 4:427, 5:567, 6:401, 7:437, 8:187, 9:222, 10:30, 11:27}` |

Supplier tag distribution when steering is on:

| Strategy | Distribution |
| --- | --- |
| greedy | `{antique:1, drink:5, fancy:6, food:40, fragile:11, lucky:13, perishable:8, plant:3, utility:13}` |
| combo | `{antique:2, drink:8, fancy:7, food:34, fragile:9, lucky:18, perishable:9, plant:2, utility:11}` |

Degenerate-strategy check:

- Steering visibly shifts archetype commitment: final dominant eligible-tag median `5 -> 6` for both greedy and combo.
- Best-day medians stayed inside the requested rough band: greedy `142 -> 145` (+3), combo `146 -> 143` (-3).
- Game-over rate stayed unchanged at `1.000`; rent still bites.
- Synergy fire rate rose modestly with steering: greedy `0.602 -> 0.667`, combo `0.590 -> 0.674`, which is expected with `TAG_SYNERGY_ENABLED=1`.

## 4. Known issues + spec deviations

- I made supplier choice mandatory under the flag before drafting. The brief says the action is legal once at run start; this implementation enforces the stronger "commit at run start" reading so the player cannot drift past the archetype choice.
- Bot supplier picks skew toward `food` because the current early table gives food the strongest immediate placement/offer density. Other archetypes still appear, but Fable may want item-weight tuning or a UI presentation rule if the player-facing options should feel more evenly attractive.
- Build steering works without tag synergy, but the intended ladder payoff is clearest with `TAG_SYNERGY_ENABLED=1`; both flags remain independent and default off.
- No Lane B picker/signposting exists yet. If the flag is turned on in app UI before Lane B renders the supplier picker, opening delivery will correctly block drafting.
- `BUILD_STEER_BIAS = 2.5` is provisional and isolated for tuning.

## 5. Questions for Fable

- Please approve the additive contract change: `GameState.supplierTag?: string | null` and `chooseSupplier { tag }`.
- Please confirm the mandatory-pick behavior while the flag is on: opening delivery requires supplier choice before draft.
- Please approve or tune `BUILD_STEER_BIAS = 2.5`.
- Please confirm `BUILD_STEERING_ELIGIBLE_TAGS = TAG_SYNERGY_ELIGIBLE_TAGS` / `DEMAND_TAG_POOL`.

## 6. Contract change requests

CCR-4, pending Fable sign-off:

- Add optional `GameState.supplierTag?: string | null`.
  - Absent means the flag is off or an older save/fixture.
  - `null` means the flag is on and the run is waiting for the opening supplier pick.
  - String value is the chosen eligible supplier tag.
- Add additive `ActionSchema` variant `{ type: "chooseSupplier", tag: string }`.
- No `ContractSchemaVersion` bump: field and action variant are additive; old saves and fixtures still parse.
- Engine semantics: `chooseSupplier` is legal once, only at opening delivery before any draft/scored day, only while `BUILD_STEERING_ENABLED=1`, and only for eligible tags.

## 7. Lane B handoff

- No Lane B files were touched.
- Picker UI should render before draft buttons when `GameState.supplierTag === null`. Dispatch `{ type: "chooseSupplier", tag }`, then render `state.currentOffers` as usual.
- Chosen lean display can read `GameState.supplierTag`; absent means feature off, null means awaiting pick, string means selected lean.
- Biased offer marking is simple: when `state.supplierTag` is a string, an offer is supplier-biased if `offer.item.tags.includes(state.supplierTag)`.
- Eligible picker options are `BUILD_STEERING_ELIGIBLE_TAGS`. If Lane B cannot import sim constants from its UI boundary, mirror this through a state selector/app shell handoff rather than importing sim internals directly.
