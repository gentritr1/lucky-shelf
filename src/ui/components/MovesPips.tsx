import { StyleSheet, View } from 'react-native';

import { borders, palette, radii, spacing } from '../tokens';
import { AppText } from './AppText';

interface MovesPipsProps {
  remaining: number;
  /** Daily free-move budget (kickoff §1 = 3). Pips beyond this render as spent. */
  total?: number;
}

/**
 * The daily free-move budget, read at a glance. Filled teal pips = moves left,
 * hollow = spent. This is the visible face of the 3-move constraint that is the
 * daily puzzle — scarcity has to be felt before the drag, not discovered after.
 */
export function MovesPips({ remaining, total = 3 }: MovesPipsProps) {
  const clamped = Math.max(0, Math.min(remaining, total));
  return (
    <View style={styles.wrap}>
      <View style={styles.pips}>
        {Array.from({ length: total }, (_, index) => (
          <View key={index} style={[styles.pip, index < clamped ? styles.pipFilled : styles.pipSpent]} />
        ))}
      </View>
      <AppText variant="label" color={palette.inkFaint} style={styles.label}>MOVES</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: spacing.xxs,
  },
  pips: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  pip: {
    borderRadius: radii.pill,
    borderWidth: borders.regular,
    height: 12,
    width: 12,
  },
  pipFilled: {
    backgroundColor: palette.accentTeal,
    borderColor: palette.tealDark,
  },
  pipSpent: {
    backgroundColor: 'transparent',
    borderColor: palette.parchmentEdge,
  },
  label: {
    fontSize: 10,
  },
});
