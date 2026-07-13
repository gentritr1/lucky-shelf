import { StyleSheet } from 'react-native';

import { layout, radii, shadows, spacing, typeScale, type Palette } from '@/ui/tokens';

/**
 * Restock / Daily-Shop sheet as a B-M9 themed factory. Colors read from the passed
 * `palette`; text color/role for block copy moved to the `AppText` call sites.
 * Entries kept here that still carry text styling are the documented raw-<Text>
 * exceptions: the coin-adjacent digits (`shopBuyText`, `rerollCost`) on the system
 * `coin` role — TYPO-1 dropped the old `baloo2IconNudge` translateY here, the
 * system face (`fonts.ui`) centers them against the coin dot on its own — the
 * bespoke `signatureBadgeText` (no type role / font family), and the emoji/glyph
 * icons. Their colors are still parametrized, so high contrast re-themes them. The
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
      paddingBottom: spacing.xs,
    },
    shopScroller: {
      flex: 1,
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
      // Matches the info stack's internal gap (spacing.xs) so the tag chips sit
      // centered in their band — equal whitespace above and below (B-M13).
      paddingVertical: spacing.xs,
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
    // Tappable half of an offer row (thumb + info) — the Buy button stays a
    // separate sibling so expanding the rules never fires a purchase (B-M13).
    shopTap: {
      alignItems: 'center',
      flex: 1,
      flexDirection: 'row',
      gap: spacing.md,
    },
    shopInfo: {
      flex: 1,
      // One uniform token for the whole name → rule → tags stack (B-M13 rhythm).
      gap: spacing.xs,
    },
    shopName: {
      flexShrink: 1,
      fontSize: 15,
      // Hug the 15px Baloo2 glyph so its tall default line box (heading's 24)
      // doesn't inflate the gap down to the rule line (B-M13). `fontSize` here
      // already opts this label out of text-scaling, so a fixed lineHeight is
      // consistent (won't clip at 130%).
      lineHeight: 19,
    },
    // Expand/collapse chevron pinned to the right of the name row; flips to point
    // up in the expanded state so the affordance reads.
    shopChevron: {
      marginLeft: 'auto',
    },
    shopChevronOpen: {
      transform: [{ rotate: '180deg' }],
    },
    shopTags: {
      flexDirection: 'row',
      gap: spacing.xxs,
    },
    shopRule: {
      letterSpacing: 0,
    },
    shopRules: {
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
      letterSpacing: 0,
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
      // System-font coin role (TYPO-1): centers against the coin dot, no nudge.
      ...typeScale.coin,
      color: palette.creamBright,
      fontSize: 15,
      lineHeight: 18,
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
      // System-font coin role (TYPO-1): centers against the coin dot, no nudge.
      ...typeScale.coin,
      color: palette.tealDark,
      fontSize: 14,
      lineHeight: 16,
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
      // Block-centered coin label ("Sell +N") inside a pill. TYPO-1: on the system
      // face this centers by flexbox alone — the old Baloo2 translateY lift is gone.
      fontSize: 13,
      lineHeight: 16,
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
