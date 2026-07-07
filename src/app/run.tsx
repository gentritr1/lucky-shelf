import { useCallback, useEffect, useMemo, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Action, DeliveryOffer, GameState, Slot } from '@/contracts';
import {
  CoinCounter,
  MovesPips,
  OnboardingHint,
  RentChip,
  SectionLabel,
  WoodButton,
  layout,
  palette,
  radii,
  spacing,
  typeScale,
} from '@/ui';
import { CascadeLayer, DuskAmbience, ITEM_GLYPHS, ShelfScene, playCascadeSting, setMusicTrack } from '@/juice';
import { cascadeMountAfterOpenShop, routeForGameState, type CascadeMount } from '../state/phaseRouting';
import {
  orderHudView,
  runSelectors,
  synergyHudView,
  useRunStore,
  type OrderHudView,
  type SynergyHudView,
} from '../state/store';

// Rent runs on a 3-day cycle (RENT_PERIOD_DAYS). The tension bed takes over on
// the final morning before rent (dueInDays ≤ 1) — the same beat the DuskAmbience
// ember becomes clearly visible.
const RENT_TENSION_DUE_IN_DAYS = 1;

/**
 * Run HUD shell: Lane B owns presentation; Lane A wires the contract state and
 * action dispatch surface behind it.
 */
export default function RunHudScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const gameState = useRunStore(runSelectors.gameState);
  const rejectedActionCount = useRunStore(runSelectors.rejectedActionCount);
  const lastRejectedAction = useRunStore(runSelectors.lastRejectedAction);
  const dispatchAction = useRunStore((state) => state.dispatchAction);
  const [cascadeMount, setCascadeMount] = useState<CascadeMount | null>(null);

  // Music bed follows rent proximity: the golden-hour loop until the last
  // morning, then the sparser rent-week variant. Re-runs on focus and whenever
  // dueInDays crosses the threshold mid-run.
  const rentDueInDays = gameState.rent.dueInDays;
  useFocusEffect(
    useCallback(() => {
      setMusicTrack(rentDueInDays <= RENT_TENSION_DUE_IN_DAYS ? 'rentWeek' : 'main');
    }, [rentDueInDays]),
  );

  useEffect(() => {
    if (cascadeMount) return;
    const route = routeForGameState(gameState);
    if (route !== '/run') router.replace(route);
  }, [cascadeMount, gameState, router]);

  const dispatchAndSave = (action: Action) => {
    const result = dispatchAction(action);
    if (result.accepted) {
      void result.save.catch(() => undefined);
    }
    return result.accepted;
  };

  const onMove = (from: Slot, to: Slot) => {
    dispatchAndSave({ type: 'moveItem', from, to });
  };

  const onPlace = (slot: Slot) => {
    dispatchAndSave({ type: 'placeItem', slot });
  };

  const onPrimaryAction = () => {
    const primary = primaryActionFor(gameState);
    if (!primary) return;
    if (primary.action.type === 'openShop') {
      const beforeOpenShop = gameState;
      const result = dispatchAction(primary.action);
      if (!result.accepted) return;
      void result.save.catch(() => undefined);
      setCascadeMount(cascadeMountAfterOpenShop(beforeOpenShop, result.gameState));
      playCascadeSting();
      return;
    }
    dispatchAndSave(primary.action);
  };

  const continueAfterCascade = () => {
    const nextRoute = cascadeMount?.nextRoute ?? routeForGameState(useRunStore.getState().gameState);
    setCascadeMount(null);
    router.replace(nextRoute);
  };

  const primaryAction = primaryActionFor(gameState);
  const movementEnabled =
    (gameState.phase === 'arrange' || gameState.phase === 'restock') &&
    !gameState.heldItem &&
    (gameState.moves.freeRemaining > 0 || gameState.coins >= gameState.moves.paidMoveCost);

  // R-40: while the cascade overlay is up, the HUD behind it reads the
  // pre-openShop snapshot — the day that actually scored — never the phase the
  // sim has already advanced to. Presentation owns the temporal illusion; the
  // sim stays animation-agnostic (Pillar 5). The route fires only from the
  // layer's own onComplete, post-animation.
  const hudState = cascadeMount ? cascadeMount.gameState : gameState;
  // Build-identity signposts, computed off the render path (logic lives in the
  // store). Only shown when the cascade is down, where hudState === gameState.
  const synergy = useMemo(() => synergyHudView(gameState), [gameState]);
  const order = useMemo(() => orderHudView(gameState), [gameState]);
  const sceneState =
    cascadeMount || !movementEnabled ? movementLockedSceneState(hudState) : gameState;

  return (
    <View style={[styles.screen, { paddingTop: insets.top + layout.screenTopGap }]}>
      {/* rent proximity felt as warmth (behind content); hidden during cascade */}
      {cascadeMount ? null : <DuskAmbience dueInDays={hudState.rent.dueInDays} />}
      <View style={styles.topBar}>
        <Pressable accessibilityRole="button" hitSlop={12} onPress={() => router.back()}>
          <Text style={styles.back}>‹ Menu</Text>
        </Pressable>
        <View style={styles.dayWrap}>
          <Text style={styles.eyebrow}>DAY {hudState.day}</Text>
          <Text style={styles.phase}>{cascadeMount ? 'Open Shop' : labelPhase(gameState.phase)}</Text>
        </View>
        <CoinCounter coins={hudState.coins} />
      </View>

      <View style={styles.statusRow}>
        <RentChip amount={hudState.rent.amount} dueInDays={hudState.rent.dueInDays} />
        <MovesPips remaining={hudState.moves.freeRemaining} />
      </View>

      {!cascadeMount && order ? <OrderBanner order={order} /> : null}

      {!cascadeMount && gameState.dailyTarget != null ? (
        <GoalBanner target={gameState.dailyTarget} freeRerolls={gameState.freeRerollTokens ?? 0} />
      ) : null}

      {!cascadeMount && synergy ? <SynergyBadge active={synergy} /> : null}

      {/* The cascade overlay draws its OWN shelf; rendering the HUD shelf too
          produced a second, misaligned shelf peeking behind the scrim (extra
          slots + a cut-off item under the Day Total). So the HUD shelf is only
          shown when the cascade is not up. */}
      <View style={styles.shelfWrap}>
        {cascadeMount ? null : (
          <>
            <SectionLabel>YOUR SHELF</SectionLabel>
            <ShelfScene
              key={`${hudState.runId}-${rejectedActionCount}`}
              gameState={sceneState}
              glyphs={ITEM_GLYPHS}
              spotlight={gameState.spotlight ?? null}
              onMove={onMove}
              heldItem={gameState.heldItem}
              onPlace={onPlace}
            />
            <Text style={styles.hint}>{lastRejectedAction?.message ?? hintFor(gameState)}</Text>
          </>
        )}
      </View>

      {!cascadeMount && (primaryAction || !gameState.heldItem) ? (
        <View style={[styles.actions, { paddingBottom: insets.bottom + layout.screenBottomGap }]}>
          <WoodButton
            label={primaryAction ? primaryAction.label : 'Run Complete'}
            onPress={primaryAction ? onPrimaryAction : () => router.back()}
          />
        </View>
      ) : null}

      {/* R-36: the cascade is a modal overlay over the arrange HUD — it dims the
          scored shelf behind it, owns its single advance affordance, and only
          then routes. No next-phase header behind a running cascade. */}
      {cascadeMount ? (
        <View
          style={[
            styles.cascadeOverlay,
            { paddingTop: insets.top + spacing.huge, paddingBottom: insets.bottom + layout.screenBottomGap },
          ]}
        >
          <CascadeLayer
            gameState={cascadeMount.gameState}
            trace={cascadeMount.trace}
            rentDue={cascadeMount.rentDue}
            autoPlay
            onComplete={continueAfterCascade}
            completeLabel={cascadeMount.nextRoute === '/summary' ? 'See Results ▸' : 'Collect ▸'}
          />
        </View>
      ) : null}

      {/* first-run coachmark — only during arrange, never over a cascade */}
      {!cascadeMount && gameState.phase === 'arrange' ? <OnboardingHint /> : null}
    </View>
  );
}

/**
 * PROTOTYPE (Today's Order): the day's collection demand with live progress.
 * Reads the shelf directly so the count updates as items are placed/sold; turns
 * green the moment the order is fillable.
 */
function OrderBanner({ order }: { order: OrderHudView }) {
  const { tag, count, mult, have, met } = order;
  return (
    <View style={[styles.orderBanner, met ? styles.orderBannerMet : null]}>
      <Text style={styles.orderText}>
        {`📋 ORDER · ${count}× ${tag.toUpperCase()} → ×${mult} each`}
      </Text>
      <Text style={[styles.orderProgress, met ? styles.orderProgressMet : null]}>
        {met ? `FILLED ✓ (${have}/${count})` : `${have}/${count}`}
      </Text>
    </View>
  );
}

function GoalBanner({ target, freeRerolls }: { target: number; freeRerolls: number }) {
  const earned = freeRerolls > 0;
  return (
    <View style={[styles.orderBanner, earned ? styles.orderBannerMet : null]}>
      <Text style={styles.orderText}>{`🎯 TODAY'S TARGET · ${target} coins`}</Text>
      <Text style={[styles.orderProgress, earned ? styles.orderProgressMet : null]}>
        {earned ? '🎟️ FREE REROLL' : 'BEAT IT →'}
      </Text>
    </View>
  );
}

function SynergyBadge({ active }: { active: SynergyHudView }) {
  return (
    <View style={[styles.orderBanner, styles.synergyBanner]}>
      <Text style={styles.orderText}>{`🏷️ ${active.tag.toUpperCase()} SHELF`}</Text>
      <Text style={[styles.orderProgress, styles.synergyProgress]}>
        {`×${active.mult} · ${active.count} items`}
      </Text>
    </View>
  );
}

function labelPhase(phase: GameState['phase']): string {
  switch (phase) {
    case 'delivery':
      return 'Delivery';
    case 'arrange':
      return 'Arrange';
    case 'openShop':
      return 'Open Shop';
    case 'restock':
      return 'Restock';
    case 'gameOver':
      return 'Game Over';
  }
}

function firstEmptySlot(gameState: GameState): Slot | null {
  return gameState.shelf.slots.find((slot) => !slot.item)?.slot ?? null;
}

function firstAffordableOffer(offers: readonly DeliveryOffer[], coins: number): number | null {
  const index = offers.findIndex((offer) => offer.cost <= coins);
  return index >= 0 ? index : null;
}

function primaryActionFor(gameState: GameState): { label: string; action: Action } | null {
  if (gameState.phase === 'arrange') {
    // Held item is placed by the delivery-tray drag gesture (F-M3-3), not a
    // button — no primary action while something rides the tray.
    if (gameState.heldItem) return null;
    return { label: 'Open Shop', action: { type: 'openShop' } };
  }

  if (gameState.phase === 'delivery') {
    const offerIndex = gameState.currentOffers.length > 0 ? 0 : null;
    return offerIndex === null
      ? null
      : { label: 'Draft Delivery', action: { type: 'draftItem', offerIndex } };
  }

  if (gameState.phase === 'restock') {
    // Purchased item is likewise tray-dragged onto the shelf.
    if (gameState.heldItem) return null;
    const offerIndex = firstAffordableOffer(gameState.currentOffers, gameState.coins);
    if (offerIndex !== null && firstEmptySlot(gameState)) {
      return { label: 'Buy Offer', action: { type: 'buyOffer', offerIndex } };
    }
    return { label: 'End Restock', action: { type: 'endRestock' } };
  }

  return null;
}

function hintFor(gameState: GameState): string {
  if (gameState.phase === 'arrange' || gameState.phase === 'restock') {
    if (gameState.heldItem) {
      return `Drag ${gameState.heldItem.itemId.replace(/-/g, ' ')} from the tray onto an empty shelf slot.`;
    }
    if (gameState.moves.freeRemaining === 0 && gameState.coins < gameState.moves.paidMoveCost) {
      return 'No moves available.';
    }
    return `Paid moves cost ${gameState.moves.paidMoveCost}c after the free moves.`;
  }
  if (gameState.phase === 'delivery') return 'Delivery is ready.';
  if (gameState.phase === 'gameOver') return 'Rent was missed.';
  return '';
}

function movementLockedSceneState(gameState: GameState): GameState {
  return {
    ...gameState,
    shelf: {
      ...gameState.shelf,
      slots: gameState.shelf.slots.map((slot) => ({
        ...slot,
        item: slot.item
          ? {
              ...slot.item,
              state: { ...slot.item.state, sticky: true },
            }
          : null,
      })),
    },
  };
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
  dayWrap: {
    // Absolute-centered across the full bar so the title is truly centered on the
    // device, independent of the unequal Menu (left) and coin (right) widths.
    // pointerEvents none keeps the Menu tap target underneath live.
    alignItems: 'center',
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    pointerEvents: 'none',
    position: 'absolute',
    right: 0,
    top: 0,
  },
  eyebrow: {
    ...typeScale.label,
    color: palette.inkFaint,
  },
  phase: {
    ...typeScale.heading,
    color: palette.ink,
  },
  statusRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  shelfWrap: {
    flex: 1,
    gap: spacing.md,
    justifyContent: 'center',
  },
  cascadeOverlay: {
    backgroundColor: palette.scrim,
    bottom: 0,
    gap: spacing.md,
    justifyContent: 'center',
    left: 0,
    paddingHorizontal: layout.screenPadX,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 10,
  },
  hint: {
    ...typeScale.body,
    color: palette.inkFaint,
    fontSize: 13,
    textAlign: 'center',
  },
  actions: {
    marginTop: 'auto',
  },
  orderBanner: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: palette.parchment,
    borderColor: palette.parchmentEdge,
    borderRadius: radii.md,
    borderWidth: 1.5,
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  orderBannerMet: {
    backgroundColor: palette.slotLegal,
    borderColor: palette.tealDark,
  },
  orderText: {
    ...typeScale.label,
    color: palette.ink,
    fontSize: 12,
    fontWeight: '700',
  },
  orderProgress: {
    ...typeScale.label,
    color: palette.inkFaint,
    fontSize: 12,
    fontWeight: '700',
  },
  orderProgressMet: {
    color: palette.ink,
  },
  synergyBanner: {
    backgroundColor: palette.sunlight,
    borderColor: palette.goldDeep,
  },
  synergyProgress: {
    color: palette.emberDark,
  },
});
