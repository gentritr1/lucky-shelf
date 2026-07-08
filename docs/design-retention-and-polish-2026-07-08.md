# Retention roadmap + UI polish audit — Fable, 2026-07-08

Companion to [FABLE-RULINGS-2026-07-08](review-packets/FABLE-RULINGS-2026-07-08.md). Two lists:
what would make the loop deeper and more retention-driving *after* the v2 stack graduates, and
what the UI needs to feel finished. Everything is grounded in systems that already exist — no
proposal here requires new infrastructure, only new surfaces on current ones.

## A. Retention / loop-depth ideas (ranked by payoff ÷ effort)

Existing hooks these build on: run-end merge into a permanent catalog (`catalogStore.recordRunEnd`),
daily seeded run + one-attempt share card (`dailyStore`, `/share`), build archetypes
(synergy tags + supplier lean), signature items, goal ladder (`freeRerollTokens` already an int),
`nearDeath()` tension metric, `runStats`.

1. **Personal bests + "New record!" on the summary screen** (S). The summary is static stats today;
   the catalog store already folds every run in. Show best-ever day / longest run / deepest rent
   beside this run's numbers, and celebrate a beat. Cheapest possible "one more run" trigger.
2. **"Survived by N coins" near-miss drama** (S). `nearDeath()` exists in the sim; surface the
   closest rent call on summary + share card ("Paid rent with 2 coins to spare"). Tension is the
   game's core feeling — make it quotable and shareable.
3. **Daily streak** (S–M). `dailyStore` already records per-date results; add a streak counter on
   the title button + share card. The classic daily-retention mechanic, nearly free here.
4. **Archetype mastery badges** (M). Tags/supplier archetypes exist; award per-archetype badges
   ("win a run with a 6-wide Drink build") shown on the supplier picker cards. Gives the 10
   archetypes long-run identity and a completion axis the catalog already visualizes.
5. **Unlockable item pool** (M — the big one). Convert catalog discovery into progression: new
   items enter the offer pool as combos/signatures are discovered (data-only via `items.json` +
   an unlock gate in `offerablePool`). Collection→power is the deepest retention loop available
   with the current architecture; also solves "seen everything by run 10".
6. **"Next unlock" teaser on summary** (S, after #5). Show the nearest locked item + its condition
   at run end — the single best re-run prompt once unlocks exist.
7. **Weekly twist on the daily** (M). A rotating rule modifier for the daily seed ("plants are
   lucky this week") — one modifier table + a scoring hook, huge variety per byte. Keep it
   daily-only so the core loop's determinism pin stays untouched.
8. **Heat / ascension ladder** (M–L, post-graduation). After a deep run, allow starting at Heat 1+
   (steeper rent, richer offers). Reuses the v2 rent constants as the difficulty dial; gives
   veterans a reason to keep playing after mastering Heat 0.
9. **Purchasable shelf expansion — the coin sink** (M, elevated priority). The economy pass proved
   the mid-game ~7× surplus can't be fixed by curve constants without breaching the run-length and
   build-swing guardrails; the structural fix is something worth spending on. An escalating-cost
   13th/14th/15th slot converts surplus directly into build space — it is simultaneously the
   missing coin sink, a mid-run progression beat, and a soft fix for the full-shelf softlock
   pressure. Contract note: shelf size is in `GameState`, so this needs a CCR + my sign-off path.

Sequencing note: 1, 2, 3, 6 are summary/share-surface work (Lane B, no sim change, no CCR).
5, 7, 8 touch sim/offer surfaces → each needs the usual flag + review packet + my sign-off path.

## B. UI polish audit (code-read findings; visual items need the sim screenshot loop)

1. **Daily summary has no "New Run" button** ([summary.tsx:74-78](../src/app/summary.tsx)) — after
   a daily, the only paths are Share/Catalog/Menu; a finished daily player who wants a normal run
   must detour through the title. Flow gap, one-line fix. *(functional — no eyeball needed)*
2. **Finish the AppText migration in screens.** The kit components adopted `AppText` (7a5e58c) but
   every screen still renders 7–21 raw `<Text>` nodes; the Baloo2 icon-nudge discipline only
   applies inside kit components today. Mechanical, screen-by-screen; verify with seeded sim
   screenshots per `ios-ui-verify-on-simulator`.
3. **Inconsistent coin rendering on summary**: total uses `CoinCounter`, best-day uses a plain
   `{n}c` string two rows below. One currency, one presentation.
4. **Summary doesn't recap the build** — the run's identity (dominant tag, widest synergy, named
   combos found) is all in `runStats`/`catalogDelta` but the end screen shows generic numbers.
   Pairs with retention item #1 to make the end screen the emotional peak instead of a receipt.
5. **Haptics fire only in the cascade** (`juice/haptics.ts` is imported solely by
   `useCascadePlayer`). Buy, sell, place, and rent-paid are silent. Light impacts through the
   existing gateway (prefs-respecting) are cheap felt-quality; device feel-gate applies.
6. **Rejection feedback is styled as a hint** — `lastRejectedAction.message` replaces the hint text
   with identical styling ([run.tsx:200](../src/app/run.tsx), restock equivalents). An invalid
   action should read as feedback (ember tint, reduce-motion-safe nudge), not as ambient copy.
7. **Accessibility pass**: `accessibilityRole` appears 2–4× per gameplay screen; most Pressables
   lack roles/labels. Also future-proofs UI automation hooks.

Items 2/4/5/6 change look or feel → per the working rules they close only on your device
screenshots, not on my say-so. Items 1/3/7 are LOW-RISK mechanical fixes.
