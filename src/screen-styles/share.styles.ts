import { StyleSheet } from 'react-native';

import { layout, radii, shadows, spacing, type Palette } from '@/ui/tokens';

/**
 * Share-card sheet as a B-M9 themed factory. Colors read from the passed
 * `palette`; text color/role moved to the `AppText` call sites. `heroNumber` stays
 * here (and is rendered by a raw <Text>) because it is a bespoke 64px numeral with
 * NO type role / font family — routing it through `AppText` would inject the
 * display face and change its look, so it is a documented raw-<Text> exception.
 * Byte-identical at default prefs.
 */
export function makeStyles(palette: Palette) {
  return StyleSheet.create({
    screen: { backgroundColor: palette.wallCream, flex: 1, paddingHorizontal: layout.screenPadX },
    topBar: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
    back: { width: 72 },
    spacer: { width: 72 },

    cardWrap: { alignItems: 'center', flex: 1, gap: spacing.md, justifyContent: 'center' },
    card: {
      backgroundColor: palette.creamBright,
      borderColor: palette.goldDeep,
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
      backgroundColor: palette.parchment,
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
    variantTabActive: { backgroundColor: palette.creamBright, ...shadows.lifted },

    receiptCard: {
      backgroundColor: palette.creamBright,
      borderColor: palette.goldDeep,
      borderRadius: radii.sm,
      borderWidth: 2,
      gap: spacing.md,
      padding: spacing.xl,
      width: '100%',
      ...shadows.lifted,
    },
    receiptBody: {
      borderColor: palette.parchment,
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
    heroNumber: { color: palette.rentEmber, fontSize: 64, fontWeight: '800', lineHeight: 66 },

    statGrid: { flexDirection: 'row', justifyContent: 'space-between' },
    stat: { alignItems: 'center', flex: 1 },
    statLabel: { fontSize: 10 },

    completionRow: { alignItems: 'center', gap: spacing.xs },
    progressTrack: {
      backgroundColor: palette.parchment,
      borderRadius: radii.pill,
      height: 8,
      overflow: 'hidden',
      width: '100%',
    },
    progressFill: { backgroundColor: palette.accentTeal, borderRadius: radii.pill, height: 8 },
    completionText: { fontSize: 12 },

    streak: { letterSpacing: 1, fontWeight: '700' },
    // Fire icon + streak text as one centered row (ICON-2: chrome emoji retired).
    streakRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.xxs, justifyContent: 'center' },
    tagline: { fontStyle: 'italic', textAlign: 'center' },
    hintRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.xs },
    hintDot: {
      backgroundColor: palette.accentTeal,
      borderRadius: radii.pill,
      height: 6,
      width: 6,
    },
    hint: { fontSize: 13 },

    actions: { gap: spacing.md, marginTop: 'auto' },
  });
}
