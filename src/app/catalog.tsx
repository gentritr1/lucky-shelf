import { useEffect, useMemo, useState, type ComponentProps } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import {
  AppText,
  SectionLabel,
  TagIcon,
  TopBar,
  borders,
  layout,
  motion,
  pictureGalleryEnabled,
  shadows,
  usePalette,
  useReducedMotion,
  useTextScale,
  useThemedStyles,
} from '@/ui';
import type { CatalogStats, ItemInstance } from '@/contracts';
import { ItemSprite, easings, spriteFor } from '@/juice';

import { makeStyles } from '@/screen-styles/catalog.styles';
import {
  RARITY_BANDS,
  buildCatalogView,
  catalogBands,
  catalogSelectors,
  nearestIncompleteBand,
  nextUnlockTeaserView,
  rarityGoalForItems,
  useCatalogStore,
  type CatalogBand,
  type CatalogComboRow,
  type CatalogItemRow,
  type CatalogView,
  type NextUnlockRow,
} from '../state/catalogStore';

/** MaterialCommunityIcons glyph name — lets the Stat cell take a validated icon. */
type MciName = ComponentProps<typeof MaterialCommunityIcons>['name'];

/** RuleTarget descriptor shared by combo center/adjacent — a tag or a concrete item. */
type ComboSlot = CatalogComboRow['center'];

/**
 * The Catalog album (kickoff §1 meta): every item discovered, every named combo
 * achieved, best-run stats. Discovery should feel like opening an album of
 * trophies — found items are owned collectibles (warm edge, soft lift, a spring
 * on press); items discovered SINCE the last catalog visit get a one-time gold
 * reveal on mount; and locked cards read as an invitation ("worth getting"),
 * with a progress tick toward the unlock, not a flat "denied" hole.
 *
 * CAT-2 makes it a collector's display case, not a list: a persistent completion
 * header, a segmented ITEMS/COMBOS control, and — on the Items tab — the 41 cards
 * grouped into rarity bands (rarest first), with a material framing that climbs
 * paper → brass → gold as the tier rises so a HEIRLOOM reads precious at a glance.
 */

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * B-M15: the catalog's page selection. The postage-stamp strip is the tab
 * control — one stamp per rarity band (shows that band's album grid) plus a
 * combos stamp (shows the trophy shelf). Replaces the old ITEMS/COMBOS segmented
 * control + the rarity legend chips with a single stamp-album strip.
 */
type SelectedTab = { kind: 'rarity'; tier: 1 | 2 | 3 | 4 } | { kind: 'combos' };

/** A stable key for a selected tab (drives the reveal-plan remount). */
function tabKey(tab: SelectedTab): string {
  return tab.kind === 'combos' ? 'combos' : `rarity-${tab.tier}`;
}

/** In-screen mount stagger (journal → stamps → grid). Short and subtle — the
 *  scar says expo-router already animates the screen mount, so a blanket entrance
 *  gets masked; this only nudges the sections into place in sequence. */
const STAGGER_STEP_MS = 70;

/** At most this many cards play the reveal at once; the rest snap in already-owned. */
const MAX_REVEAL = 8;
const REVEAL_STAGGER_MS = 90;
const REVEAL_SHINE_MS = 520;
/** ItemSprite size inside a recipe-diagram well (plinth ≈ 0.82× this). */
const RECIPE_CARD_SIZE = 50;
/** Trophy medal diameter on the shelf (R2: +12.5% from 96; SE math in report). */
const MEDAL_SIZE = 108;

/**
 * Ids already given their one-time reveal this app session. Module-level (not
 * persisted, not React state) so a screen re-mount can't replay the reveal, yet
 * it costs no schema change and clears on app restart — which also clears the
 * in-memory `lastRunDiscovery` that seeds it, so there is nothing to re-reveal.
 */
const revealedThisSession = new Set<string>();

/** Assign a stagger slot to each not-yet-revealed id (in screen order), marking
 *  every id revealed so it never animates again this session. Capped at
 *  MAX_REVEAL concurrent animators; overflow ids are marked seen but get no slot.
 *  CAT-2: planned per-tab on that tab's first mount (a tab shows only its own
 *  card set, so ≤MAX_REVEAL concurrent animators are ever on screen at once). */
function planReveals(newIds: readonly string[]): Map<string, number> {
  const plan = new Map<string, number>();
  let slot = 0;
  for (const id of newIds) {
    if (revealedThisSession.has(id)) continue;
    revealedThisSession.add(id);
    if (slot < MAX_REVEAL) plan.set(id, slot);
    slot += 1;
  }
  return plan;
}

/** COMBO-2 mount glint: which achieved medals have already swept their one-time
 *  shine this app session. Parallel to `revealedThisSession` but a distinct set —
 *  the glint is the "already earned" flourish, the reveal is the "just earned"
 *  one, and a medal never plays both (new medals are excluded from the glint). */
const glintedThisSession = new Set<string>();
const GLINT_START_MS = 260;

/** Assign a stagger slot to each achieved medal that hasn't glinted yet this
 *  session (in screen order), marking them all glinted so the sweep never
 *  replays. Capped at MAX_REVEAL concurrent animators; overflow gets no slot. */
function planGlints(ids: readonly string[]): Map<string, number> {
  const plan = new Map<string, number>();
  let slot = 0;
  for (const id of ids) {
    if (glintedThisSession.has(id)) continue;
    glintedThisSession.add(id);
    if (slot < MAX_REVEAL) plan.set(id, slot);
    slot += 1;
  }
  return plan;
}

export default function CatalogScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(makeStyles);
  const catalog = useCatalogStore(catalogSelectors.catalog);
  const loadCatalog = useCatalogStore((state) => state.loadCatalog);
  // B-M11 / CAT-1: what the latest run first-achieved (combos) and first-saw
  // (items) — drives the "new" accent and the one-time reveal. In-memory only.
  const lastRunDiscovery = useCatalogStore((state) => state.lastRunDiscovery);

  // Optional `?tab=combos` deep link (mirrors how-to-play's `?page=N`): a real
  // affordance so the Combos tab is reachable without a tap — used for
  // per-tab verification, inert in normal use (defaults to the Items tab).
  // `?item=<id>` opens the showcase modal for a discovered item on mount — a
  // documented affordance that makes the (untappable-headlessly) modal
  // deep-linkable for verification; ignored for an undiscovered/unknown id.
  // `?combo=<comboId>` mirrors `?item=`: opens the combo detail modal for an
  // ACHIEVED combo on mount — the same verification affordance, inert for an
  // unachieved/unknown id (mystery stays mystery).
  const params = useLocalSearchParams<{ tab?: string; item?: string; combo?: string }>();
  // The stamp tabs are the page control. `?tab=combos` opens the trophy shelf;
  // `?tab=items` (or default) opens the COMMON album page — the band most likely
  // to hold discoveries, so a fresh open shows a filled grid, not an empty rarest
  // page. Both deep links are kept for per-page verification.
  const [tab, setTab] = useState<SelectedTab>(
    params.tab === 'combos' ? { kind: 'combos' } : { kind: 'rarity', tier: 1 },
  );
  const [showcaseId, setShowcaseId] = useState<string | null>(params.item ?? null);
  const [comboShowcaseId, setComboShowcaseId] = useState<string | null>(params.combo ?? null);

  useEffect(() => {
    void loadCatalog().catch(() => undefined);
  }, [loadCatalog]);

  // Re-open the showcase when the `?item=` deep link CHANGES to a new id (the
  // screen instance is reused across deep links, so init-from-params alone can't
  // re-trigger). Keyed on the param value: closing the modal sets showcaseId null
  // without changing the URL, so this never fights a manual dismiss.
  useEffect(() => {
    if (params.item) setShowcaseId(params.item);
  }, [params.item]);

  // Same reuse story for `?combo=`: honour the deep link on an already-mounted
  // screen; closing sets the id null without touching the URL, so a manual
  // dismiss is never overridden.
  useEffect(() => {
    if (params.combo) setComboShowcaseId(params.combo);
  }, [params.combo]);

  // Same reuse story for `?tab=`: honour a tab deep link even when the screen is
  // already mounted. No param → no-op, so manual tab taps are never overridden.
  useEffect(() => {
    if (params.tab === 'combos') setTab({ kind: 'combos' });
    else if (params.tab === 'items') setTab({ kind: 'rarity', tier: 1 });
  }, [params.tab]);

  const newlyAchievedComboIds = useMemo(
    () => new Set(lastRunDiscovery?.comboIds ?? []),
    [lastRunDiscovery],
  );
  const newlyDiscoveredItemIds = useMemo(
    () => new Set(lastRunDiscovery?.itemIds ?? []),
    [lastRunDiscovery],
  );
  const view = useMemo(
    () =>
      buildCatalogView(catalog, undefined, undefined, {
        newlyAchievedComboIds,
        newlyDiscoveredItemIds,
      }),
    [catalog, newlyAchievedComboIds, newlyDiscoveredItemIds],
  );

  // PROG-1: the real "one more run" hook for the header — the nearest locked
  // ladder unlock (null when the ladder is off/exhausted, then the header falls
  // back to the nearest incomplete band). Reads the live catalog.
  const nextUnlock = useMemo(() => nextUnlockTeaserView(catalog), [catalog]);

  // The showcase only ever opens for a DISCOVERED row — an undiscovered or
  // unknown id resolves to null and the modal stays closed (mystery stays
  // mystery, and a stale deep link is inert).
  const showcaseRow = useMemo(
    () => (showcaseId ? view.items.find((i) => i.id === showcaseId && i.discovered) ?? null : null),
    [showcaseId, view.items],
  );

  // The combo modal only ever opens for an ACHIEVED combo — an unachieved or
  // unknown id resolves to null and stays closed (no recipe leak, stale link inert).
  const comboShowcaseRow = useMemo(
    () =>
      comboShowcaseId
        ? view.combos.find((c) => c.comboId === comboShowcaseId && c.achieved) ?? null
        : null,
    [comboShowcaseId, view.combos],
  );

  // The rarity bands (rarest-first) — the stamp tabs and the album grid both read
  // from these. The selected rarity page shows exactly one band's grid.
  const bands = useMemo(() => catalogBands(view.items), [view.items]);
  const galleryOn = pictureGalleryEnabled();
  const selectedBand =
    tab.kind === 'rarity' ? bands.find((b) => b.tier === tab.tier) ?? null : null;

  return (
    <View style={[styles.screen, { paddingTop: insets.top + layout.screenTopGap }]}>
      <TopBar title="Catalog" backLabel="‹ Menu" onBack={() => router.dismissTo('/')} />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + layout.screenBottomGap }]}
        showsVerticalScrollIndicator={false}
      >
        {/* In-screen stagger: journal → (gallery) → stamps → stats → page. */}
        <StaggerReveal order={0}>
          <JournalHeader view={view} nextUnlock={nextUnlock} />
        </StaggerReveal>

        {/* B-M14: the picture gallery entry (flag-gated). Off ⇒ this never
            renders, so the catalog is byte-identical. */}
        {galleryOn ? (
          <StaggerReveal order={1}>
            <GalleryEntryCard onOpen={() => router.push('/gallery')} />
          </StaggerReveal>
        ) : null}

        <StaggerReveal order={galleryOn ? 2 : 1}>
          <RarityStampTabs view={view} bands={bands} tab={tab} onSelect={setTab} />
        </StaggerReveal>

        {/* B-M16: the best-run stats ledger — below the stamps row, out of the
            hero card (the header decram; see JournalHeader). */}
        <StaggerReveal order={galleryOn ? 3 : 2}>
          <StatsStrip stats={catalog.stats} />
        </StaggerReveal>

        {/* Conditional render: only the active page is mounted, so its reveal
            plans (and animators) exist only while it is on screen. */}
        <StaggerReveal order={galleryOn ? 4 : 3}>
          {tab.kind === 'combos' ? (
            <CombosTab view={view} onOpenCombo={setComboShowcaseId} />
          ) : selectedBand ? (
            <BandPage key={tabKey(tab)} band={selectedBand} onOpenItem={setShowcaseId} />
          ) : null}
        </StaggerReveal>
      </ScrollView>

      <ItemShowcaseModal row={showcaseRow} onClose={() => setShowcaseId(null)} />
      <ComboShowcaseModal row={comboShowcaseRow} onClose={() => setComboShowcaseId(null)} />
    </View>
  );
}

/**
 * The in-screen mount stagger (B-M15). Fades + lifts its child into place after a
 * short per-section delay (journal → stamps → page). Single translateY (no
 * scaleX/scaleY split — Fabric collapse scar); reduced motion snaps to placed.
 * Kept subtle so expo-router's own screen-mount animation isn't doubled/masked.
 */
function StaggerReveal({ order, children }: { order: number; children: React.ReactNode }) {
  const reduced = useReducedMotion();
  const progress = useSharedValue(reduced ? 1 : 0);
  useEffect(() => {
    if (reduced) {
      progress.value = 1;
      return;
    }
    progress.value = 0;
    progress.value = withDelay(
      order * STAGGER_STEP_MS,
      withTiming(1, { duration: motion.durations.settle, easing: easings.out }),
    );
  }, [reduced, order, progress]);
  const anim = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * 8 }],
  }));
  return <Animated.View style={anim}>{children}</Animated.View>;
}

/**
 * B-M14 gallery entry — a warm pressable card that opens The Paintings. Uses the
 * catalog's own Panel language (parchment bed, gold accent, chevron). Only ever
 * rendered when PICTURE_GALLERY_ENABLED, so the flag-off catalog is unchanged.
 */
function GalleryEntryCard({ onOpen }: { onOpen: () => void }) {
  const styles = useThemedStyles(makeStyles);
  const palette = usePalette();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="The Paintings — open the picture gallery"
      onPress={onOpen}
      style={({ pressed }) => [styles.galleryEntry, pressed && styles.galleryEntryPressed]}
    >
      <View style={styles.galleryEntryIcon}>
        <MaterialCommunityIcons name="image-frame" size={22} color={palette.goldDeep} />
      </View>
      <View style={styles.galleryEntryText}>
        <AppText variant="heading" color={palette.ink}>The Paintings</AppText>
        <AppText variant="body" color={palette.inkSoft} numberOfLines={1}>
          Collect wider to reveal four paintings
        </AppText>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={22} color={palette.inkFaint} />
    </Pressable>
  );
}

/**
 * B-M15 Collector's Journal header card, decrammed in B-M16 (human REQUEST
 * CHANGES: "too many things, too cramped"). The card holds exactly FOUR airy
 * groups — masthead, big completion %, the discovered count, and the NEXT
 * MILESTONE row — with spacing.md of air between groups. Removed from the card:
 * the milestone dot-scale (decorative), the combos wax seal (combos coverage
 * already lives on the COMBOS stamp in the tab strip), and the four best-run
 * stats (relocated to the StatsStrip ledger below the stamps row — nothing left
 * the screen, only the card). The headline reads as one VoiceOver summary.
 */
function JournalHeader({
  view,
  nextUnlock,
}: {
  view: CatalogView;
  nextUnlock: NextUnlockRow | null;
}) {
  const styles = useThemedStyles(makeStyles);
  const palette = usePalette();
  const bands = useMemo(() => catalogBands(view.items), [view.items]);
  // Count-up drives the big number to value once on mount (~600ms).
  const animatedPct = useCountUp(view.completionPct);
  const summaryLabel = `Collector's Journal. Collection ${view.completionPct} percent complete, ${view.itemsDiscovered} of ${view.itemsTotal} items discovered.`;

  return (
    <View style={styles.journalCard}>
      <View pointerEvents="none" style={styles.journalStitch} />

      <View accessible accessibilityLabel={summaryLabel} style={styles.journalHead}>
        <View style={styles.journalMast}>
          <MaterialCommunityIcons name="clover" size={16} color={palette.goldDeep} />
          <AppText variant="heading" color={palette.ink} style={styles.journalTitle}>
            Collector&apos;s Journal
          </AppText>
        </View>

        <View style={styles.journalHeadRow}>
          <View style={styles.completionBlock}>
            <AppText variant="display" color={palette.accentTeal}>{animatedPct}%</AppText>
            <AppText variant="label" color={palette.inkFaint} style={styles.completionCaption}>
              COMPLETE
            </AppText>
          </View>
          <View style={styles.discoveredCount}>
            <AppText variant="stat" color={palette.ink}>
              {`${view.itemsDiscovered} / ${view.itemsTotal}`}
            </AppText>
            <AppText variant="label" color={palette.inkFaint}>items discovered</AppText>
          </View>
        </View>
      </View>

      <NextMilestoneRow nextUnlock={nextUnlock} bands={bands} />
    </View>
  );
}

/**
 * B-M16: the four best-run stats, relocated OUT of the journal card into a quiet
 * ledger strip below the stamps row (visually secondary — parchment bed, small
 * caps). One row at normal text; two-per-row at 130% so the cells never crush.
 * One accessible summary carries all four values.
 */
function StatsStrip({ stats }: { stats: CatalogStats }) {
  const styles = useThemedStyles(makeStyles);
  const palette = usePalette();
  const wide = useTextScale() >= 1.3;
  const cells = [
    { label: 'RUNS', value: String(stats.runsPlayed) },
    { label: 'BEST DAY', value: `${stats.bestDayTotal}c` },
    { label: 'LONGEST RUN', value: `${stats.longestRun}d` },
    { label: 'DEEPEST RENT', value: String(stats.deepestRentSurvived) },
  ];
  return (
    <View
      style={styles.statsStrip}
      accessible
      accessibilityLabel={`Best-run stats. ${stats.runsPlayed} runs played, best day ${stats.bestDayTotal} coins, longest run ${stats.longestRun} days, deepest rent survived ${stats.deepestRentSurvived}.`}
    >
      {cells.map((cell) => (
        <View key={cell.label} style={wide ? styles.statsStripCellWide : styles.statsStripCell}>
          <AppText variant="stat" color={palette.ink}>{cell.value}</AppText>
          <AppText variant="label" color={palette.inkFaint} style={styles.statsStripLabel}>
            {cell.label}
          </AppText>
        </View>
      ))}
    </View>
  );
}

/**
 * The NEXT MILESTONE teaser (restyled `nextUnlockTeaserView`). Primary: the
 * nearest locked ladder unlock — its real silhouette + real hint ("Reach 9 runs")
 * + a runs progress fraction/tick that animates to value on mount. Fallback
 * (ladder off/exhausted): the nearest incomplete rarity band. NO invented reward —
 * every prompt maps to a real unlock or a real set.
 */
function NextMilestoneRow({
  nextUnlock,
  bands,
}: {
  nextUnlock: NextUnlockRow | null;
  bands: CatalogBand[];
}) {
  const styles = useThemedStyles(makeStyles);
  const palette = usePalette();

  if (nextUnlock) {
    const sprite = spriteFor(nextUnlock.itemId);
    const progress = nextUnlock.progress;
    const pct =
      progress && progress.target > 0
        ? Math.min(100, Math.round((progress.current / progress.target) * 100))
        : 0;
    return (
      <View style={styles.nextStrip}>
        <View style={styles.nextThumbCircle}>
          {sprite ? (
            <Image source={sprite} style={[styles.nextThumb, styles.silhouette]} resizeMode="contain" />
          ) : (
            <View style={styles.nextThumbDot} />
          )}
        </View>
        <View style={styles.nextText}>
          <AppText variant="label" color={palette.inkFaint}>NEXT MILESTONE</AppText>
          <AppText variant="body" color={palette.inkSoft} numberOfLines={1}>
            {nextUnlock.hint}
          </AppText>
        </View>
        {progress ? (
          <View style={styles.nextTick}>
            <AppText variant="stat" color={palette.ink} style={styles.nextTickText}>
              {`${progress.current}/${progress.target}`}
            </AppText>
            <ProgressTrack pct={pct} trackStyle={styles.nextTickTrack} fillStyle={styles.nextTickFill} />
          </View>
        ) : null}
      </View>
    );
  }

  const band = nearestIncompleteBand(bands);
  if (!band) return null; // Everything collected — no hook to show.
  const remaining = band.total - band.discovered;
  return (
    <View style={styles.nextStrip}>
      <View style={styles.nextThumbCircle}>
        <MaterialCommunityIcons name="shape-outline" size={20} color={palette.inkFaint} />
      </View>
      <View style={styles.nextText}>
        <AppText variant="label" color={palette.inkFaint}>COMPLETE THE SET</AppText>
        <AppText variant="body" color={palette.inkSoft} numberOfLines={1}>
          {`${remaining} more ${band.name} ${remaining === 1 ? 'find completes' : 'finds complete'} the row`}
        </AppText>
      </View>
    </View>
  );
}

/** A progress bar whose fill animates to `pct` once on mount (~600ms, ease-out;
 *  snaps under reduced motion). Reads the count-up value as a plain number and
 *  drives width — no scaleX (Fabric collapse scar), no with*() arithmetic. */
function ProgressTrack({
  pct,
  trackStyle,
  fillStyle,
}: {
  pct: number;
  trackStyle: StyleProp<ViewStyle>;
  fillStyle: StyleProp<ViewStyle>;
}) {
  const animatedPct = useCountUp(pct);
  return (
    <View style={trackStyle}>
      <View style={[fillStyle, { width: `${animatedPct}%` }]} />
    </View>
  );
}

/**
 * B-M15 rarity postage-stamp tabs — the catalog's page control. A horizontal
 * stamp-album strip: one serrated stamp per rarity band + a combos stamp. Pressing
 * a stamp selects that page (a band's album grid, or the combo trophy shelf); the
 * selected stamp is "inked" (gold frame, full tint, lifted). Each stamp shows its
 * rarity icon, discovered/total, and — ONLY when a REAL runsPlayed-gated locked
 * item of that rarity exists — the nearest such goal line (never a fabricated
 * goal). Replaces the old ITEMS/COMBOS segmented control + the rarity legend chips.
 */
function RarityStampTabs({
  view,
  bands,
  tab,
  onSelect,
}: {
  view: CatalogView;
  bands: CatalogBand[];
  tab: SelectedTab;
  onSelect: (tab: SelectedTab) => void;
}) {
  const styles = useThemedStyles(makeStyles);
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.stampTabStrip}
    >
      {bands.map((band) => (
        <RarityStamp
          key={band.tier}
          band={band}
          selected={tab.kind === 'rarity' && tab.tier === band.tier}
          onPress={() => onSelect({ kind: 'rarity', tier: band.tier })}
        />
      ))}
      <ComboStamp
        achieved={view.combosAchieved}
        total={view.combosTotal}
        selected={tab.kind === 'combos'}
        onPress={() => onSelect({ kind: 'combos' })}
      />
    </ScrollView>
  );
}

const RARITY_STAMP_ICON: Record<1 | 2 | 3 | 4, MciName> = {
  4: 'crown',
  3: 'diamond-stone',
  2: 'star-four-points',
  1: 'shape',
};

/** Per-rarity pastel tint (the legend ladder as a translucent wash). */
function stampTint(tier: 1 | 2 | 3 | 4, styles: ReturnType<typeof makeStyles>) {
  switch (tier) {
    case 4:
      return styles.stampTintHeirloom;
    case 3:
      return styles.stampTintRare;
    case 2:
      return styles.stampTintFine;
    default:
      return styles.stampTintCommon;
  }
}

/** How many perforation teeth bite across a stamp's top/bottom edge. */
const STAMP_TEETH = 11;

/** A serrated stamp edge (wallCream teeth biting in), reusing the run-summary
 *  deckle technique — down-pointing on the top edge, up-pointing on the bottom. */
function StampTeeth({ dir }: { dir: 'up' | 'down' }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.stampTeethRow} pointerEvents="none">
      {Array.from({ length: STAMP_TEETH }).map((_, i) => (
        <View key={i} style={dir === 'down' ? styles.stampToothDown : styles.stampToothUp} />
      ))}
    </View>
  );
}

/**
 * Shared stamp frame: serrated top/bottom edges around a tinted, pressable body.
 * Selected = "inked" (gold side-frame, full tint, a lift); unselected dims the
 * tint. A press-spring (uniform scale) gives the pressed-stamp feel; reduced
 * motion snaps. Tab semantics preserved (accessibilityRole="tab" + selected).
 */
function StampFrame({
  tint,
  selected,
  onPress,
  accessibilityLabel,
  children,
}: {
  tint: StyleProp<ViewStyle>;
  selected: boolean;
  onPress: () => void;
  accessibilityLabel: string;
  children: React.ReactNode;
}) {
  const styles = useThemedStyles(makeStyles);
  const reduced = useReducedMotion();
  const press = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: press.value }] }));
  return (
    <AnimatedPressable
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      onPressIn={() => {
        if (!reduced) press.value = withTiming(0.95, { duration: motion.durations.tick });
      }}
      onPressOut={() => {
        press.value = reduced ? 1 : withSpring(1, motion.springs.settle);
      }}
      style={[styles.stampTab, anim, !selected && styles.stampTabUnselected]}
    >
      <StampTeeth dir="down" />
      <View
        style={[
          styles.stampTabBody,
          styles.stampTabFrame,
          selected && styles.stampTabFrameSelected,
          tint,
          selected && styles.stampTabSelected,
        ]}
      >
        {children}
      </View>
      <StampTeeth dir="up" />
    </AnimatedPressable>
  );
}

/** One rarity stamp: icon, band name, discovered/total, and — only when the band
 *  holds a REAL runsPlayed-gated locked item — the nearest such goal line. */
function RarityStamp({
  band,
  selected,
  onPress,
}: {
  band: CatalogBand;
  selected: boolean;
  onPress: () => void;
}) {
  const styles = useThemedStyles(makeStyles);
  const palette = usePalette();
  const goal = rarityGoalForItems(band.items);
  const goalPct =
    goal && goal.target > 0 ? Math.min(100, Math.round((goal.current / goal.target) * 100)) : 0;
  return (
    <StampFrame
      tint={stampTint(band.tier, styles)}
      selected={selected}
      onPress={onPress}
      accessibilityLabel={`${band.name}, ${band.discovered} of ${band.total} discovered`}
    >
      <MaterialCommunityIcons name={RARITY_STAMP_ICON[band.tier]} size={18} color={palette.goldDeep} />
      <AppText variant="label" color={palette.inkSoft} numberOfLines={1} style={styles.stampTabName}>
        {band.name}
      </AppText>
      <View style={styles.stampTabCountRow}>
        <AppText variant="stat" color={palette.ink} style={styles.stampTabCount}>
          {`${band.discovered}/${band.total}`}
        </AppText>
      </View>
      {goal ? (
        <View style={styles.stampTabGoal}>
          <View style={styles.stampTabGoalTrack}>
            <View style={[styles.stampTabGoalFill, { width: `${goalPct}%` }]} />
          </View>
          <AppText variant="label" color={palette.inkFaint} style={styles.stampTabGoalText}>
            {`Reach ${goal.target} runs`}
          </AppText>
        </View>
      ) : null}
    </StampFrame>
  );
}

/** The combos stamp — the trophy-shelf page's tab: a medal glyph + achieved/total. */
function ComboStamp({
  achieved,
  total,
  selected,
  onPress,
}: {
  achieved: number;
  total: number;
  selected: boolean;
  onPress: () => void;
}) {
  const styles = useThemedStyles(makeStyles);
  const palette = usePalette();
  return (
    <StampFrame
      tint={styles.stampTintCombos}
      selected={selected}
      onPress={onPress}
      accessibilityLabel={`Combos, ${achieved} of ${total} achieved`}
    >
      <MaterialCommunityIcons name="medal" size={18} color={palette.tealDark} />
      <AppText variant="label" color={palette.inkSoft} numberOfLines={1} style={styles.stampTabName}>
        COMBOS
      </AppText>
      <View style={styles.stampTabCountRow}>
        <AppText variant="stat" color={palette.ink} style={styles.stampTabCount}>
          {`${achieved}/${total}`}
        </AppText>
      </View>
    </StampFrame>
  );
}

/**
 * One rarity album page: the band's SectionLabel + its grid of item stamps
 * (unchanged CAT-2 cards). The one-time discovery reveal is planned here on the
 * page's first mount — planReveals no-ops on already-revealed ids, so switching
 * pages never replays it, and only the visible page's animators exist.
 */
function BandPage({ band, onOpenItem }: { band: CatalogBand; onOpenItem: (id: string) => void }) {
  const styles = useThemedStyles(makeStyles);
  const [revealPlan] = useState(() => planReveals(band.items.filter((i) => i.isNew).map((i) => i.id)));
  return (
    <View style={styles.band}>
      <SectionLabel>{`${band.name} — ${band.discovered}/${band.total}`}</SectionLabel>
      <View style={styles.grid}>
        {band.items.map((item) => (
          <ItemStamp
            key={item.id}
            item={item}
            revealIndex={revealPlan.get(item.id) ?? null}
            onOpenItem={onOpenItem}
          />
        ))}
      </View>
    </View>
  );
}


/**
 * The Combos tab: a WOODEN TROPHY SHELF (COMBO-2). Combos sit two-per-row as
 * layered medals standing in woodInset wells on shelfWood beds — the game's own
 * shelf language, so it reads instantly as "the same wood as my shelf". An
 * achieved medal wears the combo's center art + a "×N" ribbon and opens a detail
 * modal; a locked medal is a dark recessed disc with a lock (no recipe leak).
 * Two one-shot flourishes, both session-scoped and ≤MAX_REVEAL: newly-earned
 * medals MINT (reveal ring + pop, shared with the items machinery); previously-
 * earned medals GLINT once on mount (a swept shine). New medals mint instead of
 * glinting, so a medal never runs both.
 */
function CombosTab({
  view,
  onOpenCombo,
}: {
  view: CatalogView;
  onOpenCombo: (comboId: string) => void;
}) {
  const styles = useThemedStyles(makeStyles);
  const [revealPlan] = useState(() =>
    planReveals(view.combos.filter((c) => c.isNew).map((c) => c.comboId)),
  );
  const [glintPlan] = useState(() =>
    planGlints(view.combos.filter((c) => c.achieved && !c.isNew).map((c) => c.comboId)),
  );

  // Pair the combos into shelf rows of two (20 combos → 10 shelves).
  const rows: CatalogComboRow[][] = [];
  for (let i = 0; i < view.combos.length; i += 2) rows.push(view.combos.slice(i, i + 2));

  return (
    <View style={styles.comboShelf}>
      {rows.map((row) => (
        <View key={row[0]!.comboId} style={styles.shelfBed}>
          <View style={styles.shelfMedalRow}>
            {row.map((combo) => (
              <ComboMedalCell
                key={combo.comboId}
                combo={combo}
                revealIndex={revealPlan.get(combo.comboId) ?? null}
                glintIndex={glintPlan.get(combo.comboId) ?? null}
                onOpenCombo={onOpenCombo}
              />
            ))}
            {/* Keep a lone final medal left-aligned on its shelf (defensive — the
                combo count is even today). */}
            {row.length === 1 ? <View style={styles.shelfCell} /> : null}
          </View>
          <View style={styles.shelfPlank} />
        </View>
      ))}
    </View>
  );
}

/** rAF count-up from 0 to `target` over ~600ms (ease-out); snaps if reduced. */
function useCountUp(target: number, durationMs = motion.durations.banner): number {
  const reduced = useReducedMotion();
  const [value, setValue] = useState(reduced ? target : 0);
  useEffect(() => {
    if (reduced) {
      setValue(target);
      return;
    }
    let raf = 0;
    const start = Date.now();
    const tick = () => {
      const t = Math.min(1, (Date.now() - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(eased * target));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, reduced, durationMs]);
  return value;
}

/**
 * The one-time reveal driver: a `pop` spring (scale + opacity) and a `shine`
 * sweep for the gold ring. Uniform scale only (separate scaleX/scaleY collapse
 * views on Fabric). Snaps to placed when reduced-motion is on or the card was
 * given no reveal slot.
 */
function useReveal(revealIndex: number | null) {
  const reduced = useReducedMotion();
  const active = revealIndex != null && !reduced;
  const pop = useSharedValue(active ? 0 : 1);
  const shine = useSharedValue(active ? 0 : 1);
  useEffect(() => {
    if (!active) {
      pop.value = 1;
      shine.value = 1;
      return;
    }
    const delay = (revealIndex ?? 0) * REVEAL_STAGGER_MS;
    pop.value = withDelay(delay, withSpring(1, motion.springs.impact));
    shine.value = withDelay(delay, withTiming(1, { duration: REVEAL_SHINE_MS, easing: easings.out }));
  }, [active, revealIndex, pop, shine]);
  return { pop, shine, active };
}

/**
 * COMBO-2 mount glint driver: one shared value `g` sweeps 0→1 (staggered by the
 * medal's glint slot) and the medal maps it to a translating shine bar. One-shot,
 * never a loop. Reduced motion or "no slot" → `g` rests at 1 and the bar never
 * renders, so the tab is still.
 */
function useGlint(glintIndex: number | null) {
  const reduced = useReducedMotion();
  const active = glintIndex != null && !reduced;
  const g = useSharedValue(active ? 0 : 1);
  useEffect(() => {
    if (!active) {
      g.value = 1;
      return;
    }
    const delay = GLINT_START_MS + (glintIndex ?? 0) * REVEAL_STAGGER_MS;
    g.value = withDelay(delay, withTiming(1, { duration: REVEAL_SHINE_MS, easing: easings.out }));
  }, [active, glintIndex, g]);
  return { g, active };
}

function ItemStamp({
  item,
  revealIndex,
  onOpenItem,
}: {
  item: CatalogItemRow;
  revealIndex: number | null;
  onOpenItem: (id: string) => void;
}) {
  // Locked ≠ undiscovered (B-M5 Part 2): a locked ladder item shows its real
  // silhouette + unlock hint (+ CAT-1 progress tick), so it reads as "earn this".
  // Only a DISCOVERED stamp opens the showcase — locked/mystery stay closed.
  if (item.locked) return <LockedStamp item={item} />;
  if (item.discovered) {
    return <FoundStamp item={item} revealIndex={revealIndex} onOpenItem={onOpenItem} />;
  }
  return <MysteryStamp />;
}

/** The rarity material bed for a DISCOVERED card, by tier (CAT-2). COMMON keeps
 *  the CAT-1 gold-edge card; FINE/RARE/HEIRLOOM add warmth, a heavier frame, an
 *  inset hairline, and (heirloom) a crowned seal. */
function bandBed(tier: CatalogItemRow['tier'], styles: ReturnType<typeof makeStyles>) {
  switch (tier) {
    case 4:
      return styles.stampHeirloom;
    case 3:
      return styles.stampRare;
    case 2:
      return styles.stampFine;
    default:
      return styles.stampFound;
  }
}

/** A discovered, owned collectible: springs on press, wears its rarity band's
 *  material framing, and plays the gold reveal if it was first found since the
 *  last catalog visit. */
function FoundStamp({
  item,
  revealIndex,
  onOpenItem,
}: {
  item: CatalogItemRow;
  revealIndex: number | null;
  onOpenItem: (id: string) => void;
}) {
  const styles = useThemedStyles(makeStyles);
  const palette = usePalette();
  const reduced = useReducedMotion();
  const { pop, shine, active } = useReveal(revealIndex);
  const press = useSharedValue(1);
  const sprite = spriteFor(item.id);

  const cardStyle = useAnimatedStyle(() => {
    const revealScale = interpolate(pop.value, [0, 1], [0.7, 1]);
    return {
      opacity: interpolate(pop.value, [0, 0.4], [0, 1], Extrapolation.CLAMP),
      transform: [{ scale: press.value * revealScale }],
    };
  });
  const ringStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shine.value, [0, 0.35, 1], [0, 0.9, 0], Extrapolation.CLAMP),
    transform: [{ scale: interpolate(shine.value, [0, 1], [0.85, 1.35]) }],
  }));

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={`${item.name} — view details`}
      onPress={() => onOpenItem(item.id)}
      style={[styles.stamp, bandBed(item.tier, styles), cardStyle]}
      onPressIn={() => {
        if (!reduced) press.value = withTiming(0.95, { duration: motion.durations.tick });
      }}
      onPressOut={() => {
        press.value = reduced ? 1 : withSpring(1, motion.springs.settle);
      }}
    >
      {sprite ? (
        <View style={styles.stampArt}>
          <Image source={sprite} style={styles.stampSprite} resizeMode="contain" />
        </View>
      ) : (
        <View style={styles.stampMystery}>
          <AppText variant="title" color={palette.inkFaint}>?</AppText>
        </View>
      )}
      <AppText variant="label" color={palette.inkSoft} numberOfLines={1} style={styles.stampName}>
        {item.name}
      </AppText>
      {/* Brass double border for RARE and HEIRLOOM (inset hairline). */}
      {item.tier >= 3 ? <View pointerEvents="none" style={styles.stampInnerRing} /> : null}
      {/* HEIRLOOM crowned seal. */}
      {item.tier === 4 ? (
        <View pointerEvents="none" style={styles.stampCrown}>
          <MaterialCommunityIcons name="crown" size={11} color={palette.goldDeep} />
        </View>
      ) : null}
      {active ? <Animated.View pointerEvents="none" style={[styles.revealRing, ringStyle]} /> : null}
    </AnimatedPressable>
  );
}

/** An undiscovered "?" — a covered collectible on warm parchment (an invitation),
 *  with an embossed carved "?" instead of a flat dark hole. Kept uniform across
 *  rarity bands so mystery reads the same everywhere. */
function MysteryStamp() {
  const styles = useThemedStyles(makeStyles);
  const palette = usePalette();
  return (
    <View style={[styles.stamp, styles.stampLocked]}>
      <View style={styles.stampMystery}>
        <AppText variant="title" color={palette.inkFaint}>?</AppText>
      </View>
      <AppText variant="label" color={palette.inkSoft} numberOfLines={1} style={styles.stampName}>
        ???
      </AppText>
    </View>
  );
}

/** A locked ladder item: the real sprite tinted to a dark silhouette (no new
 *  art) over the standard card, with its unlock hint and — for a runs gate — a
 *  small progress tick ("4/5") so it reads "almost there", not "denied". */
function LockedStamp({ item }: { item: CatalogItemRow }) {
  const styles = useThemedStyles(makeStyles);
  const palette = usePalette();
  const sprite = spriteFor(item.id);
  const progress = item.unlockProgress;
  const pct =
    progress && progress.target > 0
      ? Math.min(100, Math.round((progress.current / progress.target) * 100))
      : 0;
  return (
    <View style={[styles.stamp, styles.stampLocked]}>
      {sprite ? (
        <View style={styles.stampArt}>
          <Image source={sprite} style={[styles.stampSprite, styles.silhouette]} resizeMode="contain" />
        </View>
      ) : (
        <View style={styles.stampSilhouetteBox} />
      )}
      <AppText variant="label" color={palette.inkSoft} numberOfLines={2} style={styles.stampLockHint}>
        {item.unlockHint}
      </AppText>
      {progress ? (
        <View style={styles.stampProgress}>
          <View style={styles.stampProgressTrack}>
            <View style={[styles.stampProgressFill, { width: `${pct}%` }]} />
          </View>
          <AppText variant="label" color={palette.inkFaint} style={styles.stampProgressText}>
            {`${progress.current}/${progress.target}`}
          </AppText>
        </View>
      ) : null}
    </View>
  );
}

/** The heart of an achieved medal: the combo's CENTER descriptor, so every medal
 *  is visually unique — a concrete item shows its sprite, a tag its TagIcon glyph. */
function ComboMedalCenter({
  slot,
  spriteSize,
  tagSize,
}: {
  slot: ComboSlot;
  spriteSize: number;
  tagSize: number;
}) {
  const palette = usePalette();
  if (slot.kind === 'item') {
    const sprite = spriteFor(slot.itemId);
    return sprite ? (
      <Image source={sprite} style={{ height: spriteSize, width: spriteSize }} resizeMode="contain" />
    ) : (
      // Defensive: every combo center resolves to a sprite today; a missing one
      // falls back to a glyph rather than blanking.
      <MaterialCommunityIcons name="star-four-points" size={tagSize} color={palette.goldDeep} />
    );
  }
  return <TagIcon tag={slot.tag} size={tagSize} />;
}

/**
 * A layered-View trophy medal for a combo, size-parametric (dims scale from
 * `size`, colors from usePalette so it re-themes under high contrast).
 *
 * R2 depth model — the medal sits IN the shelf, not on it:
 * - The WELL is a visibly recessed woodInset disc: woodDark border with a
 *   woodLight bottom edge (light catches the lower lip of a recess).
 * - An ACHIEVED medal wears a lit rim (sunlight top edge on the goldDeep ring)
 *   and casts `shadows.lifted`; the shadow lives on a wrapper because the ring
 *   clips its glint with overflow:hidden (masksToBounds would eat the shadow).
 * - A LOCKED medal is a darker recessed disc; the lock glyph is creamBright at
 *   ~55% so it reads on brown (inkFaint vanished). Zero recipe leak.
 */
function ComboMedal({
  combo,
  size = MEDAL_SIZE,
  glintIndex = null,
}: {
  combo: CatalogComboRow;
  size?: number;
  /** Mount-glint stagger slot for this medal (grid only). Null / omitted (the
   *  modal hero) means no sweep — the hook stays inactive. */
  glintIndex?: number | null;
}) {
  const p = usePalette();
  const styles = useThemedStyles(makeStyles);
  const { g, active: glinting } = useGlint(glintIndex);
  const ring = Math.round(size * 0.78);
  const disc = Math.round(size * 0.6);
  const spriteSize = Math.round(size * 0.42);
  const tagSize = Math.round(size * 0.36);
  const lockSize = Math.round(size * 0.32);
  // Sweep bounds scale with the ring so the streak fully crosses any size.
  const glintStyle = useAnimatedStyle(() => ({
    opacity: interpolate(g.value, [0, 0.5, 1], [0, 0.55, 0], Extrapolation.CLAMP),
    transform: [
      { translateX: interpolate(g.value, [0, 1], [-ring * 0.75, ring * 1.05]) },
      { rotate: '20deg' },
    ],
  }));

  // B-M16 (human: medals "look square, clipped by view height"): the circle was
  // never clipped — a lime-probe screenshot showed the full round well — it READ
  // square because woodDark-on-shelfWood left the upper arc invisible; only the
  // woodLight bottom lip drew. The ring is now `shadow` (a clearly darker brown
  // in both palettes) so the entire circle reads; the lit lower lip stays.
  const well: ViewStyle = {
    alignItems: 'center',
    backgroundColor: p.woodInset,
    borderColor: p.shadow,
    // Recessed lighting: dark upper lip, light catches the lower lip.
    borderBottomColor: p.woodLight,
    borderRadius: size / 2,
    borderWidth: borders.strong,
    height: size,
    justifyContent: 'center',
    width: size,
  };

  if (!combo.achieved) {
    return (
      <View style={well}>
        <View
          style={{
            alignItems: 'center',
            backgroundColor: p.woodDark,
            borderColor: p.woodDark,
            borderBottomColor: p.woodInset,
            borderRadius: ring / 2,
            borderWidth: borders.regular,
            height: ring,
            justifyContent: 'center',
            width: ring,
          }}
        >
          <MaterialCommunityIcons
            name="lock"
            size={lockSize}
            color={p.creamBright}
            style={lockGlyphOpacity}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={well}>
      {/* Shadow wrapper: the ring clips (for the glint), so the lift lives here. */}
      <View style={[{ borderRadius: ring / 2 }, shadows.lifted]}>
        <View
          style={{
            alignItems: 'center',
            backgroundColor: p.coinGold,
            borderColor: p.goldDeep,
            // Lit rim: the top edge catches the light.
            borderTopColor: p.sunlight,
            borderRadius: ring / 2,
            borderWidth: borders.strong,
            height: ring,
            justifyContent: 'center',
            overflow: 'hidden',
            width: ring,
          }}
        >
          <View
            style={{
              alignItems: 'center',
              backgroundColor: p.sunlight,
              borderRadius: disc / 2,
              height: disc,
              justifyContent: 'center',
              width: disc,
            }}
          >
            <ComboMedalCenter slot={combo.center} spriteSize={spriteSize} tagSize={tagSize} />
          </View>
          {glinting ? <Animated.View pointerEvents="none" style={[styles.medalGlint, glintStyle]} /> : null}
        </View>
      </View>
    </View>
  );
}

/** Locked lock-glyph emphasis: creamBright softened so it reads carved, not lit. */
const lockGlyphOpacity = { opacity: 0.55 } as const;

/**
 * One trophy-shelf cell: the medal + its "×N" ribbon + name. Achieved medals are
 * the owned collectible — pressable (spring, uniform scale) and open the detail
 * modal; they MINT (reveal ring + pop) when newly earned, else GLINT once on
 * mount. Locked medals show "???" + "Arrange to discover" and are inert.
 */
function ComboMedalCell({
  combo,
  revealIndex,
  glintIndex,
  onOpenCombo,
}: {
  combo: CatalogComboRow;
  revealIndex: number | null;
  glintIndex: number | null;
  onOpenCombo: (comboId: string) => void;
}) {
  const styles = useThemedStyles(makeStyles);
  const palette = usePalette();
  const reduced = useReducedMotion();
  const { pop, shine, active: minting } = useReveal(revealIndex);
  const press = useSharedValue(1);

  const contentStyle = useAnimatedStyle(() => {
    const revealScale = interpolate(pop.value, [0, 1], [0.9, 1]);
    return {
      opacity: interpolate(pop.value, [0, 0.4], [0, 1], Extrapolation.CLAMP),
      transform: [{ scale: press.value * revealScale }],
    };
  });
  const revealRingStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shine.value, [0, 0.35, 1], [0, 0.9, 0], Extrapolation.CLAMP),
    transform: [{ scale: interpolate(shine.value, [0, 1], [0.85, 1.15]) }],
  }));

  const body = (
    <>
      <View style={styles.medalStack}>
        <ComboMedal combo={combo} glintIndex={glintIndex} />
        {minting ? (
          <Animated.View pointerEvents="none" style={[styles.medalRevealRing, revealRingStyle]} />
        ) : null}
        {combo.isNew ? (
          <View style={styles.medalNewBadge}>
            <View style={styles.newBadge}>
              <AppText variant="label" color={palette.creamBright} style={styles.newBadgeText}>
                NEW
              </AppText>
            </View>
          </View>
        ) : null}
      </View>
      {combo.achieved ? (
        <View style={styles.medalCountChip}>
          <AppText variant="stat" color={palette.ink} style={styles.medalCountText}>
            {`×${combo.count}`}
          </AppText>
        </View>
      ) : null}
      {/* R2: text ON WOOD must be light — creamBright names, parchment mystery
          lines. Dark ink vanished on the brown bed. */}
      <AppText
        variant="heading"
        color={combo.achieved ? palette.creamBright : palette.parchment}
        numberOfLines={2}
        style={styles.medalName}
      >
        {combo.achieved ? combo.name : '???'}
      </AppText>
      {combo.achieved ? null : (
        <AppText variant="label" color={palette.parchment} numberOfLines={2} style={styles.medalLockHint}>
          Arrange to discover
        </AppText>
      )}
    </>
  );

  if (!combo.achieved) {
    return <Animated.View style={[styles.shelfCell, contentStyle]}>{body}</Animated.View>;
  }
  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={`${combo.name} combo, achieved ${combo.count} times — view details`}
      onPress={() => onOpenCombo(combo.comboId)}
      style={[styles.shelfCell, contentStyle]}
      onPressIn={() => {
        if (!reduced) press.value = withTiming(0.95, { duration: motion.durations.tick });
      }}
      onPressOut={() => {
        press.value = reduced ? 1 : withSpring(1, motion.springs.settle);
      }}
    >
      {body}
    </AnimatedPressable>
  );
}

/**
 * An inert ItemInstance for the recipe diagram — just enough for ItemSprite to
 * render the real gameplay card (sprite + cream plinth). Display-only: zeroed
 * stats, default state, value hidden at the call site. The id comes from the
 * view model (a recipe id or a DISCOVERED example id), never from @/items.
 */
function diagramInstance(itemId: string): ItemInstance {
  return {
    instanceId: `diagram-${itemId}`,
    itemId,
    name: itemId,
    tier: 1,
    baseValue: 0,
    tags: [],
    state: {
      ageDays: 0,
      growthDays: 0,
      countdown: null,
      sticky: false,
      blocked: false,
      transformedFromItemId: null,
    },
  };
}

/**
 * The recipe diagram (modal-only since COMBO-2): a plus-shaped shelf cluster —
 * a gold-framed center well with `adjacentCount` filled neighbor wells around
 * it (the rest stay empty recessed wells). Slots render REAL gameplay item
 * cards (R1): an item slot shows its own ItemSprite card; a tag slot shows a
 * representative DISCOVERED item's card wearing a small TagIcon corner chip
 * ("any food item — like this one"), falling back to the bare tag glyph when
 * nothing with that tag has been discovered (no sprite leak). Only ever
 * rendered for an achieved combo.
 */
function RecipeDiagram({ combo }: { combo: CatalogComboRow }) {
  const styles = useThemedStyles(makeStyles);
  // Fill order around the center: flank horizontally first (reads as a pairing),
  // then up, then down. count is 1–3, so `down` is only used at higher counts.
  const order: ('right' | 'left' | 'up' | 'down')[] = ['right', 'left', 'up', 'down'];
  const filled = new Set(order.slice(0, combo.adjacentCount));
  const neighbor = (pos: 'right' | 'left' | 'up' | 'down') =>
    filled.has(pos) ? combo.adjacent : null;

  return (
    <View style={styles.recipe}>
      <View style={styles.recipeRow}>
        <RecipeSlot slot={neighbor('up')} exampleItemId={combo.adjacentExampleItemId} />
      </View>
      <View style={styles.recipeRow}>
        <RecipeSlot slot={neighbor('left')} exampleItemId={combo.adjacentExampleItemId} />
        <RecipeSlot slot={combo.center} exampleItemId={combo.centerExampleItemId} isCenter />
        <RecipeSlot slot={neighbor('right')} exampleItemId={combo.adjacentExampleItemId} />
      </View>
      <View style={styles.recipeRow}>
        <RecipeSlot slot={neighbor('down')} exampleItemId={combo.adjacentExampleItemId} />
      </View>
    </View>
  );
}

/** One well of the recipe cluster: a real item card (the slot's own item, or a
 *  discovered example for a tag slot + a TagIcon corner chip), the bare tag
 *  glyph when no example exists, or an empty recessed well (null). */
function RecipeSlot({
  slot,
  exampleItemId = null,
  isCenter = false,
}: {
  slot: ComboSlot | null;
  exampleItemId?: string | null;
  isCenter?: boolean;
}) {
  const styles = useThemedStyles(makeStyles);
  if (!slot) return <View style={[styles.recipeWell, styles.recipeWellEmpty]} />;
  const wellStyle = [styles.recipeWell, isCenter && styles.recipeWellCenter];
  // An item slot IS its card.
  if (slot.kind === 'item') {
    return (
      <View style={wellStyle}>
        <ItemSprite item={diagramInstance(slot.itemId)} glyph="?" size={RECIPE_CARD_SIZE} hideValue />
      </View>
    );
  }
  // A tag slot borrows the discovered example's card, marked "any <tag> item"
  // by a corner chip; no discovered example → bare tag glyph (never a leak).
  if (exampleItemId) {
    return (
      <View style={wellStyle}>
        <ItemSprite item={diagramInstance(exampleItemId)} glyph="?" size={RECIPE_CARD_SIZE} hideValue />
        <View style={styles.recipeTagChip} pointerEvents="none">
          <TagIcon tag={slot.tag} size={11} />
        </View>
      </View>
    );
  }
  return (
    <View style={wellStyle}>
      <TagIcon tag={slot.tag} size={22} />
    </View>
  );
}

/**
 * CAT-3 item showcase modal — an "unforgettable" close-up of a discovered item.
 * A dim scrim fades in; the card springs up (uniform scale + translateY) wearing
 * the item's rarity BAND framing (HEIRLOOM gold bed + crown, RARE brass frame…),
 * a big sprite on a layered radial-feel bed, name, band chip, TagIcon tags, a
 * coin value, and the "WHAT IT DOES" rule sentences. One gold shine ring pulses
 * as it opens (CAT-1 language — not confetti). Reduced motion snaps everything.
 * Its animators mount only while the modal is open (Modal unmounts on close).
 */
function ItemShowcaseModal({ row, onClose }: { row: CatalogItemRow | null; onClose: () => void }) {
  return (
    <Modal
      visible={row !== null}
      transparent
      statusBarTranslucent
      animationType="none"
      onRequestClose={onClose}
    >
      {row ? <ShowcaseCard row={row} onClose={onClose} /> : null}
    </Modal>
  );
}

/**
 * The shared showcase shell (CAT-3 language, reused by COMBO-2). Owns the dim
 * scrim fade, the card spring-up (uniform scale + translateY), the tap-outside
 * dismiss, the close button, and the one gold shine ring that pulses on open —
 * so the item and combo modals share one animation body instead of forking it.
 * The caller supplies the card frame style and the inner content. Reduced motion
 * snaps everything. Animators mount only while the modal is open.
 */
function ShowcaseScaffold({
  onClose,
  cardStyle,
  accessibilityLabel,
  children,
}: {
  onClose: () => void;
  cardStyle: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  children: React.ReactNode;
}) {
  const styles = useThemedStyles(makeStyles);
  const palette = usePalette();
  const reduced = useReducedMotion();

  const enter = useSharedValue(reduced ? 1 : 0);
  const shine = useSharedValue(reduced ? 1 : 0);
  useEffect(() => {
    if (reduced) {
      enter.value = 1;
      shine.value = 1;
      return;
    }
    enter.value = withSpring(1, motion.springs.settle);
    shine.value = withTiming(1, { duration: REVEAL_SHINE_MS, easing: easings.out });
  }, [reduced, enter, shine]);

  const scrimStyle = useAnimatedStyle(() => ({ opacity: enter.value }));
  const enterStyle = useAnimatedStyle(() => ({
    opacity: interpolate(enter.value, [0, 0.5], [0, 1], Extrapolation.CLAMP),
    transform: [
      { translateY: interpolate(enter.value, [0, 1], [24, 0]) },
      { scale: interpolate(enter.value, [0, 1], [0.9, 1]) },
    ],
  }));
  const shineStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shine.value, [0, 0.35, 1], [0, 0.8, 0], Extrapolation.CLAMP),
    transform: [{ scale: interpolate(shine.value, [0, 1], [0.92, 1.06]) }],
  }));

  return (
    <Animated.View style={[styles.modalScrim, scrimStyle]}>
      {/* Scrim tap dismisses. The card sits above it (an absolute-fill Pressable
          behind the card so a tap outside closes, a tap on the card doesn't). */}
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
      <Animated.View style={[cardStyle, enterStyle]} accessibilityLabel={accessibilityLabel}>
        <Pressable style={styles.modalClose} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close">
          <MaterialCommunityIcons name="close" size={18} color={palette.inkSoft} />
        </Pressable>
        {children}
        <Animated.View pointerEvents="none" style={[styles.modalShine, shineStyle]} />
      </Animated.View>
    </Animated.View>
  );
}

function ShowcaseCard({ row, onClose }: { row: CatalogItemRow; onClose: () => void }) {
  const styles = useThemedStyles(makeStyles);
  const palette = usePalette();
  const sprite = spriteFor(row.id);
  const bandName = RARITY_BANDS.find((b) => b.tier === row.tier)?.name ?? 'COMMON';

  return (
    <ShowcaseScaffold onClose={onClose} cardStyle={[styles.modalCard, bandBed(row.tier, styles)]}>
      <View style={styles.modalSpriteBed}>
        <View style={styles.modalSpriteRing} pointerEvents="none" />
        <View style={styles.modalSpriteHalo} pointerEvents="none" />
        {sprite ? (
          <Image source={sprite} style={styles.modalSprite} resizeMode="contain" />
        ) : (
          <AppText variant="display" color={palette.inkFaint}>?</AppText>
        )}
        {row.tier === 4 ? (
          <View pointerEvents="none" style={styles.modalCrown}>
            <MaterialCommunityIcons name="crown" size={18} color={palette.goldDeep} />
          </View>
        ) : null}
      </View>

      <AppText variant="title" color={palette.ink} style={styles.modalName}>
        {row.name}
      </AppText>

      <View style={styles.modalBandChip}>
        <AppText variant="label" color={palette.goldDeep} style={styles.modalBandChipText}>
          {bandName}
        </AppText>
      </View>

      {row.tags.length > 0 ? (
        <View style={styles.modalTags}>
          {row.tags.map((tag) => (
            <View key={tag} style={styles.modalTagChip}>
              <TagIcon tag={tag} size={14} />
              <AppText variant="label" color={palette.inkSoft} style={styles.modalTagText}>
                {tag}
              </AppText>
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.modalValueRow}>
        <View style={styles.modalCoinDot} />
        <AppText variant="stat" color={palette.ink}>{row.baseValue}</AppText>
      </View>

      <View style={styles.modalDivider} />

      <View style={styles.modalSection}>
        <SectionLabel>WHAT IT DOES</SectionLabel>
        <View style={styles.modalRuleList}>
          {row.ruleSentences.map((sentence, index) => (
            <View key={index} style={styles.modalRule}>
              <View style={styles.modalRuleBullet} />
              <AppText variant="body" color={palette.inkSoft} style={styles.modalRuleText}>
                {sentence}
              </AppText>
            </View>
          ))}
        </View>
      </View>
    </ShowcaseScaffold>
  );
}

/**
 * COMBO-2 combo detail modal — the premium reveal beat. Opens only for an
 * ACHIEVED combo (a locked medal never opens it). Echoes the item showcase
 * anatomy via the shared scaffold: the medal blown up as a hero, the combo name,
 * the derived unlock sentence ("Arrange 2 food items around a Bread Loaf"), the
 * recipe diagram (which now lives here, not on the grid), and "×N achieved".
 */
function ComboShowcaseModal({ row, onClose }: { row: CatalogComboRow | null; onClose: () => void }) {
  return (
    <Modal
      visible={row !== null}
      transparent
      statusBarTranslucent
      animationType="none"
      onRequestClose={onClose}
    >
      {row ? <ComboShowcaseCard row={row} onClose={onClose} /> : null}
    </Modal>
  );
}

function ComboShowcaseCard({ row, onClose }: { row: CatalogComboRow; onClose: () => void }) {
  const styles = useThemedStyles(makeStyles);
  const palette = usePalette();
  return (
    <ShowcaseScaffold
      onClose={onClose}
      cardStyle={styles.comboModalCard}
      accessibilityLabel={`${row.name} combo details`}
    >
      <ComboMedal combo={row} size={128} />

      <AppText variant="title" color={palette.ink} style={styles.modalName}>
        {row.name}
      </AppText>

      <AppText variant="body" color={palette.inkSoft} style={styles.comboModalUnlock}>
        {row.unlockSentence}
      </AppText>

      <View style={styles.modalDivider} />

      <RecipeDiagram combo={row} />

      <AppText variant="stat" color={palette.accentTeal} style={styles.comboModalCount}>
        {`×${row.count} achieved`}
      </AppText>
    </ShowcaseScaffold>
  );
}
