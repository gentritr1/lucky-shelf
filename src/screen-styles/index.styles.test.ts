import { describe, expect, it } from 'vitest';

import { highContrastPalette, layout, palette, radii, shadows, spacing, type Palette } from '@/ui/tokens';

import { makeStyles } from './index.styles';

/**
 * B-M9 byte-identity proof for the title-screen sheet. `expected(p)` is an
 * independent transcription of the original static sheet, parametrized by palette.
 * Base palette = default prefs → byte-identical; high-contrast palette → every
 * themed prop threads the argument (a leak to module `palette` would diverge).
 */
function expected(p: Palette) {
  return {
    screen: {
      backgroundColor: p.wallCream,
      flex: 1,
      justifyContent: 'space-between',
      paddingHorizontal: layout.screenPadX,
    },
    gear: {
      alignItems: 'center',
      backgroundColor: p.plate,
      borderRadius: radii.pill,
      height: 44,
      justifyContent: 'center',
      position: 'absolute',
      right: spacing.xl,
      width: 44,
      zIndex: 10,
      ...shadows.card,
    },
    scrim: {
      backgroundColor: p.wallCream,
      bottom: 0,
      left: 0,
      opacity: 0.18,
      position: 'absolute',
      right: 0,
      top: 0,
    },
    scene: {
      alignItems: 'center',
      flex: 1,
      justifyContent: 'center',
      gap: spacing.lg,
    },
    catImg: {
      height: 168,
      width: 168,
    },
    titlePlate: {
      alignItems: 'center',
      backgroundColor: p.plate,
      borderRadius: radii.lg,
      gap: spacing.xxs,
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.md,
      transform: [{ translateX: spacing.md }],
      ...shadows.card,
    },
    title: {
      fontSize: 44,
      lineHeight: 60,
    },
    actions: {
      gap: spacing.md,
    },
    runNotice: {
      backgroundColor: p.plate,
      borderRadius: radii.md,
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
    },
    secondaryRow: {
      flexDirection: 'row',
      gap: spacing.md,
    },
    grow: {
      flex: 1,
    },
    helpLink: {
      alignItems: 'center',
      alignSelf: 'center',
      backgroundColor: p.plate,
      borderRadius: radii.pill,
      minHeight: 44,
      justifyContent: 'center',
      paddingHorizontal: spacing.lg,
    },
  };
}

describe('index.tsx themed styles', () => {
  it('is byte-identical at default prefs (base palette)', () => {
    expect(makeStyles(palette)).toEqual(expected(palette));
  });

  it('threads the palette argument under high contrast (no static leak)', () => {
    expect(makeStyles(highContrastPalette)).toEqual(expected(highContrastPalette));
  });
});
