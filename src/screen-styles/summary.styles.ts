import { StyleSheet } from 'react-native';

import { borders, layout, radii, spacing, type Palette } from '@/ui/tokens';

/**
 * Run-summary sheet as a B-M9 themed factory. Colors read from the passed
 * `palette`. Text renders through `AppText`; the color-bearing entries here are
 * parametrized so the rendered output stays on-theme.
 *
 * SUM-1 structure: three deliberate groups — a centered verdict HERO, a stats
 * CARD (Panel) whose rows share one right-alignment edge with a fixed-height
 * caption slot so no row goes ragged, and a quiet TEASER card (SUM-2: no accent
 * bar) that reads as "coming up next", subordinate to the stats card.
 */
export function makeStyles(palette: Palette) {
  return StyleSheet.create({
    screen: {
      backgroundColor: palette.wallCream,
      flex: 1,
      gap: spacing.lg,
      paddingHorizontal: layout.screenPadX,
    },
    topBar: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    back: {
      width: 72,
    },
    spacer: {
      width: 72,
    },
    bodyScroll: {
      flex: 1,
    },
    body: {
      flexGrow: 1,
      gap: layout.sectionGap,
      // flex-start (not center): the restructured content — hero + full stats
      // card + teaser — is tall enough that centering pushed the teaser into the
      // scroll boundary against the action buttons. Top-anchored + scrollable.
      justifyContent: 'flex-start',
      paddingVertical: spacing.lg,
    },

    // --- Verdict hero: one centered block with deliberate internal spacing. ---
    hero: {
      alignItems: 'center',
      gap: spacing.xs,
    },
    heroDay: {
      marginTop: spacing.xxs,
    },
    seed: {
      letterSpacing: 1,
      marginTop: spacing.xs,
    },
    // Build recap: an accent tag icon beside the recap text, centered as one row.
    recapRow: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: spacing.xs,
      justifyContent: 'center',
      marginTop: spacing.sm,
    },
    recap: {
      fontWeight: '700',
    },
    // The near-miss is the emotional sting — give it room to breathe below the
    // recap and above the stats card, so it doesn't butt against either.
    nearMiss: {
      fontWeight: '700',
      marginTop: spacing.sm,
    },
    // Daily streak: a fire icon beside the streak text, centered as one row.
    streakRow: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: spacing.xs,
      justifyContent: 'center',
      marginTop: spacing.xs,
    },
    streak: {
      fontWeight: '700',
    },

    // --- Stats card: label left, value right on a shared alignment edge. ---
    statsCard: {
      gap: spacing.sm,
    },
    statRow: {
      alignItems: 'flex-start',
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    // Label sits vertically centered against the value slot's height so it lines
    // up with the pill / number, not with the caption beneath.
    statLabelSlot: {
      flex: 1,
      justifyContent: 'center',
      minHeight: spacing.huge,
      paddingRight: spacing.md,
    },
    // Right column. Every child right-aligns; because the row is space-between,
    // this column's right edge is pinned to the card's inner right edge — so the
    // value line of EVERY row shares that one alignment edge regardless of shape.
    // `stretch` (not flex-end): both slots span the column's width so their
    // internal justifyContent:flex-end right-aligns the value AND the caption to
    // the SAME right edge — otherwise each slot shrink-wraps and the wider caption
    // juts out past the narrower value.
    statValueCol: {
      alignItems: 'stretch',
    },
    // Value line: a row so a CoinCounter pill (whose own alignSelf is flex-start)
    // is pushed right by justifyContent instead of collapsing left. Fixed height
    // so a bare number row and a pill row sit at the same vertical rhythm.
    valueSlot: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'flex-end',
      // huge, not giant: pill rows exceed the min anyway (pill ≈ 38pt), and the
      // smaller floor lets bare-number rows shrink so the whole card plus the
      // unlock teaser stays above the fold on the reference device (SUM-1 review).
      minHeight: spacing.huge,
    },
    // Caption slot: rendered only when a row HAS a caption (summary.tsx) — the
    // shared right edge lives in valueSlot, so caption-less rows don't pay the
    // extra height.
    captionSlot: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'flex-end',
      minHeight: spacing.lg,
    },
    // Small-caps metadata eyebrow (SUM-2): letterspaced so "RECORD · 25" /
    // "YOUR BEST" read as one deliberate quiet unit, not a stray label + number.
    bestCaption: {
      color: palette.inkFaint,
      letterSpacing: 1,
    },
    // The celebratory "New record!" — star icon beside the gold text, as one row.
    recordRow: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: spacing.xxs,
    },
    recordText: {
      color: palette.goldDeep,
    },

    // --- Next-unlock teaser: a quiet full-hairline card (SUM-2), subordinate to
    // the stats card. No accent bar, no wood tones — clearly not a button. ---
    teaser: {
      alignItems: 'stretch',
      backgroundColor: palette.creamBright,
      borderColor: palette.parchmentEdge,
      borderRadius: radii.md,
      borderWidth: borders.hairline,
      flexDirection: 'row',
      overflow: 'hidden',
    },
    teaserInner: {
      alignItems: 'center',
      flex: 1,
      flexDirection: 'row',
      gap: spacing.md,
      padding: spacing.md,
    },
    // Silhouette thumb sits in a soft parchment circle so the locked item reads
    // as "coming up" without a loud tile.
    teaserThumbCircle: {
      alignItems: 'center',
      backgroundColor: palette.parchment,
      borderColor: palette.parchmentEdge,
      borderRadius: radii.pill,
      borderWidth: borders.hairline,
      height: 48,
      justifyContent: 'center',
      width: 48,
    },
    teaserThumb: { height: 32, tintColor: palette.inkFaint, width: 32 },
    teaserThumbDot: {
      backgroundColor: palette.inkFaint,
      borderRadius: radii.pill,
      height: 28,
      width: 28,
    },
    teaserText: { flex: 1, gap: spacing.xxs },

    actions: {
      gap: spacing.md,
      marginTop: 'auto',
    },
  });
}
