# Lane A brief — automated balance & liveness harness

**Author:** Opus orchestrator, 2026-07-08. **Implementer:** Codex. **Reviewer/git:** Opus.
**Status:** ready to build EXCEPT the target bands in §6 (Fable/human input — do not invent them).

## 1. Context (self-sufficient — you have no access to the chat)

Lucky Shelf is a deterministic, headless-playable roguelike sim. The engine is pure
(`state → state`, `src/sim/engine.ts`), content is data (`src/items/items.json`, economy
constants in `src/sim/economy.ts`), and runs are replayable (scoring traces, `src/sim/fixtures`).
Depth features live behind default-OFF flags (LOOP_V2, SIGNATURE_ITEMS, TAG_SYNERGY, BUILD_STEERING,
GOAL_LADDER; SPOTLIGHT/DEMAND are default-ON consts).

A device play-test surfaced two gaps this harness must make impossible to ship again:

- **A full-shelf softlock** (fixed `06771cf`): drafting a delivery item onto a full shelf gave a held
  item that couldn't be placed, while `openShop` refuses to run while holding — and the Arrange screen
  exposed no escape. The engine kept `sellItem` legal, but the *screen* didn't show it. The existing
  fuzz (`scripts/fuzz.ts`, drives engine `legalActions`) can't see this class of bug — it just "sold"
  past it.
- **A loose economy with all flags on** (logged in `docs/review-packets/FABLE-SIGNOFF-QUEUE.md`):
  a competent bot earns ~4–7× the rent burden and survives ~30 days; money piles up (only sink is the
  12-slot shelf). A naive greedy, by contrast, dies at the first rent — a **skill cliff**.

**Already built (extend these, don't reinvent):**
- `src/sim/uiAffordances.ts` — a model of what each SCREEN exposes as actions (draft/arrange/restock),
  omitting `moveItem`. `isDeadEnd(state)` = non-terminal state with zero screen actions.
- `src/sim/liveness.test.ts` — fuzzes runs through ONLY `uiAffordances`, asserting no dead-end and no
  exposed-but-illegal action, across 4 flag configs. Proven to catch the softlock when the fix is reverted.
- `scripts/balance.ts` — greedy runs, prints money-on-hand-vs-rent surplus + survival. Its greedy is a
  naive FLOOR policy (understates competent play — see the skill-cliff caveat it prints).

## 2. Goal

1. **Make the liveness model authoritative (kill drift).** Today `uiAffordances` is a hand-maintained
   mirror of the screens; if a screen changes, the model silently rots. Refactor so the screens DERIVE
   their available actions from `uiAffordances` (or a shared source), so the model provably matches the UI.
   The liveness test then guards the real UI, not a copy.
2. **Economy-band harness.** A `scripts/balance.ts`-style tool + a test that measures, per flag config,
   across a FLOOR policy and a CEILING policy (reuse the `greedy`/`combo` strategy bots in
   `src/sim/bots.ts` for the ceiling): survival distribution, money-on-hand-vs-rent surplus by day, and
   near-death frequency (runs that come within one rent payment of dying). Assert these fall inside the
   **target bands from §6**; fail (or report, mode-flagged) when a change drifts out.
3. **Invariant/property tests** over fuzzed states: coins never negative; shelf item count ≤ capacity;
   `GameStateSchema` round-trips every reachable state; every catalog item is reachable in some offer.

## 3. Non-goals (do NOT do these)

- **Do not decide the target bands** (§6) — those are Fable/human taste. Leave them as named constants
  with a `TODO(fable)` and make the assertions read from them.
- **Do not change any economy number, item, rule, or gameplay** — this is measurement only. Determinism
  pin `8d48e1c5a6ad14c9` and the 6 M0 goldens/fixtures must stay byte-identical (OFF path).
- Do not add new depth features or flags.

## 4. Observable acceptance criteria

- `pnpm typecheck` + `pnpm test` green; determinism pin + M0 goldens unchanged.
- Reverting the softlock fix (held+full arrange exposes only `placeItem`) makes the liveness test FAIL at
  `arrange, held, empty=0` — i.e. the guard still bites after the refactor (this is the regression proof).
- Screens no longer hand-duplicate their action lists — grep shows draft/arrange/restock deriving from the
  shared affordance source; changing `uiAffordances` changes the screens.
- `node --import tsx scripts/balance.ts` prints floor AND ceiling survival + surplus tables per config.
- The band-assertion test fails when a target band is violated (prove by temporarily tightening a band).

## 5. Verification method (what the reviewer will run)

1. `pnpm test` green; `git diff` on `src/sim/rng.ts`/`economy.ts`/`items.json` is empty (no balance drift).
2. Revert `06771cf`'s Arrange sell branch in the shared affordance source → `pnpm exec vitest run
   src/sim/liveness.test.ts` FAILS with a dead-end at `arrange/held/empty=0`. Restore → passes.
3. Drive a real screen (Arrange, full shelf, held item) on the iOS sim and confirm its action set matches
   `uiAffordances` for that state (the refactor didn't change behavior — screenshot).
4. Temporarily set a target band to an impossible value → the band test fails with a clear message.

## 6. INPUT REQUIRED before build — the "soft spot" target bands (Fable/human)

These are the ONLY thing blocking build. They encode "not too easy, not too hard" as numbers. Rough
starting proposals (Fable/human to confirm or replace):
- **Ceiling (competent bot):** median run length ∈ **[TBD, e.g. 12–18] days**; money-on-hand never
  exceeds **~[TBD, e.g. 1.5]× the next rent** for more than K consecutive days.
- **Floor (naive bot):** should survive past the **first** rent (not die day 3) at least **[TBD]%** of runs
  — i.e. a beginner isn't wiped before they learn.
- **Tension:** a run should come within one rent payment of death in **[TBD, e.g. 25–40]%** of runs.
- **Build swing:** a run leaning into a synergy/signature should out-earn a no-build run by **[TBD]×** —
  builds should matter without dominating.

Until these are set, ship the harness with the bands as `TODO(fable)` constants and the band-test skipped
(`it.skip`) so it can't false-fail; flip to active once the numbers land.
