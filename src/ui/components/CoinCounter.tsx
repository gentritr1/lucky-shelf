import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { borders, motion, shadows, spacing } from '../tokens';
import { useReducedMotion } from '../prefs';
import { useThemedStyles } from '../useThemedStyles';
import { makeStyles } from './CoinCounter.styles';

interface CoinCounterProps {
  coins: number;
  /** Count up to `coins` from the previous value (or `from`). Default: instant. */
  animate?: boolean;
  /** Explicit count-up start; defaults to the last rendered value. */
  from?: number;
  /** Scale-punch when the value settles — the dayTotal "slam". */
  slam?: boolean;
  /** 'slam' is the larger cascade payoff counter; 'pill' is the HUD chip. */
  variant?: 'pill' | 'slam';
}

const overshoot = Easing.bezier(...motion.easings.overshoot);

/**
 * Gold pill with tabular numerals — count-ups won't jitter. Defaults to the
 * static HUD chip (unchanged from M1). The cascade opts into `animate`/`slam`
 * for the dayTotal payoff (motion-spec §4: coin-counter slam).
 */
export function CoinCounter({
  coins,
  animate = false,
  from,
  slam = false,
  variant = 'pill',
}: CoinCounterProps) {
  const reduced = useReducedMotion();
  const themed = useThemedStyles(makeStyles);
  const display = useCountUp(coins, { animate: animate && !reduced, from });

  const punch = useSharedValue(1);
  const prev = useRef(coins);
  useEffect(() => {
    if (coins !== prev.current && !reduced) {
      // Slam is the big cascade payoff; the HUD pill gets a subtle tick so a coin
      // change registers without shouting.
      punch.value = slam
        ? withSequence(
            withTiming(1.22, { duration: 110, easing: overshoot }),
            withTiming(1, { duration: 260, easing: overshoot }),
          )
        : withSequence(
            withTiming(1.06, { duration: 90, easing: overshoot }),
            withTiming(1, { duration: 180, easing: overshoot }),
          );
    }
    prev.current = coins;
  }, [coins, slam, reduced, punch]);

  const punchStyle = useAnimatedStyle(() => ({ transform: [{ scale: punch.value }] }));
  const isSlam = variant === 'slam';

  return (
    <Animated.View style={[themed.pill, isSlam && styles.pillSlam, punchStyle]}>
      <View style={[themed.coin, isSlam && styles.coinSlam]} />
      <Text style={[themed.amount, isSlam && themed.amountSlam]}>{display}</Text>
    </Animated.View>
  );
}

/**
 * Drives a display integer from a start value up to `target`. A short JS rAF
 * tween — it's one low-frequency number, so the UI thread is fine and it works
 * identically on web and native. Reduced motion / disabled → snap.
 */
function useCountUp(
  target: number,
  { animate, from }: { animate: boolean; from: number | undefined },
): number {
  const [value, setValue] = useState(target);
  const fromRef = useRef(target);

  useEffect(() => {
    const start = from ?? fromRef.current;
    if (!animate || start === target) {
      setValue(target);
      fromRef.current = target;
      return;
    }

    const durationMs = motion.durations.settle;
    const startedAt = Date.now();
    let raf = 0;
    const step = () => {
      const t = Math.min(1, (Date.now() - startedAt) / durationMs);
      const eased = 1 - (1 - t) * (1 - t); // ease-out quad
      setValue(Math.round(start + (target - start) * eased));
      if (t < 1) {
        raf = requestAnimationFrame(step);
      } else {
        fromRef.current = target;
      }
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // `from` intentionally not a dep: only a new target restarts the tween.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, animate]);

  return value;
}

const styles = StyleSheet.create({
  pillSlam: {
    borderWidth: borders.strong,
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    ...shadows.lifted,
  },
  coinSlam: {
    height: 28,
    width: 28,
  },
});
