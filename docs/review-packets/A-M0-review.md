# A-M0 Review Packet

## 1. Built vs. Milestone Criteria

- Repo seed: `AGENTS.md`, kickoff brief, intended source folders, fixture folder, package manager lockfile.
- Expo boot: Expo SDK 57 app shell in `src/app`, portrait app config, Expo Router entry, strict TypeScript.
- Contracts: `src/contracts/index.ts` defines zod schemas and TypeScript types for `GameState`, `Action`, `ScoringTrace`, item definitions, item rules, and fixture payloads.
- Fixtures: `fixtures/m0-fixtures.json` contains six fixture GameStates and six hand-written golden ScoringTraces.
- Persistence choice: documented AsyncStorage choice in `src/persistence/README.md`.
- Notes/ambiguities: documented in `docs/lane-a-m0-notes.md`.

## 2. Exact Commands

```bash
pnpm install
pnpm m0
pnpm exec expo --version
pnpm exec expo config --type public
```

## 3. Verification Output

`pnpm m0`:

```text
$ pnpm typecheck && pnpm fixtures:validate && pnpm test
$ tsc --noEmit
$ node --import tsx scripts/validate-fixtures.ts
m0-basic-wine-cheese: 6 trace events
m0-wine-dine-combo: 13 trace events
m0-mirror-copy: 6 trace events
m0-shop-cat-row-aura: 8 trace events
m0-scores-last-clock: 5 trace events
m0-bamboo-transform: 6 trace events
Validated 6 M0 fixtures.
$ vitest run

 Test Files  1 passed (1)
      Tests  4 passed (4)
```

Expo:

```text
pnpm exec expo --version
57.0.4
```

`pnpm exec expo config --type public` resolves the app as `Lucky Shelf`, slug `lucky-shelf`, orientation `portrait`, SDK `57.0.0`, platforms `ios`, `android`, `web`.

## 4. Known Issues + Spec Deviations

- Fable has not signed the contract freeze yet.
- M0 does not implement the sim engine, dispatcher, persistence adapter, or actual scoring; fixtures are hand-written by design.
- The Expo starter was scaffolded manually because `create-expo-app` required an unavailable `npm` binary in this environment.
- Dependency install initially hit registry timeouts; rerun completed and the lockfile is present.
- `pnpm-workspace.yaml` explicitly allows the `esbuild` build script because Vitest/Vite need its native binary.

## 5. Questions For Fable

- Should row/column auras include the source item by default?
- Should named combos ever award coins, or are they catalog-only in MVP?
- Should `blocksSlot` prevent scoring, movement, placement only, or all three unless overridden?
- Should `transformsAdjacent` target a concrete item id, a tier upgrade, or both?
- Does `Honey Jar` sticky apply before the next arrange phase or immediately during the current day?

## 6. Contract Change Requests

- None after this M0 proposal. The contract needs Fable review and freeze before Lane B treats it as stable.

