import { StyleSheet } from 'react-native';

import { borders, radii, spacing, typeScale, type Palette } from '../tokens';

/**
 * THEME-1 themed factory for ShelfPreview's color-bearing styles (pure module so
 * the byte-identity test can import it under the node vitest env). Colors read the
 * PASSED palette so `useThemedStyles` re-themes the shelf under high contrast;
 * byte-identical at default prefs. Pure-layout entries (rowWrap, row, item, glyph)
 * stay in the component's static sheet.
 */
export function makeStyles(palette: Palette) {
  return StyleSheet.create({
    frame: {
      backgroundColor: palette.shelfWood,
      borderColor: palette.woodDark,
      borderRadius: radii.lg, // top-level surface
      borderWidth: borders.frame,
      gap: spacing.sm,
      padding: spacing.md,
    },
    slot: {
      alignItems: 'center',
      aspectRatio: 1,
      backgroundColor: palette.woodInset,
      borderRadius: radii.sm,
      flex: 1,
      justifyContent: 'center',
    },
    plank: {
      backgroundColor: palette.woodLight,
      borderBottomColor: palette.woodDark,
      borderBottomWidth: borders.strong,
      borderRadius: radii.xs,
      height: 8,
      marginTop: spacing.xs,
    },
    valueBadge: {
      backgroundColor: palette.coinGold,
      borderColor: palette.goldDeep,
      borderRadius: radii.pill,
      borderWidth: borders.hairline,
      marginTop: -spacing.xs,
      paddingHorizontal: spacing.sm,
    },
    valueText: {
      ...typeScale.label,
      color: palette.ink,
      letterSpacing: 0,
    },
  });
}
