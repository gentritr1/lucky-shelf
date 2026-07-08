import { useMemo, useRef } from 'react';
import { Image, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { WoodButton, layout, palette, radii, shadows, spacing, typeScale } from '@/ui';
import { spriteFor } from '@/juice';
import { runSelectors, useRunStore } from '../state/store';
import { buildCatalogView, catalogSelectors, useCatalogStore } from '../state/catalogStore';
import { isDailySeed } from '../state/dailyStore';

/**
 * The share card (kickoff §9 — the social artifact). Built to be screenshot-
 * worthy: one framed, warm card that captures a run at a glance. Native share
 * exports it on device; on web the screenshot is the artifact. Deterministic
 * runs mean a daily card's numbers are comparable worldwide (moat S-1/S-16).
 */
export default function ShareScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const gameState = useRunStore(runSelectors.gameState);
  const catalog = useCatalogStore(catalogSelectors.catalog);

  const view = useMemo(() => buildCatalogView(catalog), [catalog]);
  const stats = gameState.runStats;
  const isDaily = isDailySeed(gameState.seed);
  const dateLabel = isDaily ? gameState.seed.replace('daily-', '') : `Run · Day ${gameState.day}`;
  const catSprite = spriteFor('shop-cat');

  const cardRef = useRef<View>(null);

  const onShare = async () => {
    // The card is the artifact; send only the captured PNG, with no generated
    // text attached to the share sheet.
    try {
      const uri = await captureRef(cardRef, { format: 'png', quality: 1 });
      await Share.share({ url: uri });
    } catch {
      // No text fallback: if image capture is unavailable, avoid sharing a
      // different artifact than the player tapped for.
    }
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top + layout.screenTopGap }]}>
      <View style={styles.topBar}>
        <Pressable accessibilityRole="button" hitSlop={12} onPress={() => router.dismissTo('/')}>
          <Text style={styles.back}>‹ Menu</Text>
        </Pressable>
        <Text style={styles.title}>Share</Text>
        <View style={styles.spacer} />
      </View>

      <View style={styles.cardWrap}>
        {/* the screenshot-worthy card — captured to PNG on share (collapsable
            off so the native view is guaranteed present for captureRef) */}
        <View ref={cardRef} collapsable={false} style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.brand}>LUCKY SHELF</Text>
            <Text style={styles.date}>{isDaily ? `DAILY · ${dateLabel}` : dateLabel}</Text>
          </View>

          <View style={styles.hero}>
            {catSprite ? <Image source={catSprite} style={styles.heroCat} resizeMode="contain" /> : null}
            <View style={styles.heroText}>
              <Text style={styles.heroNumber}>{stats.daysSurvived}</Text>
              <Text style={styles.heroLabel}>DAYS SURVIVED</Text>
            </View>
          </View>

          <View style={styles.statGrid}>
            <Stat value={`${stats.totalCoinsEarned}c`} label="Earned" />
            <Stat value={`${stats.bestDayTotal}c`} label="Best day" />
            <Stat value={String(stats.deepestRentSurvived)} label="Deepest rent" />
          </View>

          <View style={styles.completionRow}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${view.completionPct}%` }]} />
            </View>
            <Text style={styles.completionText}>{view.completionPct}% catalog</Text>
          </View>

          <Text style={styles.tagline}>Arrange the shelf. Watch it pay.</Text>
        </View>

        <View style={styles.hintRow}>
          <View style={styles.hintDot} />
          <Text style={styles.hint}>Screenshot to share your shelf</Text>
        </View>
      </View>

      <View style={[styles.actions, { paddingBottom: insets.bottom + layout.screenBottomGap }]}>
        <WoodButton label="Share" onPress={onShare} />
        <WoodButton label="Done" variant="secondary" onPress={() => router.dismissTo('/')} />
      </View>
    </View>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: palette.wallCream, flex: 1, paddingHorizontal: layout.screenPadX },
  topBar: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  back: { ...typeScale.heading, color: palette.tealDark, width: 72 },
  title: { ...typeScale.title, color: palette.ink },
  spacer: { width: 72 },

  cardWrap: { alignItems: 'center', flex: 1, gap: spacing.md, justifyContent: 'center' },
  card: {
    backgroundColor: palette.creamBright,
    borderColor: palette.goldDeep,
    borderRadius: radii.lg,
    borderWidth: 2,
    gap: spacing.lg,
    padding: spacing.xl,
    width: '100%',
    ...shadows.lifted,
  },
  cardHeader: { alignItems: 'center', gap: spacing.xxs },
  brand: { ...typeScale.title, color: palette.ink, letterSpacing: 1 },
  date: { ...typeScale.label, color: palette.accentTeal },

  hero: { alignItems: 'center', flexDirection: 'row', gap: spacing.lg, justifyContent: 'center' },
  heroCat: { height: 96, width: 96 },
  heroText: { alignItems: 'flex-start' },
  heroNumber: { color: palette.rentEmber, fontSize: 64, fontWeight: '800', lineHeight: 66 },
  heroLabel: { ...typeScale.label, color: palette.inkFaint },

  statGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  stat: { alignItems: 'center', flex: 1 },
  statValue: { ...typeScale.heading, color: palette.ink },
  statLabel: { ...typeScale.label, color: palette.inkFaint, fontSize: 10 },

  completionRow: { alignItems: 'center', gap: spacing.xs },
  progressTrack: {
    backgroundColor: palette.parchment,
    borderRadius: radii.pill,
    height: 8,
    overflow: 'hidden',
    width: '100%',
  },
  progressFill: { backgroundColor: palette.accentTeal, borderRadius: radii.pill, height: 8 },
  completionText: { ...typeScale.body, color: palette.inkSoft, fontSize: 12 },

  tagline: { ...typeScale.body, color: palette.inkFaint, fontStyle: 'italic', textAlign: 'center' },
  hintRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.xs },
  hintDot: {
    backgroundColor: palette.accentTeal,
    borderRadius: radii.pill,
    height: 6,
    width: 6,
  },
  hint: { ...typeScale.body, color: palette.inkFaint, fontSize: 13 },

  actions: { gap: spacing.md, marginTop: 'auto' },
});
