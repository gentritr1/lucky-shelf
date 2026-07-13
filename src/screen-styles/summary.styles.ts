import { StyleSheet } from 'react-native';

import { borders, layout, radii, shadows, spacing, type Palette } from '@/ui/tokens';

/**
 * Run-summary sheet as a B-M9 themed factory. Colors read from the passed
 * `palette`. Text renders through `AppText`; the color-bearing entries here are
 * parametrized so the rendered output stays on-theme.
 *
 * B-M13 "Receipt Ledger": the summary's stats block is now a paper receipt card —
 * a store header, the run's story as ledger rows (label · rule leader · value),
 * and an italic sign-off, with a serrated deckle bottom edge (paper-colored
 * downward triangles). Same DATA and render order as SUM-1 — the paper is chrome,
 * not new stats. Deckle is border-triangle Views (no SVG/Skia, no new deps); it
 * re-themes in HC (creamBright) and grows with 130% text (the paper is the
 * container, not a fixed box).
 */

/** Deckle tooth geometry (module scope so the component can render the right count). */
export const DECKLE_TOOTH = 14;
export const DECKLE_HEIGHT = 8;

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
      gap: spacing.sm,
      justifyContent: 'flex-start',
      paddingVertical: spacing.xs,
    },

    // --- The paper receipt card. Top corners rounded; the bottom is left square
    // so the deckle teeth attach flush beneath it. ---
    receiptOuter: {
      alignSelf: 'stretch',
    },
    receiptPaper: {
      backgroundColor: palette.creamBright,
      borderTopLeftRadius: radii.lg,
      borderTopRightRadius: radii.lg,
      gap: spacing.xs,
      paddingBottom: spacing.sm,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      ...shadows.card,
    },
    // Serrated bottom edge: a clipped row of paper-colored downward triangles.
    deckleRow: {
      flexDirection: 'row',
      overflow: 'hidden',
    },
    deckleTooth: {
      borderLeftColor: 'transparent',
      borderLeftWidth: DECKLE_TOOTH / 2,
      borderRightColor: 'transparent',
      borderRightWidth: DECKLE_TOOTH / 2,
      borderTopColor: palette.creamBright,
      borderTopWidth: DECKLE_HEIGHT,
      height: 0,
      width: 0,
    },

    // --- Store header: clover mark + wordmark + a warm sub-line. Decorative
    // chrome only (no data, no dates). ---
    receiptHeader: {
      alignItems: 'center',
      gap: spacing.xxs,
    },
    receiptStore: {
      letterSpacing: 1.5,
    },
    receiptThanks: {
      fontStyle: 'italic',
      letterSpacing: 0.3,
    },

    // --- Outcome block (the old hero, now the receipt's opening story). ---
    outcome: {
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
    nearMiss: {
      fontWeight: '700',
      marginTop: spacing.sm,
    },
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

    // A dividing rule between the outcome and the ledger.
    receiptRule: {
      alignSelf: 'stretch',
      borderBottomColor: palette.parchmentEdge,
      borderBottomWidth: borders.hairline,
      marginVertical: spacing.xs,
    },

    // --- Ledger: label left, a rule leader, value right; caption (record/best)
    // beneath the value. ---
    ledger: {
      gap: spacing.xs,
    },
    statRow: {
      gap: spacing.xxs,
    },
    ledgerLine: {
      alignItems: 'flex-end',
      flexDirection: 'row',
      gap: spacing.sm,
    },
    // The dotted/rule leader that carries the eye from label to value; a solid
    // hairline (renders identically on both platforms, unlike a 1-side dotted
    // border) sitting on the text baseline.
    leader: {
      borderBottomColor: palette.parchmentEdge,
      borderBottomWidth: borders.hairline,
      flex: 1,
      marginBottom: spacing.xs,
    },
    valueSlot: {
      alignItems: 'center',
      flexDirection: 'row',
    },
    // Caption slot beneath the value, right-aligned to the value's edge.
    captionSlot: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'flex-end',
      minHeight: spacing.md,
    },
    bestCaption: {
      color: palette.inkFaint,
      letterSpacing: 1,
    },
    // "New record!" — a small star + gold label, a stamp beneath its value.
    recordRow: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: spacing.xxs,
    },
    recordText: {
      color: palette.goldDeep,
    },

    // Handwritten sign-off at the foot of the receipt.
    signoff: {
      fontStyle: 'italic',
      marginTop: spacing.sm,
    },

    // --- Next-unlock teaser: a quiet full-hairline card (SUM-2), subordinate to
    // the receipt. No accent bar, no wood tones — clearly not a button. ---
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
    // Secondary row: two equal-width buttons side by side beneath the primary.
    actionRow: {
      flexDirection: 'row',
      gap: spacing.md,
    },
    actionHalf: {
      flex: 1,
    },
  });
}
