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
   run length [20,36]d, build swing [1.3,2.0]×.
   - **REOPENED 2026-07-13:** the harness had compared `allDepth` instead of the exact
     `graduating` set, used unpaired config seeds, and mixed starter/full item pools. Corrected
     like-for-like 80-run evidence is outside the approved ceiling in both cohorts: starter
     **2.635× greedy / 2.713× combo**; full **2.248× / 2.416×**. The report also prints per-seed
     paired median/p10/p90 ratios. See
     `review-packets/gameplay-intuitiveness-audit-2026-07-12.md`. Fable retune required;
     do not widen the band to make the gate green.
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
- Re-check title save hydration/retry/replacement and the four-row Daily Shop at 1.3× text after the
  final Fable retune. Normal-scale iPhone 16 Pro evidence is green on 2026-07-13.
- **B-M8 receipt visual close-out — GREEN 2026-07-13:** cascade beats now state source → affected
  item → delta → new total; the finished cascade exposes an inline scrollable receipt that replaces
  the shelf only after apex spectacle resolves. iPhone 16 Pro checks pass at normal settings and at
  130% text + high contrast + reduced motion. Recheck on the final retuned build, but no known layout
  or comprehension defect remains in this surface.
- **B-M7 shelf-access close-out — CODE GREEN / PHYSICAL VOICEOVER RECHECK 2026-07-13:** tapping or
  activating a shelf/tray item opens its exact rules, location, and value; non-sticky items then expose
  every legal empty slot as a labeled 44pt action. Drag remains unchanged. The inspector layout passes
  iPhone 16 Pro visual QA; run the actual VoiceOver focus/action sequence in this gate. Normal-mode
  secondary copy now measures 5.24:1 on the wall and 4.76:1 on parchment; high contrast remains AAA.
- **Feedback timing close-out — CODE GREEN / EARS-AND-HANDS RECHECK 2026-07-13:** placement impact and
  settled tick are separated, payout audio fires on terminal `dayTotal` (including Skip/replay), and
  rent thud follows the total on its own beat. The discovery cue still shares `cascade.mp3`; a dedicated
  warm-recognition asset remains required before B-M11 audio distinctness can pass.
- **Contextual first-run teaching — CODE GREEN / DEVICE RECHECK 2026-07-13:** the blocking all-systems
  welcome wall is replaced by short supplier, draft, place, and Open Shop notes beside the real action.
  Progress is monotonic and persisted, resumes at the correct verb, and can be skipped at any point.
  Supplier/draft content scrolls for large text. Recheck the complete fresh-run sequence at SE width
  and 130% text; changing the ten-choice supplier gate itself remains a Fable gameplay ruling.

Exit criteria: written yes/no per item; any REQUEST CHANGES loops back to Gate 1 scope
before Gate 3 recruiting starts.

## Gate 3 — External alpha (TestFlight, ~10 people × 3 days)

Bots have proven balance/determinism/liveness; they cannot prove placement feel,
scoring comprehension, intentional build formation, rent tension, or run-two desire.
This gate is now worth more than any further feature or fuzz.

Prep Claude can do BEFORE Gate 2 closes (parallel-safe):
- **Privacy-minimal alpha ruling (2026-07-13):** do not add a custom analytics or third-party crash
  SDK for ~10 testers. Gameplay/save state remains on-device. Apple says on-device-only processing is
  not App Privacy "collection"; verify the release archive's aggregated privacy report before upload.
- Use TestFlight's existing per-tester sessions/crashes and screenshot/comment feedback. Collect the
  four comprehension prompts and observed confusion through that explicit tester feedback, not silent
  free-text persistence in the app.
- Report-only sim support is ready in `decisionDepthProxies`: moves/sells/buys/rerolls/expansions,
  shelf saturation, item/combo presence, and observed supplier outcomes. These are descriptive bot
  proxies, not human-product gates.
- TestFlight checklist: privacy-policy URL, beta description, what-to-test text, feedback email,
  contact details, signing/build/version configuration, release-archive privacy report, then external
  TestFlight review. Email-invite the ten named testers; a public link adds no value at this scale.

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

1. Fable retune against the explicit starter/full cohort report; keep the [1.3,2.0]× band fixed.
2. Re-run goal-table validation, pins, fixtures, full suite, fuzz, and the paired 80-run balance gate.
3. Source/swap the external discovery jingle (Gate 1.5).
4. Human supplies privacy-policy URL, feedback email, signing access, and tester list.
5. → hand the retuned graduated build to the human for the single Gate-2 batch and TestFlight review.
