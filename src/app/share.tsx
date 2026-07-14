import { useMemo, useRef, useState } from 'react';
import { Image, Pressable, Share, Text, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { captureRef } from 'react-native-view-shot';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText, WoodButton, layout, usePalette, useThemedStyles } from '@/ui';
import { spriteFor } from '@/juice';

import { makeStyles } from '@/screen-styles/share.styles';
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
  const styles = useThemedStyles(makeStyles);
  const palette = usePalette();
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
          <AppText variant="heading" color={palette.tealDark} style={styles.back}>‹ Menu</AppText>
        </Pressable>
        <AppText variant="title" color={palette.ink}>Share</AppText>
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
              <AppText variant="title" color={palette.ink} style={styles.brand}>LUCKY SHELF</AppText>
              <AppText variant="label" color={palette.accentTeal}>{isDaily ? `DAILY · ${dateLabel}` : dateLabel}</AppText>
              {isDaily ? <AppText variant="label" color={palette.inkFaint} style={styles.seed}>SEED · {label}</AppText> : null}
            </View>

            <View style={styles.receiptBody}>
              {receipt.body.map((line, i) => {
                const isTotal = i === receipt.body.length - 1;
                return (
                  <AppText
                    key={i}
                    variant="receipt"
                    color={isTotal ? palette.goldDeep : palette.ink}
                    style={isTotal ? styles.receiptTotal : undefined}
                  >
                    {line}
                  </AppText>
                );
              })}
            </View>

            <AppText variant="body" color={palette.inkFaint} style={styles.receiptCaption}>closing day · arrange the shelf, watch it pay</AppText>
          </View>
        ) : (
          <View ref={cardRef} collapsable={false} style={styles.card}>
            <View style={styles.cardHeader}>
              <AppText variant="title" color={palette.ink} style={styles.brand}>LUCKY SHELF</AppText>
              <AppText variant="label" color={palette.accentTeal}>{isDaily ? `DAILY · ${dateLabel}` : dateLabel}</AppText>
              {isDaily ? <AppText variant="label" color={palette.inkFaint} style={styles.seed}>SEED · {label}</AppText> : null}
            </View>

            <View style={styles.hero}>
              {catSprite ? <Image source={catSprite} style={styles.heroCat} resizeMode="contain" /> : null}
              <View style={styles.heroText}>
                {/* bespoke hero numeral (no type role / font family) — raw <Text>
                    exception so routing it through AppText can't change its look */}
                <Text style={styles.heroNumber}>{stats.daysSurvived}</Text>
                <AppText variant="label" color={palette.inkFaint}>DAYS SURVIVED</AppText>
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
              <AppText variant="body" color={palette.inkSoft} style={styles.completionText}>{view.completionPct}% catalog</AppText>
            </View>

            {isDaily && streakCount >= 2 ? (
              <View style={styles.streakRow}>
                <MaterialCommunityIcons name="fire" size={14} color={palette.goldDeep} />
                <AppText variant="label" align="center" color={palette.goldDeep} style={styles.streak}>
                  {streakCount}-DAY STREAK
                </AppText>
              </View>
            ) : null}

            <AppText variant="body" color={palette.inkFaint} style={styles.tagline}>Arrange the shelf. Watch it pay.</AppText>
          </View>
        )}

        <View style={styles.hintRow}>
          <View style={styles.hintDot} />
          <AppText variant="body" color={palette.inkFaint} style={styles.hint}>Screenshot to share your shelf</AppText>
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
  const styles = useThemedStyles(makeStyles);
  const palette = usePalette();
  return (
    <View style={styles.stat}>
      <AppText variant="stat" color={palette.ink}>{value}</AppText>
      <AppText variant="label" color={palette.inkFaint} style={styles.statLabel}>{label}</AppText>
    </View>
  );
}

function VariantTab({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const styles = useThemedStyles(makeStyles);
  const palette = usePalette();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      hitSlop={8}
      onPress={onPress}
      style={[styles.variantTab, active && styles.variantTabActive]}
    >
      <AppText variant="label" color={active ? palette.ink : palette.inkFaint}>{label}</AppText>
    </Pressable>
  );
}

