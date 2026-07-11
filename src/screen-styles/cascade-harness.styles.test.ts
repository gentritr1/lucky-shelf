import { describe, expect, it } from 'vitest';

import { highContrastPalette, palette, radii, shadows, spacing, type Palette } from '@/ui/tokens';

import { makeStyles } from './cascade-harness.styles';

/**
 * B-M9 byte-identity proof for the cascade-harness sheet. `expected(p)` is an
 * independent transcription of the original static sheet minus the text
 * color/role and chip active-state color (both moved to `AppText`). Base palette =
 * default prefs → byte-identical; high-contrast palette → themed props thread the
 * argument.
 */
function expected(p: Palette) {
  return {
    screen: {
      backgroundColor: p.wallCream,
      flex: 1,
      gap: spacing.md,
      paddingHorizontal: spacing.lg,
    },
    topBar: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    back: {
      width: 72,
    },
    spacer: {
      width: 72,
    },
    picker: {
      gap: spacing.sm,
      paddingVertical: spacing.xs,
    },
    chip: {
      backgroundColor: p.creamBright,
      borderColor: p.parchmentEdge,
      borderRadius: radii.md,
      borderWidth: 1,
      maxWidth: 150,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      ...shadows.float,
    },
    chipActive: {
      borderColor: p.accentTeal,
      borderWidth: 2,
    },
    chipTitle: {
      fontSize: 13,
    },
    body: {
      gap: spacing.lg,
      paddingTop: spacing.sm,
    },
    notesCard: {
      backgroundColor: p.creamBright,
      borderColor: p.parchmentEdge,
      borderRadius: radii.md,
      borderWidth: 1,
      gap: spacing.xs,
      padding: spacing.md,
    },
    rentRow: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: spacing.md,
      justifyContent: 'space-between',
    },
    rentText: {
      flex: 1,
      gap: spacing.xxs,
    },
    rentHint: {
      fontSize: 13,
    },
  };
}

describe('cascade-harness.tsx themed styles', () => {
  it('is byte-identical at default prefs (base palette)', () => {
    expect(makeStyles(palette)).toEqual(expected(palette));
  });

  it('threads the palette argument under high contrast (no static leak)', () => {
    expect(makeStyles(highContrastPalette)).toEqual(expected(highContrastPalette));
  });
});
