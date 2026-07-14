import { StyleSheet } from 'react-native';

import { borders, layout, radii, shadows, type Palette } from '../tokens';

/**
 * THEME-1 themed factory for the Panel surface (pure module so the byte-identity
 * test can import it under the node vitest env). Colors read the PASSED palette so
 * `useThemedStyles` re-themes the surface under high contrast; byte-identical at
 * default prefs. `shadows.card` bakes `palette.shadow`, which high contrast does
 * not remap, so it stays a token.
 */
export function makeStyles(palette: Palette) {
  return StyleSheet.create({
    panel: {
      backgroundColor: palette.creamBright,
      borderColor: palette.parchmentEdge,
      borderRadius: radii.lg, // top-level surface
      borderWidth: borders.hairline,
      gap: layout.stackGap,
      padding: layout.cardPad,
      ...shadows.card,
    },
  });
}
