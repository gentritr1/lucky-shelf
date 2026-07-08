# Fable rulings — loop-redesign v2 sign-off pass (2026-07-08)

**Reviewer:** Fable (Claude Fable 5) — the real sign-off authority the
[FABLE-SIGNOFF-QUEUE](FABLE-SIGNOFF-QUEUE.md) was waiting on. This supersedes the Opus stand-in
verdicts (`A-M5*-fable-review.md`) as the authoritative ruling on CCRs, scoring order, and the item
table. It does **not** replace the human device feel-gate — nothing here flips a flag ON.

## Evidence baseline (executed this session, not inherited)

- **Graduation floor — VERIFIED (executed):** `tsc --noEmit` clean; `scripts/validate-fixtures.ts`
  validates all 6 M0 fixtures; `vitest run` **117/117 green**, including the determinism pin
  `8d48e1c5a6ad14c9` (`src/sim/determinism.test.ts:28`). All five depth flags confirmed default
  `false` in `src/sim/economy.ts`; SPOTLIGHT/DEMAND confirmed the documented default-ON exception.
- **All-flags fuzz — VERIFIED (executed):** 120 runs × 3 strategies, independent seed
  `fable-signoff-0708`, LOOP_V2 + SIGNATURE + TAG_SYNERGY + BUILD_STEERING + GOAL_LADDER all ON.
  Numbers cited below come from this run.
- **CCR surfaces — VERIFIED (read against live code):** scoring order in `src/sim/scoring.ts`
  (order/synergy after ambient auras, spotlight last; synergy supersedes order via `else if`;
  signature rules post-window on a `baselineTotals` snapshot — no circular copies); contract fields
  `supplierTag? / dailyTarget? / dailyTargetResult? / freeRerollTokens? / loopV2? / spotlight? /
  dailyOrder?` all optional in `src/contracts/index.ts`, **no ContractSchemaVersion bump**, old-fixture
  parse tests present.

---

## Rulings by phase

### 1. Depth levers — spotlight + Today's Order (A-M4b) — **APPROVE**
- **Scoring-order CCR approved:** order mult after ambient auras, spotlight mult last in the item
  window, `floor` after each mult. Verified in code, pinned by `depthLevers.test.ts`.
- **Additive `spotlight?`/`dailyOrder?` fields approved** as flagged prototype surface, no version bump.
- **Magnitudes approved as shipped:** `SPOTLIGHT_MULT 3`, `DEMAND_MULT 1.5`, `DEMAND_COUNT 2`.
- **Default-ON exception ratified** for the feel build (these two ARE the current game feel the
  device gate liked).
- **Rename question:** yes — `dailyOrder` is a misnomer (it holds per rent cycle). Do **not** touch the
  schema for a cosmetic rename now; rename to `cycleOrder` whenever a real `ContractSchemaVersion`
  bump happens. Presentation copy may say "Standing Order" any time Lane B wants.

### 2. Loop v2 Phase 1 — daily shop (A-M5a) — **APPROVE**
- **Phase-flow + economy CCR approved:** flagged, additive, no schema change; run-scoped `loopV2?`
  snapshot (`ab83c8d`) is the right mechanism — a run can't be split half-v1/half-v2. FYI accepted.
- **Cadence confirmed working:** day-3 median occupancy 6 vs 3 under v1; items bought/run 11 vs 3.
- **Starting coins 8, 4 offers, `dailyShopCost` curve approved as the v2 baseline** — but see the
  economy-tightening pass below; these numbers move together in one coherent retune, not piecemeal.
- **Free day-1 starter as a 1-of-3 choice: approved** (opening agency, consistent with delivery).
- `/restock`-as-Daily-Shop presentation: approved; Lane B already shipped it (`4417089`).

### 3. Phase 2a — tag-set synergy (A-M5c) — **APPROVE**, all five open questions ruled
1. **Ladder `3→1.2, 4→1.4, 5→1.6, 6+→1.8` approved as starting values** (revisit inside the economy
   pass, not before).
2. **Best single tag (max), NOT product: approved.** A product would compound with
   spotlight × order-successor × signatures into runaway stacks. Verified in code (`bestTagSynergy`).
3. **Supersession of Today's Order: approved.** Verified — `else if (!synergyEnabled && order…)`
   makes stacking impossible by construction.
4. **Blocked-slot counting: approved (Codex's call stands).** A blocked slot's item still counts
   toward tag commitment while scoring 0 itself — this is *consistent with Today's Order counting*
   (`scoring.ts` order-met check counts occupied slots the same way). The item is physically on the
   shelf; commitment is about what you stock, not what scores.
5. **p95 ceiling rise (196→268):** real, and folded into the loose-economy finding below.

### 4. Phase 2b — build steering (A-M5e) — **APPROVE**
- **CCR-4 approved:** `GameState.supplierTag?` + `chooseSupplier{tag}`, no version bump.
- **Mandatory-pick reading approved** — the stronger "commit turn 1" reading is the identity moment
  of a run; a skippable pick would be ignored by exactly the players who need steering.
- **The Lane B picker dependency is already CLOSED:** `src/app/draft.tsx` renders the supplier grid
  through `uiAffordances.chooseSupplierActions` (supplier archetype cards, `da63285`,
  device-verified). No opening-delivery softlock path remains.
- **`BUILD_STEER_BIAS 2.5` approved:** nudge-not-lock confirmed (stand-in: 623/900 offers still
  off-tag; my fuzz: final supplier-tag count median 5, max 10 — leaning, not monoculture).
- Food-skew in bot picks (~40%): noted for the item-table pass; not a graduation blocker.

### 5. Phase 2c — signature items (A-M5b) — **APPROVE**
- **All five new scoring rule kinds approved:** `tagFilteredShelfMultiplier`, `flatPerTagCount`,
  `copyHighestScoringOther`, `shelfMultiplierIfAnyTagCount`, `highestBaseValueMultiplier`.
  Implementation verified: post-window resolution on a settled snapshot (no circular copies),
  deterministic tie-breaks via `compareSlots`, flat/mult application floors and clamps at 0.
- **Dominance gate stays CLOSED.** My all-flags fuzz shows consignment-sign at 2.076× — that is
  natural-pickup noise (n≈10 runs with pickup out of 120), exactly the small-n trap the
  [dominance-gate doc](A-M5b-signature-dominance-gate.md) warns about. The equal-n=3000 forced-seeding
  probe (max ratio **1.13**, favorable-board ceiling **1.74× < 2×**) remains the authoritative
  measurement. Do not re-litigate the gate from natural-pickup fuzz numbers.
- Pricing premiums (weight ×0.3, day +3, tier +4, floor 12) approved as shipped.
- Standing eyeball item for the device gate: **lucky-cat adjacent to a spotlighted hero** (the one
  compounding interaction the probes ran without levers).

### 6. Phase 3 — goal ladder (A-M5d) — **APPROVE the CCR; REQUEST CHANGES on the target table before graduation**
- **Contract approved:** `dailyTarget?`, `dailyTargetResult?` (`DailyTargetResultSchema`),
  `freeRerollTokens?` — additive, no bump. **Keep `freeRerollTokens` an int** (forward-compat; Lane B
  may render it as a badge while it's capped at 1).
- **Reward semantics approved:** 0/1 token, a miss clears stale state, free token spends before coins.
- **Table finding (new, blocks graduation of this flag in its current numbers):** the tuned table
  `[16..74]` was verified in-band (65–85% late hit) against the **LOOP_V2-only** yield. Under the
  **full flag stack** my 120-run fuzz measures days-9–12 hit rates of **0.892 (greedy) / 0.926
  (combo)** — out of band on the easy side. Multipliers compound; targets don't. Not a code bug —
  a tuning coupling. The table must be **re-tuned against whichever flag set actually graduates**,
  which folds it into the economy pass below. (The anti-scar cap-below-plateau property still holds;
  the plateau simply rose.)

---

## Balance rulings (the item-table / economy pass)

### 7. Sell-back — **CONFIRMED, broader than reported; ruling: v2-gated floor of 1**
Quantified against the live table (executed): **19 of 41 items sell for 0** (not just tier-1 — it
includes the bv=0 utility pieces and 4 of the 5 signatures) and 15 more sell for exactly 1. Selling
is economically meaningless for ~83% of the table, while the softlock escape hatch (`06771cf`)
*tells players to sell to make room*.
**Ruling:** `sellPrice = max(1, floor(baseValue/3) + onSell adjustments)` **gated on the run's
`loopV2` snapshot** — the v1/OFF path must stay byte-identical (`sellPrice` is live pre-v2 code; an
unconditional floor would silently change the shipping economy and the determinism pin). +1-coin
sells are noise against the loose economy (~3,300 coins/run) but remove the "the game told me to
sell and paid me nothing" sting. Implement inside the economy pass.

### 8. Loose economy — **CONFIRMED (own fuzz); ruling: one coherent tightening pass, lands with the device gate**
Reproduced on an independent seed: greedy median **30 days survived (max 36)**, deepest rent cycle
median 9–10; day-9 median earnings **~121/day vs rent ~17/day (≈7×)**, day-12 **~123 vs ~27 (≈4.5×)**.
Matches the 2026-07-08 finding; the pile-up is real, not seed luck.
**Ruling — direction and package, not piecemeal edits:**
1. All changes **v2-gated** (the loose stack IS the v2 stack); v1/OFF stays byte-identical.
2. Levers, in preference order: steepen late rent under v2 (`RENT_GROWTH_LATE` 1.6 → ~1.75 and/or
   start it at cycle 3), and/or add a recurring coin sink. Target shape: **median ceiling run
   ~20–24 days; day-9 earnings/rent ratio ~2–3×**, not 7×.
3. The same pass re-tunes the **goal-ladder table** (finding #6) and the **sell floor** (#7), then
   re-runs `pnpm balance:assert` and **re-sets the §6 bands around the tuned reality** (today's bands
   deliberately bracket the loose economy as drift guards — a retune legitimately moves them).
4. Also fold in the **beginner shape problem**: first-rent survival ~16–21% vs the 40–70%
   aspiration. The game is currently too harsh on days 1–3 and too easy after day 6 — the curve needs
   flattening from both ends, which is why these must move together.
5. **Final acceptance is the human device feel-gate.** The last gate said the loop feels "way
   better"; tightening is taste-sensitive and ships only behind that gate.

### 9. Deferred bands — **stay deferred, by design**
Surplus ratio, consecutive-days, and near-death tension bands remain `null` until after the
tightening pass; setting them now would enshrine the 5–7× economy the pass exists to fix.

---

## Consolidated status after this pass

| Item | Fable ruling | Still gating graduation |
|---|---|---|
| Levers (spotlight/order) | **APPROVED** (incl. default-ON exception) | device feel-gate ✅ already positive — graduable |
| Phase 1 LOOP_V2 | **APPROVED** | economy pass numbers, device gate |
| Phase 2a TAG_SYNERGY | **APPROVED** (all 5 questions ruled) | economy pass (ladder revisit), device gate |
| Phase 2b BUILD_STEERING | **APPROVED** (picker dependency closed) | device gate |
| Phase 2c SIGNATURE_ITEMS | **APPROVED** (dominance gate stays closed) | device gate (lucky-cat × spotlight eyeball) |
| Phase 3 GOAL_LADDER | **CCR approved; table REQUEST CHANGES** | goal-table retune in economy pass, device gate |
| Sell-back | **Ruled:** v2-gated floor 1 | implementation in economy pass |
| Loose economy | **Ruled:** tightening package above | implementation + device feel-gate |

**No flag flips ON from this document.** The remaining path to graduation is:
economy-tightening pass (implementation brief above) → `pnpm m1` green with flags SET →
device feel-gate → flags ON.

---

## Implementation record — economy pass executed (same day, later session)

**Shipped (all v2-gated unless noted; OFF path verified byte-identical — pin `8d48e1c5a6ad14c9`,
goldens, fixtures all green in the 118/118 suite):**
- `LOOP_V2_RENT_GROWTH_LATE = 1.75` from cycle 4 (v1 keeps 1.6): ceiling median 30d → **27d**,
  deepest rent cycle 9–10 → **8**, total coins ~3336 → ~2900–3000.
- `LOOP_V2_SELL_FLOOR = 1` (ruling §7), mirrored in the sell-view model so shown price = paid price.
- `GOAL_LADDER_TARGETS = [18, 28, 40, 46, 56, 66, 74, 80, 86, 90]` — re-tuned against the FULL
  stack per finding §6. **VERIFIED (executed): 400-run fuzz, every day 0.67–0.82 for greedy and
  combo, days 9–12 aggregate 0.806/0.814** — inside the 65–85% band across the whole curve.
- Run-length guardrail min re-set 24→20 (documented in `balanceHarness.ts`); `balance:assert`
  (80-run, authoritative) **green**, build swing back inside [1.3, 2.0].

**Bonus fix — save-corrupting bug found by the pass:** buying out the shop then rerolling
reproduced the day's offer set (reroll salt collapsed to `''` = the opening generation's salt),
minting duplicate `instanceId`s → schema-invalid state. Latent in v1 too; exposed when tuning made
buyouts affordable to bots. Fixed engine-wide (salt now folds coins + all live instanceIds);
regression test added; pinned trajectories contain zero rerolls (instrumented and checked), so the
determinism floor is untouched.

**Tried and reverted (recorded so it isn't re-tried):**
- Day-2 shop discount as beginner ease → **build swing collapsed to 1.13–1.26** (ceiling bots fill
  up on cheap stock; builds stop mattering). The guardrail caught it. Reverted.
- Rent steepening from cycle 3 → run length crashed to 21–24d, out of band. Reverted to cycle 4.
- Starting coins 8→10 → broke the day-one two-buys acceptance path. Reverted.

**Honest misses — now design work, not constants (both feel-gated, both mine to brief):**
1. **Day-9 surplus is still ~7×.** Rent through cycle 3 is v1-pinned and every steeper curve
   variant breached the run-length/swing guardrails. The structural fix is a **coin sink**
   (recommended: purchasable shelf expansion — converts surplus into build space and doubles as
   progression; see the retention roadmap doc). Surplus bands stay deferred until a sink exists.
2. **Beginner floor unchanged** (first-rent survival 10–25% across configs — the v2 config is the
   *lowest* at 10%). Needs a designed opening mechanic (guaranteed-cheap day-1 offers or first-rent
   forgiveness), not a cost constant — the constant version measurably damaged build identity.
