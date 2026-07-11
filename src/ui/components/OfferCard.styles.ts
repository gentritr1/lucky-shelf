import { StyleSheet } from 'react-native';

import { borders, radii, shadows, spacing, typeScale, type Palette } from '../tokens';

/**
 * THEME-1 themed factory for OfferCard's color-bearing styles (pure module so the
 * byte-identity test can import it under the node vitest env). Colors read the
 * PASSED palette so `useThemedStyles` re-themes the card under high contrast;
 * byte-identical at default prefs. Pure-layout entries (glyph, sprite, pips,
 * footer, tags) stay in the component's static sheet. `shadows.card`/`shadows.lifted`
 * bake `palette.shadow` (not remapped by high contrast) so they stay tokens.
 */
export function makeStyles(palette: Palette) {
  return StyleSheet.create({
    card: {
      alignItems: 'center',
      backgroundColor: palette.creamBright,
      borderColor: palette.parchmentEdge,
      borderRadius: radii.lg, // top-level surface
      borderWidth: borders.hairline,
      flex: 1,
      gap: spacing.xs,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.md,
      ...shadows.card,
    },
    selected: {
      // Stronger "selected" read against the busy room backdrop: a thick teal ring
      // and a lift. The scale-up is animated (see animStyle) so it springs in.
      borderColor: palette.accentTeal,
      borderWidth: borders.strong + 1,
      ...shadows.lifted,
    },
    spriteMat: {
      alignItems: 'center',
      backgroundColor: palette.wallCream,
      borderRadius: radii.md, // centered child of an lg card → one tier down
      height: 60,
      justifyContent: 'center',
      padding: spacing.xs,
      width: 60,
    },
    name: {
      ...typeScale.label,
      color: palette.ink,
      letterSpacing: 0.2,
      textTransform: 'none',
    },
    pip: {
      backgroundColor: palette.goldDeep,
      borderRadius: radii.pill,
      height: 5,
      width: 5,
    },
    coinDot: {
      backgroundColor: palette.coinGold,
      borderColor: palette.goldDeep,
      borderRadius: radii.pill,
      borderWidth: borders.regular,
      height: 12,
      width: 12,
    },
    value: {
      // System-font coin role (TYPO-1): centers against the coin dot, no nudge.
      ...typeScale.coin,
      fontSize: 16,
      lineHeight: 20,
      color: palette.ink,
    },
  });
}
