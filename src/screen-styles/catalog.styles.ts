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
    stampFound: {
      backgroundColor: palette.creamBright,
      borderColor: palette.parchmentEdge,
      ...shadows.float,
    },
    stampLocked: { backgroundColor: palette.parchment, borderColor: palette.parchmentEdge, opacity: 0.7 },
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
    stampMystery: {
      alignItems: 'center',
      aspectRatio: 1,
      backgroundColor: palette.woodInset,
      borderRadius: radii.sm,
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
