# State-of-game review — 2026-07-08 (strategic gaps promoted to plan)

Verdict from the whole-game review: **structurally excellent, experientially unproven.** Engine,
determinism pin, and tuning infra are ahead of most shipped indies, but the shipping default is
still the pre-v2 shallow loop; every depth feature waits on the device feel-gate. Weaknesses that
were already in-plan (beginner floor → A-M6c; loose economy → tightened per Fable) stay where they
are. This doc records the gaps that were **not** in the plan and are now promoted, in priority
order. None of these block the current critical path (day-2 starter + device feel-gate).

## P1 — Unlock ladder (between-run meta-progression)  → needs a brief
The biggest genuine gap vs every comparable success (Balatro decks/stakes/Joker collection, LbaL
floors/symbol unlocks). Our catalog answers "what did I do?"; nothing answers **"what do I get
next run?"** — all 36 items are available from run 1.
- Mechanic: items (and later combos/skins) carry an unlock predicate (`unlockedAt`: total runs,
  catalog stamps, a named-combo hit…); locked items are visible as silhouettes ("next unlock" hook).
- Also fixes content-volume perception for free: 36 items drip-fed over ~20 runs feels generous;
  all-at-once feels thin by run 10.
- Constraints: additive save field only (wipe-risk check first — §3 scar), flag-gated
  (`UNLOCK_LADDER_ENABLED`, default OFF), OFF path byte-identical to the pin. Deterministic-friendly
  (predicates read persisted totals, not run RNG).
- First step: brief in `docs/lane-a/` with an observable acceptance (e.g. "fresh save sees ≥1 new
  unlock within each of the first 5 runs; full pool reachable by run ~20; pin untouched").

## P2 — Real-playtest milestone (TestFlight, ~10 people, ~3 days)
All balance evidence is bot-derived, and we have a recorded scar that bots understate intent-based
mechanics (`todays-order-demand`). No playtest milestone existed anywhere in the plan.
- Gate: after the device feel-gate graduates the v2 flags (testers should play the real game).
- Deliverable: TestFlight build + a 5-question feedback form + the summary-v2 share card as the
  organic artifact. Watch: first-rent survival vs the 40–70% aspiration, day-3 return rate,
  "what were you trying to build?" (build-identity legibility).
- One 3-day round with 10 strangers will confirm/invalidate more tuning than another 400-run fuzz.

## P3 — Daily seed + ghosts (S-3 promoted from the moat ledger)
The flagship post-graduation feature; uniquely enabled by the `{seed, actions[]}` trace — the one
asset a fast-follow clone structurally cannot copy. Same shelf worldwide daily; see a friend's
exact decisions replayed; leaderboards verified by replay (cheat-proof by construction). Combo
cinema (S-1) rides the same foundation. Promotion per the moat-ledger review cadence (≤2 items).

## P4 — Principle, not feature: "spectacle without swing"
Cozy caps the fireworks: build-swing guardrail is 1.3–2.0× while Balatro's pull is numbers going
nuclear. Resolution: keep **economic** swings gentle (bands unchanged — they're Fable's), but let
rare deep cascades *feel* apocalyptic — full juice budget on the top cascade tier (S-5 sound
choreography, combo cinema moment). Applies to all future feel work; screenshot/recording
acceptance per §2 of the harness.

## Deliberately NOT promoted (revisit post-launch)
- Raw item-pool growth (Phase-4 line / S-11 seasonal packs) — the unlock ladder buys time;
  cadence beats volume (Moat 3).
- Customers-as-characters / regulars (novel + genuinely shop-like, pairs with S-15 keepers) and
  beautiful-shelf décor/photo mode — strong identity plays, but post-launch content, not
  pre-launch scope.

## Review hooks
- At the next milestone review: P1 brief written? P2 scheduled once flags graduate? P3 sized?
- The same "tune against the graduating flag SET" scar applies to the unlock ladder: re-run the
  goal-table fuzz with UNLOCK_LADDER in the stack before it graduates.
