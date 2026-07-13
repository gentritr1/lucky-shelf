import { useCallback, useEffect, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { DeliveryOffer } from '@/contracts';
import { AppText, OfferCard, OnboardingHint, SectionLabel, TagIcon, WoodButton, buildAccents, layout, usePalette, useThemedStyles, type OfferCardData } from '@/ui';
import { Entrance, glyphFor, setMusicTrack, spriteFor } from '@/juice';

import { makeStyles } from '@/screen-styles/draft.styles';
import { routeForGameState } from '../state/phaseRouting';
import { draftAffordanceView, itemRuleLines, runSelectors, useRunStore } from '../state/store';
import { useOnboardingStore } from '../state/onboardingStore';

/**
 * Delivery draft: renders the engine's real seeded offers and dispatches the
 * contract `draftItem` action. The tray-to-slot gesture is Lane B's M3 polish
 * pass; Lane A routes to the shelf HUD where the held item is placed.
 */

export default function DraftScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(makeStyles);
  const palette = usePalette();
  const gameState = useRunStore(runSelectors.gameState);
  const lastRejectedAction = useRunStore(runSelectors.lastRejectedAction);
  const dispatchAction = useRunStore((state) => state.dispatchAction);
  const [selected, setSelected] = useState(0);
  const affordances = useMemo(() => draftAffordanceView(gameState), [gameState]);
  const pendingSupplierTags = affordances.pendingSupplierTags;
  const onboardingLoaded = useOnboardingStore((state) => state.loaded);
  const syncOnboardingTo = useOnboardingStore((state) => state.syncTo);

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

  // The game state is the tutorial clock: once the supplier picker has gone,
  // the player has completed that verb. This also reconciles resumed/flag-off
  // runs without a second tutorial state machine.
  useEffect(() => {
    if (onboardingLoaded && !pendingSupplierTags) {
      void syncOnboardingTo('draft').catch(() => undefined);
    }
  }, [onboardingLoaded, pendingSupplierTags, syncOnboardingTo]);

  const offers = useMemo(
    () => gameState.currentOffers.map((offer) => offerToCard(offer)),
    [gameState.currentOffers],
  );
  const selectedOffer = gameState.currentOffers[selected] ?? null;
  const selectedRules = useMemo(
    () => (selectedOffer ? itemRuleLines(selectedOffer.item) : []),
    [selectedOffer],
  );
  const selectedDraftAction =
    affordances.draftActions.find((action) => action.offerIndex === selected) ?? null;

  const draftSelected = () => {
    if (!selectedDraftAction) return;
    const result = dispatchAction(selectedDraftAction);
    if (!result.accepted) return;
    void result.save.catch(() => undefined);
    router.replace(routeForGameState(result.gameState));
  };

  // Build steering (Phase 2b): committing a supplier lean regenerates the
  // opening offers toward that tag and unblocks drafting. Stays on this screen —
  // the picker disappears once supplierTag is set.
  const chooseSupplier = (tag: string) => {
    const action = affordances.chooseSupplierActions.find((candidate) => candidate.tag === tag);
    if (!action) return;
    const result = dispatchAction(action);
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
        <Pressable accessibilityRole="button" hitSlop={12} onPress={() => router.dismissTo('/')}>
          <AppText variant="heading" color={palette.tealDark} style={styles.back}>‹ Menu</AppText>
        </Pressable>
        <AppText variant="title" color={palette.ink}>Delivery</AppText>
        <View style={styles.spacer} />
      </View>

      {pendingSupplierTags ? (
        <ScrollView
          style={styles.pickBody}
          contentContainerStyle={styles.supplierScroll}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.supplierPanel}>
            <OnboardingHint step="supplier" />
            <SectionLabel>CHOOSE YOUR SUPPLIER</SectionLabel>
            <AppText variant="body" color={palette.inkSoft} style={styles.supplierHint}>
              Lean into an archetype — the shop tilts toward it all run.
            </AppText>
            <View style={styles.supplierGrid}>
              {pendingSupplierTags.map((tag) => (
                <Pressable
                  key={tag}
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    styles.supplierChip,
                    { borderColor: buildAccents[tag] ?? palette.goldDeep },
                    pressed && styles.supplierChipPressed,
                  ]}
                  onPress={() => chooseSupplier(tag)}
                >
                  <TagIcon tag={tag} size={28} badge badgeSize={56} />
                  <AppText variant="heading" color={palette.ink} style={styles.supplierChipText}>{capitalize(tag)}</AppText>
                </Pressable>
              ))}
            </View>
          </View>
        </ScrollView>
      ) : (
        <ScrollView
          style={styles.pickBody}
          contentContainerStyle={styles.pickContent}
          showsVerticalScrollIndicator={false}
        >
          <OnboardingHint step="draft" />
          <Entrance index={0} style={styles.labelPlate}>
            <SectionLabel>{`DAY ${gameState.day} DELIVERY — DRAFT ONE`}</SectionLabel>
          </Entrance>
          <Entrance index={1} style={styles.offers}>
            {offers.length === 0 ? (
              <AppText variant="body" color={palette.inkFaint} style={styles.caption}>No delivery offers are available.</AppText>
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
          </Entrance>
          <Entrance index={2} style={styles.captionPlate}>
            <AppText variant="body" color={palette.ink} style={styles.caption}>
              {lastRejectedAction?.message ?? selectedRules.slice(0, 2).join(' · ')}
            </AppText>
            {lastRejectedAction ? null : (
              <AppText variant="label" color={palette.inkFaint} style={styles.caption}>
                The other offers leave when you draft.
              </AppText>
            )}
          </Entrance>
          <Entrance index={3} style={[styles.actions, { paddingBottom: insets.bottom + layout.screenBottomGap }]}>
            <WoodButton
              label={selectedOffer ? `Draft ${selectedOffer.item.name}` : 'No Offer'}
              disabled={!selectedDraftAction}
              onPress={draftSelected}
            />
          </Entrance>
        </ScrollView>
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
