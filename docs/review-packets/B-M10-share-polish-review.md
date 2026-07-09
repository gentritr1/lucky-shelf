# B-M10 — Share polish: friendly seed labels + receipt-bodied card — review packet

**Implementer:** Opus 4.8 (Lane B), 2026-07-09. **Reviewer:** Fable.
**Brief:** [docs/lane-b/share-polish-brief.md](../lane-b/share-polish-brief.md).
**Status: implemented, suite + tsc + greps green. STOP — Fable reviews. Visuals deferred to the
batched device gate (shots listed §5).**

## What shipped (by brief work item)

**§1 — Friendly seed codec.** New pure module [src/state/seedLabel.ts](../../src/state/seedLabel.ts):
`seedLabel(seed) → WORD-NNN`. Determinism comes from a hand-rolled **FNV-1a 32-bit** hash
(`Math.imul` + `>>> 0`) — deliberately NOT any engine-provided hash, because these labels are
spoken between players and must be stable forever across builds/platforms/JS engines. Word from
the low bits, three-digit number from the high bits, so the two vary independently. A 64-word
cozy pool (shop / luck-charm / botanical — clover, marigold, teapot, juniper…), **zero gambling
words**. Collisions are documented as acceptable: the label is a *nickname, not a key* — the
comment forbids ever parsing it back to a seed.

**§2 — Surfaced the label.** Daily share card header and the daily summary header now show
`SEED · WORD-NNN` (daily runs only; non-daily unchanged). Nowhere else, per brief.

**§3 — Receipt card variant.** The share screen gains a `Card ⇄ Receipt` toggle (opt-in, defaults
to the existing stat card, **no new pref**). The receipt body is `formatReceipt(receiptFromTrace(…))`
over `GameState.lastScoringTrace` — the **final (closing) day's** trace, the only one persisted on
`GameState`. Labeled honestly: card caption reads **"closing day"** and the view-model doc says so
explicitly. **No trace persistence added** (see follow-up §6). Paper framing (creamBright + brass
border, tighter radius), monospace ink body, brass-colored total foot; same `captureRef` PNG
pipeline (single card mounts at a time, so the ref always captures the shown variant).

## Boundary handling (the load-bearing design call)

The share screen must not value-import `@/items` (the sim/UI boundary rule), but building receipt
deps needs the item table + combos. Resolved by adding a **store view-model**,
`receiptCardView(gameState): { body: string[]; total } | null`
([src/state/store.ts](../../src/state/store.ts)) — the store is already the boundary layer
(it legitimately imports `@/items`). The screen consumes plain strings.

- Import is from `../juice/receipt` (the **pure submodule**: receiptModel + print → contracts +
  items only), **not** the `@/juice` barrel — so no `ShelfScene`/Skia/RN is pulled into the state
  layer. No import cycle (juice/receipt imports nothing from state; grep-confirmed).
- `total` is read from the receipt's terminal `total` line, **not** a top-level `trace.dayTotal`
  (there is none — the total lives in the trace's final `dayTotal` *event*). This was a real bug
  caught by the snapshot test on first run and fixed; the headline can now never disagree with the
  printed foot.

**Flag for your ruling:** this introduces a `state → juice/receipt` edge. It's pure and
cycle-free, and it's what keeps the *screen* boundary clean. If you'd rather the adapter live
elsewhere (e.g. a `@/juice/receipt` helper the screen calls with store-provided deps), say so — I
kept it in the store to honor "screens consume view-models."

**One shared-token touch:** added `fonts.mono` (Platform monospace, no new asset) + a
`typeScale.receipt` role in [src/ui/tokens.ts](../../src/ui/tokens.ts) so the receipt's dot-leader
columns align. The receipt is the only surface using it; the token test iterates roles generically
and stays green. Default paths (Baloo2/Nunito) are byte-identical.

## What I ran / verified

- **Executed — suite:** `vitest run` → **35 files, 251/251 pass** (node 20.19.4; the repo's node
  default here is v14, too old for vite 8). Includes the new codec + view-model tests.
- **Executed — codec tests** ([seedLabel.test.ts](../../src/state/seedLabel.test.ts)):
  determinism (same seed → same label), **frozen pins** (`daily-2026-07-09 → ACORN-770`,
  `daily-2026-01-01 → BRAMBLE-924`, `lucky-shelf → PEWTER-784`, `'' → CEDAR-879` — hard-coded, not
  self-referential), `WORD-NNN` format over 500 seeds, words-in-list, number ∈ [000,999]; list
  hygiene (exactly 64, no dups, all-uppercase, no gambling words).
- **Executed — receipt snapshot** ([receiptCardView.test.ts](../../src/state/receiptCardView.test.ts)):
  fixed golden trace (`m0-wine-dine-combo`) placed on `lastScoringTrace` → fixed paper text
  (snapshot committed), brass total = terminal `dayTotal` event & matches the last printed line,
  and `null` when no closing-day trace exists.
- **Executed — tsc:** `tsc --noEmit` clean.
- **Executed — greps:** boundary grep (`@/items`/`@/sim` value-imports in `src/app`) → **clean**;
  token grep (raw hex/rgb in the touched files) → **clean**.
- **Isolation:** my files are `src/state/seedLabel*.ts`, `src/state/receiptCardView.test.ts`,
  `src/state/store.ts`, `src/app/share.tsx`, `src/app/summary.tsx`, `src/ui/tokens.ts`, packet +
  snapshot. `run.tsx`/`ShelfScene.tsx`/`placementHints*`/`signature-dominance.ts`/`package.json`
  in the tree are **Lane A's** concurrent uncommitted work — untouched. Did not commit (Lane A
  holds the tree).

## Deferred device shots (the visual gate — UNVERIFIED here, by design)

RN gameplay/share screens can't be verified on web (drag-gated, Skia wasm unserved — per project
memory). The **look is unverified**: monospace alignment on-device, brass total legibility, paper
framing, seed-line placement. Requested shots:

1. **Daily stat card** with `SEED · …` line — seed `daily-2026-07-09` (→ `ACORN-770`) — iPhone 16 Pro.
2. **Receipt card** (toggle → Receipt) — same seed, a run with a combo day as closing day so the
   body shows a `• Wine & Dine` banner + brass total — **iPhone 16 Pro and iPhone SE** (SE is the
   alignment/overflow worst case for the fixed-width body).
3. **Daily summary header** with the seed line — same seed.

## Self-attack (§6)

- *"Labels drift across engines"* — FNV-1a is fully specified integer math; `Math.imul` keeps it
  32-bit everywhere. Frozen pins in-suite would fail on any drift. Holds.
- *"Total is faked/duplicated"* — headline reads the receipt's own total line, not a parallel
  computation; test asserts equality with the trace's terminal event and with the last body line.
- *"Persistence snuck in"* — no schema/save touch; `receiptCardView` only *reads*
  `lastScoringTrace`. Boundary + isolation greps confirm.
- *Weakest remaining point:* the receipt's **visual** correctness (does mono actually align on a
  real device font; does brass read on paper) is genuinely unverified → that's the device gate,
  flagged, not hidden.

## Follow-up for Fable (out of scope here, per non-goals)

**Best-day receipt.** The card prints the *closing* day, not the run's *best* day, because per-day
historical traces aren't stored (`GameState` keeps only the last). A best-day receipt needs per-day
trace persistence — a schema/save change I deliberately did not make. If best-day matters, that's a
separate brief (schema-additive + wipe-risk note required).

```
Verdict sought: APPROVE codec + view-model + wiring; look closes on the deferred device gate (§5).
Pre-fix failure reproduced: n/a (new feature) — one self-inflicted bug (trace.dayTotal undefined)
  was caught by the snapshot test pre-review and fixed; total now derives from the receipt line.
Tests cover the path: frozen codec pins + list hygiene; fixed-trace→fixed-text receipt snapshot.
Runtime/device verification: UNVERIFIED (visual) — RN share screen not web-verifiable; 3 shots listed.
Out-of-scope changes: none of mine (Lane A's uncommitted files untouched; not committed).
Risks remaining: none code-side (suite/tsc/greps green); all visual + the state→juice/receipt
  edge for your ruling.
```
