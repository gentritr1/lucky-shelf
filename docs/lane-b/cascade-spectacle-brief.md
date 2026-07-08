# Lane B brief — B-M6: Top-tier cascade spectacle ("spectacle without swing", P4)

**Author:** Fable, 2026-07-08. **Implementer:** Opus 4.8 (may run parallel to B-M5 — the file
surfaces are disjoint: this lives in `src/juice/**`; B-M5 lives in catalog/summary/title/daily).
**Review:** Fable for the logic; the human device gate owns the feel — **this brief cannot close
on screenshots alone; it needs a screen recording accepted by the human** (§2 of the harness).

## Context (self-sufficient)

P4 in `docs/state-of-game-review-2026-07-08.md`: the economy's build-swing guardrail stays gentle
(1.3–2.0×, Fable's — DO NOT touch), so the game's "numbers go nuclear" thrill must come from
*presentation* at the top end. Today every cascade animates identically regardless of size.

Infra that already exists (verified): the cascade player (`src/juice/cascade/`, pure logic in
`popModel.ts` — the testable-headless pattern per memory `cascade-self-fire-pop`), an audio
gateway with per-screen beds + prefs (`memory: audio-system`), haptics ladder in
`src/juice/haptics.ts` (cascade-only today), reduce-motion prefs in `src/ui/prefs.ts`,
`ScoringTrace` events carry every ruleFire/itemTotal/dayTotal.

## Design (decided)

- **Tiering is pure trace logic** — add `cascadeTier(trace, dailyTarget?): 'normal' | 'big' |
  'apex'` next to `popModel.ts`, unit-testable headlessly. Provisional thresholds (Fable's, tune
  against fuzz traces and report): `big` = dayTotal ≥ 1.5× the day's goal target (or ≥ p75 of the
  run's prior days when no goal ladder), `apex` = dayTotal ≥ 2.5× the goal target OR ≥ 12
  ruleFires in one scoring — apex should land roughly once per 2–3 good runs, not once a day.
  Compute the observed apex frequency from 120-run fuzz traces and report it.
- **`big`:** existing cascade + one extra beat — warmer slot-pop scale, a brief gold wash on the
  day-total slam, the existing haptic ladder's top step.
- **`apex` (the full juice budget):** screen-edge glow build during the cascade, confetti/spark
  burst on the final slam, oversized day-total typography with the overshoot spring, a one-shot
  celebratory audio sting through the existing gateway (respecting audio prefs), strongest haptic.
  Duration budget: apex adds ≤ 1.5s over a normal cascade — spectacle, not delay.
- **Reduce-motion:** tier still computes; visuals snap per the existing R-28 convention (cadence
  and haptics unchanged, no flashing).

## Non-goals
No sim/scoring/trace changes; no economy numbers; no new trace event kinds; no changes to
`popModel` semantics; no always-on effects (normal cascades stay exactly as shipped).

## Acceptance criteria
1. `cascadeTier` unit tests: hand-built traces hit each tier; goal-ladder-less fallback covered;
   thresholds exported constants. Suite + typecheck green.
2. **Apex frequency evidence:** tier distribution across 120-run full-stack fuzz traces reported
   (target: apex in ~30–60% of RUNS, i.e. roughly one apex per 2–3 runs; big on ~1–2 days/run).
3. Normal-tier rendering byte-identical (no visual change on ordinary days — describe how you
   verified, e.g. tier gate short-circuits before any style branch).
4. Reduce-motion: apex snaps flat, haptics/cadence unchanged — simulator check described.
5. **A screen recording of one apex and one big cascade on the simulator**, attached/linked in
   the packet — the human accepts or rejects the feel; Fable only verifies the logic.

## Deliverable
`docs/review-packets/B-M6-cascade-spectacle-review.md`: built vs criteria, threshold rationale +
frequency table, commands + outputs, the recording, known issues, STOP line.
**STOP — Fable reviews logic; the human device gate owns the feel.**
