# B-M8 — Receipt cascade + cause-then-effect grammar — review packet

**Implementer:** Opus 4.8 (Lane B), 2026-07-09. **Reviewer:** Fable (model + structure).
**Human gate:** the look (deferred — shot list at the bottom).
**Brief:** [docs/lane-b/receipt-cascade-brief.md](../lane-b/receipt-cascade-brief.md).

## TL;DR
The pure receipt core is built, fully headless, and green: `receiptFromTrace(trace, deps)`
renders any `ScoringTrace` as a paper shop receipt whose grammar is *source item → affected item
→ delta → new total*. 25 new tests pass (6 M0 golden snapshot fixtures + per-kind grammar +
synergy/spotlight/signature attribution + a 50-trace no-orphan-deltas proof + print-cadence).
tsc clean for the new files. **Zero sim/trace/contract changes** — the trace already carried
everything; I did not add an event kind. Visual close-out is DEFERRED with a seed-recipe shot list.

## Files (all new, additive only)
- `src/juice/receipt/receiptModel.ts` — the pure core: `ReceiptLine`/`ReceiptLineDetail` types,
  `receiptFromTrace`, `receiptDepsFromGameState`, `formatReceipt`, `causeHasSource`, label helpers.
- `src/juice/receipt/print.ts` — `visibleReceiptLines` / `receiptComplete`: a pure selector over
  the cascade player's existing `stepIndex` (no second clock).
- `src/juice/receipt/index.ts` — barrel.
- `src/juice/receipt/receiptModel.test.ts`, `print.test.ts` — the suites.
- `src/juice/receipt/__snapshots__/receiptModel.test.ts.snap` — 12 snapshots (paper + structured
  lines × 6 goldens); these ARE the grammar regression fixtures.

No edits to `src/contracts`, `src/sim`, `src/items`, `popModel`, `cascadeTier`, or the fixtures.

## Grammar spec as implemented (the line-format table)

Each trace event maps 1:1 to a receipt line (in trace order), tagged with the `eventIndex` that
reveals it. `itemTotal` is the one conditional: it prints a subtotal **only when the item scored
at least one cause** — a plain item (base == total, no rule) already shows its value on the header,
so no redundant closing line.

| Event kind  | Line kind  | Indent | Label                              | Amount            | Names a source? |
|-------------|------------|--------|------------------------------------|-------------------|-----------------|
| `itemBase`  | `item`     | 0      | `{item name}`                      | `{base}`          | n/a (header)    |
| `ruleFire`  | `cause`    | 1      | `↳ {source item} · {rule}`         | `{±N│×N} → {total}` | **yes** (`sourceSlot`) |
| `rowAura`   | `aura`     | 1      | `↳ {source item} · row {r} aura`   | `×{mult}`         | **yes** (`sourceSlot`) |
| `itemTotal` | `subtotal` | 0      | `{item} subtotal[ (row ×{m})]`     | `= {total}`       | n/a (close)     |
| `comboNamed`| `combo`    | 0      | `• {combo name}`                   | `` (no coins)     | n/a (catalog)   |
| `transform` | `transform`| 0      | `→ {from} became {to}`             | ``                | n/a             |
| `vanish`    | `vanish`   | 0      | `× {item} left the shelf`          | ``                | n/a             |
| `dayTotal`  | `total`    | 0      | `DAY TOTAL`                        | `{coins}`         | n/a (brass total) |

**The affected item is structural**: a cause nests under the window it credited — the R-6
*beneficiary* (the slot whose running total moved), which is the arrow's *source* in some fires
(fixture 1) and its *target* in others (fixture 4, honey→wine). `receiptFromTrace` tracks the open
window exactly like `cascadeState` (open on `itemBase`, close on `itemTotal`, beneficiary =
`openSlot ?? targetSlot`). So the printed grammar is: header names the affected item, the indented
`↳` names the source, the amount carries the delta → new total.

**No orphan numbers, incl. row auras.** A row aura is emitted once at its source and applied to
the whole row at each item's `itemTotal`. That means an item's subtotal can jump above its last
cause's running total (fixture 4: honey grant lands wine at 8, the row ×1.5 makes the subtotal 12).
The model attributes that jump: any active row aura on the slot's row is recorded on the subtotal
as `appliedAura` and printed as `(row ×1.5)`, and the aura's own source item was already named on
its `aura` line. Nothing renders as a bare number with no cause.

**Tone:** paper/ink/brass, no jackpot language. Markers are neutral (`↳ • → ×`), the total is
labelled `DAY TOTAL`. Rule labels read from the rule *kind* (`adjacency`, `copies neighbor`,
`row aura`, `tag synergy`, `copies best`, …) via `receiptDepsFromGameState(state, { table, combos })`,
not the raw ruleId slug; prototype levers map to `spotlight` / `today's order` / `tag synergy`.

## Snapshot receipt for one golden (m0-shop-cat-row-aura — the richest)

```
Shop Cat ............................. 0
  ↳ Shop Cat · row 0 aura ......... ×1.5
Shop Cat subtotal (row ×1.5) ....... = 0
Wine Bottle .......................... 4
  ↳ Honey Jar · neighbor grant .. +4 → 8
Wine Bottle subtotal (row ×1.5) ... = 12
Honey Jar ............................ 2
DAY TOTAL ........................... 15
```

Reads exactly as cause-then-effect: Shop Cat casts the row aura (named), Honey Jar grants Wine
Bottle +4 → 8 (source named, affected = the Wine window it nests under), and Wine's `= 12` subtotal
attributes the `(row ×1.5)` that lifted 8 → 12. Honey Jar took no cause, so it stays a single line.

Basic wine+cheese for contrast:
```
Wine Bottle .......................... 4
  ↳ Wine Bottle · per neighbor .. +3 → 7
Wine Bottle subtotal ............... = 7
Cheese Wheel ......................... 3
DAY TOTAL ........................... 10
```

## Acceptance criteria — status

1. **Unit tests / every kind / golden snapshots / synergy+spotlight+signature — ✅.**
   `src/juice/receipt/receiptModel.test.ts`. The six M0 goldens produce stable snapshot receipts
   (paper + structured lines). The synergy+spotlight+signature case is built from the real engine
   (`resolveOpenShop` with `SIGNATURE_ITEMS_ENABLED=1` + `TAG_SYNERGY_ENABLED=1`, shop-cat +
   maneki-neko + lucky-cat, spotlight on the item that scores > 0) — verified **non-vacuous**: the
   trace genuinely fires `synergy`, `spotlight`, and the signature `lucky-cat-best-in-shop`, and
   each is asserted (source named, correct rule label, ordering preserved).
2. **No-orphan-deltas proof — ✅.** A seeded 50-trace fuzz (`mulberry32`, windows with 0–3
   self/cross flat/mult fires, auras, transforms, vanishes) asserts every `ruleFire` yields exactly
   one `cause` line and `causeHasSource(line)` holds (non-empty source name). A missing-shelf-slot
   test proves the guarantee survives even when `itemNameAt` returns `undefined` — the model falls
   back to a `Slot r,c` token, so a cause is never sourceless regardless of deps.
3. **Cadence sync, no second clock — ✅.** Every line carries the `eventIndex` that reveals it;
   `visibleReceiptLines(lines, player.stepIndex)` prints line *i* the instant the cascade resolves
   event *i* — driven entirely by `useCascadePlayer`'s existing `cascadeStep` clock (260 ms @1× /
   130 ms @2×). Reduced motion short-circuits ONLY the print: `visibleReceiptLines(lines, _, true)`
   returns the whole receipt at once (R-28 parity). `print.test.ts` pins reveal, monotonicity, and
   the reduced-motion path.
4. **Normal-day performance — ✅ (argument).** `receiptFromTrace` is a single synchronous fold over
   the event list — O(events), no allocation per frame, no React. It runs **once** per trace
   (memoize on `trace`), producing a static `ReceiptLine[]`; the only per-step work is the pure
   `visibleReceiptLines` filter (an integer compare per line). No frame work beyond the line reveal,
   which rides the cascade steps that already exist. Normal days are unaffected: the model is
   independent of `cascadeTier`, so a `'normal'` cascade pays only the one-time fold.

## Hard-rule compliance
- **receiptModel built first, headless, unit-tested against the 6 M0 goldens + 50-trace proof** — ✅.
- **Zero sim/trace changes; no new event kind** — ✅. Every grammar decision is derived from the
  existing events. The one place the trace under-attributes (row-aura → subtotal jump) is resolved
  in the *model* by tracking active auras, **not** by adding a trace event. I did not need to
  escalate — the trace carries enough.
- **Cadence reuses the cascade player's clock** — ✅ (`print.ts`, `eventIndex`).
- **Apex: receipt prints after the spectacle resolves** — the primitive is in place (the `total`
  line reveals at the terminal `dayTotal` step, the same beat the B-M6 slam lands), but the explicit
  "hold the receipt surface until the apex spectacle overlay resolves, and never let it compete"
  is a **UI-wiring + look decision, deferred to the human gate** (see shots below). The model does
  not gate on tier by design — presentation owns that.
- **paper/ink/brass, no jackpot language** — ✅.
- **Summary/share reuse** — the brief said do it only if it "drops out for free." It does not drop
  out for free (the share card is an image pipeline, not text), so it is left as **follow-up**:
  `formatReceipt` gives the share card a ready paper body when that work is scheduled.

## Commands + outputs
```
$ nvm use 23.3.0
$ npx vitest run src/juice/receipt
  Test Files  2 passed (2)
  Tests  25 passed (25)      # 12 snapshots written

$ npx vitest run src/sim/determinism.test.ts src/sim/goldens.test.ts
  Test Files  2 passed (2)
  Tests  8 passed (8)        # determinism pin 8d48e1c5a6ad14c9 + 6 M0 goldens: untouched

$ npx tsc --noEmit   # (src/juice/receipt/*: zero errors)
```
Full-suite note: `npx vitest run` = **223 passed**; the one failing *suite* (`src/ui/tokens.test.ts`)
and the residual tsc errors (`src/ui/tokens.ts`, `scripts/contrast-check.ts`) are **pre-existing,
uncommitted parallel B-M7 accessibility-floor work** (the brief flagged the tokens overlap), not
B-M8 — my change adds only `src/juice/receipt/` and touches nothing else. Verified by scoping tsc
and the failing paths to files outside this task.

## Deferred visual close-out — shots/recording the device gate needs
Run on the iOS simulator via the simctl-seed technique (memory `ios-ui-verify-on-simulator`); the
receipt surface wiring into the scoring screen is the human's look pass, so these are the artifacts
that close it:

1. **Mid-print** — a scoring day paused ~⅔ through: the receipt has printed the top item windows +
   their `↳` causes but not yet the `DAY TOTAL`, next to the on-shelf cascade at the same step.
   *Seed:* the `m0-shop-cat-row-aura` golden (`goldenFixtures[3]`), 1× speed, pause at stepIndex 4.
2. **Full receipt, scrolled** — a long day scrolled to the brass total, reviewable after the cascade.
   *Seed:* a full-stack day — `SIGNATURE_ITEMS_ENABLED=1 TAG_SYNERGY_ENABLED=1 GOAL_LADDER_ENABLED=1`,
   fuzz seed `fable-signoff-0708`, first day with ≥ 12 item windows.
3. **Apex-day ordering** — proof the receipt prints *after* the B-M6 apex spectacle resolves and
   does not compete with it. *Seed:* the `/cascade-harness` apex demo (the B-M6 recording seed);
   capture the apex slam, then the receipt completing beneath/after it.
4. **Reduced-motion** — the same day with Reduce Motion ON: the full receipt is present at once
   (no per-line print), cascade steps snapped. *Seed:* any of the above with the OS Reduce Motion
   toggle on; confirm `visibleReceiptLines(..., revealAll=true)` parity.

## Reviewer re-run pointers (re-running the original failure scenario)
- **Grammar #2 (no orphan deltas):** the failing behavior the jury named is "an effect rendered as
  a bare number with no source." Re-run: `npx vitest run src/juice/receipt` — the 50-trace fuzz and
  the missing-name fallback test both assert `causeHasSource` on every `ruleFire`-derived line; flip
  `slotLabel` to return `''` to watch them fail (proves they exercise the guarantee, not a stub).
- **R-6 beneficiary (source vs. target):** the honey→wine test asserts the cause nests under the
  *target* window while naming the *source* item — the exact fixture-1-vs-4 divergence `cascadeState`
  handles. Re-run and inspect `m0-shop-cat-row-aura`'s snapshot.
- **Determinism floor:** `npx vitest run src/sim/determinism.test.ts src/sim/goldens.test.ts` — pin
  + goldens green; the change is additive-only, so the OFF path is byte-identical by construction.

**STOP — Fable reviews the model; the human owns the look.**
