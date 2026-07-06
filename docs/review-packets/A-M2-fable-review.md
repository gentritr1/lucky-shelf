# Fable Review — A-M2 (Persistence · Store · R-20/R-23)

**Verdict: ACCEPTED** (2026-07-06), with one review patch (F-A1) that also resolved the
packet's open blocker — the manual web loop has now been completed by Fable in-session,
so A-M2 closes with **zero open items**.

## Verified independently during review

- Gates re-run: tsc strict clean; fixture validation (6 goldens + sticky arrange
  fixture); **39/39 tests**.
- Fuzz sanity: packet's 100-run greedy (died-at-rent med 8, gameOver 1.0, combo rate
  .68) is within noise of the accepted table-v1 numbers. Economy unmoved. ✓
- R-20: fixtures now carry `trace-${seed}-d${day}` ids; goldens regenerated **from the
  engine** with day totals unchanged; determinism pin consciously moved to
  `768bffb34531c49d`. All per ruling.
- **Manual loop completed by Fable on web at 375×812** (packet §3, previously blocked):
  Title → New Run → real store state (Day 3 / Arrange / 12c / rent 25 due 1d) →
  Open Shop → Day 4 / **Restock** phase / 13c (earned 26, paid rent 25) / rent stepped
  25→36 / paid moves 3c → back to Title → **hard page reload** (fresh JS context) →
  Continue → identical state restored from the persistence adapter. Sawtooth, phase
  machine, and save/restore all verified live.

## Findings

- **F-A1 (defect, patched by Fable in review):** `store.ts` and `store.test.ts` lived
  in `src/app/` — the expo-router **routes directory**. The router bundles every file
  there, so the web bundle imported `vitest` at runtime → Metro bundling failed → the
  dev server returned 500 on every route. **This, not port binding, is why the packet's
  manual loop failed** (the Fable session's own server also held 8090 earlier —
  both contributed; the code defect was the fatal one). Fix: moved both files to
  `src/state/` (same import depth, two screen imports updated). Gates green after;
  manual loop passed. **Standing note for Lane A: nothing non-route ever lives in
  `src/app/` — it is a routes directory, not a module home.**

## Rulings on §5 questions

- **R-30 (Q1):** Separate `fixtures/m2-arrange-sticky.json` approved — right call; the
  frozen six-fixture collection stays untouched, no CCR needed.
- **R-31 (Q2):** The M2 arrange-phase starter behind New Run is approved **as
  temporary scaffolding**. At M3 integration (when Lane B's draft/restock screens
  wire in), New Run switches to pure day-1 `createRun(seed)` — delivery phase, real
  offers, no synthetic shelf.
- **R-32 (Q3):** Snapshot-only Continue **satisfies the M2 bar**. The replay action
  log joins the save at **M5** (daily shelf / share cards — replay is the share
  artifact, see `docs/product-moat-suggestions.md` S-1/S-3). Not M2 scope.

## Rulings for Lane B's in-flight M2 (relayed questions)

- **R-27:** The R-6 beneficiary derivation via an open-window state machine is
  **exactly right** — bless it. On fixture 4's silent aura jump (running 8 →
  itemTotal 12): the persistent row glow (R-9) plus **a small "×1.5" mult label on
  the glow** is the required attribution — Pillar 2 is law and the silent jump is its
  weakest link. Add the label; it's cheap.
- **R-28:** The reduced-motion cascade proposal (same sequence/cadence/haptics,
  per-step instant transforms, static arrow held per step) is **approved as spec'd**.
- **R-29:** Draft/Restock screens are **mock-fed for M2** — self-contained review
  vehicle, same discipline as the sticky-fixture mock. Real-engine offers wiring is
  M3 integration scope (pairs with R-31). RN-drawn arrows on web + Skia sparks
  device-only: approved (KI-1 pattern). Adopting `m2-arrange-sticky.json` and
  retiring `mockShelf.ts`: approved (R-23 fulfilled).

## State of the board after this review

- A-M0 ✅ · A-M1 ✅ · A-M2 ✅ — Lane A idle until M3 integration.
- B-M0 ✅ · B-M1 ✅ (feel gate awaiting device recording) · B-M2 in flight (cascade).
- Next Fable gate: B-M2 packet review, then **M3 = lanes merge + fun gate**.
