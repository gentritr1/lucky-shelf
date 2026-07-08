import { Pressable, StyleSheet } from 'react-native';

import { borders, palette, radii, spacing, touch } from '../tokens';
import { AppText } from './AppText';

interface WoodButtonProps {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
}

/**
 * The workhorse button. Primary = warm wood with a sunlit top edge;
 * secondary = parchment. Press-in scales to 0.97 in `motion.durations.tick`
 * spirit (Pressable style function — the full spring lands with Reanimated
 * wiring in M1).
 */
export function WoodButton({ label, onPress, variant = 'primary', disabled = false }: WoodButtonProps) {
  const primary = variant === 'primary';
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        primary ? styles.primary : styles.secondary,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <AppText variant="heading" align="center" style={primary ? styles.labelPrimary : styles.labelSecondary}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    borderRadius: radii.md,
    justifyContent: 'center',
    minHeight: touch.minTargetPt,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  primary: {
    backgroundColor: palette.shelfWood,
    borderColor: palette.sunlight,
    borderTopWidth: borders.strong,
  },
  secondary: {
    backgroundColor: palette.parchment,
    borderColor: palette.parchmentEdge,
    borderWidth: borders.hairline,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.97 }],
  },
  disabled: {
    opacity: 0.45,
  },
  labelPrimary: {
    color: palette.creamBright,
  },
  labelSecondary: {
    color: palette.ink,
  },
});
