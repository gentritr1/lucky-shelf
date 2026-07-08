# A-M6c Fable Review — Free day-2 starter delivery

**Reviewer:** Fable, 2026-07-08. Reviews Codex's
[A-M6c-day2-starter-review.md](A-M6c-day2-starter-review.md).
**Verdict: APPROVE to land behind `DAY2_STARTER_ENABLED` (default OFF) — and the
beginner-floor mechanism chase is hereby CLOSED.**

## What I re-ran (not trusted from the packet)

- **Floor — VERIFIED (executed, independent seed `fable-m6c-floor`, 80 runs):** loopV2 12.5% →
  combined-with-warm **20.0%**; allDepth 15.0% → **23.7%**. With the packet's seed (10→27.5%,
  16.3→23.7%) the honest picture is: **combined floor ≈ 20–27.5% by seed, ~1.6–2.75× baseline,
  and reliably below the 0.30 target.** The packet's miss is real and reproducible.
- **No-free-lunch — the packet's own −5.49% combo miss does NOT reproduce:** my same-seed A/B
  (`fable-review-m6c`, 120 runs) puts every ratio inside ±5% (greedy d9 1.023 / d12 0.978; combo
  d9 0.976 / d12 0.955). Seed noise, not systematic — their question #2 answered: not blocking.
- **Suite/floor gates — VERIFIED (executed):** `tsc` clean (no stash needed — the ShelfScene WIP
  has resolved), 147/147 tests, fixtures validate; `--assert-bands` exit 0 per packet (swing
  1.33–1.43 re-confirmed there).
- **Code read — VERIFIED:** rollover on `scoredDay === 1` gates on the run's loopV2 snapshot;
  day-2 shop generation after the free placement uses the identical `(seed, 2, 'restock', '')`
  derivation the direct path used, so the shop is byte-identical to the unflagged day-2 shop;
  `isDay2StarterPlacement` is unreachable by any non-starter placement (shop placements happen in
  `restock`; post-`endRestock` arrange cannot hold an item — I probed this specifically);
  supplier choice stays day-1-only (test pins it). No contract surface, as promised.

## Rulings on the packet's questions
1. **Keep the flag — approved as a measured, honest lever.** ~2× floor improvement is real value.
2. **Combo −5.49% does not block** (not reproducible; guardrail suite green).
3. **Harness `allDepth` definition:** update it to match the graduating set *when the device gate
   decides that set* — not before; comparability across this round's reports matters more now.

## The chase-closing ruling

Three levers in (warm opening, day-aware ceiling, day-2 starter), the combined floor tops out at
~20–27% against a 40–70% aspiration. The bottleneck is now demonstrably the **floor-bot proxy**,
not the economy: `floorAction` never rearranges, never chases adjacency or synergy — its earning
ceiling is structural, and pushing the economy until *that* bot survives would distort the game
real players get. Therefore:
- The aspirational band stays aspirational and is **re-anchored to the P2 real-playtest
  milestone** (STATUS §3): the next beginner-floor evidence must come from humans, not bots.
- **Welcome-week rent remains the one unpulled lever**, documented here, to be considered only if
  real playtests show new players actually bouncing off the first rent.
- No further beginner-floor mechanism briefs until that playtest data exists.

```
Verdict: APPROVE behind DAY2_STARTER_ENABLED (default OFF); floor target honestly missed;
  mechanism chase closed with a re-anchor to real playtests.
Pre-fix failure reproduced: yes — floor 12.5/15.0% on my own seed without the starter.
Fix verified against original scenario: executed — same configs 20.0/23.7% with it.
Tests cover the path: 6 focused day2Starter tests incl. full-shelf, goal-ladder, supplier-gating,
  buyout+reroll probes; mutation check in packet; 147/147.
Runtime/device verification: headless sim (authoritative for Lane A); /draft copy confirmed
  day-agnostic by the packet — no UI change needed.
Out-of-scope changes: none.
Risks remaining: none new; graduation rides the usual device gate.
```
