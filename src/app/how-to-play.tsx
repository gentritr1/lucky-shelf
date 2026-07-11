import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
  type ListRenderItemInfo,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  AppText,
  Medallion,
  TopBar,
  WoodButton,
  layout,
  motion,
  spacing,
  usePalette,
  useReducedMotion,
  useThemedStyles,
} from '@/ui';
import { spriteFor } from '@/juice';

import { makeStyles } from '@/screen-styles/how-to-play.styles';
import {
  howToPlayGlossary,
  howToPlaySynergy,
  howToPlayTwists,
  type GlossaryGroup,
} from '../state/howToPlayView';

type Styles = ReturnType<typeof makeStyles>;
type MCIName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

interface Page {
  key: string;
  title: string;
  /** Short small-caps name for the section rail chip (HTP-2). Kept to ≤6 chars so
   *  the full set reads on one line at iPhone-SE width; the rail scrolls if not. */
  chip: string;
  /** When true, the page claims the full page height instead of centring a short
   *  block — used by the glossary so its inner vertical ScrollView has a bounded
   *  box to scroll within (GLOS-1). */
  fill?: boolean;
  render: (styles: Styles, palette: ReturnType<typeof usePalette>) => React.ReactNode;
}

function Sprite({ id, style }: { id: string; style: object }) {
  const source = spriteFor(id);
  if (source === null) return null;
  return <Image source={source as number} style={style} resizeMode="contain" />;
}

/**
 * How to Play (ONB-1): a horizontally swipeable, illustrated teach for the core
 * loop, scoring rules, multipliers, combos, rent, and the day's twists. Pure
 * documentation — reachable from the menu, tracks nothing, persists nothing.
 *
 * Flag-gated pages (the daily twists) mirror the run HUD's gating via
 * `howToPlayTwists()` so the section never teaches a mechanic the player can't
 * currently see (the screen itself must not value-import `@/sim`).
 */
export default function HowToPlayScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(makeStyles);
  const palette = usePalette();
  const reduced = useReducedMotion();
  const { width } = useWindowDimensions();

  const twists = useMemo(() => howToPlayTwists(), []);
  const synergy = useMemo(() => howToPlaySynergy(), []);
  const glossary = useMemo(() => howToPlayGlossary(), []);
  const pages = useMemo(
    () => buildPages(twists, synergy, glossary),
    [twists, synergy, glossary],
  );

  // Optional `?page=N` deep link so each page is reachable without a swipe
  // (used for per-page verification; inert in normal use, defaults to page 0).
  const params = useLocalSearchParams<{ page?: string }>();
  const initialPage = clampIndex(parseInt(params.page ?? '', 10), pages.length);

  const listRef = useRef<FlatList<Page>>(null);
  const [active, setActive] = useState(initialPage);

  // Rail auto-scroll (HTP-2): the rail is the map, so the active chip must stay
  // visible even when the chip set overflows the track (RENT/TWISTS sit
  // off-right on phone widths). Chips are variable-width inside a horizontal
  // ScrollView, so each records its x/width via onLayout into a ref map, and the
  // rail scrollTo's the active chip behind a small left margin whenever `active`
  // changes. The mount case (deep link to a late page) is handled inside the
  // onLayout callback itself: layout lands after the first effect run, so the
  // effect alone would no-op before the map has the active chip's frame.
  const railRef = useRef<ScrollView>(null);
  const chipLayouts = useRef(new Map<number, { x: number; width: number }>());
  const railPositioned = useRef(false);

  const scrollRailToChip = useCallback((index: number, animated: boolean) => {
    const chip = chipLayouts.current.get(index);
    if (!chip) return;
    // Clamp to >= 0; the right edge is clamped natively by the ScrollView.
    railRef.current?.scrollTo({ x: Math.max(0, chip.x - spacing.xl), animated });
  }, []);

  const onChipLayout = useCallback(
    (index: number, x: number, chipWidth: number) => {
      chipLayouts.current.set(index, { x, width: chipWidth });
      // Mount positioning: snap (never animated) once the initially-active
      // chip's own frame arrives, then hand off to the `active` effect below.
      if (!railPositioned.current && index === active) {
        railPositioned.current = true;
        scrollRailToChip(index, false);
      }
    },
    [active, scrollRailToChip],
  );

  useEffect(() => {
    if (!railPositioned.current) return; // mount handled by onChipLayout
    scrollRailToChip(active, !reduced); // reduced motion jumps without animation
  }, [active, reduced, scrollRailToChip]);

  const onMomentumEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (width <= 0) return;
      const index = Math.round(event.nativeEvent.contentOffset.x / width);
      setActive(clampIndex(index, pages.length));
    },
    [width, pages.length],
  );

  // Jump the pager to a page and sync the active marker (rail chip tap + Next).
  // Same scrollToIndex call the deep link and Next button use; animated unless
  // reduced motion, which snaps (getItemLayout below makes the jump reliable).
  const goToPage = useCallback(
    (index: number) => {
      const target = clampIndex(index, pages.length);
      listRef.current?.scrollToIndex({ index: target, animated: !reduced });
      setActive(target);
    },
    [pages.length, reduced],
  );

  const onPrimary = useCallback(() => {
    if (active >= pages.length - 1) {
      router.dismissTo('/');
      return;
    }
    goToPage(active + 1);
  }, [active, pages.length, goToPage, router]);

  const getItemLayout = useCallback(
    (_: ArrayLike<Page> | null | undefined, index: number) => ({
      length: width,
      offset: width * index,
      index,
    }),
    [width],
  );

  const renderItem = useCallback(
    ({ item, index }: ListRenderItemInfo<Page>) => (
      // `fill` pages (the glossary) claim the full page height so their own
      // vertical ScrollView has a bounded box to scroll inside; the default
      // pages stay short and vertically centred.
      <PageFrame width={width} active={index === active} reduced={reduced} fill={!!item.fill}>
        <View style={[styles.pageInner, item.fill && styles.pageInnerFill]}>
          <AppText variant="title" color={palette.ink} align="center" style={styles.heading}>
            {item.title}
          </AppText>
          {item.render(styles, palette)}
        </View>
      </PageFrame>
    ),
    [width, active, reduced, styles, palette],
  );

  const onLast = active >= pages.length - 1;

  return (
    <View style={[styles.screen, { paddingTop: insets.top + layout.screenTopGap }]}>
      <TopBar
        title="How to Play"
        onBack={() => router.dismissTo('/')}
        right={
          onLast ? undefined : (
            <Pressable
              accessibilityRole="button"
              hitSlop={12}
              onPress={() => router.dismissTo('/')}
            >
              <AppText variant="heading" color={palette.inkFaint}>
                Skip
              </AppText>
            </Pressable>
          )
        }
      />

      {/* Section rail (HTP-2): the "map" — tap to jump to any section so the
          screen doubles as a rules reference. The active chip follows `active`,
          the same state the dots read and `onMomentumEnd` updates on swipe, so
          rail and dots always agree without a second scroll listener. */}
      <ScrollView
        ref={railRef}
        style={styles.rail}
        contentContainerStyle={styles.railContent}
        horizontal
        showsHorizontalScrollIndicator={false}
        accessibilityRole="tablist"
      >
        {pages.map((page, index) => (
          <SectionChip
            key={page.key}
            label={page.chip}
            active={index === active}
            reduced={reduced}
            styles={styles}
            palette={palette}
            onPress={() => goToPage(index)}
            onChipLayout={(x, chipWidth) => onChipLayout(index, x, chipWidth)}
          />
        ))}
      </ScrollView>

      <FlatList
        ref={listRef}
        style={styles.pager}
        data={pages}
        keyExtractor={(page) => page.key}
        renderItem={renderItem}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        initialScrollIndex={initialPage}
        getItemLayout={getItemLayout}
        onScrollToIndexFailed={() => undefined}
        onMomentumScrollEnd={onMomentumEnd}
      />

      <View style={styles.dotsRow} accessibilityRole="tablist">
        {pages.map((page, index) => (
          <Dot key={page.key} active={index === active} reduced={reduced} styles={styles} />
        ))}
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + layout.screenBottomGap }]}>
        <WoodButton label={onLast ? 'Got it!' : 'Next ›'} onPress={onPrimary} />
      </View>
    </View>
  );
}

/** Per-page settle: a small uniform-scale + rise when the page becomes active. */
function PageFrame({
  width,
  active,
  reduced,
  fill,
  children,
}: {
  width: number;
  active: boolean;
  reduced: boolean;
  fill?: boolean;
  children: React.ReactNode;
}) {
  const styles = useThemedStyles(makeStyles);
  const enter = useSharedValue(active && !reduced ? 0 : 1);

  useEffect(() => {
    if (!active) return;
    if (reduced) {
      enter.value = 1;
      return;
    }
    enter.value = 0;
    enter.value = withTiming(1, { duration: motion.durations.settle });
  }, [active, reduced, enter]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: 0.4 + 0.6 * enter.value,
    // Single uniform scale (separate scaleX/scaleY collapse views on Fabric).
    transform: [{ scale: 0.96 + 0.04 * enter.value }, { translateY: (1 - enter.value) * 8 }],
  }));

  return (
    <View style={[styles.page, fill && styles.pageFill, { width }]}>
      <Animated.View style={[styles.pageInner, fill && styles.pageInnerFill, animStyle]}>
        {children}
      </Animated.View>
    </View>
  );
}

/** Active page dot widens to a gold lozenge; reduced motion snaps the width. */
function Dot({ active, reduced, styles }: { active: boolean; reduced: boolean; styles: Styles }) {
  const grow = useSharedValue(active ? 1 : 0);

  useEffect(() => {
    if (reduced) {
      grow.value = active ? 1 : 0;
      return;
    }
    grow.value = withTiming(active ? 1 : 0, { duration: motion.durations.snap });
  }, [active, reduced, grow]);

  const animStyle = useAnimatedStyle(() => ({
    width: 8 + 14 * grow.value,
    opacity: 0.5 + 0.5 * grow.value,
  }));

  return <Animated.View style={[styles.dot, active && styles.dotActive, animStyle]} />;
}

/**
 * A section-rail chip. The cream selection pill fades in under the label when the
 * chip is active (opacity only — separate scaleX/scaleY collapse views on Fabric;
 * a per-chip fade also needs no track-width measurement, which a scroll rail can't
 * give). Reduced motion snaps the pill on/off. Label color snaps (as the catalog
 * segmented control does) — ink when active, quiet inkFaint when not.
 */
function SectionChip({
  label,
  active,
  reduced,
  styles,
  palette,
  onPress,
  onChipLayout,
}: {
  label: string;
  active: boolean;
  reduced: boolean;
  styles: Styles;
  palette: ReturnType<typeof usePalette>;
  onPress: () => void;
  /** Reports the chip's frame (x/width within the rail's content) for the
   *  keep-active-chip-visible auto-scroll. */
  onChipLayout: (x: number, width: number) => void;
}) {
  const on = useSharedValue(active ? 1 : 0);

  useEffect(() => {
    if (reduced) {
      on.value = active ? 1 : 0;
      return;
    }
    on.value = withTiming(active ? 1 : 0, { duration: motion.durations.snap });
  }, [active, reduced, on]);

  const pillStyle = useAnimatedStyle(() => ({ opacity: on.value }));

  return (
    <Pressable
      onPress={onPress}
      onLayout={(e) => onChipLayout(e.nativeEvent.layout.x, e.nativeEvent.layout.width)}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      hitSlop={{ top: 8, bottom: 8 }}
      style={styles.chip}
    >
      <Animated.View pointerEvents="none" style={[styles.chipPill, pillStyle]} />
      <AppText variant="label" color={active ? palette.ink : palette.inkFaint} style={styles.chipLabel}>
        {label}
      </AppText>
    </Pressable>
  );
}

function clampIndex(value: number, length: number): number {
  if (!Number.isFinite(value) || value < 0) return 0;
  return Math.min(Math.max(0, Math.trunc(value)), Math.max(0, length - 1));
}

// ---------------------------------------------------------------------------
// Page content. Copy is human-written but every number is read from the sim
// source (see the ONB-1 report); tuning-flag-dependent numbers (rent) stay
// unpinned ("grows as the days pass", not a literal amount).
// ---------------------------------------------------------------------------

function buildPages(
  twists: ReturnType<typeof howToPlayTwists>,
  synergy: ReturnType<typeof howToPlaySynergy>,
  glossary: GlossaryGroup[],
): Page[] {
  const pages: Page[] = [
    {
      key: 'loop',
      title: 'The Daily Loop',
      chip: 'LOOP',
      render: (styles, palette) => (
        <>
          <View style={styles.stage}>
            <View style={styles.loopRow}>
              <LoopStep styles={styles} icon="cart-outline" label="Buy" />
              <Text style={styles.loopArrow}>›</Text>
              <LoopStep styles={styles} icon="puzzle-outline" label="Arrange" />
              <Text style={styles.loopArrow}>›</Text>
              <LoopStep styles={styles} icon="storefront-outline" label="Open Shop" />
              <Text style={styles.loopArrow}>›</Text>
              <LoopStep styles={styles} icon="home-outline" label="Pay Rent" />
            </View>
          </View>
          <Body styles={styles} palette={palette} lines={[
            'Each day: buy stock, arrange it on your shelf, then open the shop.',
            'Opening pays out every item and rule as a cascade of coins.',
          ]} />
        </>
      ),
    },
    {
      key: 'items',
      title: 'Items Pay Coins',
      chip: 'ITEMS',
      render: (styles, palette) => (
        <>
          <View style={styles.stage}>
            <View style={styles.itemRow}>
              <ItemChip styles={styles} palette={palette} id="wine-bottle" value={4} />
              <ItemChip styles={styles} palette={palette} id="cheese-wheel" value={3} />
              <ItemChip styles={styles} palette={palette} id="bread-loaf" value={3} />
            </View>
          </View>
          <Body styles={styles} palette={palette} lines={[
            'Every item on the shelf is worth coins when you open the shop.',
            'Bigger, fancier stock is worth more — but costs more to buy.',
          ]} />
        </>
      ),
    },
    {
      key: 'neighbors',
      title: 'Neighbors Help Neighbors',
      chip: 'RULES',
      render: (styles, palette) => (
        <>
          <View style={styles.stage}>
            <View style={styles.miniBoard}>
              <View style={styles.miniWell}>
                <Sprite id="honey-jar" style={styles.miniSprite} />
              </View>
              <View style={[styles.miniWell, { borderWidth: 0, backgroundColor: 'transparent', width: 30 }]}>
                <Text style={styles.payArrow}>→</Text>
              </View>
              <View style={styles.miniWell}>
                <Sprite id="bread-loaf" style={styles.miniSprite} />
              </View>
              <View style={styles.miniPlank} />
            </View>
          </View>
          <Body styles={styles} palette={palette} lines={[
            'Where you place an item matters. Some items pay their neighbors.',
            'Set up left, right, up and down to chain bonuses across the shelf.',
          ]} />
        </>
      ),
    },
    {
      // Two DISTINCT multiplier systems, kept apart so the mental model is
      // right: (1) row auras cast by specific items (Lucky Cat pays its row
      // ×1.5 — items.json maneki-neko auraRow); (2) the tag-synergy ladder
      // (same-trade sets), shown only when that flag is on.
      key: 'multipliers',
      title: 'Multipliers',
      chip: 'GLOW',
      render: (styles, palette) => (
        <>
          <View style={styles.stage}>
            <View style={styles.miniBoard}>
              <View style={styles.auraBand} pointerEvents="none" />
              <View style={styles.miniWell}>
                <Sprite id="penny-jar" style={styles.miniSprite} />
              </View>
              <View style={styles.miniWell}>
                <Sprite id="maneki-neko" style={styles.miniSprite} />
              </View>
              <View style={styles.miniWell}>
                <Sprite id="dice-cup" style={styles.miniSprite} />
              </View>
              <View style={styles.miniPlank} />
            </View>
            <View style={styles.multChip}>
              <AppText variant="label" color={palette.creamBright}>ROW GLOW ×1.5</AppText>
            </View>
            {synergy.enabled ? (
              <>
                <View style={styles.itemRow}>
                  <Sprite id="wine-bottle" style={styles.synergySprite} />
                  <Sprite id="tea-tin" style={styles.synergySprite} />
                  <Sprite id="crystal-decanter" style={styles.synergySprite} />
                </View>
                <View style={styles.multChip}>
                  <AppText variant="label" color={palette.creamBright}>
                    {`${synergy.minCount}+ SAME TRADE ×${synergy.mult}`}
                  </AppText>
                </View>
              </>
            ) : null}
          </View>
          <Body styles={styles} palette={palette} lines={[
            'Some items make their whole row glow — the Lucky Cat pays its row ×1.5.',
            ...(synergy.enabled
              ? [
                  `Stock ${synergy.minCount}+ items of the same trade and every one pays ×${synergy.mult} — bigger sets, bigger ×.`,
                ]
              : []),
          ]} />
        </>
      ),
    },
    {
      key: 'combos',
      title: 'Named Combos',
      chip: 'COMBOS',
      render: (styles, palette) => (
        <>
          <View style={styles.stage}>
            <View style={styles.comboStamp}>
              <Medallion size={40} earned />
              <View>
                <AppText variant="label" color={palette.inkFaint}>NEW COMBO</AppText>
                <AppText variant="heading" color={palette.ink}>Wine &amp; Dine</AppText>
              </View>
            </View>
          </View>
          <Body styles={styles} palette={palette} lines={[
            'Special arrangements have names — like a wine bottle among cheese.',
            'Discover one and it is stamped into your Catalog, forever.',
          ]} />
        </>
      ),
    },
    {
      key: 'rent',
      title: 'Rent Comes Due',
      chip: 'RENT',
      render: (styles, palette) => (
        <>
          <View style={styles.stage}>
            <View style={styles.rentPill}>
              <AppText variant="label" color={palette.creamBright}>RENT</AppText>
              <Text style={styles.rentGrow}>↑</Text>
            </View>
          </View>
          <Body styles={styles} palette={palette} lines={[
            'Rent falls due every few days — pay it from your coins or the run ends.',
            'It grows as the days pass, so each shelf has to out-earn the last.',
            'Survive as long as you can.',
          ]} />
        </>
      ),
    },
  ];

  if (twists.any) {
    pages.push({
      key: 'twists',
      title: "The Day's Twists",
      chip: 'TWISTS',
      render: (styles, palette) => (
        <>
          <View style={styles.stage}>
            <View style={styles.twistList}>
              {twists.spotlight ? (
                <TwistRow
                  styles={styles}
                  palette={palette}
                  icon="star-four-points-outline"
                  name="Front Window"
                  mult={`×${twists.spotlightMult}`}
                  hint="One slot is lit each day — whatever lands there pays big."
                />
              ) : null}
              {twists.order ? (
                <TwistRow
                  styles={styles}
                  palette={palette}
                  icon="basket-outline"
                  name="Today's Order"
                  mult={`×${twists.orderMult}`}
                  hint="A customer wants a tag — fill the shelf with it for a bonus."
                />
              ) : null}
              {twists.target ? (
                <TwistRow
                  styles={styles}
                  palette={palette}
                  icon="target"
                  name="Daily Target"
                  mult="→ Reroll"
                  hint="Beat the day's coin goal to earn a free reroll."
                />
              ) : null}
            </View>
          </View>
          <Body styles={styles} palette={palette} lines={[
            'Some days add a twist. Chase them for extra coins.',
          ]} />
        </>
      ),
    });
  }

  // Glossary (GLOS-1) — the last page and the lookup surface for every named
  // concept the run and cascade throw at the player. Always present (its
  // always-on terms guarantee content); flag-gated terms are baked in by the
  // pure `howToPlayGlossary` seam, so a term never appears for a mechanic that
  // can't fire in this build. `fill` so the term list scrolls within the page.
  pages.push({
    key: 'glossary',
    title: 'The Words',
    chip: 'WORDS',
    fill: true,
    render: (styles, palette) => <Glossary styles={styles} palette={palette} groups={glossary} />,
  });

  return pages;
}

/** The glossary page body: grouped term rows in a vertical ScrollView (nested
 *  inside the horizontal pager — axis-orthogonal, so both scrolls behave). */
function Glossary({
  styles,
  palette,
  groups,
}: {
  styles: Styles;
  palette: ReturnType<typeof usePalette>;
  groups: GlossaryGroup[];
}) {
  return (
    <ScrollView
      style={styles.glossaryScroll}
      contentContainerStyle={styles.glossaryContent}
      showsVerticalScrollIndicator={false}
    >
      {groups.map((group) => (
        <View key={group.label} style={styles.glossaryGroup}>
          <AppText variant="label" color={palette.inkFaint} style={styles.glossaryGroupLabel}>
            {group.label}
          </AppText>
          {group.terms.map((entry) => (
            <View key={entry.term} style={styles.glossaryRow}>
              <AppText variant="heading" color={palette.ink}>
                {entry.term}
              </AppText>
              <AppText variant="body" color={palette.inkSoft}>
                {entry.definition}
              </AppText>
            </View>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

function LoopStep({ styles, icon, label }: { styles: Styles; icon: MCIName; label: string }) {
  const palette = usePalette();
  return (
    <View style={styles.loopStep}>
      <MaterialCommunityIcons name={icon} size={28} color={palette.inkSoft} />
      <AppText variant="label" color={palette.inkSoft}>{label}</AppText>
    </View>
  );
}

function ItemChip({
  styles,
  palette,
  id,
  value,
}: {
  styles: Styles;
  palette: ReturnType<typeof usePalette>;
  id: string;
  value: number;
}) {
  return (
    <View style={styles.itemChip}>
      <Sprite id={id} style={styles.sprite} />
      <View style={styles.coinPill}>
        <View style={styles.coinDot} />
        <AppText variant="label" color={palette.ink}>{value}</AppText>
      </View>
    </View>
  );
}

function TwistRow({
  styles,
  palette,
  icon,
  name,
  mult,
  hint,
}: {
  styles: Styles;
  palette: ReturnType<typeof usePalette>;
  icon: MCIName;
  name: string;
  mult: string;
  hint: string;
}) {
  return (
    <View style={styles.twistRow}>
      <View style={styles.twistBadge}>
        <MaterialCommunityIcons name={icon} size={26} color={palette.goldDeep} />
      </View>
      <View style={styles.twistText}>
        <AppText variant="heading" color={palette.ink}>
          {name} <AppText variant="heading" style={styles.twistMult}>{mult}</AppText>
        </AppText>
        <AppText variant="body" color={palette.inkFaint}>{hint}</AppText>
      </View>
    </View>
  );
}

function Body({
  styles,
  palette,
  lines,
}: {
  styles: Styles;
  palette: ReturnType<typeof usePalette>;
  lines: string[];
}) {
  return (
    <View style={styles.bodyBlock}>
      {lines.map((line) => (
        <AppText key={line} variant="body" color={palette.inkSoft} align="center" style={styles.bodyLine}>
          {line}
        </AppText>
      ))}
    </View>
  );
}
