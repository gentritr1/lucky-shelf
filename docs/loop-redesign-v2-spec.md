# Lucky Shelf — Loop Redesign v2 (spec + build plan)

**Status:** proposed 2026-07-07, after a device play-test verdict: *too linear, no tactics,
"just 1 item a day," not enjoyable.* Direction chosen by the relay: **deepen the loop, full
redesign.** This doc is the guiding spec; each phase is a flag-gated build with a device
feel-gate before the next.

## Root cause (from the code, not vibes)
A day = draft 1-of-3 → place → auto-score → repeat; rent every 3 days. That's **one
low-stakes decision per day**, and the real depth (adjacency, auras, combos, the
spotlight/order levers) only becomes a decision once the board is dense (day 5+) — which
most runs never reach. The game front-loads its emptiest state and back-loads its depth.
No in-run chase beyond a rent wall; no build identity. It is a **Luck-be-a-Landlord /
Balatro-shaped game starved of decisions and buying agency** — the scoring engine is already
built for that shape; the loop around it isn't.

## What we KEEP (the moat — do not touch)
Deterministic `ScoringTrace` + all scoring rules; the 3×4 shelf + drag placement; the rent
sawtooth; the permanent catalog; the spotlight positional lever (it works once the board is
full). We change **acquisition, economy, and goals AROUND the engine**, not the engine.

## The target loop (each day)
1. **Shop** — 4 offers; **buy as many as you can afford** (coins gate acquisition), reroll
   available. This replaces the 1-of-3 free draft as the core verb and is what fills the
   board fast enough to create decisions early.
2. **Arrange** — place/rearrange on the 3×4 grid (drag). Spotlight slot active.
3. **Open Shop** — the existing deterministic cascade scores the board into coins.
4. **Day target** — a coin goal for the day; beat it → a small reward (extra reroll /
   discount / coin bonus). The rent sawtooth stays as the periodic hard wall.

**Build identity** comes from promoting the order lever to a core mechanic: **tag-set
synergies** — N items sharing a tag give that tag an escalating multiplier, so committing to
an archetype (food / antique / lucky engine) pays off and gives "one more run to try X."

## Phases (each: flag-gated, fuzz A/B, device feel-gate before the next)
- **Phase 1 — Decision density (the core fix, highest fun delta).** Daily shop of 4,
  buy-multiple, starting coins (~6–8, fuzz-tuned) so day 1 you buy 2–3; board fills in days,
  not weeks. Free draft becomes a day-1 starter only. *Acceptance: median run has a
  half-full board by day 3; fuzz shows real placement branching, not a forced line.*
- **Phase 2 — Build identity.** Three parts (sharpened by the game research —
  `docs/research-findings-depth-retention.md`): (a) escalating **tag-set multipliers** (fold in the
  order lever); (b) **signature stock** — a small set of run-defining items that *change the scoring
  math* (our cozy reskin of Balatro Jokers / LbaL special symbols: e.g. Brass Scale ×'s all food,
  Ledger scores per antique), 1–2 of which define a run's engine; (c) **build steering** — let the
  player lean an archetype early (a "supplier" pick / biased reroll) so a plan forms turn 1. Shop
  signposts synergy with the board. *Acceptance: fuzz shows distinct archetype runs, and a run with
  a signature item scores on a different curve than one without.*
- **Phase 3 — Goal ladder.** Daily coin target + reward, layered over rent, for pacing and
  chase. *Acceptance: target is beatable but not trivial across greedy/combo bots.*
- **Phase 4 — Balance + content + UI.** Re-tune rent curve + item-table weights to the new medians
  via fuzz; **grow item variety with synergy legibility** (research: depth needs a critical mass of
  interacting pieces *and* signposting of what combos — volume with hints, not a raw dump); then
  polish the now-settled screens (shared TopBar centering, CoinCounter alignment, restock relayout,
  selection contrast) + asset preload.

## Open calls (my recommendation each — override if you disagree; non-blocking to Phase 1)
1. **Rent vs targets:** keep rent as the hard wall AND add a daily target (recommended —
   preserves the cozy-shopkeeper rent theme), *or* replace rent with pure Balatro escalating
   targets. → **Recommend: keep rent + add target.**
2. **Free draft:** cut entirely, keep as a day-1 starter, or a weekly bonus. → **Recommend:
   day-1 starter only** (gives a gentle opening hand, then the shop takes over).
3. **Board size:** stay 3×4, or grow it as an unlock as the engine scales. → **Recommend:
   stay 3×4 for v2**; board growth is a later unlock, not part of this redesign.

## Guardrails / process
- Economy + any scoring-order change is **Lane A and needs Fable sign-off** (currently
  unavailable) → each phase files a CCR; nothing graduates from its flag until signed off.
- Each phase flag defaults reversible to today's loop; determinism + golden traces stay green
  (engine untouched). Balance validated by fuzz A/B; fun validated by your device feel-gate.
- Balance numbers here are **starting estimates, fuzz-tuned** — not final.

## Parallel hygiene track (unblocks testing now, design-independent)
- **Perf:** first build a **release/preview** to isolate dev-build overhead (likely the bulk
  of the jank — "debug behaviour?" = yes); then preload/cache assets (RN `Image`+`require`
  currently decodes per-screen on first show → the pop-in). Check `room-day.png` size.
- **Worst UI now:** shared `TopBar` (fixes the off-center title on every screen) +
  `CoinCounter` vertical alignment. Restock relayout + selection contrast fold into Phase 4
  (those screens change in the redesign).
