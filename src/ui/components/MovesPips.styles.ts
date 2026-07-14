import { StyleSheet } from 'react-native';

import { type Palette } from '../tokens';

/**
 * THEME-1 themed factory for the MovesPips fill/border colors (pure module so the
 * byte-identity test can import it under the node vitest env). Colors read the
 * PASSED palette so `useThemedStyles` re-themes the pips under high contrast;
 * byte-identical at default prefs. The pip geometry and the "MOVES" label color
 * (an inline `usePalette()` read) live in the component.
 */
export function makeStyles(palette: Palette) {
  return StyleSheet.create({
    pipFilled: {
      backgroundColor: palette.accentTeal,
      borderColor: palette.tealDark,
    },
    pipSpent: {
      backgroundColor: 'transparent',
      borderColor: palette.parchmentEdge,
    },
  });
}
