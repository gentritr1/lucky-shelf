import { StyleSheet } from 'react-native';

import { radii, shadows, spacing, type Palette } from '@/ui/tokens';

// Responsive frame: portrait is the whole design, so on wider viewports we center
// a phone-width column against a warm backdrop (like the shop sitting on a wooden
// counter) instead of stretching the UI. On phones (< COLUMN_MAX) the column is
// full-bleed, so mobile is untouched.
const COLUMN_MAX = 460;

/**
 * Root-frame sheet as a B-M9 themed factory. Colors read from the passed
 * `palette` so the app frame re-themes with the high-contrast pref in step with
 * the screens it wraps. Byte-identical at default prefs.
 */
export function makeStyles(palette: Palette) {
  return StyleSheet.create({
    root: {
      flex: 1,
    },
    backdrop: {
      alignItems: 'center',
      backgroundColor: palette.woodDark,
      flex: 1,
    },
    column: {
      backgroundColor: palette.wallCream,
      flex: 1,
      maxWidth: COLUMN_MAX,
      overflow: 'hidden',
      width: '100%',
      ...shadows.lifted,
    },
    saveBanner: {
      alignItems: 'center',
      backgroundColor: palette.emberDark,
      borderRadius: radii.md,
      flexDirection: 'row',
      gap: spacing.md,
      justifyContent: 'space-between',
      left: spacing.md,
      minHeight: 44,
      paddingHorizontal: spacing.md,
      position: 'absolute',
      right: spacing.md,
      zIndex: 20,
      ...shadows.float,
    },
    saveBannerText: {
      flex: 1,
    },
    saveRetry: {
      alignItems: 'center',
      backgroundColor: palette.creamBright,
      borderRadius: radii.pill,
      justifyContent: 'center',
      minHeight: 44,
      minWidth: 64,
      paddingHorizontal: spacing.md,
    },
    saveRetryPressed: {
      opacity: 0.75,
    },
  });
}
