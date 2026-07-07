# A-M4 Review Packet — Catalog persistence (retrospective)

**Author:** Opus (orchestrator), reviewing Lane A M4 work that shipped without a packet.
**Verdict: APPROVE** — the permanent-catalog DoD is met and verified against runtime, not
config. One minor observation and two follow-ups, none blocking. Fable sign-off still
required (this packet stands in for the missing Lane A self-review, per the relay's request).

## 1. Built vs. milestone criteria (M4 kickoff DoD)

- **Contract addition — DONE.** `src/contracts/index.ts`: additive `CatalogSchema`
  (`schemaVersion`, `discoveredItemIds`, `achievedComboIds`, `comboCounts`, `stats`),
  `Catalog` type, `parseCatalog`, and `emptyCatalog()` factory. Zod-strict, serializable.
  Frozen `GameState`/`Action`/`TraceEvent` untouched — the catalog is meta, outside the
  seeded run. Matches the pre-approved CCR shape in the kickoff.
- **Catalog persistence — DONE.** `src/persistence/catalog.ts`: `createCatalogPersistence`
  mirrors `createRunPersistence`; own key `luckyShelf:catalog:v1`; versioned
  `CatalogSaveSchema`; **fail-safe on every path** (missing → empty, corrupt → empty,
  version-mismatch → empty; `classifyBadCatalog` distinguishes the two). Never throws.
- **Pure merge — DONE.** `mergeRunIntoCatalog(catalog, gameState)` unions discovered ids,
  bumps each achieved combo's count by one, advances stat maxima and lifetime totals,
  increments `runsPlayed`. Returns a new object; storage-independent.
- **Store + selectors — DONE.** `src/state/catalogStore.ts` exposes `loadCatalog`,
  `recordRunEnd` (runId-guarded against double-merge), and `buildCatalogView` — a join of
  the item/combo tables with discovery state, so Lane B's album never imports sim/items
  internals. View shape documented in §7.
- **Wired into the loop — DONE.** `src/app/summary.tsx` (the `gameOver` route) calls
  `recordRunEnd(gameState)` in a `useEffect`, runId-guarded, and `recordDaily` for daily
  seeds. This is the real merge point; discoveries persist across runs.
- **Daily persistence — DONE (M4/M5 seam).** `src/persistence/daily.ts`: one seeded run per
  local calendar day (`todayDateString`, `dailySeedFor`), fail-safe read, one-attempt record.

## 2. Commands + output

`npx vitest run catalog daily persistence`
```text
Test Files  3 passed (3)
Tests      11 passed (11)
```
Coverage: merge (union + stats), round-trip, empty, corrupt-json fallback, version-mismatch,
daily round-trip/corrupt, seed stability.

Full suite: `npx vitest run` → **59 passed (59)**; `tsc --noEmit` clean.

## 3. Verification — original scenario re-run (DoD #2, runtime not config)

The unit tests exercise merge and persistence *separately* with hand-built state. The
integrated arc (run → persist → new session sees it → corrupt falls back) was **not** covered
by an automated test, so I drove it through the real store + real bot run with an in-memory
storage mock (scripted, then removed):

```text
run1 fired combos: 3 [ 'fire-sale', 'two-cats', 'heirloom-row' ]
runsPlayed empty→merged: 0 → 1
double-merge guard (runsPlayed stays): 1
reloaded new session: items 18  combos 3  runsPlayed 1
reloaded == merged?  true
corrupt fallback: status corrupt  runsPlayed 0  (empty, no crash)
```

This exercises the actual failing-path concerns for save data: a real run's `catalogDelta`
+ `runStats` merged and **survived a fresh store load byte-identically**; re-recording the
same runId was a no-op (idempotent per run); a corrupted save resolved to an empty catalog
without crashing. Save-wipe risk: none — catalog is a separate key from the active-run save,
and both are versioned + fail-safe.

## 4. Findings

- **MINOR — merge point trusts the route, not the phase.** `summary.tsx` records whatever
  `gameState` is mounted, keyed only on `runId`. Today `/summary` is reached only on
  `gameOver`, so it's correct; but nothing in `recordRunEnd` asserts a terminal phase. If a
  future route ever mounts summary mid-run, it would record a partial run (once). Low impact
  (discoveries are valid mid-run; runId guard prevents double-count), but worth a one-line
  guard or comment. Not blocking.
- **NOTE — pure merge is not idempotent by itself.** `runsPlayed`/`totalCoinsAllTime`
  accumulate on every call; idempotency lives in the store's `lastRecordedRunId` guard (and
  is documented in the code). Correct as designed — just flagging that any *new* caller of
  the pure function outside the store must not double-invoke per run.
- **No contract/scoring-order/item-table deviations.** The `Catalog` type is additive and
  does not touch frozen surfaces.

## 5. Follow-ups (non-blocking)
1. Add one automated integration test for the `summary → recordRunEnd → reload` arc so the
   scenario in §3 doesn't rely on a manual script (Lane A, small).
2. Consider the phase-guard from §4 finding 1 when Lane B polishes `/summary` in M5.

## 6. Contract change requests
- `Catalog` schema/type + `parseCatalog`/`emptyCatalog` — additive, pre-approved in the M4
  kickoff. Record as an approved CCR; frozen surfaces untouched.

## 7. Handoff for Lane B (album screen)
Lane B reads ONLY contracts types + these selectors — no sim/items internals:
- `buildCatalogView(catalog)` → `CatalogView`:
  - `items: { id, name, tier (1-4), discovered }[]`
  - `combos: { comboId, name, count, achieved }[]`
  - `itemsDiscovered / itemsTotal / combosAchieved / combosTotal / completionPct`
- Store: `useCatalogStore` → `loadCatalog()` (call on album mount; fail-safe), `catalog`
  state, `recordRunEnd` (already wired at `summary.tsx` — album should not call it).
- Transform-target items (upgrade variants) are listed but sort after base items.

**STOP — awaiting Fable review (`A-M4-fable-review.md`), then Lane B album + art + ambience.**
