import { useCallback, useEffect, useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { DeliveryOffer } from '@/contracts';
import { OfferCard, SectionLabel, WoodButton, borders, layout, palette, radii, shadows, spacing, touch, typeScale, type OfferCardData } from '@/ui';
import { glyphFor, setMusicTrack, spriteFor } from '@/juice';
import { routeForGameState } from '../state/phaseRouting';
import { runSelectors, useRunStore } from '../state/store';

/**
 * Delivery draft: renders the engine's real seeded offers and dispatches the
 * contract `draftItem` action. The tray-to-slot gesture is Lane B's M3 polish
 * pass; Lane A routes to the shelf HUD where the held item is placed.
 */

export default function DraftScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const gameState = useRunStore(runSelectors.gameState);
  const lastRejectedAction = useRunStore(runSelectors.lastRejectedAction);
  const pendingSupplierTags = useRunStore(runSelectors.pendingSupplierTags);
  const dispatchAction = useRunStore((state) => state.dispatchAction);
  const [selected, setSelected] = useState(0);

  // Everyday golden-hour bed while drafting.
  useFocusEffect(useCallback(() => setMusicTrack('main'), []));

  useEffect(() => {
    const route = routeForGameState(gameState);
    if (route !== '/draft') router.replace(route);
  }, [gameState, router]);

  useEffect(() => {
    if (selected >= gameState.currentOffers.length) {
      setSelected(Math.max(0, gameState.currentOffers.length - 1));
    }
  }, [gameState.currentOffers.length, selected]);

  const offers = useMemo(
    () => gameState.currentOffers.map((offer) => offerToCard(offer)),
    [gameState.currentOffers],
  );
  const selectedOffer = gameState.currentOffers[selected] ?? null;

  const draftSelected = () => {
    if (!selectedOffer) return;
    const result = dispatchAction({ type: 'draftItem', offerIndex: selected });
    if (!result.accepted) return;
    void result.save.catch(() => undefined);
    router.replace(routeForGameState(result.gameState));
  };

  // Build steering (Phase 2b): committing a supplier lean regenerates the
  // opening offers toward that tag and unblocks drafting. Stays on this screen —
  // the picker disappears once supplierTag is set.
  const chooseSupplier = (tag: string) => {
    const result = dispatchAction({ type: 'chooseSupplier', tag });
    if (result.accepted) void result.save.catch(() => undefined);
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top + layout.screenTopGap }]}>
      {/* morning-delivery room behind everything; the opaque offer cards and the
          wood button ride on top, the scrim keeps the caption text readable */}
      <Image
        source={require('../../assets/scene/room-delivery.jpg')}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      />
      <View pointerEvents="none" style={styles.scrim} />

      <View style={styles.topBar}>
        <Pressable accessibilityRole="button" hitSlop={12} onPress={() => router.back()}>
          <Text style={styles.back}>‹ Menu</Text>
        </Pressable>
        <Text style={styles.title}>Delivery</Text>
        <View style={styles.spacer} />
      </View>

      {pendingSupplierTags ? (
        <View style={styles.pickBody}>
          <View style={styles.labelPlate}>
            <SectionLabel>CHOOSE YOUR SUPPLIER</SectionLabel>
          </View>
          <View style={styles.captionPlate}>
            <Text style={styles.caption}>
              Lean into an archetype — the shop tilts toward it all run.
            </Text>
          </View>
          <View style={styles.supplierGrid}>
            {pendingSupplierTags.map((tag) => (
              <Pressable
                key={tag}
                accessibilityRole="button"
                style={styles.supplierChip}
                onPress={() => chooseSupplier(tag)}
              >
                <Text style={styles.supplierChipText}>{capitalize(tag)}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : (
        <View style={styles.pickBody}>
          <View style={styles.labelPlate}>
            <SectionLabel>{`DAY ${gameState.day} DELIVERY — DRAFT ONE`}</SectionLabel>
          </View>
          <View style={styles.offers}>
            {offers.length === 0 ? (
              <Text style={styles.caption}>No delivery offers are available.</Text>
            ) : (
              offers.map((offer, index) => (
                <OfferCard
                  key={offer.offerId}
                  offer={offer}
                  selected={index === selected}
                  onPress={() => setSelected(index)}
                />
              ))
            )}
          </View>
          <View style={styles.captionPlate}>
            <Text style={styles.caption}>
              {lastRejectedAction?.message ?? 'The other offers leave when you draft.'}
            </Text>
          </View>
          <View style={[styles.actions, { paddingBottom: insets.bottom + layout.screenBottomGap }]}>
            <WoodButton
              label={selectedOffer ? `Draft ${selectedOffer.item.name}` : 'No Offer'}
              disabled={!selectedOffer}
              onPress={draftSelected}
            />
          </View>
        </View>
      )}
    </View>
  );
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

interface DraftOfferCard extends OfferCardData {
  offerId: string;
}

function offerToCard(offer: DeliveryOffer): DraftOfferCard {
  const sprite = spriteFor(offer.item.id);
  return {
    offerId: offer.offerId,
    name: offer.item.name,
    tier: offer.item.tier,
    baseValue: offer.item.baseValue,
    glyph: glyphFor(offer.item.id),
    ...(sprite !== null ? { sprite } : {}),
    tags: offer.item.tags,
  };
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: palette.wallCream,
    flex: 1,
    gap: spacing.lg,
    paddingHorizontal: layout.screenPadX,
  },
  scrim: {
    backgroundColor: palette.wallCream,
    bottom: 0,
    left: 0,
    opacity: 0.22,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  topBar: {
    alignItems: 'center',
    backgroundColor: palette.plate,
    borderRadius: radii.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...shadows.card,
  },
  labelPlate: {
    alignSelf: 'flex-start',
    backgroundColor: palette.plate,
    borderRadius: radii.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
  },
  captionPlate: {
    alignSelf: 'center',
    backgroundColor: palette.plate,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  back: {
    ...typeScale.heading,
    color: palette.tealDark,
    width: 72,
  },
  title: {
    ...typeScale.title,
    color: palette.ink,
  },
  spacer: {
    width: 72,
  },
  pickBody: {
    flex: 1,
    gap: spacing.lg,
  },
  offers: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  supplierGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'center',
  },
  supplierChip: {
    alignItems: 'center',
    backgroundColor: palette.plate,
    borderColor: palette.parchmentEdge,
    borderRadius: radii.md,
    borderWidth: borders.regular,
    justifyContent: 'center',
    minHeight: touch.minTargetPt,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    ...shadows.card,
  },
  supplierChipText: {
    ...typeScale.heading,
    color: palette.ink,
  },
  caption: {
    ...typeScale.body,
    color: palette.inkFaint,
    textAlign: 'center',
  },
  actions: {
    gap: spacing.md,
    marginTop: 'auto',
  },
});
