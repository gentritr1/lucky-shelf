import { StyleSheet, Text, View } from 'react-native';

import type { Shelf } from '../../contracts';
import { palette, radii, spacing, typeScale } from '../tokens';

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
  const rows = Array.from({ length: shelf.size.rows }, (_, row) =>
    shelf.slots.filter((slotState) => slotState.slot.row === row),
  );

  return (
    <View style={styles.frame}>
      {rows.map((rowSlots, rowIndex) => (
        <View key={rowIndex} style={styles.rowWrap}>
          <View style={styles.row}>
            {rowSlots.map((slotState) => (
              <View key={`${slotState.slot.row}-${slotState.slot.col}`} style={styles.slot}>
                {slotState.item ? (
                  <View style={styles.item}>
                    <Text style={styles.glyph}>{glyphs[slotState.item.itemId] ?? '📦'}</Text>
                    <View style={styles.valueBadge}>
                      <Text style={styles.valueText}>{slotState.item.baseValue}</Text>
                    </View>
                  </View>
                ) : null}
              </View>
            ))}
          </View>
          <View style={styles.plank} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    backgroundColor: palette.shelfWood,
    borderColor: palette.woodDark,
    borderRadius: radii.lg,
    borderWidth: 3,
    gap: spacing.sm,
    padding: spacing.md,
  },
  rowWrap: {
    gap: 0,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  slot: {
    alignItems: 'center',
    aspectRatio: 1,
    backgroundColor: palette.woodInset,
    borderRadius: radii.sm,
    flex: 1,
    justifyContent: 'center',
  },
  plank: {
    backgroundColor: palette.woodLight,
    borderBottomColor: palette.woodDark,
    borderBottomWidth: 2,
    borderRadius: radii.xs,
    height: 8,
    marginTop: spacing.xs,
  },
  item: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyph: {
    fontSize: 34,
  },
  valueBadge: {
    backgroundColor: palette.coinGold,
    borderColor: palette.goldDeep,
    borderRadius: radii.pill,
    borderWidth: 1,
    marginTop: -spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  valueText: {
    ...typeScale.label,
    color: palette.ink,
    letterSpacing: 0,
  },
});
