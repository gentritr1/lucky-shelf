# Prompt for Lane A (Codex) — Loop Redesign v2, Phase 2b: Build-steering (supplier lean)

Copy below the line into a fresh Codex session in `/Users/gentlegen/Desktop/lucky-shelf`.
Context: `docs/loop-redesign-v2-spec.md` (Phase 2, part **b**) + `docs/research-findings-depth-retention.md`
(mechanic #3 — Stacklands/StS "plan from turn 1"). **Pairs with Phase 2a tag-synergy** (brief:
`docs/lane-a/loop-redesign-phase2a-tag-synergy-brief.md`): 2a makes committing to a tag pay off; 2b lets
the player *choose* which tag to commit to early, and biases the shop toward it. Land 2a first if
possible so the leaned tag has a synergy ladder to climb. Phase 1 daily shop (`LOOP_V2_ENABLED`) and
2c signature items (`SIGNATURE_ITEMS_ENABLED`) already landed behind flags.

---

You are **Lane A (Codex)** on **Lucky Shelf** (follow `AGENTS.md`; `Neek,` prefix; env quirks below).
Phase 2b fixes early linearity: instead of drifting, the player commits to an **archetype at run start**
and the shop skews toward it, so a plan forms turn 1 while luck still fills it in.

## The change (flag-gated, additive)
1. **Supplier lean** — an early, explicit choice of one **eligible tag** (reuse the synergy/`DEMAND_TAG_POOL`
   set so you can only lean into tags that actually have depth + a 2a ladder). Stored as additive
   optional `GameState.supplierTag?: string | null`.
2. **Shop bias** — in `generateOffers` (`src/sim/economy.ts`), items carrying `supplierTag` get their
   `offerWeight` multiplied by `BUILD_STEER_BIAS` (start ~**2.5**, fuzz-tune). The shop skews toward the
   archetype but **must not lock the pool** — off-archetype items still appear (keep variety + the
   earn-now/build-later tension). This is the "signposts synergy with the board" from the spec (the
   visual signposting itself is Lane B, later).

## How the lean is chosen — pick ONE, state which and why (both additive + flagged)
- **(B, recommended) A new `chooseSupplier { tag }` action**, legal **once at run start** (opening
  `delivery` phase, while `supplierTag` is null and the flag is on), added as a new **variant of the
  `ActionSchema` discriminated union**. Additive (existing action variants + their fixtures are
  untouched), so **no `ContractSchemaVersion` bump** — but it IS a contract change ⇒ CCR + Fable
  sign-off. Truest to "plan from turn 1" and cleanly fuzzable. Do NOT add a new `GamePhase` — reuse the
  opening delivery step.
- **(A, lighter fallback) Seeded suggested lean + a targeted reroll**: `createRun` seeds a candidate
  `supplierTag`; the existing `reroll` action, when the flag is on, retargets it. No new action variant
  — smallest contract surface — but weaker agency. Choose this only if you judge (B) too heavy for a
  prototype; justify in the packet.

Whichever: OFF ⇒ `supplierTag` stays absent, offers are byte-identical, and no new legal action appears.

## Flag + safety
- New `BUILD_STEERING_ENABLED = false` + `BUILD_STEERING_ENV_VAR` + `buildSteeringEnabled()` in
  `economy.ts`, mirroring the other flags. Env override `BUILD_STEERING_ENABLED=1` for fuzz.
- Calibrated for the v2 shop (`LOOP_V2_ENABLED`); the bias applies wherever offers generate. State how
  the flags relate.
- OFF ⇒ no `supplierTag`, no offer bias, no new action; **M0 goldens + determinism pin
  (`8d48e1c5a6ad14c9`) byte-identical.** Prove it. `supplierTag` (and any new action variant) is
  **additive + optional + flagged**; **no `ContractSchemaVersion` bump** (v1 saves/fixtures still parse).

## Boundaries
- Yours: `src/sim` (economy offer weighting + engine action/field plumbing), `src/contracts` (additive
  optional field + additive action variant only), `scripts/fuzz.ts` + `src/sim/bots.ts` (a bot must
  pick a lean so fuzz can show archetypes), tests. **NOT yours:** `src/app`, `src/ui`, `src/juice` —
  Lane B renders the supplier pick + shop signposting. Provide a selector/field so Lane B can show the
  chosen lean and mark biased offers. `items.json` needs no change.

## Acceptance criteria (observable) — the spec's bar is "fuzz shows distinct archetype runs"
1. **OFF:** `tsc` clean, all tests green, goldens byte-identical, determinism pin unchanged, fuzz
   medians match baseline; no new legal action surfaces.
2. **ON, unit tests:** setting `supplierTag` biases offer generation toward that tag (a seeded shop
   yields materially more of the leaned tag than an unsteered seed) but still includes off-archetype
   items (pool not locked); the choose-lean path sets the field exactly once and is illegal thereafter;
   mutation check (deleting the bias fails a test). Assert against `BUILD_STEER_BIAS`, not magic numbers.
3. **Fuzz (ON) — distinct archetypes:** a steering bot that picks a lean ends runs with a **higher
   dominant-tag count** on the shelf than the unsteered baseline (report the distribution — steered runs
   should visibly separate into archetypes). AND it must not runaway: `bestDayTotal` medians and
   **game-over rate stay within ~±3pts of baseline** (steering shapes runs, it doesn't just inflate
   them). If 2a is also on, note the compounding (leaning a tag → deeper ladder).
4. **Determinism:** same seed ON → identical (the lean + biased offers are seeded).

## Environment quirks (AGENTS.md)
Node v20 (`export PATH="$HOME/.nvm/versions/node/v20.19.4/bin:$PATH"`; never v23). `node_modules/.bin/tsc`,
`node_modules/.bin/vitest`, `node --import tsx`. Don't regress `babel.config.js`.

## Definition of done
1. `tsc` clean; tests green (existing + new); goldens/determinism byte-identical with the flag OFF.
2. Fuzz posted: dominant-tag-count distribution steered vs baseline + game-over rate + `bestDayTotal`.
3. Post `docs/review-packets/A-M5e-build-steering-review.md` (§8 format) with a **CCR** for the additive
   `supplierTag` field + (if chosen) the new `chooseSupplier` action variant (Fable sign-off; note NO
   schema-version bump, additive union variant) and a **Lane B handoff**: the field/selector for the
   supplier pick UI and how to mark biased offers.
4. **STOP after the packet.** Flag stays OFF-reversible pending Fable sign-off + the relay's device
   feel-gate. Do not graduate; do not touch Lane B.

Start by reading `docs/loop-redesign-v2-spec.md` (Phase 2b), the 2a brief, and `generateOffers` +
`offerWeight` in `src/sim/economy.ts` and the opening flow in `src/sim/engine.ts` (`createRun`,
`legalActions`, the `reroll` case), then confirm understanding + ambiguities in one short message
before building.
