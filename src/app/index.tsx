import { useFocusEffect, useRouter } from 'expo-router';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCallback, useEffect } from 'react';

import { GearIcon, WoodButton, layout, palette, radii, shadows, spacing, typeScale } from '@/ui';
import { primeAudio, setMusicTrack, spriteFor } from '@/juice';
import { useRunStore } from '../state/store';
import { routeForGameState } from '../state/phaseRouting';
import { dailySeedFor, dailySelectors, todayDateString, useDailyStore } from '../state/dailyStore';

/**
 * Title shell (M1): real layout + navigation, placeholder shop-front scene. The
 * Higgsfield key art replaces the built scene at M4; the layout and the
 * bottom-60% reach zone for the primary actions survive the reskin.
 */
export default function TitleScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const startNewRun = useRunStore((state) => state.startNewRun);
  const continueRun = useRunStore((state) => state.continueRun);
  const loadDaily = useDailyStore((state) => state.loadDaily);
  const playedToday = useDailyStore(dailySelectors.playedToday);
  const catSprite = spriteFor('shop-cat');

  useEffect(() => {
    void loadDaily().catch(() => undefined);
  }, [loadDaily]);

  // Storybook title bed. Re-asserted on focus so it resumes when returning from
  // a run; the button handlers below `primeAudio()` to satisfy autoplay policy
  // if it was blocked on cold load.
  useFocusEffect(useCallback(() => setMusicTrack('title'), []));

  const onNewRun = () => {
    primeAudio();
    const result = startNewRun();
    void result.save.catch(() => undefined);
    router.push(routeForGameState(result.gameState));
  };

  const onContinue = () => {
    primeAudio();
    void continueRun().then((gameState) => router.push(routeForGameState(gameState)));
  };

  const onDaily = () => {
    primeAudio();
    // Already played today → straight to the share card. Otherwise a fresh
    // date-seeded run (same offers worldwide, one attempt — enforced on end).
    if (playedToday) {
      router.push('/share');
      return;
    }
    const result = startNewRun(dailySeedFor(todayDateString()));
    void result.save.catch(() => undefined);
    router.push(routeForGameState(result.gameState));
  };

  return (
    <View style={styles.screen}>
      {/* painted general-store room — the title hero (no gameplay furniture to
          clash with here, so the full scene can breathe) */}
      <Image
        source={require('../../assets/scene/room-day.png')}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      />
      {/* gentle wash to unify and keep the wordmark plate reading */}
      <View pointerEvents="none" style={styles.scrim} />

      {/* settings gear, top-right, out of the reach zone by design */}
      <Pressable
        accessibilityLabel="Settings"
        accessibilityRole="button"
        hitSlop={12}
        onPress={() => router.push('/settings')}
        style={[styles.gear, { top: insets.top + layout.screenTopGap }]}
      >
        <GearIcon size={24} color={palette.inkSoft} holeColor={palette.wallCream} />
      </Pressable>

      {/* mascot over the room + the wordmark on a translucent shop-sign plate */}
      <View style={styles.scene}>
        {catSprite ? (
          <Image source={catSprite} style={styles.catImg} resizeMode="contain" />
        ) : null}
        <View style={styles.titlePlate}>
          <Text style={styles.eyebrow}>GOLDEN HOUR GENERAL STORE</Text>
          <Text style={styles.title}>Lucky Shelf</Text>
          <Text style={styles.tagline}>Arrange the shelf. Watch it pay.</Text>
        </View>
      </View>

      {/* primary actions live in the bottom reach zone */}
      <View style={[styles.actions, { paddingBottom: insets.bottom + layout.screenBottomGap }]}>
        <WoodButton label="New Run" onPress={onNewRun} />
        <WoodButton label={playedToday ? 'Daily ✓ — View Card' : 'Daily Shelf'} variant="secondary" onPress={onDaily} />
        <View style={styles.secondaryRow}>
          <View style={styles.grow}>
            <WoodButton label="Continue" variant="secondary" onPress={onContinue} />
          </View>
          <View style={styles.grow}>
            <WoodButton label="Catalog" variant="secondary" onPress={() => router.push('/catalog')} />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: palette.wallCream,
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: layout.screenPadX,
  },
  gear: {
    alignItems: 'center',
    backgroundColor: palette.plate,
    borderRadius: radii.pill,
    height: 44,
    justifyContent: 'center',
    position: 'absolute',
    right: spacing.xl,
    width: 44,
    zIndex: 10,
    ...shadows.card,
  },
  scrim: {
    backgroundColor: palette.wallCream,
    bottom: 0,
    left: 0,
    opacity: 0.18,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  scene: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    gap: spacing.lg,
  },
  catImg: {
    height: 168,
    width: 168,
  },
  titlePlate: {
    alignItems: 'center',
    backgroundColor: palette.plate,
    borderRadius: radii.lg,
    gap: spacing.xxs,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    // optical nudge right: the painted window sits left-of-centre, so true-centre
    // reads as leaning left — this rebalances the wordmark against the backdrop
    transform: [{ translateX: spacing.md }],
    ...shadows.card,
  },
  eyebrow: {
    ...typeScale.label,
    color: palette.tealDark,
  },
  title: {
    ...typeScale.display,
    color: palette.ink,
    fontSize: 44,
    lineHeight: 48,
  },
  tagline: {
    ...typeScale.body,
    color: palette.inkSoft,
  },
  actions: {
    gap: spacing.md,
  },
  secondaryRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  grow: {
    flex: 1,
  },
});
