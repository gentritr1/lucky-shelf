import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { borders, radii, spacing } from '../tokens';
import { useReducedMotion } from '../prefs';
import { useThemedStyles } from '../useThemedStyles';
import { makeStyles } from './RentChip.styles';
import { AppText } from './AppText';

interface RentChipProps {
  amount: number;
  dueInDays: number;
}

/**
 * Rent proximity must be *felt* (kickoff §6): the chip warms from parchment
 * calm to ember alarm as the due day approaches. The room-wide dusk shift
 * lands at M4; this chip is the M0 seed of that gradient. When rent is imminent
 * (≤1 day) the chip breathes an EMBER PULSE (B-M16): a slow ~2.5s-period swell —
 * uniform scale (~3%) plus an emberDark film whose opacity rides the same pulse,
 * so the chip glows like a coal instead of merely wobbling. Uniform scale +
 * opacity ONLY (the Fabric transform scar: no scaleX/scaleY splits; `with*()`
 * results assigned straight to `.value`). Reduced motion: the chip holds the
 * static ember alarm tone — no pulse, no film.
 */
export function RentChip({ amount, dueInDays }: RentChipProps) {
  const themed = useThemedStyles(makeStyles);
  const tone = dueInDays <= 1 ? themed.alarm : dueInDays === 2 ? themed.warm : themed.calm;
  const toneText = dueInDays <= 1 ? themed.alarmText : dueInDays === 2 ? themed.warmText : themed.calmText;
  const dayWord = dueInDays === 1 ? 'day' : 'days';

  const reduced = useReducedMotion();
  const alarm = dueInDays <= 1;
  const pulse = useSharedValue(0);
  useEffect(() => {
    if (alarm && !reduced) {
      pulse.value = withRepeat(
        // 1250ms each way → ~2.5s full period (the B-M16 "slow ember" spec).
        withTiming(1, { duration: 1250, easing: Easing.inOut(Easing.sin) }),
        -1,
        true,
      );
    } else {
      cancelAnimation(pulse);
      pulse.value = 0;
    }
    return () => cancelAnimation(pulse);
  }, [alarm, reduced, pulse]);
  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: 1 + pulse.value * 0.03 }] }));
  const emberStyle = useAnimatedStyle(() => ({ opacity: pulse.value * 0.22 }));

  return (
    <Animated.View style={[styles.chip, tone, pulseStyle]}>
      {alarm && !reduced ? (
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, themed.emberGlow, emberStyle]}
        />
      ) : null}
      <AppText variant="label" style={toneText}>RENT {amount}</AppText>
      <AppText variant="body" style={[styles.due, toneText]}>
        {dueInDays === 0 ? 'due today' : `due in ${dueInDays} ${dayWord}`}
      </AppText>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: radii.pill,
    borderWidth: borders.regular,
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  due: {
    fontSize: 13,
  },
});
