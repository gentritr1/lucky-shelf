import { useEffect, useMemo } from 'react';
import { Image, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText, Medallion, Panel, SectionLabel, TopBar, layout, usePalette, useThemedStyles } from '@/ui';
import { spriteFor } from '@/juice';

import { makeStyles } from '@/screen-styles/catalog.styles';
import {
  buildCatalogView,
  catalogSelectors,
  useCatalogStore,
  type CatalogComboRow,
  type CatalogItemRow,
} from '../state/catalogStore';

/**
 * The Catalog album (kickoff §1 meta): every item discovered, every named combo
 * achieved, best-run stats. Discovery should feel like collecting stamps —
 * found items show their real sprite; undiscovered stay a shadowed "?".
 */
export default function CatalogScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(makeStyles);
  const palette = usePalette();
  const catalog = useCatalogStore(catalogSelectors.catalog);
  const loadCatalog = useCatalogStore((state) => state.loadCatalog);
  // B-M11: combos the latest run achieved for the first time → the "new" accent.
  const lastRunDiscovery = useCatalogStore((state) => state.lastRunDiscovery);

  useEffect(() => {
    void loadCatalog().catch(() => undefined);
  }, [loadCatalog]);

  const newlyAchievedComboIds = useMemo(
    () => new Set(lastRunDiscovery?.comboIds ?? []),
    [lastRunDiscovery],
  );
  const view = useMemo(
    () => buildCatalogView(catalog, undefined, undefined, { newlyAchievedComboIds }),
    [catalog, newlyAchievedComboIds],
  );

  return (
    <View style={[styles.screen, { paddingTop: insets.top + layout.screenTopGap }]}>
      <TopBar title="Catalog" backLabel="‹ Menu" onBack={() => router.dismissTo('/')} />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + layout.screenBottomGap }]}
        showsVerticalScrollIndicator={false}
      >
        <Panel style={styles.summary}>
          <View style={styles.completionRow}>
            <AppText variant="display" color={palette.accentTeal}>{view.completionPct}%</AppText>
            <AppText variant="label" color={palette.inkFaint}>COLLECTED</AppText>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${view.completionPct}%` }]} />
          </View>
          <View style={styles.statsGrid}>
            <Stat label="Runs" value={String(catalog.stats.runsPlayed)} />
            <Stat label="Best day" value={`${catalog.stats.bestDayTotal}c`} />
            <Stat label="Deepest rent" value={String(catalog.stats.deepestRentSurvived)} />
            <Stat label="All-time" value={`${catalog.stats.totalCoinsAllTime}c`} />
          </View>
        </Panel>

        <SectionLabel>{`ITEMS — ${view.itemsDiscovered}/${view.itemsTotal}`}</SectionLabel>
        <View style={styles.grid}>
          {view.items.map((item) => (
            <ItemStamp key={item.id} item={item} />
          ))}
        </View>

        <SectionLabel>{`NAMED COMBOS — ${view.combosAchieved}/${view.combosTotal}`}</SectionLabel>
        <View style={styles.comboList}>
          {view.combos.map((combo) => (
            <ComboStamp key={combo.comboId} combo={combo} />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  const styles = useThemedStyles(makeStyles);
  const palette = usePalette();
  return (
    <View style={styles.stat}>
      <AppText variant="heading" color={palette.ink}>{value}</AppText>
      <AppText variant="label" color={palette.inkFaint} style={styles.statLabel}>{label}</AppText>
    </View>
  );
}

function ItemStamp({ item }: { item: CatalogItemRow }) {
  // Locked ≠ undiscovered (B-M5 Part 2): a locked ladder item shows its real
  // silhouette + unlock hint, so it reads as "earn this", not "mystery". Only
  // reachable when the flag is on; flag off leaves the two branches below byte-
  // identical to today.
  const styles = useThemedStyles(makeStyles);
  const palette = usePalette();
  if (item.locked) return <LockedStamp item={item} />;

  const sprite = item.discovered ? spriteFor(item.id) : null;
  return (
    <View style={[styles.stamp, item.discovered ? styles.stampFound : styles.stampLocked]}>
      {sprite ? (
        <View style={styles.stampArt}>
          <Image source={sprite} style={styles.stampSprite} resizeMode="contain" />
        </View>
      ) : (
        <View style={styles.stampMystery}>
          <AppText variant="title" color={palette.parchment}>?</AppText>
        </View>
      )}
      <AppText variant="label" color={palette.inkSoft} numberOfLines={1} style={styles.stampName}>
        {item.discovered ? item.name : '???'}
      </AppText>
    </View>
  );
}

/** A locked ladder item: the real sprite tinted to a dark silhouette (no new
 *  art) over the standard card, with its unlock hint where the name would sit. */
function LockedStamp({ item }: { item: CatalogItemRow }) {
  const styles = useThemedStyles(makeStyles);
  const palette = usePalette();
  const sprite = spriteFor(item.id);
  return (
    <View style={[styles.stamp, styles.stampLocked]}>
      {sprite ? (
        <View style={styles.stampArt}>
          <Image source={sprite} style={[styles.stampSprite, styles.silhouette]} resizeMode="contain" />
        </View>
      ) : (
        <View style={styles.stampSilhouetteBox} />
      )}
      <AppText variant="label" color={palette.inkSoft} numberOfLines={2} style={styles.stampLockHint}>
        {item.unlockHint}
      </AppText>
    </View>
  );
}

function ComboStamp({ combo }: { combo: CatalogComboRow }) {
  const styles = useThemedStyles(makeStyles);
  const palette = usePalette();
  return (
    <View style={[styles.combo, combo.achieved ? styles.comboFound : styles.comboLocked, combo.isNew && styles.comboNew]}>
      <Medallion size={34} earned={combo.achieved} />
      <View style={styles.comboText}>
        <AppText variant="heading" color={palette.ink} numberOfLines={1} style={styles.comboName}>
          {combo.achieved ? combo.name : 'Undiscovered combo'}
        </AppText>
        {combo.achieved ? (
          <AppText variant="body" color={palette.accentTeal} style={styles.comboCount}>×{combo.count}</AppText>
        ) : (
          <AppText variant="body" color={palette.inkFaint} style={styles.comboHint}>Arrange to discover</AppText>
        )}
      </View>
      {/* B-M11: subtle "new" stamp accent for a combo the latest run first achieved */}
      {combo.isNew ? (
        <View style={styles.newBadge}>
          <AppText variant="label" color={palette.creamBright} style={styles.newBadgeText}>NEW</AppText>
        </View>
      ) : null}
    </View>
  );
}

