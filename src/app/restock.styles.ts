import { StyleSheet } from 'react-native';

import { baloo2IconNudge, layout, radii, shadows, spacing, typeScale, type Palette } from '@/ui/tokens';

/**
 * Restock / Daily-Shop sheet as a B-M9 themed factory. Colors read from the passed
 * `palette`; text color/role for block copy moved to the `AppText` call sites.
 * Entries kept here that still carry text styling are the documented raw-<Text>
 * exceptions: the coin-adjacent digits (`shopBuyText`, `rerollCost`) that need the
 * `baloo2IconNudge` optical alignment beside the coin dot, the bespoke
 * `signatureBadgeText` (no type role / font family), and the emoji/glyph icons.
 * Their colors are still parametrized, so high contrast re-themes them. The
 * unreferenced `offerCol`/`costRibbon`/`costText`/`buy`/`buyText` entries are
 * pre-existing dead styles, transcribed verbatim (out of scope to remove here).
 * Byte-identical at default prefs.
 */
export function makeStyles(palette: Palette) {
  return StyleSheet.create({
    screen: {
      backgroundColor: palette.wallCream,
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
    // Absolute-centered so the title is truly centered regardless of the unequal
    // Menu (left) / coin (right) widths. pointer-transparent so Menu stays tappable.
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
    // Daily shop: a robust vertical list of offer rows (thumb | info | buy).
    shopList: {
      gap: spacing.sm,
    },
    shopRow: {
      alignItems: 'center',
      backgroundColor: palette.creamBright,
      borderColor: palette.parchmentEdge,
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
      backgroundColor: palette.wallCream,
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
      backgroundColor: palette.sunlight,
      borderColor: palette.goldDeep,
      borderWidth: 1.5,
    },
    shopThumbSignature: {
      backgroundColor: palette.creamBright,
      borderColor: palette.goldDeep,
      borderWidth: 1,
    },
    shopNameRow: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: spacing.xs,
    },
    signatureBadge: {
      backgroundColor: palette.goldDeep,
      borderRadius: radii.pill,
      paddingHorizontal: spacing.xs,
      paddingVertical: 1,
    },
    signatureBadgeText: {
      color: palette.woodDark,
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
      backgroundColor: palette.accentTeal,
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
      color: palette.creamBright,
      fontSize: 15,
      lineHeight: 18,
      // Optically center the Baloo2 digit against the coin dot (shared helper).
      ...baloo2IconNudge(15),
    },
    offerCol: {
      flex: 1,
      gap: spacing.sm,
    },
    costRibbon: {
      alignItems: 'center',
      alignSelf: 'center',
      backgroundColor: palette.rentEmber,
      borderRadius: radii.pill,
      flexDirection: 'row',
      gap: spacing.xs,
      paddingHorizontal: spacing.md,
      paddingVertical: 2,
      ...shadows.float,
    },
    costText: {
      ...typeScale.coin,
      color: palette.creamBright,
      fontSize: 14,
      lineHeight: 18,
    },
    coinDot: {
      backgroundColor: palette.coinGold,
      borderColor: palette.goldDeep,
      borderRadius: radii.pill,
      borderWidth: 1.5,
      height: 12,
      width: 12,
    },
    buy: {
      alignItems: 'center',
      backgroundColor: palette.accentTeal,
      borderRadius: radii.md,
      minHeight: 40,
      justifyContent: 'center',
      paddingVertical: spacing.sm,
    },
    buyText: {
      ...typeScale.heading,
      color: palette.creamBright,
      fontSize: 15,
    },
    reroll: {
      backgroundColor: palette.creamBright,
      borderColor: palette.parchmentEdge,
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
      color: palette.tealDark,
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
      backgroundColor: palette.creamBright,
      borderColor: palette.parchmentEdge,
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
      backgroundColor: palette.coinGold,
      borderRadius: radii.pill,
      justifyContent: 'center',
      minWidth: 64,
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
    },
    sellValue: {
      // Block-centered coin label inside a pill (NOT beside a coin dot), so the
      // shared icon nudge does not apply. A small manual lift keeps the Baloo2
      // phrase optically centered in the tight pill; verified on the sim.
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
  });
}
