import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { motion } from '@/ui/tokens';

/**
 * A ruleFire arrow drawn as an RN view — a rotated line that grows from source
 * to target with an arrowhead at the tip. This is the web-verifiable path (my
 * KI-1 pattern); the richer Skia particle-spark version is device-only.
 * Color cycles through the colorblind-safe `arrowPalette` per source slot.
 */

interface CascadeArrowProps {
  from: { x: number; y: number };
  to: { x: number; y: number };
  color: string;
  reduced: boolean;
}

const HEAD = 9;

export function CascadeArrow({ from, to, color, reduced }: CascadeArrowProps) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy);
  const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;

  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = reduced
      ? 1
      : withTiming(1, { duration: motion.durations.arrowDraw });
  }, [progress, reduced, from.x, from.y, to.x, to.y]);

  const lineStyle = useAnimatedStyle(() => ({ transform: [{ scaleX: progress.value }] }));
  const headStyle = useAnimatedStyle(() => ({ opacity: progress.value }));

  return (
    <View
      style={[
        styles.container,
        { left: from.x, top: from.y, width: length, transform: [{ rotateZ: `${angleDeg}deg` }] },
      ]}
    >
      <Animated.View style={[styles.line, { backgroundColor: color }, lineStyle]} />
      <Animated.View
        style={[styles.head, { left: length - HEAD, borderLeftColor: color }, headStyle]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 3,
    pointerEvents: 'none',
    position: 'absolute',
    // grow the line rightward from the source point
    transformOrigin: 'left center',
  },
  line: {
    borderRadius: 2,
    height: 3,
    transformOrigin: 'left center',
    width: '100%',
  },
  head: {
    borderBottomColor: 'transparent',
    borderBottomWidth: HEAD * 0.7,
    borderLeftWidth: HEAD,
    borderTopColor: 'transparent',
    borderTopWidth: HEAD * 0.7,
    height: 0,
    position: 'absolute',
    top: -HEAD * 0.7 + 1.5,
    width: 0,
  },
});
