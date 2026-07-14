import { StyleSheet } from 'react-native';

import { borders, type Palette } from '../tokens';

/**
 * THEME-1 themed factory for WoodButton's color-bearing styles (pure module so the
 * byte-identity test can import it under the node vitest env). Colors read the
 * PASSED palette so `useThemedStyles` re-themes them under high contrast;
 * byte-identical at default prefs. Pure-layout entries (base, disabled) stay in
 * the component's static sheet.
 */
export function makeStyles(palette: Palette) {
  return StyleSheet.create({
    primary: {
      backgroundColor: palette.shelfWood,
      borderColor: palette.sunlight,
      borderTopWidth: borders.strong,
    },
    secondary: {
      backgroundColor: palette.parchment,
      borderColor: palette.parchmentEdge,
      borderWidth: borders.hairline,
    },
    labelPrimary: {
      color: palette.creamBright,
    },
    labelSecondary: {
      color: palette.ink,
    },
  });
}
