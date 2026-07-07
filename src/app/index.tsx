import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useEffect } from 'react';

import { WoodButton, palette, radii, shadows, spacing, typeScale } from '@/ui';
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

  useEffect(() => {
    void loadDaily().catch(() => undefined);
  }, [loadDaily]);

  const onNewRun = () => {
    const result = startNewRun();
    void result.save.catch(() => undefined);
    router.push(routeForGameState(result.gameState));
  };

  const onContinue = () => {
    void continueRun().then((gameState) => router.push(routeForGameState(gameState)));
  };

  const onDaily = () => {
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
      {/* settings gear, top-right, out of the reach zone by design */}
      <Pressable
        accessibilityLabel="Settings"
        accessibilityRole="button"
        hitSlop={12}
        onPress={() => router.push('/settings')}
        style={[styles.gear, { top: insets.top + spacing.md }]}
      >
        <Text style={styles.gearGlyph}>⚙️</Text>
      </Pressable>

      {/* placeholder shop-front scene — the mascot on his shelf */}
      <View style={styles.scene}>
        <View style={styles.awning}>
          {Array.from({ length: 7 }, (_, i) => (
            <View key={i} style={[styles.stripe, i % 2 === 0 ? styles.stripeA : styles.stripeB]} />
          ))}
        </View>
        <View style={styles.window}>
          <View style={styles.windowShelf} />
          <Text style={styles.cat}>🐈</Text>
          <View style={styles.windowShelfLow} />
        </View>
        <Text style={styles.eyebrow}>GOLDEN HOUR GENERAL STORE</Text>
        <Text style={styles.title}>Lucky Shelf</Text>
        <Text style={styles.tagline}>Arrange the shelf. Watch it pay.</Text>
      </View>

      {/* primary actions live in the bottom reach zone */}
      <View style={[styles.actions, { paddingBottom: insets.bottom + spacing.xl }]}>
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
    paddingHorizontal: spacing.xxl,
  },
  gear: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    right: spacing.xl,
    zIndex: 10,
  },
  gearGlyph: {
    fontSize: 26,
  },
  scene: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    gap: spacing.sm,
  },
  awning: {
    borderRadius: radii.sm,
    flexDirection: 'row',
    height: 26,
    marginBottom: spacing.md,
    overflow: 'hidden',
    width: 220,
    ...shadows.card,
  },
  stripe: {
    flex: 1,
  },
  stripeA: {
    backgroundColor: palette.rentEmber,
  },
  stripeB: {
    backgroundColor: palette.creamBright,
  },
  window: {
    alignItems: 'center',
    backgroundColor: palette.sunlight,
    borderColor: palette.shelfWood,
    borderRadius: radii.md,
    borderWidth: 4,
    height: 190,
    justifyContent: 'center',
    marginBottom: spacing.xl,
    overflow: 'hidden',
    width: 220,
    ...shadows.lifted,
  },
  windowShelf: {
    backgroundColor: palette.woodLight,
    borderBottomColor: palette.woodDark,
    borderBottomWidth: 2,
    borderRadius: radii.xs,
    height: 10,
    position: 'absolute',
    top: 58,
    width: '86%',
  },
  windowShelfLow: {
    backgroundColor: palette.woodLight,
    borderBottomColor: palette.woodDark,
    borderBottomWidth: 2,
    borderRadius: radii.xs,
    bottom: 34,
    height: 10,
    position: 'absolute',
    width: '86%',
  },
  cat: {
    fontSize: 74,
    marginTop: -18,
  },
  eyebrow: {
    ...typeScale.label,
    color: palette.tealDark,
    marginTop: spacing.md,
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
