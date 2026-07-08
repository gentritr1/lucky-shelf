import { useEffect, type ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { motion } from '@/ui/tokens';
import { useReducedMotion } from '@/ui/prefs';

import { easings } from './motion';

/**
 * Mount entrance — content fades in and settles up a few px instead of hard
 * popping in. The one pattern every screen uses so the connective UI feels alive
 * without drawing attention to itself (very subtle: 8px rise over one `settle`).
 * Stack a group with ascending `index` for a light staggered cascade. Honors
 * reduced motion (snaps to placed) via the shared prefs hook.
 */

const RISE_PX = 8;
const STAGGER_MS = 45;

interface EntranceProps {
  children: ReactNode;
  /** Position in a stagger group; each step delays the settle by ~45ms. */
  index?: number;
  style?: StyleProp<ViewStyle>;
}

export function Entrance({ children, index = 0, style }: EntranceProps) {
  const reduced = useReducedMotion();
  const progress = useSharedValue(reduced ? 1 : 0);

  useEffect(() => {
    if (reduced) {
      progress.value = 1;
      return;
    }
    progress.value = 0;
    progress.value = withDelay(
      index * STAGGER_MS,
      withTiming(1, { duration: motion.durations.settle, easing: easings.out }),
    );
  }, [reduced, index, progress]);

  const anim = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * RISE_PX }],
  }));

  return <Animated.View style={[style, anim]}>{children}</Animated.View>;
}
