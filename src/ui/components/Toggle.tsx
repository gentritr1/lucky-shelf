import { useEffect } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useDerivedValue,
  withTiming,
} from 'react-native-reanimated';

import { palette, radii, motion, shadows } from '../tokens';
import { useReducedMotion } from '../prefs';

interface ToggleProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  accessibilityLabel?: string;
}

const TRACK_W = 48;
const TRACK_H = 28;
const THUMB = 22;
const TRAVEL = TRACK_W - THUMB - 6;

/** Settings switch — thumb slides, track warms teal when on. Reduced-motion safe. */
export function Toggle({ value, onValueChange, accessibilityLabel }: ToggleProps) {
  const reduced = useReducedMotion();
  const progress = useDerivedValue(() =>
    withTiming(value ? 1 : 0, { duration: reduced ? 0 : motion.durations.snap }),
  );

  const trackStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(progress.value, [0, 1], [palette.parchmentEdge, palette.accentTeal]),
  }));
  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: progress.value * TRAVEL }],
  }));

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      hitSlop={12}
      onPress={() => onValueChange(!value)}
    >
      <Animated.View style={[styles.track, trackStyle]}>
        <Animated.View style={[styles.thumb, thumbStyle]} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    borderRadius: radii.pill,
    height: TRACK_H,
    justifyContent: 'center',
    paddingHorizontal: 3,
    width: TRACK_W,
  },
  thumb: {
    backgroundColor: palette.creamBright,
    borderRadius: radii.pill,
    height: THUMB,
    width: THUMB,
    // subtle lift so the thumb reads as a physical knob
    ...shadows.float,
  },
});
