import type { PropsWithChildren } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';

import { palette, radii, shadows, spacing } from '../tokens';

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
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg,
    ...shadows.card,
  },
});
