import { StyleSheet } from 'react-native';

import { borders, radii, spacing, touch, type Palette } from './tokens';

/** Runtime-themed, inline first-run note. It deliberately has no fixed height:
 * AppText can grow to 130% and the surrounding screen decides whether to scroll. */
export function makeStyles(palette: Palette) {
  return StyleSheet.create({
    card: {
      alignItems: 'center',
      alignSelf: 'stretch',
      backgroundColor: palette.sunlight,
      borderColor: palette.goldDeep,
      borderRadius: radii.md,
      borderWidth: borders.hairline,
      flexDirection: 'row',
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    copy: {
      flex: 1,
      gap: spacing.xxs,
    },
    skip: {
      alignItems: 'center',
      borderRadius: radii.pill,
      justifyContent: 'center',
      minHeight: touch.minTargetPt,
      minWidth: touch.minTargetPt,
      paddingHorizontal: spacing.xs,
    },
    skipPressed: {
      backgroundColor: palette.parchment,
    },
  });
}
