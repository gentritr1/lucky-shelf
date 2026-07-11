import { StyleSheet } from 'react-native';

import { layout, radii, shadows, spacing, type Palette } from '@/ui/tokens';

/**
 * Catalog sheet as a B-M9 themed factory. Colors read from the passed `palette`.
 * Text color + type role now live on the `AppText` call sites; the entries that
 * survive here for text are the PRE-EXISTING sub-role caption sizes (9–13px) kept
 * verbatim for byte-identity. Those fixed caption sizes do not grow with the
 * large-text pref — a pre-existing design choice, out of B-M9's byte-identity
 * scope to normalize. Byte-identical at default prefs.
 */
export function makeStyles(palette: Palette) {
  return StyleSheet.create({
    screen: { backgroundColor: palette.wallCream, flex: 1, paddingHorizontal: layout.screenPadX },
    content: { gap: spacing.md, paddingTop: spacing.md },

    summary: { gap: spacing.md },
    completionRow: { alignItems: 'baseline', flexDirection: 'row', gap: spacing.sm },
    progressTrack: {
      backgroundColor: palette.parchment,
      borderRadius: radii.pill,
      height: 10,
      overflow: 'hidden',
    },
    progressFill: { backgroundColor: palette.accentTeal, borderRadius: radii.pill, height: 10 },
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
    // A found item is "owned": warmer gold-touched edge + a soft lifted shadow so
    // discovered cards read as collected trophies, distinct from the flat locked
    // bed. (CAT-1 — was parchmentEdge + shadows.float.)
    stampFound: {
      backgroundColor: palette.creamBright,
      borderColor: palette.goldDeep,
      ...shadows.card,
    },
    // Locked/undiscovered bed. Raised from 0.7 → 0.85 so it reads "worth getting"
    // rather than "denied" (CAT-1).
    stampLocked: { backgroundColor: palette.parchment, borderColor: palette.parchmentEdge, opacity: 0.85 },
    // the art sits on a soft mat with breathing room, framed like a collectible
    stampArt: {
      alignItems: 'center',
      aspectRatio: 1,
      backgroundColor: palette.wallCream,
      borderRadius: radii.sm,
      justifyContent: 'center',
      padding: spacing.sm,
      width: '100%',
    },
    stampSprite: { height: '100%', width: '100%' },
    // Undiscovered "?" mat — warm parchment with an inset edge, so a mystery card
    // reads as a covered collectible on paper (an invitation), not a flat dark
    // hole. The embossed "?" sits carved into the paper (color set at the call
    // site). CAT-1 — was a flat woodInset box.
    stampMystery: {
      alignItems: 'center',
      aspectRatio: 1,
      backgroundColor: palette.parchment,
      borderColor: palette.parchmentEdge,
      borderRadius: radii.sm,
      borderWidth: 1.5,
      justifyContent: 'center',
      width: '100%',
    },
    stampName: { fontSize: 9, letterSpacing: 0, textAlign: 'center' },
    // sprite tinted to a flat dark shape — the "shadowed collectible" look, no new art
    silhouette: { tintColor: palette.inkFaint },
    // fallback silhouette for ladder items that have no sprite yet
    stampSilhouetteBox: {
      aspectRatio: 1,
      backgroundColor: palette.inkFaint,
      borderRadius: radii.sm,
      width: '100%',
    },
    stampLockHint: {
      fontSize: 9,
      letterSpacing: 0,
      textAlign: 'center',
    },
    // CAT-1 progress tick for a runs-gated locked item: a tiny bar + "4/5" so the
    // card shows how close the unlock is.
    stampProgress: { alignItems: 'center', gap: spacing.xxs, width: '100%' },
    stampProgressTrack: {
      backgroundColor: palette.parchmentEdge,
      borderRadius: radii.pill,
      height: 4,
      overflow: 'hidden',
      width: '100%',
    },
    stampProgressFill: { backgroundColor: palette.goldDeep, borderRadius: radii.pill, height: 4 },
    stampProgressText: { fontSize: 9, letterSpacing: 0 },
    // CAT-1 reveal: a gold ring that pulses out once when a NEW card first shows.
    // Absolutely fills the card; scale+opacity are animated (uniform scale only).
    revealRing: {
      borderColor: palette.goldDeep,
      borderRadius: radii.md,
      borderWidth: 2,
      bottom: 0,
      left: 0,
      position: 'absolute',
      right: 0,
      top: 0,
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
    comboFound: { backgroundColor: palette.creamBright, borderColor: palette.goldDeep },
    comboLocked: { backgroundColor: palette.parchment, borderColor: palette.parchmentEdge, opacity: 0.7 },
    // B-M11 "new" accent: a stronger gold stamp edge + a small badge.
    comboNew: { borderColor: palette.goldDeep, borderWidth: 2 },
    newBadge: {
      backgroundColor: palette.goldDeep,
      borderRadius: radii.pill,
      paddingHorizontal: spacing.xs,
      paddingVertical: 1,
    },
    newBadgeText: { fontSize: 9, letterSpacing: 0.4 },
    comboText: { flex: 1 },
    comboName: { fontSize: 15 },
    comboCount: { fontSize: 13, fontWeight: '700' },
    comboHint: { fontSize: 12 },
  });
}
