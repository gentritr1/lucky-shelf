# Fable Review — A-M0 (Contracts & Scaffolding)

**Verdict: APPROVED — contract v1 FROZEN** (2026-07-06), with one fixture correction applied during review (F-1) and two Fable-signed contract amendments folded into the freeze (A-1, A-2). Lane A may proceed to M1.

## Scope reviewed

- `src/contracts/index.ts` against kickoff §4 (GameState / Action / ScoringTrace).
- `fixtures/m0-fixtures.json` — all six golden traces recomputed by hand.
- `src/persistence/README.md` AsyncStorage rationale — accepted for MVP; save schema is
  versioned (`schemaVersion`), so a later move to expo-sqlite is a migration, not a rewrite.
- Verification: `pnpm m0` green (typecheck, fixture validation, 4 contract tests).

## Findings

- **F-1 (fixed in review): `m0-shop-cat-row-aura` omitted Honey Jar's rule.** Honey (0,2) is
  adjacent to Wine (0,1); the golden scored wine as if honey were inert. A golden that the
  correct M1 engine will contradict is a trap. Fixed: honey's `ruleFire` (+4, in wine's
  resolution window), wine total 12, day total 15.
- No other deviations. Zod strictness, shelf invariant refinements, and the
  dayTotal-terminated trace refinement are approved as contract-level guarantees.

## Fable-signed amendments (part of frozen v1)

- **A-1:** `ItemDefinition.upgradesToItemId?` added — the tier-upgrade graph is authored by
  Fable in the item table; the engine resolves tier upgrades to concrete ids and never
  invents items. Items without it are not upgradeable.
- **A-2:** `growsEachDay.toTier` removed (dead under A-1/R-4).

## Rulings (binding for M1+)

- **R-1 — Auras exclude their source.** Row/column auras affect every *other* item in the
  row/column. Self-buffs require a separate explicit rule.
- **R-2 — Named combos are catalog-only in MVP.** No coins; `comboNamed` is the collection
  moment. Coin payoff already flows through the underlying adjacency rules.
- **R-3 — `blocksSlot` blocks scoring only.** Blocked item emits `itemBase 0` and accrues
  nothing; it may still be moved normally. Sticky remains the only movement lock.
- **R-4 — Transforms resolve to concrete item ids.** Fixed transforms via
  `transformsAdjacent.toItemId`; tier upgrades via the target's `upgradesToItemId`.
  Bamboo's random pick is seeded-deterministic; unupgradeable neighbors are skipped
  (re-roll among eligible; no eligible neighbors = no-op, no trace event).
- **R-5 — Honey sticky lands next arrange phase.** The +4c fires during today's openShop;
  the `sticky` flag is set in the post-scoring state. No mid-arrange gotchas.
- **R-6 — `ruleFire` is emitted in the resolution window of the slot whose `runningTotal`
  it modifies** (between that slot's `itemBase` and `itemTotal`). `sourceSlot` = whose rule
  it is; `targetSlot` = the other slot involved. Lane B: arrow renders source→target;
  count-up ticks on the currently-resolving slot.
- **R-7 — `itemTotal` is final.** Nothing retro-modifies a slot after its `itemTotal`;
  effects that need later information must defer the whole window (`scoresLast`).
- **R-8 — Aging mutates instance `baseValue` at day rollover.** `itemBase` always shows the
  current effective base (fixtures 3 and 6 model this).
- **R-9 — Column effects are per-target `ruleFire`s** — no dedicated trace event in MVP.
  Lane B requirement: once `rowAura` fires, the row glow persists so boosted `itemTotal`s
  stay attributable (Pillar 2).

## Freeze terms

`src/contracts/index.ts` at this state is **contract v1**. Any change now requires a
Contract Change Request in a review packet and Fable sign-off. Golden fixtures are
normative for trace *shape and ordering*; at M1 they must be reproduced exactly by the real
engine (`pnpm test` snapshot gate).

## Owed at M1 (Fable → Lane A)

- Full 36-item table as JSON (with tags, rules, `upgradesToItemId` graph) — authored
  against the running engine + fuzz stats, per kickoff.
- Final variant item ids (the fixture's provisional `cheese-wheel-tier-2` will be replaced
  when the table lands; regenerate goldens from the engine at that point).
- ~20 named combo definitions (catalog-only per R-2).

## Note on Lane B

Lane B's M0 packet (tokens draft, component inventory, throwaway screen) is owed
separately; this freeze unblocks both lanes regardless — Lane B builds against these
fixtures from day one.
