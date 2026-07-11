import { StyleSheet } from 'react-native';

import { radii, shadows, spacing, typeScale, type Palette } from './tokens';

/**
 * THEME-1 themed factory for the OnboardingHint card surface and its text colors
 * (pure module so the byte-identity test can import it under the node vitest env).
 * Colors read the PASSED palette so `useThemedStyles` re-themes the hint under high
 * contrast; byte-identical at default prefs. Pure-layout entries (overlay, cat)
 * stay in the component's static sheet. `shadows.lifted` bakes `palette.shadow`
 * (not remapped by high contrast) so it stays a token.
 */
export function makeStyles(palette: Palette) {
  return StyleSheet.create({
    card: {
      alignItems: 'center',
      backgroundColor: palette.creamBright,
      borderColor: palette.goldDeep,
      borderRadius: radii.lg,
      borderWidth: 2,
      gap: spacing.md,
      maxWidth: 320,
      padding: spacing.xl,
      ...shadows.lifted,
    },
    heading: { ...typeScale.title, color: palette.ink },
    body: { ...typeScale.body, color: palette.inkSoft, textAlign: 'center' },
    bodyStrong: { color: palette.ink, fontWeight: '800' },
  });
}
