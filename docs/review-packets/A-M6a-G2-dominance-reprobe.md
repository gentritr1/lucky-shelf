# A-M6a-G2 Dominance Re-probe - Shelf Expansion Environment

## Verdict

**AUTHORITATIVE EQUAL-N GATE: PASS.** With shelf expansion represented as 4x4 boards, no signature item exceeds the 2x line against the all-signature median.

- Equal-n `maxToAllSigRatio`: **1.600** (`consignment-sign`)
- Gate line: **must be < 2.000**
- Equal-n sample size: **n=3000 per cell**, same realistic 4x4 boards for every signature item

Important caveat for Fable: the favorable-board ceiling arm found a constructed `consignment-sign` outlier at **2.063x** against the strongest non-signature filler in the same slot. Per the method authority in `A-M5b-signature-dominance-gate.md`, the equal-n forced-seeding table is the gate authority; this packet reports the ceiling outlier and makes no tuning changes.

## What changed

- Added permanent deterministic probe: `scripts/signature-dominance.ts`
- Added package script: `pnpm sig:probe`
- No item-table, economy, scoring, contract, fixture, golden, engine, or bot changes.

## Measurement method

- Equal-n forced seeding uses 3000 deterministic expanded 4x4 boards sampled from day-9+ occupancy.
- Each signature item is dropped into the same reserved slot on the same 3000 boards.
- Baseline leaves the reserved slot empty.
- Signature scoring is forced ON for the probe; tag synergy is forced OFF; spotlight is absent except in the lucky-cat spotlight arm.
- Favorable and lucky-cat spotlight arms use 300 deterministic constructed 4x4 boards per cell, with n printed in-table.
- Natural-pickup fuzz was not used to open or close the gate.

## Commands run

```sh
PATH="$HOME/.nvm/versions/node/v23.3.0/bin:$PATH" node_modules/.bin/tsc --noEmit
PATH="$HOME/.nvm/versions/node/v23.3.0/bin:$PATH" pnpm sig:probe -- --seed m6a-g2-reprobe
PATH="$HOME/.nvm/versions/node/v23.3.0/bin:$PATH" node --import tsx scripts/validate-fixtures.ts
PATH="$HOME/.nvm/versions/node/v23.3.0/bin:$PATH" node_modules/.bin/vitest run src/sim/determinism.test.ts src/sim/goldens.test.ts
PATH="$HOME/.nvm/versions/node/v23.3.0/bin:$PATH" node_modules/.bin/vitest run
PATH="$HOME/.nvm/versions/node/v23.3.0/bin:$PATH" node --import tsx -e '(async () => { const items = (await import("./src/items/index.ts")).default; const bots = (await import("./src/sim/bots.ts")).default; const hash = (await import("./src/sim/hash.ts")).default; const replay = (await import("./src/sim/replay.ts")).default; const deps = { table: items.loadItemTable(), combos: items.loadCombos() }; const bot = bots.playRun("determinism-fixture", "random", deps, 60); const replayed = replay.runReplay({ seed: bot.seed, actions: bot.actions }, deps); console.log(JSON.stringify({ hash: hash.hashState(replayed), matchesBot: hash.hashState(replayed) === hash.hashState(bot.finalState) }, null, 2)); })();'
```

## Probe output

```text
$ node --import tsx scripts/signature-dominance.ts -- --seed m6a-g2-reprobe
# Signature dominance expansion re-probe

Verdict by equal-n 2x gate: PASS
Seed: m6a-g2-reprobe
Realistic 4x4 boards per cell: 3000
Favorable/spotlight boards per cell: 300
All-signature aggregate median: 100
maxToAllSigRatio: 1.600
Favorable-board max lift: 2.063
Lucky-cat hero-spotlight median lift: 0.980
```

### Equal-n realistic 4x4 boards

| cell | n | median | p90 | p95 | max | lift vs no-sig median | to all-sig median |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| no-signature baseline | 3000 | 77 | 109 | 118 | 205 | 1.000 | - |
| brass-scale | 3000 | 80 | 112 | 121 | 212 | 1.039 | 0.800 |
| consignment-sign | 3000 | 160 | 224 | 240 | 414 | 2.078 | 1.600 |
| ledger-book | 3000 | 109 | 149 | 161 | 231 | 1.416 | 1.090 |
| lucky-cat | 3000 | 89 | 127 | 139 | 247 | 1.156 | 0.890 |
| window-display | 3000 | 95 | 131 | 142 | 242 | 1.234 | 0.950 |

Gate read: `consignment-sign` is the top equal-n signature by median, but `1.600x < 2.000x`; the forced-seeding dominance gate remains closed by the authoritative method.

### Favorable-board ceiling

| item | n | signature median | best filler median | median lift | max lift | max-lift filler |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| brass-scale | 300 | 145 | 119 | 1.218 | 1.344 | maneki-neko |
| consignment-sign | 300 | 236 | 134 | 1.761 | **2.063** | orrery |
| ledger-book | 300 | 215 | 162 | 1.327 | 1.638 | maneki-neko |
| lucky-cat | 300 | 164 | 174 | 0.943 | 1.243 | maneki-neko |
| window-display | 300 | 170 | 176 | 0.966 | 1.356 | maneki-neko |

Ceiling read: expanded boards give `consignment-sign` enough room to produce a constructed ceiling above 2x in one arm. This does not supersede the equal-n gate, but it is the balance caveat Fable should rule on.

### Lucky-cat x spotlight arm

| arm | n | lucky-cat median | best filler median | median lift | max lift | max-lift filler |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| no spotlight | 300 | 162 | 174 | 0.931 | 1.216 | samovar |
| hero spotlight ON | 300 | 197 | 201 | **0.980** | 1.382 | maneki-neko |

Lucky-cat read: the spotlight interaction did not produce dominance in this expanded-board probe. Its median lift stayed below the strongest same-slot non-signature filler even when the hero slot was spotlighted.

## Floor output

```text
tsc --noEmit:
(no stdout; exit 0)
```

```text
validate-fixtures:
m0-basic-wine-cheese: 6 trace events
m0-wine-dine-combo: 13 trace events
m0-mirror-copy: 6 trace events
m0-shop-cat-row-aura: 9 trace events
m0-scores-last-clock: 5 trace events
m0-bamboo-transform: 6 trace events
Validated 6 M0 fixtures.
m2-arrange-sticky: 1 sticky item(s), arrange phase.
```

```text
determinism + goldens:
Test Files  2 passed (2)
Tests       8 passed (8)
```

```json
{
  "hash": "8d48e1c5a6ad14c9",
  "matchesBot": true
}
```

```text
full suite:
Test Files  34 passed (34)
Tests       248 passed (248)
```

## Caveats

- The equal-n table is the gate authority; natural-pickup fuzz is intentionally absent.
- Favorable and spotlight arms use n=300 deterministic constructed boards per cell, not the 3000 realistic-board gate set.
- Tag synergy is forced OFF to isolate signature effects. Spotlight is present only in the lucky-cat spotlight arm.
- No tuning was done in response to the `consignment-sign` favorable ceiling.

## Contract or tuning requests

- None from Codex. Fable rules on whether the favorable-board `consignment-sign` ceiling matters for graduation.

STOP - A-M6a-G2 dominance re-probe is complete. Fable rules on the gate.
