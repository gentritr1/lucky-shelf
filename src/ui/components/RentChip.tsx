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

import { borders, palette, radii, spacing } from '../tokens';
import { useReducedMotion } from '../prefs';
import { AppText } from './AppText';

interface RentChipProps {
  amount: number;
  dueInDays: number;
}

/**
 * Rent proximity must be *felt* (kickoff §6): the chip warms from parchment
 * calm to ember alarm as the due day approaches. The room-wide dusk shift
 * lands at M4; this chip is the M0 seed of that gradient. When rent is imminent
 * (≤1 day) the chip also breathes — a slow ~3% pulse so the deadline is felt in
 * the periphery, not just read. Still in reduced-motion mode.
 */
export function RentChip({ amount, dueInDays }: RentChipProps) {
  const tone = dueInDays <= 1 ? styles.alarm : dueInDays === 2 ? styles.warm : styles.calm;
  const toneText = dueInDays <= 1 ? styles.alarmText : dueInDays === 2 ? styles.warmText : styles.calmText;
  const dayWord = dueInDays === 1 ? 'day' : 'days';

  const reduced = useReducedMotion();
  const alarm = dueInDays <= 1;
  const pulse = useSharedValue(0);
  useEffect(() => {
    if (alarm && !reduced) {
      pulse.value = withRepeat(
        withTiming(1, { duration: 850, easing: Easing.inOut(Easing.sin) }),
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

  return (
    <Animated.View style={[styles.chip, tone, pulseStyle]}>
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
  calm: {
    backgroundColor: palette.parchment,
    borderColor: palette.parchmentEdge,
  },
  warm: {
    backgroundColor: palette.sunlight,
    borderColor: palette.goldDeep,
  },
  alarm: {
    backgroundColor: palette.rentEmber,
    borderColor: palette.emberDark,
  },
  due: {
    fontSize: 13,
  },
  calmText: { color: palette.inkSoft },
  warmText: { color: palette.ink },
  alarmText: { color: palette.creamBright },
});
