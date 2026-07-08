import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { palette } from '../tokens';
import { AppText } from './AppText';

/**
 * Shared screen header. The title is absolute-centered across the full bar so it
 * is truly centered on-device regardless of the unequal left (back) and right
 * (coins / actions) slot widths — the pattern the run/restock HUDs proved, now
 * the one home every screen themes from (and where the goal / supplier / synergy
 * HUD chrome hangs). `pointerEvents: none` on the centered block keeps the left
 * and right tap targets live underneath.
 */
interface TopBarProps {
  title: string;
  /** Small uppercase label above the title (e.g. "DAY 3"). */
  eyebrow?: string;
  /** `title` scale for standalone screens, `heading` for the denser game HUD. */
  titleVariant?: 'title' | 'heading';
  onBack?: () => void;
  backLabel?: string;
  /** Overrides the default back-button rendering in the left slot. */
  left?: ReactNode;
  right?: ReactNode;
}

export function TopBar({
  title,
  eyebrow,
  titleVariant = 'title',
  onBack,
  backLabel = '‹ Back',
  left,
  right,
}: TopBarProps): React.JSX.Element {
  const leftNode =
    left ??
    (onBack ? (
      <Pressable accessibilityRole="button" hitSlop={12} onPress={onBack}>
        <AppText variant="heading" color={palette.tealDark}>{backLabel}</AppText>
      </Pressable>
    ) : (
      <View style={styles.edge} />
    ));

  return (
    <View style={styles.bar}>
      {leftNode}
      {right ?? <View style={styles.edge} />}
      <View style={styles.center} pointerEvents="none">
        {eyebrow ? (
          <AppText variant="label" align="center" color={palette.inkFaint}>
            {eyebrow}
          </AppText>
        ) : null}
        <AppText variant={titleVariant} align="center" color={palette.ink} numberOfLines={1}>
          {title}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  center: {
    alignItems: 'center',
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  // Min tap target on an empty edge slot so space-between keeps a symmetric bar.
  edge: { minHeight: 44, minWidth: 44 },
});
