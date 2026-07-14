import { StyleSheet } from 'react-native';

import { borders, layout, radii, shadows, spacing, type Palette } from '@/ui/tokens';

/**
 * B-M14 Picture Gallery sheet — a themed factory (B-M9 pattern): every color reads
 * the PASSED palette so the screen re-themes under high contrast. The gallery is a
 * flagged additive surface, so there is no byte-identity baseline to preserve; it
 * simply follows the store's cream/parchment/wood language.
 */
export function makeStyles(palette: Palette) {
  return StyleSheet.create({
    screen: { backgroundColor: palette.wallCream, flex: 1, paddingHorizontal: layout.screenPadX },
    content: { gap: layout.sectionGap, paddingTop: spacing.md },

    intro: { gap: spacing.xxs, paddingHorizontal: spacing.xs },

    // --- Painting card ---
    card: { gap: spacing.md },
    cardHeader: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm, justifyContent: 'space-between' },
    cardTitleWrap: { flex: 1, gap: spacing.xxs },
    hungPill: {
      alignItems: 'center',
      backgroundColor: palette.parchment,
      borderRadius: radii.pill,
      flexDirection: 'row',
      gap: spacing.xxs,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xxs,
    },

    // The square image well the reveal grid / full painting lives in.
    imageWell: {
      alignSelf: 'stretch',
      backgroundColor: palette.woodInset,
      borderColor: palette.woodDark,
      borderRadius: radii.md,
      borderWidth: borders.regular,
      overflow: 'hidden',
    },
    fullImage: { height: '100%', width: '100%' },

    // Reveal grid: rows of windowed cells.
    gridRow: { flexDirection: 'row' },
    gridCell: { overflow: 'hidden' },
    // Unrevealed cell: recessed parchment silhouette with a hairline seam.
    cellHidden: {
      backgroundColor: palette.parchment,
      borderColor: palette.parchmentEdge,
      borderWidth: StyleSheet.hairlineWidth,
    },
    cellHiddenDot: {
      backgroundColor: palette.parchmentEdge,
      borderRadius: radii.pill,
      opacity: 0.5,
    },
    cellSeam: {
      borderColor: palette.woodDark,
      borderRightWidth: StyleSheet.hairlineWidth,
      borderBottomWidth: StyleSheet.hairlineWidth,
      opacity: 0.35,
    },

    caption: { gap: spacing.xxs },
    // B-M16: the caption text takes the remaining width and WRAPS; the fraction
    // never shrinks, so long captions + large fractions ("of 16") coexist at 130%
    // without the trailing fraction being clipped off the right edge.
    captionRow: { alignItems: 'flex-start', flexDirection: 'row', gap: spacing.sm, justifyContent: 'space-between' },
    captionText: { flex: 1 },
    captionFraction: { flexShrink: 0, textAlign: 'right' },
    progressTrack: {
      backgroundColor: palette.parchment,
      borderRadius: radii.pill,
      flex: 1,
      height: 6,
      overflow: 'hidden',
    },
    progressFill: { backgroundColor: palette.accentTeal, borderRadius: radii.pill, height: '100%' },

    flavor: { fontStyle: 'italic' },
    actionsRow: { flexDirection: 'row', gap: spacing.sm },
    grow: { flex: 1 },

    // --- Assembly ceremony modal ---
    modalScrim: {
      alignItems: 'center',
      backgroundColor: palette.scrim,
      flex: 1,
      justifyContent: 'center',
      padding: layout.screenPadX,
    },
    modalCard: {
      alignItems: 'center',
      backgroundColor: palette.creamBright,
      borderColor: palette.goldDeep,
      borderRadius: radii.lg,
      borderWidth: borders.strong,
      gap: spacing.md,
      maxWidth: 420,
      padding: layout.cardPad,
      width: '100%',
      ...shadows.lifted,
    },
    modalTitleRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm, justifyContent: 'space-between', width: '100%' },
    modalClose: { padding: spacing.xxs },

    puzzleFrame: {
      backgroundColor: palette.woodInset,
      borderColor: palette.woodDark,
      borderRadius: radii.sm,
      borderWidth: borders.strong,
      overflow: 'hidden',
    },
    puzzleRow: { flexDirection: 'row' },
    puzzleTile: { overflow: 'hidden' },
    puzzleTileSeam: { borderColor: palette.woodDark, borderRightWidth: 1, borderBottomWidth: 1 },
    puzzleGap: { backgroundColor: palette.woodDark },

    solvedBanner: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: spacing.xs,
      justifyContent: 'center',
    },
    modalActions: { alignSelf: 'stretch', gap: spacing.sm },
    hint: { textAlign: 'center' },
  });
}
