import { useCallback, useEffect, useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { DeliveryOffer, Slot, SlotState } from '@/contracts';
import {
  CoinCounter,
  SectionLabel,
  Toggle,
  WoodButton,
  layout,
  palette,
  radii,
  shadows,
  spacing,
  typeScale,
  type OfferCardData,
} from '@/ui';
import { ITEM_GLYPHS, ShelfScene, glyphFor, setMusicTrack, spriteFor } from '@/juice';
import { REROLL_COST } from '@/sim';
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

  // Rent was just paid before restock — back to the calm golden-hour bed.
  useFocusEffect(useCallback(() => setMusicTrack('main'), []));

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
    <View style={[styles.screen, { paddingTop: insets.top + layout.screenTopGap }]}>
      <View style={styles.topBar}>
        <Pressable accessibilityRole="button" hitSlop={12} onPress={() => router.back()}>
          <Text style={styles.back}>‹ Menu</Text>
        </Pressable>
        <View style={styles.titleWrap} pointerEvents="none">
          <Text style={styles.title}>Restock</Text>
        </View>
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
                  {spriteFor(slotState.item.itemId) ? (
                    <Image
                      source={spriteFor(slotState.item.itemId) as number}
                      style={styles.sellSprite}
                      resizeMode="cover"
                    />
                  ) : (
                    <Text style={styles.sellGlyph}>{glyphFor(slotState.item.itemId)}</Text>
                  )}
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
            <SectionLabel>DAILY SHOP</SectionLabel>
            <Pressable
              accessibilityRole="button"
              disabled={Boolean(gameState.heldItem)}
              onPress={reroll}
              style={({ pressed }) => [styles.reroll, pressed && styles.pressed]}
            >
              <Text style={styles.rerollText}>
                {(gameState.freeRerollTokens ?? 0) > 0 ? '🎟️ Free reroll' : `Reroll · ${REROLL_COST}`}
              </Text>
            </Pressable>
          </View>
          <View style={styles.shopList}>
            {offers.length === 0 ? (
              <Text style={styles.caption}>No offers left — reroll or end the day.</Text>
            ) : (
              offers.map((offer, index) => {
                const canBuy = gameState.coins >= offer.cost && Boolean(emptySlot);
                return (
                  <View key={offer.offerId} style={styles.shopRow}>
                    <View style={styles.shopThumb}>
                      {offer.sprite ? (
                        <Image source={offer.sprite as number} style={styles.shopThumbImg} resizeMode="contain" />
                      ) : (
                        <Text style={styles.shopThumbGlyph}>{offer.glyph}</Text>
                      )}
                    </View>
                    <View style={styles.shopInfo}>
                      <Text numberOfLines={1} style={styles.shopName}>{offer.name}</Text>
                      <View style={styles.shopTags}>
                        {offer.tags.slice(0, 2).map((tag) => (
                          <View key={tag} style={styles.shopTag}>
                            <Text style={styles.shopTagText}>{tag}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                    <Pressable
                      accessibilityRole="button"
                      disabled={!canBuy}
                      onPress={() => buy(index)}
                      style={({ pressed }) => [styles.shopBuy, pressed && styles.pressed, !canBuy && styles.faded]}
                    >
                      <View style={styles.coinDot} />
                      <Text style={styles.shopBuyText}>{offer.cost}</Text>
                    </Pressable>
                  </View>
                );
              })
            )}
          </View>
          <Text style={styles.caption}>
            {lastRejectedAction?.message ?? "Buy what you can afford and place it. Rent is due at week's end."}
          </Text>
        </View>
      )}

      <View style={[styles.actions, { paddingBottom: insets.bottom + layout.screenBottomGap }]}>
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
  const sprite = spriteFor(offer.item.id);
  return {
    offerId: offer.offerId,
    name: offer.item.name,
    tier: offer.item.tier,
    baseValue: offer.item.baseValue,
    cost: offer.cost,
    glyph: glyphFor(offer.item.id),
    ...(sprite !== null ? { sprite } : {}),
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
    paddingHorizontal: layout.screenPadX,
  },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  back: {
    ...typeScale.heading,
    color: palette.tealDark,
  },
  // Absolute-centered so the title is truly centered regardless of the unequal
  // Menu (left) / coin (right) widths. pointer-transparent so Menu stays tappable.
  titleWrap: {
    alignItems: 'center',
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
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
  // Daily shop: a robust vertical list of offer rows (thumb | info | buy).
  shopList: {
    gap: spacing.sm,
  },
  shopRow: {
    alignItems: 'center',
    backgroundColor: palette.creamBright,
    borderColor: palette.parchmentEdge,
    borderRadius: radii.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...shadows.card,
  },
  shopThumb: {
    alignItems: 'center',
    backgroundColor: palette.wallCream,
    borderRadius: radii.md,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  shopThumbImg: {
    height: 44,
    width: 44,
  },
  shopThumbGlyph: {
    fontSize: 28,
  },
  shopInfo: {
    flex: 1,
    gap: spacing.xxs,
  },
  shopName: {
    ...typeScale.heading,
    color: palette.ink,
    fontSize: 15,
  },
  shopTags: {
    flexDirection: 'row',
    gap: spacing.xxs,
  },
  shopTag: {
    backgroundColor: palette.parchment,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.xs,
    paddingVertical: 1,
  },
  shopTagText: {
    color: palette.inkFaint,
    fontSize: 9,
    fontWeight: '600',
  },
  shopBuy: {
    alignItems: 'center',
    backgroundColor: palette.accentTeal,
    borderRadius: radii.pill,
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'center',
    minWidth: 64,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  shopBuyText: {
    ...typeScale.coin,
    color: palette.creamBright,
    fontSize: 15,
    lineHeight: 18,
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
  sellSprite: {
    borderRadius: radii.sm,
    height: 44,
    width: 44,
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
