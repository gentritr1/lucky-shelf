# Fable reviews — 2026-07-10, round 6 (B-M9 + B-M11)

Reviewer: Fable (this session). Implementer: Opus 4.8 (Lane B). The implementer's packets were
treated as unverified premises; every load-bearing claim below was re-run or re-read
independently. Register labels: **[ran]** = executed and observed here; **[read]** = inferred
from reading the diff/source (not executed); **[unverified]** = needs a device/eyeball gate.

Shared evidence **[ran]**: full `pnpm typecheck` clean + `pnpm test` **46 files / 289 tests
green** on node 23.3.0 (fresh run this session, 50s). Diff scope re-derived from
`git diff c4f890d..HEAD`: **no `src/sim`, `src/items`, or `src/persistence` changes** — the
determinism pin (`8d48e1c5a6ad14c9`) and M0 goldens cannot be touched by this round, and the
pin/golden tests are in the green suite. The two sim tests B-M9's packet flagged as flaky
(`unlocks.test.ts`, `balanceHarness.test.ts`) **passed** in my run — consistent with
"pre-existing environmental flake," nothing for this round.

---

## B-M9 — runtime-theme migration

```
Verdict: APPROVE (code + headless proofs; device look joins the batched gate)
Pre-fix failure reproduced: yes — the "failure" is structural: pre-migration screens baked
  palette into module-load StyleSheet.create (confirmed [read] at c4f890d:src/app/settings.tsx),
  so B-M7 prefs could not reach them by construction.
Fix verified against original scenario: [ran] all 9 *.styles.test.ts equality tests green in the
  full suite; [ran] grep: the ONLY remaining StyleSheet.create in src/app/*.tsx is run.tsx (the
  allowed human-WIP exception); every makeStyles takes palette as a PARAMETER and no *.styles.ts
  value-imports palette.
Tests added/changed — failing path they cover: per-screen equality tests assert
  makeStyles(palette) === an independent transcription of the ORIGINAL sheet (byte-identity at
  defaults) AND makeStyles(highContrastPalette) === the same transcription re-themed (static-leak
  guard). Circularity attack [ran]: settings.styles.test.ts `expected(p)` compared prop-for-prop
  against the PRE-migration sheet at c4f890d — it is a true transcription of the original, not a
  copy of the factory. The other 8 transcriptions are sampled, not exhaustively audited [read].
Runtime/device verification: UNVERIFIED — large-text 1.3× + HC on device deferred (queued below);
  byte-identity at defaults is headless-proven, so the deferred gate risks only the NEW (HC/scale)
  looks, not the shipped default look. AppText-at-defaults identity rests on B-M7's proven
  scaleTypeStyle identity at scale 1 [read, established in a66f80d review].
Out-of-scope changes: summary.tsx + _layout.tsx migrated beyond the B-M7 8-screen list — justified
  (they read palette statically; required for the acceptance grep). Spot-check [ran] of the
  catalog.tsx commit: all JSX changes are Text→AppText with variant/color matching the old
  typeScale spread, module `palette` import removed in favor of usePalette() — mechanical, no
  logic edits smuggled in.
Risks remaining: run.tsx is now the ONE screen prefs don't reach (deliberate; migrate after the
  human's WIP window — same pattern applies). ShelfScene Skia canvas colors untouched (known
  limit, per brief). Pre-existing size-pinned captions don't scale under large-text (documented;
  separate design task). restock dead styles transcribed verbatim (cleanup candidate).
```

## B-M11 — combo discovery moments

```
Verdict: APPROVE (model + wiring; look/sound/feel join the batched device gate)
Pre-fix failure reproduced: n/a (additive feature, no prior failing behavior). Sequencing gate
  confirmed: B-M5 P2–3 on main (695049f); built on B-M9's helpers (catalog.tsx accent uses the
  migrated factory).
Fix verified against original scenario: [ran] discoveryModel tests (9) green in the full suite,
  incl. the brief's named edge — second fire of a combo in the SAME trace classifies `repeat` —
  and golden-trace stability. [read] classifier is pure (no store/sim/side-effect imports,
  grep-confirmed juice files import no @/state, @/sim, @/items).
Tests added/changed — failing path they cover: [ran] useCascadePlayer.test.ts asserts
  stepDurationMs(base, speed, false) === Math.round(base/speed) — the LITERAL pre-B-M11 formula —
  and the slow path === base × motion.discoverySlowBeat (token, 1.2). [read] the player diff's
  only timing change is that one stepMs line; slowBeatIndices defaults to an EMPTY set, and the
  caller passes slowBeatStepIndices(moments, !reduced) → empty under reduced motion, so the
  reduced-motion / no-discovery cadence is byte-identical by construction and by test.
Runtime/device verification: UNVERIFIED — toast/stamp look, jingle timbre, slow-beat feel, and
  the anti-casino "warm recognition, not jackpot" read all need the device recording (queued
  below; the harness now seeds an empty run-start catalog so goldens demo first-ever on demand).
Out-of-scope changes: src/state/catalogStore.ts touched — declared and ruled IN scope: the
  lastRunDiscovery stash is in-memory zustand state mirroring prevRunStats [read: saveCatalog
  persists only the merged Catalog; no schema change, no wipe risk]; isNew defaults false so the
  default album render is unchanged. run.tsx edited minimally (import + hook + prop, additive
  [read]) — coordinated per brief.
Escalations ruled: (1) "until first viewed" fade DROPPED — correct call, the brief's explicit
  fallback; the accent persisting until the next run records is acceptable. Revisit only if the
  device gate finds it noisy. (2) Jingle placeholder (cascade sting) — acceptable to keep the
  bundle intact, but it currently sounds like the PAYOUT sting, which muddies the
  recognition-not-jackpot identity; a bespoke asset is REQUIRED before the discovery moment is
  called feel-complete. Audio-gate item, one-constant swap in audio.ts.
Risks remaining: useRunStartAchievedCombos snapshots the catalog at mount with no load-guard —
  [read] _layout boot-hydrates the catalog at app start and recordRunEnd keeps its B-M4
  load-guard, so the empty-snapshot race is theoretical and COSMETIC only (a repeat combo could
  replay as first-ever; zero persistence risk). Cheap hardening if it ever fires: gate the
  snapshot on loadStatus === 'loaded'. Noted, not blocking.
```

---

## Batched device gate — consolidated queue (iPhone SE, per `ios-ui-verify-on-simulator`)

1. **B-M9 large-text 1.3×** on /restock (seed `luckyShelf:prefs:v1` textScale 1.3): AppText copy
   grows without truncation/overlap; coin-nudge digits + glyphs stay fixed (expected); share
   receipt still dot-leader-aligns.
2. **B-M9 high-contrast** on /restock + /summary: surfaces re-theme together, grayscale legible;
   ShelfScene canvas unchanged (known limit).
3. **B-M11 first-ever moment, normal motion** (/cascade-harness, golden with a comboNamed):
   toast + gold DISCOVERED stamp, jingle fires, step visibly lingers ~1.2× — must read as warm
   recognition, distinct from an apex slam.
4. **B-M11 first-ever moment, reduced motion**: toast snaps, NO slow-beat (cadence identical),
   jingle still fires.
5. **B-M11 catalog "new" accent** after a first-achieving run: only that combo card carries the
   NEW stamp.
6. Carried over from `1dba09e` (B-M7 polish): ✓/✕ drop cue during drag + spotlight pill at ×N
   widths.

Open audio dependency: bespoke discovery-jingle mp3 (swap `DISCOVERY_JINGLE_SOURCE` in
`src/juice/audio.ts`).
