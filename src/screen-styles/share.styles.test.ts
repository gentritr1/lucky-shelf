import { describe, expect, it } from 'vitest';

import { highContrastPalette, layout, palette, radii, shadows, spacing, type Palette } from '@/ui/tokens';

import { makeStyles } from './share.styles';

/**
 * B-M9 byte-identity proof for the share-card sheet. `expected(p)` is an
 * independent transcription of the original static sheet minus the text
 * color/role that moved to `AppText` (the fixed caption sizes + `heroNumber`
 * stay). Base palette = default prefs → byte-identical; high-contrast palette →
 * themed props thread the argument.
 */
function expected(p: Palette) {
  return {
    screen: { backgroundColor: p.wallCream, flex: 1, paddingHorizontal: layout.screenPadX },
    topBar: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
    back: { width: 72 },
    spacer: { width: 72 },

    cardWrap: { alignItems: 'center', flex: 1, gap: spacing.md, justifyContent: 'center' },
    card: {
      backgroundColor: p.creamBright,
      borderColor: p.goldDeep,
      borderRadius: radii.lg,
      borderWidth: 2,
      gap: spacing.lg,
      padding: spacing.xl,
      width: '100%',
      ...shadows.lifted,
    },
    cardHeader: { alignItems: 'center', gap: spacing.xxs },
    brand: { letterSpacing: 1 },
    seed: { letterSpacing: 1 },

    variantToggle: {
      backgroundColor: p.parchment,
      borderRadius: radii.pill,
      flexDirection: 'row',
      gap: spacing.xxs,
      padding: spacing.xxs,
    },
    variantTab: {
      borderRadius: radii.pill,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.xs,
    },
    variantTabActive: { backgroundColor: p.creamBright, ...shadows.lifted },

    receiptCard: {
      backgroundColor: p.creamBright,
      borderColor: p.goldDeep,
      borderRadius: radii.sm,
      borderWidth: 2,
      gap: spacing.md,
      padding: spacing.xl,
      width: '100%',
      ...shadows.lifted,
    },
    receiptBody: {
      borderColor: p.parchment,
      borderTopWidth: 1,
      borderBottomWidth: 1,
      paddingVertical: spacing.md,
    },
    receiptTotal: { fontWeight: '700' },
    receiptCaption: {
      fontSize: 12,
      fontStyle: 'italic',
      textAlign: 'center',
    },

    hero: { alignItems: 'center', flexDirection: 'row', gap: spacing.lg, justifyContent: 'center' },
    heroCat: { height: 96, width: 96 },
    heroText: { alignItems: 'flex-start' },
    heroNumber: { color: p.rentEmber, fontSize: 64, fontWeight: '800', lineHeight: 66 },

    statGrid: { flexDirection: 'row', justifyContent: 'space-between' },
    stat: { alignItems: 'center', flex: 1 },
    statLabel: { fontSize: 10 },

    completionRow: { alignItems: 'center', gap: spacing.xs },
    progressTrack: {
      backgroundColor: p.parchment,
      borderRadius: radii.pill,
      height: 8,
      overflow: 'hidden',
      width: '100%',
    },
    progressFill: { backgroundColor: p.accentTeal, borderRadius: radii.pill, height: 8 },
    completionText: { fontSize: 12 },

    streak: { letterSpacing: 1, fontWeight: '700' },
    streakRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.xxs, justifyContent: 'center' },
    tagline: { fontStyle: 'italic', textAlign: 'center' },
    hintRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.xs },
    hintDot: {
      backgroundColor: p.accentTeal,
      borderRadius: radii.pill,
      height: 6,
      width: 6,
    },
    hint: { fontSize: 13 },

    actions: { gap: spacing.md, marginTop: 'auto' },
  };
}

describe('share.tsx themed styles', () => {
  it('is byte-identical at default prefs (base palette)', () => {
    expect(makeStyles(palette)).toEqual(expected(palette));
  });

  it('threads the palette argument under high contrast (no static leak)', () => {
    expect(makeStyles(highContrastPalette)).toEqual(expected(highContrastPalette));
  });
});
