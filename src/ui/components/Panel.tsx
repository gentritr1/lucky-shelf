import type { PropsWithChildren } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { View } from 'react-native';

import { useThemedStyles } from '../useThemedStyles';
import { makeStyles } from './Panel.styles';

interface PanelProps extends PropsWithChildren {
  style?: StyleProp<ViewStyle>;
}

/**
 * Parchment card — the base surface for every floating UI element. Colors read
 * from `useThemedStyles(makeStyles)` (THEME-1) so the surface re-themes under the
 * high-contrast pref; byte-identical at default prefs (`resolvePalette(false)`
 * returns the base palette by identity).
 */
export function Panel({ children, style }: PanelProps) {
  const styles = useThemedStyles(makeStyles);
  return <View style={[styles.panel, style]}>{children}</View>;
}
