import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { borders, palette, radii, shadows, spacing, typeScale } from '../tokens';

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
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        selected && styles.selected,
        pressed && styles.pressed,
      ]}
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
          <View key={tag} style={styles.tag}>
            <Text style={styles.tagText}>{tag}</Text>
          </View>
        ))}
      </View>
    </Pressable>
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
    // Stronger "selected" read against the busy room backdrop: a thick teal ring,
    // a lift, and a slight scale-up so it clearly pops, not just a hairline tint.
    borderColor: palette.accentTeal,
    borderWidth: borders.strong + 1,
    transform: [{ scale: 1.03 }],
    ...shadows.lifted,
  },
  pressed: {
    transform: [{ scale: 0.97 }],
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
    // Match CoinCounter: nudge the digit down so it centers against the coin dot
    // (Baloo2 sits high; iOS ignores includeFontPadding). Calibrated on the sim.
    includeFontPadding: false,
    transform: [{ translateY: 2 }],
  },
  tags: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xxs,
    justifyContent: 'center',
  },
  tag: {
    backgroundColor: palette.parchment,
    borderRadius: radii.pill,
    maxWidth: '100%',
    paddingHorizontal: spacing.xs,
    paddingVertical: 1,
  },
  tagText: {
    color: palette.inkFaint,
    fontSize: 9,
    fontWeight: '600',
  },
});
