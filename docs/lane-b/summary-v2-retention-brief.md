# Lane B brief — B-M4: Summary v2 + flow fixes (retention quick wins)

**Author:** Fable, 2026-07-08. **Implementer:** Opus 4.8 (Claude Code session).
**Review:** Fable reviews against the acceptance criteria + your simulator screenshots; the
human device feel-gate is the final visual authority. Implementer never self-signs-off.

## Context (self-sufficient)

Lucky Shelf, an Expo/React Native shelf-building roguelite. Screens in `src/app/*.tsx`; shared
kit in `src/ui/components` (use `AppText`, `CoinCounter`, `Panel`, `WoodButton`, `TagChip`,
tokens from `src/ui/tokens.ts` — **never raw hex or raw numbers**; the design system doc is
`docs/lane-b/design-system.md`). Screens read ONLY store view-models from `src/state/store.ts` —
never value-import `@/sim` or `@/items` (boundary rule; add selectors/view-models to the store
when you need new data). Permanent cross-run data merges via `src/state/catalogStore.ts`
(`recordRunEnd`), daily-run data via `src/state/dailyStore.ts`.

**Verification reality:** web preview cannot exercise gameplay screens (drag-gated, Skia wasm
not served). Verify on the **iOS simulator** with seeded runs and screenshots — the technique is
in project memory `ios-ui-verify-on-simulator` and `docs/STATUS.md` (toolchain: `nvm use 23.3.0`,
`NODE_OPTIONS=--experimental-sqlite` for pnpm; UTF-8 locale + Homebrew pod 1.16.2 +
`unset NODE_OPTIONS` for `expo run:ios`). Headless suite: `pnpm typecheck && pnpm test`.

## Work items (in order)

1. **Daily summary flow fix** ([src/app/summary.tsx](../../src/app/summary.tsx) lines ~73–79):
   after a daily run, there is no "New Run" button (only Share/Catalog/Menu). Add a secondary
   "New Run" `WoodButton` on the daily variant. Functional fix; no design invention.
2. **Coin rendering consistency** (same file): "Best day" renders as a plain `{n}c` string while
   "Coins earned" uses `CoinCounter`. Use `CoinCounter` for both.
3. **Personal bests + "New record!"** — the retention centerpiece. Extend `catalogStore` with
   persisted bests (bestDayTotal, longestRun/daysSurvived, deepestRentSurvived) updated in
   `recordRunEnd` (**additive persisted fields with safe defaults — document the migration
   posture: absent = derive from this run; never wipe existing catalog data; write a load test
   proving an old persisted catalog still loads**). Summary shows each stat's best beside this
   run's value; a beaten record gets a celebratory accent (existing tokens/springs — see
   `src/ui` ambient/press patterns from the juice pass, respect reduce-motion prefs in
   `src/ui/prefs.ts`).
4. **Build-identity recap on summary:** one line under the headline naming the run's dominant
   build via the existing build-identity view-model (`buildIdentityView` in `store.ts` — it is
   `tagSynergyEnabled()`-gated; when the flag is off or no build, omit the line entirely) + named
   combos discovered count (already computed).
5. **Near-miss drama line:** "Paid rent with N coins to spare" when the run's closest rent
   payment margin was ≤ 5 coins. The engine does not expose this today — add a small additive
   view-model source: track the minimum post-rent margin in `runStats` **only if** that is an
   additive optional field (`closestRentMargin?: number`), no `ContractSchemaVersion` bump, old
   fixtures parse, and flag the CCR in your handoff for Fable. If you'd rather not touch the
   contract, derive it in the store from the last trace/day events — but state which path you
   chose and why.

## Non-goals
- No sim/economy/scoring changes beyond the optional additive `runStats` field in item 5.
- No new screens, no navigation restructuring, no art assets, no haptics work (separate item),
- no changes to the share card (follow-up once bests exist), no flag graduations.

## Acceptance criteria (bounded, third-party falsifiable)
1. `pnpm typecheck` + full `vitest run` green; catalog persistence test proves an old-shape
   persisted catalog loads without data loss.
2. Seeded simulator screenshots (attach to the packet): (a) non-daily summary with bests shown,
   no record; (b) summary with ≥1 "New record!" state; (c) daily summary showing the New Run
   button; (d) build-recap line present for a synergy-flagged run and absent for a v1 run.
3. On iPhone SE-class width: no text truncation or overlap on the summary stat rows; all new
   tap targets ≥ 44×44pt.
4. Boundary intact: no new imports from `@/sim` or `@/items` in `src/app/**` (grep proof in the
   packet).
5. All numbers/colors/spacing from tokens; `AppText` (not raw `Text`) for any text you touch.

## Deliverable
Review packet `docs/review-packets/B-M4-summary-v2-review.md`: built-vs-criteria, commands +
outputs, the screenshots, migration note for the persisted bests, the item-5 CCR (if taken),
known issues, STOP line. **STOP — Fable reviews; visual close-out belongs to the human device
gate.**
