import { StyleSheet } from 'react-native';

import { borders, layout, radii, shadows, spacing, touch, type Palette } from '@/ui/tokens';

/**
 * Delivery-draft sheet as a B-M9 themed factory. Colors read from the passed
 * `palette`; text color/role moved to the `AppText` call sites. `supplierEmoji`
 * stays here (rendered by a raw <Text>) because it is a decorative emoji glyph
 * with only a fontSize — a documented raw-<Text> exception, like an icon.
 * Byte-identical at default prefs.
 */
export function makeStyles(palette: Palette) {
  return StyleSheet.create({
    screen: {
      backgroundColor: palette.wallCream,
      flex: 1,
      gap: spacing.lg,
      paddingHorizontal: layout.screenPadX,
    },
    scrim: {
      backgroundColor: palette.wallCream,
      bottom: 0,
      left: 0,
      opacity: 0.22,
      position: 'absolute',
      right: 0,
      top: 0,
    },
    topBar: {
      alignItems: 'center',
      backgroundColor: palette.plate,
      borderRadius: radii.lg,
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      ...shadows.card,
    },
    labelPlate: {
      alignSelf: 'flex-start',
      backgroundColor: palette.plate,
      borderRadius: radii.md,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xxs,
    },
    captionPlate: {
      alignItems: 'center',
      alignSelf: 'center',
      backgroundColor: palette.plate,
      borderRadius: radii.md,
      gap: spacing.xxs,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
    },
    back: {
      width: 72,
    },
    spacer: {
      width: 72,
    },
    pickBody: {
      flex: 1,
    },
    pickContent: {
      flexGrow: 1,
      gap: spacing.lg,
      paddingBottom: spacing.lg,
    },
    offers: {
      flexDirection: 'row',
      gap: spacing.md,
    },
    // Solid card so the picker reads cleanly over the busy delivery-room photo
    // (bare text was washing out) and the archetype choice feels like one panel.
    supplierPanel: {
      backgroundColor: palette.creamBright,
      borderColor: palette.parchmentEdge,
      borderRadius: radii.lg,
      borderWidth: borders.hairline,
      gap: spacing.md,
      padding: spacing.lg,
      ...shadows.card,
    },
    supplierScroll: {
      flexGrow: 1,
      paddingBottom: spacing.lg,
    },
    supplierHint: {
      fontSize: 14,
      textAlign: 'center',
    },
    supplierGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
      justifyContent: 'center',
    },
    // Fixed-width tiles so every archetype cell is identical (ICON-2): a 56px
    // accent circle + label. 96px + 8px gap wraps 3 per row on the reference
    // device (3/3/3/1), the last row centered by the grid's justifyContent.
    supplierChip: {
      alignItems: 'center',
      backgroundColor: palette.creamBright,
      borderRadius: radii.md,
      borderWidth: 2,
      gap: spacing.xs,
      justifyContent: 'center',
      minHeight: touch.minTargetPt,
      paddingVertical: spacing.sm,
      width: 96,
      ...shadows.card,
    },
    supplierChipPressed: {
      opacity: 0.7,
      transform: [{ scale: 0.97 }],
    },
    supplierChipText: {
      fontSize: 15,
    },
    caption: {
      textAlign: 'center',
    },
    actions: {
      gap: spacing.md,
      marginTop: 'auto',
    },
  });
}
