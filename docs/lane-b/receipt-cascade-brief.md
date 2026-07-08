# Lane B brief — B-M8: Receipt cascade + cause-then-effect grammar (jury Promote-Now #1–2)

**Author:** Fable, 2026-07-08. **Implementer:** Opus 4.8 (after or parallel to B-M7 — surfaces
overlap only in tokens; coordinate if both touch `typeScale`).
**Review:** Fable for the model + structure; the human device gate owns the look (deferred —
device time is being batched; build to a headless-verifiable core + a listed shot/recording set).
**Origin:** PRODUCT.md / jury verdict: "make ScoringTrace the signature UX" — receipt-style
scoring, and a strict cause-then-effect visual grammar (source item, affected item, delta, total).

## Context (self-sufficient)
The sim emits a `ScoringTrace` (`src/contracts`): ordered events — `itemBase`, `ruleFire`
{sourceSlot, targetSlot, ruleId, delta(flat|mult), runningTotal}, `rowAura`, `itemTotal`,
`comboNamed`, `transform`, `vanish`, `dayTotal`. The cascade player (`src/juice/cascade/`,
pure logic in `popModel.ts`, tiering in `cascadeTier.ts`) animates it on-shelf. Anti-casino
identity: brass/paper/wood/ink, no jackpot language (PRODUCT.md). Art chrome scar: gameplay
stays clean cream; the receipt is paper-on-cream, not a casino overlay.

## Design (decided)

1. **`receiptModel.ts` — the pure core (build FIRST, fully headless).** A function
   `receiptFromTrace(trace, deps): ReceiptLine[]` that renders the trace as a shop receipt:
   one line per item window (`item name … base`), indented cause lines for each ruleFire
   (`↳ [source item] rule-name … ×1.5 → 12`), aura/combo/vanish annotations, subtotals per item
   (`itemTotal`), and the `dayTotal` as the receipt total. Every line carries the slots it came
   from so the UI can cross-highlight shelf ↔ receipt. This is the same pattern as
   `popModel`/`cascadeTier`: all grammar decisions unit-testable in node against hand-built and
   golden traces.
2. **The grammar rule (the jury's #2, non-negotiable):** every visible effect names its cause in
   the order *source item → affected item → delta → new total*. The receipt line format IS the
   grammar; the on-shelf cascade pops stay as shipped (popModel already renders self-fires
   on-slot). No effect may render as a bare number with no source.
3. **Receipt surface:** during/after `openShop` scoring, the receipt "prints" line-by-line in
   sync with the cascade cadence (reduced motion: appears complete, no print animation) on the
   scoring screen; afterwards it is reviewable (scrollable) until the next phase, and the day's
   receipt becomes the body of the share/summary "receipt card" (jury Prototype-Soon daily/share
   item — do the summary reuse only if it drops out for free; otherwise note it as follow-up).
4. **Tone:** paper texture from tokens, ink text, brass total. No slot-machine flourishes — the
   apex spectacle (B-M6) stays the only fireworks layer, and the receipt must not compete with
   it (apex days: receipt prints after the spectacle resolves).

## Non-goals
No sim/trace changes (the trace already carries everything needed — if you believe it doesn't,
STOP and escalate to Fable rather than adding an event kind); no changes to popModel/cascadeTier
semantics; no share-card redesign beyond the free reuse; no sounds beyond one paper tick through
the existing gateway.

## Acceptance criteria
1. `receiptModel` unit tests: every TraceEvent kind renders per the grammar; the six M0 golden
   traces produce stable snapshot receipts (these become grammar regression fixtures); a
   synergy+spotlight+signature trace shows correct cause attribution and ordering. Suite + tsc
   green.
2. Grammar completeness proof: a test walks every `ruleFire` in 50 fuzzed traces and asserts its
   receipt line names a source (no orphan deltas).
3. Cadence sync uses the cascade player's existing timing (no second clock); reduced-motion path
   short-circuits the print animation only.
4. Normal-day performance: receipt build is pure/synchronous; no frame work beyond the line
   reveal (state the measurement or the argument).
5. Visual close-out DEFERRED: list the shots/recording the device gate needs (mid-print, full
   receipt scrolled, apex-day ordering, reduced-motion) with seed recipes.

## Deliverable
`docs/review-packets/B-M8-receipt-cascade-review.md`: built vs criteria, grammar spec as
implemented (line format table), commands + outputs, snapshot receipt for one golden trace,
deferred-gate shot list. **STOP — Fable reviews the model; the human owns the look.**
