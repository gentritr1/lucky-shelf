import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { borders, motion, palette, radii, spacing, touch } from '../tokens';
import { useReducedMotion } from '../prefs';
import { AppText } from './AppText';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface WoodButtonProps {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
}

/**
 * The workhorse button. Primary = warm wood with a sunlit top edge;
 * secondary = parchment. Press-in springs to 0.96 on the `grab` token spring so
 * every tap feels physical instead of an instant opacity flick; snaps flat in
 * reduced-motion mode.
 */
export function WoodButton({ label, onPress, variant = 'primary', disabled = false }: WoodButtonProps) {
  const primary = variant === 'primary';
  const reduced = useReducedMotion();
  const press = useSharedValue(0);

  const setPress = (to: number) => {
    press.value = reduced ? withTiming(to, { duration: 0 }) : withSpring(to, motion.springs.grab);
  };

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - press.value * 0.04 }],
    opacity: 1 - press.value * 0.08,
  }));

  return (
    <AnimatedPressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      onPressIn={() => setPress(1)}
      onPressOut={() => setPress(0)}
      style={[
        styles.base,
        primary ? styles.primary : styles.secondary,
        animStyle,
        disabled && styles.disabled,
      ]}
    >
      <AppText variant="heading" align="center" style={primary ? styles.labelPrimary : styles.labelSecondary}>
        {label}
      </AppText>
    </AnimatedPressable>
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
