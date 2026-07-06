import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CoinCounter, WoodButton, palette, spacing, typeScale } from '@/ui';
import { routeForGameState } from '../state/phaseRouting';
import { runSelectors, useRunStore } from '../state/store';

export default function RunSummaryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const gameState = useRunStore(runSelectors.gameState);
  const startNewRun = useRunStore((state) => state.startNewRun);

  useEffect(() => {
    const route = routeForGameState(gameState);
    if (route !== '/summary') router.replace(route);
  }, [gameState, router]);

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
      </View>

      <View style={[styles.actions, { paddingBottom: insets.bottom + spacing.lg }]}>
        <WoodButton label="New Run" onPress={newRun} />
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
    marginTop: 'auto',
  },
});
