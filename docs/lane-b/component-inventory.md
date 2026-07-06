# Lane B — Component Inventory (M0 draft)

Kit primitives build once, theme from tokens, reskin at M4. ✅ = built in M0
proof; others land M1–M5 per milestone map.

## Kit primitives

| component | states | milestone |
|---|---|---|
| Panel ✅ | default | M0 |
| WoodButton ✅ | primary / secondary / pressed / disabled | M0 |
| CoinCounter ✅ | static; count-up + slam variants | M0 → M2 |
| RentChip ✅ | calm / warm / alarm / due-today | M0 |
| OfferCard ✅ | default / selected / pressed; restock adds cost ribbon | M0 → M2 |
| ShelfPreview ✅ | static fixture render (replaced by Skia scene at M1) | M0 |
| TagChip ✅ | default / accent | M1 |
| TierPips ✅ | 1–4 | M0 (inside OfferCard) |
| SectionLabel ✅ | default / trailing | M1 |
| MovesPips ✅ | remaining / spent (the 3-move budget) | M1 |
| Toggle ✅ | on / off (settings; reduced-motion aware) | M1 (pulled fwd from M5) |
| RibbonBanner | combo / info | M2 |
| SpeedControl | 1× / 2× / skip | M2 |
| StatRow | label + value | M2 |
| StampFrame | undiscovered / discovered / new | M4 |
| Stepper | settings | M5 |

## Skia scene graph (src/juice, M1+)

- ShelfScene ✅ (M1): layered composition — Skia depth frame (native) / RN
  fallback frame (web) → slot glow → draggable items. Owns board/occupancy.
- SkiaShelfFrame ✅ (M1, device-verify-only): wood board gradient, inner-shadow
  wells, lit front-edge planks. Gated native-only (web wasm not served here).
- ItemSprite ✅ (M1): placeholder chunky tile (glyph + plinth) → Higgsfield PNG
  at M4; idle breathing ≤1.5%, Shop Cat tail-flick, sticky honey-ring.
- DraggableItem ✅ (M1): full motion-spec gesture — grab lift, tilt, 1:1 track,
  settle overshoot, rubber-band, sticky resistance, neighbor parting, slot glow.
- CascadeLayer (M2): arrows, sparks, count-up labels, aura sweeps, combo banner
- ParticleKit (M2+): dust puff (drop), sparkle (combo), ember drift (rent warning)

## Juice infra (src/juice, M1)

- haptics.ts ✅ — the single haptic gateway; components name `hapticMap` entries,
  never call expo-haptics. Cascade escalation wired for M2.
- motion.ts ✅ — token springs/timings → Reanimated, reduced-motion folded in.
- layout.ts ✅ — shelf geometry math shared by render + worklets.
- skiaWeb.ts ✅ — CanvasKit web boot behind `WEB_SKIA_ENABLED` flag + readiness hook.
- mockShelf.ts ✅ — contract-valid mock arrange state (with a sticky item).
- prefs.ts (src/ui) ✅ — presentation-only zustand store: reducedMotion, haptics.

## Screens (kickoff §6)

| screen | key pieces | milestone |
|---|---|---|
| Title | shop-front scene, Continue/New Run, settings gear | M1 shell |
| Run HUD | day, CoinCounter, RentChip, moves-left, shelf scene | M1 shell → M2 |
| Delivery draft | 1-of-3 OfferCards, draft → drag to shelf | M2 |
| Restock shop | offers with costs, reroll, sell mode, shelf upgrades | M2 |
| Cascade overlay | CascadeLayer + SpeedControl | M2 |
| Run summary | run stats, best-combo mini-traces, retry CTA | M2 |
| Catalog album | StampFrame grid: 36 items + 20 combos = 56 stamps | M4 |
| Settings | haptics/sound/reduced-motion/colorblind toggles | M5 |
| Daily shelf card | share-card renderer (screenshot-worthy) | M5 |

## Accessibility commitments (kickoff §6)

- Primary actions inside bottom 60% (token `touch.reachZoneBottomFraction`)
- 44 pt minimum targets (`touch.minTargetPt`) — enforced in WoodButton
- Reduced-motion mode per motion spec; colorblind-safe `arrowPalette` (4 hues
  split by hue **and** lightness)
