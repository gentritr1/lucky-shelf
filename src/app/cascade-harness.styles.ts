import { StyleSheet } from 'react-native';

import { radii, shadows, spacing, type Palette } from '@/ui/tokens';

/**
 * Cascade-harness (dev review vehicle) sheet as a B-M9 themed factory. Colors read
 * from the passed `palette`; text color/role and the chip active-state color fork
 * now live on the `AppText` call sites (folded into a conditional `color` prop).
 * The surviving entries here are backgrounds/borders + a couple of fixed caption
 * sizes. Byte-identical at default prefs.
 */
export function makeStyles(palette: Palette) {
  return StyleSheet.create({
    screen: {
      backgroundColor: palette.wallCream,
      flex: 1,
      gap: spacing.md,
      paddingHorizontal: spacing.lg,
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
    picker: {
      gap: spacing.sm,
      paddingVertical: spacing.xs,
    },
    chip: {
      backgroundColor: palette.creamBright,
      borderColor: palette.parchmentEdge,
      borderRadius: radii.md,
      borderWidth: 1,
      maxWidth: 150,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      ...shadows.float,
    },
    chipActive: {
      borderColor: palette.accentTeal,
      borderWidth: 2,
    },
    chipTitle: {
      fontSize: 13,
    },
    body: {
      gap: spacing.lg,
      paddingTop: spacing.sm,
    },
    notesCard: {
      backgroundColor: palette.creamBright,
      borderColor: palette.parchmentEdge,
      borderRadius: radii.md,
      borderWidth: 1,
      gap: spacing.xs,
      padding: spacing.md,
    },
    rentRow: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: spacing.md,
      justifyContent: 'space-between',
    },
    rentText: {
      flex: 1,
      gap: spacing.xxs,
    },
    rentHint: {
      fontSize: 13,
    },
  });
}
