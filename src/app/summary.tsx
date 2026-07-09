import { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, View } from 'react-native';
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
  WoodButton,
  buildAccents,
  layout,
  motion,
  tagEmoji,
  usePalette,
  useReducedMotion,
  useThemedStyles,
} from '@/ui';
import { spriteFor } from '@/juice';

import { makeStyles } from './summary.styles';
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
        <AppText variant="label" color={palette.rentEmber} align="center">
          RENT MISSED
        </AppText>
        <AppText variant="display" color={palette.ink} align="center">
          Day {gameState.day}
        </AppText>

        {isDaily ? (
          <AppText variant="label" color={palette.inkFaint} align="center" style={styles.seed}>
            Seed · {seedLabel(gameState.seed)}
          </AppText>
        ) : null}

        {build ? (
          <AppText
            variant="body"
            align="center"
            color={buildAccents[build.tag] ?? palette.goldDeep}
            style={styles.recap}
          >
            {(tagEmoji[build.tag] ?? '🏷️') + ' '}
            {build.tag.charAt(0).toUpperCase() + build.tag.slice(1)} build · {plural(combosThisRun, 'combo')}
          </AppText>
        ) : null}

        {nearMiss ? (
          <AppText variant="body" align="center" color={palette.emberDark} style={styles.nearMiss}>
            Paid rent with {plural(nearMiss.coinsToSpare, 'coin')} to spare
          </AppText>
        ) : null}

        {isDaily && streakCount >= 2 ? (
          <AppText variant="body" align="center" color={palette.goldDeep} style={styles.streak}>
            🔥 {streakCount}-day daily streak
          </AppText>
        ) : null}

        <View style={styles.stats}>
          <View style={styles.statRow}>
            <AppText variant="body" color={palette.inkSoft}>
              Coins earned
            </AppText>
            <CoinCounter coins={gameState.runStats.totalCoinsEarned} />
          </View>

          {bests.map((row) => (
            <BestRow key={row.key} row={row} />
          ))}

          {build ? null : (
            <View style={styles.statRow}>
              <AppText variant="body" color={palette.inkSoft}>
                Combos this run
              </AppText>
              <AppText variant="heading" color={palette.ink}>
                {combosThisRun}
              </AppText>
            </View>
          )}
        </View>

        {nextUnlock ? <NextUnlockTeaser row={nextUnlock} /> : null}
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

/** The quiet "one more run" prompt (B-M5 Part 3): a silhouette thumb + unlock
 *  hint for the nearest locked item. Warm, not a popup — no CTA, no coins. */
function NextUnlockTeaser({ row }: { row: NextUnlockRow }) {
  const styles = useThemedStyles(makeStyles);
  const palette = usePalette();
  const sprite = spriteFor(row.itemId);
  return (
    <View style={styles.teaser}>
      {sprite ? (
        <Image source={sprite} style={styles.teaserThumb} resizeMode="contain" />
      ) : (
        <View style={styles.teaserThumbBox} />
      )}
      <View style={styles.teaserText}>
        <AppText variant="label" color={palette.inkFaint}>
          NEXT UNLOCK
        </AppText>
        <AppText variant="body" color={palette.inkSoft}>
          {row.hint}
        </AppText>
      </View>
    </View>
  );
}

/** One personal-best row: this run's value on the right with either a celebratory
 *  "New record!" accent or the standing best beneath it. */
function BestRow({ row }: { row: PersonalBestRow }) {
  const styles = useThemedStyles(makeStyles);
  const palette = usePalette();
  const unit = row.kind === 'days' ? 'd' : '';
  return (
    <View style={styles.statRow}>
      <AppText variant="body" color={palette.inkSoft}>
        {row.label}
      </AppText>
      <View style={styles.bestRight}>
        {row.kind === 'coin' ? (
          <CoinCounter coins={row.thisRun} />
        ) : (
          <AppText variant="heading" color={palette.ink}>
            {row.thisRun}
            {unit}
          </AppText>
        )}
        {row.isRecord ? (
          <RecordAccent />
        ) : (
          <AppText variant="label" color={palette.inkFaint} style={styles.bestCaption}>
            Best {row.best}
            {unit}
          </AppText>
        )}
      </View>
    </View>
  );
}

/** The "New record!" flourish — light gold text with a star, no box, so it reads
 *  as a celebratory caption rather than a second stacked pill. Pops in with an
 *  overshoot spring; snaps flat under reduced motion (prefs). */
function RecordAccent() {
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
      motion.durations.snap,
      withSequence(
        withTiming(1.12, { duration: 160, easing: overshoot }),
        withTiming(1, { duration: 200, easing: overshoot }),
      ),
    );
  }, [reduced, progress]);

  const anim = useAnimatedStyle(() => ({
    opacity: Math.min(1, progress.value * 1.6),
    transform: [{ scale: progress.value }],
  }));

  return (
    <Animated.View style={anim}>
      <AppText variant="label" color={palette.goldDeep} style={styles.recordText}>
        ★ New record!
      </AppText>
    </Animated.View>
  );
}

