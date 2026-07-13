# Fable ruling — opening supplier decision (2026-07-13)

**Question (from the gameplay/intuitiveness audit §6):** the graduated run begins with a mandatory
choice among ten supplier archetypes before the player has handled normal stock. Should that choice
be reduced, delayed, or defaulted?

## Ruling: KEEP UNCHANGED through Gate 2 and the external alpha. Evidence-gated, not closed.

Rationale:

1. **There is no observed failure yet.** The audit itself conditions the concern on "if cold tests
   still hesitate here." Changing a core gameplay beat on a predicted problem violates the adopted
   evidence-led-tuning principle (RELEASE-PLAN Gate 4) and the feature freeze until Gate 3 data.
2. **The mitigation just shipped.** The contextual first-run notes now teach supplier direction as
   the first card, beside the real control, before the pick is made. That is exactly the treatment
   the research synthesis prescribes (teach the verb at the moment of choice). Judge the fixed
   opening, not the old one.
3. **The mandatory pick is load-bearing.** Build steering was ruled a mandatory pick (Phase 2b
   CCR) because it is the run's identity seed — the HUD build panel, tag synergy plan, and Daily
   Shop identity all key off it. A silent default would produce runs whose identity the player
   never chose, which is worse for comprehension than a big first menu.

## What the alpha must measure (add to the playtest sheet)

- Time from first seeing the supplier screen to the pick; count of players who stall >30s or ask
  what to do.
- Whether players can name their build intention on day 3 (already a directional bar: 6/10).

## Pre-committed fallback (only if alpha shows a stall)

If cold testers measurably hesitate: first-ever run presents a **curated trio** of archetypes
(spread across distinct tag families) plus a "surprise me" neutral option; every later run gets the
full ten. That is presentation-layer curation of the same mandatory pick — no contract, scoring, or
steering change — and needs only a Fable check on the trio composition, not a new CCR.

**Do not implement the fallback now.** Presentation must not silently change the decision space
(audit §6 stop line) — this file is the authority gate for that change if the evidence arrives.
