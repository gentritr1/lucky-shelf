# B-M11 — combo discovery moments — review packet

**Implementer:** Opus 4.8 (Lane B). **Brief:** `docs/lane-b/combo-discovery-moments-brief.md`
(Fable, 2026-07-09). **Sequencing:** B-M5 Parts 2–3 on main (`695049f`) ✅; built after B-M9's
runtime-theme migration and reuses its `useThemedStyles` pattern on `catalog.tsx`. **Committed**
(3 commits). **STOP — Fable reviews (model); sound/motion feel joins the batched device gate.**

**Verdict I'm asking Fable to rule:** APPROVE the pure classification model + the presentation
wiring. The load-bearing, testable claim is the **classifier** (acceptance #1) and the **timing-only
slow-beat** (acceptance #2), both proven headlessly. The look/sound of the toast, stamp, jingle and
slow-beat is UNVERIFIED by eyeball — deferred to the device recording below.

---

## What shipped

| Commit | Scope |
|--------|-------|
| `1ef39b8` | Pure `discoveryModel.ts` + `stepDurationMs` timing helper + tests |
| `110b491` | Presentation: player slow-beat, CascadeLayer toast/stamp/jingle, `run.tsx`/harness wiring, audio gateway |
| `b44400a` | Catalog album "new" combo accent (in-memory view-model flag) |

**Model (pure, `src/juice/cascade/discoveryModel.ts`).** `classifyDiscoveries(events, { achievedBeforeRun,
seenPriorThisRun })` tags every `comboNamed` as `repeat | first-this-run | first-ever`, each carrying the
`eventIndex` (= the cascade player's `stepIndex`, so presentation rides the existing clock — no second
clock). No store / sim / side effects.

**Presentation budget (exactly as briefed).**
- `first-this-run` → small ink-on-paper toast naming the combo.
- `first-ever` → toast + gold **DISCOVERED** stamp motif + one short jingle (SFX gateway, `sfxEnabled`
  gate) + a brief slow-beat (`1.2×` step dwell). Reduced motion: toast snaps, **no** slow-beat.
- `repeat` → nothing new (the existing `ComboBanner` already shows the combo).
- No coins language, no confetti — apex still owns the fireworks (B-M6 anti-casino identity).

**Data flow (no new clock, no boundary break).** `run.tsx` snapshots the run-start catalog
(`useRunStartAchievedCombos`, the B-M4 mount-snapshot pattern) and passes it to `CascadeLayer` as
`achievedBeforeRun`. Prior-days combos ride in on the existing `gameState` prop:
`cascadeMount.gameState` is the **pre-scoring** state (`beforeOpenShop`), so
`gameState.catalogDelta.discoveredComboIds` is exactly "combos discovered on earlier days this run" —
no subtraction, no cross-day edge. **juice stays acyclic**: `state → juice` already exists (store.ts),
so juice must not import `@/state`; the achieved snapshot is threaded as a prop instead.

---

## Evidence per acceptance criterion

### (1) Model unit tests — classification incl. the pre-run snapshot edge + golden stability

`src/juice/cascade/discoveryModel.test.ts` (9 tests, green):
- brand-new → `first-ever`; prior-run → `first-this-run`; prior-day-this-run → `repeat`.
- **The edge:** the SECOND fire of a combo in the same trace is `repeat` — asserted for both the
  brand-new path (`['first-ever','repeat']`) and the prior-run path (`['first-this-run','repeat']`).
- mixed trace asserts the exact `eventIndex` of each moment (interleaved with filler events).
- **golden stability:** over every `goldenFixtures` trace with an empty run-start catalog — classify
  twice → identical; every moment's `eventIndex` points at a real `comboNamed`; first fire of each
  combo is `first-ever`, later fires `repeat`.

```
$ npx vitest run src/juice/cascade/discoveryModel.test.ts
  Tests  9 passed (9)
```

### (2) Slow-beat is a step-DURATION multiplier; reduced-motion cadence unchanged

The whole diff to timing is `stepDurationMs(baseStep, speed, slow)` (pure) + one call site in
`useCascadePlayer`:

```ts
// useCascadePlayer.ts — the only timing line changed
const stepMs = stepDurationMs(motion.durations.cascadeStep, speed, slowBeatIndices.has(stepIndex));
```

`src/juice/cascade/useCascadePlayer.test.ts` proves:
- `stepDurationMs(base, speed, false) === Math.round(base / speed)` — the **literal pre-B-M11 formula**,
  for speeds 1 and 2. The caller passes an **empty** `slowBeatIndices` under reduced motion
  (`slowBeatStepIndices(moments, !reduced)` → empty when `reduced`), so `slow` is always `false` there
  ⇒ the reduced-motion / no-discovery cadence is byte-identical.
- `stepDurationMs(base, speed, true) === Math.round((base / speed) * motion.discoverySlowBeat)` and is
  strictly longer — a real lingering beat, only on that step.

`slowBeatStepIndices` also unit-tested (first-ever indices when enabled; empty when disabled).
`motion.discoverySlowBeat = 1.2` is a token (no raw number in the player).

### (3) Suite + tsc green; boundary / token / gateway greps clean

```
$ npx tsc --noEmit            # TSC=0
$ npx vitest run
  Test Files  46 passed (46)
       Tests  289 passed (289)     # was 273 pre-B-M11; +16 (9 model, 2 timing, 1 catalog, +4 harness/regression re-counts)
```

- **Gateway:** `grep expo-audio|expo-haptics` over `src` (excluding the two gateway modules) → only a
  tokens.ts *comment*. `playDiscoveryJingle()` lives inside `audio.ts` and is `sfxEnabled`-gated, like
  `playCascadeSting`.
- **Boundary:** the B-M11 juice files (`discoveryModel`, `CascadeLayer`, `useCascadePlayer`) import **no**
  `@/sim`, `@/items`, or `@/state` — juice stays acyclic (verified by grep). (Pre-existing juice→`@/sim`
  value-imports in `ShelfScene`/`receipt` are unrelated and untouched.)
- **Tokens:** no raw hex colors in any B-M11 file; the slow-beat factor is `motion.discoverySlowBeat`.

### (4) Deferred device recording

Record on device (native build flaky here — memory `ios-ui-verify-on-simulator`). **Vehicle: the
Cascade Harness** (`/cascade-harness`) — it now passes an empty run-start catalog, so every golden combo
classifies `first-ever`. Pick a golden with a `comboNamed` (e.g. the richest cascade).

1. **First-ever discovery moment, NORMAL motion.** Play a golden trace; on the combo step confirm:
   ink-on-paper toast with the gold **DISCOVERED** stamp; the **jingle** fires (SFX on); the combo step
   visibly **lingers** (~1.2×) before advancing. **Acceptance:** reads as warm recognition, not a second
   jackpot — no confetti, no coins language; distinct from an apex slam.
2. **First-ever discovery moment, REDUCED motion.** Settings → Reduced motion on, replay. **Acceptance:**
   the toast **snaps** in (no spring) and there is **no slow-beat** (cadence identical to a normal
   cascade step); the jingle still fires (SFX is its own channel).
3. **Catalog "new" accent.** After a run that first-achieves a combo, open the album. **Acceptance:** that
   combo card carries the subtle gold **NEW** stamp; other cards do not.

---

## Escalations & decisions (state-in-packet items)

- **Catalog "new" accent — scope chosen.** Implemented as a **pure `isNew` view-model flag** fed by an
  **in-memory** `lastRunDiscovery` on the catalog store (computed in `recordRunEnd` against the pre-merge
  catalog it already holds — the only place the pre-merge achieved set survives). This mirrors the
  existing `prevRunStats` precedent — **no new persisted field**. I **dropped the "until first viewed"
  fade**: tracking "viewed" would need persistence (or added session state), which the brief said to
  drop rather than add. The accent therefore shows whenever the album is viewed until the next run
  records (or app restart). Flagging for Fable in case the fade is wanted — that is the only piece that
  needs new state.
- **Jingle asset is a placeholder (deferred audio dependency).** No dedicated "warm recognition" mp3
  exists; `DISCOVERY_JINGLE_SOURCE` currently points at the cascade sting so the gateway/prefs wiring is
  real and the bundle stays intact. **A bespoke jingle asset is needed** — swap the one constant in
  `audio.ts` when it ships. Until then the discovery jingle sounds like the payout sting, which slightly
  muddies the "recognition, not jackpot" identity — an audio-gate item, not a code change.
- **`run.tsx` was edited (minimally).** It was clean/committed at B-M11 start (the human's WIP landed in
  `1dba09e`), and the feature can only reach the live game through the screen that renders the cascade.
  The edit is additive: import `useRunStartAchievedCombos`, pass `achievedBeforeRun` to `CascadeLayer`
  (2 lines). No behavior of the existing HUD changed. Coordinated per the brief.

## Non-goals honored

No sim/trace changes (scoring untouched; the model is pure over the emitted trace). No new persisted
fields (the "new" accent is in-memory). No changes to apex/big tiers (the discovery layer is additive and
`repeat`/absent renders nothing). No push notifications. No combo-definition changes. `ScoringTrace` has
no top-level `dayTotal` — the model reads only `comboNamed` events and never assumes one.

## Honesty ledger

- **Visuals/sound UNVERIFIED by eyeball** — no device recording yet (deferred gate above). The toast
  look, stamp, jingle timbre, and slow-beat feel are unconfirmed; the classifier and the timing math are
  proven headlessly.
- **Jingle placeholder** — reuses the cascade sting pending a dedicated asset (flagged).
- **"Until first viewed" fade dropped** — would need persistence/session state (flagged for Fable).
