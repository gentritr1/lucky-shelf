# Gate: signature-item dominance re-measure — CLOSED (no single item >2× median)

**Date:** 2026-07-07. **Owner:** orchestrator (graduation-gate measurement, not a code change).
**Context:** Phase 2c signature items (`SIGNATURE_ITEMS_ENABLED`, default OFF) were APPROVED behind the
flag with one open yellow flag: *"lucky-cat hit 2.45× median in one run (tiny sample) — re-measure with
forced-signature seeding before graduating."* This closes that loop.

## Verdict
**PASS — the yellow flag does not reproduce at scale.** No single signature item dominates >2× the
signature-run median. The original 2.45× was a **tiny-sample artifact** (n≈1). At adequate n, lucky-cat
is one of the *weakest* signature items, not the strongest.

## What I ran (executed + observed, not inferred)
Baseline first, this session: `tsc --noEmit` clean; `vitest run` → **79/79 green** (matches handoff).

Three independent measurements, signature flag ON:

1. **Natural-pickup fuzz** — `SIGNATURE_ITEMS_ENABLED=1 LOOP_V2_ENABLED=1 fuzz --runs 1000 --strategy all`.
   - Run-level: `withSignature` bestDayTotal median **151 vs 118 without** (greedy), **147 vs 116** (combo)
     → signatures lift the ceiling ~**1.28×**, as intended.
   - Per-item dominance ratio was **noisy** (combo window-display showed 2.01× — but its row was
     `median 296 = p90 = max, mean 226.5`, the fingerprint of **n=2**). Natural pickup ≈18% split 5 ways
     ⇒ per-item samples too small/uneven to trust. This is *why* the fuzz metric alone can't close the gate.

2. **Forced-seeding, random boards** (the fix for small-n) — throwaway script: drop each signature item
   into the SAME 3000 realistic random boards, one reserved slot, **equal n=3000 per item**, levers off.
   - Per-item median dayTotal: brass-scale 41 · consignment-sign 44 · ledger-book 46 · lucky-cat 46 ·
     **window-display 52 (top)**. All-signature median 46.
   - **maxToAllSigRatio = 1.13** (window-display). Top item lift over no-signature baseline (37) = **1.41×**.
   - Tails: consignment-sign has the fattest (p99 142, max 204 vs baseline max 106) — expected for a
     whole-shelf ×N; but its **median (44) is unremarkable**, i.e. it rewards committed boards without
     dominating typical play.

3. **Favorable-board ceiling probe** (the honest disproof — each item on the board built AROUND it;
   marginal lift = signature vs strongest non-signature filler in the same slot):
   - consignment-sign **1.74×** (highest) · ledger-book 1.57× · brass-scale 1.24× · window-display 1.15× ·
     **lucky-cat 0.98× (negative!)**. Even best-case, the top is **1.74× < 2×**.
   - lucky-cat is ≤1× because it copies the best *other* item while occupying a slot a strong filler
     (golden-scale) would score in directly.

## Caveat (recorded, not hand-waved)
The forced-seeding probes ran with **spotlight/order levers OFF** to isolate signature effects.
lucky-cat copies the best board item's **post-window total**, which in a live run includes the
**spotlight ×3** — so lucky-cat's real-run ceiling is higher than the 0.98× shown here (still bounded to
a single copy; it reads the pre-signature `baselineTotals` snapshot, so it cannot copy another
signature's output — no circular runaway). Flag for the device feel-gate + Fable: "lucky-cat next to a
spotlighted hero" is the one interaction worth an eyeball, though it is the *spotlight* doing the work.

## Method note (reproducible)
Forced seeding = `makeState([...board, { slot, itemId: <signature> }])` from `src/sim/testkit`, scored
via `resolveOpenShop`, over N seeded random boards (`rngFor('sigdom', i)`), equal n per item. Favorable
boards = top-baseValue items of the item's synergy tag. Scripts were throwaway (removed to keep the tree
clean); re-derive from this note, or ask for a permanent Lane A metric if the relay wants it in CI.

## Net
Signature-dominance gate **CLOSED**. Remaining Phase 2c graduation gates unchanged: **Fable sign-off** on
the new scoring rule kinds + **device feel-gate**. Nothing here graduates a flag.
