import { useCallback, useEffect, useMemo, useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { DeliveryOffer, Slot } from '@/contracts';
import {
  AppText,
  CoinCounter,
  SectionLabel,
  TagChip,
  Toggle,
  WoodButton,
  layout,
  usePalette,
  useThemedStyles,
  type OfferCardData,
} from '@/ui';
import { ITEM_GLYPHS, ShelfScene, glyphFor, setMusicTrack, spriteFor } from '@/juice';

import { makeStyles } from './restock.styles';
import { routeForGameState } from '../state/phaseRouting';
import {
  hasSlotAction,
  rerollCost,
  restockAffordanceView,
  runSelectors,
  sellShelfView,
  shopHeaderView,
  signatureBlurb,
  slotActionFor,
  useRunStore,
} from '../state/store';

/**
 * Restock: real engine offers and economy. Buy/reroll/sell/end all go through
 * the contract action dispatcher; local state only tracks the Buy/Sell toggle.
 */

export default function RestockScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(makeStyles);
  const palette = usePalette();
  const gameState = useRunStore(runSelectors.gameState);
  const rejectedActionCount = useRunStore(runSelectors.rejectedActionCount);
  const lastRejectedAction = useRunStore(runSelectors.lastRejectedAction);
  const dispatchAction = useRunStore((state) => state.dispatchAction);
  const [sellMode, setSellMode] = useState(false);
  const affordances = useMemo(() => restockAffordanceView(gameState), [gameState]);

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
  const sellShelf = useMemo(
    () => sellShelfView(gameState).filter(({ slot }) => hasSlotAction(affordances.sellActions, slot)),
    [affordances.sellActions, gameState],
  );
  const shopHeader = useMemo(() => shopHeaderView(gameState), [gameState]);
  const firstPlaceAction = affordances.placeActions[0] ?? null;

  const dispatchAndSave = (action: Parameters<typeof dispatchAction>[0]) => {
    const result = dispatchAction(action);
    if (result.accepted) {
      void result.save.catch(() => undefined);
    }
    return result;
  };

  const buy = (offerIndex: number) => {
    const action = affordances.buyActions.find((candidate) => candidate.offerIndex === offerIndex);
    if (!action) return;
    dispatchAndSave(action);
  };

  const reroll = () => {
    if (!affordances.rerollAction) return;
    dispatchAndSave(affordances.rerollAction);
  };

  const sell = (slot: Slot) => {
    const action = slotActionFor(affordances.sellActions, slot);
    if (!action) return;
    dispatchAndSave(action);
  };

  const moveItem = (from: Slot, to: Slot) => {
    dispatchAndSave({ type: 'moveItem', from, to });
  };

  const placePurchase = () => {
    if (!firstPlaceAction) return;
    dispatchAndSave(firstPlaceAction);
  };

  // Drag-to-place: drop the held purchase on a specific slot (the button below
  // stays as a one-tap fallback that fills the first empty slot).
  const placeAt = (slot: Slot) => {
    const action = slotActionFor(affordances.placeActions, slot);
    if (!action) return;
    dispatchAndSave(action);
  };

  const endRestock = () => {
    if (!affordances.endRestockAction) return;
    const result = dispatchAndSave(affordances.endRestockAction);
    if (result.accepted) {
      router.replace(routeForGameState(result.gameState));
    }
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top + layout.screenTopGap }]}>
      <View style={styles.topBar}>
        <Pressable accessibilityRole="button" hitSlop={12} onPress={() => router.dismissTo('/')}>
          <AppText variant="heading" color={palette.tealDark}>‹ Menu</AppText>
        </Pressable>
        <View style={styles.titleWrap} pointerEvents="none">
          <AppText variant="title" color={palette.ink}>{shopHeader.isDailyShop ? 'Daily Shop' : 'Restock'}</AppText>
        </View>
        <CoinCounter coins={gameState.coins} animate />
      </View>

      <View style={styles.modeRow}>
        <AppText variant="heading" color={!sellMode ? palette.ink : palette.inkFaint}>Buy</AppText>
        <Toggle accessibilityLabel="Sell mode" value={sellMode} onValueChange={setSellMode} />
        <AppText variant="heading" color={sellMode ? palette.ink : palette.inkFaint}>Sell</AppText>
      </View>

      {gameState.heldItem ? (
        <View style={styles.body}>
          <SectionLabel>PLACE PURCHASE</SectionLabel>
          <ShelfScene
            key={`${gameState.runId}-${rejectedActionCount}`}
            gameState={gameState}
            glyphs={ITEM_GLYPHS}
            onMove={moveItem}
            heldItem={gameState.heldItem}
            onPlace={placeAt}
          />
          <AppText variant="body" color={palette.inkFaint} style={styles.caption}>
            {lastRejectedAction?.message ?? `Drag ${gameState.heldItem.name} to a slot — or tap below.`}
          </AppText>
          <WoodButton
            label={firstPlaceAction ? `Place ${gameState.heldItem.name}` : 'No Empty Slot'}
            disabled={!firstPlaceAction}
            onPress={placePurchase}
          />
        </View>
      ) : sellMode ? (
        <View style={styles.body}>
          <SectionLabel>SELL FROM YOUR SHELF</SectionLabel>
          <View style={styles.sellGrid}>
            {sellShelf.length === 0 ? (
              <AppText variant="body" color={palette.inkFaint} style={styles.caption}>Shelf cleared. Nothing left to sell.</AppText>
            ) : (
              sellShelf.map(({ slot, item, price }) => (
                <Pressable
                  key={item.instanceId}
                  accessibilityRole="button"
                  onPress={() => sell(slot)}
                  style={({ pressed }) => [styles.sellCard, pressed && styles.pressed]}
                >
                  {spriteFor(item.itemId) ? (
                    <Image
                      source={spriteFor(item.itemId) as number}
                      style={styles.sellSprite}
                      resizeMode="cover"
                    />
                  ) : (
                    /* decorative glyph icon — raw <Text> exception */
                    <Text style={styles.sellGlyph}>{glyphFor(item.itemId)}</Text>
                  )}
                  <AppText variant="label" color={palette.ink} numberOfLines={1} style={styles.sellName}>{item.name}</AppText>
                  <View style={styles.sellTag}>
                    <AppText variant="coin" color={palette.ink} style={styles.sellValue}>{`Sell +${price}`}</AppText>
                  </View>
                </Pressable>
              ))
            )}
          </View>
          <AppText variant="body" color={palette.inkFaint} style={styles.caption}>{lastRejectedAction?.message ?? 'Sold items leave the shelf immediately.'}</AppText>
        </View>
      ) : (
        <View style={styles.body}>
          <View style={styles.offersHeader}>
            <View style={styles.shopHeaderText}>
              <SectionLabel>{shopHeader.isDailyShop ? "TODAY'S STOCK" : 'RESTOCK'}</SectionLabel>
              <AppText variant="label" color={palette.inkFaint} style={styles.shopContext}>
                {`Day ${shopHeader.day} · ${shopHeader.coins}c to spend · ${shopHeader.spotsOpen} ${
                  shopHeader.spotsOpen === 1 ? 'spot' : 'spots'
                } open`}
              </AppText>
            </View>
            <Pressable
              accessibilityRole="button"
              disabled={!affordances.rerollAction}
              onPress={reroll}
              style={({ pressed }) => [styles.reroll, pressed && styles.pressed]}
            >
              {(gameState.freeRerollTokens ?? 0) > 0 ? (
                <AppText variant="label" color={palette.tealDark} style={styles.rerollText}>🎟️ Free reroll</AppText>
              ) : (
                <View style={styles.rerollInner}>
                  <AppText variant="label" color={palette.tealDark} style={styles.rerollText}>Reroll</AppText>
                  <View style={styles.coinDot} />
                  {/* coin-adjacent digit (baloo2IconNudge) — raw <Text> exception */}
                  <Text style={styles.rerollCost}>{rerollCost}</Text>
                </View>
              )}
            </Pressable>
          </View>
          <View style={styles.shopList}>
            {offers.length === 0 ? (
              <AppText variant="body" color={palette.inkFaint} style={styles.caption}>No offers left — reroll or end the day.</AppText>
            ) : (
              offers.map((offer, index) => {
                const canBuy = affordances.buyActions.some((action) => action.offerIndex === index);
                return (
                  <View
                    key={offer.offerId}
                    style={[styles.shopRow, offer.blurb ? styles.shopRowSignature : null]}
                  >
                    <View style={[styles.shopThumb, offer.blurb ? styles.shopThumbSignature : null]}>
                      {offer.sprite ? (
                        <Image source={offer.sprite as number} style={styles.shopThumbImg} resizeMode="contain" />
                      ) : (
                        /* decorative glyph icon — raw <Text> exception */
                        <Text style={styles.shopThumbGlyph}>{offer.glyph}</Text>
                      )}
                    </View>
                    <View style={styles.shopInfo}>
                      <View style={styles.shopNameRow}>
                        <AppText variant="heading" color={palette.ink} numberOfLines={1} style={styles.shopName}>{offer.name}</AppText>
                        {offer.blurb ? (
                          <View style={styles.signatureBadge}>
                            {/* bespoke badge (no type role / font family) — raw <Text> exception */}
                            <Text style={styles.signatureBadgeText}>✦ SIGNATURE</Text>
                          </View>
                        ) : null}
                      </View>
                      {offer.blurb ? (
                        <AppText variant="body" color={palette.emberDark} numberOfLines={2} style={styles.signatureEffect}>{offer.blurb}</AppText>
                      ) : (
                        <View style={styles.shopTags}>
                          {offer.tags.slice(0, 2).map((tag) => (
                            <TagChip key={tag} label={tag} />
                          ))}
                        </View>
                      )}
                    </View>
                    <Pressable
                      accessibilityRole="button"
                      disabled={!canBuy}
                      onPress={() => buy(index)}
                      style={({ pressed }) => [styles.shopBuy, pressed && styles.pressed, !canBuy && styles.faded]}
                    >
                      <View style={styles.coinDot} />
                      {/* coin-adjacent digit (baloo2IconNudge) — raw <Text> exception */}
                      <Text style={styles.shopBuyText}>{offer.cost}</Text>
                    </Pressable>
                  </View>
                );
              })
            )}
          </View>
          <AppText variant="body" color={palette.inkFaint} style={styles.caption}>
            {lastRejectedAction?.message ?? "Buy what you can afford and place it. Rent is due at week's end."}
          </AppText>
        </View>
      )}

      <View style={[styles.actions, { paddingBottom: insets.bottom + layout.screenBottomGap }]}>
        <WoodButton
          label={
            gameState.heldItem
              ? 'Place Purchase First'
              : shopHeader.isDailyShop
                ? 'Done Shopping'
                : 'End Restock'
          }
          disabled={!affordances.endRestockAction}
          onPress={endRestock}
        />
      </View>
    </View>
  );
}

interface RestockOfferCard extends OfferCardData {
  offerId: string;
  cost: number;
  /** Signature-stock effect line, or null for ordinary items. */
  blurb: string | null;
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
    blurb: signatureBlurb(offer.item),
  };
}
