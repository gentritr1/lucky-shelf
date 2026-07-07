# Lucky Shelf — layout & nesting design system

The single source is `src/ui/tokens.ts` (`layout`, `borders`, `radii`, `innerRadius`).
Screens and components theme from these, never from raw numbers, so insets stay
identical everywhere and nested borders read as one intentional system. If you find
yourself hand-tuning a padding or a radius on one screen, add/adjust a token instead.

## 1. Screen rhythm — `layout`

Every screen uses the same edge inset and stacking gaps:

| token | value | use |
|---|---|---|
| `screenPadX` | 20 (`xl`) | horizontal edge inset — **every** screen |
| `screenTopGap` | 12 (`md`) | below the safe-area top (`insets.top + screenTopGap`) |
| `screenBottomGap` | 20 (`xl`) | above the safe-area bottom (`insets.bottom + screenBottomGap`) |
| `sectionGap` | 16 (`lg`) | between major stacked sections |
| `stackGap` | 12 (`md`) | between panels / within a section |
| `controlGap` | 8 (`sm`) | between small inline controls |
| `cardPad` | 16 (`lg`) | inner padding of a panel/card surface |

## 2. Border weight — `borders`

A nested border is **never thicker than its parent's**. Top of the hierarchy down:

| token | width | use |
|---|---|---|
| `frame` | 3 | the shelf frame (top of the hierarchy) |
| `strong` | 2 | selected / emphasis states, front-lip highlights |
| `regular` | 1.5 | recessed wells, chips, pills |
| `hairline` | 1 | default card / plinth outline |

## 3. Corner radius — the ladder + concentric rule

Radii step **one tier per nesting level**:

```
lg 16  top-level surface   (Panel, OfferCard, shelf frame, title plate, share card)
 └ md 12  one level in      (item plinth, offer sprite-mat)
    └ sm 8   wells, chips-in-cards
       └ xs 4   pips, planks
pill   fully-round pills & dots (coins, tags, moves)
```

**Concentric rule.** When a child is *inset by `pad`* inside a rounded parent, its
radius should be `parentRadius − pad` so the corner gap stays uniform — use
`innerRadius(parentRadius, pad)`. When a child is *centered* (not hugging the
parent's edge), just step down one tier from the ladder above.

```ts
// edge-hugging child inset by cardPad inside an lg surface:
borderRadius: innerRadius(radii.lg, layout.cardPad)
// centered child of an lg card:
borderRadius: radii.md
```

## Text over backdrop imagery — legibility plates

Bare text never reads cleanly on a painterly backdrop, and cranking a full-screen
scrim just muddies the art. Instead: keep the wash light (~0.18–0.22) and give each
text/control group its **own** plate — `backgroundColor: palette.plate`
(translucent creamBright), a ladder radius, and small padding. Opaque content
(cards, `WoodButton`) needs no plate. Examples: the title wordmark plate + gear
disc (`index.tsx`), the draft header bar + label/caption plates (`draft.tsx`).
Text over plain cream screens needs no plate.

## Adding a new surface — checklist

1. Edge inset? → `layout.screenPadX` / `screenTopGap` / `screenBottomGap`.
2. It's a floating card/panel? → radius `radii.lg`, border `borders.hairline`, padding `layout.cardPad`.
3. Something nested inside it? → step the radius down one tier (or `innerRadius`), and the border down the `borders` ladder.
4. Gaps between things? → `sectionGap` (major) / `stackGap` (within) / `controlGap` (inline).
5. Never write a raw `borderRadius: 22` / `borderWidth: 2.5` / `padding: 24` — reach for a token.
