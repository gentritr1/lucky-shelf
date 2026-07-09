import { useEffect, useMemo } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Medallion, Panel, SectionLabel, TopBar, layout, palette, radii, shadows, spacing, typeScale } from '@/ui';
import { spriteFor } from '@/juice';
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
  const catalog = useCatalogStore(catalogSelectors.catalog);
  const loadCatalog = useCatalogStore((state) => state.loadCatalog);

  useEffect(() => {
    void loadCatalog().catch(() => undefined);
  }, [loadCatalog]);

  const view = useMemo(() => buildCatalogView(catalog), [catalog]);

  return (
    <View style={[styles.screen, { paddingTop: insets.top + layout.screenTopGap }]}>
      <TopBar title="Catalog" backLabel="‹ Menu" onBack={() => router.dismissTo('/')} />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + layout.screenBottomGap }]}
        showsVerticalScrollIndicator={false}
      >
        <Panel style={styles.summary}>
          <View style={styles.completionRow}>
            <Text style={styles.completionPct}>{view.completionPct}%</Text>
            <Text style={styles.completionLabel}>COLLECTED</Text>
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
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function ItemStamp({ item }: { item: CatalogItemRow }) {
  // Locked ≠ undiscovered (B-M5 Part 2): a locked ladder item shows its real
  // silhouette + unlock hint, so it reads as "earn this", not "mystery". Only
  // reachable when the flag is on; flag off leaves the two branches below byte-
  // identical to today.
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
          <Text style={styles.stampMysteryMark}>?</Text>
        </View>
      )}
      <Text numberOfLines={1} style={styles.stampName}>
        {item.discovered ? item.name : '???'}
      </Text>
    </View>
  );
}

/** A locked ladder item: the real sprite tinted to a dark silhouette (no new
 *  art) over the standard card, with its unlock hint where the name would sit. */
function LockedStamp({ item }: { item: CatalogItemRow }) {
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
      <Text numberOfLines={2} style={styles.stampLockHint}>
        {item.unlockHint}
      </Text>
    </View>
  );
}

function ComboStamp({ combo }: { combo: CatalogComboRow }) {
  return (
    <View style={[styles.combo, combo.achieved ? styles.comboFound : styles.comboLocked]}>
      <Medallion size={34} earned={combo.achieved} />
      <View style={styles.comboText}>
        <Text numberOfLines={1} style={styles.comboName}>
          {combo.achieved ? combo.name : 'Undiscovered combo'}
        </Text>
        {combo.achieved ? (
          <Text style={styles.comboCount}>×{combo.count}</Text>
        ) : (
          <Text style={styles.comboHint}>Arrange to discover</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: palette.wallCream, flex: 1, paddingHorizontal: layout.screenPadX },
  content: { gap: spacing.md, paddingTop: spacing.md },

  summary: { gap: spacing.md },
  completionRow: { alignItems: 'baseline', flexDirection: 'row', gap: spacing.sm },
  completionPct: { ...typeScale.display, color: palette.accentTeal },
  completionLabel: { ...typeScale.label, color: palette.inkFaint },
  progressTrack: {
    backgroundColor: palette.parchment,
    borderRadius: radii.pill,
    height: 10,
    overflow: 'hidden',
  },
  progressFill: { backgroundColor: palette.accentTeal, borderRadius: radii.pill, height: 10 },
  statsGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  stat: { alignItems: 'center', flex: 1 },
  statValue: { ...typeScale.heading, color: palette.ink },
  statLabel: { ...typeScale.label, color: palette.inkFaint, fontSize: 10 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  stamp: {
    alignItems: 'center',
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.xxs,
    padding: spacing.xs,
    width: '22%',
  },
  stampFound: {
    backgroundColor: palette.creamBright,
    borderColor: palette.parchmentEdge,
    ...shadows.float,
  },
  stampLocked: { backgroundColor: palette.parchment, borderColor: palette.parchmentEdge, opacity: 0.7 },
  // the art sits on a soft mat with breathing room, framed like a collectible
  stampArt: {
    alignItems: 'center',
    aspectRatio: 1,
    backgroundColor: palette.wallCream,
    borderRadius: radii.sm,
    justifyContent: 'center',
    padding: spacing.sm,
    width: '100%',
  },
  stampSprite: { height: '100%', width: '100%' },
  stampMystery: {
    alignItems: 'center',
    aspectRatio: 1,
    backgroundColor: palette.woodInset,
    borderRadius: radii.sm,
    justifyContent: 'center',
    width: '100%',
  },
  stampMysteryMark: { ...typeScale.title, color: palette.parchment },
  stampName: { ...typeScale.label, color: palette.inkSoft, fontSize: 9, letterSpacing: 0, textAlign: 'center' },
  // sprite tinted to a flat dark shape — the "shadowed collectible" look, no new art
  silhouette: { tintColor: palette.inkFaint },
  // fallback silhouette for ladder items that have no sprite yet
  stampSilhouetteBox: {
    aspectRatio: 1,
    backgroundColor: palette.inkFaint,
    borderRadius: radii.sm,
    width: '100%',
  },
  stampLockHint: {
    ...typeScale.label,
    color: palette.inkSoft,
    fontSize: 9,
    letterSpacing: 0,
    textAlign: 'center',
  },

  comboList: { gap: spacing.sm },
  combo: {
    alignItems: 'center',
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
  },
  comboFound: { backgroundColor: palette.creamBright, borderColor: palette.goldDeep },
  comboLocked: { backgroundColor: palette.parchment, borderColor: palette.parchmentEdge, opacity: 0.7 },
  comboText: { flex: 1 },
  comboName: { ...typeScale.heading, color: palette.ink, fontSize: 15 },
  comboCount: { ...typeScale.body, color: palette.accentTeal, fontSize: 13, fontWeight: '700' },
  comboHint: { ...typeScale.body, color: palette.inkFaint, fontSize: 12 },
});
