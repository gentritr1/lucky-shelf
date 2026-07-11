import { StyleSheet } from 'react-native';

import { borders, fonts, radii, shadows, spacing, typeScale, type Palette } from '../tokens';

/**
 * THEME-1 themed factory for CoinCounter's color-bearing styles. Split out to a
 * pure module (only `StyleSheet` + tokens) so the byte-identity test can import it
 * under the node vitest env without dragging in the component's reanimated/RN-view
 * imports. Colors read the PASSED palette (never the module-scope `palette`) so
 * `useThemedStyles` re-themes them under high contrast; byte-identical at default
 * prefs (`resolvePalette(false) === palette`). Pure-layout entries (pillSlam,
 * coinSlam) stay in the component's static sheet. `shadows.float` bakes
 * `palette.shadow` (not remapped by high contrast) so it stays a token.
 */
export function makeStyles(palette: Palette) {
  return StyleSheet.create({
    pill: {
      alignItems: 'center',
      alignSelf: 'flex-start',
      backgroundColor: palette.creamBright,
      borderColor: palette.goldDeep,
      borderRadius: radii.pill,
      borderWidth: borders.regular,
      flexDirection: 'row',
      gap: spacing.sm,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      ...shadows.float,
    },
    coin: {
      backgroundColor: palette.coinGold,
      borderColor: palette.goldDeep,
      borderRadius: radii.pill,
      borderWidth: borders.strong,
      height: 18,
      width: 18,
    },
    amount: {
      // System-font coin role (TYPO-1): SF/Roboto center against the coin dot with
      // no translateY nudge — its glyphs sit centered in a constrained line box.
      ...typeScale.coin,
      color: palette.ink,
    },
    amountSlam: {
      // The larger dayTotal "slam" figure — its own system-font style (not Baloo2's
      // display role). Tabular numerals so the count-up doesn't jitter; centers
      // against the bigger coin dot without a nudge.
      fontFamily: fonts.ui,
      fontSize: 34,
      lineHeight: 42,
      fontWeight: '800',
      fontVariant: ['tabular-nums'],
      color: palette.ink,
    },
  });
}
