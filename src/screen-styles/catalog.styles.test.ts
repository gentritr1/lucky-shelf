import { describe, expect, it } from 'vitest';

import { highContrastPalette, layout, palette, radii, shadows, spacing, type Palette } from '@/ui/tokens';

import { makeStyles } from './catalog.styles';

/**
 * B-M9 byte-identity proof for the catalog sheet. `expected(p)` is an independent
 * transcription of the original static sheet minus the text color/role that moved
 * to `AppText` (the fixed caption sizes stay). Base palette = default prefs →
 * byte-identical; high-contrast palette → every themed prop threads the argument.
 */
function expected(p: Palette) {
  return {
    screen: { backgroundColor: p.wallCream, flex: 1, paddingHorizontal: layout.screenPadX },
    content: { gap: spacing.md, paddingTop: spacing.md },

    summary: { gap: spacing.md },
    completionRow: { alignItems: 'baseline', flexDirection: 'row', gap: spacing.sm },
    progressTrack: {
      backgroundColor: p.parchment,
      borderRadius: radii.pill,
      height: 10,
      overflow: 'hidden',
    },
    progressFill: { backgroundColor: p.accentTeal, borderRadius: radii.pill, height: 10 },
    statsGrid: { flexDirection: 'row', justifyContent: 'space-between' },
    stat: { alignItems: 'center', flex: 1 },
    statLabel: { fontSize: 10 },

    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    stamp: {
      alignItems: 'center',
      borderRadius: radii.md,
      borderWidth: 1,
      gap: spacing.xxs,
      padding: spacing.xs,
      width: '22%',
    },
    stampFound: {
      backgroundColor: p.creamBright,
      borderColor: p.parchmentEdge,
      ...shadows.float,
    },
    stampLocked: { backgroundColor: p.parchment, borderColor: p.parchmentEdge, opacity: 0.7 },
    stampArt: {
      alignItems: 'center',
      aspectRatio: 1,
      backgroundColor: p.wallCream,
      borderRadius: radii.sm,
      justifyContent: 'center',
      padding: spacing.sm,
      width: '100%',
    },
    stampSprite: { height: '100%', width: '100%' },
    stampMystery: {
      alignItems: 'center',
      aspectRatio: 1,
      backgroundColor: p.woodInset,
      borderRadius: radii.sm,
      justifyContent: 'center',
      width: '100%',
    },
    stampName: { fontSize: 9, letterSpacing: 0, textAlign: 'center' },
    silhouette: { tintColor: p.inkFaint },
    stampSilhouetteBox: {
      aspectRatio: 1,
      backgroundColor: p.inkFaint,
      borderRadius: radii.sm,
      width: '100%',
    },
    stampLockHint: {
      fontSize: 9,
      letterSpacing: 0,
      textAlign: 'center',
    },

    comboList: { gap: spacing.sm },
    combo: {
      alignItems: 'center',
      borderRadius: radii.md,
      borderWidth: 1,
      flexDirection: 'row',
      gap: spacing.md,
      padding: spacing.md,
    },
    comboFound: { backgroundColor: p.creamBright, borderColor: p.goldDeep },
    comboLocked: { backgroundColor: p.parchment, borderColor: p.parchmentEdge, opacity: 0.7 },
    comboNew: { borderColor: p.goldDeep, borderWidth: 2 },
    newBadge: {
      backgroundColor: p.goldDeep,
      borderRadius: radii.pill,
      paddingHorizontal: spacing.xs,
      paddingVertical: 1,
    },
    newBadgeText: { fontSize: 9, letterSpacing: 0.4 },
    comboText: { flex: 1 },
    comboName: { fontSize: 15 },
    comboCount: { fontSize: 13, fontWeight: '700' },
    comboHint: { fontSize: 12 },
  };
}

describe('catalog.tsx themed styles', () => {
  it('is byte-identical at default prefs (base palette)', () => {
    expect(makeStyles(palette)).toEqual(expected(palette));
  });

  it('threads the palette argument under high contrast (no static leak)', () => {
    expect(makeStyles(highContrastPalette)).toEqual(expected(highContrastPalette));
  });
});
