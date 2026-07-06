# Prompt for Lane A (Codex) — M4 kickoff (Catalog persistence, goes FIRST)

M4 = Catalog & Higgsfield Art. Lane A owns catalog persistence + stat tracking; Lane B
owns the album screen + art + ambience. Like M3, this is **sequenced**: Lane A lands the
permanent-catalog data + selectors and posts a handoff, THEN Lane B builds the album
screen against it. You go first.

Copy everything below the line into a fresh Codex session in
`/Users/gentlegen/Desktop/lucky-shelf`.

---

You are **Lane A (Codex) — Logic & Heavy Work** on **Lucky Shelf**. Creed: boring correct
code. M4 (kickoff §9): catalog persistence, named-combo detection, stat tracking. You go
first; Lane B builds the Catalog album on top of what you land.

## Read first, in order

1. `docs/lucky-shelf-kickoff.md` — §1 "The Catalog" (the collection meta: every item
   discovered, every named combo achieved, best-run stats, permanent across runs), §9 M4.
2. `docs/review-packets/A-M3-fable-review.md` + `B-M3-fable-review.md` — M3 is closed;
   the standing note (nothing non-route in `src/app/`; store is `src/state/store.ts`).
3. `src/contracts/index.ts` (`CatalogDelta` exists — per-run discoveries; you'll ADD a
   permanent `Catalog` type), `src/persistence/index.ts` (`createRunPersistence` pattern
   — mirror it for catalog), `src/state/store.ts` (run store — you'll add catalog
   read/merge).
4. `docs/product-moat-suggestions.md` S-13/S-14 — Fable promoted these into M4; your job
   is to make the DATA support them (per-combo achievement, completion counts). The
   presentation is Lane B's.

## Project state (verified)

- Engine emits `comboNamed` trace events; each run accumulates `catalogDelta`
  (discoveredItemIds/discoveredComboIds) in GameState. Run save (`ActiveRunSave`) works.
  51/51 tests, tsc clean, pushed to git.
- There is **no permanent catalog** yet — discoveries evaporate when a run ends. That's
  what you build.

## Your M4 scope

1. **Contract addition (Fable pre-approved — record as an approved CCR in your packet).**
   Add an additive `Catalog` schema + type to `src/contracts/index.ts`. It does NOT touch
   frozen `GameState`/`Action`/`TraceEvent`. Suggested shape (refine as you build):
   ```ts
   Catalog = {
     schemaVersion: 1,
     discoveredItemIds: string[],        // every item ever seen on a shelf
     achievedComboIds: string[],         // every named combo ever fired
     comboCounts: Record<string, number>,// times each combo achieved (S-13/S-14 data)
     stats: {
       runsPlayed: number,
       bestDayTotal: number,
       deepestRentSurvived: number,
       mostCoinsInARun: number,
       totalCoinsAllTime: number,
     },
   }
   ```
   Add `parseCatalog` + an `emptyCatalog()` factory. Keep it serializable + zod-strict.
2. **Catalog persistence** (`src/persistence/`). Mirror `createRunPersistence`: a new
   `luckyShelf:catalog:v1` key, `CatalogSaveSchema` (versioned), zod-parsed, **fail-safe**
   (missing → empty catalog; corrupt/version-mismatch → empty catalog, never crash).
   `createCatalogPersistence(storage)` with `load()` / `save(catalog)`. Unit-test
   round-trip + corruption + version-mismatch with the in-memory storage mock.
3. **Merge on run end.** When a run reaches `gameOver` (or completes a day — you decide
   the merge point; document it), fold the run's `catalogDelta` + `runStats` into the
   permanent catalog: union the discovered ids, increment `comboCounts` per achieved
   combo, update the `stats` maxima and `runsPlayed`/`totalCoinsAllTime`. Pure merge
   function (`mergeRunIntoCatalog(catalog, gameState)`) unit-tested independently of
   storage.
4. **Catalog store + selectors** (`src/state/`). Expose the loaded catalog and a merge
   action to the app, with narrow selectors Lane B will consume (all-items-with-
   discovered-flag, all-combos-with-count, stats). Lane B reads ONLY contracts types +
   these selectors — design the surface so the album screen never needs sim/items
   internals directly (you may expose a `catalogView` selector that joins the item/combo
   tables with discovery state, so Lane B gets `{id, name, discovered, ...}` rows).
5. **Wire the merge into the real loop.** On run end, the run's discoveries actually
   persist; starting a new run keeps the catalog. Continue-restore unaffected.

## Boundaries

- Yours: `src/contracts` (this additive change only), `src/sim`, `src/persistence`,
  `src/state`, `scripts`, tests. NOT yours: `src/ui`, `src/juice`, the album SCREEN
  (Lane B builds it — you provide the data + a `/catalog` route stub only if needed for
  your own verification, flagged for Lane B to own).
- Determinism unaffected; the catalog is meta, outside the seeded run.
- `GameState`/`Action`/`TraceEvent` stay frozen — only the new `Catalog` type is added.

## Environment quirks

Default Node v14 breaks everything → `export PATH="$HOME/.nvm/versions/node/v20.19.4/bin:$PATH"`
(arm64; never v23.3.0). corepack pnpm broken → `node_modules/.bin/tsc --noEmit`,
`node_modules/.bin/vitest run`, `node --import tsx <script>`. Don't regress
`babel.config.js`. Use the `expo-web` launch config (8090); 8091/8092 are Lane B's.

## Definition of done

1. tsc strict clean; all tests green (existing + new catalog persistence/merge tests).
2. A scripted or unit-tested full arc: play a run that fires a combo → run ends →
   catalog persists the item/combo/stats → new run still sees them → corrupt catalog
   save falls back to empty without crashing.
3. Post `docs/review-packets/A-M4-review.md` (§8 format) with a **handoff for Lane B**:
   the exact catalog selector/view shape the album screen consumes, the merge point, and
   any `/catalog` route stub you left. Record the `Catalog` contract addition as an
   approved CCR.
4. **STOP after the packet.** Fable reviews, then hands Lane B the album + art + ambience.

Start by reading the listed files, then confirm understanding + ambiguities in one short
message before building.
