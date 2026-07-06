# AGENTS.md

## General Instructions

- Prefer simple, explicit code over speculative abstraction.
- Duplicate until patterns stabilize; abstract around proven reuse, domain meaning, or volatility.
- Optimize for local reasoning: clear names, explicit interfaces, cohesive functions, and tight invariants.
- Prioritize maintainability, correctness, and change safety over cleverness or terseness.
- Extract code when it improves comprehension, reuse, or correctness, not merely to reduce line count.
- Prefer explicit tradeoffs over hidden complexity.
- Start each response with `Neek,` so the human relay can tell these instructions were read. Do this once at the start of each new assistant response.

## Project Brief

- The kickoff brief lives at `docs/lucky-shelf-kickoff.md`.
- Treat that brief as the source of truth for game pillars, lane ownership, contract surfaces, milestones, and review packets.
- Contract changes, scoring-order changes, and item-table changes require Fable sign-off.
- Start from the kickoff brief when project context is missing. Do not rely on memory of prior threads.

## Codex Start Here

- Codex is Lane A unless the human relay explicitly assigns different work.
- First read `docs/lucky-shelf-kickoff.md`, then inspect the current repository before editing.
- When a lane-specific kickoff prompt exists for the current milestone, read and follow it after the kickoff brief and current Fable review packets.
- Current Lane A handoff is `docs/lane-a/m3-kickoff-prompt.md`:
  - Lane A goes first for M3 integration plumbing, then stops for Fable/Lane B review.
  - Start fresh M3 sessions by reading the files listed in that prompt, confirming understanding and ambiguities, then implementing within the stated boundaries.
- If no milestone kickoff prompt exists, fall back to the kickoff brief's next incomplete Lane A milestone and state assumptions before editing.
- When a milestone is complete, prepare a Review Packet using the format in the kickoff and stop for review.

## Lane Boundaries

- Codex / Lane A owns simulation, scoring, economy, persistence, item validation, replay, fixtures, fuzzing, and app scaffolding.
- Opus / Lane B owns design system, screens, Skia shelf scene, drag-and-drop feel, cascade animation, haptics, sound choreography, and presentation polish.
- Shared contract work belongs in `src/contracts` once the app is scaffolded. Keep shared types serializable and validated with zod.
- Do not edit files owned by the other lane unless the human relay or Fable explicitly asks for that cross-lane change.

## Intended Repository Structure

```text
docs/
  lucky-shelf-kickoff.md
src/
  contracts/    shared serializable types and zod schemas
  sim/          Lane A pure TypeScript simulation, scoring, economy, RNG, replay
  items/        Fable-authored item data and named combos, validated by Lane A
  persistence/  Lane A save/catalog storage and migrations
  app/          Lane A app shell, navigation, state wiring
  ui/           Lane B design system, screens, components
  juice/        Lane B Skia scenes, cascade animation, haptics, sound choreography
fixtures/       shared mock states, fixture runs, and golden scoring traces
```

## Product Direction Ledger

- Post-MVP differentiation ideas (deterministic-replay social artifacts, feel
  investment, content cadence, identity/language — S-1…S-17) live in
  `docs/product-moat-suggestions.md`. They are **suggestions, not commitments**.
- Fable skims that file at every milestone review and promotes at most 1–2 items;
  promoted items pass the same gates as core scope (fuzz for economy, feel bar for
  presentation).
- Milestone kickoff prompts for fresh lane sessions live under `docs/lane-a/` and
  `docs/lane-b/` (pattern: one per lane per milestone). Prefer the latest reviewed
  milestone prompt over older start-here text.

## Implementation Defaults

- Keep `src/sim` pure TypeScript with no React, React Native, Skia, or platform imports.
- UI code should mutate game state only through the contract action surface.
- Scoring explanations must be represented through `ScoringTrace`; if the UI cannot animate a scoring event from the trace, the trace contract is incomplete.
- Add focused tests around deterministic behavior, rule primitives, golden traces, persistence migrations, and cross-lane contract validation as those areas are implemented.
