import { useEffect } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { motion, spacing } from '../tokens';
import { useReducedMotion } from '../prefs';
import { useThemedStyles } from '../useThemedStyles';
import { makeStyles } from './OfferCard.styles';
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
  const themed = useThemedStyles(makeStyles);
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
      style={[themed.card, selected && themed.selected, animStyle]}
    >
      {offer.sprite ? (
        <View style={themed.spriteMat}>
          <Image source={offer.sprite} style={styles.sprite} resizeMode="contain" />
        </View>
      ) : (
        <Text style={styles.glyph}>{offer.glyph}</Text>
      )}
      <Text numberOfLines={1} style={themed.name}>
        {offer.name}
      </Text>
      {offer.tier > 1 ? (
        <View style={styles.pips}>
          {Array.from({ length: offer.tier }, (_, index) => (
            <View key={index} style={themed.pip} />
          ))}
        </View>
      ) : null}
      <View style={styles.footer}>
        <View style={themed.coinDot} />
        <Text style={themed.value}>{offer.baseValue}</Text>
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
  glyph: {
    fontSize: 40,
  },
  sprite: {
    height: '100%',
    width: '100%',
  },
  pips: {
    flexDirection: 'row',
    gap: spacing.xxs,
  },
  footer: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  tags: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xxs,
    justifyContent: 'center',
  },
});
