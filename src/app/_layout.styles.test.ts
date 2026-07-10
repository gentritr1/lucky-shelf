import { describe, expect, it } from 'vitest';

import { highContrastPalette, palette, shadows, type Palette } from '@/ui/tokens';

import { makeStyles } from './_layout.styles';

/**
 * B-M9 byte-identity proof for the root-frame sheet. `expected(p)` is an
 * independent transcription of the original static sheet, parametrized by palette.
 * Base palette = default prefs → byte-identical; high-contrast palette → every
 * themed prop threads the argument (no static leak).
 */
function expected(p: Palette) {
  return {
    root: {
      flex: 1,
    },
    backdrop: {
      alignItems: 'center',
      backgroundColor: p.woodDark,
      flex: 1,
    },
    column: {
      backgroundColor: p.wallCream,
      flex: 1,
      maxWidth: 460,
      overflow: 'hidden',
      width: '100%',
      ...shadows.lifted,
    },
  };
}

describe('_layout.tsx themed styles', () => {
  it('is byte-identical at default prefs (base palette)', () => {
    expect(makeStyles(palette)).toEqual(expected(palette));
  });

  it('threads the palette argument under high contrast (no static leak)', () => {
    expect(makeStyles(highContrastPalette)).toEqual(expected(highContrastPalette));
  });
});
