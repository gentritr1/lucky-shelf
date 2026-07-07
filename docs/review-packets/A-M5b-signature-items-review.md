# A-M5b Signature Items Review Packet

## 1. Built vs. milestone criteria

- Added `SIGNATURE_ITEMS_ENABLED` as a separate default-off flag. OFF filters signature items out of offers and makes the signature scoring pass return immediately.
- Added five signature items, all `isSignature: true`: Brass Scale, Ledger Book, Lucky Cat, Consignment Sign, Window Display.
- Added additive optional contract surface only: `ItemDefinition.isSignature` plus five signature rule kinds. No `GameState`, `Action`, or `ContractSchemaVersion` bump.
- Signature offers are paid-shop/restock only, never free delivery, with `SIGNATURE_ITEM_WEIGHT_MULT = 0.3` and premium restock/daily-shop costs.
- Signature scoring resolves after ordinary item windows have emitted their normal `itemTotal`, before `comboNamed`/mutations/`dayTotal`. Each signature fire emits a `ruleFire` followed by an updated `itemTotal` for the affected slot.
- Added tests for each signature item firing and no-op condition, offer gating, OFF branch deadness, and signature-enabled determinism.
- Extended fuzz output with signature pickup rate, best-day distributions with/without signature pickup, per-signature item distributions, and dominance ratio.

## 2. Exact test/run commands

```sh
PATH="$HOME/.nvm/versions/node/v20.19.4/bin:$PATH" node -v
PATH="$HOME/.nvm/versions/node/v20.19.4/bin:$PATH" node_modules/.bin/tsc --noEmit
PATH="$HOME/.nvm/versions/node/v20.19.4/bin:$PATH" node --import tsx scripts/validate-fixtures.ts
PATH="$HOME/.nvm/versions/node/v20.19.4/bin:$PATH" node_modules/.bin/vitest run
PATH="$HOME/.nvm/versions/node/v20.19.4/bin:$PATH" LOOP_V2_ENABLED=1 node --import tsx scripts/fuzz.ts --runs 200 --strategy all --seed signature-phase2c --max-actions 400
PATH="$HOME/.nvm/versions/node/v20.19.4/bin:$PATH" LOOP_V2_ENABLED=1 SIGNATURE_ITEMS_ENABLED=1 node --import tsx scripts/fuzz.ts --runs 200 --strategy all --seed signature-phase2c --max-actions 400
```

## 3. Test/fuzz/determinism output

- Node: `v20.19.4`
- Typecheck: clean.
- Fixtures: validated 6 M0 fixtures and `m2-arrange-sticky`; M0 trace event counts unchanged.
- Tests: `15 passed (15)`, `79 passed (79)`.
- Determinism: pinned OFF determinism snapshot unchanged at `8d48e1c5a6ad14c9`; added ON same-seed greedy replay hash/action equality.

Signature OFF fuzz, `LOOP_V2_ENABLED=1`, 200 runs/strategy:

| Strategy | Pickup rate | Best day median | p90 | max |
| --- | ---: | ---: | ---: | ---: |
| random | 0 | 0 | 3 | 10 |
| greedy | 0 | 125 | 169 | 310 |
| combo | 0 | 119 | 157 | 274 |

Signature ON fuzz, same seed/settings:

| Strategy | Pickup rate | With-signature best day median/p90/max/stddev | Without-signature median/p90/max/stddev |
| --- | ---: | --- | --- |
| random | 0 | no pickups | `0 / 3 / 10 / 1.89` |
| greedy | 0.180 | `144 / 224 / 324 / 56.84` | `123 / 168 / 310 / 43.06` |
| combo | 0.200 | `157 / 246 / 302 / 54.36` | `120 / 160 / 334 / 38.45` |

Dominance check:

- Greedy: strongest median item `consignment-sign`, median `236`; all-signature median `144`; ratio `1.639`.
- Combo: strongest median item `consignment-sign`, median `216`; all-signature median `157`; ratio `1.376`.
- No signature item exceeds the `2x` median dominance guardrail in this run.

## 4. Known issues + spec deviations

- No Lane B shop badge/cascade polish was implemented; boundary held.
- New signature items do not have final sprites/manifest entries yet. Lane B/art can use placeholders until assets exist.
- Random bot dies too early to see paid-shop signatures, so curve evidence comes from greedy/combo bots.
- Signature `itemTotal` can appear twice for a slot in signature-enabled traces: normal settled total, then updated post-signature total. The latest `itemTotal` is the final value for `dayTotal`.
- Worktree contains pre-existing unrelated UI/assets changes; left untouched.

## 5. Questions for Fable

- Please approve or tune the starting signature numbers: Brass Scale `x1.5 food`, Ledger Book `+5 per antique`, Lucky Cat copies best normal settled total, Consignment Sign `x2 shelf if any tag count >= 4`, Window Display `x3 highest base-value item`.
- Please confirm the post-window signature order: ordinary item totals first, signature pass second, catalog/mutations/dayTotal after.
- Please confirm Lucky Cat copy semantics: it copies from the normal settled-total snapshot to avoid circular copy chains between multiple signature items.

## 6. Contract change requests

CCR-2, pending Fable sign-off:

- Add optional `ItemDefinition.isSignature?: boolean`.
- Add additive `ItemRule.kind` values:
  - `tagFilteredShelfMultiplier { tag, mult }`
  - `flatPerTagCount { tag, flatPerItem }`
  - `copyHighestScoringOther`
  - `shelfMultiplierIfAnyTagCount { minCount, mult }`
  - `highestBaseValueMultiplier { mult }`
- No schema version bump requested because all fields/rule kinds are additive and fixtures do not reference signatures.
- Deterministic order: signature sources resolve row-major, rules resolve in item rule order, targets resolve row-major with explicit tie-breaks.

## 7. Lane B handoff

Identify signature stock with either:

- `offer.item.isSignature === true`
- `isSignatureItem(offer.item)` from `src/items`
- `runSelectors.signatureOffers` or `runSelectors.isSignatureOffer(offerId)` from `src/state/store.ts`

Trace events emitted by each signature:

- Brass Scale: `ruleFire` ruleId `brass-scale-food-balance`, source Brass Scale, target each `food` item, `delta: { mult: 1.5 }`, then updated `itemTotal`.
- Ledger Book: `ruleFire` ruleId `ledger-book-antique-tally`, source/target Ledger Book, `delta: { flat: 5 * antiqueCount }`, then updated `itemTotal`.
- Lucky Cat: `ruleFire` ruleId `lucky-cat-best-in-shop`, source highest-scoring copied item, target Lucky Cat, `delta: { flat: copiedTotal }`, then updated `itemTotal`.
- Consignment Sign: `ruleFire` ruleId `consignment-sign-archetype-sale`, source Consignment Sign, target each occupied item when any tag count is at least 4, `delta: { mult: 2 }`, then updated `itemTotal`.
- Window Display: `ruleFire` ruleId `window-display-hero-piece`, source Window Display, target highest-base-value other item, `delta: { mult: 3 }`, then updated `itemTotal`.

If a condition is not met, no signature `ruleFire` is emitted. Terminal `dayTotal` includes the latest post-signature totals.
