import { StyleSheet } from 'react-native';

import { borders, layout, radii, shadows, spacing, type Palette } from '@/ui/tokens';

/**
 * Catalog sheet as a B-M9 themed factory. Colors read from the passed `palette`.
 * Text color + type role live on the `AppText` call sites; the entries that
 * survive here for text are sub-role caption sizes (9–13px) kept verbatim.
 *
 * B-M15 "Collector's Journal": the completion header became a handcrafted paper
 * journal card (stitched gold edge, hand-titled masthead, big completion %, a
 * PASSIVE milestone dot-scale, a combos wax-seal, the NEXT MILESTONE teaser, and
 * the four best-run stats as receipt-leader lines). The ITEMS/COMBOS segmented
 * control + rarity legend chips were replaced by a strip of serrated postage-stamp
 * tabs (the deckle-tooth technique from the run summary). The album grid, showcase
 * modal, and combo trophy shelf keep their structure — only surfaces that clashed
 * with the paper journal were reskinned. Themed factory: every color threads
 * `palette`, so high contrast re-themes without a per-component fork.
 */
export function makeStyles(palette: Palette) {
  return StyleSheet.create({
    screen: { backgroundColor: palette.wallCream, flex: 1, paddingHorizontal: layout.screenPadX },

    // B-M14 gallery entry card (flag-gated; not rendered when the flag is off).
    // Journal-native already (creamBright bed, gold edge, parchment icon well);
    // kept as-is so the flag-off catalog stays byte-identical and B-M14's gating
    // is untouched.
    galleryEntry: {
      alignItems: 'center',
      backgroundColor: palette.creamBright,
      borderColor: palette.goldDeep,
      borderRadius: radii.md,
      borderWidth: borders.hairline,
      flexDirection: 'row',
      gap: spacing.md,
      paddingHorizontal: layout.cardPad,
      paddingVertical: spacing.md,
      ...shadows.card,
    },
    galleryEntryPressed: { opacity: 0.9 },
    galleryEntryIcon: {
      alignItems: 'center',
      backgroundColor: palette.parchment,
      borderRadius: radii.sm,
      height: 40,
      justifyContent: 'center',
      width: 40,
    },
    galleryEntryText: { flex: 1, gap: spacing.xxs },

    content: { gap: spacing.md, paddingTop: spacing.md },

    // ── B-M15 Collector's Journal header card ──────────────────────────────
    // A handcrafted paper page: creamBright bed, a gold frame + an inset hairline
    // "stitch" for the hand-bound edge. B-M16 decram (human REQUEST CHANGES):
    // the card carries ONLY the masthead, the big completion %, the discovered
    // count, and the NEXT MILESTONE row — generous spacing.md air between groups.
    // The dot-scale was removed, the wax seal retired (the COMBOS stamp carries
    // that coverage), and the best-run stats moved to the statsStrip ledger below
    // the stamps row. Grows/scrolls with 130% text.
    journalCard: {
      backgroundColor: palette.creamBright,
      borderColor: palette.goldDeep,
      borderRadius: radii.lg,
      borderWidth: borders.regular,
      gap: spacing.md,
      overflow: 'hidden',
      padding: layout.cardPad,
      ...shadows.card,
    },
    // The inset hairline that reads as a hand-bound journal stitch.
    journalStitch: {
      borderColor: `${palette.goldDeep}66`,
      borderRadius: radii.md,
      borderWidth: 1,
      bottom: spacing.xs,
      left: spacing.xs,
      position: 'absolute',
      right: spacing.xs,
      top: spacing.xs,
    },
    // The accessible headline block (masthead + head row) breathes internally too.
    journalHead: { gap: spacing.md },
    // Masthead: a clover mark + the hand-titled name (Baloo2 italic at the site).
    journalMast: { alignItems: 'center', flexDirection: 'row', gap: spacing.xs },
    journalTitle: { fontStyle: 'italic', letterSpacing: 0.3 },
    // Headline row: big % + caption on the left, discovered count on the right.
    journalHeadRow: {
      alignItems: 'flex-end',
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: spacing.sm,
    },
    completionBlock: { alignItems: 'baseline', flexDirection: 'row', gap: spacing.xs },
    completionCaption: { marginBottom: spacing.xxs },
    discoveredCount: { alignItems: 'flex-end', flexShrink: 1, gap: spacing.xxs },

    // NEXT MILESTONE teaser: an inset parchment strip — a silhouette thumb + the
    // real unlock hint (nextUnlockTeaserView) + a runs progress tick, or the
    // nearest incomplete band as a fallback. B-M16: stands alone in the card
    // (the wax seal that used to sit beside it was retired), so no flex:1.
    nextStrip: {
      alignItems: 'center',
      backgroundColor: palette.parchment,
      borderColor: palette.parchmentEdge,
      borderRadius: radii.md,
      borderWidth: borders.hairline,
      flexDirection: 'row',
      gap: spacing.sm,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
    },
    nextThumbCircle: {
      alignItems: 'center',
      backgroundColor: palette.wallCream,
      borderColor: palette.parchmentEdge,
      borderRadius: radii.pill,
      borderWidth: borders.hairline,
      height: 36,
      justifyContent: 'center',
      width: 36,
    },
    nextThumb: { height: 26, width: 26 },
    nextThumbDot: { backgroundColor: palette.inkFaint, borderRadius: radii.pill, height: 20, width: 20 },
    nextText: { flex: 1, gap: spacing.xxs },
    nextTick: { alignItems: 'flex-end', gap: spacing.xxs, width: 52 },
    nextTickTrack: {
      backgroundColor: palette.parchmentEdge,
      borderRadius: radii.pill,
      height: 4,
      overflow: 'hidden',
      width: '100%',
    },
    nextTickFill: { backgroundColor: palette.accentTeal, borderRadius: radii.pill, height: 4 },
    nextTickText: { fontSize: 12, letterSpacing: 0 },

    // B-M16: the four best-run stats as a quiet ledger strip BELOW the stamps
    // row (relocated out of the hero card). Parchment bed like nextStrip so it
    // reads secondary; cells wrap two-per-row at 130% (statsStripCellWide).
    statsStrip: {
      backgroundColor: palette.parchment,
      borderColor: palette.parchmentEdge,
      borderRadius: radii.md,
      borderWidth: borders.hairline,
      flexDirection: 'row',
      flexWrap: 'wrap',
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
    },
    statsStripCell: { alignItems: 'center', gap: spacing.xxs, paddingVertical: spacing.xxs, width: '25%' },
    statsStripCellWide: { alignItems: 'center', gap: spacing.xxs, paddingVertical: spacing.xxs, width: '50%' },
    statsStripLabel: { fontSize: 8, letterSpacing: 0.4, textAlign: 'center' },

    // ── B-M15 rarity postage-stamp tabs ────────────────────────────────────
    // A stamp-album strip (horizontal scroll so it never crushes at 130%): one
    // serrated postage stamp per rarity + a combos stamp. The stamps ARE the tab
    // control — pressing one shows that page (a rarity's album grid, or the combo
    // trophy shelf). The selected stamp is "inked": a pastel wash, a heavier gold
    // frame, a lifted shadow. Serration = the summary's deckle-tooth technique on
    // the top + bottom edges (wallCream teeth biting into the stamp).
    stampTabStrip: { gap: spacing.sm, paddingVertical: spacing.xs },
    stampTab: { width: 96 },
    stampTabBody: {
      alignItems: 'center',
      backgroundColor: palette.creamBright,
      borderColor: palette.parchmentEdge,
      gap: spacing.xxs,
      paddingHorizontal: spacing.xs,
      paddingVertical: spacing.xs,
    },
    // The inked/selected stamp — pressed into the page, gold-framed. Applied over
    // the pastel tint; the tint is dimmed on the unselected stamps by opacity.
    stampTabSelected: { ...shadows.card },
    stampTabUnselected: { opacity: 0.72 },
    // Serration teeth rows: a clipped row of wallCream triangles biting the edge.
    stampTeethRow: { flexDirection: 'row', height: 5, justifyContent: 'center', overflow: 'hidden' },
    stampToothDown: {
      borderLeftColor: 'transparent',
      borderLeftWidth: 4,
      borderRightColor: 'transparent',
      borderRightWidth: 4,
      borderTopColor: palette.wallCream,
      borderTopWidth: 5,
      height: 0,
      width: 0,
    },
    stampToothUp: {
      borderBottomColor: palette.wallCream,
      borderBottomWidth: 5,
      borderLeftColor: 'transparent',
      borderLeftWidth: 4,
      borderRightColor: 'transparent',
      borderRightWidth: 4,
      height: 0,
      width: 0,
    },
    // A thin gold frame that survives the teeth (the tooth rows overlay the top +
    // bottom edges, so the left/right frame reads through as the stamp border).
    stampTabFrame: {
      borderColor: palette.parchmentEdge,
      borderLeftWidth: borders.hairline,
      borderRightWidth: borders.hairline,
    },
    stampTabFrameSelected: { borderColor: palette.goldDeep, borderLeftWidth: borders.strong, borderRightWidth: borders.strong },
    // Pastel per-rarity washes — the mini legend ladder as translucent tints, so
    // the stamps read by the same rarest→common color language as the album.
    stampTintHeirloom: { backgroundColor: `${palette.coinGold}33` },
    stampTintRare: { backgroundColor: `${palette.goldDeep}26` },
    stampTintFine: { backgroundColor: `${palette.sunlight}4D` },
    stampTintCommon: { backgroundColor: palette.parchment },
    stampTintCombos: { backgroundColor: `${palette.accentTeal}26` },
    stampTabName: { fontSize: 10, letterSpacing: 0.4, textAlign: 'center' },
    stampTabCountRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.xxs },
    stampTabCount: { fontSize: 13, letterSpacing: 0 },
    // The optional REAL runsPlayed goal line (a tiny "N/M" over a fill). Rendered
    // ONLY when rarityGoalForItems finds a real locked runsPlayed item.
    stampTabGoal: { alignItems: 'center', gap: 1, width: '100%' },
    stampTabGoalTrack: {
      backgroundColor: palette.parchmentEdge,
      borderRadius: radii.pill,
      height: 3,
      overflow: 'hidden',
      width: '100%',
    },
    stampTabGoalFill: { backgroundColor: palette.goldDeep, borderRadius: radii.pill, height: 3 },
    stampTabGoalText: { fontSize: 8, letterSpacing: 0 },

    // CAT-2 band group: a SectionLabel + its rarity grid, kept tight.
    band: { gap: spacing.sm },

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
    // CAT-2 rarity material — applied to DISCOVERED cards only (undiscovered and
    // locked cards keep their uniform bed so mystery reads the same across the
    // wall). The band climbs paper → brass → gold as the tier rises. COMMON keeps
    // `stampFound` above; FINE/RARE/HEIRLOOM add presence below.
    // FINE (tier 2): a warm sunlight wash over the owned card — richer than
    // COMMON's plain cream, still restrained.
    stampFine: {
      backgroundColor: `${palette.sunlight}59`,
      borderColor: palette.goldDeep,
      borderWidth: borders.regular,
      ...shadows.card,
    },
    // RARE (tier 3): a heavier goldDeep frame + an inset coinGold hairline
    // (`stampInnerRing`) reads as a brass double border on the bright cream bed.
    stampRare: {
      backgroundColor: palette.creamBright,
      borderColor: palette.goldDeep,
      borderWidth: borders.strong,
      ...shadows.card,
    },
    // HEIRLOOM (tier 4): the full prestige card — a gold-tinted bed, the strong
    // frame + inset hairline, a crowned seal, and a lifted shadow so it sits proud.
    stampHeirloom: {
      backgroundColor: `${palette.sunlight}8C`,
      borderColor: palette.goldDeep,
      borderWidth: borders.strong,
      ...shadows.lifted,
    },
    // The inset hairline that reads as a second, finer frame on RARE/HEIRLOOM.
    stampInnerRing: {
      borderColor: palette.coinGold,
      borderRadius: radii.sm,
      borderWidth: 1,
      bottom: spacing.xxs,
      left: spacing.xxs,
      position: 'absolute',
      right: spacing.xxs,
      top: spacing.xxs,
    },
    // HEIRLOOM crown seal — a small tinted disc in the top-right corner, echoing
    // TagIcon's icon-in-a-ring language (glyph color set at the call site).
    stampCrown: {
      alignItems: 'center',
      backgroundColor: palette.creamBright,
      borderColor: palette.goldDeep,
      borderRadius: radii.pill,
      borderWidth: 1.5,
      height: 20,
      justifyContent: 'center',
      position: 'absolute',
      right: spacing.xxs,
      top: spacing.xxs,
      width: 20,
      zIndex: 2,
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
    // B-M11 "new" accent badge, reused by the COMBO-2 minted medal.
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
    // CAT-2 earn-count context under an achieved combo ("achieved 3 times").
    comboContext: { fontSize: 11, letterSpacing: 0 },

    // --- COMBO-2 trophy shelf: rows of 2 medals standing in wooden wells. ---
    // The tab is a stack of wooden shelves (the game's own shelfWood language) so
    // it reads instantly as "the same wood as my shelf".
    comboShelf: { gap: spacing.lg },
    // One shelf: a shelfWood bed the medals stand on, capped by a plank lip.
    shelfBed: {
      backgroundColor: palette.shelfWood,
      borderColor: palette.woodDark,
      borderRadius: radii.md,
      borderWidth: borders.strong,
      paddingHorizontal: spacing.md,
      paddingTop: spacing.md,
      ...shadows.card,
    },
    shelfMedalRow: { flexDirection: 'row' },
    // Each medal + its name; flex:1 so a row of two splits the shelf evenly.
    shelfCell: { alignItems: 'center', flex: 1, gap: spacing.xs, paddingHorizontal: spacing.xxs },
    // The front lip of the shelf the medals sit on (cascade Board plank language).
    shelfPlank: {
      backgroundColor: palette.woodLight,
      borderBottomColor: palette.woodDark,
      borderBottomWidth: borders.strong,
      borderRadius: radii.xs,
      height: 12,
      marginTop: spacing.md,
    },
    // The "×N" notch chip, centered and overlapping the medal's lower rim (R2 —
    // a clean notch, not a sticker): goldDeep frame on a coinGold bed, stat text.
    medalCountChip: {
      alignItems: 'center',
      backgroundColor: palette.coinGold,
      borderColor: palette.goldDeep,
      borderRadius: radii.pill,
      borderWidth: borders.regular,
      marginTop: -spacing.lg,
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
      zIndex: 2,
    },
    medalCountText: { fontSize: 12, letterSpacing: 0 },
    // Sized to the medal (108), so the absolute mint ring + NEW badge register to
    // the well's box.
    medalStack: { alignItems: 'center', justifyContent: 'center' },
    // Combo name under the medal (Baloo2 heading, sized down for the trophy).
    medalName: { fontSize: 14, lineHeight: 18, minHeight: 18, textAlign: 'center' },
    medalLockHint: { fontSize: 10, lineHeight: 14, textAlign: 'center' },
    // isNew "minting" pulse — a gold ring around the well (circular revealRing).
    medalRevealRing: {
      borderColor: palette.goldDeep,
      borderRadius: radii.pill,
      borderWidth: borders.strong,
      height: 108,
      position: 'absolute',
      width: 108,
    },
    // The one-time mount glint: a bright streak swept across the medal (clipped to
    // the ring). translateX + a constant rotate carry the sweep — uniform only.
    medalGlint: {
      backgroundColor: palette.creamBright,
      borderRadius: radii.xs,
      height: 150,
      opacity: 0.5,
      position: 'absolute',
      width: 22,
    },
    // The minted "NEW" badge, pinned to the medal's top-right.
    medalNewBadge: { position: 'absolute', right: 0, top: -spacing.xs, zIndex: 3 },

    // --- COMBO-2 combo detail modal (echoes the item ShowcaseModal anatomy). ---
    comboModalCard: {
      alignItems: 'center',
      backgroundColor: palette.creamBright,
      borderColor: palette.goldDeep,
      borderRadius: radii.lg,
      borderWidth: borders.strong,
      gap: spacing.md,
      maxWidth: 360,
      padding: spacing.xl,
      width: '100%',
      ...shadows.lifted,
    },
    comboModalUnlock: { textAlign: 'center' },
    comboModalCount: { fontSize: 13, letterSpacing: 0 },

    // The mini shelf cluster: a plus of wells around a center slot. Uses the same
    // wood well tones as the shelf/cascade so it reads as "this in the middle,
    // these around it" instantly. Modal-only since COMBO-2; the wells grew to
    // hold REAL gameplay item cards (ItemSprite plinths, R1) instead of glyphs.
    recipe: { alignItems: 'center', gap: spacing.xxs, paddingVertical: spacing.xxs },
    recipeRow: { flexDirection: 'row', gap: spacing.xxs, justifyContent: 'center' },
    recipeWell: {
      alignItems: 'center',
      backgroundColor: palette.woodInset,
      borderColor: palette.woodDark,
      borderRadius: radii.sm,
      borderWidth: borders.regular,
      height: 52,
      justifyContent: 'center',
      width: 52,
    },
    // A recessed empty well — the "arrange here" negative space of the cluster.
    recipeWellEmpty: { backgroundColor: palette.woodDark, opacity: 0.45 },
    // The center slot wears a gold frame so it reads as the anchor of the recipe.
    recipeWellCenter: { borderColor: palette.goldDeep, borderWidth: borders.strong },
    // R1: the "any <tag> item" marker on a tag slot showing an example card — a
    // small TagIcon chip pinned to the well's top-right corner.
    recipeTagChip: {
      alignItems: 'center',
      backgroundColor: palette.creamBright,
      borderColor: palette.parchmentEdge,
      borderRadius: radii.pill,
      borderWidth: 1,
      height: 18,
      justifyContent: 'center',
      position: 'absolute',
      right: -spacing.xs,
      top: -spacing.xs,
      width: 18,
      zIndex: 2,
    },

    // --- CAT-3 item showcase modal. ---
    modalScrim: {
      alignItems: 'center',
      backgroundColor: palette.scrim,
      flex: 1,
      justifyContent: 'center',
      padding: spacing.xl,
    },
    // Base card; the item's rarity material (bandBed) spreads on top so the modal
    // echoes the grid framing exactly (HEIRLOOM gold bed, RARE brass frame…).
    modalCard: {
      alignItems: 'center',
      borderRadius: radii.lg,
      borderWidth: borders.hairline,
      gap: spacing.md,
      maxWidth: 360,
      padding: spacing.xl,
      width: '100%',
    },
    modalClose: {
      alignItems: 'center',
      backgroundColor: palette.parchment,
      borderColor: palette.parchmentEdge,
      borderRadius: radii.pill,
      borderWidth: 1,
      height: 32,
      justifyContent: 'center',
      position: 'absolute',
      right: spacing.md,
      top: spacing.md,
      width: 32,
      zIndex: 3,
    },
    // The sprite sits on a soft radial-feel bed: an outer ring + a warm halo +
    // the mat, layered so the big art reads as a framed hero (no gradient dep).
    modalSpriteBed: {
      alignItems: 'center',
      aspectRatio: 1,
      backgroundColor: palette.wallCream,
      borderColor: palette.goldDeep,
      borderRadius: radii.lg,
      borderWidth: borders.regular,
      justifyContent: 'center',
      width: 168,
    },
    modalSpriteRing: {
      borderColor: `${palette.goldDeep}55`,
      borderRadius: radii.pill,
      borderWidth: 1.5,
      height: 150,
      position: 'absolute',
      width: 150,
    },
    modalSpriteHalo: {
      backgroundColor: `${palette.sunlight}66`,
      borderRadius: radii.pill,
      height: 128,
      position: 'absolute',
      width: 128,
    },
    modalSprite: { height: 128, width: 128 },
    modalCrown: {
      alignItems: 'center',
      backgroundColor: palette.creamBright,
      borderColor: palette.goldDeep,
      borderRadius: radii.pill,
      borderWidth: 2,
      height: 34,
      justifyContent: 'center',
      position: 'absolute',
      right: -spacing.xs,
      top: -spacing.xs,
      width: 34,
      zIndex: 2,
    },
    modalName: { textAlign: 'center' },
    modalBandChip: {
      backgroundColor: palette.parchment,
      borderColor: palette.goldDeep,
      borderRadius: radii.pill,
      borderWidth: 1,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xxs,
    },
    modalBandChipText: { letterSpacing: 1.2 },
    modalTags: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, justifyContent: 'center' },
    modalTagChip: {
      alignItems: 'center',
      backgroundColor: palette.creamBright,
      borderColor: palette.parchmentEdge,
      borderRadius: radii.pill,
      borderWidth: 1,
      flexDirection: 'row',
      gap: spacing.xxs,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xxs,
    },
    modalTagText: { letterSpacing: 0 },
    modalValueRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.xs },
    modalCoinDot: {
      backgroundColor: palette.coinGold,
      borderColor: palette.goldDeep,
      borderRadius: radii.pill,
      borderWidth: borders.regular,
      height: 16,
      width: 16,
    },
    modalDivider: { alignSelf: 'stretch', backgroundColor: palette.parchmentEdge, height: 1 },
    modalSection: { alignSelf: 'stretch', gap: spacing.sm },
    modalRuleList: { gap: spacing.xs },
    modalRule: { alignItems: 'flex-start', flexDirection: 'row', gap: spacing.sm },
    modalRuleBullet: {
      backgroundColor: palette.goldDeep,
      borderRadius: radii.pill,
      height: 6,
      marginTop: 7,
      width: 6,
    },
    modalRuleText: { flex: 1 },
    // The one-time gold shine ring that pulses as the modal opens (CAT-1 language).
    modalShine: {
      borderColor: palette.goldDeep,
      borderRadius: radii.lg,
      borderWidth: 2,
      bottom: 0,
      left: 0,
      position: 'absolute',
      right: 0,
      top: 0,
    },
  });
}
