import { useEffect, useState } from 'react';
import { Platform, StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import type { ItemInstance } from '@/contracts';
import { motion } from '@/ui/tokens';
import { haptic } from './haptics';
import { easings } from './motion';
import { ItemSprite } from './ItemSprite';
import { pointToSlot, slotIndex, slotTopLeft, type ShelfLayout } from './layout';

/**
 * One draggable item — the whole tactile contract from docs/lane-b/motion-spec.md
 * lives here: grab lift (spring `grab`, +1.08 scale, −6pt), velocity tilt (±3°),
 * 1:1 finger tracking, settle-with-overshoot on a legal drop, rubber-band return
 * on an illegal one, and 4pt-then-tension resistance for sticky items. Legality
 * is contract-only: "target slot empty" (R-16, no swap). It never computes rules.
 */

export interface SceneShared {
  /** slot index currently grabbed, or -1 — neighbors read this to part. */
  grabbedIndex: SharedValue<number>;
  /** nearest slot under the dragged item, or -1. */
  hoverIndex: SharedValue<number>;
  /** 1 if the hovered slot is a legal drop, 0 if illegal. */
  hoverLegal: SharedValue<number>;
  /** 0/1 occupancy per slot index (excludes nothing — own slot reads 1). */
  occupancy: SharedValue<number[]>;
}

interface DraggableItemProps {
  item: ItemInstance;
  row: number;
  col: number;
  layout: ShelfLayout;
  shared: SceneShared;
  reduced: boolean;
  glyph: string;
  onCommitMove: (fromIndex: number, toIndex: number) => void;
}

const IS_WEB = Platform.OS === 'web';

function stickyResist(t: number): number {
  'worklet';
  const sign = Math.sign(t);
  const mag = Math.abs(t);
  if (mag <= 4) return t;
  return sign * (4 + (mag - 4) * 0.12);
}

export function DraggableItem({
  item,
  row,
  col,
  layout,
  shared,
  reduced,
  glyph,
  onCommitMove,
}: DraggableItemProps) {
  const { grabbedIndex, hoverIndex, hoverLegal, occupancy } = shared;
  const index = slotIndex(layout.cols, row, col);
  const home = slotTopLeft(layout, row, col);
  const homeCenterX = home.x + layout.slotSize / 2;
  const homeCenterY = home.y + layout.slotSize / 2;

  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const liftY = useSharedValue(0);
  const scale = useSharedValue(1);
  const rot = useSharedValue(0);
  const sticky = item.state.sticky;

  const [active, setActive] = useState(false);

  // After a committed move the board re-homes this item to its new slot; zero
  // the drag offset so it lands cleanly (the settle already placed it visually
  // on the target, so new-home + 0 == where it already is — no jump).
  useEffect(() => {
    tx.value = 0;
    ty.value = 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  // Neighbor parting: if the grabbed slot is my orthogonal neighbor, drift 6pt
  // away from it. Springs so the parting breathes rather than snaps.
  const partX = useDerivedValue(() => {
    const g = grabbedIndex.value;
    let target = 0;
    if (g >= 0 && g !== index) {
      const gr = Math.floor(g / layout.cols);
      const gc = g % layout.cols;
      if (gr === row && Math.abs(gc - col) === 1) target = Math.sign(col - gc) * 6;
    }
    return reduced ? target : withSpring(target, motion.springs.neighborPart);
  });
  const partY = useDerivedValue(() => {
    const g = grabbedIndex.value;
    let target = 0;
    if (g >= 0 && g !== index) {
      const gr = Math.floor(g / layout.cols);
      const gc = g % layout.cols;
      if (gc === col && Math.abs(gr - row) === 1) target = Math.sign(row - gr) * 6;
    }
    return reduced ? target : withSpring(target, motion.springs.neighborPart);
  });

  const grab = () => {
    'worklet';
    grabbedIndex.value = index;
    scale.value = reduced ? withTiming(1.08, { duration: 0 }) : withSpring(1.08, motion.springs.grab);
    liftY.value = reduced ? withTiming(-6, { duration: 0 }) : withSpring(-6, motion.springs.grab);
    runOnJS(setActive)(true);
    // Fable review F-B1: sticky items stay silent on grab — the tension does the
    // teaching, and the single invalidReturn fires at release (motion-spec §2).
    if (!sticky) {
      runOnJS(haptic)('grabLift');
    }
  };

  const release = () => {
    'worklet';
    grabbedIndex.value = -1;
    hoverIndex.value = -1;
    scale.value = reduced ? withTiming(1, { duration: 0 }) : withSpring(1, motion.springs.settle);
    liftY.value = reduced ? withTiming(0, { duration: 0 }) : withSpring(0, motion.springs.settle);
    rot.value = reduced ? 0 : withSpring(0, motion.springs.settle);
    runOnJS(setActive)(false);
  };

  const settleTo = (dx: number, dy: number, commitIndex: number) => {
    'worklet';
    ty.value = reduced ? withTiming(dy, { duration: 0 }) : withSpring(dy, motion.springs.settle);
    tx.value = reduced
      ? withTiming(dx, { duration: 0 })
      : withSpring(dx, motion.springs.settle, (finished) => {
          if (finished && commitIndex !== index) {
            runOnJS(onCommitMove)(index, commitIndex);
          }
        });
    if (reduced && commitIndex !== index) {
      runOnJS(onCommitMove)(index, commitIndex);
    }
  };

  const rubberBack = () => {
    'worklet';
    const opts = { duration: reduced ? 0 : motion.durations.drift, easing: easings.rubber };
    tx.value = withTiming(0, opts);
    ty.value = withTiming(0, opts);
    runOnJS(haptic)('invalidReturn');
  };

  const pan = Gesture.Pan()
    .onBegin(grab)
    .onChange((e) => {
      'worklet';
      if (sticky) {
        tx.value = stickyResist(e.translationX);
        ty.value = stickyResist(e.translationY);
        return;
      }
      tx.value = e.translationX;
      ty.value = e.translationY;
      rot.value = Math.max(-3, Math.min(3, e.velocityX * 0.015));

      const target = pointToSlot(layout, homeCenterX + e.translationX, homeCenterY + e.translationY);
      const targetIdx = slotIndex(layout.cols, target.row, target.col);
      hoverIndex.value = targetIdx === index ? -1 : targetIdx;
      hoverLegal.value = targetIdx === index || occupancy.value[targetIdx] === 0 ? 1 : 0;
    })
    .onEnd((e) => {
      'worklet';
      if (sticky) {
        rubberBack();
        return;
      }
      const target = pointToSlot(layout, homeCenterX + e.translationX, homeCenterY + e.translationY);
      const targetIdx = slotIndex(layout.cols, target.row, target.col);
      const legal = targetIdx === index || occupancy.value[targetIdx] === 0;

      if (!legal) {
        rubberBack();
        return;
      }
      const dest = slotTopLeft(layout, target.row, target.col);
      settleTo(dest.x - home.x, dest.y - home.y, targetIdx);
      if (targetIdx === index) {
        runOnJS(haptic)('placementTick');
      } else {
        runOnJS(haptic)('dropSettle');
        runOnJS(haptic)('placementTick');
      }
    })
    .onFinalize(release);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.value + partX.value },
      { translateY: ty.value + liftY.value + partY.value },
      { scale: scale.value },
      { rotateZ: `${rot.value}deg` },
    ],
    // iOS shadow lifts with the item; Android gets elevation + zIndex raise.
    // Web omits the animated shadow* (it warns as deprecated there); device is
    // the target and keeps the lift shadow (R-25 follow-on — web console clean).
    ...(IS_WEB ? null : { shadowOpacity: active ? 0.28 : 0.18, shadowRadius: active ? 14 : 6 }),
  }));

  return (
    <Animated.View
      style={[
        styles.item,
        {
          left: home.x,
          top: home.y,
          width: layout.slotSize,
          height: layout.slotSize,
          zIndex: active ? 100 : 1,
          elevation: active ? 12 : 2,
        },
        style,
      ]}
    >
      <GestureDetector gesture={pan}>
        <Animated.View style={styles.hit} testID={`item-${item.itemId}`}>
          <ItemSprite item={item} glyph={glyph} size={layout.slotSize} />
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  item: {
    position: 'absolute',
  },
  hit: {
    alignItems: 'center',
    height: '100%',
    justifyContent: 'center',
    width: '100%',
  },
});
