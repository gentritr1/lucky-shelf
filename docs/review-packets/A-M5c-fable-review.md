# A-M5c Fable-stand-in Review — Tag-set Synergy (Phase 2a)

**Reviewer:** Opus orchestrator (Fable unavailable; see project memory `reviewer-workflow-opus-split`).
Reviews Codex's Phase 2a ([A-M5c-tag-synergy-review.md](A-M5c-tag-synergy-review.md)).
**This is a stand-in verdict — real Fable sign-off is still REQUIRED before the flag graduates.**
**Verdict: APPROVE to land behind `TAG_SYNERGY_ENABLED`** (default off). Landed in commit `5e0797a`.

## What I re-ran (not trusted from the packet)
- **OFF path byte-identical — VERIFIED (executed):** determinism pin unchanged `8d48e1c5a6ad14c9`;
  6 M0 goldens + fixtures validated; `tsc --noEmit` clean; full suite green (86 tests at 2a-time, 93
  with 2b). The OFF scoring branch is textually identical to the prior `order` mult (`if(order &&
  orderMet && item.tags.includes(order.tag))`), and the synergy counts aren't computed when off.
- **Best-tag, NOT product — CONFIRMED (executed, my own scenario):** a board giving one item
  `drink:4, fancy:5` produced **exactly one** `synergy` fire at **mult 1.6** — a clean single ladder
  step (count 5), never the 2.24 product of both tags. Floor holds (2 of a tag → no fire); step holds
  (4 of a tag → ×1.4).
- **Supersession — VERIFIED (executed):** synergy ON + a met `dailyOrder` → **0 `order` fires**, only
  `synergy`; synergy OFF → the `order` lever fires exactly as before.
- **Ordering — VERIFIED (read + scenario):** synergy applies after ambient row auras, before the
  spotlight, inside the item window; emitted as an ordinary `ruleFire{ruleId:'synergy', delta:{mult}}`
  (no new TraceEvent kind), so the cascade animates it for free.
- **Tests cover the path — VERIFIED (executed):** I disabled the ladder assignment
  (`tagSynergyMultForCount` → always 1) → **6 of Codex's tests + 5 of my own checks failed** →
  restored → green. Not tautological.

## Findings / open questions for real Fable (do NOT block landing behind the flag; DO gate graduation)
1. **Ladder magnitudes are provisional** — `3→×1.2, 4→×1.4, 5→×1.6, 6+→×1.8` over
   `TAG_SYNERGY_ELIGIBLE_TAGS` (= `DEMAND_TAG_POOL`). Approve or tune.
2. **Confirm the design decision:** best single qualifying tag (max), NOT multiplicative stacking.
3. **Confirm supersession:** synergy replaces Today's Order while the flag is on (they don't stack).
4. **Confirm blocked-slot counting:** a blocked occupied slot's item counts toward tag commitment even
   though the blocked slot scores 0 and emits no synergy (Codex's call; edge, flag for a ruling).
5. **Ceiling rises** — combo best-day p95 `196→268` in the 100-run A/B. Wants a balance look before
   graduation; game-over rate stayed `1.000` (rent still bites), and archetype runs became distinct.

## Verdict block
```
Verdict: APPROVE to land behind TAG_SYNERGY_ENABLED (default off). Stand-in only.
OFF byte-identical: VERIFIED (executed) — pin 8d48e1c5a6ad14c9, goldens/fixtures, tsc, 93 tests.
Core mechanic (best-tag ladder): CONFIRMED (executed) — drink:4/fancy:5 item → one 1.6 fire, not 2.24.
Supersession of Today's Order: VERIFIED (executed) — synergy ON → 0 order fires; OFF → order restored.
Tests cover the path: VERIFIED (executed) — disabling the ladder fails 6 Codex tests + 5 own checks.
Out-of-scope: none — scoring-order change only, no contract/schema change.
Graduation gates (before flag-on ships): (a) real Fable sign-off on the scoring-order CCR (supersedes
  order when on) + the ladder magnitudes; (b) device feel-gate; (c) balance look at the p95 ceiling.
```

**STOP — flag stays OFF-reversible until the graduation gates clear.**
