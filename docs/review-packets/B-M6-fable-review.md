# B-M6 Fable Review — Top-tier cascade spectacle

**Reviewer:** Fable, 2026-07-08. Reviews Opus 4.8's
[B-M6-cascade-spectacle-review.md](B-M6-cascade-spectacle-review.md).
**Verdict: APPROVE the logic and the retuned thresholds; the FEEL stays open on the human
recording gate, as designed. The escalated dual-target conflict is ruled below.**

## Ruling on the escalation — apex frequency dual-target
My brief specified both "once per 2–3 runs" and "30–60% of runs"; the implementer correctly
showed they conflict once apex days cluster in high-scoring runs. **Ruling: the rare-and-special
reading stands** — the design intent is that an apex feels like an event, not a daily
occurrence. The shipped tuning (apex 2.6% of days ≈ 0.52 days/run; big 1.59 days/run) is
approved; the %-of-runs phrasing is retired. Final calibration belongs to the human at the
recording gate and in device play — one exported constant to move either way.

## The scar, fourth firing — now promoted
The brief's provisional thresholds (1.5×/2.5×/12 fires) were computed from the goal-target scale,
not the live distribution — a median full-stack day already runs 1.88× its target with 27
ruleFires, so my numbers caught 84% of days. The implementer retuned against measured
percentiles (2.8×/4.2×/40/50) and showed the work (`scripts/cascade-tiers.ts`). This is the
fourth time a spec constant failed against live curves; the rule is hereby promoted from project
memory to standing practice: **no threshold enters a brief without a measurement script run
against current data, and every brief names the script.**

## What I re-ran / verified
- **Executed:** `tsc` clean (whole tree), **191/191 tests** incl. the 12 tier tests; boundary
  greps clean (gateway-only audio/haptics, no raw hex).
- **Code read — VERIFIED:** `cascadeTier` is pure trace logic beside `popModel` (the established
  headless pattern); thresholds are exported constants shared by tests and the frequency script;
  the goal-ladder-less fallback (ruleFire density) and the explicit OR (50-fire day is apex
  regardless of target) match the brief; the normal-tier path short-circuits before any style
  branch (overlay → null, `POP_SCALE_BOOST.normal === 1`, apex-only typography/haptic branches)
  — I accept the byte-identical claim on the path argument given no RN render harness exists,
  with the device recording as the runtime confirmation.
- Reduce-motion mapping (static glow/wash, sparks omitted, cadence + haptics unchanged) follows
  the R-28 convention — snap-check rides the same recording session.

## What remains — the human gate (blocking close, not landing)
One simulator screen recording: the `/cascade-harness` one-tap APEX and BIG demos (packet has
the recipe). Accept/reject the feel; if apex should be rarer or louder, say so — it's one
constant and one juice budget, both isolated.

```
Verdict: APPROVE logic + thresholds; feel gate OPEN (recording, human).
Tests cover the path: 12 headless tier tests + frequency measurement script; executed green.
Out-of-scope changes: none — juice/tokens/harness only, disjoint from both sibling lanes.
Risks remaining: feel acceptance; threshold re-check belongs to the graduating-set retune pass
  (tier thresholds reference goal targets, which will move — same tune-vs-stack scar).
```
