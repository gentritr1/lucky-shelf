# Lane A brief — A-M8: Placement-hint model (qualitative, discovered-rules-only)

**Author:** Fable, 2026-07-09. **Implementer:** Codex. **Review:** Fable re-runs everything.
**Origin:** design-review mockup "Ghost Placement Preview" + the jury's Prototype-Soon caveat
("avoid just-pick-biggest-number"). **Fable's ruling, binding for this brief:** the hint is
QUALITATIVE (a slot either would or wouldn't trigger something — no coins, no totals, no rule
names) and it only reflects rules the player has ALREADY seen — an exact-numbers preview turns
placement into argmax and spoils the combo-discovery retention beat. The full numeric ledger
stays out of scope (possibly a future comfort-settings assist).

## Context (self-sufficient)
Deterministic sim in `src/sim`; `resolveOpenShop(state, table, combos)` (`src/sim/scoring.ts`)
is pure — it returns a fresh `ScoringResult` with a full `ScoringTrace` and never mutates input.
The permanent Catalog (`src/contracts`) tracks `discoveredItemIds` (items ever shelved) and
`achievedComboIds`. OFF-path discipline: pin `8d48e1c5a6ad14c9`, 6 goldens, 6 fixtures.
Toolchain `PATH="$HOME/.nvm/versions/node/v23.3.0/bin:$PATH"`.

## Design (decided)
- New pure module `src/sim/placementHints.ts` — **no flag needed in Lane A**: nothing in the
  engine, dispatcher, offer generation, bots, or affordances may import it. It is a leaf module
  the Lane B surface will consume behind its own flag later. Byte-identity is therefore
  trivially safe — prove it structurally (see acceptance 4).
- API: `placementHints(state, heldItem, deps, known): PlacementHint[]` where
  `known = { discoveredItemIds, achievedComboIds }` (pass the fields, not the Catalog type — keep
  the sim free of persistence types) and each hint is
  `{ slot, tier: 'none' | 'active', comboTeased: boolean }` for every EMPTY, placeable slot.
- Semantics: a slot is `active` when placing `heldItem` there causes ≥1 `ruleFire` (in the
  hypothetical `resolveOpenShop` trace, relative to the same board without the placement) whose
  source OR target is the candidate slot — **and** the rule's owning item is in
  `discoveredItemIds` (the "you've seen this item work before" proxy; the placed item itself
  must also be discovered for its own rules to hint). `comboTeased` is true when the placement
  completes a named combo already in `achievedComboIds` — never for unachieved combos (the
  spoiler rule).
- Determinism/purity: same inputs → same hints; no RNG derivation beyond what `resolveOpenShop`
  already does internally; input state never mutated (assert with a deep-freeze or JSON
  comparison in tests).
- Performance: one call evaluates all empty slots (≤ 15 hypothetical resolutions on a 4×4).
  Report the measured cost of a full-board call (node bench, median of 100) — budget ≤ 10ms so
  Lane B can call it per drag-start without memoization heroics.

## Non-goals
No UI, no flag, no engine/affordances/offer changes, no new contract or catalog fields, no
numeric outputs of any kind, no unachieved-combo hints, no items.json edits.

## Acceptance criteria
1. Unit tests on hand-built boards: adjacency rule fires → `active` only when the source item is
   discovered; undiscovered source → `none` even though the sim would fire; combo completion →
   `comboTeased` only when previously achieved; empty-board and full-board edges; blocked slots
   excluded; input-state purity assertion.
2. Property test over 50 fuzzed states: hints are a pure function (two calls byte-equal) and
   every `active` slot's hypothetical trace really contains a qualifying discovered-source fire.
3. Bench number reported (criterion above).
4. **Structural byte-identity proof:** a test (or grep assertion in the packet) that no module
   under `src/sim` except tests imports `placementHints`, and the full floor (pin, goldens,
   fixtures, suite) is green unchanged.

## Deliverable
`docs/review-packets/A-M8-placement-hints-review.md`: built vs criteria, commands + outputs,
bench, the Lane B handoff section (exact API + the flag name Lane B should use:
`PLACEMENT_HINT_ENABLED`), STOP line. **STOP — Fable reviews; UI is a later Lane B brief.**
