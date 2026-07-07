# Prompt for Lane A (Codex) — Loop Redesign v2, Phase 2c: Signature stock (run-defining items)

Copy below the line into a fresh Codex session in `/Users/gentlegen/Desktop/lucky-shelf`.
Context: `docs/loop-redesign-v2-spec.md` (Phase 2) + `docs/research-findings-depth-retention.md`
(mechanic #2 — the biggest fun gap). Phase 1 (daily shop) already landed behind `LOOP_V2_ENABLED`.
Lane A goes first; Opus/Lane B badges these in the shop screen afterward.

---

You are **Lane A (Codex)** on **Lucky Shelf** (follow `AGENTS.md`; `Neek,` prefix; env quirks below).
Game research verdict: the biggest missing piece is **run identity** — comparable games (Balatro
Jokers, Luck-be-a-Landlord special symbols, Monster Train) give each run its own logic via a few
**pieces that change the scoring math**, not just add value. Phase 2c adds our cozy version:
**signature stock**.

## The change (flag-gated, additive)
Add a small set of **~5 signature items** — higher-tier, rarer, pricier — that **redefine a run's
scoring** shelf-wide (not just local adjacency), so acquiring one makes the run "turn on." Design
intent (tune freely; cozy reskins of Jokers):
1. **Brass Scale** — ×1.5 to every `food` item's final total (shelf-wide, tag-filtered multiplier).
2. **Ledger Book** — +N coins per `antique` on the shelf (scales with a tag count).
3. **Lucky Cat** — copies the final total of the highest-scoring other item on the shelf.
4. **Consignment Sign** — ×N to the whole shelf, but only if ≥K items share any one tag (rewards
   committing to an archetype).
5. **Window Display** — ×2 to the single highest-base-value item.

These need scoring support the engine lacks (it has `shelfMultiplier`/`rowMultiplier` shelf-wide
effects but no **tag-filtered** shelf multiplier, no "per-tag-count flat," no "copy best on shelf").
Add the minimum **additive, flagged** rule capability to express them — e.g. new rule kind(s) or an
optional `tag` filter on the existing shelf-wide effect. Keep the resolution deterministic and slot
it into the documented scoring order (after per-item totals, alongside/So-after ambient auras — you
decide and document, but it must be replayable and land in the ScoringTrace so Lane B's cascade
animates it).

## Flag + safety
- Gate behind `SIGNATURE_ITEMS_ENABLED` (or reuse `LOOP_V2_ENABLED` if you argue they ship together —
  state which). OFF ⇒ these items never enter offers, the new rule branch is dead, and **M0 goldens +
  determinism are byte-identical**. Prove the OFF path is unchanged.
- Signature items enter the **shop** rarely and cost more (low tier-weight / a dedicated rare slot /
  premium `dailyShopCost`). Don't let them flood offers.
- `GameState`/`Action` frozen; any new rule kind or `ItemDefinition` field is **additive + optional**,
  no `ContractSchemaVersion` bump. Fixtures don't reference signature items.

## Boundaries
- Yours: `src/contracts` (additive rule kind only), `src/sim` (scoring + economy), `src/items`
  (items.json + any combos), `src/state` selectors, `scripts`, tests. **NOT yours:** the shop SCREEN
  / `src/app`, `src/ui`, `src/juice` — Opus/Lane B badges signature items in the shop + cascade.
- Provide a way for Lane B to identify a signature item (a flag on the definition or a selector) so
  the shop can mark it "SIGNATURE."

## Acceptance criteria (observable)
1. OFF: tsc clean, all tests green, goldens byte-identical, determinism pin unchanged, fuzz medians
   match baseline.
2. ON: unit tests for each signature item's scoring (each fires correctly + appears in the trace as a
   ruleFire/aura event; each is a no-op when its condition isn't met). A mutation check: deleting a
   signature rule branch fails its test.
3. Fuzz (ON): report a **signature-pickup rate** and show that runs which acquire a signature item
   have a **distinct bestDayTotal distribution** (higher variance / ceiling) than runs without — i.e.
   they measurably bend the curve. No single signature item dominates >2× median.
4. Determinism: two runs same seed → identical (signature offers are seeded like other offers).

## Environment quirks (AGENTS.md)
Node v20 (`export PATH="$HOME/.nvm/versions/node/v20.19.4/bin:$PATH"`; never v23). `node_modules/.bin/tsc`,
`node_modules/.bin/vitest`, `node --import tsx`. Don't regress `babel.config.js`.

## Definition of done
1. tsc clean; tests green (existing + new); goldens/determinism unchanged with the flag OFF.
2. Fuzz posted with signature-pickup rate + the curve-bending evidence.
3. Post `docs/review-packets/A-M5b-signature-items-review.md` (§8 format) with a **CCR** for the new
   scoring rule kind (needs Fable sign-off) and a **Lane B handoff**: how a signature item is
   identified, and what trace events its effect emits so the cascade can animate them.
4. **STOP after the packet.** Flags stay OFF-reversible pending Fable + device feel-gate.

Start by reading the spec, the research findings, and `scoring.ts` (the existing shelf-wide-effect
handling), then confirm understanding + ambiguities in one short message before building.
