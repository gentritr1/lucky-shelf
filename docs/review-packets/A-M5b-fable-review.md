# A-M5b Fable-stand-in Review — Signature Items (Phase 2c)

**Reviewer:** Opus orchestrator (Fable unavailable; see project memory `reviewer-workflow-opus-split`).
Reviews Codex's Phase 2c ([A-M5b-signature-items-review.md](A-M5b-signature-items-review.md)).
**Verdict: APPROVE to land behind the flag** (default off), with two graduation-gating findings.

## What I re-ran (not trusted from the packet)
- **OFF path byte-identical — VERIFIED (executed):** determinism pin unchanged `8d48e1c5a6ad14c9`;
  6 M0 goldens validated with unchanged event counts; `tsc --noEmit` clean; 79 tests pass.
- **Tests exercise the real path — VERIFIED (executed):** I neutered `applySignatureRules`
  (early `return`) → 5/8 `signatureItems.test` cases failed → restored → pass. Not tautological.
- **Core claim, curve-bending — CONFIRMED (executed):** `SIGNATURE_ITEMS_ENABLED=1` fuzz, 100 runs,
  greedy: with-signature best-day median **146** vs without **127**; p90 **358** vs **160**; stddev
  **81** vs **28**. Signature runs measurably bend the curve upward — the intended effect.
- **Design read:** signatures resolve *after* ordinary item windows on a settled snapshot
  ([scoring.ts](../../src/sim/scoring.ts) `applySignatureRules`, called last), so copy/highest
  effects can't form circular references. Additive rule kinds; flagged; no `ContractSchemaVersion`
  bump. Clean.

## Findings (do not block landing behind the flag; DO gate graduation)
1. **Pickup rate overstated in the packet.** Packet: greedy 18% / combo 20%. My 100-run
   reproduction: **greedy 7% / combo 11%.** Bots rarely buy signatures (pricey/rare, and bots don't
   chase them) — expected — but the packet's figure overstates it.
2. **The 2× dominance guardrail is unreliable, and my run breached it.** Packet: "no signature item
   exceeds 2× median." My run: **lucky-cat at 2.45×** median (greedy). BUT at ~7% pickup that is
   ~1–2 samples per item across 4 items — so **neither number is trustworthy**. The guardrail needs
   forced-signature seeding (or far more runs) to mean anything.

## Verdict block
```
Verdict: APPROVE to land behind SIGNATURE_ITEMS_ENABLED (default off).
OFF byte-identical: VERIFIED (executed) — determinism pin unchanged, goldens unchanged, 79 tests, tsc clean.
Core mechanic (curve-bending): CONFIRMED (executed) — greedy with-signature median/p90/stddev clearly higher.
Tests cover the path: VERIFIED (executed) — mutation neutering fails 5/8 signature tests.
Out-of-scope: none — additive rule kinds, flagged, no version bump.
Graduation gates (before flag-on ships): (a) re-measure dominance with forced-signature seeding —
  lucky-cat (copies best total, compounds with spotlight/order) is a 2.45× yellow flag; (b) real Fable
  sign-off on the new scoring rule kinds (CCR in the Codex packet); (c) device feel-gate.
```

**STOP — flag stays OFF-reversible until the three graduation gates clear.**
