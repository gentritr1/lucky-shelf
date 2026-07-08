# Lane B brief — B-M7: Accessibility floor (jury Promote-Now #4)

**Author:** Fable, 2026-07-08. **Implementer:** Opus 4.8. **Review:** Fable + deferred human
device gate (the human is batching device time — structure closes headlessly now, visuals later).
**Origin:** PRODUCT.md / agent-jury verdict: "reduced motion, large text, high contrast,
color+shape tags, haptic settings" as a floor, and the anti-casino identity depends on the game
being comfortable to read.

## Context (self-sufficient)
Expo/RN app; kit/tokens in `src/ui` (AppText, tokens only); prefs store `src/ui/prefs.ts`
currently holds reducedMotion / haptics / sound gates; settings screen `src/app/settings.tsx`
(~123 lines). `TagChip` + `tagEmoji` already pair a glyph with tag colors in some surfaces.
Boundary: screens use store view-models; no `@/sim`/`@/items` imports under `src/app`.

## Work items
1. **Prefs persistence audit FIRST.** Determine whether `usePrefs` persists across launches; if
   not, add additive persisted prefs (old-shape load test BEFORE the UI — the standing scar).
   All new toggles ride the same mechanism.
2. **Large text mode:** a `textScale` pref (`1.0 | 1.15 | 1.3`) applied through `AppText`/
   `typeScale` centrally — never per-screen font math. Every screen must survive 1.3 at SE width
   without truncation (ScrollView where needed — the summary already has the pattern).
3. **High contrast mode:** a token-level alternate mapping (ink darker, cream lighter, borders
   +1) switched in `tokens`-consuming code via the pref — no per-component color forks. Document
   the contrast ratios you achieve for body text and coin text (target WCAG AA ≥ 4.5:1).
4. **Color+shape everywhere:** audit every surface that encodes a TAG or STATE by color alone
   (build accents, synergy highlights, record stars, legal-drop glow) and pair each with a glyph
   or shape (`tagEmoji` for tags; shape/outline for states). Deliver the audit table
   (surface → color-only? → fix) in the packet.
5. **Settings screen:** the new toggles grouped under "Comfort", using existing Toggle kit;
   haptics/sound toggles stay as-is.

## Non-goals
No sim changes; no motion redesign (reduced-motion semantics stay R-28); no new fonts; no
theme/dark mode; no copy rewrites beyond the new setting labels.

## Acceptance criteria
1. Suite + `tsc` green; prefs old-shape load test (if persistence added) green; a headless unit
   test proves `textScale` maps through the type system (no screen-local scaling).
2. The color-only audit table with every row resolved or explicitly deferred with a reason.
3. Contrast numbers reported for both palettes (normal + high contrast).
4. Simulator screenshots DEFERRED by the human's device-batching call — list the exact shots the
   gate needs (settings screen, one gameplay screen at 1.3× on SE, high-contrast run screen,
   tag surfaces) with seed recipes, same style as the B-M5 packet.

## Deliverable
`docs/review-packets/B-M7-accessibility-review.md`: built vs criteria, audit table, contrast
numbers, commands + outputs, deferred-shot list. **STOP — Fable reviews; device gate later.**
