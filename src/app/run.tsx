import { useCallback, useEffect, useMemo, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Action, GameState, Slot } from '@/contracts';
import {
  CoinCounter,
  MovesPips,
  OnboardingHint,
  RentChip,
  SectionLabel,
  WoodButton,
  buildAccents,
  layout,
  palette,
  radii,
  spacing,
  tagEmoji,
  typeScale,
} from '@/ui';
import { CascadeLayer, DuskAmbience, ITEM_GLYPHS, ShelfScene, playCascadeSting, setMusicTrack } from '@/juice';
import { cascadeMountAfterOpenShop, routeForGameState, type CascadeMount } from '../state/phaseRouting';
import {
  arrangeAffordanceView,
  buildIdentityView,
  hasSlotAction,
  orderHudView,
  runSelectors,
  sellShelfView,
  slotActionFor,
  useRunStore,
  type BuildIdentityView,
  type OrderHudView,
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
  const affordances = useMemo(() => arrangeAffordanceView(gameState), [gameState]);

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
    const action = slotActionFor(affordances.placeActions, slot);
    if (!action) return;
    dispatchAndSave(action);
  };

  const onSell = (slot: Slot) => {
    const action = slotActionFor(affordances.sellActions, slot);
    if (!action) return;
    dispatchAndSave(action);
  };

  const onPrimaryAction = () => {
    const primary = affordances.primaryAction;
    if (!primary) return;
    const beforeOpenShop = gameState;
    const result = dispatchAction(primary.action);
    if (!result.accepted) return;
    void result.save.catch(() => undefined);
    setCascadeMount(cascadeMountAfterOpenShop(beforeOpenShop, result.gameState));
    playCascadeSting();
  };

  const continueAfterCascade = () => {
    const nextRoute = cascadeMount?.nextRoute ?? routeForGameState(useRunStore.getState().gameState);
    setCascadeMount(null);
    router.replace(nextRoute);
  };

  const primaryAction = affordances.primaryAction;
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
  const build = useMemo(() => buildIdentityView(gameState), [gameState]);
  const order = useMemo(() => orderHudView(gameState), [gameState]);
  const target =
    gameState.dailyTarget != null
      ? { target: gameState.dailyTarget, rewardEarned: (gameState.freeRerollTokens ?? 0) > 0 }
      : null;
  const sceneState =
    cascadeMount || !movementEnabled ? movementLockedSceneState(hudState) : gameState;
  // Softlock guard (F-1): a held delivery item + a full shelf can't be placed and
  // openShop refuses while holding — so surface selling here to free a slot. The
  // engine already allows sellItem while holding; this exposes it.
  const heldFull =
    Boolean(gameState.heldItem) &&
    affordances.placeActions.length === 0 &&
    affordances.sellActions.length > 0;
  const sellChoices = useMemo(
    () =>
      heldFull
        ? sellShelfView(gameState).filter(({ slot }) => hasSlotAction(affordances.sellActions, slot))
        : [],
    [affordances.sellActions, heldFull, gameState],
  );

  return (
    <View style={[styles.screen, { paddingTop: insets.top + layout.screenTopGap }]}>
      {/* rent proximity felt as warmth (behind content); hidden during cascade */}
      {cascadeMount ? null : <DuskAmbience dueInDays={hudState.rent.dueInDays} />}
      {/* Scroll only when the softlock sell-list is up (shelf full + held item) —
          that content overflows and the shelf has no gestures in that state, so a
          ScrollView can't steal the drag. Normal states stay a static column. */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        scrollEnabled={heldFull}
        showsVerticalScrollIndicator={heldFull}
      >
      <View style={styles.topBar}>
        <Pressable accessibilityRole="button" hitSlop={12} onPress={() => router.dismissTo('/')}>
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

      {!cascadeMount && (build || order || target) ? (
        <BuildSignpost build={build} order={order} target={target} />
      ) : null}

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
            {heldFull ? (
              <View style={styles.sellRow}>
                {sellChoices.map(({ slot, item, price }) => (
                  <Pressable
                    key={item.instanceId}
                    accessibilityRole="button"
                    onPress={() => onSell(slot)}
                    style={({ pressed }) => [styles.sellChip, pressed && styles.sellChipPressed]}
                  >
                    <Text numberOfLines={1} style={styles.sellChipName}>{item.name}</Text>
                    <Text style={styles.sellChipPrice}>{`Sell +${price}`}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </>
        )}
      </View>

      {!cascadeMount && (primaryAction || !gameState.heldItem) ? (
        <View style={[styles.actions, { paddingBottom: insets.bottom + layout.screenBottomGap }]}>
          <WoodButton
            label={primaryAction ? primaryAction.label : 'Run Complete'}
            onPress={primaryAction ? onPrimaryAction : () => router.dismissTo('/')}
          />
        </View>
      ) : null}
      </ScrollView>

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
            targetResult={cascadeMount.targetResult}
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
 * The build signpost — one panel that answers "what am I making, and is it
 * paying off?" The dominant-tag build is the hero (title + live ×multiplier +
 * the next ladder tier to chase); Today's Order and the daily target ride below
 * as compact goal chips. Replaces the three interchangeable stacked pills so the
 * build reads as an identity, not a status feed.
 */
function BuildSignpost({
  build,
  order,
  target,
}: {
  build: BuildIdentityView | null;
  order: OrderHudView | null;
  target: { target: number; rewardEarned: boolean } | null;
}) {
  const accent = build ? buildAccents[build.tag] ?? palette.goldDeep : null;
  return (
    <View
      style={[
        styles.buildCard,
        build?.active ? styles.buildCardActive : null,
        accent ? { borderLeftColor: accent, borderLeftWidth: 5 } : null,
      ]}
    >
      <View style={styles.buildHero}>
        <Text style={styles.buildEmoji}>{build ? tagEmoji[build.tag] ?? '🏷️' : '🛒'}</Text>
        <View style={styles.buildHeroText}>
          <Text style={styles.buildTitle}>{build ? `${build.tag.toUpperCase()} SHELF` : 'YOUR SHELF'}</Text>
          <Text style={styles.buildSub}>
            {build
              ? build.next
                ? `${build.count} on theme · ${build.next.count - build.count} more → ×${build.next.mult}`
                : `${build.count} on theme · maxed out`
              : 'Match a tag across items for a build bonus'}
          </Text>
        </View>
        {build ? (
          <View style={[styles.buildMult, build.active ? styles.buildMultActive : null]}>
            <Text style={[styles.buildMultText, build.active ? styles.buildMultTextActive : null]}>
              {`×${build.mult}`}
            </Text>
          </View>
        ) : null}
      </View>

      {order || target ? (
        <View style={styles.goalRow}>
          {order ? (
            <GoalChip
              icon="📋"
              label={`ORDER · ${order.count}× ${order.tag}`}
              value={order.met ? `✓ ${order.have}/${order.count}` : `${order.have}/${order.count}`}
              met={order.met}
            />
          ) : null}
          {target ? (
            <GoalChip
              icon="🎯"
              label={`TARGET · ${target.target}c`}
              value={target.rewardEarned ? '🔁 free reroll' : 'beat it →'}
              met={target.rewardEarned}
            />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function GoalChip({ icon, label, value, met }: { icon: string; label: string; value: string; met: boolean }) {
  return (
    <View style={[styles.goalChip, met ? styles.goalChipMet : null]}>
      <Text numberOfLines={1} style={styles.goalChipLabel}>{`${icon} ${label}`}</Text>
      <Text numberOfLines={1} style={[styles.goalChipValue, met ? styles.goalChipValueMet : null]}>
        {value}
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

function hintFor(gameState: GameState): string {
  if (gameState.phase === 'arrange' || gameState.phase === 'restock') {
    if (gameState.heldItem) {
      const name = gameState.heldItem.itemId.replace(/-/g, ' ');
      return gameState.shelf.slots.some((slot) => slot.item === null)
        ? `Drag ${name} from the tray onto an empty shelf slot.`
        : `Shelf full — sell an item below to make room for ${name}.`;
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
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    // flexGrow so the column fills the screen (shelf stays centered via shelfWrap
    // flex) when it fits; when the softlock sell-list makes it overflow, it grows
    // past the viewport and scrolls instead of spilling over the panels above.
    flexGrow: 1,
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
  sellRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    justifyContent: 'center',
    marginTop: spacing.xs,
  },
  sellChip: {
    alignItems: 'center',
    backgroundColor: palette.creamBright,
    borderColor: palette.rentEmber,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
  },
  sellChipPressed: {
    opacity: 0.7,
  },
  sellChipName: {
    ...typeScale.label,
    color: palette.ink,
    fontSize: 11,
    fontWeight: '700',
    maxWidth: 100,
  },
  sellChipPrice: {
    ...typeScale.label,
    color: palette.rentEmber,
    fontSize: 11,
    fontWeight: '800',
  },
  actions: {
    marginTop: 'auto',
  },
  buildCard: {
    alignSelf: 'stretch',
    backgroundColor: palette.parchment,
    borderColor: palette.parchmentEdge,
    borderRadius: radii.lg,
    borderWidth: 1.5,
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  buildCardActive: {
    backgroundColor: palette.sunlight,
    borderColor: palette.goldDeep,
  },
  buildHero: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  buildEmoji: {
    fontSize: 28,
  },
  buildHeroText: {
    flex: 1,
    gap: 1,
  },
  buildTitle: {
    ...typeScale.label,
    color: palette.ink,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  buildSub: {
    ...typeScale.label,
    color: palette.inkFaint,
    fontSize: 11,
    fontWeight: '600',
  },
  buildMult: {
    alignItems: 'center',
    backgroundColor: palette.creamBright,
    borderColor: palette.parchmentEdge,
    borderRadius: radii.md,
    borderWidth: 1.5,
    justifyContent: 'center',
    minWidth: 58,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  buildMultActive: {
    backgroundColor: palette.creamBright,
    borderColor: palette.goldDeep,
  },
  buildMultText: {
    ...typeScale.display,
    color: palette.inkSoft,
    fontSize: 22,
    fontWeight: '800',
  },
  buildMultTextActive: {
    color: palette.emberDark,
  },
  goalRow: {
    flexDirection: 'column',
    gap: spacing.xs,
  },
  goalChip: {
    alignItems: 'center',
    backgroundColor: palette.creamBright,
    borderColor: palette.parchmentEdge,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  goalChipMet: {
    backgroundColor: palette.slotLegal,
    borderColor: palette.tealDark,
  },
  goalChipLabel: {
    ...typeScale.label,
    color: palette.ink,
    flexShrink: 1,
    fontSize: 11,
    fontWeight: '700',
  },
  goalChipValue: {
    ...typeScale.label,
    color: palette.inkFaint,
    fontSize: 11,
    fontWeight: '700',
  },
  goalChipValueMet: {
    color: palette.tealDark,
  },
});
