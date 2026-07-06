import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { DeliveryOffer } from '@/contracts';
import { OfferCard, SectionLabel, WoodButton, palette, spacing, typeScale, type OfferCardData } from '@/ui';
import { glyphFor } from '@/juice';
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
  const dispatchAction = useRunStore((state) => state.dispatchAction);
  const [selected, setSelected] = useState(0);

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

  return (
    <View style={[styles.screen, { paddingTop: insets.top + spacing.sm }]}>
      <View style={styles.topBar}>
        <Pressable accessibilityRole="button" hitSlop={12} onPress={() => router.back()}>
          <Text style={styles.back}>‹ Menu</Text>
        </Pressable>
        <Text style={styles.title}>Delivery</Text>
        <View style={styles.spacer} />
      </View>

      <View style={styles.pickBody}>
        <SectionLabel>{`DAY ${gameState.day} DELIVERY — DRAFT ONE`}</SectionLabel>
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
        <Text style={styles.caption}>
          {lastRejectedAction?.message ?? 'The other offers leave when you draft.'}
        </Text>
        <View style={[styles.actions, { paddingBottom: insets.bottom + spacing.lg }]}>
          <WoodButton
            label={selectedOffer ? `Draft ${selectedOffer.item.name}` : 'No Offer'}
            disabled={!selectedOffer}
            onPress={draftSelected}
          />
        </View>
      </View>
    </View>
  );
}

interface DraftOfferCard extends OfferCardData {
  offerId: string;
}

function offerToCard(offer: DeliveryOffer): DraftOfferCard {
  return {
    offerId: offer.offerId,
    name: offer.item.name,
    tier: offer.item.tier,
    baseValue: offer.item.baseValue,
    glyph: glyphFor(offer.item.id),
    tags: offer.item.tags,
  };
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: palette.wallCream,
    flex: 1,
    gap: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
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
