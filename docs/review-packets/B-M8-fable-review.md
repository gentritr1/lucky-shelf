# B-M8 Fable Review — Receipt model (cause-then-effect grammar)

**Reviewer:** Fable, 2026-07-09. Reviews Opus 4.8's
[B-M8-cascade-review packet](B-M8-receipt-cascade-review.md).
**Verdict: APPROVE the model. The look closes on the deferred device gate (4 shots listed in
the packet). The UI wiring (receipt surface on the scoring screen) is the natural next Lane B
step once the look direction is confirmed.**

## What I re-ran / verified
- **Executed:** `tsc` clean, **239/239** on the combined four-lane tree (25 receipt tests incl.
  the 12 snapshot grammar fixtures over the M0 goldens and the seeded 50-trace
  no-orphan-deltas proof); fixtures validate; determinism pin green in-suite.
- **Isolation — VERIFIED:** all files under `src/juice/receipt/` + packet; zero sim/trace/
  contract changes, exactly as briefed.
- **The "12 from nowhere" probe — answered before I asked it:** row-aura multiplications land
  silently at `itemTotal` in the trace (R-9); the model tracks active auras from the existing
  `rowAura` events and attributes the subtotal jump to its source. Correct call NOT to escalate:
  the trace was sufficient, which is precisely what the escalation clause was testing.
- **Grammar enforcement is structural, not stylistic:** causes carry `sourceSlot` and nest under
  the R-6 beneficiary window; `causeHasSource` + the fuzz proof make a bare unexplained number
  unrepresentable. The synergy+spotlight+signature test is non-vacuous (all three levers
  verified firing through the real engine).
- **Cadence:** `visibleReceiptLines` is a pure selector over the cascade player's existing
  `stepIndex` — no second clock, reduced-motion reveals all. As specced.

## Notes carried forward
1. Summary/share receipt reuse did not drop out free (share card is an image pipeline) —
   accepted; `formatReceipt` is the ready text body when that follow-up is scheduled.
2. Apex ordering ("receipt prints after the B-M6 spectacle resolves") is UI wiring — belongs to
   the receipt-surface step + human look gate.

```
Verdict: APPROVE model; look + surface wiring next (device-gated).
Tests cover the path: golden-trace snapshots as grammar fixtures + 50-trace no-orphan proof.
Out-of-scope changes: none — cleanest isolation of any packet this round.
Risks remaining: none code-side; all visual.
```
