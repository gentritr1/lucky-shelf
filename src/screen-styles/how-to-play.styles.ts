import { StyleSheet } from 'react-native';

import { borders, layout, radii, spacing, type Palette } from '@/ui/tokens';

/**
 * How-to-Play sheet (ONB-1) as a B-M9 themed factory. All colors read from the
 * passed `palette`; the mini shelf mock reuses the exact ShelfScene token values
 * (shelfWood board, woodInset wells, woodDark/woodLight/shadow edges, plank) so
 * it reads as the real shelf, not a fresh invention.
 */
export function makeStyles(palette: Palette) {
  return StyleSheet.create({
    screen: {
      backgroundColor: palette.wallCream,
      flex: 1,
      paddingHorizontal: layout.screenPadX,
    },
    // FlatList itself is full-bleed for edge-to-edge paging; per-page padding
    // lives on `page` so swipe momentum reads as whole-screen turns.
    pager: {
      flex: 1,
      marginHorizontal: -layout.screenPadX,
    },
    page: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: layout.screenPadX,
    },
    pageInner: {
      alignItems: 'center',
      gap: spacing.xl,
      maxWidth: 420,
      width: '100%',
    },
    // Big-visual stage — a soft parchment plinth the illustration sits on.
    stage: {
      alignItems: 'center',
      backgroundColor: palette.creamBright,
      borderColor: palette.parchmentEdge,
      borderRadius: radii.lg,
      borderWidth: borders.hairline,
      gap: spacing.md,
      justifyContent: 'center',
      minHeight: 208,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.xl,
      width: '100%',
    },
    heading: {
      textAlign: 'center',
    },
    bodyBlock: {
      alignItems: 'center',
      gap: spacing.xs,
    },
    bodyLine: {
      textAlign: 'center',
    },

    // --- The Loop: four mini steps with arrows. ---
    loopRow: {
      alignItems: 'center',
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
      justifyContent: 'center',
    },
    loopStep: {
      alignItems: 'center',
      backgroundColor: palette.parchment,
      borderColor: palette.parchmentEdge,
      borderRadius: radii.md,
      borderWidth: borders.hairline,
      gap: spacing.xxs,
      minWidth: 68,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.sm,
    },
    stepGlyph: {
      fontSize: 30,
      lineHeight: 36,
    },
    loopArrow: {
      color: palette.goldDeep,
      fontSize: 20,
      fontWeight: '900',
    },

    // --- Items: sprites with coin values. ---
    itemRow: {
      alignItems: 'flex-end',
      flexDirection: 'row',
      gap: spacing.lg,
      justifyContent: 'center',
    },
    itemChip: {
      alignItems: 'center',
      gap: spacing.xs,
    },
    sprite: {
      height: 64,
      width: 64,
    },
    coinPill: {
      alignItems: 'center',
      backgroundColor: palette.parchment,
      borderColor: palette.goldDeep,
      borderRadius: radii.pill,
      borderWidth: borders.hairline,
      flexDirection: 'row',
      gap: spacing.xxs,
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
    },
    coinDot: {
      backgroundColor: palette.coinGold,
      borderColor: palette.goldDeep,
      borderRadius: radii.pill,
      borderWidth: borders.hairline,
      height: 10,
      width: 10,
    },

    // --- Mini shelf mock (Neighbors / Multipliers). Values mirror ShelfScene. ---
    miniBoard: {
      backgroundColor: palette.shelfWood,
      borderColor: palette.woodDark,
      borderRadius: radii.lg,
      borderTopColor: palette.woodLight,
      borderWidth: borders.frame,
      flexDirection: 'row',
      gap: spacing.sm,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.lg,
      paddingBottom: spacing.lg,
      position: 'relative',
    },
    miniWell: {
      alignItems: 'center',
      backgroundColor: palette.woodInset,
      borderColor: palette.woodDark,
      borderRadius: radii.sm,
      borderTopColor: palette.shadow,
      borderWidth: borders.regular,
      height: 72,
      justifyContent: 'center',
      width: 72,
    },
    miniPlank: {
      backgroundColor: palette.woodLight,
      borderBottomColor: palette.woodDark,
      borderBottomWidth: borders.strong,
      borderRadius: radii.xs,
      borderTopColor: palette.sunlight,
      borderTopWidth: borders.hairline,
      bottom: spacing.sm - 4,
      height: 8,
      left: spacing.lg,
      position: 'absolute',
      right: spacing.lg,
    },
    miniSprite: {
      height: 52,
      width: 52,
    },
    // Gold "pays" arrow sitting between two wells.
    payArrow: {
      color: palette.goldDeep,
      fontSize: 26,
      fontWeight: '900',
    },

    // --- Multipliers: gold row-aura band + ×N chips + same-trade sprites. ---
    // Tag-synergy block (block 2): bare same-trade sprites, sized like the
    // well sprites so both blocks share one stage without crowding.
    synergySprite: {
      height: 52,
      width: 52,
    },
    auraBand: {
      backgroundColor: palette.auraGold,
      borderColor: palette.auraGoldEdge,
      borderRadius: radii.sm,
      borderWidth: borders.hairline,
      bottom: spacing.md,
      left: spacing.sm,
      opacity: 0.55,
      position: 'absolute',
      right: spacing.sm,
      top: spacing.md,
    },
    multChip: {
      alignItems: 'center',
      alignSelf: 'center',
      backgroundColor: palette.goldDeep,
      borderRadius: radii.pill,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xxs,
    },

    // --- Named combos: catalog stamp. ---
    comboStamp: {
      alignItems: 'center',
      backgroundColor: palette.parchment,
      borderColor: palette.goldDeep,
      borderRadius: radii.md,
      borderWidth: borders.strong,
      flexDirection: 'row',
      gap: spacing.sm,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
    },

    // --- Rent & survival: ember pill. ---
    rentPill: {
      alignItems: 'center',
      backgroundColor: palette.rentEmber,
      borderColor: palette.emberDark,
      borderRadius: radii.md,
      borderWidth: borders.strong,
      flexDirection: 'row',
      gap: spacing.sm,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
    },
    rentGrow: {
      color: palette.creamBright,
      fontSize: 22,
      fontWeight: '900',
    },

    // --- Daily twists: one row per enabled feature. ---
    twistList: {
      gap: spacing.md,
      width: '100%',
    },
    twistRow: {
      alignItems: 'center',
      backgroundColor: palette.parchment,
      borderColor: palette.parchmentEdge,
      borderRadius: radii.md,
      borderWidth: borders.hairline,
      flexDirection: 'row',
      gap: spacing.md,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
    },
    twistBadge: {
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 44,
    },
    twistGlyph: {
      fontSize: 26,
      lineHeight: 30,
    },
    twistText: {
      flex: 1,
      gap: 2,
    },
    twistMult: {
      color: palette.goldDeep,
      fontWeight: '900',
    },

    // --- Page dots. ---
    dotsRow: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: spacing.sm,
      justifyContent: 'center',
      paddingVertical: spacing.md,
    },
    dot: {
      backgroundColor: palette.parchmentEdge,
      borderRadius: radii.pill,
      height: 8,
    },
    dotActive: {
      backgroundColor: palette.goldDeep,
    },

    footer: {
      gap: spacing.sm,
    },
  });
}
