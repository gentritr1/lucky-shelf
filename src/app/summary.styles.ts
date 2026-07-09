import { StyleSheet } from 'react-native';

import { layout, radii, spacing, type Palette } from '@/ui/tokens';

/**
 * Run-summary sheet as a B-M9 themed factory. Colors read from the passed
 * `palette`. Text already renders through `AppText`; the color-bearing entries
 * here (`bestCaption`, `recordText`, tint/background) are preserved exactly
 * (parametrized) so the rendered output is byte-identical at default prefs.
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
      gap: spacing.md,
      justifyContent: 'center',
      paddingVertical: spacing.sm,
    },
    seed: {
      letterSpacing: 1,
    },
    recap: {
      fontWeight: '700',
    },
    nearMiss: {
      fontWeight: '700',
    },
    streak: {
      fontWeight: '700',
    },
    stats: {
      gap: spacing.md,
      marginTop: spacing.sm,
    },
    statRow: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
      minHeight: spacing.giant,
    },
    bestRight: {
      alignItems: 'flex-end',
      gap: spacing.xxs,
    },
    bestCaption: {
      color: palette.inkFaint,
    },
    recordText: {
      color: palette.goldDeep,
    },
    teaser: {
      alignItems: 'center',
      backgroundColor: palette.parchment,
      borderRadius: radii.md,
      flexDirection: 'row',
      gap: spacing.md,
      marginTop: spacing.sm,
      padding: spacing.md,
    },
    teaserThumb: { height: 40, tintColor: palette.inkFaint, width: 40 },
    teaserThumbBox: {
      backgroundColor: palette.inkFaint,
      borderRadius: radii.sm,
      height: 40,
      width: 40,
    },
    teaserText: { flex: 1, gap: spacing.xxs },
    actions: {
      gap: spacing.md,
      marginTop: 'auto',
    },
  });
}
