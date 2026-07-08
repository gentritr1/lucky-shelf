import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Fixture, GameState, ScoringTrace } from '@/contracts';
import { SectionLabel, Toggle, palette, radii, shadows, spacing, typeScale } from '@/ui';
import { CascadeLayer, goldenFixtures } from '@/juice';

/**
 * Lane B verification vehicle for the first real `vanish` (M3): the goldens never
 * exercise it (B-M2), so this hand-authored trace turns slot (0,0) into a Coupon
 * Stack that counts to zero and puffs. Derived from a parsed golden state (no
 * /fixtures touched) — for eyeballing the fade-puff only, never a scoring source.
 */
function makeCouponVanishDemo(): Fixture {
  const base = goldenFixtures[0]!;
  const gameState = JSON.parse(JSON.stringify(base.gameState)) as GameState;
  const slot0 = gameState.shelf.slots.find((s) => s.slot.row === 0 && s.slot.col === 0);
  if (slot0?.item) {
    slot0.item = { ...slot0.item, itemId: 'coupon-stack' };
  }
  const scoringTrace: ScoringTrace = {
    traceId: 'demo-coupon-vanish',
    day: 1,
    seed: 'demo-coupon-vanish',
    events: [
      { kind: 'itemBase', slot: { row: 0, col: 1 }, value: 3 },
      { kind: 'itemTotal', slot: { row: 0, col: 1 }, total: 3 },
      { kind: 'vanish', slot: { row: 0, col: 0 }, itemId: 'coupon-stack' },
      { kind: 'dayTotal', coins: 3 },
    ],
  };
  return {
    fixtureId: 'demo-coupon-vanish',
    title: 'Coupon vanish (demo)',
    laneBUse: 'M3 first vanish: the Coupon Stack at (0,0) puffs out before the dayTotal.',
    notes: ['Hand-authored Lane B demo trace — not an engine golden.'],
    gameState,
    scoringTrace,
  };
}

const harnessFixtures: readonly Fixture[] = [...goldenFixtures, makeCouponVanishDemo()];

/**
 * Dev harness (M2 review vehicle): load any of the six golden traces and play
 * them, verbatim. This is how Fable reviews the cascade — "can I follow every
 * coin without pausing." Trace picker + play-again (the layer owns play-again
 * and the always-visible speed control). Rent-due toggle demonstrates R-18.
 */
export default function CascadeHarnessScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState(0);
  const [rentDue, setRentDue] = useState(false);

  const fixture = harnessFixtures[selected]!;

  return (
    <View style={[styles.screen, { paddingTop: insets.top + spacing.sm }]}>
      <View style={styles.topBar}>
        <Pressable accessibilityRole="button" hitSlop={12} onPress={() => router.dismissTo('/')}>
          <Text style={styles.back}>‹ Menu</Text>
        </Pressable>
        <Text style={styles.title}>Cascade Harness</Text>
        <View style={styles.spacer} />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.picker}
      >
        {harnessFixtures.map((f, index) => (
          <Pressable
            key={f.fixtureId}
            accessibilityRole="button"
            accessibilityState={{ selected: index === selected }}
            onPress={() => setSelected(index)}
            style={[styles.chip, index === selected && styles.chipActive]}
          >
            <Text style={[styles.chipDay, index === selected && styles.chipTextActive]}>
              DAY {f.scoringTrace.day}
            </Text>
            <Text
              numberOfLines={1}
              style={[styles.chipTitle, index === selected && styles.chipTextActive]}
            >
              {f.title}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView
        contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + spacing.xxl }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.notesCard}>
          <SectionLabel>{`TRACE · ${fixture.scoringTrace.events.length} EVENTS`}</SectionLabel>
          <Text style={styles.note}>{fixture.laneBUse}</Text>
        </View>

        <View style={styles.rentRow}>
          <View style={styles.rentText}>
            <Text style={styles.rentLabel}>Rent-due day (R-18)</Text>
            <Text style={styles.rentHint}>Skip still lands the slam; a rent thud follows.</Text>
          </View>
          <Toggle accessibilityLabel="Rent due" value={rentDue} onValueChange={setRentDue} />
        </View>

        <CascadeLayer key={fixture.fixtureId} gameState={fixture.gameState} trace={fixture.scoringTrace} rentDue={rentDue} autoPlay />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: palette.wallCream,
    flex: 1,
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
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
  picker: {
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  chip: {
    backgroundColor: palette.creamBright,
    borderColor: palette.parchmentEdge,
    borderRadius: radii.md,
    borderWidth: 1,
    maxWidth: 150,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...shadows.float,
  },
  chipActive: {
    borderColor: palette.accentTeal,
    borderWidth: 2,
  },
  chipDay: {
    ...typeScale.label,
    color: palette.inkFaint,
  },
  chipTitle: {
    ...typeScale.body,
    color: palette.inkSoft,
    fontSize: 13,
  },
  chipTextActive: {
    color: palette.ink,
  },
  body: {
    gap: spacing.lg,
    paddingTop: spacing.sm,
  },
  notesCard: {
    backgroundColor: palette.creamBright,
    borderColor: palette.parchmentEdge,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md,
  },
  note: {
    ...typeScale.body,
    color: palette.inkSoft,
  },
  rentRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  rentText: {
    flex: 1,
    gap: spacing.xxs,
  },
  rentLabel: {
    ...typeScale.heading,
    color: palette.ink,
  },
  rentHint: {
    ...typeScale.body,
    color: palette.inkFaint,
    fontSize: 13,
  },
});
