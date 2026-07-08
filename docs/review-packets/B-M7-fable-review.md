# B-M7 Fable Review — Accessibility floor

**Reviewer:** Fable, 2026-07-09. Reviews Opus 4.8's
[B-M7-accessibility-review.md](B-M7-accessibility-review.md).
**Verdict: APPROVE the mechanism, prefs, audit, and ratios. The escalated architecture call is
ruled below: staged wiring was the RIGHT choice, and the runtime-theme migration becomes its own
brief (B-M9) rather than a smuggled refactor.**

## What I re-ran / verified
- **Executed:** `tsc` clean, **239/239** on the combined tree (13 new tests incl. the old-shape
  prefs load test and the central `scaleTypeStyle` mapping proof); fixtures + pin green.
- **The persistence audit finding was real and load-bearing:** `usePrefs` never persisted —
  every comfort toggle (including the long-shipped reduce-motion) silently reset each launch.
  Fixed with `src/persistence/prefs.ts` on the house pattern, all fields optional, load test
  written first, writes load-guarded (the wipe scar honored). Boot hydration added in `_layout`.
  Note accepted: setters no-op pre-hydration — a toggle in the first ~100ms is skipped, not
  corrupted; safe direction, edge acceptable.
- **Central funnels verified in code:** `scaleTypeStyle` applied ONLY inside `AppText` (identity
  at scale 1 → default path byte-identical); high contrast swaps only the DEFAULT text color and
  the token-level `resolvePalette` mapping — explicit `color` props deliberately untouched (the
  per-component-fork rule kept, correctly deferring those to the migration).
- **Audit table:** complete; the red/green drop glow was the one genuine color-only state, fixed
  with ✓/✕ shapes. Contrast numbers reproducible via `scripts/contrast-check.ts` (normal body
  AAA already; HC lifts everything ≥ 7.59:1).
- The `react-native` vitest stub is scoped to modules importing RN and labeled — accepted.

## Ruling on the escalation — static StyleSheets vs live re-theming
The implementer is right on both counts: (a) ~8 screens bake type/color into module-load
`StyleSheet.create`, so app-wide live effect of textScale/HC needs those sheets converted to
palette/scale-aware factories; (b) doing that inside this brief would have been the classic
broad-refactor-inside-a-narrow-brief red flag. **Ruling: staged approach APPROVED.** The
migration is now **B-M9** — mechanical screen-by-screen conversion to the already-built
`resolvePalette`/`scaleTypeStyle` funnels, one screen per commit, no visual change at default
prefs (assert by snapshot where possible), device shots batched with everything else. Until
B-M9 lands, the settings toggles are honest about scope: they affect AppText-rendered text
everywhere and fully themed screens as they migrate.

```
Verdict: APPROVE (mechanism + prefs + audit); B-M9 runtime-theme migration spun out.
Tests cover the path: old-shape prefs load, central-mapping proof, tokens tests — executed.
Out-of-scope changes: settings hint fontSize override removal — in scope (it WAS per-screen math).
Risks remaining: visual close-out (deferred device gate, recipes in packet); B-M9 scope.
```
