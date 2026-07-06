import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { palette, radii, shadows, spacing, typeScale } from '../tokens';

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
        <Image source={offer.sprite} style={styles.sprite} resizeMode="cover" />
      ) : (
        <Text style={styles.glyph}>{offer.glyph}</Text>
      )}
      <Text numberOfLines={1} style={styles.name}>
        {offer.name}
      </Text>
      <View style={styles.pips}>
        {Array.from({ length: offer.tier }, (_, index) => (
          <View key={index} style={styles.pip} />
        ))}
      </View>
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
    borderRadius: radii.lg,
    borderWidth: 1,
    flex: 1,
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md,
    ...shadows.card,
  },
  selected: {
    borderColor: palette.accentTeal,
    borderWidth: 2,
  },
  pressed: {
    transform: [{ scale: 0.97 }],
  },
  glyph: {
    fontSize: 40,
  },
  sprite: {
    borderRadius: radii.sm,
    height: 52,
    width: 52,
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
    borderWidth: 1.5,
    height: 12,
    width: 12,
  },
  value: {
    ...typeScale.coin,
    fontSize: 16,
    lineHeight: 20,
    color: palette.ink,
  },
  tags: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  tag: {
    backgroundColor: palette.parchment,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 1,
  },
  tagText: {
    color: palette.inkFaint,
    fontSize: 10,
    fontWeight: '600',
  },
});
