import { Easing, withSpring, withTiming, type WithSpringConfig } from 'react-native-reanimated';

import { motion } from '@/ui/tokens';

/**
 * Motion helpers — the bridge from `tokens.motion` (numbers) to Reanimated
 * animations, with reduced-motion folded in.
 *
 * Reduced-motion contract (motion-spec): springs collapse to a single-frame
 * timing and durations clamp to 0. Everything animatable in the juice layer
 * runs through these so the mode is honored in exactly one place per concern.
 * All helpers are worklets so they compose inside gesture callbacks.
 */

export type SpringName = keyof typeof motion.springs;
export type DurationName = keyof typeof motion.durations;

export const easings = {
  out: Easing.bezier(...motion.easings.out),
  in: Easing.bezier(...motion.easings.in),
  overshoot: Easing.bezier(...motion.easings.overshoot),
  rubber: Easing.bezier(...motion.easings.rubber),
} as const;

export type EasingName = keyof typeof easings;

/** Spring toward `to` using a named token spring, or snap instantly if reduced. */
export function spring(to: number, name: SpringName, reduced: boolean): number {
  'worklet';
  if (reduced) {
    return withTiming(to, { duration: 0 });
  }
  return withSpring(to, motion.springs[name] as WithSpringConfig);
}

/** Timing toward `to` over a named token duration, or instantly if reduced. */
export function timing(
  to: number,
  duration: DurationName,
  easing: EasingName,
  reduced: boolean,
): number {
  'worklet';
  return withTiming(to, {
    duration: reduced ? 0 : motion.durations[duration],
    easing: easings[easing],
  });
}
