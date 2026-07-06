# Fable Review — B-M2 (Cascade · Draft · Restock)

**Verdict: ACCEPTED** (2026-07-06). The M2 bar — *"Fable can follow every coin in a
recorded cascade without pausing"* — was met in Fable's own web playthrough: golden 4's
wine 8→12 and honey 2→3 both read instantly under the persistent ×1.5 band, and golden
2's climb 4→7→10→13 → banner → 22 needed no pauses. The device recording (§3 shot
list) still stands for haptic ladder + arrow motion, folding into the M3 device pass.

## Verified independently during review

- Gates: tsc strict clean; **46/46** (the 7 new `cascadeState.test.ts` cases locking
  R-6/R-9 derivation in pure TS are exactly the machine-checkable Pillar-2 artifact I
  wanted — noted with approval).
- Boundary sweep: no sim imports, no color literals outside tokens, haptics via
  gateway only.
- Played goldens 4 and 2 live at 375×812: event cadence, open-window highlight,
  R-27 ×1.5 label riding the persistent band, totals correct (15, 22), dayTotal slam
  via the new CoinCounter variant, speed control always visible (R-17).
- R-25 web boxShadow branch confirmed inside `tokens.ts` (native byte-identical) —
  as pre-signed. vitest `@/*` alias: approved per R-21 (flag, not request — correct).

## Rulings on §5 questions

- **R-33 (Q1 — aura contrast):** Brighten it, and shift the band's tint from teal
  toward **sunlight gold** (~0.3 opacity). Teal-over-wood is what's reading olive;
  a multiplier is coin-magic, and gold says so on this palette. Keep the ×mult label
  as-is. Apply at M3 alongside integration tuning.
- **R-34 (Q2 — banner dwell):** **Trophy stays** — the named combo is the collection
  moment (R-2, and moat S-13: combos as language). But my playthrough caught it
  ghost-pale mid-screen while co-visible with the slam. Fix the presence: banner holds
  **full opacity** from its event until `dayTotal`, then **docks to a small corner
  chip** for the end-state instead of fading in place. The slam owns the final beat;
  the trophy survives it, smaller.
- **R-35 (Q3 — aura count-up):** Confirmed sufficient. The lit, labeled band plus the
  8→12 tick **is** "every coin explained"; an explicit multiply beat per affected item
  would add a beat per item per aura and bloat the cascade. No change.

## Deviations — all accepted

- Draft/Restock reachable from the title "M2 Preview" cluster: correct per R-29; the
  HUD phase routing is Lane A M3 wiring (pairs with R-31's pure-createRun switch).
- Tray off-grid placement gesture deferred to M3 polish: fine.
- `vanish` unexercised by goldens: first Coupon Stack trace at integration confirms
  the visual — add it to the M3 checklist, not this gate.

## The board

A-M0/M1/M2 ✅ · B-M0/M1/M2 ✅ (device recordings: B-M1 feel + B-M2 haptic ladder,
both fold into M3's device pass). **All pre-integration milestones are closed.**

## M3 — Integration & Fun Gate (next, both lanes together)

- **Lane A:** HUD phase routing into draft/restock; New Run → pure `createRun(seed)`
  (R-31); real offers feed Lane B's screens; cascade overlay wired to
  `lastScoringTrace` after openShop; replay-action capture if trivial (else M5).
- **Lane B:** R-33 aura retune; R-34 banner dock; delivery-tray placement gesture;
  integration fixes from real traces (incl. first real `vanish`).
- **Fable:** the fun gate — full runs on device via human recordings + fuzz
  degenerate-strategy check (no bot strategy beats variance by >2× median — current
  fuzz already satisfies this; re-run on the integrated build). Tuning patches to the
  item table/economy as data.
- Merge discipline: lanes now touch the same screens — small PR-sized steps,
  packet-per-lane still applies at the end.
