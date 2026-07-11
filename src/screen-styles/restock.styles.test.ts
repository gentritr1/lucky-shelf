import { describe, expect, it } from 'vitest';

import {
  baloo2IconNudge,
  highContrastPalette,
  layout,
  palette,
  radii,
  shadows,
  spacing,
  typeScale,
  type Palette,
} from '@/ui/tokens';

import { makeStyles } from './restock.styles';

/**
 * B-M9 byte-identity proof for the restock / daily-shop sheet. `expected(p)` is an
 * independent transcription of the original static sheet: text entries whose
 * color/role moved to `AppText` are slimmed to their leftover layout props; the
 * coin-adjacent digits, bespoke badge, glyph icons, and pre-existing dead styles
 * are transcribed in full (parametrized). Base palette = default prefs →
 * byte-identical; high-contrast palette → every themed prop threads the argument.
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
      minHeight: 44,
    },
    titleWrap: {
      alignItems: 'center',
      bottom: 0,
      justifyContent: 'center',
      left: 0,
      position: 'absolute',
      right: 0,
      top: 0,
    },
    modeRow: {
      alignItems: 'center',
      alignSelf: 'center',
      flexDirection: 'row',
      gap: spacing.md,
    },
    body: {
      flex: 1,
      gap: spacing.md,
    },
    offersHeader: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    shopHeaderText: {
      flexShrink: 1,
      gap: 2,
    },
    shopContext: {
      fontSize: 11,
      fontWeight: '600',
    },
    offers: {
      flexDirection: 'row',
      gap: spacing.md,
    },
    shopList: {
      gap: spacing.sm,
    },
    shopRow: {
      alignItems: 'center',
      backgroundColor: p.creamBright,
      borderColor: p.parchmentEdge,
      borderRadius: radii.lg,
      borderWidth: 1,
      flexDirection: 'row',
      gap: spacing.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      ...shadows.card,
    },
    shopThumb: {
      alignItems: 'center',
      backgroundColor: p.wallCream,
      borderRadius: radii.md,
      height: 48,
      justifyContent: 'center',
      width: 48,
    },
    shopThumbImg: {
      height: 44,
      width: 44,
    },
    shopThumbGlyph: {
      fontSize: 28,
    },
    shopInfo: {
      flex: 1,
      gap: spacing.xxs,
    },
    shopName: {
      fontSize: 15,
    },
    shopTags: {
      flexDirection: 'row',
      gap: spacing.xxs,
    },
    shopRowSignature: {
      backgroundColor: p.sunlight,
      borderColor: p.goldDeep,
      borderWidth: 1.5,
    },
    shopThumbSignature: {
      backgroundColor: p.creamBright,
      borderColor: p.goldDeep,
      borderWidth: 1,
    },
    shopNameRow: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: spacing.xs,
    },
    signatureBadge: {
      backgroundColor: p.goldDeep,
      borderRadius: radii.pill,
      paddingHorizontal: spacing.xs,
      paddingVertical: 1,
    },
    signatureBadgeText: {
      color: p.woodDark,
      fontSize: 9,
      fontWeight: '800',
      letterSpacing: 0.4,
    },
    signatureEffect: {
      fontSize: 11,
      fontWeight: '700',
    },
    shopBuy: {
      alignItems: 'center',
      backgroundColor: p.accentTeal,
      borderRadius: radii.pill,
      flexDirection: 'row',
      gap: spacing.xs,
      justifyContent: 'center',
      minWidth: 64,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    shopBuyText: {
      ...typeScale.coin,
      color: p.creamBright,
      fontSize: 15,
      lineHeight: 18,
      ...baloo2IconNudge(15),
    },
    offerCol: {
      flex: 1,
      gap: spacing.sm,
    },
    costRibbon: {
      alignItems: 'center',
      alignSelf: 'center',
      backgroundColor: p.rentEmber,
      borderRadius: radii.pill,
      flexDirection: 'row',
      gap: spacing.xs,
      paddingHorizontal: spacing.md,
      paddingVertical: 2,
      ...shadows.float,
    },
    costText: {
      ...typeScale.coin,
      color: p.creamBright,
      fontSize: 14,
      lineHeight: 18,
    },
    coinDot: {
      backgroundColor: p.coinGold,
      borderColor: p.goldDeep,
      borderRadius: radii.pill,
      borderWidth: 1.5,
      height: 12,
      width: 12,
    },
    buy: {
      alignItems: 'center',
      backgroundColor: p.accentTeal,
      borderRadius: radii.md,
      minHeight: 40,
      justifyContent: 'center',
      paddingVertical: spacing.sm,
    },
    buyText: {
      ...typeScale.heading,
      color: p.creamBright,
      fontSize: 15,
    },
    reroll: {
      backgroundColor: p.creamBright,
      borderColor: p.parchmentEdge,
      borderRadius: radii.pill,
      borderWidth: 1.5,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      ...shadows.float,
    },
    rerollInner: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: spacing.xs,
    },
    rerollText: {
      letterSpacing: 0,
    },
    rerollCost: {
      ...typeScale.coin,
      color: p.tealDark,
      fontSize: 14,
      lineHeight: 16,
      ...baloo2IconNudge(14),
    },
    sellGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.md,
    },
    sellCard: {
      alignItems: 'center',
      backgroundColor: p.creamBright,
      borderColor: p.parchmentEdge,
      borderRadius: radii.lg,
      borderWidth: 1,
      gap: spacing.xxs,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      width: 96,
      ...shadows.card,
    },
    sellGlyph: {
      fontSize: 34,
    },
    sellSprite: {
      borderRadius: radii.sm,
      height: 44,
      width: 44,
    },
    sellName: {
      letterSpacing: 0,
      textTransform: 'none',
    },
    sellTag: {
      alignItems: 'center',
      alignSelf: 'center',
      backgroundColor: p.coinGold,
      borderRadius: radii.pill,
      justifyContent: 'center',
      minWidth: 64,
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
    },
    sellValue: {
      fontSize: 13,
      lineHeight: 16,
      includeFontPadding: false,
      transform: [{ translateY: 1 }],
    },
    caption: {
      textAlign: 'center',
    },
    pressed: {
      transform: [{ scale: 0.97 }],
    },
    faded: {
      opacity: 0.45,
    },
    actions: {
      marginTop: 'auto',
    },
  };
}

describe('restock.tsx themed styles', () => {
  it('is byte-identical at default prefs (base palette)', () => {
    expect(makeStyles(palette)).toEqual(expected(palette));
  });

  it('threads the palette argument under high contrast (no static leak)', () => {
    expect(makeStyles(highContrastPalette)).toEqual(expected(highContrastPalette));
  });
});
