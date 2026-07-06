import { useCallback, useEffect, useMemo, useState } from 'react';
import { LayoutChangeEvent, Platform, StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import type { GameState, ItemInstance, Slot } from '@/contracts';
import { palette, radii, spacing, typeScale } from '@/ui/tokens';
import { useReducedMotion } from '@/ui/prefs';
import { DraggableItem, type SceneShared } from './DraggableItem';
import { DeliveryTrayItem } from './DeliveryTrayItem';
import {
  computeShelfLayout,
  FRAME_PADDING,
  PLANK_HEIGHT,
  slotTopLeft,
  type ShelfLayout,
} from './layout';
import { useSkiaReady } from './skiaWeb';

// Room reserved below the grid for the delivery tray (label + item + gap).
const TRAY_GAP = spacing.lg;
const TRAY_LABEL_HEIGHT = 16;

// Native-only: importing @shopify/react-native-skia on web auto-initializes
// CanvasKit (wasm). Guard the require so the Skia module is never *executed* in
// the web bundle — web always uses the RN fallback frame (device-verify-only).
const SkiaShelfFrame =
  Platform.OS === 'web'
    ? null
    : (require('./SkiaShelfFrame') as typeof import('./SkiaShelfFrame')).SkiaShelfFrame;

/**
 * The hero: a shelf you'd keep touching for no reason. Composition is layered so
 * the Skia depth frame is one swappable layer under a Reanimated-driven stack —
 * gesture and motion are verifiable on web even if CanvasKit isn't:
 *
 *   [Skia frame | RN fallback frame]  ← depth, pointer-transparent
 *   [slot glow]                       ← legal/illegal drag feedback (breathing)
 *   [draggable items]                 ← the full motion-spec gesture feel
 *
 * Legality is contract-only ("slot empty", R-16); this scene never touches rules.
 */

interface ShelfSceneProps {
  gameState: GameState;
  glyphs: Readonly<Record<string, string>>;
  onMove?: (from: { row: number; col: number }, to: { row: number; col: number }) => void;
  /** F-M3-3: the drafted/purchased item riding in the tray, dragged onto a slot. */
  heldItem?: ItemInstance | null;
  /** Fired when the held item is dropped onto an empty slot. */
  onPlace?: (slot: Slot) => void;
}

export function ShelfScene({ gameState, glyphs, onMove, heldItem, onPlace }: ShelfSceneProps) {
  const reduced = useReducedMotion();
  const skia = useSkiaReady();
  const { rows, cols } = gameState.shelf.size;

  const [frameWidth, setFrameWidth] = useState(0);
  const layout = useMemo(
    () => (frameWidth > 0 ? computeShelfLayout(frameWidth, rows, cols) : null),
    [frameWidth, rows, cols],
  );
  const showTray = Boolean(heldItem && onPlace);

  // Board = the mutable placement map (UI-only, not game rules). Seeded from the
  // contract shelf; drag commits move an instance from one index to an empty one.
  const [board, setBoard] = useState<(ItemInstance | null)[]>(() => seedBoard(gameState, rows, cols));
  useEffect(() => {
    setBoard(seedBoard(gameState, rows, cols));
  }, [gameState, rows, cols]);

  const grabbedIndex = useSharedValue(-1);
  const hoverIndex = useSharedValue(-1);
  const hoverLegal = useSharedValue(0);
  const occupancy = useSharedValue<number[]>(board.map((slot) => (slot ? 1 : 0)));
  useEffect(() => {
    occupancy.value = board.map((slot) => (slot ? 1 : 0));
  }, [board, occupancy]);

  const shared: SceneShared = { grabbedIndex, hoverIndex, hoverLegal, occupancy };

  // Slot-glow breathing loop (600 ms), shared by every well.
  const breath = useSharedValue(0);
  useEffect(() => {
    if (reduced) {
      breath.value = 1;
      return;
    }
    breath.value = withRepeat(
      withTiming(1, { duration: 600, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
    return () => cancelAnimation(breath);
  }, [reduced, breath]);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    setFrameWidth(e.nativeEvent.layout.width);
  }, []);

  const commitMove = useCallback(
    (fromIndex: number, toIndex: number) => {
      setBoard((prev) => {
        if (prev[toIndex] || !prev[fromIndex]) return prev;
        const next = prev.slice();
        next[toIndex] = prev[fromIndex];
        next[fromIndex] = null;
        return next;
      });
      onMove?.(
        { row: Math.floor(fromIndex / cols), col: fromIndex % cols },
        { row: Math.floor(toIndex / cols), col: toIndex % cols },
      );
    },
    [cols, onMove],
  );

  const trayZone = layout && showTray
    ? TRAY_GAP + TRAY_LABEL_HEIGHT + layout.slotSize + spacing.sm
    : 0;
  const trayHomeX = layout ? (layout.frameWidth - layout.slotSize) / 2 : 0;
  const trayHomeY = layout ? layout.frameHeight + TRAY_GAP + TRAY_LABEL_HEIGHT : 0;

  return (
    <View style={styles.frame} onLayout={onLayout}>
      {layout ? (
        <View style={{ width: layout.frameWidth, height: layout.frameHeight + trayZone }}>
          {skia === 'ready' && SkiaShelfFrame ? (
            <SkiaShelfFrame layout={layout} />
          ) : (
            <FallbackFrame layout={layout} />
          )}

          {board.map((_, index) => (
            <SlotGlow
              key={`glow-${index}`}
              index={index}
              layout={layout}
              hoverIndex={hoverIndex}
              hoverLegal={hoverLegal}
              breath={breath}
            />
          ))}

          {board.map((item, index) =>
            item ? (
              <DraggableItem
                key={item.instanceId}
                item={item}
                row={Math.floor(index / cols)}
                col={index % cols}
                layout={layout}
                shared={shared}
                reduced={reduced}
                glyph={glyphs[item.itemId] ?? '📦'}
                onCommitMove={commitMove}
              />
            ) : null,
          )}

          {showTray && heldItem && onPlace ? (
            <>
              <Text
                style={[styles.trayLabel, { top: layout.frameHeight + TRAY_GAP, width: layout.frameWidth }]}
              >
                DELIVERY — DRAG TO A SHELF SLOT
              </Text>
              <View
                style={[
                  styles.trayPlate,
                  {
                    left: trayHomeX - spacing.xs,
                    top: trayHomeY - spacing.xs,
                    width: layout.slotSize + spacing.sm,
                    height: layout.slotSize + spacing.sm,
                  },
                ]}
              />
              <DeliveryTrayItem
                key={heldItem.instanceId}
                item={heldItem}
                homeX={trayHomeX}
                homeY={trayHomeY}
                layout={layout}
                shared={shared}
                reduced={reduced}
                glyph={glyphs[heldItem.itemId] ?? '📦'}
                onPlace={onPlace}
              />
            </>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function seedBoard(gameState: GameState, rows: number, cols: number): (ItemInstance | null)[] {
  const board: (ItemInstance | null)[] = new Array(rows * cols).fill(null);
  for (const slotState of gameState.shelf.slots) {
    const idx = slotState.slot.row * cols + slotState.slot.col;
    board[idx] = slotState.item;
  }
  return board;
}

interface SlotGlowProps {
  index: number;
  layout: ShelfLayout;
  hoverIndex: SharedValue<number>;
  hoverLegal: SharedValue<number>;
  breath: SharedValue<number>;
}

/** Per-well drag feedback: legal target breathes teal-green, illegal glows red. */
function SlotGlow({ index, layout, hoverIndex, hoverLegal, breath }: SlotGlowProps) {
  const row = Math.floor(index / layout.cols);
  const col = index % layout.cols;
  const { x, y } = slotTopLeft(layout, row, col);

  const style = useAnimatedStyle(() => {
    const activeHere = hoverIndex.value === index ? 1 : 0;
    const pulse = 0.55 + 0.45 * breath.value;
    return {
      opacity: activeHere * 0.4 * pulse,
      backgroundColor: interpolateColor(hoverLegal.value, [0, 1], [palette.slotIllegal, palette.slotLegal]),
    };
  });

  return (
    <Animated.View
      style={[
        styles.glow,
        { left: x, top: y, width: layout.slotSize, height: layout.slotSize, pointerEvents: 'none' },
        style,
      ]}
    />
  );
}

/**
 * RN-view depth frame used when Skia isn't ready (web wasm still loading/blocked).
 * Layered borders fake the well recess and the lit front lip so web verification
 * of gesture + motion never waits on CanvasKit.
 */
function FallbackFrame({ layout }: { layout: ShelfLayout }) {
  const wells = [];
  for (let row = 0; row < layout.rows; row += 1) {
    const rowTop = FRAME_PADDING + row * layout.rowStride;
    wells.push(
      <View
        key={`fplank-${row}`}
        style={[
          styles.plank,
          { left: FRAME_PADDING - 2, top: rowTop + layout.slotSize + 2, width: layout.frameWidth - (FRAME_PADDING - 2) * 2 },
        ]}
      />,
    );
    for (let col = 0; col < layout.cols; col += 1) {
      const { x, y } = slotTopLeft(layout, row, col);
      wells.push(
        <View
          key={`fwell-${row}-${col}`}
          style={[styles.well, { left: x, top: y, width: layout.slotSize, height: layout.slotSize }]}
        />,
      );
    }
  }
  return (
    <View style={[styles.board, { width: layout.frameWidth, height: layout.frameHeight }]}>{wells}</View>
  );
}

const styles = StyleSheet.create({
  frame: {
    width: '100%',
  },
  board: {
    position: 'absolute',
    top: 0,
    left: 0,
    backgroundColor: palette.shelfWood,
    borderColor: palette.woodDark,
    borderRadius: radii.lg,
    borderTopColor: palette.woodLight,
    borderWidth: 3,
  },
  well: {
    position: 'absolute',
    backgroundColor: palette.woodInset,
    borderColor: palette.woodDark,
    borderRadius: radii.sm,
    borderTopColor: palette.shadow,
    borderWidth: 1.5,
  },
  plank: {
    position: 'absolute',
    backgroundColor: palette.woodLight,
    borderBottomColor: palette.woodDark,
    borderBottomWidth: 2,
    borderRadius: radii.xs,
    borderTopColor: palette.sunlight,
    borderTopWidth: 1,
    height: PLANK_HEIGHT,
  },
  glow: {
    position: 'absolute',
    borderRadius: radii.sm,
  },
  trayLabel: {
    ...typeScale.label,
    color: palette.inkFaint,
    position: 'absolute',
    textAlign: 'center',
  },
  trayPlate: {
    position: 'absolute',
    backgroundColor: palette.parchment,
    borderColor: palette.parchmentEdge,
    borderRadius: radii.md,
    borderWidth: 1.5,
  },
});
