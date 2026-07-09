import { describe, expect, it } from 'vitest';

import { borders, highContrastPalette, layout, palette, radii, shadows, spacing, touch, type Palette } from '@/ui/tokens';

import { makeStyles } from './draft.styles';

/**
 * B-M9 byte-identity proof for the delivery-draft sheet. `expected(p)` is an
 * independent transcription of the original static sheet minus the text
 * color/role that moved to `AppText` (the fixed caption sizes + `supplierEmoji`
 * stay). Base palette = default prefs → byte-identical; high-contrast palette →
 * themed props thread the argument.
 */
function expected(p: Palette) {
  return {
    screen: {
      backgroundColor: p.wallCream,
      flex: 1,
      gap: spacing.lg,
      paddingHorizontal: layout.screenPadX,
    },
    scrim: {
      backgroundColor: p.wallCream,
      bottom: 0,
      left: 0,
      opacity: 0.22,
      position: 'absolute',
      right: 0,
      top: 0,
    },
    topBar: {
      alignItems: 'center',
      backgroundColor: p.plate,
      borderRadius: radii.lg,
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      ...shadows.card,
    },
    labelPlate: {
      alignSelf: 'flex-start',
      backgroundColor: p.plate,
      borderRadius: radii.md,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xxs,
    },
    captionPlate: {
      alignSelf: 'center',
      backgroundColor: p.plate,
      borderRadius: radii.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
    },
    back: {
      width: 72,
    },
    spacer: {
      width: 72,
    },
    pickBody: {
      flex: 1,
      gap: spacing.lg,
    },
    offers: {
      flexDirection: 'row',
      gap: spacing.md,
    },
    supplierPanel: {
      backgroundColor: p.creamBright,
      borderColor: p.parchmentEdge,
      borderRadius: radii.lg,
      borderWidth: borders.hairline,
      gap: spacing.md,
      padding: spacing.lg,
      ...shadows.card,
    },
    supplierHint: {
      fontSize: 14,
      textAlign: 'center',
    },
    supplierGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
      justifyContent: 'center',
    },
    supplierChip: {
      alignItems: 'center',
      backgroundColor: p.creamBright,
      borderRadius: radii.md,
      borderWidth: 2,
      gap: spacing.xxs,
      justifyContent: 'center',
      minHeight: touch.minTargetPt,
      minWidth: 88,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      ...shadows.card,
    },
    supplierChipPressed: {
      opacity: 0.7,
      transform: [{ scale: 0.97 }],
    },
    supplierEmoji: {
      fontSize: 26,
    },
    supplierChipText: {
      fontSize: 15,
    },
    caption: {
      textAlign: 'center',
    },
    actions: {
      gap: spacing.md,
      marginTop: 'auto',
    },
  };
}

describe('draft.tsx themed styles', () => {
  it('is byte-identical at default prefs (base palette)', () => {
    expect(makeStyles(palette)).toEqual(expected(palette));
  });

  it('threads the palette argument under high contrast (no static leak)', () => {
    expect(makeStyles(highContrastPalette)).toEqual(expected(highContrastPalette));
  });
});
