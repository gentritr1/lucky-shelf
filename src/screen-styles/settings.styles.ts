import { StyleSheet } from 'react-native';

import { borders, layout, radii, spacing, type Palette } from '@/ui/tokens';

/**
 * Settings sheet as a B-M9 themed factory. Colors read from the passed `palette`
 * (never module-scope `palette`) so `useThemedStyles` can re-theme them for the
 * high-contrast pref; non-color layout values are unchanged. At default prefs
 * `resolvePalette(false) === palette`, so this is byte-identical to the previous
 * static sheet.
 */
export function makeStyles(palette: Palette) {
  return StyleSheet.create({
    screen: {
      backgroundColor: palette.wallCream,
      flex: 1,
      gap: spacing.lg,
      paddingHorizontal: layout.screenPadX,
    },
    panels: {
      gap: spacing.lg,
      paddingBottom: spacing.xl,
    },
    row: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: spacing.md,
      justifyContent: 'space-between',
    },
    rowText: {
      flex: 1,
      gap: spacing.xxs,
    },
    segment: {
      borderColor: palette.parchmentEdge,
      borderRadius: radii.md,
      borderWidth: borders.hairline,
      flexDirection: 'row',
      overflow: 'hidden',
    },
    segmentCell: {
      alignItems: 'center',
      flex: 1,
      paddingVertical: spacing.sm,
    },
    segmentCellOn: {
      backgroundColor: palette.tealDark,
    },
  });
}
