# Lane A M0 Notes

## Understanding

Codex is Lane A. Lane A owns the deterministic logic surface: contracts, simulation, scoring, economy, persistence, item validation, replay, fixtures, fuzzing, and app scaffolding. Lane B consumes only shared contracts and state selectors; Lane B does not import sim internals.

## M0 Contract Proposal

The contract lives in `src/contracts/index.ts` and exports zod schemas plus inferred TypeScript types for:

- `GameState`: serializable run snapshot with shelf slots, item instances, coins, day, rent, moves, current offers, held item, last scoring trace, run stats, and catalog deltas.
- `Action`: the only UI mutation surface: `draftItem`, `placeItem`, `moveItem`, `sellItem`, `openShop`, `buyOffer`, `reroll`, `endRestock`, `abandonRun`.
- `ScoringTrace`: ordered trace events matching the kickoff trace vocabulary: `itemBase`, `ruleFire`, `comboNamed`, `rowAura`, `itemTotal`, `dayTotal`, `transform`.
- Item/rule data schemas for Fable-authored item tables: `adjacentTo`, `perAdjacent`, `copiesNeighbor`, `auraRow`, `auraColumn`, `scoresLast`, `transformsAdjacent`, `blocksSlot`, `onSell`, `growsEachDay`.

## Assumptions

- Slots are explicit `{ row, col }` objects in serialized data to keep fixture JSON readable.
- `GameState.shelf.slots` includes every slot, including empty slots, so UI can render a complete shelf without deriving missing cells.
- Row-wide effects use `rowAura`; column-wide flat effects can be represented as per-target `ruleFire` events unless Fable wants a dedicated trace event later.
- `comboNamed` is catalog/meta feedback by default and does not imply a scoring delta unless paired with a `ruleFire`.
- Transform events can point to future item ids or variant ids such as `cheese-wheel-tier-2`; Fable should decide final ids when the item table lands.

## Ambiguities For Fable

- Should row/column auras include the source item by default?
- Should named combos ever award coins, or are they catalog-only in MVP?
- Should `blocksSlot` prevent scoring, movement, placement only, or all three unless overridden?
- Should `transformsAdjacent` target a concrete item id, a tier upgrade, or both?
- Does `Honey Jar` sticky apply before the next arrange phase or immediately during the current day?

## Persistence Choice

Use AsyncStorage for MVP. The rationale and initial keys are in `src/persistence/README.md`.

## Fixture Pack

`fixtures/m0-fixtures.json` contains six hand-written fixture GameStates and golden ScoringTraces:

- `m0-basic-wine-cheese`
- `m0-wine-dine-combo`
- `m0-mirror-copy`
- `m0-shop-cat-row-aura`
- `m0-scores-last-clock`
- `m0-bamboo-transform`

