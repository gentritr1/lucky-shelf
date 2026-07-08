# STATUS — start here (new thread)

_Last updated 2026-07-08 (Opus session). `main` = `b2f2cce`, pushed to origin, tree clean, all green._

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

## What's next — ordered by owner (nothing below is blocked on code I can just write)

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
    ~1.25× (loopV2 10→12.5%, allDepth 16.3→20%). **The remaining beginner-floor gap is a design
    decision for you** — options: free day-2 starter delivery, welcome-week first rent, or accept
    the cliff. Fable recommends the free day-2 starter as the next iteration if you want the
    40–70% aspiration.
- FYI items (`loopV2?` snapshot, `copiesNeighbor` fix) acknowledged, no ruling needed.

### 2. Human / device (yours)
- **Device feel-gate to graduate the depth flags** — everything above is default-OFF; it needs your
  hands-on pass before the flags ship ON.
- **The economy is measurably too loose with all flags on** — Fable has now ruled the tuning
  direction (see rulings doc §8); the target *feel* remains your call and final acceptance is your
  device gate. Linked to the softlock (loose economy → shelf overflow).

### 3. The "soft spot" target bands — DONE (guardrail set 2026-07-08)
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
