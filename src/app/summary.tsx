import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Image, Pressable, ScrollView, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import {
  AppText,
  CoinCounter,
  Panel,
  TagIcon,
  WoodButton,
  buildAccents,
  layout,
  motion,
  usePalette,
  useReducedMotion,
  useThemedStyles,
} from '@/ui';
import { spriteFor } from '@/juice';

import { makeStyles } from '@/screen-styles/summary.styles';
import { routeForGameState } from '../state/phaseRouting';
import { buildIdentityView, nearMissView, runSelectors, useRunStore } from '../state/store';
import {
  catalogSelectors,
  nextUnlockTeaserView,
  personalBestsView,
  useCatalogStore,
  type NextUnlockRow,
  type PersonalBestRow,
} from '../state/catalogStore';
import { dailySelectors, isDailySeed, useDailyStore } from '../state/dailyStore';
import { seedLabel } from '../state/seedLabel';

const overshoot = Easing.bezier(...motion.easings.overshoot);
const outEasing = Easing.bezier(...motion.easings.out);

// --- Staged-reveal cadence (SUM-1). The hero is left unwrapped so expo-router's
// screen-mount animation owns its entrance (blanket within-screen entrances get
// masked/doubled — past scar); the stagger begins at the stats card and walks
// down the rows, then the teaser, giving the payoff moment a sense of ceremony.
const CARD_DELAY = 120; // stats card surface settles after the hero
const ROW_BASE = 210; // first stat row
const ROW_STEP = 70; // per-row cascade delay
const rowDelay = (i: number): number => ROW_BASE + i * ROW_STEP;

function plural(n: number, unit: string): string {
  return `${n} ${unit}${n === 1 ? '' : 's'}`;
}

export default function RunSummaryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(makeStyles);
  const palette = usePalette();
  const gameState = useRunStore(runSelectors.gameState);
  const startNewRun = useRunStore((state) => state.startNewRun);
  const recordRunEnd = useCatalogStore((state) => state.recordRunEnd);
  const recordDaily = useDailyStore((state) => state.recordDaily);
  const streakCount = useDailyStore(dailySelectors.streakCount);
  const isDaily = isDailySeed(gameState.seed);

  // Freeze the STANDING personal bests at mount — before `recordRunEnd` folds this
  // run into the catalog — so "New record!" compares against the prior record.
  // Reading post-merge would always tie. The initializer runs at first render,
  // ahead of the recording effect below (effects fire after paint), so this is
  // the pre-run snapshot even under StrictMode's double render.
  const [mountStats] = useState(() => useCatalogStore.getState().catalog.stats);
  // recordRunEnd stashes THIS run's authoritative pre-merge stats (it
  // load-guards the catalog first), which beats the mount snapshot whenever the
  // summary mounted before the catalog finished loading — e.g. a cold relaunch
  // straight into a finished run, where the snapshot would read empty and mark
  // every stat a false record.
  const recordedPrev = useCatalogStore((state) =>
    state.prevRunStats?.runId === gameState.runId ? state.prevRunStats.stats : null,
  );
  const prevStats = recordedPrev ?? mountStats;

  useEffect(() => {
    const route = routeForGameState(gameState);
    if (route !== '/summary') router.replace(route);
  }, [gameState, router]);

  // Fold this finished run into the permanent catalog (guarded by runId, so a
  // re-mount can't double-count). This is the M4 merge point. A daily run also
  // records its one-attempt result for the share card (M5).
  useEffect(() => {
    void recordRunEnd(gameState).catch(() => undefined);
    if (isDaily) void recordDaily(gameState).catch(() => undefined);
  }, [recordRunEnd, recordDaily, gameState, isDaily]);

  const combosThisRun = gameState.catalogDelta.discoveredComboIds.length;
  const bests = personalBestsView(prevStats, gameState.runStats);
  const build = buildIdentityView(gameState); // null when synergy off or no build
  const nearMiss = nearMissView(gameState);
  // Next-unlock teaser (B-M5 Part 3): reads the LIVE catalog so it reflects this
  // run once recordRunEnd merges it in. Null (row omitted) when the flag is off
  // or the ladder is exhausted.
  const catalog = useCatalogStore(catalogSelectors.catalog);
  const nextUnlock = useMemo(() => nextUnlockTeaserView(catalog), [catalog]);

  const newRun = () => {
    const result = startNewRun();
    void result.save.catch(() => undefined);
    router.replace(routeForGameState(result.gameState));
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top + layout.screenTopGap }]}>
      <View style={styles.topBar}>
        <Pressable accessibilityRole="button" hitSlop={12} onPress={() => router.dismissTo('/')}>
          <AppText variant="heading" color={palette.tealDark} style={styles.back}>
            ‹ Menu
          </AppText>
        </Pressable>
        <AppText variant="title" color={palette.ink}>
          Run Summary
        </AppText>
        <View style={styles.spacer} />
      </View>

      <ScrollView
        style={styles.bodyScroll}
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <AppText variant="label" color={palette.rentEmber} align="center">
            RENT MISSED
          </AppText>
          <AppText variant="display" color={palette.ink} align="center" style={styles.heroDay}>
            Day {gameState.day}
          </AppText>

          {isDaily ? (
            <AppText variant="label" color={palette.inkFaint} align="center" style={styles.seed}>
              Seed · {seedLabel(gameState.seed)}
            </AppText>
          ) : null}

          {build ? (
            <View style={styles.recapRow}>
              <TagIcon tag={build.tag} size={16} color={buildAccents[build.tag] ?? palette.goldDeep} />
              <AppText
                variant="body"
                color={buildAccents[build.tag] ?? palette.goldDeep}
                style={styles.recap}
              >
                {build.tag.charAt(0).toUpperCase() + build.tag.slice(1)} build · {plural(combosThisRun, 'combo')}
              </AppText>
            </View>
          ) : null}

          {nearMiss ? (
            <AppText variant="body" align="center" color={palette.emberDark} style={styles.nearMiss}>
              Closest rent payment: {plural(nearMiss.coinsToSpare, 'coin')} to spare
            </AppText>
          ) : null}

          {isDaily && streakCount >= 2 ? (
            <View style={styles.streakRow}>
              <MaterialCommunityIcons name="fire" size={16} color={palette.goldDeep} />
              <AppText variant="body" color={palette.goldDeep} style={styles.streak}>
                {streakCount}-day daily streak
              </AppText>
            </View>
          ) : null}
        </View>

        <Reveal delay={CARD_DELAY}>
          <Panel style={styles.statsCard}>
            <Reveal delay={rowDelay(0)}>
              <StatRow label="Coins earned">
                <CoinCounter coins={gameState.runStats.totalCoinsEarned} />
              </StatRow>
            </Reveal>

            {bests.map((row, i) => (
              <Reveal key={row.key} delay={rowDelay(i + 1)}>
                <BestRow row={row} recordDelay={rowDelay(i + 1) + motion.durations.settle} />
              </Reveal>
            ))}

            {build ? null : (
              <Reveal delay={rowDelay(bests.length + 1)}>
                <StatRow label="Combos this run">
                  <AppText variant="stat" color={palette.ink}>
                    {combosThisRun}
                  </AppText>
                </StatRow>
              </Reveal>
            )}
          </Panel>
        </Reveal>

        {nextUnlock ? (
          <Reveal delay={rowDelay(bests.length + 2)}>
            <NextUnlockTeaser row={nextUnlock} />
          </Reveal>
        ) : null}
      </ScrollView>

      <View style={[styles.actions, { paddingBottom: insets.bottom + layout.screenBottomGap }]}>
        <WoodButton label={isDaily ? 'Share Card' : 'New Run'} onPress={isDaily ? () => router.push('/share') : newRun} />
        {isDaily ? <WoodButton label="New Run" variant="secondary" onPress={newRun} /> : null}
        <WoodButton label="Catalog" variant="secondary" onPress={() => router.push('/catalog')} />
        {isDaily ? null : (
          <WoodButton label="Share Card" variant="secondary" onPress={() => router.push('/share')} />
        )}
      </View>
    </View>
  );
}

/** Within-screen staged-reveal wrapper (SUM-1): fades + lifts its child into
 *  place after `delay`. Single `translateY` transform (no scaleX/scaleY split —
 *  Fabric collapse scar) and a reduced-motion snap to final state. */
function Reveal({ delay, children }: { delay: number; children: ReactNode }) {
  const reduced = useReducedMotion();
  const progress = useSharedValue(reduced ? 1 : 0);

  useEffect(() => {
    if (reduced) {
      progress.value = 1;
      return;
    }
    progress.value = 0;
    progress.value = withDelay(delay, withTiming(1, { duration: motion.durations.settle, easing: outEasing }));
  }, [reduced, delay, progress]);

  // `progress.value` is a plain number here (never a with*() return), so the
  // arithmetic is legal — the hard rule bans arithmetic on animation objects only.
  const anim = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * 10 }],
  }));

  return <Animated.View style={anim}>{children}</Animated.View>;
}

/** One stats-card row: label left, value right on the card's inner right edge,
 *  with a fixed-height caption slot beneath the value when the row has one.
 *  The shared right edge (valueSlot) carries the alignment; reserving the slot
 *  on caption-less rows made the card too tall to fit the unlock teaser above
 *  the fold (SUM-1 review), so empty slots are not rendered. */
function StatRow({
  label,
  children,
  caption,
}: {
  label: string;
  children: ReactNode;
  caption?: ReactNode;
}) {
  const styles = useThemedStyles(makeStyles);
  const palette = usePalette();
  return (
    <View style={styles.statRow}>
      <View style={styles.statLabelSlot}>
        <AppText variant="body" color={palette.inkSoft}>
          {label}
        </AppText>
      </View>
      <View style={styles.statValueCol}>
        <View style={styles.valueSlot}>{children}</View>
        {caption ? <View style={styles.captionSlot}>{caption}</View> : null}
      </View>
    </View>
  );
}

/** The quiet "one more run" prompt (B-M5 Part 3): a silhouette thumb in a soft
 *  parchment circle + unlock hint for the nearest locked item. SUM-2 drops the
 *  gold accent bar (human disliked it) for a plain full-hairline card — visually
 *  subordinate to the stats card and clearly not a button (no wood tones). */
function NextUnlockTeaser({ row }: { row: NextUnlockRow }) {
  const styles = useThemedStyles(makeStyles);
  const palette = usePalette();
  const sprite = spriteFor(row.itemId);
  return (
    <View style={styles.teaser}>
      <View style={styles.teaserInner}>
        <View style={styles.teaserThumbCircle}>
          {sprite ? (
            <Image source={sprite} style={styles.teaserThumb} resizeMode="contain" />
          ) : (
            <View style={styles.teaserThumbDot} />
          )}
        </View>
        <View style={styles.teaserText}>
          <AppText variant="label" color={palette.inkFaint}>
            NEXT UNLOCK
          </AppText>
          <AppText variant="body" color={palette.inkSoft}>
            {row.hint}
          </AppText>
        </View>
      </View>
    </View>
  );
}

/** One personal-best row: this run's value on the right with either a celebratory
 *  "New record!" accent or the standing best in the caption slot beneath it. */
function BestRow({ row, recordDelay }: { row: PersonalBestRow; recordDelay: number }) {
  const styles = useThemedStyles(makeStyles);
  const palette = usePalette();
  const unit = row.kind === 'days' ? 'd' : '';

  const value =
    row.kind === 'coin' ? (
      <CoinCounter coins={row.thisRun} />
    ) : (
      <AppText variant="stat" color={palette.ink}>
        {row.thisRun}
        {unit}
      </AppText>
    );

  const caption = row.isRecord ? (
    <RecordAccent delay={recordDelay} />
  ) : row.thisRun === row.best ? (
    // Tied the all-time best — a quiet small-caps eyebrow, coherent with the
    // record caption below (no ASCII glyph, letterspaced metadata).
    <AppText variant="label" color={palette.tealDark} style={styles.bestCaption}>
      YOUR BEST
    </AppText>
  ) : (
    // Below the record: one deliberate line of metadata — small-caps eyebrow +
    // middle dot + the standing number, so "record" and its value read as a
    // single quiet unit rather than a stray label beside a number.
    <AppText variant="label" color={palette.inkFaint} style={styles.bestCaption}>
      {`RECORD · ${row.best}${unit}`}
    </AppText>
  );

  return (
    <StatRow label={row.label} caption={caption}>
      {value}
    </StatRow>
  );
}

/** The "New record!" flourish — light gold text with a star, no box, so it reads
 *  as a celebratory caption rather than a second stacked pill. Pops in with an
 *  overshoot spring AFTER its row has slid in (the finale beat of the stagger);
 *  snaps flat under reduced motion (prefs). */
function RecordAccent({ delay }: { delay: number }) {
  const styles = useThemedStyles(makeStyles);
  const palette = usePalette();
  const reduced = useReducedMotion();
  const progress = useSharedValue(reduced ? 1 : 0);

  useEffect(() => {
    if (reduced) {
      progress.value = 1;
      return;
    }
    progress.value = 0;
    progress.value = withDelay(
      delay,
      withSequence(
        withTiming(1.12, { duration: 160, easing: overshoot }),
        withTiming(1, { duration: 200, easing: overshoot }),
      ),
    );
  }, [reduced, delay, progress]);

  const anim = useAnimatedStyle(() => ({
    opacity: Math.min(1, progress.value * 1.6),
    transform: [{ scale: progress.value }],
  }));

  return (
    <Animated.View style={anim}>
      <View style={styles.recordRow}>
        <MaterialCommunityIcons name="star" size={14} color={palette.goldDeep} />
        <AppText variant="label" color={palette.goldDeep} style={styles.recordText}>
          New record!
        </AppText>
      </View>
    </Animated.View>
  );
}

