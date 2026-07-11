import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import type { DailyTargetResult, GameState, ItemInstance, ScoringTrace, Slot } from '@/contracts';
import { toSlotKey } from '@/contracts';
import { arrowPalette, borders, motion, palette, radii, shadows, spacing, typeScale } from '@/ui/tokens';
import { useReducedMotion } from '@/ui/prefs';
import { CoinCounter, WoodButton } from '@/ui';
import { ItemSprite } from '../ItemSprite';
import { glyphFor } from '../glyphs';
import {
  computeShelfLayout,
  FRAME_PADDING,
  PLANK_HEIGHT,
  slotCenter,
  slotTopLeft,
  type ShelfLayout,
} from '../layout';
import { haptic } from '../haptics';
import { playDiscoveryJingle } from '../audio';
import type { CascadeFrame } from './cascadeState';
import { classifyDiscoveries, slowBeatStepIndices, type DiscoveryMoment } from './discoveryModel';
import { deltaLabel, isSelfFire } from './popModel';
import { cascadeTier, type CascadeTier } from './cascadeTier';
import { CascadeArrow } from './CascadeArrow';
import { CascadeSpectacle } from './CascadeSpectacle';
import { SpeedControl } from './SpeedControl';
import { useCascadePlayer } from './useCascadePlayer';

const overshoot = Easing.bezier(...motion.easings.overshoot);

/** Warmer on-slot pop scale at the higher tiers (1 = shipped/normal, untouched). */
const POP_SCALE_BOOST: Record<CascadeTier, number> = { normal: 1, big: 1.15, apex: 1.3 };

/**
 * The cascade: consumes a ScoringTrace verbatim and animates every coin
 * (Pillar 2). Each event kind is visibly distinct — base pulse + value tag,
 * source→target arrow with a count-up on the R-6 beneficiary slot, a row aura
 * that persists with its ×mult label until dayTotal (R-9/R-27), a named-combo
 * banner (R-2), transform/vanish morphs, and the dayTotal coin slam.
 *
 * The shelf here is static (no drag) so the whole scene is the choreography.
 */

interface CascadeLayerProps {
  gameState: GameState;
  trace: ScoringTrace;
  autoPlay?: boolean;
  /** Rent-due day → the dayTotal slam is followed by the rent thud (R-18). */
  rentDue?: boolean;
  /** Goal-ladder outcome (Phase 3). When the target was met, the cascade
   *  celebrates it as the day total lands. Absent = goal ladder off. */
  targetResult?: DailyTargetResult | undefined;
  /**
   * R-36/R-39: the layer owns its beat. When the cascade reaches the terminal
   * dayTotal (by playing through OR by skip), it retires its transport and shows
   * a single advance affordance; tapping it fires `onComplete`. The route only
   * happens here — never behind a running cascade. Required in reduced-motion
   * too: steps snap, but the run still waits on the tap (agency over speed).
   */
  onComplete?: () => void;
  /** Label for that single advance affordance (defaults to a collect-flavored verb). */
  completeLabel?: string;
  /**
   * B-M11: the combos achieved all-time BEFORE this run started
   * (`catalog.achievedComboIds` snapshot at run start). Enables combo-discovery
   * moments — a first-ever combo earns a toast + stamp + jingle + slow-beat; a
   * first-this-run combo a small toast; a repeat nothing. Combos already
   * discovered on earlier days this run are read from `gameState.catalogDelta`
   * (which, at cascade time, holds the pre-scoring run-so-far). **Omit** the prop
   * to disable discovery moments entirely (the safe default — an empty set would
   * instead treat every combo as brand-new).
   */
  achievedBeforeRun?: ReadonlySet<string>;
}

const NO_MOMENTS: readonly DiscoveryMoment[] = [];

export function CascadeLayer({
  gameState,
  trace,
  autoPlay = false,
  rentDue = false,
  targetResult,
  onComplete,
  completeLabel = 'Collect ▸',
  achievedBeforeRun,
}: CascadeLayerProps) {
  const reduced = useReducedMotion();
  const { rows, cols } = gameState.shelf.size;

  // B-M11 combo discovery — pure classification over the trace. `achievedBeforeRun`
  // is the run-start catalog; combos already discovered on earlier days this run
  // ride in on `gameState.catalogDelta` (pre-scoring at cascade time). Omitting
  // `achievedBeforeRun` leaves discovery off. A first-ever step earns a slow-beat
  // (dropped under reduced motion, so the player's cadence is unchanged there).
  const discoveries = useMemo(
    () =>
      achievedBeforeRun
        ? classifyDiscoveries(trace.events, {
            achievedBeforeRun,
            seenPriorThisRun: new Set(gameState.catalogDelta.discoveredComboIds),
          })
        : NO_MOMENTS,
    [achievedBeforeRun, trace.events, gameState.catalogDelta.discoveredComboIds],
  );
  const slowBeatIndices = useMemo(
    () => slowBeatStepIndices(discoveries, !reduced),
    [discoveries, reduced],
  );

  const player = useCascadePlayer({ events: trace.events, rentDue, autoPlay, slowBeatIndices });
  const { frame, currentEvent, stepIndex } = player;

  // The discovery moment for the currently-resolved step (if any).
  const activeMoment = useMemo(
    () => discoveries.find((moment) => moment.eventIndex === stepIndex) ?? null,
    [discoveries, stepIndex],
  );

  // First-ever combos get the short jingle (SFX gateway + prefs gate). Fires once
  // as the step resolves; a replay replays it, like the rest of the cascade.
  useEffect(() => {
    if (activeMoment?.kind === 'first-ever') playDiscoveryJingle();
  }, [activeMoment]);

  // B-M6 spectacle tier — pure function of the trace + the day's goal target.
  // `'normal'` short-circuits every added effect below so ordinary cascades render
  // exactly as shipped (see the byte-identical note in the review packet).
  const tier = useMemo(() => cascadeTier(trace, gameState.dailyTarget), [trace, gameState.dailyTarget]);
  const spectacle = tier !== 'normal';
  const slam = frame.dayTotal !== null;
  const progress =
    stepIndex >= 0 && trace.events.length > 1 ? stepIndex / (trace.events.length - 1) : 0;

  // Apex gets one extra celebratory haptic layered on the slam (in both motion
  // modes — haptics are the reduced-motion channel). Fires once per cascade.
  const apexHapticFired = useRef(false);
  useEffect(() => {
    if (!slam) {
      apexHapticFired.current = false;
      return;
    }
    if (tier === 'apex' && !apexHapticFired.current) {
      apexHapticFired.current = true;
      haptic('apexSlam');
    }
  }, [slam, tier]);

  const [frameWidth, setFrameWidth] = useState(0);
  const layout = useMemo(
    () => (frameWidth > 0 ? computeShelfLayout(frameWidth, rows, cols) : null),
    [frameWidth, rows, cols],
  );
  const items = useMemo(() => seedItems(gameState, rows, cols), [gameState, rows, cols]);

  const onLayout = useCallback((e: LayoutChangeEvent) => setFrameWidth(e.nativeEvent.layout.width), []);

  const primaryLabel = player.playing ? 'Pause' : player.done ? 'Play again' : 'Play';
  const onPrimary = () => {
    if (player.playing) player.pause();
    else if (player.done) player.restart();
    else player.play();
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.scene} onLayout={onLayout}>
        {layout ? (
          <View style={{ width: layout.frameWidth, height: layout.frameHeight }}>
            <Board layout={layout} />

            {/* persistent row auras (R-9) with their ×mult label (R-27) */}
            {Object.entries(frame.auraRows).map(([row, mult]) => (
              <RowAuraGlow key={`aura-${row}`} layout={layout} row={Number(row)} mult={mult} reduced={reduced} />
            ))}

            {/* items — sprite only; the cascade owns the scoring numbers */}
            {items.map((item, index) =>
              item ? (
                <CascadeItem
                  key={item.instanceId}
                  item={item}
                  index={index}
                  layout={layout}
                  frame={frame}
                  reduced={reduced}
                />
              ) : null,
            )}

            {/* scoring tags — count-up on the beneficiary (R-6) */}
            {items.map((item, index) => {
              if (!item) return null;
              const row = Math.floor(index / cols);
              const col = index % cols;
              const key = toSlotKey({ row, col });
              const display = frame.slots[key];
              if (!display || display.base === null) return null;
              return (
                <SlotTag
                  key={`tag-${key}`}
                  layout={layout}
                  row={row}
                  col={col}
                  value={display.total ?? display.running ?? display.base}
                  final={display.total !== null}
                  active={frame.openSlot === key}
                  reduced={reduced}
                />
              );
            })}

            {/* current ruleFire (remounts per step so it re-draws). A rule that
                scores its OWN slot (spotlight, order, loner, clock) has no
                distance to draw — render an on-slot ×N/+N pop instead of a
                zero-length arrow nub. */}
            {currentEvent?.kind === 'ruleFire'
              ? isSelfFire(currentEvent)
                ? (
                  <SlotPop
                    key={`pop-${stepIndex}`}
                    center={slotCenter(layout, currentEvent.sourceSlot.row, currentEvent.sourceSlot.col)}
                    label={deltaLabel(currentEvent.delta)}
                    color={popColor(currentEvent.ruleId, currentEvent.sourceSlot, cols)}
                    scaleBoost={POP_SCALE_BOOST[tier]}
                    reduced={reduced}
                  />
                )
                : (
                  <CascadeArrow
                    key={`arrow-${stepIndex}`}
                    from={slotCenter(layout, currentEvent.sourceSlot.row, currentEvent.sourceSlot.col)}
                    to={slotCenter(layout, currentEvent.targetSlot.row, currentEvent.targetSlot.col)}
                    color={arrowColor(currentEvent.sourceSlot, cols)}
                    reduced={reduced}
                    speed={player.speed}
                  />
                )
              : null}
          </View>
        ) : null}

        {frame.combo ? (
          <View style={styles.bannerLayer} pointerEvents="none">
            <ComboBanner
              combo={frame.combo}
              docked={frame.dayTotal !== null}
              sceneWidth={frameWidth}
              reduced={reduced}
            />
          </View>
        ) : null}

        {/* B-M11 discovery toast — warm recognition below the combo banner. A
            first-this-run combo gets the plain ink-on-paper chip; a first-ever
            combo adds the "DISCOVERED" stamp motif. Repeats show nothing. */}
        {activeMoment && activeMoment.kind !== 'repeat' ? (
          <View style={styles.discoveryLayer} pointerEvents="none">
            <DiscoveryToast key={activeMoment.eventIndex} moment={activeMoment} reduced={reduced} />
          </View>
        ) : null}
      </View>

      <View style={styles.footer}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>DAY TOTAL</Text>
          {frame.dayTotal !== null ? (
            // apex oversizes the slam with an overshoot spring; normal/big keep the
            // shipped CoinCounter verbatim (byte-identical).
            tier === 'apex' ? (
              <ApexSlamText reduced={reduced}>
                <CoinCounter coins={frame.dayTotal} from={0} animate slam variant="slam" />
              </ApexSlamText>
            ) : (
              <CoinCounter coins={frame.dayTotal} from={0} animate slam variant="slam" />
            )
          ) : (
            <View style={styles.totalPlaceholder}>
              <Text style={styles.totalPlaceholderText}>—</Text>
            </View>
          )}
        </View>

        {frame.dayTotal !== null && targetResult?.targetMet ? (
          <TargetRewardBanner result={targetResult} reduced={reduced} />
        ) : null}

        {/* R-36/R-39: once the cascade is done the transport retires and a single
            advance affordance owns the beat. Skip jumps to the same done-state,
            so this collect tap is always the one and only way past the cascade. */}
        {player.done ? (
          <WoodButton label={completeLabel} onPress={() => onComplete?.()} />
        ) : (
          <>
            <SpeedControl speed={player.speed} onSpeed={player.setSpeed} onSkip={player.skip} />
            <WoodButton label={primaryLabel} onPress={onPrimary} />
          </>
        )}
      </View>

      {/* B-M6: top-tier spectacle overlay — mounted ONLY for big/apex, so a normal
          cascade renders the exact tree above (no overlay node, no layout shift).
          Absolute-fill + pointerEvents:none, so it never intercepts the transport. */}
      {spectacle ? (
        <CascadeSpectacle tier={tier} progress={progress} slam={slam} reduced={reduced} />
      ) : null}
    </View>
  );
}

/** Apex-only wrapper that oversizes the day-total slam with an overshoot spring.
 *  Reduced motion: a static larger scale, no spring (R-28). */
function ApexSlamText({ reduced, children }: { reduced: boolean; children: ReactNode }) {
  const t = useSharedValue(reduced ? 1 : 0);
  useEffect(() => {
    t.value = reduced
      ? 1
      : withSequence(
          withTiming(1.35, { duration: 180, easing: overshoot }),
          withTiming(1.18, { duration: 220, easing: overshoot }),
        );
  }, [t, reduced]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: reduced ? 1.22 : t.value }] }));
  return <Animated.View style={style}>{children}</Animated.View>;
}

function seedItems(gameState: GameState, rows: number, cols: number): (ItemInstance | null)[] {
  const items: (ItemInstance | null)[] = new Array(rows * cols).fill(null);
  for (const slotState of gameState.shelf.slots) {
    items[slotState.slot.row * cols + slotState.slot.col] = slotState.item;
  }
  return items;
}

function arrowColor(source: Slot, cols: number): string {
  const index = source.row * cols + source.col;
  return arrowPalette[index % arrowPalette.length]!;
}

/** Spotlight/order keep their identity colour; other self-fires use the slot hue. */
function popColor(ruleId: string, source: Slot, cols: number): string {
  if (ruleId === 'spotlight') return palette.goldDeep;
  if (ruleId === 'order') return palette.tealDark;
  return arrowColor(source, cols);
}

interface SlotPopProps {
  center: { x: number; y: number };
  label: string;
  color: string;
  /** Tier pop-scale multiplier; defaults to 1 so the normal-tier pop is unchanged. */
  scaleBoost?: number;
  reduced: boolean;
}

/**
 * A rule that scores its own slot has no arrow distance to draw. Instead of a
 * zero-length nub, punch an on-slot ×N/+N badge that springs in and settles —
 * the payoff read for spotlight/order (and a fix for latent loner/clock nubs).
 */
function SlotPop({ center, label, color, scaleBoost = 1, reduced }: SlotPopProps) {
  const t = useSharedValue(reduced ? 1 : 0);
  useEffect(() => {
    t.value = reduced ? 1 : withSpring(1, { damping: 9, stiffness: 170 });
  }, [t, reduced, center.x, center.y]);

  const style = useAnimatedStyle(() => ({
    opacity: t.value,
    transform: [{ scale: (0.6 + t.value * 0.4) * scaleBoost }, { translateY: (1 - t.value) * 6 }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.pop,
        { left: center.x - POP_W / 2, top: center.y - POP_H / 2, backgroundColor: color },
        style,
      ]}
    >
      <Text style={styles.popText}>{label}</Text>
    </Animated.View>
  );
}

/** Celebration that pops in just after the day total lands when the daily target
 *  was met — the "that reward matters" beat (Phase 3 goal ladder). */
function TargetRewardBanner({ result, reduced }: { result: DailyTargetResult; reduced: boolean }) {
  const t = useSharedValue(reduced ? 1 : 0);
  useEffect(() => {
    t.value = reduced ? 1 : withDelay(180, withSpring(1, { damping: 8, stiffness: 150 }));
  }, [t, reduced]);

  const style = useAnimatedStyle(() => ({
    opacity: t.value,
    transform: [{ scale: 0.7 + t.value * 0.3 }],
  }));

  return (
    <Animated.View style={[styles.targetBanner, style]}>
      <Text style={styles.targetTitle}>{`🎯 TARGET HIT · ${result.dayTotal}/${result.target}`}</Text>
      {result.rewardGranted ? (
        <Text style={styles.targetReward}>🔁 Free reroll earned</Text>
      ) : null}
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------

function Board({ layout }: { layout: ShelfLayout }) {
  const cells = [];
  for (let row = 0; row < layout.rows; row += 1) {
    const rowTop = FRAME_PADDING + row * layout.rowStride;
    cells.push(
      <View
        key={`plank-${row}`}
        style={[
          styles.plank,
          { left: FRAME_PADDING - 2, top: rowTop + layout.slotSize + 2, width: layout.frameWidth - (FRAME_PADDING - 2) * 2 },
        ]}
      />,
    );
    for (let col = 0; col < layout.cols; col += 1) {
      const { x, y } = slotTopLeft(layout, row, col);
      cells.push(
        <View
          key={`well-${row}-${col}`}
          style={[styles.well, { left: x, top: y, width: layout.slotSize, height: layout.slotSize }]}
        />,
      );
    }
  }
  return <View style={[styles.board, { width: layout.frameWidth, height: layout.frameHeight }]}>{cells}</View>;
}

interface CascadeItemProps {
  item: ItemInstance;
  index: number;
  layout: ShelfLayout;
  frame: CascadeFrame;
  reduced: boolean;
}

/** Static sprite with the open-window highlight, transform glyph-swap, and vanish puff. */
function CascadeItem({ item, index, layout, frame, reduced }: CascadeItemProps) {
  const row = Math.floor(index / layout.cols);
  const col = index % layout.cols;
  const key = toSlotKey({ row, col });
  const { x, y } = slotTopLeft(layout, row, col);

  const transformed = frame.transformed[key];
  const vanished = Boolean(frame.vanished[key]);
  const glyph = glyphFor(transformed ? transformed.toItem : item.itemId);
  const active = frame.openSlot === key;
  const slotTotal = frame.slots[key];
  // Combo membership (Fable plan #4): index in reading order for the hop stagger.
  const memberIndex = frame.combo
    ? frame.combo.slots.findIndex((s) => s.row === row && s.col === col)
    : -1;
  const isMember = memberIndex >= 0;

  const pop = useSharedValue(0);
  useEffect(() => {
    if (transformed) {
      pop.value = reduced ? 0 : withSequence(withTiming(1, { duration: 130 }), withTiming(0, { duration: 200 }));
    }
  }, [transformed, reduced, pop]);

  // "Receive" bump (Fable plan #2): each time this slot's total GROWS — a coin
  // just landed — the sprite swells and springs back, so the combo reads as one
  // object paying another. Delayed by the coin's flight so it fires on arrival,
  // not departure. Skips the initial base (undefined→value) and reduced motion
  // (R-28 — the number tick alone carries it).
  const impact = useSharedValue(0);
  const prevTotal = useRef(slotTotal);
  useEffect(() => {
    const grew = prevTotal.current !== undefined && slotTotal !== undefined && slotTotal > prevTotal.current;
    prevTotal.current = slotTotal;
    if (!grew || reduced) return;
    impact.value = withDelay(
      motion.durations.tokenTravel,
      withSequence(withTiming(1, { duration: 90 }), withSpring(0, motion.springs.impact)),
    );
  }, [slotTotal, reduced, impact]);

  // Combo "take a bow" (Fable plan #4): when this item is named in a combo, it
  // hops once, staggered by its reading-order index, so the members celebrate on
  // the shelf. Reduced motion shows a static gold ring instead (below), no hop.
  const hop = useSharedValue(0);
  useEffect(() => {
    if (!isMember || reduced) {
      hop.value = 0;
      return;
    }
    hop.value = withDelay(
      memberIndex * motion.cascade.hopStaggerMs,
      withSequence(withTiming(1, { duration: 90 }), withSpring(0, motion.springs.settle)),
    );
  }, [isMember, memberIndex, reduced, hop]);

  // vanish = a puff, not a plain fade: the sprite swells as it dissolves (R-38
  // fixture path, motion-spec §4 "300ms puff before dayTotal").
  const puff = useSharedValue(0);
  useEffect(() => {
    if (vanished) {
      puff.value = reduced
        ? 1
        : withTiming(1, { duration: motion.durations.morph, easing: Easing.out(Easing.quad) });
    }
  }, [vanished, reduced, puff]);

  const style = useAnimatedStyle(() => {
    // Single uniform `scale` ONLY — separate scaleX/scaleY transforms collapse the
    // view on the New Architecture (Fabric, newArchEnabled), which blanked every
    // cascade sprite. So the "receive" impact is a uniform bump (grow, spring back)
    // rather than a non-uniform squash; pop + puff (vanish swell) also fold in here.
    const base = (1 + pop.value * 0.12) * (1 + puff.value * 0.35);
    const activeLift = withTiming(active && !reduced ? -3 : 0, { duration: motion.durations.snap });
    return {
      opacity: 1 - puff.value,
      transform: [
        { scale: base * (1 + impact.value * 0.12) },
        { translateY: activeLift - motion.cascade.hopY * hop.value },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        styles.item,
        { left: x, top: y, width: layout.slotSize, height: layout.slotSize },
        active && styles.itemActive,
        // Reduced motion keeps the members identifiable with a static gold ring
        // for the banner's lifetime instead of the hop (R-28).
        isMember && reduced && styles.itemMember,
        style,
      ]}
    >
      <ItemSprite item={item} glyph={glyph} size={layout.slotSize} hideValue />
    </Animated.View>
  );
}

interface SlotTagProps {
  layout: ShelfLayout;
  row: number;
  col: number;
  value: number;
  final: boolean;
  active: boolean;
  reduced: boolean;
}

/** Gold scoring chip that count-ups toward `value`; the beneficiary is the one that moves. */
function SlotTag({ layout, row, col, value, final, active, reduced }: SlotTagProps) {
  const { x, y } = slotTopLeft(layout, row, col);
  const display = useCountUp(value, reduced);

  const pulse = useSharedValue(0);
  useEffect(() => {
    pulse.value = reduced ? 0 : withSequence(withTiming(1, { duration: 90 }), withTiming(0, { duration: 160 }));
  }, [value, reduced, pulse]);

  const style = useAnimatedStyle(() => ({ transform: [{ scale: 1 + pulse.value * 0.18 }] }));

  return (
    <Animated.View
      style={[
        styles.tag,
        {
          left: x + layout.slotSize / 2 - TAG_HALF,
          top: y - spacing.xs,
          borderColor: final ? palette.goldDeep : palette.parchmentEdge,
        },
        active && styles.tagActive,
        style,
      ]}
    >
      <Text style={styles.tagText}>{display}</Text>
    </Animated.View>
  );
}

function RowAuraGlow({
  layout,
  row,
  mult,
  reduced,
}: {
  layout: ShelfLayout;
  row: number;
  mult: number;
  reduced: boolean;
}) {
  const { y } = slotTopLeft(layout, row, 0);
  const sweep = useSharedValue(0);
  useEffect(() => {
    sweep.value = reduced ? 1 : withTiming(1, { duration: motion.durations.auraSweep });
  }, [sweep, reduced]);

  // R-33: the gold band rests at ~0.3 opacity. Only the fill fades — the ×mult
  // label rides above it at full opacity so the attribution stays crisp (R-27).
  const fillStyle = useAnimatedStyle(() => ({ opacity: 0.16 + sweep.value * 0.14 }));

  return (
    <View
      pointerEvents="none"
      style={[
        styles.auraRegion,
        {
          top: y - 3,
          left: FRAME_PADDING - 3,
          width: layout.frameWidth - (FRAME_PADDING - 3) * 2,
          height: layout.slotSize + 6,
        },
      ]}
    >
      <Animated.View style={[styles.auraFill, fillStyle]} />
      <View style={styles.auraLabel}>
        <Text style={styles.auraLabelText}>×{mult}</Text>
      </View>
    </View>
  );
}

const BANNER_DOCK_SCALE = 0.58;

/**
 * R-34: the trophy holds FULL opacity from its comboNamed event, then — when the
 * dayTotal lands (`docked`) — physically docks to a small chip in the top-right
 * corner so the slam owns the final beat. It never fades in place; it shrinks and
 * moves aside, surviving the slam smaller.
 */
function ComboBanner({
  combo,
  docked,
  sceneWidth,
  reduced,
}: {
  combo: { comboId: string; slots: Slot[] };
  docked: boolean;
  sceneWidth: number;
  reduced: boolean;
}) {
  const drop = useSharedValue(reduced ? 1 : 0);
  const dock = useSharedValue(reduced && docked ? 1 : 0);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    drop.value = reduced ? 1 : withDelay(40, withSpring(1, motion.springs.settle));
  }, [combo.comboId, reduced, drop]);

  useEffect(() => {
    dock.value = reduced ? (docked ? 1 : 0) : withTiming(docked ? 1 : 0, { duration: motion.durations.settle });
  }, [docked, reduced, dock]);

  const style = useAnimatedStyle(() => {
    const enter = drop.value; // entrance 0→1
    const d = dock.value; // hero 0 → chip 1
    // Chip lands against the right edge: from centered, translate right by the
    // gap between the scaled half-width and the scene's half-width.
    const restX = sceneWidth > 0 && width > 0 ? sceneWidth / 2 - (width * BANNER_DOCK_SCALE) / 2 - spacing.sm : 0;
    return {
      opacity: enter, // full opacity once entered; docking never fades it
      transform: [
        { translateX: d * restX },
        { translateY: -24 + enter * 24 - d * spacing.xs },
        { scale: (0.9 + enter * 0.1) * (1 - d * (1 - BANNER_DOCK_SCALE)) },
      ],
    };
  });

  return (
    <Animated.View
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={[styles.banner, style]}
    >
      <Text style={styles.bannerEyebrow}>NAMED COMBO</Text>
      <Text style={styles.bannerTitle}>{prettifyCombo(combo.comboId)}</Text>
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------

/** rAF count-up toward `target`; snaps when reduced. One low-frequency number. */
function useCountUp(target: number, reduced: boolean): number {
  const [value, setValue] = useState(target);
  useEffect(() => {
    if (reduced) {
      setValue(target);
      return;
    }
    let from = value;
    const startedAt = Date.now();
    let raf = 0;
    const step = () => {
      const t = Math.min(1, (Date.now() - startedAt) / motion.durations.countUp);
      const eased = 1 - (1 - t) * (1 - t);
      setValue(Math.round(from + (target - from) * eased));
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // value read once at start as the tween origin; target drives restarts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, reduced]);
  return value;
}

function prettifyCombo(comboId: string): string {
  return comboId
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * B-M11 discovery toast — the "warm recognition" chip. A first-this-run combo
 * shows an ink-on-paper chip naming it; a first-ever combo adds the gold
 * "DISCOVERED" stamp motif (the catalog stamp echo). Springs in; snaps under
 * reduced motion (R-28). No coins language, no confetti — that stays apex's.
 */
function DiscoveryToast({ moment, reduced }: { moment: DiscoveryMoment; reduced: boolean }) {
  const firstEver = moment.kind === 'first-ever';
  const t = useSharedValue(reduced ? 1 : 0);
  useEffect(() => {
    t.value = reduced ? 1 : withSpring(1, motion.springs.settle);
  }, [t, reduced]);
  const style = useAnimatedStyle(() => ({
    opacity: t.value,
    transform: [{ translateY: (1 - t.value) * 8 }, { scale: 0.92 + t.value * 0.08 }],
  }));
  return (
    <Animated.View style={[styles.toast, firstEver && styles.toastStamp, style]}>
      <Text style={[styles.toastEyebrow, firstEver && styles.toastEyebrowStamp]}>
        {firstEver ? '✦ DISCOVERED' : 'COMBO'}
      </Text>
      <Text style={styles.toastName}>{prettifyCombo(moment.comboId)}</Text>
    </Animated.View>
  );
}

const TAG_HALF = 18;
const POP_W = 44;
const POP_H = 26;

const styles = StyleSheet.create({
  pop: {
    alignItems: 'center',
    borderRadius: radii.pill,
    height: POP_H,
    justifyContent: 'center',
    position: 'absolute',
    width: POP_W,
    zIndex: 7,
    ...shadows.lifted,
  },
  popText: {
    ...typeScale.label,
    color: palette.creamBright,
    fontSize: 14,
    fontWeight: '800',
  },
  wrap: {
    gap: spacing.lg,
    width: '100%',
  },
  scene: {
    alignItems: 'center',
    width: '100%',
  },
  board: {
    backgroundColor: palette.shelfWood,
    borderColor: palette.woodDark,
    borderRadius: radii.lg,
    borderTopColor: palette.woodLight,
    borderWidth: 3,
    left: 0,
    position: 'absolute',
    top: 0,
  },
  well: {
    backgroundColor: palette.woodInset,
    borderColor: palette.woodDark,
    borderRadius: radii.sm,
    borderTopColor: palette.shadow,
    borderWidth: 1.5,
    position: 'absolute',
  },
  plank: {
    backgroundColor: palette.woodLight,
    borderBottomColor: palette.woodDark,
    borderBottomWidth: 2,
    borderRadius: radii.xs,
    borderTopColor: palette.sunlight,
    borderTopWidth: 1,
    height: PLANK_HEIGHT,
    position: 'absolute',
  },
  item: {
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
    position: 'absolute',
  },
  itemActive: {
    zIndex: 3,
  },
  itemMember: {
    borderColor: palette.goldDeep,
    borderRadius: radii.md,
    borderWidth: borders.regular,
  },
  tag: {
    alignItems: 'center',
    backgroundColor: palette.coinGold,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    minWidth: TAG_HALF * 2,
    paddingHorizontal: spacing.xs,
    paddingVertical: 1,
    pointerEvents: 'none',
    position: 'absolute',
    zIndex: 5,
    ...shadows.float,
  },
  tagActive: {
    backgroundColor: palette.sunlight,
  },
  tagText: {
    ...typeScale.coin,
    color: palette.ink,
    fontSize: 14,
    lineHeight: 18,
  },
  auraRegion: {
    pointerEvents: 'none',
    position: 'absolute',
    zIndex: 2,
  },
  auraFill: {
    backgroundColor: palette.auraGold,
    borderColor: palette.auraGoldEdge,
    borderRadius: radii.md,
    borderWidth: 1.5,
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  auraLabel: {
    backgroundColor: palette.auraGoldEdge,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 1,
    position: 'absolute',
    right: spacing.xs,
    top: spacing.xs,
  },
  auraLabelText: {
    ...typeScale.label,
    color: palette.creamBright,
    fontSize: 12,
    letterSpacing: 0,
  },
  bannerLayer: {
    alignItems: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: spacing.sm,
    zIndex: 6,
  },
  discoveryLayer: {
    alignItems: 'center',
    bottom: spacing.sm,
    left: 0,
    position: 'absolute',
    right: 0,
    zIndex: 6,
  },
  toast: {
    alignItems: 'center',
    backgroundColor: palette.creamBright,
    borderColor: palette.parchmentEdge,
    borderRadius: radii.md,
    borderWidth: 1.5,
    gap: 2,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    ...shadows.card,
  },
  // First-ever: the catalog stamp echo — a warmer bed and a gold stamp edge.
  toastStamp: {
    backgroundColor: palette.sunlight,
    borderColor: palette.goldDeep,
    borderWidth: 2,
  },
  toastEyebrow: {
    ...typeScale.label,
    color: palette.inkFaint,
    fontSize: 11,
  },
  toastEyebrowStamp: {
    color: palette.goldDeep,
  },
  toastName: {
    ...typeScale.heading,
    color: palette.ink,
    fontSize: 15,
  },
  banner: {
    alignItems: 'center',
    backgroundColor: palette.rentEmber,
    borderColor: palette.emberDark,
    borderRadius: radii.md,
    borderWidth: 2,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    pointerEvents: 'none',
    ...shadows.lifted,
  },
  bannerEyebrow: {
    ...typeScale.label,
    color: palette.sunlight,
  },
  bannerTitle: {
    ...typeScale.title,
    color: palette.creamBright,
  },
  footer: {
    gap: spacing.lg,
  },
  totalRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.lg,
    justifyContent: 'center',
  },
  totalLabel: {
    ...typeScale.label,
    color: palette.inkFaint,
  },
  targetBanner: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: palette.sunlight,
    borderColor: palette.goldDeep,
    borderRadius: radii.md,
    borderWidth: 1.5,
    gap: 2,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
  },
  targetTitle: {
    ...typeScale.label,
    color: palette.emberDark,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  targetReward: {
    ...typeScale.label,
    color: palette.ink,
    fontSize: 12,
    fontWeight: '700',
  },
  totalPlaceholder: {
    alignItems: 'center',
    borderColor: palette.parchmentEdge,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    height: 44,
    justifyContent: 'center',
    minWidth: 72,
  },
  totalPlaceholderText: {
    ...typeScale.display,
    color: palette.inkFaint,
  },
});
