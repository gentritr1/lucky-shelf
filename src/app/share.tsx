import { useMemo, useRef, useState } from 'react';
import { Image, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText, WoodButton, layout, palette, radii, shadows, spacing, typeScale } from '@/ui';
import { spriteFor } from '@/juice';
import { receiptCardView, runSelectors, useRunStore } from '../state/store';
import { buildCatalogView, catalogSelectors, useCatalogStore } from '../state/catalogStore';
import { dailySelectors, isDailySeed, useDailyStore } from '../state/dailyStore';
import { seedLabel } from '../state/seedLabel';

type CardVariant = 'card' | 'receipt';

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
  const streakCount = useDailyStore(dailySelectors.streakCount);

  const view = useMemo(() => buildCatalogView(catalog), [catalog]);
  const stats = gameState.runStats;
  const isDaily = isDailySeed(gameState.seed);
  const dateLabel = isDaily ? gameState.seed.replace('daily-', '') : `Run · Day ${gameState.day}`;
  const label = seedLabel(gameState.seed);
  const catSprite = spriteFor('shop-cat');

  // The receipt variant is only offered when the run actually has a closing-day
  // trace to print (always true post-run; guarded so the toggle never shows a
  // blank receipt). Opt-in: the stat card stays the default.
  const receipt = useMemo(() => receiptCardView(gameState), [gameState]);
  const [variant, setVariant] = useState<CardVariant>('card');
  const activeVariant: CardVariant = receipt ? variant : 'card';

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
        {receipt ? (
          <View style={styles.variantToggle}>
            <VariantTab label="Card" active={activeVariant === 'card'} onPress={() => setVariant('card')} />
            <VariantTab
              label="Receipt"
              active={activeVariant === 'receipt'}
              onPress={() => setVariant('receipt')}
            />
          </View>
        ) : null}

        {/* the screenshot-worthy card — captured to PNG on share (collapsable
            off so the native view is guaranteed present for captureRef) */}
        {activeVariant === 'receipt' && receipt ? (
          <View ref={cardRef} collapsable={false} style={styles.receiptCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.brand}>LUCKY SHELF</Text>
              <Text style={styles.date}>{isDaily ? `DAILY · ${dateLabel}` : dateLabel}</Text>
              {isDaily ? <Text style={styles.seed}>SEED · {label}</Text> : null}
            </View>

            <View style={styles.receiptBody}>
              {receipt.body.map((line, i) => (
                <Text
                  key={i}
                  style={[styles.receiptLine, i === receipt.body.length - 1 && styles.receiptTotal]}
                >
                  {line}
                </Text>
              ))}
            </View>

            <Text style={styles.receiptCaption}>closing day · arrange the shelf, watch it pay</Text>
          </View>
        ) : (
          <View ref={cardRef} collapsable={false} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.brand}>LUCKY SHELF</Text>
              <Text style={styles.date}>{isDaily ? `DAILY · ${dateLabel}` : dateLabel}</Text>
              {isDaily ? <Text style={styles.seed}>SEED · {label}</Text> : null}
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

            {isDaily && streakCount >= 2 ? (
              <AppText variant="label" align="center" color={palette.goldDeep} style={styles.streak}>
                🔥 {streakCount}-DAY STREAK
              </AppText>
            ) : null}

            <Text style={styles.tagline}>Arrange the shelf. Watch it pay.</Text>
          </View>
        )}

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

function VariantTab({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      hitSlop={8}
      onPress={onPress}
      style={[styles.variantTab, active && styles.variantTabActive]}
    >
      <Text style={[styles.variantTabText, active && styles.variantTabTextActive]}>{label}</Text>
    </Pressable>
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
  seed: { ...typeScale.label, color: palette.inkFaint, letterSpacing: 1 },

  variantToggle: {
    backgroundColor: palette.parchment,
    borderRadius: radii.pill,
    flexDirection: 'row',
    gap: spacing.xxs,
    padding: spacing.xxs,
  },
  variantTab: {
    borderRadius: radii.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
  },
  variantTabActive: { backgroundColor: palette.creamBright, ...shadows.lifted },
  variantTabText: { ...typeScale.label, color: palette.inkFaint },
  variantTabTextActive: { color: palette.ink },

  receiptCard: {
    backgroundColor: palette.creamBright,
    borderColor: palette.goldDeep,
    borderRadius: radii.sm,
    borderWidth: 2,
    gap: spacing.md,
    padding: spacing.xl,
    width: '100%',
    ...shadows.lifted,
  },
  receiptBody: {
    borderColor: palette.parchment,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    paddingVertical: spacing.md,
  },
  receiptLine: { ...typeScale.receipt, color: palette.ink },
  receiptTotal: { color: palette.goldDeep, fontWeight: '700' },
  receiptCaption: {
    ...typeScale.body,
    color: palette.inkFaint,
    fontSize: 12,
    fontStyle: 'italic',
    textAlign: 'center',
  },

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

  streak: { letterSpacing: 1, fontWeight: '700' },
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
