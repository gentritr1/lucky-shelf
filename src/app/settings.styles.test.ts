import { describe, expect, it } from 'vitest';

import { borders, highContrastPalette, layout, palette, radii, spacing, type Palette } from '@/ui/tokens';

import { makeStyles } from './settings.styles';

/**
 * B-M9 byte-identity proof for the settings sheet. `expected(p)` is an independent
 * transcription of the ORIGINAL static sheet, parametrized by palette. Asserting
 * `makeStyles(p)` equals it for BOTH palettes proves two things at once:
 *  - at the base palette (= default prefs, `resolvePalette(false)`): byte-identical
 *    output — no value drifted during the static→factory migration;
 *  - at the high-contrast palette: every themed prop threads the ARGUMENT (a prop
 *    that leaked to module-scope `palette` would not re-theme and would diverge).
 * `resolvePalette(false) === palette` and `resolvePalette(true) === highContrastPalette`
 * are proven in tokens.test, so the two palettes stand in for the two pref states.
 */
function expected(p: Palette) {
  return {
    screen: {
      backgroundColor: p.wallCream,
      flex: 1,
      gap: spacing.lg,
      paddingHorizontal: layout.screenPadX,
    },
    panels: {
      gap: spacing.lg,
      paddingBottom: spacing.xl,
    },
    row: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: spacing.md,
      justifyContent: 'space-between',
    },
    rowText: {
      flex: 1,
      gap: spacing.xxs,
    },
    segment: {
      borderColor: p.parchmentEdge,
      borderRadius: radii.md,
      borderWidth: borders.hairline,
      flexDirection: 'row',
      overflow: 'hidden',
    },
    segmentCell: {
      alignItems: 'center',
      flex: 1,
      paddingVertical: spacing.sm,
    },
    segmentCellOn: {
      backgroundColor: p.tealDark,
    },
  };
}

describe('settings.tsx themed styles', () => {
  it('is byte-identical at default prefs (base palette)', () => {
    expect(makeStyles(palette)).toEqual(expected(palette));
  });

  it('threads the palette argument under high contrast (no static leak)', () => {
    expect(makeStyles(highContrastPalette)).toEqual(expected(highContrastPalette));
  });
});
