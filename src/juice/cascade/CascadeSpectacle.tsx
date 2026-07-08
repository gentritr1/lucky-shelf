import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { palette, radii } from '@/ui/tokens';
import type { CascadeTier } from './cascadeTier';

/**
 * B-M6 top-tier cascade spectacle (P4, "spectacle without swing"). Pure
 * presentation, layered over the cascade for `big`/`apex` days only — the
 * renderer never mounts this on a `normal` day, so ordinary cascades stay
 * byte-identical to shipped.
 *
 * Reduce-motion (R-28): every effect SNAPS to a quiet static end-state, and the
 * motion-only flourishes (edge-glow build, spark burst) are omitted entirely —
 * no flashing. The tier still computes; only the animation is suppressed.
 *
 * These are absolutely-positioned, `pointerEvents="none"` overlays sized to fill
 * their parent, so mounting them cannot shift the cascade layout underneath.
 */

interface CascadeSpectacleProps {
  tier: CascadeTier; // only 'big' | 'apex' ever reach here (guarded by the caller)
  /** Cascade progress 0→1 (resolved step / last step) — drives the apex glow build. */
  progress: number;
  /** True once the terminal dayTotal has landed — triggers the wash + spark burst. */
  slam: boolean;
  reduced: boolean;
}

export function CascadeSpectacle({ tier, progress, slam, reduced }: CascadeSpectacleProps) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {tier === 'apex' ? <EdgeGlow progress={progress} reduced={reduced} /> : null}
      <SlamWash tier={tier} slam={slam} reduced={reduced} />
      {tier === 'apex' && slam && !reduced ? <SparkBurst /> : null}
    </View>
  );
}

/** A gold frame-glow that swells as the apex cascade climbs toward the slam. */
function EdgeGlow({ progress, reduced }: { progress: number; reduced: boolean }) {
  const t = useSharedValue(reduced ? 1 : 0);
  useEffect(() => {
    // Track cascade progress so the glow *builds* rather than pops. Reduced motion
    // rests it at a calm fixed intensity (no build, no pulse, no flashing).
    t.value = reduced ? 1 : withTiming(Math.max(0, Math.min(1, progress)), { duration: 200 });
  }, [progress, reduced, t]);

  const style = useAnimatedStyle(() => ({ opacity: 0.15 + t.value * 0.55 }));

  return (
    <Animated.View style={[styles.glow, style]}>
      <View style={styles.glowInner} />
    </Animated.View>
  );
}

/** A brief warm wash across the scene when the day total slams home. Big = a
 *  gentle gold breath; apex = a brighter flash. Reduced = a faint static tint. */
function SlamWash({ tier, slam, reduced }: { tier: CascadeTier; slam: boolean; reduced: boolean }) {
  const peak = tier === 'apex' ? 0.32 : 0.18;
  const t = useSharedValue(0);
  useEffect(() => {
    if (!slam) return;
    if (reduced) {
      t.value = peak * 0.5; // snap to a quiet static tint — no flash
      return;
    }
    t.value = withSequence(
      withTiming(peak, { duration: 120, easing: Easing.out(Easing.quad) }),
      withTiming(0, { duration: 520, easing: Easing.in(Easing.quad) }),
    );
  }, [slam, reduced, peak, t]);

  const style = useAnimatedStyle(() => ({ opacity: t.value }));
  return <Animated.View style={[StyleSheet.absoluteFill, styles.wash, style]} />;
}

const SPARK_COUNT = 14;
const SPARK_COLORS = [palette.coinGold, palette.sunlight, palette.goldDeep, palette.accentTeal];

/** A one-shot spark burst radiating from the day-total area on the apex slam. */
function SparkBurst() {
  return (
    <View style={styles.sparkOrigin} pointerEvents="none">
      {Array.from({ length: SPARK_COUNT }).map((_, i) => (
        <Spark key={i} index={i} />
      ))}
    </View>
  );
}

function Spark({ index }: { index: number }) {
  const t = useSharedValue(0);
  // Deterministic spread: even angular fan with a slight per-index radius jitter.
  const angle = (index / SPARK_COUNT) * Math.PI * 2;
  const radius = 70 + (index % 4) * 22;
  const dx = Math.cos(angle) * radius;
  const dy = Math.sin(angle) * radius;
  const color = SPARK_COLORS[index % SPARK_COLORS.length]!;

  useEffect(() => {
    t.value = withDelay(40, withTiming(1, { duration: 620, easing: Easing.out(Easing.cubic) }));
  }, [t]);

  const style = useAnimatedStyle(() => ({
    opacity: 1 - t.value,
    transform: [
      { translateX: dx * t.value },
      { translateY: dy * t.value - 8 * Math.sin(t.value * Math.PI) },
      { scale: 0.5 + (1 - t.value) * 0.8 },
    ],
  }));

  return <Animated.View style={[styles.spark, { backgroundColor: color }, style]} />;
}

const styles = StyleSheet.create({
  glow: {
    alignItems: 'stretch',
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  glowInner: {
    borderColor: palette.coinGold,
    borderRadius: radii.lg,
    borderWidth: 3,
    flex: 1,
    margin: -6,
    shadowColor: palette.goldDeep,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 26,
  },
  wash: {
    backgroundColor: palette.sunlight,
  },
  sparkOrigin: {
    alignItems: 'center',
    justifyContent: 'center',
    left: '50%',
    position: 'absolute',
    top: '68%',
  },
  spark: {
    borderRadius: radii.pill,
    height: 10,
    position: 'absolute',
    width: 10,
  },
});
