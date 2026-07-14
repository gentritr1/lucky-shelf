import { StyleSheet } from 'react-native';

import { radii, type Palette } from '../tokens';

/**
 * THEME-1 themed factory for RentChip's tone backgrounds/borders and their text
 * colors (pure module so the byte-identity test can import it under the node
 * vitest env). Colors read the PASSED palette so `useThemedStyles` re-themes the
 * chip under high contrast; byte-identical at default prefs. Pure-layout entries
 * (chip, due) stay in the component's static sheet.
 */
export function makeStyles(palette: Palette) {
  return StyleSheet.create({
    calm: {
      backgroundColor: palette.parchment,
      borderColor: palette.parchmentEdge,
    },
    warm: {
      backgroundColor: palette.sunlight,
      borderColor: palette.goldDeep,
    },
    alarm: {
      backgroundColor: palette.rentEmber,
      borderColor: palette.emberDark,
    },
    calmText: { color: palette.inkSoft },
    warmText: { color: palette.ink },
    alarmText: { color: palette.creamBright },
    // B-M16 rent-eve ember glow: an emberDark film the pulse breathes over the
    // alarm chip (opacity riding the pulse value — never rendered when calm).
    emberGlow: { backgroundColor: palette.emberDark, borderRadius: radii.pill },
  });
}
