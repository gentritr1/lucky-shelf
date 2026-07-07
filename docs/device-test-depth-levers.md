# Device test — depth levers + cascade pop

Goal: decide, on a real device, whether the two flagged levers fix the "too short / no
mechanic" feel — and whether the ×N cascade pop reads well. ~15 min. Answer the IDs at the
bottom; terse is fine (`1a Y`, `3b trivial`).

## Launch
```
npm run ios      # or: npm run android      (native dev build)
# or: npx expo start   → open in Expo Go
```
Both levers are **ON by default**, so Round 1 needs no edits.

**To isolate a lever:** edit one line, save (Expo hot-reloads), then tap **New Run** (a flag
change only takes effect on a fresh run — Continue keeps the old one).
- Spotlight flag: `src/sim/economy.ts:31` `SPOTLIGHT_ENABLED`
- Order flag:     `src/sim/economy.ts:43` `DEMAND_ENABLED`
- (Optional magnitudes: `SPOTLIGHT_MULT` :32, `DEMAND_MULT` :44, `DEMAND_COUNT` :45)

When done, leave both flags `true` (that's the default).

---

## Round 1 — Both ON (default). Play one full run until you miss rent.
Watch the shelf during Arrange and the animation during Open Shop.
- **1a** Early on (near-empty shelf), did *where* you place matter — did the glowing **window** slot make you think? (Y/N)
- **1b** Each rent cycle, did you feel pulled to "get something big in the window" or "fill today's order"? (Y/N)
- **1c** Did the draft pick feel more meaningful (choosing *for* the window/order)? (Y/N)
- **1d** Did Open Shop feel like a *payoff* (the ×N pops) rather than just watching? (Y/N)
- **1e** Overall: did it feel less "too short / no mechanic" than before? (Y/N)
- **1f** The ×3 window: **too swingy / just right / too weak**?

## Round 2 — Spotlight only. Set `DEMAND_ENABLED = false`, New Run.
- **2a** Is the window *alone* a real, fun decision each day? (Y/N)
- **2b** ×3 magnitude: **too swingy / right / too weak**?
- **2c** Does the window pop read clearly — a gold **×3** badge on the slot, not a glitchy nub? (Y/N)

## Round 3 — Order only. Set `SPOTLIGHT_ENABLED = false`, `DEMAND_ENABLED = true`, New Run.
- **3a** Did the **ORDER** banner change which delivery you drafted? (Y/N)
- **3b** Filling the order felt: **satisfying / trivial / unreachable**?
- **3c** count 2 & ×1.5: **too weak / right / too strong**?
- **3d** Does the order pop read clearly — teal **×1.5** badges on matching items? (Y/N)

## Cascade pop — check during any Open Shop
- **P1** The ×N/+N badges **pop on the item's slot** (spring in), not a tiny zero-length arrow? (Y/N)
- **P2** *(if it came up)* A lone item or the Antique Clock's bonus also popped cleanly? (Y/N / didn't see)

## Reduced motion — Settings → Reduced motion ON, then Open Shop once
- **R1** Badges still appear (static, no animation) and nothing looks missing/broken? (Y/N)

---

## Report back (copy + fill)
```
Round 1: 1a_ 1b_ 1c_ 1d_ 1e_ 1f(swingy/right/weak)_
Round 2: 2a_ 2b(swingy/right/weak)_ 2c_
Round 3: 3a_ 3b(satisfying/trivial/unreachable)_ 3c(weak/right/strong)_ 3d_
Pop:     P1_ P2_
RM:      R1_
Verdict: keep both / keep spotlight only / keep order only / cut / needs different magnitudes
Notes:   (anything that felt off, in your words)
```

What your answers decide:
- **1e / verdict** → do the levers graduate from prototype at all.
- **1f / 2b / 3c** → magnitude tuning (I adjust the consts).
- **3a / 3b** → whether the order is pulling drafts or is noise; may re-tune count/cadence.
- **P1 / P2 / R1** → whether the pop polish is done or needs another pass.
