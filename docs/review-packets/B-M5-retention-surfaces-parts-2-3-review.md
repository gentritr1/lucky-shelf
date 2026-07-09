# B-M5 Parts 2–3 — Retention surfaces: unlock silhouettes + next-unlock teaser — review packet

**Implementer:** Opus 4.8 (Lane B), 2026-07-09. **Reviewer:** Fable (view-models) + human device gate
(visuals). **Brief:** [docs/lane-b/retention-surfaces-brief.md](../lane-b/retention-surfaces-brief.md).
**Why now:** requested as the unblock step for B-M11 (whose hard gate is "B-M5 Parts 2–3 landed on
main"). Part 1 (daily streak) already landed (`e69b3a6`); this packet is Parts 2–3 only.
**Status: implemented; headless gates green (tsc + 259/259 + boundary/token greps). NOT committed —
see §Landing. STOP — Fable reviews; visuals close on the device gate.**

## Built vs criteria

**Part 2 — Catalog silhouettes** (flag-gated by `UNLOCK_LADDER_ENABLED`, consuming A-M7's module):
- New store view-model surface on `buildCatalogView` ([src/state/catalogStore.ts](../../src/state/catalogStore.ts)):
  each `CatalogItemRow` now carries `locked: boolean` + `unlockHint: string | null`. `locked` is
  true only when the ladder flag is on, the item is **not discovered**, the item is **on the
  ladder** (`UNLOCK_LADDER[id]` exists — transform-target upgrade variants aren't, so they stay
  "?"), and its predicate isn't met (`!unlockedItemIds(catalog).has(id)`).
- `formatUnlockHint` renders the sim's predicate as prose — **display formatting only, no unlock
  logic in Lane B** (non-goal honored): `runsPlayed → "Reach N runs"` (singular at 1),
  `itemDiscovered → "Discover the {itemName}"`, `comboAchieved → "Discover the {comboName} combo"`.
- Catalog screen ([src/app/catalog.tsx](../../src/app/catalog.tsx)): a new `LockedStamp` branch
  renders the **real sprite tinted to a dark silhouette** (`tintColor: palette.inkFaint`, no new
  art) + the hint where the name sits. Items with no sprite yet fall back to a solid dark
  silhouette box. **Locked ≠ undiscovered:** locked = silhouette + hint; undiscovered = today's
  woodInset "?" + "???". Two visually distinct states.

**Part 3 — Next-unlock teaser** on the run summary ([src/app/summary.tsx](../../src/app/summary.tsx)):
- New view-model `nextUnlockTeaserView(catalog)` → `{itemId, name, hint} | null`. Reads the **live**
  catalog so it reflects this run once `recordRunEnd` merges it. Prefers the nearest `runsPlayed`
  gate (the literal "one more run" hook), else the first upcoming unlock.
- One quiet row under the personal bests: silhouette thumb + `NEXT UNLOCK` label + hint. No CTA, no
  coins, not a popup. **Omitted entirely** (`null`) when the flag is off or the ladder is exhausted.

## What I ran / verified (executed, node 20.19.4 — repo default node is v14, too old for vite 8)

- **Suite:** `vitest run` → **35 files, 259/259** (was 251; +8 new). **tsc:** `--noEmit` clean.
- **New view-model tests** ([catalogStore.test.ts](../../src/state/catalogStore.test.ts), 10 in file):
  runs-gated lock + `"Reach 6 runs"`/`"Reach 1 run"` (singular); item/combo-gated hints resolve to
  display names; `always` items never locked; **discovered wins over locked** (locked ≠ merely
  undiscovered — a daily-pool discovery of a runs-gated item reads discovered, not locked);
  **flag-OFF proves every `locked===false` + `unlockHint===null`** (byte-identical guarantee);
  teaser prefers the nearest runs gate, returns null flag-off, returns null when exhausted.
- **Boundary grep** (`@/items`/`@/sim` value-imports in `src/app`) → **clean** (the unlock module is
  consumed only in the store layer; screens read the view-models). **Token grep** (raw hex/rgb in
  touched files) → **clean** (`tintColor` references `palette.inkFaint`).
- **Flag-off byte-identical — VERIFIED by construction + test:** the screen's new branch
  (`if (item.locked) return <LockedStamp/>`) is unreachable when the flag is off (`locked` always
  false), and the teaser row is `null`, so both screens render their pre-change trees exactly.

## Persistence / migration note (red-flag check)

**No new persisted fields, no schema change, no wipe risk.** Parts 2–3 are pure view-models derived
from A-M7's predicate evaluation over the **existing** catalog data. (Part 1's additive `streak`
field already shipped in `e69b3a6` with its old-shape load test.) The catalog record path is
untouched — the B-M4 catalog-wipe scar does not apply here.

## Deferred to the human device gate (UNVERIFIED — visuals)

RN catalog/summary screens aren't reliably eyeballable headlessly, and the silhouettes only render
with the flag ON (`UNLOCK_LADDER_ENABLED=1`) over a catalog with locked items. Requested seeded
simulator shots (16 Pro + iPhone SE 375pt), flag ON unless noted:
1. Catalog showing **locked-silhouette vs undiscovered-"?" vs discovered** side by side (fresh
   catalog: everything past the always-tier is a silhouette).
2. Catalog **flag-OFF** shot proving byte-identical rendering (no silhouettes, all "?").
3. Summary with the **next-unlock teaser** (fresh catalog → "Reach 1 run", apple-basket silhouette).

**Known visual risk to check at the gate:** on the 22%-width catalog card, long conditional hints
("Discover the Lucky Cluster combo") may ellipsize at `numberOfLines={2}`, fontSize 9 — acceptance
§3 wants no truncation at 375pt. The common early-game case (`runsPlayed` gates → "Reach N runs")
fits. **Proposed fallback if it clips:** a short card-only hint form ("Combo: Lucky Cluster" /
"Find: Price Gun"), keeping the full prose on the full-width summary teaser. Not applied yet —
flagged for the gate's call rather than guessed.

## Landing (escalation — I did NOT commit)

The working tree currently entangles **three lanes'** uncommitted work: Lane A (`run.tsx`,
`ShelfScene.tsx`, `placementHints*`, `signature-dominance.ts`, `package.json`), my B-M10 (share
polish — `share.tsx`, `store.ts`, `tokens.ts`, `seedLabel*`, `receiptCardView*`), and now B-M5 P2–3.
`summary.tsx` carries **both** B-M10 (seed label) and B-M5 P3 (teaser), so `git add summary.tsx`
can't isolate this change. Combined with the brief's **STOP / no-self-sign-off** rule, I did not
commit or push. Consequence: **B-M11's "landed on main" gate is not yet satisfied** — it needs
Fable's review of this packet and a clean merge sequencing (recommend: B-M10 reviewed+landed first,
then B-M5 P2–3, since they share `summary.tsx`). I can prepare a clean branch/commit on your go.

```
Verdict sought: APPROVE view-models + wiring; visuals close on the device gate (§shots).
Pre-fix failure reproduced: n/a (new surfaces). Flag-off byte-identical proven by test + construction.
Tests cover the path: lock classification incl. discovered>locked precedence + flag-off; teaser
  nearest/null-off/null-exhausted. All consume A-M7's real predicate module (no re-implemented logic).
Runtime/device verification: UNVERIFIED (visual) — 3 seeded sim shots listed; long-hint truncation flagged.
Out-of-scope changes: none of mine beyond the brief (Lane A + B-M10 tree files untouched by P2–3).
Risks remaining: none headless (tsc/suite/greps green); visual truncation + the multi-lane landing sequencing.
```
