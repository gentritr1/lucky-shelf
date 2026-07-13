import { StyleSheet } from 'react-native';

import { layout, radii, spacing, type Palette } from '@/ui/tokens';

/**
 * Run HUD sheet as a B-M9 themed factory (the last screen migrated — it was the
 * human-WIP exception during the sweep). Colors read from the passed `palette`;
 * text color/role for block copy moved to the `AppText` call sites, so entries
 * that still carry text styling are only the leftover size/weight pins (the
 * pre-existing sub-role sizes, preserved byte-identically). The build-hero glyph
 * is now a MaterialCommunityIcons node (ICON-2) sized/colored via props, so the
 * former `buildEmoji` text style is gone. Byte-identical at default prefs.
 */
export function makeStyles(palette: Palette) {
  return StyleSheet.create({
    screen: {
      backgroundColor: palette.wallCream,
      flex: 1,
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      // flexGrow so the column fills the screen (shelf stays centered via shelfWrap
      // flex) when it fits; when the softlock sell-list makes it overflow, it grows
      // past the viewport and scrolls instead of spilling over the panels above.
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
      // Absolute-centered across the full bar so the title is truly centered on the
      // device, independent of the unequal Menu (left) and coin (right) widths.
      // pointerEvents none keeps the Menu tap target underneath live.
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
      backgroundColor: palette.scrim,
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
    // B-M13: rent context rendered inside the cascade overlay (the HUD status row
    // is hidden while scoring). Centered so the pill reads as a header above the
    // cascade rather than a stray left-aligned chip.
    cascadeRentLine: {
      alignItems: 'center',
    },
    hint: {
      fontSize: 13,
      textAlign: 'center',
    },
    inspector: {
      alignSelf: 'stretch',
      backgroundColor: palette.creamBright,
      borderColor: palette.parchmentEdge,
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
      backgroundColor: palette.parchment,
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
      backgroundColor: palette.creamBright,
      borderColor: palette.rentEmber,
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
      backgroundColor: palette.parchment,
      borderColor: palette.parchmentEdge,
      borderRadius: radii.lg,
      borderWidth: 1.5,
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    buildCardActive: {
      backgroundColor: palette.sunlight,
      borderColor: palette.goldDeep,
    },
    buildHero: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: spacing.sm,
    },
    buildEmojiTile: {
      alignItems: 'center',
      backgroundColor: palette.creamBright,
      borderColor: palette.parchmentEdge,
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
      // fontSize is bumped above the `label` variant's 12 → the variant's
      // lineHeight of 16 would clip these caps, so pin a roomy one here.
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
      backgroundColor: palette.creamBright,
      borderColor: palette.parchmentEdge,
      borderRadius: radii.md,
      borderWidth: 1.5,
      justifyContent: 'center',
      minWidth: 58,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
    },
    buildMultActive: {
      backgroundColor: palette.creamBright,
      borderColor: palette.goldDeep,
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
      backgroundColor: palette.creamBright,
      borderColor: palette.parchmentEdge,
      borderRadius: radii.md,
      borderWidth: 1,
      flexDirection: 'row',
      gap: spacing.xs,
      justifyContent: 'space-between',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
    },
    goalChipMet: {
      backgroundColor: palette.slotLegal,
      borderColor: palette.tealDark,
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
  });
}
