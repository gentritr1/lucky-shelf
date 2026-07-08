import { useEffect } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { baloo2IconNudge, borders, motion, palette, radii, shadows, spacing, typeScale } from '../tokens';
import { useReducedMotion } from '../prefs';
import { TagChip } from './TagChip';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface OfferCardData {
  name: string;
  tier: 1 | 2 | 3 | 4;
  baseValue: number;
  glyph: string;
  /** Resolved sprite source (app layer supplies it); falls back to `glyph`. */
  sprite?: number;
  tags: readonly string[];
}

interface OfferCardProps {
  offer: OfferCardData;
  selected?: boolean;
  onPress?: () => void;
}

/** Delivery-draft card: sprite (placeholder glyph), name, tier pips, value. */
export function OfferCard({ offer, selected = false, onPress }: OfferCardProps) {
  const reduced = useReducedMotion();
  const sel = useSharedValue(selected ? 1 : 0);
  const press = useSharedValue(0);

  // Spring the selection lift instead of snapping — the card rises into focus.
  useEffect(() => {
    const to = selected ? 1 : 0;
    sel.value = reduced ? withTiming(to, { duration: 0 }) : withSpring(to, motion.springs.settle);
  }, [selected, reduced, sel]);

  const setPress = (to: number) => {
    press.value = reduced ? withTiming(to, { duration: 0 }) : withSpring(to, motion.springs.grab);
  };

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: (1 + sel.value * 0.03) * (1 - press.value * 0.04) }],
  }));

  return (
    <AnimatedPressable
      accessibilityRole="button"
      onPress={onPress}
      onPressIn={() => setPress(1)}
      onPressOut={() => setPress(0)}
      style={[styles.card, selected && styles.selected, animStyle]}
    >
      {offer.sprite ? (
        <View style={styles.spriteMat}>
          <Image source={offer.sprite} style={styles.sprite} resizeMode="contain" />
        </View>
      ) : (
        <Text style={styles.glyph}>{offer.glyph}</Text>
      )}
      <Text numberOfLines={1} style={styles.name}>
        {offer.name}
      </Text>
      {offer.tier > 1 ? (
        <View style={styles.pips}>
          {Array.from({ length: offer.tier }, (_, index) => (
            <View key={index} style={styles.pip} />
          ))}
        </View>
      ) : null}
      <View style={styles.footer}>
        <View style={styles.coinDot} />
        <Text style={styles.value}>{offer.baseValue}</Text>
      </View>
      <View style={styles.tags}>
        {offer.tags.slice(0, 2).map((tag) => (
          <TagChip key={tag} label={tag} />
        ))}
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    backgroundColor: palette.creamBright,
    borderColor: palette.parchmentEdge,
    borderRadius: radii.lg, // top-level surface
    borderWidth: borders.hairline,
    flex: 1,
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md,
    ...shadows.card,
  },
  selected: {
    // Stronger "selected" read against the busy room backdrop: a thick teal ring
    // and a lift. The scale-up is animated (see animStyle) so it springs in.
    borderColor: palette.accentTeal,
    borderWidth: borders.strong + 1,
    ...shadows.lifted,
  },
  glyph: {
    fontSize: 40,
  },
  spriteMat: {
    alignItems: 'center',
    backgroundColor: palette.wallCream,
    borderRadius: radii.md, // centered child of an lg card → one tier down
    height: 60,
    justifyContent: 'center',
    padding: spacing.xs,
    width: 60,
  },
  sprite: {
    height: '100%',
    width: '100%',
  },
  name: {
    ...typeScale.label,
    color: palette.ink,
    letterSpacing: 0.2,
    textTransform: 'none',
  },
  pips: {
    flexDirection: 'row',
    gap: spacing.xxs,
  },
  pip: {
    backgroundColor: palette.goldDeep,
    borderRadius: radii.pill,
    height: 5,
    width: 5,
  },
  footer: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  coinDot: {
    backgroundColor: palette.coinGold,
    borderColor: palette.goldDeep,
    borderRadius: radii.pill,
    borderWidth: borders.regular,
    height: 12,
    width: 12,
  },
  value: {
    ...typeScale.coin,
    fontSize: 16,
    lineHeight: 20,
    color: palette.ink,
    // Optically center the Baloo2 digit against the coin dot (shared helper).
    ...baloo2IconNudge(16),
  },
  tags: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xxs,
    justifyContent: 'center',
  },
});
