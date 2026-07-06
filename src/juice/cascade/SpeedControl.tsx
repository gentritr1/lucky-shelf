import { Pressable, StyleSheet, Text, View } from 'react-native';

import { palette, radii, shadows, spacing, typeScale } from '@/ui/tokens';
import type { CascadeSpeed } from './useCascadePlayer';

/**
 * Cascade speed control — 1× / 2× / skip, always visible from run 1 (R-17). We
 * never hold the player hostage to our own animation (Pillar 4). `skip` jumps to
 * the dayTotal slam (R-18).
 */

interface SpeedControlProps {
  speed: CascadeSpeed;
  onSpeed: (speed: CascadeSpeed) => void;
  onSkip: () => void;
  disabled?: boolean;
}

export function SpeedControl({ speed, onSpeed, onSkip, disabled = false }: SpeedControlProps) {
  return (
    <View style={styles.row}>
      <View style={styles.segment}>
        <SpeedButton label="1×" active={speed === 1} onPress={() => onSpeed(1)} />
        <SpeedButton label="2×" active={speed === 2} onPress={() => onSpeed(2)} />
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={onSkip}
        style={({ pressed }) => [styles.skip, pressed && styles.pressed, disabled && styles.faded]}
      >
        <Text style={styles.skipText}>Skip ⏭</Text>
      </Pressable>
    </View>
  );
}

function SpeedButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [styles.speed, active && styles.speedActive, pressed && styles.pressed]}
    >
      <Text style={[styles.speedText, active && styles.speedTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'center',
  },
  segment: {
    backgroundColor: palette.parchment,
    borderRadius: radii.pill,
    flexDirection: 'row',
    padding: 3,
    ...shadows.float,
  },
  speed: {
    alignItems: 'center',
    borderRadius: radii.pill,
    justifyContent: 'center',
    minHeight: 36,
    minWidth: 48,
    paddingHorizontal: spacing.md,
  },
  speedActive: {
    backgroundColor: palette.creamBright,
    borderColor: palette.goldDeep,
    borderWidth: 1.5,
  },
  speedText: {
    ...typeScale.heading,
    color: palette.inkFaint,
  },
  speedTextActive: {
    color: palette.ink,
  },
  skip: {
    alignItems: 'center',
    backgroundColor: palette.creamBright,
    borderColor: palette.parchmentEdge,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    justifyContent: 'center',
    minHeight: 42,
    paddingHorizontal: spacing.lg,
    ...shadows.float,
  },
  skipText: {
    ...typeScale.heading,
    color: palette.tealDark,
  },
  pressed: {
    transform: [{ scale: 0.96 }],
  },
  faded: {
    opacity: 0.4,
  },
});
