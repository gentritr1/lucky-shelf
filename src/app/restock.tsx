import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { DeliveryOffer, Slot, SlotState } from '@/contracts';
import {
  CoinCounter,
  OfferCard,
  SectionLabel,
  Toggle,
  WoodButton,
  palette,
  radii,
  shadows,
  spacing,
  typeScale,
  type OfferCardData,
} from '@/ui';
import { ITEM_GLYPHS, ShelfScene, glyphFor } from '@/juice';
import { routeForGameState } from '../state/phaseRouting';
import { runSelectors, useRunStore } from '../state/store';

/**
 * Restock: real engine offers and economy. Buy/reroll/sell/end all go through
 * the contract action dispatcher; local state only tracks the Buy/Sell toggle.
 */

export default function RestockScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const gameState = useRunStore(runSelectors.gameState);
  const rejectedActionCount = useRunStore(runSelectors.rejectedActionCount);
  const lastRejectedAction = useRunStore(runSelectors.lastRejectedAction);
  const dispatchAction = useRunStore((state) => state.dispatchAction);
  const [sellMode, setSellMode] = useState(false);

  useEffect(() => {
    const route = routeForGameState(gameState);
    if (route !== '/restock') router.replace(route);
  }, [gameState, router]);

  const offers = useMemo(
    () => gameState.currentOffers.map((offer) => offerToCard(offer)),
    [gameState.currentOffers],
  );
  const sellSlots = useMemo(
    () => gameState.shelf.slots.filter((slot): slot is SlotState & { item: NonNullable<SlotState['item']> } => slot.item !== null),
    [gameState.shelf.slots],
  );
  const emptySlot = firstEmptySlot(gameState);

  const dispatchAndSave = (action: Parameters<typeof dispatchAction>[0]) => {
    const result = dispatchAction(action);
    if (result.accepted) {
      void result.save.catch(() => undefined);
    }
    return result;
  };

  const buy = (offerIndex: number) => {
    dispatchAndSave({ type: 'buyOffer', offerIndex });
  };

  const reroll = () => {
    dispatchAndSave({ type: 'reroll' });
  };

  const sell = (slot: Slot) => {
    dispatchAndSave({ type: 'sellItem', slot });
  };

  const moveItem = (from: Slot, to: Slot) => {
    dispatchAndSave({ type: 'moveItem', from, to });
  };

  const placePurchase = () => {
    if (!emptySlot) return;
    dispatchAndSave({ type: 'placeItem', slot: emptySlot });
  };

  const endRestock = () => {
    const result = dispatchAndSave({ type: 'endRestock' });
    if (result.accepted) {
      router.replace(routeForGameState(result.gameState));
    }
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top + spacing.sm }]}>
      <View style={styles.topBar}>
        <Pressable accessibilityRole="button" hitSlop={12} onPress={() => router.back()}>
          <Text style={styles.back}>‹ Menu</Text>
        </Pressable>
        <Text style={styles.title}>Restock</Text>
        <CoinCounter coins={gameState.coins} animate />
      </View>

      <View style={styles.modeRow}>
        <Text style={[styles.modeLabel, !sellMode && styles.modeActive]}>Buy</Text>
        <Toggle accessibilityLabel="Sell mode" value={sellMode} onValueChange={setSellMode} />
        <Text style={[styles.modeLabel, sellMode && styles.modeActive]}>Sell</Text>
      </View>

      {gameState.heldItem ? (
        <View style={styles.body}>
          <SectionLabel>PLACE PURCHASE</SectionLabel>
          <ShelfScene
            key={`${gameState.runId}-${rejectedActionCount}`}
            gameState={gameState}
            glyphs={ITEM_GLYPHS}
            onMove={moveItem}
          />
          <Text style={styles.caption}>
            {lastRejectedAction?.message ?? `${gameState.heldItem.name} is waiting for a shelf slot.`}
          </Text>
          <WoodButton
            label={emptySlot ? `Place ${gameState.heldItem.name}` : 'No Empty Slot'}
            disabled={!emptySlot}
            onPress={placePurchase}
          />
        </View>
      ) : sellMode ? (
        <View style={styles.body}>
          <SectionLabel>SELL FROM YOUR SHELF</SectionLabel>
          <View style={styles.sellGrid}>
            {sellSlots.length === 0 ? (
              <Text style={styles.caption}>Shelf cleared. Nothing left to sell.</Text>
            ) : (
              sellSlots.map((slotState) => (
                <Pressable
                  key={slotState.item.instanceId}
                  accessibilityRole="button"
                  onPress={() => sell(slotState.slot)}
                  style={({ pressed }) => [styles.sellCard, pressed && styles.pressed]}
                >
                  <Text style={styles.sellGlyph}>{glyphFor(slotState.item.itemId)}</Text>
                  <Text numberOfLines={1} style={styles.sellName}>{slotState.item.name}</Text>
                  <View style={styles.sellTag}>
                    <View style={styles.coinDot} />
                    <Text style={styles.sellValue}>Sell</Text>
                  </View>
                </Pressable>
              ))
            )}
          </View>
          <Text style={styles.caption}>{lastRejectedAction?.message ?? 'Sold items leave the shelf immediately.'}</Text>
        </View>
      ) : (
        <View style={styles.body}>
          <View style={styles.offersHeader}>
            <SectionLabel>BUY AN OFFER</SectionLabel>
            <Pressable
              accessibilityRole="button"
              disabled={Boolean(gameState.heldItem)}
              onPress={reroll}
              style={({ pressed }) => [styles.reroll, pressed && styles.pressed]}
            >
              <Text style={styles.rerollText}>Reroll</Text>
            </Pressable>
          </View>
          <View style={styles.offers}>
            {offers.length === 0 ? (
              <Text style={styles.caption}>No restock offers remain.</Text>
            ) : (
              offers.map((offer, index) => {
                const affordable = gameState.coins >= offer.cost;
                return (
                  <View key={offer.offerId} style={styles.offerCol}>
                    <View style={styles.costRibbon}>
                      <View style={styles.coinDot} />
                      <Text style={styles.costText}>{offer.cost}</Text>
                    </View>
                    <OfferCard offer={offer} />
                    <Pressable
                      accessibilityRole="button"
                      disabled={!affordable || !emptySlot}
                      onPress={() => buy(index)}
                      style={({ pressed }) => [
                        styles.buy,
                        pressed && styles.pressed,
                        (!affordable || !emptySlot) && styles.faded,
                      ]}
                    >
                      <Text style={styles.buyText}>{affordable ? 'Buy' : 'Too dear'}</Text>
                    </Pressable>
                  </View>
                );
              })
            )}
          </View>
          <Text style={styles.caption}>{lastRejectedAction?.message ?? 'Bought items must be placed before you leave.'}</Text>
        </View>
      )}

      <View style={[styles.actions, { paddingBottom: insets.bottom + spacing.lg }]}>
        <WoodButton
          label={gameState.heldItem ? 'Place Purchase First' : 'End Restock'}
          disabled={Boolean(gameState.heldItem)}
          onPress={endRestock}
        />
      </View>
    </View>
  );
}

interface RestockOfferCard extends OfferCardData {
  offerId: string;
  cost: number;
}

function offerToCard(offer: DeliveryOffer): RestockOfferCard {
  return {
    offerId: offer.offerId,
    name: offer.item.name,
    tier: offer.item.tier,
    baseValue: offer.item.baseValue,
    cost: offer.cost,
    glyph: glyphFor(offer.item.id),
    tags: offer.item.tags,
  };
}

function firstEmptySlot(gameState: { shelf: { slots: readonly SlotState[] } }): Slot | null {
  return gameState.shelf.slots.find((slot) => !slot.item)?.slot ?? null;
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
  },
  title: {
    ...typeScale.title,
    color: palette.ink,
  },
  modeRow: {
    alignItems: 'center',
    alignSelf: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  modeLabel: {
    ...typeScale.heading,
    color: palette.inkFaint,
  },
  modeActive: {
    color: palette.ink,
  },
  body: {
    flex: 1,
    gap: spacing.md,
  },
  offersHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  offers: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  offerCol: {
    flex: 1,
    gap: spacing.sm,
  },
  costRibbon: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: palette.rentEmber,
    borderRadius: radii.pill,
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: 2,
    ...shadows.float,
  },
  costText: {
    ...typeScale.coin,
    color: palette.creamBright,
    fontSize: 14,
    lineHeight: 18,
  },
  coinDot: {
    backgroundColor: palette.coinGold,
    borderColor: palette.goldDeep,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    height: 12,
    width: 12,
  },
  buy: {
    alignItems: 'center',
    backgroundColor: palette.accentTeal,
    borderRadius: radii.md,
    minHeight: 40,
    justifyContent: 'center',
    paddingVertical: spacing.sm,
  },
  buyText: {
    ...typeScale.heading,
    color: palette.creamBright,
    fontSize: 15,
  },
  reroll: {
    backgroundColor: palette.creamBright,
    borderColor: palette.parchmentEdge,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    ...shadows.float,
  },
  rerollText: {
    ...typeScale.label,
    color: palette.tealDark,
    letterSpacing: 0,
  },
  sellGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  sellCard: {
    alignItems: 'center',
    backgroundColor: palette.creamBright,
    borderColor: palette.parchmentEdge,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.xxs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    width: 96,
    ...shadows.card,
  },
  sellGlyph: {
    fontSize: 34,
  },
  sellName: {
    ...typeScale.label,
    color: palette.ink,
    letterSpacing: 0,
    textTransform: 'none',
  },
  sellTag: {
    alignItems: 'center',
    backgroundColor: palette.coinGold,
    borderRadius: radii.pill,
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 1,
  },
  sellValue: {
    ...typeScale.coin,
    color: palette.ink,
    fontSize: 13,
    lineHeight: 16,
  },
  caption: {
    ...typeScale.body,
    color: palette.inkFaint,
    textAlign: 'center',
  },
  pressed: {
    transform: [{ scale: 0.97 }],
  },
  faded: {
    opacity: 0.45,
  },
  actions: {
    marginTop: 'auto',
  },
});
