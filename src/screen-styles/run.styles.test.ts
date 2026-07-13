import { describe, expect, it } from 'vitest';

import { highContrastPalette, layout, palette, radii, spacing, type Palette } from '@/ui/tokens';

import { makeStyles } from './run.styles';

/**
 * B-M9 byte-identity proof for the run HUD sheet (the last screen migrated).
 * `expected(p)` is an independent transcription of the original static sheet:
 * text entries whose color/role moved to `AppText` are slimmed to their leftover
 * size/weight pins (`back`/`eyebrow`/`phase` hoisted entirely and dropped;
 * `buildMultTextActive`/`goalChipValueMet` became conditional `color` props). The
 * build-hero glyph moved from a raw <Text> emoji to a MaterialCommunityIcons node
 * (ICON-2), so the former `buildEmoji` text style is gone from both sheet and
 * transcription. Base palette = default prefs → byte-identical; high-contrast
 * palette → every themed prop threads the argument (no static leak).
 */
function expected(p: Palette) {
  return {
    screen: {
      backgroundColor: p.wallCream,
      flex: 1,
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
      gap: spacing.lg,
      paddingHorizontal: layout.screenPadX,
    },
    topBar: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
      minHeight: 44,
    },
    dayWrap: {
      alignItems: 'center',
      bottom: 0,
      justifyContent: 'center',
      left: 0,
      pointerEvents: 'none',
      position: 'absolute',
      right: 0,
      top: 0,
    },
    statusRow: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    shelfWrap: {
      flex: 1,
      gap: spacing.md,
      justifyContent: 'center',
    },
    cascadeOverlay: {
      backgroundColor: p.scrim,
      bottom: 0,
      gap: spacing.md,
      justifyContent: 'center',
      left: 0,
      paddingHorizontal: layout.screenPadX,
      position: 'absolute',
      right: 0,
      top: 0,
      zIndex: 10,
    },
    hint: {
      fontSize: 13,
      textAlign: 'center',
    },
    inspector: {
      alignSelf: 'stretch',
      backgroundColor: p.creamBright,
      borderColor: p.parchmentEdge,
      borderRadius: radii.md,
      borderWidth: 1.5,
      gap: spacing.sm,
      padding: spacing.md,
    },
    inspectorHeader: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: spacing.sm,
      justifyContent: 'space-between',
    },
    inspectorTitleWrap: {
      flex: 1,
      gap: 2,
    },
    inspectorClose: {
      alignItems: 'center',
      backgroundColor: p.parchment,
      borderRadius: radii.pill,
      height: 44,
      justifyContent: 'center',
      width: 44,
    },
    inspectorClosePressed: {
      opacity: 0.72,
    },
    inspectorRules: {
      gap: spacing.xs,
    },
    inspectorHint: {
      letterSpacing: 0.2,
    },
    sellRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.xs,
      justifyContent: 'center',
      marginTop: spacing.xs,
    },
    sellChip: {
      alignItems: 'center',
      backgroundColor: p.creamBright,
      borderColor: p.rentEmber,
      borderRadius: radii.md,
      borderWidth: 1,
      flexDirection: 'row',
      gap: spacing.xs,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xxs,
    },
    sellChipPressed: {
      opacity: 0.7,
    },
    sellChipName: {
      fontSize: 11,
      fontWeight: '700',
      maxWidth: 100,
    },
    sellChipPrice: {
      fontSize: 11,
      fontWeight: '800',
    },
    actions: {
      marginTop: 'auto',
    },
    buildCard: {
      alignSelf: 'stretch',
      backgroundColor: p.parchment,
      borderColor: p.parchmentEdge,
      borderRadius: radii.lg,
      borderWidth: 1.5,
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    buildCardActive: {
      backgroundColor: p.sunlight,
      borderColor: p.goldDeep,
    },
    buildHero: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: spacing.sm,
    },
    buildEmojiTile: {
      alignItems: 'center',
      backgroundColor: p.creamBright,
      borderColor: p.parchmentEdge,
      borderRadius: radii.md,
      borderWidth: 1.5,
      height: 44,
      justifyContent: 'center',
      width: 44,
    },
    buildHeroText: {
      flex: 1,
      gap: 2,
    },
    buildTitle: {
      fontSize: 16,
      fontWeight: '800',
      letterSpacing: 0.7,
      lineHeight: 21,
    },
    buildSub: {
      fontSize: 11,
      fontWeight: '600',
    },
    buildMult: {
      alignItems: 'center',
      backgroundColor: p.creamBright,
      borderColor: p.parchmentEdge,
      borderRadius: radii.md,
      borderWidth: 1.5,
      justifyContent: 'center',
      minWidth: 58,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
    },
    buildMultActive: {
      backgroundColor: p.creamBright,
      borderColor: p.goldDeep,
    },
    buildMultText: {
      fontSize: 22,
      fontWeight: '800',
    },
    goalRow: {
      flexDirection: 'column',
      gap: spacing.xs,
    },
    goalChip: {
      alignItems: 'center',
      backgroundColor: p.creamBright,
      borderColor: p.parchmentEdge,
      borderRadius: radii.md,
      borderWidth: 1,
      flexDirection: 'row',
      gap: spacing.xs,
      justifyContent: 'space-between',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
    },
    goalChipMet: {
      backgroundColor: p.slotLegal,
      borderColor: p.tealDark,
    },
    goalChipLabelRow: {
      alignItems: 'center',
      flexDirection: 'row',
      flexShrink: 1,
      gap: spacing.xxs,
    },
    goalChipLabel: {
      flexShrink: 1,
      fontSize: 11,
      fontWeight: '700',
    },
    goalChipValue: {
      fontSize: 11,
      fontWeight: '700',
    },
  };
}

describe('run.tsx themed styles', () => {
  it('is byte-identical at default prefs (base palette)', () => {
    expect(makeStyles(palette)).toEqual(expected(palette));
  });

  it('threads the palette argument under high contrast (no static leak)', () => {
    expect(makeStyles(highContrastPalette)).toEqual(expected(highContrastPalette));
  });
});
