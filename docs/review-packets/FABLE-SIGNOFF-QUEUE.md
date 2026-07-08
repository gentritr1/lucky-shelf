# Fable sign-off queue — loop-redesign v2 (start here when Fable returns)

> **✅ RESOLVED 2026-07-08 — Fable's authoritative pass is done.** See
> **[FABLE-RULINGS-2026-07-08.md](FABLE-RULINGS-2026-07-08.md)**: all six phases ruled (five
> APPROVED; goal-ladder CCR approved but its target table gets REQUEST CHANGES — out of band under
> the full flag stack), sell-back and loose-economy balance rulings issued. Remaining gates are the
> **economy-tightening pass** (brief inside the rulings doc) and the **human device feel-gate**.
> The table below is kept as the historical stand-in record.

**Purpose:** one landing page for Fable. Everything below is **landed behind a default-OFF flag** and
was reviewed by an **Opus orchestrator stand-in** (Fable was unavailable — see project memory
`reviewer-workflow-opus-split`). The stand-in verdicts are `*-fable-review.md`; they are **provisional
and do not replace real Fable authority** over contract / scoring-order / item-table changes. Nothing
here has graduated. When you return, read each row's stand-in review + Codex packet, then record your
authoritative feedback in the same `*-fable-review.md` file (or a new dated one).

Updated 2026-07-07 by the Opus orchestrator.

## Status legend
- **Stand-in APPROVE** = Opus re-ran OFF byte-identity + the core mechanic + a mutation check; landed behind flag.
- **Awaiting Fable** = still needs your sign-off on the CCR / balance before the flag can ship ON.
- **Feel-gate** = the human's device play-test, separate from code review.

## Queue

| Phase / flag | Codex packet | Stand-in review | Status | What Fable must decide |
|---|---|---|---|---|
| Depth levers — spotlight + Today's Order (`SPOTLIGHT_ENABLED`, `DEMAND_*`, **default ON**) | [A-M4b-levers-review](A-M4b-levers-review.md) | — | Awaiting Fable + feel-gate | Scoring-order CCR (order/spotlight mults); note these two are the **exception: default ON**, not off |
| Loop v2 Phase 1 — daily buy-multiple shop (`LOOP_V2_ENABLED`) | [A-M5a-loop-v2-phase1-review](A-M5a-loop-v2-phase1-review.md) | orchestrator APPROVED (per handoff) | Awaiting Fable + feel-gate | Economy cadence + starting coins |
| Phase 2c — signature items (`SIGNATURE_ITEMS_ENABLED`) | [A-M5b-signature-items-review](A-M5b-signature-items-review.md) | [A-M5b-fable-review](A-M5b-fable-review.md) | Stand-in APPROVE | New scoring rule kinds (CCR); **dominance gate CLOSED** → [A-M5b-signature-dominance-gate](A-M5b-signature-dominance-gate.md) |
| **Phase 2a — tag-set synergy** (`TAG_SYNERGY_ENABLED`) | [A-M5c-tag-synergy-review](A-M5c-tag-synergy-review.md) | [A-M5c-fable-review](A-M5c-fable-review.md) | **Stand-in APPROVE** (`5e0797a`) | Ladder magnitudes; best-tag-not-product; supersedes Today's Order; blocked-slot counting; p95 ceiling |
| **Phase 2b — build steering** (`BUILD_STEERING_ENABLED`) | [A-M5e-build-steering-review](A-M5e-build-steering-review.md) | [A-M5e-fable-review](A-M5e-fable-review.md) | **Stand-in APPROVE** (`5e0797a`) | Additive contract (CCR-4: `supplierTag` + `chooseSupplier`); **mandatory pick** reading; `BUILD_STEER_BIAS`; needs Lane B picker |
| **Phase 3 — daily goal ladder** (`GOAL_LADDER_ENABLED`, requires `LOOP_V2`) | [A-M5d-goal-ladder-review](A-M5d-goal-ladder-review.md) | [A-M5d-fable-review](A-M5d-fable-review.md) | **Stand-in APPROVE** | Tuned target table `[16..74]` + day-10 cap; reward token semantics; `freeRerollTokens` count vs boolean for Lane B |

## Open CCRs awaiting real Fable (consolidated)
- **Scoring-order:** order/spotlight mults (levers); **2a** tag-synergy mult that *supersedes* Today's Order when on. No schema change.
- **New scoring rule kinds:** 2c signature items (`tagFilteredShelfMultiplier`, `flatPerTagCount`, `copyHighestScoringOther`, `shelfMultiplierIfAnyTagCount`, `highestBaseValueMultiplier`).
- **Contract (additive, no `ContractSchemaVersion` bump):** **2b** `GameState.supplierTag?` + `chooseSupplier{tag}` action; **3** `GameState.dailyTarget?` + `dailyTargetResult?` (`DailyTargetResultSchema`) + `freeRerollTokens?`; **1** `GameState.loopV2?` (bool, `ab83c8d`) — a per-run snapshot of `LOOP_V2_ENABLED` set once at `createRun`, so a run can't be split half-v1/half-v2 by a mid-session flag flip. Purely mechanical, no balance/scoring effect; only ever `true` on a v2 run, absent (→ v1) otherwise, so the OFF-path hash is byte-identical. FYI for the contract pass; not a balance decision.

## Balance findings from the device feel-gate (2026-07-07)
- Verdict was positive ("way better than before"); the gap was intuitiveness, addressed by UI fixes.
- **Sell-back is +0 for tier-1 items** (`sellPrice = floor(baseValue/3)`): cheap items return 0 coins, so selling them is worthless. The Sell UI now shows the real value honestly; whether selling *should* be worthwhile is a balance call (raise the sell ratio / add a floor). Fable's call in the item-table pass.

## Balance finding — economy is too loose with all depth flags ON (2026-07-08, data-backed)
Device play reached day 9 with **167 coins vs rent 51** on a full shelf (nothing to spend on). A fuzz
(120 runs, greedy bot, LOOP_V2+SIGNATURE+TAG_SYNERGY+BUILD_STEERING+GOAL_LADDER all on) confirms it:
- **Earnings run ~4–7× the rent burden.** e.g. day 9 median **~118 coins earned/day** vs rent ~17/day
  (51 per 3-day cycle); day 12 ~120/day vs ~27/day. Bots **understate** real play, so it's worse live.
- **Bots survive a median of 30 days (max 36), deepest rent cycle ~9–11.** Very long for a survival loop
  where tension should mount; money piles up because the only sink is the 12-slot shelf, which saturates.
- The rent curve (`RENT_GROWTH_LATE 1.6` from cycle 4: 51→82→131→210) never catches the stacked
  multipliers. **Fable's call:** tighten the rent curve and/or the multiplier stack, and/or add a coin
  sink. Note this is *linked* to the softlock (`06771cf`): loose economy → shelf overflows → the dead-end.
  My session's work changed **zero economy numbers** (all presentation) — this is pre-existing provisional
  tuning surfaced by the feel-gate.

## Cross-cutting notes for Fable
- Every OFF path is byte-identical: determinism pin `8d48e1c5a6ad14c9`, 6 M0 goldens, and 6 M0 fixtures are unchanged with all flags off. That invariant is the graduation floor.
- Balance numbers (ladder steps, `BUILD_STEER_BIAS`, goal targets, signature costs) are **provisional, fuzz-tuned starting values** isolated in `src/sim/economy.ts` for your pass.
- Feel-gates (does the fuller board feel like real decisions? does mandatory supplier-pick feel good?) belong to the human, separately from your code/balance sign-off.
