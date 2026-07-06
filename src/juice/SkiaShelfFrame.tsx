import { StyleSheet } from 'react-native';
import {
  Canvas,
  Group,
  LinearGradient,
  RoundedRect,
  Shadow,
  vec,
} from '@shopify/react-native-skia';

import { palette, radii } from '@/ui/tokens';
import { FRAME_PADDING, PLANK_HEIGHT, slotTopLeft, type ShelfLayout } from './layout';

/**
 * The wood-frame DEPTH layer, drawn in Skia (Fable's M0 note: empty slots read
 * flat; give wells a soft inner shadow and the shelf front-edge a highlight).
 * This is a pointer-transparent BACKGROUND — slot glow, items, and gestures are
 * RN/Reanimated layers stacked above it, so the scene works with or without it.
 *
 * Rendered only when `useSkiaReady()` is 'ready'; on web the CanvasKit wasm must
 * have loaded first (see skiaWeb.ts), otherwise ShelfScene shows a view frame.
 */

interface SkiaShelfFrameProps {
  layout: ShelfLayout;
}

export function SkiaShelfFrame({ layout }: SkiaShelfFrameProps) {
  const { frameWidth, frameHeight, slotSize, rows, cols } = layout;

  const wells = [];
  const planks = [];
  for (let row = 0; row < rows; row += 1) {
    const rowTop = FRAME_PADDING + row * layout.rowStride;
    // Front-edge board under each row — a lit lip that catches the golden light.
    planks.push(
      <RoundedRect
        key={`plank-${row}`}
        x={FRAME_PADDING - 2}
        y={rowTop + slotSize + 2}
        width={frameWidth - (FRAME_PADDING - 2) * 2}
        height={PLANK_HEIGHT}
        r={radii.xs}
      >
        <LinearGradient
          start={vec(0, rowTop + slotSize)}
          end={vec(0, rowTop + slotSize + PLANK_HEIGHT)}
          colors={[palette.sunlight, palette.woodLight, palette.woodDark]}
          positions={[0, 0.35, 1]}
        />
      </RoundedRect>,
    );

    for (let col = 0; col < cols; col += 1) {
      const { x, y } = slotTopLeft(layout, row, col);
      wells.push(
        <RoundedRect key={`well-${row}-${col}`} x={x} y={y} width={slotSize} height={slotSize} r={radii.sm}>
          <LinearGradient
            start={vec(x, y)}
            end={vec(x, y + slotSize)}
            colors={[palette.woodDark, palette.woodInset]}
          />
          {/* carve the well: dark inner shadow at top, faint lit lip at bottom */}
          <Shadow dx={0} dy={2.5} blur={6} color={palette.shadow} inner />
          <Shadow dx={0} dy={-1} blur={2} color={palette.woodLight} inner />
        </RoundedRect>,
      );
    }
  }

  return (
    <Canvas style={[styles.canvas, { width: frameWidth, height: frameHeight }]}>
      {/* the board */}
      <RoundedRect x={0} y={0} width={frameWidth} height={frameHeight} r={radii.lg}>
        <LinearGradient
          start={vec(0, 0)}
          end={vec(0, frameHeight)}
          colors={[palette.woodLight, palette.shelfWood, palette.woodDark]}
          positions={[0, 0.5, 1]}
        />
      </RoundedRect>
      <Group>{planks}</Group>
      <Group>{wells}</Group>
    </Canvas>
  );
}

const styles = StyleSheet.create({
  canvas: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
  },
});
