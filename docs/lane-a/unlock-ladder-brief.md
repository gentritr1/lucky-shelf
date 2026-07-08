# Lane A brief — A-M7: Unlock ladder (`UNLOCK_LADDER_ENABLED`)

**Author:** Fable, 2026-07-08. **Implementer:** Codex. **Review:** Fable re-runs everything.
**Origin:** P1 in `docs/state-of-game-review-2026-07-08.md` — the one gap every comparable
success has covered: nothing answers "what do I get next run?"; all 36 items exist from run 1.

## Context (self-sufficient)

Lucky Shelf, deterministic sim in `src/sim`; permanent cross-run data lives in the Catalog
(`src/contracts` CatalogSchema, persisted via `src/persistence/catalog.ts`, store
`src/state/catalogStore.ts`). All depth flags default OFF; OFF path pinned byte-identical
(hash `8d48e1c5a6ad14c9`, 6 goldens, 6 fixtures). Toolchain
`PATH="$HOME/.nvm/versions/node/v23.3.0/bin:$PATH"`.

Facts verified against live code:
- `Catalog.stats.runsPlayed`, `discoveredItemIds`, `achievedComboIds` already exist and persist —
  **unlock predicates read these; NO new persisted catalog fields, NO migration risk.**
- `recordRunEnd` is load-guarded and boot-hydration exists in `_layout` (see
  `docs/review-packets/B-M4-fable-review.md` — the catalog-wipe P0). Respect both.
- The offer generator (`offerablePool`/`generateOffers` in `src/sim/economy.ts`) currently draws
  from the full table (minus transform targets/signature gating).

## Design (decided — implement as specified)

- Flag `UNLOCK_LADDER_ENABLED` (+ env var) in `src/sim/economy.ts`, default OFF. Not loopV2-gated
  (the ladder is cross-run), but graduation will bundle with the v2 set.
- New module `src/sim/unlocks.ts`: a Fable-authored table `itemId → UnlockPredicate` with kinds
  `{ kind:'always' } | { kind:'runsPlayed', count } | { kind:'itemDiscovered', itemId } |
  { kind:'comboAchieved', comboId }`, plus `unlockedItemIds(catalog, table): string[]` (sorted)
  and `nextUnlocks(catalog, table): { itemId, predicate }[]` (the nearest locked items, for
  Lane B). **Do not touch `items.json`** — the ladder is a sidecar table.
- Provisional ladder (Fable balance surface — tune within the acceptance bounds, report final):
  the 12 kickoff exemplars + enough tier-1s to keep early offers healthy (~16 items) are
  `always`; the remaining ~20 unlock across `runsPlayed` 2–20, with 3–5 gated on discoveries or
  named combos ("use cheese-wheel to unlock ice-box" style hooks). Signature items keep their
  existing `SIGNATURE_ITEMS_ENABLED` gating ON TOP of the ladder.
- **Replay integrity (the load-bearing decision):** with the flag on, `createRun` snapshots the
  run's unlocked pool onto an additive optional `GameState.unlockedItemIds?: string[]` (sorted).
  Offer generation filters by that snapshot when the field is present. This keeps
  `{seed, actions}` replays reproducible (the daily/ghost moat depends on it) and keeps the
  run's offer stream independent of mid-run catalog changes. CCR: additive optional field, no
  `ContractSchemaVersion` bump; old fixtures must parse; field absent = full pool (v1 behavior).
- Wiring: `createRun` gains an additive options argument (or equivalent) through which the run
  store passes the unlocked set derived from the *loaded* catalog store. Fallback when the
  catalog isn't loaded yet (`loadStatus` idle/loading): use the `always` starter set — safe
  direction (fewer unlocks, never more), deterministic per run via the snapshot.

## Non-goals
No UI (Lane B brief B-M5 consumes `unlockedItemIds`/`nextUnlocks` via store view-models); no
persisted-schema changes; no price/economy changes; no items.json edits; no flag graduations.

## Observable acceptance criteria
1. **OFF byte-identity:** pin, goldens, fixtures, suite green; flag-off runs carry no
   `unlockedItemIds` field and draw the full pool byte-identically.
2. **The drip works (the point):** simulate a fresh catalog playing greedy-bot runs with the flag
   ON, merging each run via `mergeRunIntoCatalog`: **≥1 new unlock lands within each of the first
   5 runs, and the full non-signature pool is reachable by run ~20** (assert ≤ 22 for slack).
   Discovery/combo-gated items must be reachable by bots (pick hooks bots actually hit — verify,
   don't assume).
3. **Replay integrity:** a flagged run replayed from `{seed, actions}` reproduces the final state
   hash even when the live catalog has since changed (test: replay after mutating the catalog).
4. **Offer reachability:** the invariants test's "every offerable item reachable" holds under
   full-unlock context; a locked item NEVER appears in any offer of a snapshot-limited run (fuzz
   assertion across 200 seeds).
5. **Early-arc drift report:** 120-run fuzz, full v2 stack + UNLOCK_LADDER, fresh-catalog
   snapshot (starter pool): report days 1–5 goal hit rates and floor first-rent survival vs the
   same stack without the ladder. Report only — the goal table is Fable's (tune-vs-stack scar).
6. **Degenerate probes:** empty catalog (starter set only) still yields ≥ `OFFERS_PER_DELIVERY`
   + `LOOP_V2_DAILY_SHOP_OFFERS` distinct offerable items on day 1 (no thin-pool dead-end);
   catalog with everything unlocked = today's pool exactly; buyout+reroll under a small pool
   mints no duplicate ids; mutation check (neuter the filter → tests fail → restore).

## Exact verification commands (Fable re-runs)
```
PATH=… node_modules/.bin/tsc --noEmit
PATH=… node --import tsx scripts/validate-fixtures.ts
PATH=… node_modules/.bin/vitest run
PATH=… LOOP_V2_ENABLED=1 …(full v2 stack)… UNLOCK_LADDER_ENABLED=1 node --import tsx scripts/fuzz.ts --runs 120 --strategy all --seed m7-on
PATH=… LOOP_V2_ENABLED=1 …(full v2 stack)… node --import tsx scripts/fuzz.ts --runs 120 --strategy all --seed m7-on
PATH=… node --import tsx scripts/balance.ts --assert-bands
```

## Deliverable
`docs/review-packets/A-M7-unlock-ladder-review.md`, A-M5a style: built vs criteria, the final
ladder table with rationale, commands + real outputs, drip simulation evidence, replay-integrity
test, drift report, CCR for `unlockedItemIds?`, STOP line.

**STOP — land behind the flag, default OFF. Fable reviews the packet.**
