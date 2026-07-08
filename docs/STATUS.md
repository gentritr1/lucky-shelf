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

### 1. Fable (external sign-off authority — unavailable in-session; needs auth/return)
Start at **`docs/review-packets/FABLE-SIGNOFF-QUEUE.md`**. Outstanding:
- Sign-off on the 6 flagged phases (scoring-order CCRs, new rule kinds, additive contract fields incl.
  `loopV2?`), + the balance findings: **+0 sell-back** for tier-1 items, and the **loose economy**
  (earnings ~4–7× rent, data-backed).
- FYI: the `copiesNeighbor` trace fix (`97deee1`) — correctness only, no ruling needed.

### 2. Human / device (yours)
- **Device feel-gate to graduate the depth flags** — everything above is default-OFF; it needs your
  hands-on pass before the flags ship ON.
- **The economy is measurably too loose with all flags on** (Fable's tuning call, but a human/design
  decision on the target feel). Linked to the softlock (loose economy → shelf overflow).

### 3. The one thing that unblocks more automation — the "soft spot" target bands
The balance harness enforces "not too easy / not too hard" but can't invent the numbers. Fill in
**`docs/lane-a/balance-harness-brief.md` §6** (ideal run length, beginner survival %, near-death %, build
swing ×). Then flip the single skipped test (`balanceHarness.test.ts` `it.skip('TODO(fable)…')`) to active.
That's the concrete next code task once the numbers exist.

## Ground rules (don't relearn the scars)
- Depth features stay flag-gated; OFF path must stay byte-identical (pin + goldens).
- Balance numbers (rent curve, multipliers, item values) are **Fable's** — don't tune them unilaterally.
- Verify UI on the sim (seed + screenshot), not from code alone. Re-run a delegate's "all green" yourself.
- Model UI affordances and fuzz THOSE (`src/sim/uiAffordances.ts`) to catch screen-level dead-ends.

Deeper context: project memory in `~/.claude/projects/-Users-gentlegen-Desktop-lucky-shelf/memory/`
(`MEMORY.md` index) and `docs/review-packets/`, `docs/lane-a/`.
