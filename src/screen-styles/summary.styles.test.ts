import { describe, expect, it } from 'vitest';

import { highContrastPalette, layout, palette, radii, spacing, type Palette } from '@/ui/tokens';

import { makeStyles } from './summary.styles';

/**
 * B-M9 byte-identity proof for the run-summary sheet. `expected(p)` is an
 * independent transcription of the original static sheet, parametrized by palette.
 * Base palette = default prefs → byte-identical; high-contrast palette → every
 * themed prop threads the argument.
 */
function expected(p: Palette) {
  return {
    screen: {
      backgroundColor: p.wallCream,
      flex: 1,
      gap: spacing.lg,
      paddingHorizontal: layout.screenPadX,
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
    bodyScroll: {
      flex: 1,
    },
    body: {
      flexGrow: 1,
      gap: spacing.md,
      justifyContent: 'center',
      paddingVertical: spacing.sm,
    },
    seed: {
      letterSpacing: 1,
    },
    recap: {
      fontWeight: '700',
    },
    nearMiss: {
      fontWeight: '700',
    },
    streak: {
      fontWeight: '700',
    },
    stats: {
      gap: spacing.md,
      marginTop: spacing.sm,
    },
    statRow: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
      minHeight: spacing.giant,
    },
    bestRight: {
      alignItems: 'flex-end',
      gap: spacing.xxs,
    },
    bestCaption: {
      color: p.inkFaint,
    },
    recordText: {
      color: p.goldDeep,
    },
    teaser: {
      alignItems: 'center',
      backgroundColor: p.parchment,
      borderRadius: radii.md,
      flexDirection: 'row',
      gap: spacing.md,
      marginTop: spacing.sm,
      padding: spacing.md,
    },
    teaserThumb: { height: 40, tintColor: p.inkFaint, width: 40 },
    teaserThumbBox: {
      backgroundColor: p.inkFaint,
      borderRadius: radii.sm,
      height: 40,
      width: 40,
    },
    teaserText: { flex: 1, gap: spacing.xxs },
    actions: {
      gap: spacing.md,
      marginTop: 'auto',
    },
  };
}

describe('summary.tsx themed styles', () => {
  it('is byte-identical at default prefs (base palette)', () => {
    expect(makeStyles(palette)).toEqual(expected(palette));
  });

  it('threads the palette argument under high contrast (no static leak)', () => {
    expect(makeStyles(highContrastPalette)).toEqual(expected(highContrastPalette));
  });
});
