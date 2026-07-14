import { Text, View } from 'react-native';

import { useThemedStyles } from '../useThemedStyles';
import { makeStyles } from './TagChip.styles';

interface TagChipProps {
  label: string;
  /** teal = a rule-relevant tag worth the eye; muted = incidental. */
  tone?: 'muted' | 'accent';
}

/**
 * Small parchment pill for an item tag (perishable, antique, lucky…). Colors read
 * from `useThemedStyles(makeStyles)` (THEME-1) so the pill re-themes under high
 * contrast; byte-identical at default prefs.
 */
export function TagChip({ label, tone = 'muted' }: TagChipProps) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={[styles.chip, tone === 'accent' && styles.accent]}>
      <Text style={[styles.text, tone === 'accent' && styles.accentText]}>{label}</Text>
    </View>
  );
}
