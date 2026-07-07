# Prompt for Lane A (Codex) — Loop Redesign v2, Phase 2a: Escalating tag-set synergies

Copy below the line into a fresh Codex session in `/Users/gentlegen/Desktop/lucky-shelf`.
Context: `docs/loop-redesign-v2-spec.md` (Phase 2, part **a**) + `docs/research-findings-depth-retention.md`
(mechanic #2/#3 — build identity). This is the "**commit to an archetype pays off**" lever. It
**folds in / generalizes the existing Today's Order lever** (`DEMAND_*`), which is today a single
cycle-chosen tag with a flat ×1.5. Phase 1 (daily shop, `LOOP_V2_ENABLED`) and Phase 2c (signature
items, `SIGNATURE_ITEMS_ENABLED`) already landed behind flags. Lane A owns this end to end; Lane B
badges the archetype in the UI afterward (out of scope here).

---

You are **Lane A (Codex)** on **Lucky Shelf** (follow `AGENTS.md`; `Neek,` prefix; env quirks below).
Spec verdict: the loop has no **build identity** — placing items never adds up to "I'm building the
antique shelf." Phase 2a adds the mechanic that makes committing to one tag pay off:
**an escalating multiplier keyed on how many items on the shelf share a tag.**

## The change (flag-gated, additive, NO contract change)

When the flag is ON, at scoring time compute each **eligible tag's** count across occupied slots, and
give every item a per-window multiplier equal to the **single best-qualifying tag's ladder step**.
This slots into the exact place the current `order` mult sits (`src/sim/scoring.ts`, the
`PROTOTYPE (Today's Order)` block ~L558–571: after ambient auras, **before** the spotlight, inside the
item window so the window still caps last).

**Starting ladder (all provisional — fuzz-tuned, assert against the constants not the magnitudes):**
- `< 3` of a tag → ×1 (no bonus / no event)
- `3` → ×1.2   ·   `4` → ×1.4   ·   `5` → ×1.6   ·   `6+` → ×1.8 (cap)

Encode this as an ordered `{ minCount, mult }[]` ladder + an eligible-tag set in `economy.ts`, behind a
new flag. **Reuse `DEMAND_TAG_POOL` as the eligible set** (the well-represented ≥4-count tags) so niche
1–2 count tags (`clock`, `wax`, `cold`) don't mint bonuses.

### Three design decisions — implement the RECOMMENDED path; they are flagged for relay/Fable sign-off
1. **Best tag, not product.** An item multiplies by the **max** qualifying tag ladder, not the product
   of all its tags' ladders. Rationale: rewards *depth in one archetype* ("commit"), is legible ("this
   is a food shelf"), and is bounded (no fancy+lucky+antique triple-stack explosion). *Alt to flag:
   multiplicative stack — richer but can blow the ceiling; leave for a later tuning pass.*
2. **Synergy supersedes Today's Order; they do NOT stack.** When `TAG_SYNERGY_ENABLED` is ON, **skip
   the `order` ×`DEMAND_MULT` branch** so the featured tag isn't double-multiplied. The synergy ladder
   *is* the promoted, generalized form of the order lever. *The "featured tag with a steeper ladder"
   idea (a reason to chase a specific tag this cycle) returns in **Phase 2b** build-steering — do not
   build it here.* When the flag is OFF, the `order` branch is untouched (see safety below).
3. **Floor at 3 (commitment), not 2.** The current `DEMAND_COUNT` is 2; the ladder floor is 3 so the
   bonus reads as "committed archetype," not "any two." *Alt to flag: floor at 2 to match the old
   order feel.*

### Scoring / trace shape
- Compute eligible-tag counts once over `occupied` before the window loop (like `orderMet` is computed
  now). In each item's window, find its best qualifying tag's mult; if `> 1`, apply it and emit a
  `ruleFire{ ruleId: 'synergy', delta: { mult }, sourceSlot: slot, targetSlot: slot }` — **reuse the
  existing `multDelta` shape; NO new `TraceEvent` kind** (same pattern as `order`/`spotlight`), so
  Lane B's cascade animates it for free.
- Ordering with the other flags (all can be ON together): window build → **synergy** mult (this) →
  spotlight mult → window closes → **signature** post-window rules (they read settled totals; no
  circularity). Document this in the packet.
- **No `GameState`/contract field.** The ladder is derived from the shelf's tag counts at scoring time,
  so — unlike signature items — there is **no schema addition and no `ContractSchemaVersion` bump.** The
  CCR is a **scoring-order change only.**

## Flag + safety (byte-identical OFF path is the gate)
- New: `TAG_SYNERGY_ENABLED = false` + `TAG_SYNERGY_ENV_VAR` + `tagSynergyEnabled()` in `economy.ts`,
  mirroring `signatureItemsEnabled()`. Env override `TAG_SYNERGY_ENABLED=1` for fuzz.
- OFF ⇒ the synergy branch is dead, the `order` lever behaves exactly as today, and **M0 goldens +
  the determinism pin (`8d48e1c5a6ad14c9`, `src/sim/determinism.test.ts`) are byte-identical.** Prove it.
- Because synergy *supersedes* order when ON, make sure OFF genuinely leaves `order` in place — i.e.
  the "skip order" path is guarded by `tagSynergyEnabled()`, not unconditional.

## Boundaries
- Yours: `src/sim` (scoring + economy), `scripts/fuzz.ts`, `src/sim/bots.ts` if a metric needs it,
  tests. **NOT yours:** `src/app`, `src/ui`, `src/juice` — Lane B badges the live archetype + animates
  the `synergy` fires later. `items.json` needs **no change** (this reads existing tags).
- Do not retune `DEMAND_*`, the rent curve, or item weights — that's the relay's post-feel-gate call.
- Do not touch or weaken the determinism pin unless a test legitimately shifts it (ON-path only);
  if so, update it consciously with a one-line reason per the existing comment.

## Acceptance criteria (observable)
1. **OFF:** `tsc --noEmit` clean, all existing tests green, **goldens byte-identical, determinism pin
   unchanged**, fuzz medians match baseline.
2. **ON, unit tests** (`src/sim/*.test.ts`, against the flag constants):
   - A hand-built `GameState` with `N` items sharing an eligible tag → each matching item's `itemTotal`
     equals its no-synergy total × the ladder step for `N` (floored), with a `ruleFire{ruleId:'synergy'}`
     in that slot's window. `N` below the floor → no effect, no event.
   - **Best-tag (max), not product:** an item with two qualifying tags at different counts multiplies by
     the higher ladder only (assert exactly one `synergy` fire, at the max mult).
   - **Supersession:** with the synergy flag ON, a shelf that also meets a `dailyOrder` emits **no
     `order` fire** (only `synergy`); with the flag OFF, the same shelf emits `order` as before.
   - **Ordering:** an item hit by synergy + spotlight applies synergy first, spotlight last.
   - **Mutation check:** deleting the ladder branch fails a test (prove it's not a tautology) — note how
     you confirmed it in the packet.
3. **Fuzz (ON):** add a per-strategy metric that reports **distinct archetype commitment** — e.g. the
   distribution of the *dominant eligible-tag count* on scored shelves (how deep bots go into one tag)
   and a `synergyFireRate`. Show ON vs OFF **`bestDayTotal` median AND p95** so the ceiling is visible,
   and confirm **rent still bites** (bot loss rate is not driven to ~0 — the lever must not trivialize
   the wall). Keep fuzz output shape backward-compatible (new keys only). Paste a 100-run greedy+combo
   sample.
4. **Determinism:** two runs, same seed, ON → identical (the ladder is a pure function of the shelf).

## Environment quirks (AGENTS.md)
Node v20 (`export PATH="$HOME/.nvm/versions/node/v20.19.4/bin:$PATH"`; never v23). `node_modules/.bin/tsc`,
`node_modules/.bin/vitest`, `node --import tsx`. Don't regress `babel.config.js`.

## Definition of done
1. `tsc` clean; tests green (existing + new); goldens/determinism byte-identical with the flag OFF.
2. Fuzz posted: archetype-commitment distribution + `synergyFireRate` + ON/OFF median & p95 + loss-rate.
3. Post `docs/review-packets/A-M5c-tag-synergy-review.md` (§8 format) with a **CCR** for the
   scoring-order change (synergy per-window mult; supersedes `order` when ON — **needs Fable sign-off**;
   note there is deliberately **no contract-schema change**) and a **Lane B handoff**: the `synergy`
   `ruleFire` events (shape identical to `order`/`spotlight`) and how to read the live dominant tag so
   the shop/shelf can badge the archetype.
4. **STOP after the packet.** The flag stays OFF-reversible pending Fable sign-off + the relay's device
   feel-gate. Do not graduate; do not touch Lane B.

Start by reading `docs/loop-redesign-v2-spec.md`, `docs/research-findings-depth-retention.md`, and the
`order`/`spotlight`/signature blocks in `src/sim/scoring.ts` + the `DEMAND_*` block in
`src/sim/economy.ts`, then confirm understanding + ambiguities in one short message before building.
