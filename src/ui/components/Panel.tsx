import type { PropsWithChildren } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';

import { borders, layout, palette, radii, shadows } from '../tokens';

interface PanelProps extends PropsWithChildren {
  style?: StyleProp<ViewStyle>;
}

/** Parchment card — the base surface for every floating UI element. */
export function Panel({ children, style }: PanelProps) {
  return <View style={[styles.panel, style]}>{children}</View>;
}

const styles = StyleSheet.create({
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
