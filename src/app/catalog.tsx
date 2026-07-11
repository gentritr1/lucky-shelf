import { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, View } from 'react-native';
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
} from 'react-native-reanimated';

import {
  AppText,
  Medallion,
  Panel,
  SectionLabel,
  TopBar,
  layout,
  motion,
  spacing,
  usePalette,
  useReducedMotion,
  useThemedStyles,
} from '@/ui';
import { easings, spriteFor } from '@/juice';

import { makeStyles } from '@/screen-styles/catalog.styles';
import {
  buildCatalogView,
  catalogBands,
  catalogSelectors,
  useCatalogStore,
  type CatalogComboRow,
  type CatalogItemRow,
  type CatalogView,
} from '../state/catalogStore';

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

type CatalogTab = 'items' | 'combos';

/** At most this many cards play the reveal at once; the rest snap in already-owned. */
const MAX_REVEAL = 8;
const REVEAL_STAGGER_MS = 90;
const REVEAL_SHINE_MS = 520;

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
  const params = useLocalSearchParams<{ tab?: string }>();
  const [tab, setTab] = useState<CatalogTab>(params.tab === 'combos' ? 'combos' : 'items');

  useEffect(() => {
    void loadCatalog().catch(() => undefined);
  }, [loadCatalog]);

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

  return (
    <View style={[styles.screen, { paddingTop: insets.top + layout.screenTopGap }]}>
      <TopBar title="Catalog" backLabel="‹ Menu" onBack={() => router.dismissTo('/')} />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + layout.screenBottomGap }]}
        showsVerticalScrollIndicator={false}
      >
        <CompletionHeader view={view} stats={catalog.stats} />

        <SegmentedTabs
          tab={tab}
          onChange={setTab}
          itemsLabel={`ITEMS ${view.itemsDiscovered}/${view.itemsTotal}`}
          combosLabel={`COMBOS ${view.combosAchieved}/${view.combosTotal}`}
        />

        {/* Conditional render: only the active tab is mounted, so its reveal
            plans (and animators) exist only while it is on screen. */}
        {tab === 'items' ? <ItemsTab view={view} /> : <CombosTab view={view} />}
      </ScrollView>
    </View>
  );
}

/** The persistent completion header — count-up %, fill bar, four best-run stats.
 *  Stays visible above both tabs. */
function CompletionHeader({
  view,
  stats,
}: {
  view: CatalogView;
  stats: { runsPlayed: number; bestDayTotal: number; deepestRentSurvived: number; totalCoinsAllTime: number };
}) {
  const styles = useThemedStyles(makeStyles);
  const palette = usePalette();
  return (
    <Panel style={styles.summary}>
      <View style={styles.completionRow}>
        <CompletionNumber pct={view.completionPct} />
        <AppText variant="label" color={palette.inkFaint}>COLLECTED</AppText>
      </View>
      <View style={styles.progressTrack}>
        <ProgressFill pct={view.completionPct} />
      </View>
      <View style={styles.statsGrid}>
        <Stat label="Runs" value={String(stats.runsPlayed)} />
        <Stat label="Best day" value={`${stats.bestDayTotal}c`} />
        <Stat label="Deepest rent" value={String(stats.deepestRentSurvived)} />
        <Stat label="All-time" value={`${stats.totalCoinsAllTime}c`} />
      </View>
    </Panel>
  );
}

/**
 * The ITEMS / COMBOS segmented control: a parchment track with a cream pill that
 * slides under the selected label. The pill animates with translateX only (never
 * scaleX/scaleY — those collapse the view on Fabric); reduced motion snaps it.
 */
function SegmentedTabs({
  tab,
  onChange,
  itemsLabel,
  combosLabel,
}: {
  tab: CatalogTab;
  onChange: (tab: CatalogTab) => void;
  itemsLabel: string;
  combosLabel: string;
}) {
  const styles = useThemedStyles(makeStyles);
  const palette = usePalette();
  const reduced = useReducedMotion();
  const [trackWidth, setTrackWidth] = useState(0);
  const index = tab === 'items' ? 0 : 1;
  const half = Math.max(0, (trackWidth - spacing.xs * 2) / 2);
  const x = useSharedValue(0);

  useEffect(() => {
    const target = index * half;
    if (reduced || half === 0) {
      x.value = target;
    } else {
      x.value = withSpring(target, motion.springs.settle);
    }
  }, [index, half, reduced, x]);

  const pillStyle = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  return (
    <View style={styles.segment} onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}>
      {half > 0 ? <Animated.View style={[styles.segmentPill, { width: half }, pillStyle]} /> : null}
      <Pressable style={styles.segmentBtn} onPress={() => onChange('items')} accessibilityRole="tab">
        <AppText
          variant="label"
          color={index === 0 ? palette.ink : palette.inkFaint}
          style={styles.segmentLabel}
        >
          {itemsLabel}
        </AppText>
      </Pressable>
      <Pressable style={styles.segmentBtn} onPress={() => onChange('combos')} accessibilityRole="tab">
        <AppText
          variant="label"
          color={index === 1 ? palette.ink : palette.inkFaint}
          style={styles.segmentLabel}
        >
          {combosLabel}
        </AppText>
      </Pressable>
    </View>
  );
}

/**
 * The Items tab: a quiet rarity legend (the "what can be achieved" map), then the
 * cards grouped into bands rarest-first, each with a per-band discovered/total
 * count. The one-time reveal is planned here on first mount (see planReveals).
 */
function ItemsTab({ view }: { view: CatalogView }) {
  const styles = useThemedStyles(makeStyles);
  const palette = usePalette();
  const bands = useMemo(() => catalogBands(view.items), [view.items]);
  // Reveal plan for THIS tab, computed once on its first mount, in screen order
  // (rarest band first). Re-mounting on a tab switch replans, but planReveals
  // no-ops on already-revealed ids, so the reveal never replays.
  const [revealPlan] = useState(() =>
    planReveals(bands.flatMap((b) => b.items).filter((i) => i.isNew).map((i) => i.id)),
  );

  const legend = bands.map((b) => `${b.name} ${b.discovered}/${b.total}`).join('  ·  ');

  return (
    <>
      <View style={styles.legend}>
        <AppText variant="label" color={palette.inkFaint} style={styles.legendText}>
          {legend}
        </AppText>
      </View>

      {bands.map((band) => (
        <View key={band.tier} style={styles.band}>
          <SectionLabel>{`${band.name} — ${band.discovered}/${band.total}`}</SectionLabel>
          <View style={styles.grid}>
            {band.items.map((item) => (
              <ItemStamp key={item.id} item={item} revealIndex={revealPlan.get(item.id) ?? null} />
            ))}
          </View>
        </View>
      ))}
    </>
  );
}

/** The Combos tab: the Medallion rows, each achieved row carrying its earn-count
 *  context. Its reveal is planned on this tab's first mount. */
function CombosTab({ view }: { view: CatalogView }) {
  const styles = useThemedStyles(makeStyles);
  const [revealPlan] = useState(() =>
    planReveals(view.combos.filter((c) => c.isNew).map((c) => c.comboId)),
  );
  return (
    <View style={styles.comboList}>
      {view.combos.map((combo) => (
        <ComboStamp
          key={combo.comboId}
          combo={combo}
          revealIndex={revealPlan.get(combo.comboId) ?? null}
        />
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

function CompletionNumber({ pct }: { pct: number }) {
  const palette = usePalette();
  const value = useCountUp(pct);
  return (
    <AppText variant="display" color={palette.accentTeal}>
      {value}%
    </AppText>
  );
}

/** The header progress bar fills 0 → pct% on mount over the same ~600ms beat. */
function ProgressFill({ pct }: { pct: number }) {
  const styles = useThemedStyles(makeStyles);
  const reduced = useReducedMotion();
  const w = useSharedValue(reduced ? pct : 0);
  useEffect(() => {
    if (reduced) {
      w.value = pct;
      return;
    }
    w.value = withTiming(pct, { duration: motion.durations.banner, easing: easings.out });
  }, [pct, reduced, w]);
  const style = useAnimatedStyle(() => ({ width: `${w.value}%` }));
  return <Animated.View style={[styles.progressFill, style]} />;
}

function Stat({ label, value }: { label: string; value: string }) {
  const styles = useThemedStyles(makeStyles);
  const palette = usePalette();
  return (
    <View style={styles.stat}>
      <AppText variant="stat" color={palette.ink}>{value}</AppText>
      <AppText variant="label" color={palette.inkFaint} style={styles.statLabel}>{label}</AppText>
    </View>
  );
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

function ItemStamp({ item, revealIndex }: { item: CatalogItemRow; revealIndex: number | null }) {
  // Locked ≠ undiscovered (B-M5 Part 2): a locked ladder item shows its real
  // silhouette + unlock hint (+ CAT-1 progress tick), so it reads as "earn this".
  if (item.locked) return <LockedStamp item={item} />;
  if (item.discovered) return <FoundStamp item={item} revealIndex={revealIndex} />;
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
function FoundStamp({ item, revealIndex }: { item: CatalogItemRow; revealIndex: number | null }) {
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

function ComboStamp({ combo, revealIndex }: { combo: CatalogComboRow; revealIndex: number | null }) {
  const styles = useThemedStyles(makeStyles);
  const palette = usePalette();
  const { pop, shine, active } = useReveal(revealIndex);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pop.value, [0, 0.4], [0, 1], Extrapolation.CLAMP),
    transform: [{ scale: interpolate(pop.value, [0, 1], [0.9, 1]) }],
  }));
  const ringStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shine.value, [0, 0.35, 1], [0, 0.9, 0], Extrapolation.CLAMP),
    transform: [{ scale: interpolate(shine.value, [0, 1], [0.94, 1.12]) }],
  }));

  return (
    <Animated.View
      style={[
        styles.combo,
        combo.achieved ? styles.comboFound : styles.comboLocked,
        combo.isNew && styles.comboNew,
        cardStyle,
      ]}
    >
      <Medallion size={34} earned={combo.achieved} />
      <View style={styles.comboText}>
        <AppText variant="heading" color={palette.ink} numberOfLines={1} style={styles.comboName}>
          {combo.achieved ? combo.name : 'Undiscovered combo'}
        </AppText>
        {combo.achieved ? (
          <>
            <AppText variant="body" color={palette.accentTeal} style={styles.comboCount}>×{combo.count}</AppText>
            <AppText variant="label" color={palette.inkFaint} style={styles.comboContext}>
              {`Achieved ${combo.count} ${combo.count === 1 ? 'time' : 'times'}`}
            </AppText>
          </>
        ) : (
          <AppText variant="body" color={palette.inkFaint} style={styles.comboHint}>Arrange to discover</AppText>
        )}
      </View>
      {/* B-M11: subtle "new" stamp accent for a combo the latest run first achieved */}
      {combo.isNew ? (
        <View style={styles.newBadge}>
          <AppText variant="label" color={palette.creamBright} style={styles.newBadgeText}>NEW</AppText>
        </View>
      ) : null}
      {active ? <Animated.View pointerEvents="none" style={[styles.revealRing, ringStyle]} /> : null}
    </Animated.View>
  );
}
