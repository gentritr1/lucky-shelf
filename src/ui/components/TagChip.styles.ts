import { StyleSheet } from 'react-native';

import { radii, spacing, type Palette } from '../tokens';

/**
 * THEME-1 themed factory for TagChip (pure module so the byte-identity test can
 * import it under the node vitest env). Colors read the PASSED palette so
 * `useThemedStyles` re-themes the pill under high contrast; byte-identical at
 * default prefs. Every entry bears color, so the whole sheet is themed.
 */
export function makeStyles(palette: Palette) {
  return StyleSheet.create({
    chip: {
      alignSelf: 'flex-start',
      backgroundColor: palette.parchment,
      borderRadius: radii.pill,
      // Compact horizontal padding so two tags fit one row in the tight offer card
      // (the sole consumer); unified tag size stays 10 (see `text`).
      paddingHorizontal: spacing.xs,
      paddingVertical: 1,
    },
    accent: {
      backgroundColor: palette.tealDark,
    },
    text: {
      color: palette.inkFaint,
      // Size 9 (not 10): the offer card is ~95pt wide and "food perishable" wraps
      // at 10. TagChip had no other consumer, so there was nothing to match at 10 —
      // this makes the shared tag the size that fits, dedup with no visual change.
      fontSize: 9,
      fontWeight: '600',
    },
    accentText: {
      color: palette.creamBright,
    },
  });
}
