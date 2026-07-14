import { useEffect } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useDerivedValue,
  withTiming,
} from 'react-native-reanimated';

import { radii, motion, shadows } from '../tokens';
import { useReducedMotion, usePalette } from '../prefs';

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
  const p = usePalette();
  // Capture the interpolateColor endpoints as plain-string locals OUTSIDE the
  // worklet (THEME-1) — hooks can't run inside a worklet; the worklet just closes
  // over these two strings so the track still re-themes under high contrast.
  const trackOff = p.parchmentEdge;
  const trackOn = p.accentTeal;
  const progress = useDerivedValue(() =>
    withTiming(value ? 1 : 0, { duration: reduced ? 0 : motion.durations.snap }),
  );

  const trackStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(progress.value, [0, 1], [trackOff, trackOn]),
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
        <Animated.View style={[styles.thumb, { backgroundColor: p.creamBright }, thumbStyle]} />
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
    // THEME-1: `backgroundColor` is applied inline from `usePalette()` (the thumb
    // View adds `{ backgroundColor: p.creamBright }`) so it re-themes under high
    // contrast; the rest is pure layout. `shadows.float` bakes `palette.shadow`
    // (not remapped by high contrast) so it stays a token.
    borderRadius: radii.pill,
    height: THUMB,
    width: THUMB,
    // subtle lift so the thumb reads as a physical knob
    ...shadows.float,
  },
});
