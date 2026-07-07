# A-M5e Fable-stand-in Review — Build Steering (Phase 2b)

**Reviewer:** Opus orchestrator (Fable unavailable; see project memory `reviewer-workflow-opus-split`).
Reviews Codex's Phase 2b ([A-M5e-build-steering-review.md](A-M5e-build-steering-review.md)).
**This is a stand-in verdict — real Fable sign-off is still REQUIRED before the flag graduates.**
**Verdict: APPROVE to land behind `BUILD_STEERING_ENABLED`** (default off). Landed in commit `5e0797a`.

## What I re-ran (not trusted from the packet)
- **OFF path byte-identical — VERIFIED (executed):** determinism pin unchanged `8d48e1c5a6ad14c9`;
  6 M0 fixtures validated; `tsc` clean; 93 tests green. OFF is byte-identical *by construction* — every
  2b path is gated behind `buildSteeringEnabled()`/`canChooseSupplier()` (both false when off),
  `createRun` doesn't even add `supplierTag` when off, and all `generateOffers` calls pass
  `supplierTagForOffers()` which returns null when off.
- **Mandatory supplier pick — CONFIRMED (executed, my own scenario):** at opening delivery with the
  flag on, the only legal actions are the 10 `chooseSupplier` options (one per eligible tag) + the
  universal `abandonRun`; `draftItem` throws until a supplier is chosen; choosing twice throws;
  ineligible tags (`paper`) throw.
- **Offer bias exact + pool not locked — CONFIRMED (executed):** `offerWeight(food, day, 'food')` is
  exactly `offerWeight(food, day, null) × 2.5`; non-leaned items unchanged. Over 300 seeds, food offers
  rose `148 → 277` while `623/900` offers were still non-food — the pool is nudged, not locked.
- **Additive contract — VERIFIED (executed):** `GameState.supplierTag?` + `chooseSupplier{tag}` action;
  **`ContractSchemaVersion` NOT bumped**; `contracts.test.ts` asserts old fixtures lack `supplierTag`
  and still parse; all 6 M0 fixtures validate.
- **Determinism ON — VERIFIED (executed):** same seed + same choice → identical regenerated offers.
- **Tests cover the path — VERIFIED (executed):** neutralizing the bias (`weight *= 1`) failed Codex's
  weight test AND my own checks (food offers collapsed `277 → 148`) → restored → green. Not tautological.

## Findings / open questions for real Fable (do NOT block landing behind the flag; DO gate graduation)
1. **Spec deviation — mandatory pick.** The brief said `chooseSupplier` is "legal once at run start";
   Codex made it **mandatory** (opening delivery blocks drafting until a supplier is chosen — the
   stronger "commit turn 1" reading). Please confirm this is the intended UX. **Lane B dependency:** if
   the flag is turned on before Lane B ships a supplier picker, opening delivery is stuck.
2. **Approve the additive contract:** `GameState.supplierTag?: string | null` + `chooseSupplier{tag}`
   (CCR-4, no schema-version bump).
3. **Approve / tune `BUILD_STEER_BIAS = 2.5`** and `BUILD_STEERING_ELIGIBLE_TAGS = DEMAND_TAG_POOL`.
4. **Bot picks skew to `food`** (~40% of leans) from early-table density — not a correctness bug, but
   Fable may want item-weight tuning so archetypes feel evenly attractive.

## Verdict block
```
Verdict: APPROVE to land behind BUILD_STEERING_ENABLED (default off). Stand-in only.
OFF byte-identical: VERIFIED (executed) — pin 8d48e1c5a6ad14c9, fixtures, tsc, 93 tests; gated by flag.
Mandatory pick + bias + pool-not-locked: CONFIRMED (executed) — own scenario; food 148→277/300 seeds.
Additive contract: VERIFIED (executed) — supplierTag + chooseSupplier, no ContractSchemaVersion bump.
Tests cover the path: VERIFIED (executed) — neutralizing the bias fails the weight test + own checks.
Out-of-scope: none — sim/contracts/fuzz + new test; no Lane B/UI/juice/item-table.
Distinct archetypes: CONFIRMED — steering shifts dominant-tag median 5→6; game-over rate unchanged.
Graduation gates (before flag-on ships): (a) real Fable sign-off on CCR-4 + the mandatory-pick reading
  + BUILD_STEER_BIAS; (b) Lane B supplier picker; (c) device feel-gate.
```

**STOP — flag stays OFF-reversible until the graduation gates clear.**
