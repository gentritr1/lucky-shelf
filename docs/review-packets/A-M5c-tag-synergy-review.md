# A-M5c Tag Synergy Review Packet

## 1. Built vs. milestone criteria

- Added default-off `TAG_SYNERGY_ENABLED`, `TAG_SYNERGY_ENV_VAR`, `tagSynergyEnabled()`, `TAG_SYNERGY_ELIGIBLE_TAGS`, and ordered `TAG_SYNERGY_LADDER` constants in `src/sim/economy.ts`.
- Reused `DEMAND_TAG_POOL` as the eligible tag set, so niche tags such as `paper`, `clock`, `wax`, and `cold` do not mint synergy bonuses.
- Scoring now precomputes eligible tag counts once per `openShop()` over occupied slots. Blocked occupied slots count toward tag commitment, but blocked slots still score 0 and do not emit synergy.
- When `TAG_SYNERGY_ENABLED=1`, each item window applies exactly one best qualifying tag multiplier after ambient auras and before spotlight, then emits `ruleFire` with `ruleId: "synergy"`, `sourceSlot === targetSlot`, and `delta: { mult }`.
- When tag synergy is on, Today's Order is skipped so order and synergy do not stack. When tag synergy is off, the existing order branch is unchanged.
- Added focused tests for ladder floor/cap, best-tag-not-product, order supersession, ineligible tags, blocker counting, synergy-before-spotlight ordering, signature post-window interaction, and tag-synergy ON determinism.
- Extended bot/fuzz metrics with `tagSynergyEnabled`, `p95`, `synergyFireRate`, `synergyFireDayRate`, `synergyFiresPerScoredDay`, and dominant eligible-tag count distributions. Existing fuzz keys remain present.
- No `GameState`, `Action`, `TraceEvent`, `ContractSchemaVersion`, item table, Lane B, UI, or juice files changed.

## 2. Exact test/run commands

```sh
PATH="$HOME/.nvm/versions/node/v20.19.4/bin:$PATH" node_modules/.bin/tsc --noEmit
PATH="$HOME/.nvm/versions/node/v20.19.4/bin:$PATH" node_modules/.bin/vitest run
PATH="$HOME/.nvm/versions/node/v20.19.4/bin:$PATH" node --import tsx scripts/validate-fixtures.ts

PATH="$HOME/.nvm/versions/node/v20.19.4/bin:$PATH" LOOP_V2_ENABLED=1 node --import tsx scripts/fuzz.ts --runs 100 --strategy greedy --seed tag-synergy-ab
PATH="$HOME/.nvm/versions/node/v20.19.4/bin:$PATH" LOOP_V2_ENABLED=1 TAG_SYNERGY_ENABLED=1 node --import tsx scripts/fuzz.ts --runs 100 --strategy greedy --seed tag-synergy-ab
PATH="$HOME/.nvm/versions/node/v20.19.4/bin:$PATH" LOOP_V2_ENABLED=1 node --import tsx scripts/fuzz.ts --runs 100 --strategy combo --seed tag-synergy-ab
PATH="$HOME/.nvm/versions/node/v20.19.4/bin:$PATH" LOOP_V2_ENABLED=1 TAG_SYNERGY_ENABLED=1 node --import tsx scripts/fuzz.ts --runs 100 --strategy combo --seed tag-synergy-ab
```

Mutation check:

```sh
# Temporarily changed tagSynergyMultForCount so ladder steps never assign.
PATH="$HOME/.nvm/versions/node/v20.19.4/bin:$PATH" node_modules/.bin/vitest run src/sim/depthLevers.test.ts -t "tag synergy applies the eligible-tag ladder"
```

## 3. Test/fuzz/determinism output

- Typecheck: clean.
- Tests: `15 passed (15)`, `86 passed (86)`.
- Fixtures: validated 6 M0 fixtures and `m2-arrange-sticky`; M0 fixture trace event counts unchanged.
- OFF determinism pin remains `8d48e1c5a6ad14c9` through the existing determinism test.
- ON determinism: added same-seed greedy bot action equality plus final-state hash equality.
- Mutation check: disabling the ladder step assignment failed the targeted ladder test with `expected [] to have a length of 3 but got +0`; restored code and reran green verification.

Fuzz used `LOOP_V2_ENABLED=1`, `SIGNATURE_ITEMS_ENABLED` off, same seed prefix `tag-synergy-ab`.

| Strategy | Synergy | Best day median | Best day p95 | Game over rate | Synergy fire rate | Synergy fire day rate |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| greedy | off | 121 | 191 | 1.000 | 0.000 | 0.000 |
| greedy | on | 138 | 225 | 1.000 | 0.578 | 0.883 |
| combo | off | 117 | 196 | 1.000 | 0.000 | 0.000 |
| combo | on | 134 | 268 | 1.000 | 0.621 | 0.889 |

Dominant eligible-tag count distribution across scored shelves:

| Strategy | Synergy | Distribution |
| --- | --- | --- |
| greedy | off | `{0:1, 1:118, 2:221, 3:685, 4:853, 5:411, 6:251, 7:72, 8:28}` |
| greedy | on | `{0:1, 1:124, 2:205, 3:522, 4:707, 5:483, 6:421, 7:281, 8:26, 9:27, 10:29}` |
| combo | off | `{0:1, 1:100, 2:249, 3:529, 4:620, 5:677, 6:324, 7:85, 8:22}` |
| combo | on | `{0:1, 1:103, 2:199, 3:215, 4:764, 5:746, 6:431, 7:219, 8:58}` |

Degenerate-strategy check:

- ON best-day medians are close: greedy `138`, combo `134`; best/median ratio across these two strategies is `1.015`.
- Rent still bites: all four 100-run samples ended with `gameOverRate: 1.000`, so the lever did not flatten the rent wall in this sample.
- Ceiling moved up, especially p95: combo p95 `196 -> 268`; this needs Fable tuning review before graduation.

## 4. Known issues + spec deviations

- Ladder magnitudes are provisional and intentionally isolated in constants for Fable tuning.
- `orderFillRate` in fuzz still reports whether the old daily order condition was met. With tag synergy on, this is a diagnostic fill condition only; no `order` trace events fire.
- The live archetype badge is not implemented; Lane B owns that follow-up.
- Signature-items interaction is covered by a cross-flag test: ordinary windows settle with synergy/spotlight first, then the existing post-window signature pass reads those settled totals.
- No item-table weighting, rent curve, or demand tuning was changed.

## 5. Questions for Fable

- Please approve or tune the starting ladder: count `3 -> x1.2`, `4 -> x1.4`, `5 -> x1.6`, `6+ -> x1.8`.
- Please confirm the recommended design decision: best qualifying tag only, not multiplicative stacking across every qualifying tag.
- Please confirm synergy supersedes Today's Order while the flag is on.
- Please confirm blocked occupied slots should count toward archetype commitment even though they do not receive their own synergy event.

## 6. Contract change requests

CCR-3, pending Fable sign-off:

- Scoring-order change only. No contract schema change and no `ContractSchemaVersion` bump.
- New default-off scoring branch: `window build -> ambient auras -> tag synergy -> spotlight -> itemTotal`.
- When `TAG_SYNERGY_ENABLED=1`, Today's Order is skipped in scoring and replaced by the derived tag-set ladder.
- Trace shape reuses existing `ruleFire`: `{ kind: "ruleFire", sourceSlot, targetSlot, ruleId: "synergy", delta: { mult }, runningTotal }`.
- Signature post-window rules continue to run after item windows settle, so they read post-synergy and post-spotlight totals.

## 7. Lane B handoff

- No Lane B files were touched.
- Cascade already understands this for free: synergy is an ordinary `ruleFire` with `ruleId: "synergy"` and a mult delta.
- For a shelf/archetype badge, compute counts from `GameState.shelf.slots[*].item.tags`, restricted to `TAG_SYNERGY_ELIGIBLE_TAGS`. The live dominant tag is the eligible tag with the highest occupied-slot count; show no active synergy below the first ladder floor.
- There is deliberately no `GameState` field for the active archetype. It is derived at scoring/badge time from shelf contents.
- If multiple tags tie, Lane B can choose a stable display tie-breaker using `TAG_SYNERGY_ELIGIBLE_TAGS` order unless Fable wants another rule.
