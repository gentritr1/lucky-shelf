import { StyleSheet, Text, View } from 'react-native';

import { palette, radii, spacing } from '../tokens';

interface TagChipProps {
  label: string;
  /** teal = a rule-relevant tag worth the eye; muted = incidental. */
  tone?: 'muted' | 'accent';
}

/** Small parchment pill for an item tag (perishable, antique, lucky…). */
export function TagChip({ label, tone = 'muted' }: TagChipProps) {
  return (
    <View style={[styles.chip, tone === 'accent' && styles.accent]}>
      <Text style={[styles.text, tone === 'accent' && styles.accentText]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignSelf: 'flex-start',
    backgroundColor: palette.parchment,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 1,
  },
  accent: {
    backgroundColor: palette.tealDark,
  },
  text: {
    color: palette.inkFaint,
    fontSize: 10,
    fontWeight: '600',
  },
  accentText: {
    color: palette.creamBright,
  },
});
