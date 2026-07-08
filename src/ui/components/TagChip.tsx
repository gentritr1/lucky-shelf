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
    // Compact horizontal padding so two tags fit one row in the tight offer card
    // (the sole consumer); unified tag size stays 10 (see `text`).
    paddingHorizontal: spacing.xs,
    paddingVertical: 1,
  },
  accent: {
    backgroundColor: palette.tealDark,
  },
  text: {
    color: palette.inkFaint,
    // Size 9 (not 10): the offer card is ~95pt wide and "food perishable" wraps
    // at 10. TagChip had no other consumer, so there was nothing to match at 10 —
    // this makes the shared tag the size that fits, dedup with no visual change.
    fontSize: 9,
    fontWeight: '600',
  },
  accentText: {
    color: palette.creamBright,
  },
});
