import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CoinCounter, WoodButton, palette, spacing, typeScale } from '@/ui';
import { routeForGameState } from '../state/phaseRouting';
import { runSelectors, useRunStore } from '../state/store';
import { useCatalogStore } from '../state/catalogStore';
import { isDailySeed, useDailyStore } from '../state/dailyStore';

export default function RunSummaryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const gameState = useRunStore(runSelectors.gameState);
  const startNewRun = useRunStore((state) => state.startNewRun);
  const recordRunEnd = useCatalogStore((state) => state.recordRunEnd);
  const recordDaily = useDailyStore((state) => state.recordDaily);
  const isDaily = isDailySeed(gameState.seed);

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

  const newRun = () => {
    const result = startNewRun();
    void result.save.catch(() => undefined);
    router.replace(routeForGameState(result.gameState));
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top + spacing.sm }]}>
      <View style={styles.topBar}>
        <Pressable accessibilityRole="button" hitSlop={12} onPress={() => router.replace('/')}>
          <Text style={styles.back}>‹ Menu</Text>
        </Pressable>
        <Text style={styles.title}>Run Summary</Text>
        <View style={styles.spacer} />
      </View>

      <View style={styles.body}>
        <Text style={styles.eyebrow}>RENT MISSED</Text>
        <Text style={styles.headline}>Day {gameState.day}</Text>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Coins earned</Text>
          <CoinCounter coins={gameState.runStats.totalCoinsEarned} />
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Deepest rent</Text>
          <Text style={styles.statValue}>{gameState.runStats.deepestRentSurvived}</Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Best day</Text>
          <Text style={styles.statValue}>{gameState.runStats.bestDayTotal}c</Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Combos this run</Text>
          <Text style={styles.statValue}>{combosThisRun}</Text>
        </View>
      </View>

      <View style={[styles.actions, { paddingBottom: insets.bottom + spacing.lg }]}>
        <WoodButton label={isDaily ? 'Share Card' : 'New Run'} onPress={isDaily ? () => router.push('/share') : newRun} />
        <WoodButton label="Catalog" variant="secondary" onPress={() => router.push('/catalog')} />
        {isDaily ? null : (
          <WoodButton label="Share Card" variant="secondary" onPress={() => router.push('/share')} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: palette.wallCream,
    flex: 1,
    gap: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  back: {
    ...typeScale.heading,
    color: palette.tealDark,
    width: 72,
  },
  title: {
    ...typeScale.title,
    color: palette.ink,
  },
  spacer: {
    width: 72,
  },
  body: {
    flex: 1,
    gap: spacing.lg,
    justifyContent: 'center',
  },
  eyebrow: {
    ...typeScale.label,
    color: palette.rentEmber,
    textAlign: 'center',
  },
  headline: {
    ...typeScale.display,
    color: palette.ink,
    textAlign: 'center',
  },
  statRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statLabel: {
    ...typeScale.body,
    color: palette.inkSoft,
  },
  statValue: {
    ...typeScale.heading,
    color: palette.ink,
  },
  actions: {
    gap: spacing.md,
    marginTop: 'auto',
  },
});
