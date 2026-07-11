import { describe, expect, it } from 'vitest';

import { borders, highContrastPalette, layout, palette, radii, spacing, type Palette } from '@/ui/tokens';

import { makeStyles } from './summary.styles';

/**
 * B-M9 palette-threading proof for the run-summary sheet. `expected(p)` is an
 * independent transcription of the SUM-1 restructured sheet, parametrized by
 * palette, so every color-bearing prop must thread the argument (no static color
 * leak) under both the base and high-contrast palettes. This transcription is
 * intentionally re-derived from the SUM-1 layout — the pre-SUM-1 "byte-identical
 * to the original loose stack" baseline no longer applies.
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
      gap: layout.sectionGap,
      justifyContent: 'flex-start',
      paddingVertical: spacing.lg,
    },
    hero: {
      alignItems: 'center',
      gap: spacing.xs,
    },
    heroDay: {
      marginTop: spacing.xxs,
    },
    seed: {
      letterSpacing: 1,
      marginTop: spacing.xs,
    },
    recap: {
      fontWeight: '700',
      marginTop: spacing.sm,
    },
    nearMiss: {
      fontWeight: '700',
      marginTop: spacing.sm,
    },
    streak: {
      fontWeight: '700',
      marginTop: spacing.xs,
    },
    statsCard: {
      gap: spacing.sm,
    },
    statRow: {
      alignItems: 'flex-start',
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    statLabelSlot: {
      flex: 1,
      justifyContent: 'center',
      minHeight: spacing.huge,
      paddingRight: spacing.md,
    },
    statValueCol: {
      alignItems: 'stretch',
    },
    valueSlot: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'flex-end',
      minHeight: spacing.huge,
    },
    captionSlot: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'flex-end',
      minHeight: spacing.lg,
    },
    bestCaption: {
      color: p.inkFaint,
    },
    recordText: {
      color: p.goldDeep,
    },
    teaser: {
      alignItems: 'stretch',
      backgroundColor: p.creamBright,
      borderColor: p.parchmentEdge,
      borderRadius: radii.md,
      borderWidth: borders.hairline,
      flexDirection: 'row',
      overflow: 'hidden',
    },
    teaserAccent: {
      backgroundColor: p.goldDeep,
      width: spacing.xs,
    },
    teaserInner: {
      alignItems: 'center',
      flex: 1,
      flexDirection: 'row',
      gap: spacing.md,
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
