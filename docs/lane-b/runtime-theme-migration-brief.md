# Lane B brief — B-M9: runtime-theme migration (static StyleSheets → B-M7 funnels)

**Author:** Fable, 2026-07-09 (spun out of the B-M7 review ruling). **Implementer:** Opus 4.8.
**Nature:** mechanical migration — the mechanism already exists and is tested; this is adoption.

## Context (self-sufficient)
B-M7 (`a66f80d`) landed persisted comfort prefs with two central funnels: `scaleTypeStyle`
(textScale, applied inside `AppText`) and `resolvePalette(highContrast)` (token-level palette).
The gap it escalated: ~8 screens bake type/color into module-load `StyleSheet.create`, so those
surfaces don't respond to the prefs at runtime. The B-M7 packet's "Wiring reality" section lists
the affected screens. House rules: tokens only, no per-screen font math, no per-component color
forks; screens consume store view-models; `pnpm typecheck && pnpm test` headless.

## Design (decided)
- Convert each affected screen's static sheet to a memoized factory keyed on
  `(textScale, highContrast)` — one shared helper (e.g. `useThemedStyles(factory)`) added to
  `src/ui`, so screens contain zero scaling/palette logic, just
  `const styles = useThemedStyles(makeStyles)`.
- Text inside migrated screens goes through `AppText` wherever it isn't already (this finishes
  the long-pending AppText adoption sweep for those screens); the surviving raw `<Text>` cases
  are only the documented coin-nudge pairings.
- **One screen per commit**, smallest screen first. At DEFAULT prefs (scale 1, HC off) every
  migrated screen must be byte-identical in output — assert per screen however is cheapest
  (style-object equality test on the factory at defaults is acceptable and preferred).
- Gameplay screens (`run.tsx` is currently the human's WIP — coordinate/skip it last) — check
  the tree before touching any file and skip files with uncommitted changes you didn't make.

## Non-goals
No new prefs, no palette value changes, no layout redesign, no sim/state changes, no visual
changes at default prefs (that's the acceptance), no ShelfScene/Skia work (its colors are
canvas-side — flag as a known limit, don't solve here).

## Acceptance
1. Per-screen: factory-at-defaults equality test green; suite + tsc green after every commit.
2. After the last screen: a grep proof that no `src/app` screen reads `palette.*` directly into
   a static `StyleSheet.create` for themed properties (list allowed exceptions explicitly).
3. Packet lists the deferred device shots (one migrated gameplay-adjacent screen at 1.3×/HC on
   SE) added to the batched gate queue.

## Deliverable
`docs/review-packets/B-M9-theme-migration-review.md`: per-screen table (screen → commit →
equality proof), grep proof, deferred shots, known limits (ShelfScene). **STOP — Fable reviews.**
