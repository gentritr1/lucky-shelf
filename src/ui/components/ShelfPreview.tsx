import { StyleSheet, Text, View } from 'react-native';

import type { Shelf } from '../../contracts';
import { spacing } from '../tokens';
import { useThemedStyles } from '../useThemedStyles';
import { makeStyles } from './ShelfPreview.styles';

interface ShelfPreviewProps {
  shelf: Shelf;
  /** itemId → placeholder glyph until the Higgsfield sprite pack lands. */
  glyphs: Readonly<Record<string, string>>;
}

/**
 * Static shelf render from a contract GameState — the M0 proof that Lane B
 * builds against fixtures without waiting on Lane A. The Skia hero scene
 * (depth, idle motion, drag glow) replaces this at M1; layout stays.
 */
export function ShelfPreview({ shelf, glyphs }: ShelfPreviewProps) {
  const themed = useThemedStyles(makeStyles);
  const rows = Array.from({ length: shelf.size.rows }, (_, row) =>
    shelf.slots.filter((slotState) => slotState.slot.row === row),
  );

  return (
    <View style={themed.frame}>
      {rows.map((rowSlots, rowIndex) => (
        <View key={rowIndex} style={styles.rowWrap}>
          <View style={styles.row}>
            {rowSlots.map((slotState) => (
              <View key={`${slotState.slot.row}-${slotState.slot.col}`} style={themed.slot}>
                {slotState.item ? (
                  <View style={styles.item}>
                    <Text style={styles.glyph}>{glyphs[slotState.item.itemId] ?? '📦'}</Text>
                    <View style={themed.valueBadge}>
                      <Text style={themed.valueText}>{slotState.item.baseValue}</Text>
                    </View>
                  </View>
                ) : null}
              </View>
            ))}
          </View>
          <View style={themed.plank} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  rowWrap: {
    gap: 0,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  item: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyph: {
    fontSize: 34,
  },
});
