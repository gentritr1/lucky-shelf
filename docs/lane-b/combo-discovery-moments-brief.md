# Lane B brief — B-M11: combo discovery moments (run AFTER B-M5 Parts 2–3 land)

**Author:** Fable, 2026-07-09. **Implementer:** Opus 4.8. **Sequencing:** hard AFTER B-M5
Parts 2–3 (both touch catalog surfaces) and coordinate with B-M9's screen list.
**Review:** Fable for the model; sound/motion feel joins the batched device gate.

## Context (self-sufficient)
Jury Prototype-Soon: "combo discovery moments: toast, stamp, short jingle, first-time slow-mo."
The trace emits `comboNamed{comboId, slots}` during scoring; the cascade player animates the
trace; the permanent catalog tracks `achievedComboIds` (all-time) and the run tracks
`catalogDelta.discoveredComboIds`. First-time-EVER = comboId ∉ catalog.achievedComboIds at run
start (the B-M4 pattern: snapshot the pre-run catalog state; `prevRunStats`/mount-snapshot
precedent in `summary.tsx`/`catalogStore`). Audio via the existing gateway + prefs; haptics via
`src/juice/haptics.ts`; reduce-motion per R-28 (cadence unchanged, visuals snap). B-M6's tier
rules still hold: apex owns the fireworks — a discovery moment must read as *warm recognition*,
not a second jackpot layer (anti-casino).

## Design (decided)
- **Pure model first** (`src/juice/discoveryModel.ts` or similar): given a trace + the pre-run
  achieved set, classify each `comboNamed` as `repeat | first-this-run | first-ever`, with the
  event index so presentation syncs to the existing cascade clock (no second clock).
- **Presentation budget:** `first-this-run` → small toast naming the combo (ink on paper chip);
  `first-ever` → toast + catalog stamp motif + one short jingle (gateway, prefs-gated) + a brief
  slow-beat on that combo's cascade step (~1.2× step duration, reduce-motion: no slow-beat).
  `repeat` → nothing new (the cascade already shows the combo). No coins language, no confetti
  (that's apex's).
- Catalog album: the stamp on a newly-achieved combo card gets a subtle "new" accent until
  first viewed (view-model flag; no new persistence — derive from the last run's
  `catalogDelta` while that run is the latest, or drop the accent if it needs persistence —
  state which you chose).

## Non-goals
No sim/trace changes; no new persisted fields (escalate rather than add); no changes to apex/
big tiers; no push notifications; no changes to combo definitions.

## Acceptance
1. Model unit tests: repeat/first-run/first-ever classification incl. the pre-run snapshot edge
   (combo achieved earlier in the SAME run counts as repeat on its second fire); golden traces
   classify stably.
2. Slow-beat is implemented as a step-duration multiplier in the existing player (show the
   diff is confined to timing), reduce-motion path proven unchanged in cadence.
3. Suite + tsc green; boundary/token/gateway greps clean.
4. Deferred device recording listed: one first-ever discovery moment, normal + reduce-motion.

## Deliverable
`docs/review-packets/B-M11-discovery-moments-review.md`, usual form. **STOP — Fable reviews.**
