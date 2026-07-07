import { useEffect, useMemo } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import type { ItemInstance } from '@/contracts';
import { palette, radii, shadows, spacing, typeScale } from '@/ui/tokens';
import { useReducedMotion } from '@/ui/prefs';
import { spriteFor } from './sprites';

/**
 * The item as it sits on the shelf — a chunky hand-painted miniature stand-in
 * (glyph + plinth) until the Higgsfield sprite pack lands at M4. It owns its own
 * idle micro-motion (motion-spec §5): a ≤1.5% breathe on a randomized 3–5 s loop,
 * plus the Shop Cat's tail-flick tic every 6–9 s. Budget-conscious: two shared
 * values, timing only, and it goes still entirely in reduced-motion mode.
 */

interface ItemSpriteProps {
  item: ItemInstance;
  glyph: string;
  size: number;
  /** Hide the static baseValue badge (the cascade shows its own scoring tag). */
  hideValue?: boolean;
}

// deterministic per-instance jitter so the shelf doesn't breathe in unison
function hashPhase(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return (h % 1000) / 1000;
}

export function ItemSprite({ item, glyph, size, hideValue = false }: ItemSpriteProps) {
  const reduced = useReducedMotion();
  const breathe = useSharedValue(0);
  const flick = useSharedValue(0);
  const isCat = item.itemId === 'shop-cat';

  const jitter = useMemo(() => hashPhase(item.instanceId), [item.instanceId]);

  useEffect(() => {
    if (reduced) {
      breathe.value = 0;
      flick.value = 0;
      return;
    }
    const breatheMs = 3000 + jitter * 2000; // 3–5 s
    breathe.value = withDelay(
      jitter * 1200,
      withRepeat(withTiming(1, { duration: breatheMs, easing: Easing.inOut(Easing.sin) }), -1, true),
    );
    if (isCat) {
      const period = 6000 + jitter * 3000; // 6–9 s
      // hold still, then a quick two-beat flick, then rest for the remainder
      flick.value = withRepeat(
        withSequence(
          withTiming(0, { duration: period }),
          withTiming(1, { duration: 90, easing: Easing.out(Easing.quad) }),
          withTiming(-0.6, { duration: 110 }),
          withTiming(0, { duration: 140, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
        false,
      );
    }
    return () => {
      cancelAnimation(breathe);
      cancelAnimation(flick);
    };
  }, [reduced, jitter, isCat, breathe, flick]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: 1 + breathe.value * 0.015 },
      { rotateZ: `${flick.value * 5}deg` },
      { translateY: -breathe.value * 0.6 },
    ],
  }));

  const plinth = Math.round(size * 0.82);
  const glyphSize = Math.round(size * 0.5);
  const sprite = spriteFor(item.itemId);

  return (
    <Animated.View style={[styles.wrap, animStyle, noPointer]}>
      <View
        style={[
          styles.plinth,
          { width: plinth, height: plinth },
          item.state.sticky && styles.sticky,
          item.state.blocked && styles.blocked,
        ]}
      >
        {sprite ? (
          <Image
            source={sprite}
            style={{ width: plinth * 0.84, height: plinth * 0.84 }}
            resizeMode="contain"
          />
        ) : (
          <Text style={[styles.glyph, { fontSize: glyphSize }]}>{glyph}</Text>
        )}
      </View>
      {hideValue ? null : (
        <View style={styles.valueBadge}>
          <Text style={styles.valueText}>{item.baseValue}</Text>
        </View>
      )}
    </Animated.View>
  );
}

// pointer-transparent so the gesture underneath owns the touch (style, not the
// deprecated prop, so RN web stays quiet).
const noPointer = { pointerEvents: 'none' } as const;

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    height: '100%',
    justifyContent: 'center',
    width: '100%',
  },
  plinth: {
    alignItems: 'center',
    backgroundColor: palette.creamBright,
    borderColor: palette.parchmentEdge,
    borderRadius: radii.md,
    borderWidth: 1,
    justifyContent: 'center',
    ...shadows.card,
  },
  sticky: {
    // honeyed ring hints "this one won't budge" before you even grab it
    borderColor: palette.goldDeep,
    borderWidth: 2,
  },
  blocked: {
    opacity: 0.6,
  },
  glyph: {
    textAlign: 'center',
  },
  valueBadge: {
    backgroundColor: palette.coinGold,
    borderColor: palette.goldDeep,
    borderRadius: radii.pill,
    borderWidth: 1,
    marginTop: -spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  valueText: {
    ...typeScale.label,
    color: palette.ink,
    fontSize: 11,
    letterSpacing: 0,
  },
});
