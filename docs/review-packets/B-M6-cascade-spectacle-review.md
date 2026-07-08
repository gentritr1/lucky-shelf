# B-M6 Top-tier cascade spectacle — review packet

**Implementer:** Opus 4.8 (Claude Code session). **Date:** 2026-07-09.
**Base:** `main` @ `29909fe`. **Reviewers:** Fable (logic) + the human device gate (feel).
**This brief cannot close on screenshots — it needs a screen recording accepted by the human.**

## What shipped

A pure spectacle-tiering function + a tier-gated presentation layer over the cascade. Zero
sim/scoring/trace/economy changes — the tiering is a function of the trace the engine already emits.

- `src/juice/cascade/cascadeTier.ts` — pure `cascadeTier(trace, dailyTarget?): 'normal'|'big'|'apex'`
  with exported `CASCADE_TIER_THRESHOLDS`; helpers `dayTotalOf`, `ruleFireCount`.
- `src/juice/cascade/cascadeTier.test.ts` — 12 headless unit tests.
- `src/juice/cascade/CascadeSpectacle.tsx` — the big/apex overlay (edge glow, slam wash, spark
  burst), reduce-motion aware.
- `src/juice/cascade/CascadeLayer.tsx` — computes the tier, mounts the overlay **only** for
  big/apex, warmer pops (default-1 boost), oversized apex day-total, one apex haptic on the slam.
- `src/ui/tokens.ts` — one added haptic token `apexSlam: 'notification-success'`.
- `src/app/cascade-harness.tsx` — two demo fixtures (`APEX spectacle`, `BIG cascade`) for the
  recording, forced by attaching a small `dailyTarget` to the richest golden (no golden altered).
- `scripts/cascade-tiers.ts` — the 120-run full-stack frequency measurement.

## Threshold rationale — the brief's provisional numbers did not survive the live curves

The brief's provisional `big = 1.5×`, `apex = 2.5× target OR ≥12 ruleFires` were measured against
the actual full-stack fuzz and were **far too low** (this is the recorded "sanity-check brief
constants against live curves" scar, firing again):

```
120-run full-stack fuzz, 2367 scored days (avg 19.7/run), all with a goal target
dayTotal/target ratio:  p50 1.88  p75 2.37  p90 2.81  p95 3.36  p98 4.14  p99 4.43
ruleFires/day:          p50 27    p75 32    p90 38    p95 40    p98 43    p99 51   max 57
```

A *median* full-stack day already scores **1.88× its goal** with **27 ruleFires** — so `1.5×` caught
~75%+ of days and `≥12 fires` caught essentially all of them (apex fired on **84.3% of days**). The
economy is deliberately gentle in *coins* (build-swing 1.3–2.0×, untouched) but the bots overshoot
the low goal target massively, so ratio- and fire-based tiers are naturally common. Retuned to the
live curves:

| constant | brief | shipped | basis |
|---|---|---|---|
| `bigTargetMult` | 1.5 | **2.8** | ~p88 of day ratio → big is a genuinely strong day |
| `apexTargetMult` | 2.5 | **4.2** | ~p98 of day ratio → apex is a top-2% day |
| `apexRuleFires` | 12 | **50** | ~p99 of fire density (the "numbers go nuclear" spike) |
| `bigRuleFires` | — | **40** | goal-ladder-OFF fallback only (see note) |

### Measured frequency under the shipped thresholds

```
per DAY:   normal 2114 (89.3%)   big 191 (8.1%)   apex 62 (2.6%)
per RUN:   apex in 13/120 runs (10.8%)   big in 44/120 runs (36.7%)
           big days/run 1.59      apex days/run 0.52
```

- **apex ≈ 0.52 days/run → roughly one apex per ~2 runs.** Meets the brief's headline intent
  ("roughly once per 2–3 runs, not once a day").
- **big ≈ 1.59 days/run.** Squarely in the brief's "1–2 days/run" target.

### ⚠️ Escalation to Fable — the brief's two apex-frequency targets conflict

The brief asks for apex **both** "once per 2–3 runs" **and** "in ~30–60% of RUNS." Under this economy
these cannot both hold: apex days **cluster** in a minority of high-scoring runs, so forcing 30–60%
of runs to contain an apex requires dropping `apexTargetMult` to ~3.0, which explodes apex to **~1.5
days/run** — "once a day," the exact thing the brief says apex must *not* be. I prioritized the
per-frequency intent ("not once a day") and landed apex at 0.52 days/run / 10.8% of runs. **Fable's
call:** keep apex rare-and-special (shipped), or widen it toward the 30–60%-of-runs reading at the
cost of per-day rarity. The threshold is one exported constant — trivially re-tunable. Full sweep
data in `scripts/cascade-tiers.ts` output.

**Note on `bigRuleFires` (fallback):** with the goal ladder OFF (the shipping default) there is no
per-day target, so big/apex fall back to raw fire density. The full-stack fuzz has the ladder ON, so
this path is *unmeasured here*; base-game scoring is far less dense, so big/apex will fire rarely
with flags off — consistent with "no always-on effects; normal cascades stay as shipped."

## Built vs. acceptance criteria

| # | Criterion | Status | Evidence |
|---|---|---|---|
| 1 | `cascadeTier` unit tests hit each tier; ladder-less fallback; exported constants; suite+typecheck green | ✅ | `cascadeTier.test.ts` 12 tests (target boundaries derived from constants, no-ladder fallback, target-0 guard). `tsc` clean tree; **vitest 28 files / 191 tests pass**. |
| 2 | Apex frequency across 120-run full-stack fuzz reported | ✅ | Table above; `node scripts/cascade-tiers.ts --runs 120`. apex 0.52 days/run (≈1 per 2 runs); big 1.59/run. Dual-target tension escalated. |
| 3 | Normal-tier rendering byte-identical | ✅ **by construction** (see below) | Tier gate short-circuits every effect; described + argued path-by-path. Visual confirm = the device recording's normal days. |
| 4 | Reduce-motion: apex snaps flat; haptics/cadence unchanged | ✅ code / ⏳ device | Every effect has a reduced branch (glow static, wash static tint, spark omitted, typography static, pops static). Player cadence + haptic ladder untouched. Simulator snap-check = device gate. |
| 5 | Screen recording of one apex + one big cascade | ⏳ **PENDING human device gate** | Cannot record headlessly; native build historically broken here + tree churned by Lane A. Deterministic one-tap recipe below; demos verified to classify apex/big headlessly. |

## How "normal is byte-identical" was verified (criterion 3)

The verification is a **code-path short-circuit argument** (a render-diff snapshot isn't feasible —
the repo has no RN render-test harness, and CascadeLayer needs Reanimated/native). When
`tier === 'normal'`:

1. `spectacle = (tier !== 'normal')` is `false` → `{spectacle ? <CascadeSpectacle/> : null}` renders
   **null** — no overlay node, no layout shift.
2. `POP_SCALE_BOOST.normal === 1` → `SlotPop` scale is `(0.6 + t*0.4) * 1`, **identical** to the
   shipped `0.6 + t*0.4`.
3. The day total renders the ternary's else branch — the **verbatim** shipped
   `<CoinCounter … variant="slam" />` (the apex wrapper is on the `tier === 'apex'` branch only).
4. The apex-haptic effect early-returns / no-ops unless `tier === 'apex'` — no new haptic on normal.

So the normal render tree and every style value are unchanged; the only additions are hooks that
compute and render nothing. **A normal day must look and feel exactly as shipped** — the device
recording of an ordinary cascade is the visual confirmation left for the human gate.

## Reduce-motion (criterion 4)

Tier still computes; only motion is suppressed, and no flashing:
- **Edge glow** → static at rest opacity (no build/pulse). **Slam wash** → a faint static tint, no
  flash. **Spark burst** → omitted entirely (motion-only). **Oversized apex total** → static larger
  scale, no overshoot spring. **Warmer pops** → static.
- **Haptics unchanged:** the apex `notification-success` fires in both modes (haptics are the
  reduced-motion channel, per R-28); the cascade cadence (`useCascadePlayer`) and the existing
  step/slam haptic ladder are untouched.

## Audio (decision — no change)

The cascade payout sting (`playCascadeSting`, sfx-pref-gated) already fires on **every** cascade via
the existing gateway (`run.tsx`). The brief lists "a celebratory sting through the existing gateway
(respecting prefs)" as an apex beat — that requirement is already satisfied for all cascades. I did
**not** make it apex-exclusive (that would strip audio from normal/big — a regression to shipped
feel) and did **not** add a new asset. If a *distinct* apex sound is desired, that's a follow-up
needing a new audio asset — out of this scope. Apex's added audio-adjacent beat is the `apexSlam`
haptic.

## Commands & outputs

```
$ npx tsc --noEmit                              # TYPECHECK CLEAN (whole tree)
$ npx vitest run                                # 28 files / 191 tests passed
$ npx vitest run src/juice/cascade/cascadeTier.test.ts   # 12 passed
$ node --import tsx scripts/cascade-tiers.ts --runs 120   # distribution table above
$ grep -nE '#[0-9a-fA-F]{3,6}' <my 3 juice files>        # NO RAW HEX (tokens only)
$ grep -nE 'expo-haptics|expo-audio|Haptics\.' <my files># GATEWAY-ONLY (no bypass)
```

## The recording — recipe for the human device gate (criterion 5)

The Cascade Harness (`/cascade-harness`) now leads with two autoplay demos. On the iOS simulator
(seed technique per memory `ios-ui-verify-on-simulator`):

1. Launch → open **Cascade Harness**.
2. Select **"APEX spectacle (demo)"** (first chip) → it autoplays: watch the gold edge-glow build,
   then the gold wash + spark burst + oversized day-total slam. **Record this.**
3. Select **"BIG cascade (demo)"** → autoplays with warmer pops + the gold-wash breath on the slam.
   **Record this.**
4. Also glance at any golden day (e.g. "Wine Dine Combo") to confirm a **normal** cascade looks
   unchanged, and flip Settings → Reduce Motion to confirm the apex snaps flat with no flashing.

Both demos were verified headlessly to classify correctly: apex demo → target 4, ratio 5.5 → `apex`;
big demo → target 7, ratio 3.14 → `big` (richest golden `m0-wine-dine-combo`, dayTotal 22, verbatim
trace, only `dailyTarget` set).

## Tree state (unchanged hazard from B-M5)

Shared checkout, still concurrently edited by Lane A's A-M7 (untracked `src/sim/unlocks*`, modified
`src/sim/*`). **I did not commit.** My B-M6 files are the 6 listed under "What shipped"; land them as
an isolated set alongside my still-uncommitted B-M5 files. B-M6 surfaces (`src/juice/**` +
`cascade-harness` + one tokens line) are disjoint from both A-M7 (`src/sim`) and B-M5
(catalog/summary/title/daily).

## Known issues / open gaps
- **Recording UNVERIFIED** — pending the human device gate (recipe above). This brief cannot close
  without it.
- **Reduce-motion snap + normal-unchanged** are argued from code, not a captured render — confirm on
  the device pass.
- **Apex-frequency dual-target tension** — escalated to Fable (above); shipped rare-and-special.
- `bigRuleFires` (goal-ladder-off fallback) is unmeasured by the full-stack fuzz; conservative.

## STOP
Logic implemented, headlessly green, frequency measured. **STOP — Fable reviews the logic; the human
device gate owns the feel and must accept the apex + big recording before this closes.**
