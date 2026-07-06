# Fable Delivery — Item Table v1 + Named Combos (post A-M1)

**Delivered 2026-07-06.** `src/items/items.json` (36 items) and `src/items/combos.json`
(20 named combos) are live — the loader validates both, all 33 tests pass, goldens intact
(the 12 exemplars kept their ids, values, and ruleIds). Determinism pin consciously
updated to `258a0c24d37cd007` (table contents feed offer generation).

## Table shape

- **Tiers:** 14 × t1, 12 × t2, 7 × t3, 3 × t4 (t4 enters the offer pool from day 10).
- **Earned-only items (5):** `cheese-wheel-tier-2`, `jam-jars`, `lantern`, `terrarium`,
  `crystal-decanter` — they are upgrade targets, and anything in the upgrade graph is
  excluded from offers. Lucky Bamboo (and future transforms) is the only way to get them;
  upgrades should feel like minting something the shop can't stock.
- **Upgrade graph:** wine→decanter, cheese→aged cheese, candle→lantern, vase→terrarium,
  apples→jam. All t1 bases so bamboo adjacency is a real placement decision.
- **Tag grammar** (cross-item language): food, perishable, cheese, sweet, drink, fancy,
  fragile, lucky, plant, antique, paper, music, light, toy, tool, utility, deal, mascot,
  cold, water, wax, sticky, clock. Every new rule targets tags except item-specific
  combos; this is what keeps the combo space from exhausting.
- **Archetypes:** engines (bread, apples, postcards), positional payoffs (radio, samovar,
  orrery), enablers (honey, hive, vase, lantern), savers (penny jar, jam), gamblers
  (dice cup, golden scale), earners-on-exit (register, coupon).

## The 20 named combos

wine-and-dine, cheese-board, bakery-corner, tea-party, sugar-rush, cellar-door,
cold-chain, green-grocer, aquascape, still-life, dont-sneeze, heirloom-row,
lucky-cluster, paper-trail, mood-lighting, infinite-reflection, fire-sale,
time-is-money, cat-and-fish, two-cats.

All expressed in the generic center/adjacent/count detector — no engine changes needed.
Catalog-only per R-2.

## Tuning decisions (T-1 closure)

Three fuzz iterations (`table-v1/v2/v3` seeds, 100 runs × 3 strategies each):

1. Baseline: greedy died at rent cycle 10 (day ~30) — 2× the session-length pillar.
2. Buffer levers alone (sell price `base/3`, restock `2×base + 3×tier`, aging caps
   cheese 6 / aged 10 / penny 5 / jam 6) barely moved it — with the rent curve and
   exemplar values fixture-locked, death cycle was structurally determined.
3. **Progressive sawtooth:** growth stays 1.44 through cycle 3 (fixture-pinned region),
   then **1.6 from cycle 4** — "the landlord gets greedy." Kickoff's ~35–45% applies to
   the early game a player must learn; the late curve is the boss fight.

**Accepted state (seed `table-v3`, 100 runs/strategy):**

| strategy | died at rent (med/max) | days (med/p90) | best day (med) | combo run rate |
|----------|------------------------|----------------|----------------|----------------|
| greedy   | 8 / 10                 | 24 / 27        | 87             | 0.73           |
| combo    | 8 / 10                 | 24 / 27        | 75             | 0.68           |
| random   | 1 / 1                  | 3 / 3          | 3              | 0.01           |

Greedy is an upper bound on human play, so real sessions land at ~15–24 days ≈ the
8–15 minute pillar. No strategy beats another by anywhere near 2× (M3 gate criterion).
Random still never survives rent 1 — R-11 stands, re-check at the M3 fun gate with
human recordings.

## Notes for the lanes

- **Lane A (M2):** table is already integrated. When the first `transformsAdjacent` item
  ships (none in v1 — bamboo covers transforms via the upgrade graph), add a unit test.
  Restock/sell/reroll constants are now Fable-tuned; treat as data, not placeholders.
- **Lane B:** sprite manifest = 36 items + variant stages (cheese ×3, bamboo ×3,
  coupon ×2) per kickoff §7. Shop Cat first as the style anchor. The five earned-only
  items deserve visibly "upgraded" reads (they're collection trophies).
- **Catalog sizing:** 36 items + 20 combos = 56 stamps in the album.
