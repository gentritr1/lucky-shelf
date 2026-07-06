import type { StyleProp, TextStyle } from 'react-native';
import { StyleSheet, Text, View } from 'react-native';

import { palette, spacing, typeScale } from '../tokens';

interface SectionLabelProps {
  children: string;
  /** Optional trailing element (a count, a control) pinned to the right. */
  trailing?: React.ReactNode;
  style?: StyleProp<TextStyle>;
}

/**
 * The all-caps eyebrow that titles a group ("TODAY'S DELIVERY", "SETTINGS").
 * Uses the `label` type token; a hairline rule under it grounds the section.
 */
export function SectionLabel({ children, trailing, style }: SectionLabelProps) {
  return (
    <View style={styles.row}>
      <Text style={[styles.label, style]}>{children}</Text>
      {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  label: {
    ...typeScale.label,
    color: palette.inkFaint,
  },
  trailing: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
});
