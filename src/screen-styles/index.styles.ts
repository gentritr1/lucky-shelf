import { StyleSheet } from 'react-native';

import { layout, radii, shadows, spacing, type Palette } from '@/ui/tokens';

/**
 * Title-screen sheet as a B-M9 themed factory. Colors read from the passed
 * `palette`; layout/size values are unchanged. The `title` entry keeps only the
 * hero wordmark's fixed size override (a branding constant, not scalable body
 * copy) — its color and type role are supplied by `AppText variant="display"`.
 * Byte-identical at default prefs (`resolvePalette(false) === palette`).
 */
export function makeStyles(palette: Palette) {
  return StyleSheet.create({
    screen: {
      backgroundColor: palette.wallCream,
      flex: 1,
      justifyContent: 'space-between',
      paddingHorizontal: layout.screenPadX,
    },
    gear: {
      alignItems: 'center',
      backgroundColor: palette.plate,
      borderRadius: radii.pill,
      height: 44,
      justifyContent: 'center',
      position: 'absolute',
      right: spacing.xl,
      width: 44,
      zIndex: 10,
      ...shadows.card,
    },
    scrim: {
      backgroundColor: palette.wallCream,
      bottom: 0,
      left: 0,
      opacity: 0.18,
      position: 'absolute',
      right: 0,
      top: 0,
    },
    scene: {
      alignItems: 'center',
      flex: 1,
      justifyContent: 'center',
      gap: spacing.lg,
    },
    catImg: {
      height: 168,
      width: 168,
    },
    titlePlate: {
      alignItems: 'center',
      backgroundColor: palette.plate,
      borderRadius: radii.lg,
      gap: spacing.xxs,
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.md,
      // optical nudge right: the painted window sits left-of-centre, so true-centre
      // reads as leaning left — this rebalances the wordmark against the backdrop
      transform: [{ translateX: spacing.md }],
      ...shadows.card,
    },
    title: {
      // Baloo 2 has very tall natural metrics (~1.58x em); a tight lineHeight clips
      // the ascender hooks (the "f"/"l"/"h" tops read cut off). Give it ~1.35x room
      // so the wordmark sits centred and uncropped. Fixed hero size — the wordmark
      // does not reflow with the large-text pref.
      fontSize: 44,
      lineHeight: 60,
    },
    actions: {
      gap: spacing.md,
    },
    runNotice: {
      backgroundColor: palette.plate,
      borderRadius: radii.md,
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
    },
    secondaryRow: {
      flexDirection: 'row',
      gap: spacing.md,
    },
    grow: {
      flex: 1,
    },
    // Onboarding entry — a compact plate-backed link below the primary actions
    // so it reads over the room art without crowding the New Run button above.
    helpLink: {
      alignItems: 'center',
      alignSelf: 'center',
      backgroundColor: palette.plate,
      borderRadius: radii.pill,
      minHeight: 44,
      justifyContent: 'center',
      paddingHorizontal: spacing.lg,
    },
  });
}
