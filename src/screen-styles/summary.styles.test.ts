import { describe, expect, it } from 'vitest';

import { borders, highContrastPalette, layout, palette, radii, shadows, spacing, type Palette } from '@/ui/tokens';

import { DECKLE_HEIGHT, DECKLE_TOOTH, makeStyles } from './summary.styles';

/**
 * B-M9 palette-threading proof for the run-summary sheet, re-derived for the
 * B-M13 "Receipt Ledger" restyle: a paper receipt card (rounded top, serrated
 * deckle bottom), an outcome block, ledger rows with a rule leader, and a sign-off.
 * `expected(p)` is an independent transcription parametrized by palette so every
 * color-bearing prop must thread the argument (no static color leak) under both
 * the base and high-contrast palettes.
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
      gap: spacing.sm,
      justifyContent: 'flex-start',
      paddingVertical: spacing.xs,
    },
    receiptOuter: {
      alignSelf: 'stretch',
    },
    receiptPaper: {
      backgroundColor: p.creamBright,
      borderTopLeftRadius: radii.lg,
      borderTopRightRadius: radii.lg,
      gap: spacing.xs,
      paddingBottom: spacing.sm,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      ...shadows.card,
    },
    deckleRow: {
      flexDirection: 'row',
      overflow: 'hidden',
    },
    deckleTooth: {
      borderLeftColor: 'transparent',
      borderLeftWidth: DECKLE_TOOTH / 2,
      borderRightColor: 'transparent',
      borderRightWidth: DECKLE_TOOTH / 2,
      borderTopColor: p.creamBright,
      borderTopWidth: DECKLE_HEIGHT,
      height: 0,
      width: 0,
    },
    receiptHeader: {
      alignItems: 'center',
      gap: spacing.xxs,
    },
    receiptStore: {
      letterSpacing: 1.5,
    },
    receiptThanks: {
      fontStyle: 'italic',
      letterSpacing: 0.3,
    },
    outcome: {
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
    recapRow: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: spacing.xs,
      justifyContent: 'center',
      marginTop: spacing.sm,
    },
    recap: {
      fontWeight: '700',
    },
    nearMiss: {
      fontWeight: '700',
      marginTop: spacing.sm,
    },
    streakRow: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: spacing.xs,
      justifyContent: 'center',
      marginTop: spacing.xs,
    },
    streak: {
      fontWeight: '700',
    },
    receiptRule: {
      alignSelf: 'stretch',
      borderBottomColor: p.parchmentEdge,
      borderBottomWidth: borders.hairline,
      marginVertical: spacing.xs,
    },
    ledger: {
      gap: spacing.xs,
    },
    statRow: {
      gap: spacing.xxs,
    },
    ledgerLine: {
      alignItems: 'flex-end',
      flexDirection: 'row',
      gap: spacing.sm,
    },
    leader: {
      borderBottomColor: p.parchmentEdge,
      borderBottomWidth: borders.hairline,
      flex: 1,
      marginBottom: spacing.xs,
    },
    valueSlot: {
      alignItems: 'center',
      flexDirection: 'row',
    },
    captionSlot: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'flex-end',
      minHeight: spacing.md,
    },
    bestCaption: {
      color: p.inkFaint,
      letterSpacing: 1,
    },
    recordRow: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: spacing.xxs,
    },
    recordText: {
      color: p.goldDeep,
    },
    signoff: {
      fontStyle: 'italic',
      marginTop: spacing.sm,
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
    teaserInner: {
      alignItems: 'center',
      flex: 1,
      flexDirection: 'row',
      gap: spacing.md,
      padding: spacing.md,
    },
    teaserThumbCircle: {
      alignItems: 'center',
      backgroundColor: p.parchment,
      borderColor: p.parchmentEdge,
      borderRadius: radii.pill,
      borderWidth: borders.hairline,
      height: 48,
      justifyContent: 'center',
      width: 48,
    },
    teaserThumb: { height: 32, tintColor: p.inkFaint, width: 32 },
    teaserThumbDot: {
      backgroundColor: p.inkFaint,
      borderRadius: radii.pill,
      height: 28,
      width: 28,
    },
    teaserText: { flex: 1, gap: spacing.xxs },
    actions: {
      gap: spacing.md,
      marginTop: 'auto',
    },
    actionRow: {
      flexDirection: 'row',
      gap: spacing.md,
    },
    actionHalf: {
      flex: 1,
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

  // B-M13: the deckle teeth must be paper-colored (so the serration reads as the
  // paper's torn edge) and re-theme in high contrast.
  it('deckle teeth are paper-colored in both palettes', () => {
    expect(makeStyles(palette).deckleTooth.borderTopColor).toBe(palette.creamBright);
    expect(makeStyles(highContrastPalette).deckleTooth.borderTopColor).toBe(highContrastPalette.creamBright);
  });
});
