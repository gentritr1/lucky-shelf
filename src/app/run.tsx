import { useCallback, useEffect, useMemo, useRef, useState, type ComponentProps } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import type { Action, GameState, Slot } from '@/contracts';
import {
  AppText,
  CoinCounter,
  MovesPips,
  RentChip,
  SectionLabel,
  WoodButton,
  buildAccents,
  layout,
  motion,
  spacing,
  tagIconName,
  usePalette,
  useReducedMotion,
  useThemedStyles,
} from '@/ui';
import { CascadeLayer, DuskAmbience, ITEM_GLYPHS, ShelfScene, setMusicTrack } from '@/juice';

import { makeStyles } from '@/screen-styles/run.styles';
import { cascadeMountAfterOpenShop, routeForGameState, type CascadeMount } from '../state/phaseRouting';
import {
  arrangeAffordanceView,
  buildIdentityView,
  hasSlotAction,
  orderHudView,
  runSelectors,
  sellShelfView,
  shelfItemInspectorView,
  slotActionFor,
  useRunStore,
  type BuildIdentityView,
  type OrderHudView,
  type ShelfItemInspectorView,
} from '../state/store';
import { useRunStartAchievedCombos } from '../state/catalogStore';
import { useOnboardingStore, type OnboardingStep } from '../state/onboardingStore';

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
  const styles = useThemedStyles(makeStyles);
  const palette = usePalette();
  const gameState = useRunStore(runSelectors.gameState);
  const rejectedActionCount = useRunStore(runSelectors.rejectedActionCount);
  const lastRejectedAction = useRunStore(runSelectors.lastRejectedAction);
  const dispatchAction = useRunStore((state) => state.dispatchAction);
  // B-M11: run-start catalog snapshot → the cascade classifies first-ever combos.
  const achievedBeforeRun = useRunStartAchievedCombos();
  const [cascadeMount, setCascadeMount] = useState<CascadeMount | null>(null);
  const [inspectedInstanceId, setInspectedInstanceId] = useState<string | null>(null);
  const onboardingStep = useOnboardingStore((state) => state.step);
  const onboardingLoaded = useOnboardingStore((state) => state.loaded);
  const loadOnboarding = useOnboardingStore((state) => state.loadOnboarding);
  const syncOnboardingTo = useOnboardingStore((state) => state.syncTo);
  const completeOnboarding = useOnboardingStore((state) => state.complete);
  const affordances = useMemo(() => arrangeAffordanceView(gameState), [gameState]);
  const inspector = useMemo(
    () => shelfItemInspectorView(gameState, inspectedInstanceId),
    [gameState, inspectedInstanceId],
  );

  // Human ruling 2026-07-14 ("keep just sfx, do not keep double"): normal
  // gameplay is SFX-ONLY — no music bed under the run, so the receipt sounds
  // stand alone. Music re-enters exactly once per cycle, as a SIGNAL: the
  // rent-tension beds fade in when rent looms (rent-EVE on the final day
  // before rent, rent-week on the due morning). Silence → music IS the
  // escalation now. Re-runs on focus and whenever dueInDays crosses a
  // threshold mid-run.
  const rentDueInDays = gameState.rent.dueInDays;
  useFocusEffect(
    useCallback(() => {
      setMusicTrack(
        rentDueInDays > RENT_TENSION_DUE_IN_DAYS
          ? null
          : rentDueInDays === RENT_TENSION_DUE_IN_DAYS
            ? 'rentEve'
            : 'rentWeek',
      );
    }, [rentDueInDays]),
  );

  // B-M16 rent-payment beat: fires (via the cascade's dayTotal notification)
  // only on a rent-due cascade, delayed to land WITH the rent-thud haptic. The
  // beat drives the chip's heavy settle + the coins drain in RentPaymentLine.
  const [rentBeat, setRentBeat] = useState(false);
  const rentBeatTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    setRentBeat(false);
    return () => {
      if (rentBeatTimer.current) clearTimeout(rentBeatTimer.current);
    };
  }, [cascadeMount]);
  const onCascadeDayTotal = useCallback(() => {
    if (!cascadeMount?.rentDue) return;
    if (rentBeatTimer.current) clearTimeout(rentBeatTimer.current);
    setRentBeat(false); // replay restarts the beat
    rentBeatTimer.current = setTimeout(() => setRentBeat(true), motion.cascade.rentThudDelayMs);
  }, [cascadeMount]);

  useEffect(() => {
    if (cascadeMount) return;
    const route = routeForGameState(gameState);
    if (route !== '/run') router.replace(route);
  }, [cascadeMount, gameState, router]);

  useEffect(() => {
    void loadOnboarding().catch(() => undefined);
  }, [loadOnboarding]);

  useEffect(() => {
    if (!onboardingLoaded || cascadeMount) return;
    if (gameState.phase !== 'arrange' && gameState.phase !== 'restock') return;
    void syncOnboardingTo(gameState.heldItem ? 'place' : 'open').catch(() => undefined);
  }, [cascadeMount, gameState.heldItem, gameState.phase, onboardingLoaded, syncOnboardingTo]);

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
    void completeOnboarding().catch(() => undefined);
    setCascadeMount(cascadeMountAfterOpenShop(beforeOpenShop, result.gameState));
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
        scrollEnabled={heldFull || Boolean(inspector)}
        showsVerticalScrollIndicator={heldFull || Boolean(inspector)}
      >
      <View style={styles.topBar}>
        <Pressable accessibilityRole="button" hitSlop={12} onPress={() => router.dismissTo('/')}>
          <AppText variant="heading" color={palette.tealDark}>‹ Menu</AppText>
        </Pressable>
        <View style={styles.dayWrap}>
          <AppText variant="label" color={palette.inkFaint}>DAY {hudState.day}</AppText>
          <AppText variant="heading" color={palette.ink}>{cascadeMount ? 'Open Shop' : labelPhase(gameState.phase)}</AppText>
        </View>
        <CoinCounter coins={hudState.coins} />
      </View>

      {/* R-40 clip fix (B-M13): the cascade overlay draws its own shelf HIGHER
          than this row, so leaving the status row here left the RentChip
          half-covered behind the scrim. It's hidden while the cascade is up; the
          rent context is re-rendered fully inside the overlay instead. */}
      {cascadeMount ? null : (
        <View style={styles.statusRow}>
          <RentChip amount={hudState.rent.amount} dueInDays={hudState.rent.dueInDays} />
          <MovesPips remaining={hudState.moves.freeRemaining} />
        </View>
      )}

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
              onInspect={(item) => setInspectedInstanceId(item.instanceId)}
              selectedInstanceId={inspectedInstanceId}
            />
            {inspector ? (
              <ShelfInspector
                view={inspector}
                onClose={() => setInspectedInstanceId(null)}
              />
            ) : null}
            <AppText
              accessibilityLiveRegion="polite"
              variant="body"
              color={palette.inkFaint}
              style={styles.hint}
            >
              {lastRejectedAction?.message ?? onboardingRunHint(onboardingLoaded, onboardingStep, gameState) ?? hintFor(gameState)}
            </AppText>
            {heldFull ? (
              <View style={styles.sellRow}>
                {sellChoices.map(({ slot, item, price }) => (
                  <Pressable
                    key={item.instanceId}
                    accessibilityRole="button"
                    onPress={() => onSell(slot)}
                    style={({ pressed }) => [styles.sellChip, pressed && styles.sellChipPressed]}
                  >
                    <AppText variant="label" color={palette.ink} numberOfLines={1} style={styles.sellChipName}>{item.name}</AppText>
                    <AppText variant="label" color={palette.rentEmber} style={styles.sellChipPrice}>{`Sell +${price}`}</AppText>
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
          {/* Rent context lives INSIDE the overlay in a stable spot so the day's
              payout can be read against the rent it owes — a deliberate,
              complete line, never a half-clipped HUD chip behind the scrim.
              B-M16: on a rent-due slam the line plays the payment beat. */}
          <RentPaymentLine
            amount={hudState.rent.amount}
            dueInDays={hudState.rent.dueInDays}
            beat={rentBeat}
            coinsAfter={gameState.coins}
          />
          <CascadeLayer
            gameState={cascadeMount.gameState}
            trace={cascadeMount.trace}
            rentDue={cascadeMount.rentDue}
            targetResult={cascadeMount.targetResult}
            achievedBeforeRun={achievedBeforeRun}
            autoPlay
            onComplete={continueAfterCascade}
            completeLabel={cascadeMount.nextRoute === '/summary' ? 'See Results ▸' : 'Collect ▸'}
            onDayTotal={onCascadeDayTotal}
          />
        </View>
      ) : null}

    </View>
  );
}

/**
 * B-M16 rent-payment beat: the cascade overlay's rent line. Normally just the
 * RentChip; when `beat` fires (rent-due dayTotal + the thud delay, timed with
 * the rent-thud haptic) the chip does ONE heavier settle — a press-down dip and
 * a spring back (uniform scale + translateY only; Fabric scar respected) — and
 * a coins pill appears draining from pre-rent (coinsAfter + amount) down to
 * `coinsAfter`, so the deduction ticks down instead of jumping offscreen.
 * Reduced motion: no settle, and the pill snaps to the final value (CoinCounter
 * already snaps under reduced motion). No sim reads beyond props; no new sound
 * (the future sting drops into the audio gateway, one asset).
 */
function RentPaymentLine({
  amount,
  dueInDays,
  beat,
  coinsAfter,
}: {
  amount: number;
  dueInDays: number;
  beat: boolean;
  coinsAfter: number;
}) {
  const styles = useThemedStyles(makeStyles);
  const reduced = useReducedMotion();
  const settle = useSharedValue(0);
  useEffect(() => {
    if (!beat || reduced) {
      settle.value = 0;
      return;
    }
    settle.value = withSequence(
      withTiming(1, { duration: 90 }),
      withSpring(0, motion.springs.impact),
    );
  }, [beat, reduced, settle]);
  const settleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - settle.value * 0.06 }, { translateY: settle.value * 3 }],
  }));

  return (
    <View style={styles.cascadeRentLine}>
      <Animated.View style={settleStyle}>
        <RentChip amount={amount} dueInDays={dueInDays} />
      </Animated.View>
      {beat ? <CoinCounter coins={coinsAfter} from={coinsAfter + amount} animate /> : null}
    </View>
  );
}

function ShelfInspector({
  view,
  onClose,
}: {
  view: ShelfItemInspectorView;
  onClose: () => void;
}) {
  const styles = useThemedStyles(makeStyles);
  const palette = usePalette();
  const location = view.slot
    ? `Row ${view.slot.row + 1}, column ${view.slot.col + 1}`
    : 'Delivery item';
  const movementHint = view.item.state.sticky
    ? 'Stuck in place. Its rule can still affect items next to it.'
    : 'Drag it, or tap the item and then an empty slot.';

  return (
    <View
      accessibilityLabel={`${view.item.name} details`}
      style={styles.inspector}
    >
      <View style={styles.inspectorHeader}>
        <View style={styles.inspectorTitleWrap}>
          <AppText variant="heading" color={palette.ink}>{view.item.name}</AppText>
          <AppText variant="label" color={palette.inkFaint}>
            {`${location} · value ${view.item.baseValue}`}
          </AppText>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close item details"
          hitSlop={4}
          onPress={onClose}
          style={({ pressed }) => [styles.inspectorClose, pressed && styles.inspectorClosePressed]}
        >
          <AppText variant="heading" color={palette.tealDark}>×</AppText>
        </Pressable>
      </View>
      <View style={styles.inspectorRules}>
        {view.ruleLines.map((line) => (
          <AppText key={line} variant="body" color={palette.ink}>
            {`• ${line}`}
          </AppText>
        ))}
      </View>
      <AppText variant="label" color={palette.tealDark} style={styles.inspectorHint}>
        {movementHint}
      </AppText>
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
  const styles = useThemedStyles(makeStyles);
  const palette = usePalette();
  const accent = build ? buildAccents[build.tag] ?? palette.goldDeep : null;
  return (
    <View
      style={[
        styles.buildCard,
        build?.active ? styles.buildCardActive : null,
      ]}
    >
      <View style={styles.buildHero}>
        {/* Emoji sits in a soft accent-tinted tile — it echoes the shelf item
            tiles below and carries the build colour as a gentle wash + ring
            instead of a loud left-edge stripe. */}
        <View
          style={[
            styles.buildEmojiTile,
            accent ? { backgroundColor: `${accent}1F`, borderColor: accent } : null,
          ]}
        >
          <MaterialCommunityIcons
            name={build ? tagIconName(build.tag) : 'cart-outline'}
            size={24}
            color={accent ?? palette.ink}
          />
        </View>
        <View style={styles.buildHeroText}>
          <AppText variant="label" color={palette.ink} style={styles.buildTitle}>
            {build ? `${build.tag.toUpperCase()} SHELF` : 'YOUR BUILD'}
          </AppText>
          <AppText variant="label" color={palette.inkFaint} style={styles.buildSub}>
            {build
              ? build.next
                ? `${build.count} on theme · ${build.next.count - build.count} more → ×${build.next.mult}`
                : `${build.count} on theme · maxed out`
              : 'Match a tag across items for a build bonus'}
          </AppText>
        </View>
        {build ? (
          <View style={[styles.buildMult, build.active ? styles.buildMultActive : null]}>
            <AppText
              variant="display"
              color={build.active ? palette.emberDark : palette.inkSoft}
              style={styles.buildMultText}
            >
              {`×${build.mult}`}
            </AppText>
          </View>
        ) : null}
      </View>

      {order || target ? (
        <View style={styles.goalRow}>
          {order ? (
            <GoalChip
              icon="basket-outline"
              label={`ORDER · ${order.count}× ${order.tag}`}
              value={`${order.have}/${order.count}`}
              met={order.met}
            />
          ) : null}
          {target ? (
            <GoalChip
              icon="target"
              label={`TARGET · ${target.target}c`}
              value={target.rewardEarned ? 'Free reroll' : 'beat it →'}
              met={target.rewardEarned}
            />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function GoalChip({
  icon,
  label,
  value,
  met,
}: {
  icon: ComponentProps<typeof MaterialCommunityIcons>['name'];
  label: string;
  value: string;
  met: boolean;
}) {
  const styles = useThemedStyles(makeStyles);
  const palette = usePalette();
  return (
    <View style={[styles.goalChip, met ? styles.goalChipMet : null]}>
      <View style={styles.goalChipLabelRow}>
        <MaterialCommunityIcons name={icon} size={13} color={palette.ink} />
        <AppText variant="label" color={palette.ink} numberOfLines={1} style={styles.goalChipLabel}>
          {label}
        </AppText>
      </View>
      <AppText
        variant="label"
        color={met ? palette.tealDark : palette.inkFaint}
        numberOfLines={1}
        style={styles.goalChipValue}
      >
        {value}
      </AppText>
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

function onboardingRunHint(
  loaded: boolean,
  step: OnboardingStep,
  gameState: GameState,
): string | null {
  if (!loaded) return null;
  if (step === 'place' && gameState.heldItem) {
    return 'First placement: put it anywhere for now. Later, tap items to reread rules and move linked items together.';
  }
  if (step === 'open' && !gameState.heldItem) {
    return 'Now Open Shop. Follow each cause in the caption; the complete scoring receipt stays available afterward.';
  }
  return null;
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
