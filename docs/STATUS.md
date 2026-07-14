# STATUS — start here (new thread)

## 2026-07-14 — graduation-flip MERGED TO MAIN (human ruling) and pushed

The human ruled the merge after a day of hands-on device sessions that effectively served as the
Gate-2 pass ("push to main — we have a lot"). Main now ships: the graduated depth defaults, the
Gate-1.2 retuned economy (swing 1.62–1.92× in band), the intuitiveness pass, B-M13–16 polish
rounds, the Picture Gallery (flag ON, human-tested), the Collector's Journal catalog, and the
human's Suno audio set (discovery jingle closes the B-M11 gate; gameplay is SFX-only by human
ruling — music re-enters solely as the rent-eve signal). Merge verified: tsc clean, fixtures 7/7,
418/418 serial, both determinism pins green (v1 frozen `8d48e1c5a6ad14c9`, graduating
`1adfc85f256b8512`). Remaining externals: physical VoiceOver pass, TestFlight inputs (privacy URL,
feedback email, signing, testers) — see the audit packet §7 for the alpha runbook.

## 2026-07-13 gameplay/intuitiveness audit — Gate 1.2 reopened

The end-to-end audit and research packet is
[`review-packets/gameplay-intuitiveness-audit-2026-07-12.md`](review-packets/gameplay-intuitiveness-audit-2026-07-12.md).

- Decision-time and shelf-item rule prose, tap/VoiceOver shelf movement, synchronized
  source→affected-item scoring captions, a reviewable scoring receipt, ordered autosaves,
  save-failure retry, load-generation protection, truthful Continue state, active-run replacement
  confirmation, progressive first-run action hints, canonical liveness coverage, and report-only
  decision-depth proxies are implemented locally on `graduation-flip`.
- TypeScript is clean; the full serial suite is **373/373** and all seven fixtures validate.
- Current branch rebuilt and rendered on an iPhone 16 Pro / iOS 18.6 simulator. The title hydrates
  its save state correctly; all four Daily Shop rows fit complete rule prose plus tags without clipping;
  the apex cascade caption and full receipt pass normal, 130% text, high-contrast, and reduced-motion QA;
  the inline shelf inspector fits exact rule prose, slot, value, movement hint, and a 44pt close target.
- **Gate 1.2 REOPENED then CLOSED (2026-07-13, Fable):** the corrected like-for-like gate failed all
  four ceiling arms (2.248–2.713× vs approved **[1.3×, 2.0×]**). Fable ruled the retune (brief
  `lane-a/economy-retune-gate12-brief.md`), Opus 4.8 implemented, Fable independently re-ran every
  acceptance command: **TAG_SYNERGY_LADDER trimmed 1.2/1.4/1.6/1.8 → 1.15/1.22/1.26/1.30** (only
  lever needed), `GOAL_LADDER_TARGETS` re-derived + validated out-of-sample (all days 0.685–0.796,
  band [0.65, 0.85]). All four arms now **1.616–1.92×**, run-length medians 27d, v1 pin untouched,
  graduating pin → `1adfc85f256b8512`, 373/373 green. Evidence:
  [`review-packets/GATE12-economy-retune-2026-07-13.md`](review-packets/GATE12-economy-retune-2026-07-13.md).
  Side-finding: graduating starter-cohort FLOOR first-rent survival now reads **43.8%** — inside the
  aspirational [40, 70] band for the first time (report-only).

The release feature freeze still stands. External-alpha prep deliberately adds no custom telemetry or
third-party crash SDK: local saves are on-device, while TestFlight supplies sessions, crashes,
screenshots, and comments. Privacy policy hosting, feedback email, signing roles, and external-tester
submission remain human-owned. Physical VoiceOver/onboarding validation and the dedicated
discovery-jingle asset remain Lane B/human work described in the packet.
Both open Fable decisions are now ruled (2026-07-13): the economy retune landed (Gate 1.2 above), and
the ten-archetype opening supplier pick stays **unchanged, evidence-gated** — alpha must measure
hesitation; a curated-trio fallback is pre-committed in
`review-packets/FABLE-RULING-2026-07-13-supplier-opening.md` but must not ship without that evidence.
Payout, placement-settle, and rent-consequence cue timing is now event-aligned in code.

_Last updated 2026-07-10 (Fable session). `main` = round-6 head, pushed to origin, tree clean, all green (289 tests)._

## Where the project is
Post-M3, with the **loop-redesign v2** depth features built and legible but **still behind default-OFF
flags** (LOOP_V2, SIGNATURE_ITEMS, TAG_SYNERGY, BUILD_STEERING, GOAL_LADDER; SPOTLIGHT/DEMAND are
default-ON consts). Nothing has graduated. The shipping default is byte-identical to pre-v2:
**determinism pin `8d48e1c5a6ad14c9`, 6 M0 goldens, 6 M0 fixtures — the graduation floor; keep it.**

Verification reality: gameplay screens are drag-gated, so verify on the **iOS simulator** via the
simctl-seed technique (see memory `ios-ui-verify-on-simulator`), not web/preview. Toolchain to build/run
here: `nvm use 23.3.0` + `NODE_OPTIONS=--experimental-sqlite` for pnpm; UTF-8 locale + Homebrew pod 1.16.2
+ `unset NODE_OPTIONS` for `expo run:ios` (see memory `device-feel-gate-round1`).

## What this session shipped (all on main, all device-verified)
- **Loop-mode pin** (`ab83c8d`) + **share-as-image** (`c2dbd26`).
- **UI legibility / signposting (#5, complete):** store view-model boundary (`5fe4bd6`), build-identity HUD
  panel (`0e2e772`), signature shop badges (`88e51c7`), Daily Shop identity (`4417089`), supplier archetype
  cards (`da63285`), target-hit cascade celebration (`8b66038`). Shared `tagEmoji`/`buildAccents` tokens.
- **Nav fix** (`4bc0ffb`): gameplay "‹ Menu" goes home, no GO_BACK dead-end.
- **Signature art (#7)** (`1b3be87`): real sprites for the 5 signature items (recipe in
  `sprite-generation-pipeline` memory).
- **Softlock fix** (`06771cf`): full shelf + held item now shows "sell to make room".
- **Automated gap/balance harness:** liveness fuzz (`de056fa`, `b2f2cce`) — `uiAffordances` is now the
  authoritative screen-action source, and a fuzz asserts no screen can dead-end the player; economy-band +
  invariant harness (`b2f2cce`); balance report script `scripts/balance.ts`. A trace-contract bug the
  invariant test caught is fixed in `97deee1`.

## What's next — see **[RELEASE-PLAN.md](RELEASE-PLAN.md)** (adopted 2026-07-10)
The five-gate release plan is now the operational roadmap: Gate 1 depth graduation
(Claude, runs now) → Gate 2 device batch (human, deliberately deferred) → Gate 3
external alpha → Gate 4 evidence-led tuning → Gate 5 RC. Feature freeze until Gate 3
data exists. The sections below remain as historical/implementation reference.

### Gate 1 progress (2026-07-10/11 session)
- **1.1 Goal-table retune vs the TRUE graduating set — DONE.** The threshold scar fired a
  5th time: the 07-08 table was tuned vs `allDepth`, which lacks expansion/unlocks/starter —
  under the real set, hit rates were 0.95–0.99 (band 0.65–0.85). New `graduating` config in
  `BALANCE_FLAG_CONFIGS`; new measurement script **`scripts/goal-tune.ts`** (pooled ceiling-bot
  p25 → candidate table + predicted rates). New 12-entry `GOAL_LADDER_TARGETS`
  [18,44,68,92,106,112,114,116,148,152,166,172] validated OUT-OF-SAMPLE (seed
  `graduation-0710-v2`, 400 runs): every day both strategies 0.71–0.82, all in band;
  survival median 30d unchanged.
- **1.4 Summary copy conflict — DONE** (B-M12, Opus, brief in
  `lane-b/summary-one-story-brief.md`): near-miss line now "Closest rent payment: N coins
  to spare"; render order already matched the one-story spine. 291/291 + tsc re-run by Fable.
- **1.5 Discovery jingle — BLOCKED EXTERNAL:** available audio tools are speech-only; asset
  must be sourced (see RELEASE-PLAN Gate 1.5 for the sound spec + swap point).
- **1.3 Flip + pins — DONE on branch `graduation-flip` (`49ad41c`), NOT merged.** Merge gate =
  the Gate 2 device pass. Sequence that landed: (a) two-way env semantics on main (`df1423b`,
  '0' forces OFF; harness pins absent keys '0' — byte-identical, 291/291 + pin re-run); (b) the
  8-flag const flip on the branch. The flip exposed THREE ambient-read save-safety leaks
  (caught by the m0-wine-dine-combo golden): synergy + signature scoring and the signature
  offer-pool filter would have leaked into v1 saves — all three now gate on the run's
  `state.loopV2` snapshot. Tests migrated to `testkit.withFlagWorld` (every flag-sensitive
  suite pins its full 9-key world explicitly). **Two determinism pins now:** frozen v1
  `8d48e1c5a6ad14c9` (re-verified under an explicit all-OFF world) + graduating
  `4d5b9f57ba63b916` (shipping defaults). Branch verification: 292/292, tsc clean, fixtures
  valid, no-env fuzz = exact graduating set, balance:assert green with numbers identical to
  the pre-flip env-forced run. Accepted quirk: a day-1 pre-action v1 save sees the supplier
  choice post-update (build steering's createRun gate is ambient by design). Graduation splits
  daily-shelf comparability across app versions (inherent; acceptable).

## Historical detail by owner (superseded as a roadmap by RELEASE-PLAN.md)

### 1. Fable — ✅ DONE (2026-07-08 pass, in-session)
Authoritative rulings recorded in **`docs/review-packets/FABLE-RULINGS-2026-07-08.md`**:
- All 6 phases ruled: levers/P1/2a/2b/2c **APPROVED** (every open CCR question answered);
  goal-ladder **CCR approved, target table REQUEST CHANGES** — under the full flag stack the
  days-9–12 hit rate is 0.89–0.93, out of the 65–85% band (verified by a fresh 120-run fuzz,
  seed `fable-signoff-0708`).
- Balance ruled AND **the economy pass is now implemented + verified** (see the implementation
  record at the bottom of the rulings doc): v2 rent 1.75 from cycle 4 (ceiling 30d→27d), v2 sell
  floor 1, goal table re-tuned vs the full stack (400-run fuzz: every day 0.67–0.82, in band),
  guardrail band re-set 24→20 min, `balance:assert` green, 118/118 tests, OFF path byte-identical.
  Bonus: fixed a **save-corrupting buyout+reroll bug** (duplicate instanceIds; latent in v1 too;
  regression test added; determinism pin untouched — pinned runs never reroll).
- **Delegated round DONE and reviewed (2026-07-08, late).** All three landed behind default-OFF
  flags, all reviewed by Fable with independent re-runs (verdict files in `review-packets/`):
  - **A-M6a shelf expansion (Codex) — APPROVED.** The coin sink works: day-12 surplus 7.3×→3.2×
    on Fable's own seed; uptake ~0.9. Graduation gates: goal-table retune vs the FINAL flag set
    (16 slots push days-9–12 hit to ~0.85, band top — third firing of the tune-vs-stack scar),
    equal-n signature re-probe with expansion ON, and Lane B 4-row rendering.
  - **B-M4 summary v2 (Opus 4.8) — APPROVED**, device-polished. The review also surfaced and
    fixed a **pre-existing P0: `recordRunEnd` merged into a never-loaded catalog and saved it,
    wiping every prior discovery/best** for players who didn't open the Catalog screen that
    session. Load-guarded + boot hydration + runId-keyed pre-merge stash; regression tests in
    `src/state/catalogStore.test.ts`.
  - **A-M6b warm opening (Codex) — landed; floor acceptance NOT met.** Fable's flat-4 brief spec
    was unsatisfiable on day 2 (min price 8); ruled a day-aware ceiling (4/10) + cheapest-first
    replacement (protects premium stock). Even fixed, offer composition lifts the floor only
    ~1.25× (loopV2 10→12.5%, allDepth 16.3→20%). Human chose the free day-2 starter.
  - **A-M6c day-2 starter (Codex) — APPROVED, and the beginner-floor chase is CLOSED**
    ([A-M6c-fable-review](review-packets/A-M6c-fable-review.md)). Combined floor lands at
    ~20–27.5% by seed (~2× baseline) — reliably below the 0.30 target, and the bottleneck is now
    the floor-bot proxy (never rearranges/synergizes), not the economy. Ruling: the [40,70]%
    aspiration re-anchors to the **P2 real-playtest milestone** (§3 below); welcome-week rent is
    the one documented unpulled lever, only if real humans bounce off rent 1. No further
    beginner-floor briefs until playtest data exists.
- **Round 3 (pre-test content) DONE and reviewed** (verdicts in `review-packets/*-fable-review.md`):
  **A-M7 unlock ladder APPROVED** (predicates over existing stats, replay-integrity snapshot;
  hard graduation gate ruled: daily seeds must pin a canonical pool before the flag ships ON, or
  personal unlocks break "same shelf worldwide"); **B-M5 Part 1 daily streak APPROVED** (the
  cold-relaunch streak-reset was caught by the recorded scar — load-guarded + regression-tested;
  Parts 2–3 now unblocked by A-M7); **B-M6 cascade spectacle logic APPROVED** with the apex
  frequency ruled rare-and-special (~once per 2 runs) — thresholds retuned against measured
  percentiles after the brief's constants failed live curves a FOURTH time (rule promoted: no
  brief threshold without a measurement script). **Two human gates open: the B-M6 apex/big
  recording (one-tap /cascade-harness demos) and the B-M5 streak screenshots (seed recipe in
  packet).**
- **Product direction adopted (agent jury + `PRODUCT.md`, 2026-07-08):** depth-not-breadth —
  trace readability as the signature UX, tactile placement, accessibility floor, anti-casino
  identity, variety-not-power unlocks. Fable's reading: the verdict changes **gate order, not
  the codebase** — the flagged v2 stack stays; readability/feel work graduates first. The quiet
  ≥2 streak stays (no pressure mechanics ever — playtest arbitrates). A-M7's daily
  canonical-pool graduation gate is now **CLOSED** (`ef1efae`). Round-4 briefs from the
  Promote-Now list: [B-M7 accessibility floor](lane-b/accessibility-floor-brief.md) and
  [B-M8 receipt cascade + cause-effect grammar](lane-b/receipt-cascade-brief.md) (both Opus 4.8,
  headless cores now, device shots batched for later). Velvet Snap drag feel waits for the
  human's device-iteration window. **Lane A round 4 (Codex, sequential):**
  [A-M8 placement-hint model](lane-a/placement-hints-brief.md) — the mockup's "ghost preview"
  under Fable's ruling (qualitative, discovered-rules-only, no numbers; pure leaf module, no
  sim-side flag) — then
  [A-M6a-G2 dominance re-probe](lane-a/signature-dominance-expansion-reprobe-brief.md)
  (equal-n signature measurement on 4×4 boards; lands a permanent probe script so the gate is
  cheap to re-run at every graduating-set change).
- **Round 4 Lane B REVIEWED + landed (2026-07-09):** **B-M8 receipt model APPROVED** (`7a19976`
  — grammar structurally enforced, golden-trace snapshots as regression fixtures, row-aura
  attribution solved in-model without touching the trace; UI surface + look = next Lane B step,
  device-gated) and **B-M7 accessibility floor APPROVED** (`a66f80d` — the audit found usePrefs
  NEVER persisted, incl. reduce-motion; fixed load-test-first; textScale/HC funnels central and
  byte-identical at defaults). B-M7's escalated architecture call ruled: staged wiring approved,
  the static-StyleSheet conversion is now
  [B-M9 runtime-theme migration](lane-b/runtime-theme-migration-brief.md) (mechanical, one
  screen per commit, byte-identical at default prefs). **Lane B queue for the freed sessions:
  B-M5 Parts 2–3 (silhouettes + next-unlock teaser — collision with B-M7's sweep now cleared),
  then B-M9.** A-M8 placement hints is mid-flight in the tree (Codex — do not touch
  src/sim/placementHints*).
- **Round 5 REVIEWED + landed (2026-07-09, `695049f`)** — consolidated verdicts in
  [FABLE-REVIEWS-2026-07-09-round5](review-packets/FABLE-REVIEWS-2026-07-09-round5.md):
  **A-M8 placement-hint model APPROVED** (1.0ms bench; UI surface blocked on run.tsx WIP +
  device window); **A-M6a-G2 dominance GATE PASS** (equal-n 1.58–1.60 < 2, reviewer-reproduced;
  lucky-cat×spotlight resolved at 0.98 — off the eyeball list; consignment-sign watch flag if
  shelf ever >16 slots); **B-M10 share polish APPROVED** (stable seed codec, honest closing-day
  receipt card); **B-M5 P2–3 APPROVED** (silhouettes locked≠undiscovered, live-catalog teaser).
  **Lane B queue now: B-M9 (alone — it sweeps screens) → B-M11 (gate met).** Lane A idle until
  the graduating-set retune (needs your feel-gate) or the placement-hint UI (needs run.tsx).
- FYI items (`loopV2?` snapshot, `copiesNeighbor` fix) acknowledged, no ruling needed.
- **Round 6 REVIEWED + landed (2026-07-10)** — verdicts in
  [FABLE-REVIEWS-2026-07-10-round6](review-packets/FABLE-REVIEWS-2026-07-10-round6.md):
  **B-M9 runtime-theme migration APPROVED** (9 screens → `useThemedStyles`/`usePalette`
  factories, per-screen byte-identity equality tests, transcription independence
  spot-verified against pre-migration source; `run.tsx` = the ONE remaining static screen,
  migrate after the human WIP window; ShelfScene Skia = known limit) and **B-M11 combo
  discovery moments APPROVED** (pure classifier + timing-only slow-beat, reduced-motion
  cadence byte-identical by test; catalog "new" accent in-memory, no persistence;
  "until-first-viewed" fade dropped per brief fallback — ruled correct). Also landed:
  `1dba09e` B-M7 polish (✓/✕ drop cue + spotlight pill fix). **Open items:** bespoke
  discovery-jingle mp3 (placeholder = cascade sting, muddies recognition-vs-jackpot —
  required before feel-complete); 6-item batched device gate consolidated in the round-6 doc
  (B-M9 1.3×/HC shots, B-M11 recordings, B-M7 polish eyeball). **run.tsx migration landed**
  (`cdba62a`, Fable-implemented after the WIP window closed — src/app grep now fully clean, zero
  static themed sheets; equality test + 291/291 green; ShelfScene Skia = the only remaining theme
  gap). **Lane B queue: empty** — next Lane B work is the device-gate batch (human).

### 2. Human / device (yours)
- **Device feel-gate to graduate the depth flags** — everything above is default-OFF; it needs your
  hands-on pass before the flags ship ON.
- **The economy is measurably too loose with all flags on** — Fable has now ruled the tuning
  direction (see rulings doc §8); the target *feel* remains your call and final acceptance is your
  device gate. Linked to the softlock (loose economy → shelf overflow).

### 3. Strategic gaps promoted 2026-07-08 — see `docs/state-of-game-review-2026-07-08.md`
Whole-game review found two gaps in no plan anywhere + two promotions. Priority order (none block
the current critical path of day-2 starter + device feel-gate):
- **P1 Unlock ladder** — **brief WRITTEN and delegated** ([A-M7](lane-a/unlock-ladder-brief.md),
  Codex): predicates read existing catalog stats (zero new persisted fields → zero wipe risk);
  replay integrity via an additive `GameState.unlockedItemIds?` snapshot at createRun. Companion
  Lane B briefs for the pre-test content push: [B-M5 retention surfaces](lane-b/retention-surfaces-brief.md)
  (daily streak now; silhouettes + next-unlock teaser after A-M7) and
  [B-M6 cascade spectacle](lane-b/cascade-spectacle-brief.md) (P4, parallel-safe, recording-gated)
  — both Opus 4.8.
- **P2 Real-playtest milestone** (TestFlight ~10 people × 3 days, after flags graduate) — all
  balance evidence so far is bot-derived, and bots understate intent mechanics (recorded scar).
- **P3 Daily seed + ghosts** (S-3 promoted from the moat ledger) — flagship post-graduation
  feature on the trace moat.
- **P4 "Spectacle without swing" principle** — economic bands stay gentle (Fable's), top cascade
  tier gets the full juice budget. Applies to all future feel work.

### 4. The "soft spot" target bands — DONE (guardrail set 2026-07-08)
The §6 bands are now set on a **guardrail** basis (bracket current reality; catch future drift; don't
tighten the economy). See memory `balance-target-bands`.
- **Active/asserted:** ceiling run length `[24,36]d`, build swing `[1.3,2.0]×`.
- **Deferred to Fable (null):** surplus ratio + consecutive-days (a guardrail there would bless the loose
  5–7× economy), near-death tension (taste).
- **Aspirational, non-blocking:** beginner first-rent survival `[40,70]%` (reality ~16–21% → reported, not
  asserted; needs Fable to ease the opening).
- Enforcement: `pnpm balance:assert` (full 80-run, wired into `m1`) is authoritative — build swing is only
  stable at that report, so it can't live in the unit suite. The unit test (now active, no more `it.skip`)
  checks run-length + build-swing band logic cheaply. Also fixed a degenerate `nearDeath()` metric
  (read 100% for everyone; now discriminates). Not committed yet.

## Ground rules (don't relearn the scars)
- Depth features stay flag-gated; OFF path must stay byte-identical (pin + goldens).
- Balance numbers (rent curve, multipliers, item values) are **Fable's** — don't tune them unilaterally.
- Verify UI on the sim (seed + screenshot), not from code alone. Re-run a delegate's "all green" yourself.
- Model UI affordances and fuzz THOSE (`src/sim/uiAffordances.ts`) to catch screen-level dead-ends.

Deeper context: project memory in `~/.claude/projects/-Users-gentlegen-Desktop-lucky-shelf/memory/`
(`MEMORY.md` index) and `docs/review-packets/`, `docs/lane-a/`.
