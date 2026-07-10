# RELEASE PLAN — five gates to ship

_Adopted 2026-07-10 from the impeccable critique (30/40, archived at
`.impeccable/critique/2026-07-10T21-41-30Z__src-app.md`). This is now the operational
"what must happen before release" view. Milestone IDs (A-M*, B-M*, rounds) remain as
implementation references only — do not add new top-level milestone lines to STATUS;
add items under a gate here._

**Standing decision: feature freeze.** No new mechanics until Gate 3 produces human
evidence. New-feature candidates live in the Backlog at the bottom and get picked from
observed player behavior, not from taste.

**Sequencing note (2026-07-10, human ruling):** the manual device gate (Gate 2) is
deliberately deferred — all Claude-executable Gate 1 + Gate 3-prep work runs first, so
the human's device window lands once, against the final graduating build, instead of
piecemeal.

---

## Gate 1 — Depth graduation (owner: Claude/Fable; runs now)

Choose and flip ONE coherent default configuration. Candidate graduating set (defaults
in `src/sim/economy.ts`):

| Flag | Ships |
|---|---|
| LOOP_V2_ENABLED | ON |
| TAG_SYNERGY_ENABLED | ON |
| BUILD_STEERING_ENABLED | ON |
| SIGNATURE_ITEMS_ENABLED | ON |
| GOAL_LADDER_ENABLED | ON |
| SHELF_EXPANSION_ENABLED | ON |
| UNLOCK_LADDER_ENABLED | ON |
| DAY2_STARTER_ENABLED | ON |
| SPOTLIGHT / DEMAND | already ON |
| WARM_OPENING_ENABLED | stays OFF — superseded by day-2 starter (A-M6c ruling) |

Prerequisites before the flip (each has a named verification):
1. **Goal-table retune vs the FINAL set above** — the tune-vs-stack scar has fired 4×;
   the retune must name its measurement script and land a fresh 400-run fuzz with every
   day in the 65–85% band. (Last known state: 16 slots push days 9–12 to ~0.85, band top.)
2. **`pnpm balance:assert` green under the final set** — guardrail bands hold: ceiling
   run length [24,36]d, build swing [1.3,2.0]×.
3. **Determinism story split:** OFF-path pin `8d48e1c5a6ad14c9` + M0 goldens stay green
   (flags remain in code as the regression floor); mint new ON-path goldens for the
   shipping config so graduation itself gets a pin.
4. **Summary copy conflict fix** (`src/app/summary.tsx:125` vs `:151`): "RENT MISSED"
   header can co-exist with "Paid rent with N coins to spare". Relabel the near-miss
   stat "Closest rent payment: N coins to spare" (or name the cycle/day). While there,
   check the summary tells ONE story: why the run ended → what build emerged → decisive
   scoring moment → what almost worked → reason to run again.
5. **Bespoke discovery jingle** — EXTERNAL ASSET DEPENDENCY (checked 2026-07-10:
   available audio-generation tools are speech-only; SFX models pipeline-restricted).
   Needs a sourced ~1–2s "warm recognition" chime — soft mallet/celesta rising motif,
   cozy general-store register, deliberately NOT a jackpot sting — from an SFX library
   or the pipeline that made the existing four mp3s. Swap point is one constant:
   `DISCOVERY_JINGLE_SOURCE` in `src/juice/audio.ts` → `assets/audio/discovery.mp3`.
   Audibility + distinctness confirmation is a Gate 2 item.

Exit criteria: default build = full depth stack; 291+ tests green; OFF-path pin green;
new ON-path goldens committed; balance:assert green; STATUS updated.

## Gate 2 — Device feel gate (owner: human; deferred, runs once against the Gate-1 build)

Consolidated single batch (supersedes the round-6 6-item list — re-run those items on
the graduated build, not the flag-off one):
- B-M9 theme migration: 1.3× textScale + high-contrast screenshots across screens.
- B-M11 discovery moments: cascade toast/stamp/jingle recordings; jingle-vs-jackpot
  distinctness check (needs the Gate-1 bespoke asset).
- B-M7 polish eyeball: ✓/✕ drop cue + spotlight pill.
- B-M6 apex/big cascade recording (one-tap `/cascade-harness` demos).
- B-M5 streak screenshots (seed recipe in packet).
- 4×4 (16-slot) shelf rendering — the open A-M6a Lane B gate.
- Drag feel / Velvet Snap pass, cascade sound, overall feel of the graduated economy
  (rent tension: the loose-economy signal from feel-gate round 2 should now be judged
  against the tightened v2 numbers).
- Re-shoot any archived summary screenshots with black regions — current visual
  sign-off evidence is unreliable (critique finding).

Exit criteria: written yes/no per item; any REQUEST CHANGES loops back to Gate 1 scope
before Gate 3 recruiting starts.

## Gate 3 — External alpha (TestFlight, ~10 people × 3 days)

Bots have proven balance/determinism/liveness; they cannot prove placement feel,
scoring comprehension, intentional build formation, rent tension, or run-two desire.
This gate is now worth more than any further feature or fuzz.

Prep Claude can do BEFORE Gate 2 closes (parallel-safe):
- Define + instrument the metrics: first-rent survival, run-two conversion, D1/D3
  return, a comprehension proxy (e.g. post-run "why did you score?" prompt), session
  length. Local analytics only — check store/privacy constraints first (real-world-
  constraints scar).
- Feedback capture: in-build prompt or linked form; crash reporting wired.
- TestFlight build checklist (certs, build config, versioning).

Human-owned: TestFlight submission (outward-facing), recruiting the ~10 players.

Exit criteria: data on the five human questions above, plus a raw list of observed
confusions.

## Gate 4 — Evidence-led tuning (owner: Claude/Fable, from Gate-3 data only)

- Onboarding/help (critique's 2/4) designed from *observed* confusion, not speculation.
- Documented unpulled lever: welcome-week rent (A-M6c ruling) — pull only if real
  humans bounce off rent 1. The [40,70]% first-rent aspiration re-anchors here.
- Comprehension fixes for whatever the "why did I score?" data shows.
- Re-run balance bands after any tuning.

Exit criteria: each Gate-3 confusion either fixed (with a re-test) or explicitly
accepted with a reason.

## Gate 5 — Release candidate (owner: mixed)

- Onboarding final; daily mode surfaced; store assets (screenshots, copy, icon);
  crash/perf verification on device; store-policy + regional constraints re-check
  (the AdMob-Kosovo class — verify at start of this gate, not mid-submission).

---

## Backlog — post-Gate-3, chosen from observed behavior

Critique priority (reinforces the deterministic-trace moat; adopt only after alpha
data says players want the corresponding loop):
1. **Shelf ghosts** — replay a friend's/previous run as translucent placements (P3 in
   STATUS §3 already promotes daily seed + ghosts).
2. **Combo cinema** — save a strong cascade as a replayable artifact (shelf + trace +
   seed + build name).
3. **Daily spatial constraints** — damaged slot, narrow shelf, inherited item,
   reversed-scoring section.
4. Curator contracts (deterministic challenges; variety/cosmetic rewards, never power).
5. Item relationships remembered across a run (deterministic + spatial, no XP).
6. Verified asynchronous duels (same seed, compare action logs).
7. One-placement rewind (summary shows the highest-impact placement + one legal
   alternative preview).

Direction encoded here (overridable): solo spatial depth ships first; social
deterministic play (ghosts/duels) is the first post-alpha investment, not a parallel
track.

---

## Immediate queue (Claude-executable, in order)

1. Summary rent-copy fix + one-story summary audit (Gate 1.4).
2. Goal-table retune vs the final flag set + 400-run fuzz + balance:assert (Gate 1.1–1.2).
3. ON-path goldens + graduation flip on a branch (Gate 1.3).
4. Discovery-jingle candidates (Gate 1.5).
5. Gate-3 instrumentation + feedback prep (parallel-safe).
6. → hand the graduated build to the human for the single Gate-2 batch.
