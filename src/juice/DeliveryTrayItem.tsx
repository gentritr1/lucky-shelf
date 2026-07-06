import { useState } from 'react';
import { Platform, StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import type { ItemInstance, Slot } from '@/contracts';
import { motion } from '@/ui/tokens';
import { haptic } from './haptics';
import { easings } from './motion';
import { ItemSprite } from './ItemSprite';
import { pointToSlot, slotIndex, slotTopLeft, type ShelfLayout } from './layout';
import type { SceneShared } from './DraggableItem';

/**
 * The delivery-tray placement gesture (F-M3-3). The drafted item rides in a tray
 * below the shelf and is dragged onto an empty slot — the same M1 drag feel
 * (grab lift, 1:1 tracking, velocity tilt, settle-with-overshoot, rubber-band
 * return) but off-grid → grid. Legality is contract-only: "target slot empty".
 * On a legal drop it settles onto the slot and fires `onPlace(slot)`; the sim
 * then clears the held item and the tray unmounts.
 */

interface DeliveryTrayItemProps {
  item: ItemInstance;
  /** Tray anchor (frame-local top-left), shared origin with the grid math. */
  homeX: number;
  homeY: number;
  layout: ShelfLayout;
  shared: SceneShared;
  reduced: boolean;
  glyph: string;
  onPlace: (slot: Slot) => void;
}

const IS_WEB = Platform.OS === 'web';

export function DeliveryTrayItem({
  item,
  homeX,
  homeY,
  layout,
  shared,
  reduced,
  glyph,
  onPlace,
}: DeliveryTrayItemProps) {
  const { hoverIndex, hoverLegal, occupancy } = shared;
  const homeCenterX = homeX + layout.slotSize / 2;
  const homeCenterY = homeY + layout.slotSize / 2;

  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const liftY = useSharedValue(0);
  const scale = useSharedValue(1);
  const rot = useSharedValue(0);

  const [active, setActive] = useState(false);

  const grab = () => {
    'worklet';
    scale.value = reduced ? withTiming(1.08, { duration: 0 }) : withSpring(1.08, motion.springs.grab);
    liftY.value = reduced ? withTiming(-6, { duration: 0 }) : withSpring(-6, motion.springs.grab);
    runOnJS(setActive)(true);
    runOnJS(haptic)('grabLift');
  };

  const release = () => {
    'worklet';
    hoverIndex.value = -1;
    scale.value = reduced ? withTiming(1, { duration: 0 }) : withSpring(1, motion.springs.settle);
    liftY.value = reduced ? withTiming(0, { duration: 0 }) : withSpring(0, motion.springs.settle);
    rot.value = reduced ? 0 : withSpring(0, motion.springs.settle);
    runOnJS(setActive)(false);
  };

  const rubberBack = () => {
    'worklet';
    const opts = { duration: reduced ? 0 : motion.durations.drift, easing: easings.rubber };
    tx.value = withTiming(0, opts);
    ty.value = withTiming(0, opts);
    runOnJS(haptic)('invalidReturn');
  };

  const settleOnto = (slot: Slot) => {
    'worklet';
    const dest = slotTopLeft(layout, slot.row, slot.col);
    const dx = dest.x - homeX;
    const dy = dest.y - homeY;
    ty.value = reduced ? withTiming(dy, { duration: 0 }) : withSpring(dy, motion.springs.settle);
    tx.value = reduced
      ? withTiming(dx, { duration: 0 })
      : withSpring(dx, motion.springs.settle, (finished) => {
          if (finished) runOnJS(onPlace)(slot);
        });
    if (reduced) runOnJS(onPlace)(slot);
  };

  const pan = Gesture.Pan()
    .onBegin(grab)
    .onChange((e) => {
      'worklet';
      tx.value = e.translationX;
      ty.value = e.translationY;
      rot.value = Math.max(-3, Math.min(3, e.velocityX * 0.015));

      const target = pointToSlot(layout, homeCenterX + e.translationX, homeCenterY + e.translationY);
      const targetIdx = slotIndex(layout.cols, target.row, target.col);
      hoverIndex.value = targetIdx;
      hoverLegal.value = occupancy.value[targetIdx] === 0 ? 1 : 0;
    })
    .onEnd((e) => {
      'worklet';
      const target = pointToSlot(layout, homeCenterX + e.translationX, homeCenterY + e.translationY);
      const targetIdx = slotIndex(layout.cols, target.row, target.col);
      const legal = occupancy.value[targetIdx] === 0;

      if (!legal) {
        rubberBack();
        return;
      }
      settleOnto(target);
      runOnJS(haptic)('dropSettle');
      runOnJS(haptic)('placementTick');
    })
    .onFinalize(release);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.value },
      { translateY: ty.value + liftY.value },
      { scale: scale.value },
      { rotateZ: `${rot.value}deg` },
    ],
    ...(IS_WEB ? null : { shadowOpacity: active ? 0.28 : 0.18, shadowRadius: active ? 14 : 6 }),
  }));

  return (
    <Animated.View
      style={[
        styles.item,
        {
          left: homeX,
          top: homeY,
          width: layout.slotSize,
          height: layout.slotSize,
          zIndex: active ? 100 : 20,
          elevation: active ? 12 : 4,
        },
        style,
      ]}
    >
      <GestureDetector gesture={pan}>
        <Animated.View style={styles.hit} testID={`tray-item-${item.itemId}`}>
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
