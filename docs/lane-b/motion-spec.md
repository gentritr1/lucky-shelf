# Lane B — Drag-and-Drop & Motion Spec (v1, proposed at M0)

Values, not vibes. Everything here is encoded in `src/ui/tokens.ts` (`motion`,
`hapticMap`, `cascadeEscalation`); implementation lands at M1 with Reanimated +
Gesture Handler + Skia. Reduced-motion mode: springs become 1-frame timing,
durations clamp to 0, haptics stay (they ARE the reduced-motion channel).

## 1. Grab

| property | value |
|---|---|
| lift scale | 1.0 → 1.08, spring `grab` (damping 18, stiffness 220, mass 0.9) |
| lift translateY | −6 pt |
| shadow | `card` → `lifted` (radius 6→14, opacity .18→.28) crossfade 140 ms |
| tilt | ±3° max, proportional to drag velocity, spring back at rest |
| neighbors part | ±6 pt away from grabbed slot, spring `neighborPart` |
| haptic | `grabLift` = impact-light, fired on gesture activation |

## 2. Drag

- Item tracks the finger 1:1 — zero smoothing lag on position (lag reads as broken).
- Slot highlight: nearest legal slot glows `slotLegal` at 40% opacity, 600 ms
  breathing loop; illegal targets glow `slotIllegal`. Glow decided by contract
  legality only (UI never computes rules — legality = "slot empty").
- Sticky items: grab gesture on a sticky item gives 4 pt of travel then resists
  (rubber tension), `invalidReturn` haptic at release. Sticky is taught by feel.

## 3. Drop

| case | motion | haptic |
|---|---|---|
| legal | settle spring `settle` (damping 14, stiffness 260), ~4% overshoot, ≈220 ms; neighbors return | `dropSettle` impact-light + `placementTick` selection on rest |
| illegal | return to origin over 320 ms, easing `rubber` (0.2, 0.9, 0.3, 1.1) | `invalidReturn` notification-error |
| onto occupied slot | treated as illegal in v1 (swap gesture is an M2 question for Fable) | — |

## 4. Cascade (consumes ScoringTrace verbatim)

- Event cadence: 260 ms per trace event at 1×; speed control 1× / 2× (130 ms) /
  skip (jump to `dayTotal`, single slam).
- `itemBase`: slot pulses 1.0→1.06→1.0, value tag pops in (easing `out`, 120 ms).
- `ruleFire`: arrow draws source→target over 180 ms (arrowPalette cycles per
  source), count-up ticks on the **beneficiary** slot (freeze R-6) over 120 ms.
- `rowAura`: row-wide glow sweep left→right 240 ms; glow persists until
  `dayTotal` (freeze R-9 — attribution must survive the whole cascade).
- `comboNamed`: banner drops with easing `overshoot`, 600 ms, `comboBanner`
  haptic; contributing slots twinkle.
- `itemTotal`: total stamps onto the slot, `float` shadow tick.
- `transform` / `vanish`: 300 ms morph / puff after totals, before dayTotal.
- `dayTotal`: coin counter slam, `dayTotalSlam` impact-heavy.
- **Haptic escalation** (`cascadeEscalation`): step haptic is impact-light below
  runningTotal 25, impact-medium 25–59, impact-heavy at 60+. Audio pitch ladder
  follows the same thresholds (placeholder sounds until M3).

## 5. Ambient

- Idle micro-motion (M1, Skia): items breathe ≤1.5% scale on 3–5 s randomized
  loops; Shop Cat tail flick every 6–9 s. Budget: 60 fps, ≤2 ms/frame total.
- Rent proximity: RentChip tone steps parchment → sunlight → ember at
  dueInDays 3/2/1 (M0, shipped); room-wide dusk/warm dim is the M4 ambience pass.
- `rentThud` impact-heavy on the rent-due morning card.

## Open questions for Fable

1. Drag onto an occupied slot: hard-illegal (v1) or swap-with-displaced-item?
2. Cascade default speed for first-time players — 1× with speed control hidden
   until run 2, or always visible?
3. May the cascade be skipped on rent-due days? (Tension argues no.)
