import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { borders, motion, palette, radii, shadows } from '@/ui/tokens';
import type { CascadeSpeed } from './useCascadePlayer';

/**
 * A ruleFire shown as a single chunky coin that LOBS from the source slot to the
 * target (Fable plan #1 — "the value physically flies"). There is deliberately
 * NO drawn line: the earlier faint trail still read as a fast "green line" and
 * lingered after the coin, so the whole thing is now one travelling object. The
 * source→target link is legible from the coin leaving the source and landing on
 * the target; its ring is tinted with the colourblind-safe `arrowPalette` colour
 * (`color`) so the source stays identifiable without any line.
 *
 * Geometry: the container is anchored at `from` and rotated so its local +X axis
 * points at `to`, so the coin only needs a 1-D travel (local X, 0→length) plus a
 * perpendicular arc (local −Y, a sine bump) — cheap on the UI thread.
 *
 * The coin HOLDS on the target for the rest of the step (no fade), so the beat
 * you're left looking at is the coin sitting on the item it just paid, not a
 * line. Reduced motion (R-28): the coin renders statically AT the target — no
 * flight, no scale — same one-step lifetime, so the player's cadence is untouched.
 * This stays the web-verifiable path (no Skia).
 */

interface CascadeArrowProps {
  from: { x: number; y: number };
  to: { x: number; y: number };
  color: string;
  reduced: boolean;
  /** Player speed — the coin must land inside the step dwell (halved at 2×). */
  speed?: CascadeSpeed;
}

const COIN = 16;

export function CascadeArrow({ from, to, color, reduced, speed = 1 }: CascadeArrowProps) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy);
  const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
  const arc = length * motion.cascade.tokenArcFraction;

  const progress = useSharedValue(0);
  useEffect(() => {
    if (reduced) {
      progress.value = 1;
      return;
    }
    progress.value = 0;
    // Halve the flight at 2× so the coin always lands within the step's dwell.
    const duration = speed === 2 ? motion.durations.tokenTravel / 2 : motion.durations.tokenTravel;
    // Ease-OUT so the coin decelerates and settles onto the target rather than
    // darting — reads as a calm arrival (2026-07-11 feel-gate: smoothness).
    progress.value = withTiming(1, { duration, easing: Easing.out(Easing.cubic) });
  }, [progress, reduced, speed, from.x, from.y, to.x, to.y]);

  const coinStyle = useAnimatedStyle(() => {
    const p = progress.value;
    // Sine bump peaks at the midpoint and returns to 0 at the target, so p === 1
    // (incl. the reduced-motion snap) sits the coin exactly on the target.
    const lift = -arc * Math.sin(p * Math.PI);
    // Gentle "landing" swell as it settles, then holds at rest scale — soft, not
    // a jitter pop (reduced motion holds a flat scale).
    const scale = reduced ? 1 : interpolate(p, [0, 0.85, 1], [0.94, 1.08, 1]);
    return { transform: [{ translateX: p * length }, { translateY: lift }, { scale }] };
  });

  return (
    <View
      style={[
        styles.container,
        { left: from.x, top: from.y, width: length, transform: [{ rotateZ: `${angleDeg}deg` }] },
      ]}
    >
      <Animated.View style={[styles.coin, { borderColor: color }, coinStyle]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 3,
    pointerEvents: 'none',
    position: 'absolute',
    // local +X runs along the source→target line
    transformOrigin: 'left center',
  },
  coin: {
    backgroundColor: palette.coinGold,
    borderRadius: radii.pill,
    borderWidth: borders.frame, // a slightly chunkier ring so the source tint reads
    height: COIN,
    // centre the coin on the source point (local origin) before it travels
    left: -COIN / 2,
    position: 'absolute',
    top: 1.5 - COIN / 2,
    width: COIN,
    // soft drop so the travelling coin lifts off the shelf plane
    ...shadows.card,
  },
});
