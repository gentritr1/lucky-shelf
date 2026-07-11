import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Fixture, GameState, ScoringTrace } from '@/contracts';
import { AppText, SectionLabel, Toggle, spacing, usePalette, useThemedStyles } from '@/ui';
import { CascadeLayer, goldenFixtures } from '@/juice';

import { makeStyles } from '@/screen-styles/cascade-harness.styles';

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

/**
 * B-M6 spectacle-tier recording vehicles. The spectacle tier is a pure function
 * of the trace + the day's goal target (`cascadeTier`); the cleanest way to force
 * a tier for the device recording is to take the richest golden cascade verbatim
 * and attach a small `dailyTarget` so its (unchanged) day total lands at the
 * desired ratio — `apex` at ≥ 4.2×, `big` at ≥ 2.8×. No trace is altered and no
 * engine golden is touched; only the additive `dailyTarget` field is set.
 */
function richestGolden(): Fixture {
  return goldenFixtures.reduce((best, f) =>
    f.scoringTrace.events.length > best.scoringTrace.events.length ? f : best,
  );
}

function makeTierDemo(kind: 'big' | 'apex'): Fixture {
  const base = richestGolden();
  const gameState = JSON.parse(JSON.stringify(base.gameState)) as GameState;
  const scoringTrace = JSON.parse(JSON.stringify(base.scoringTrace)) as ScoringTrace;
  const last = scoringTrace.events.at(-1);
  const dayTotal = last?.kind === 'dayTotal' ? last.coins : 0;
  const ratio = kind === 'apex' ? 5 : 3; // clears 4.2× / 2.8× with margin
  gameState.dailyTarget = Math.max(1, Math.round(dayTotal / ratio));
  scoringTrace.traceId = `demo-tier-${kind}`;
  return {
    fixtureId: `demo-tier-${kind}`,
    title: kind === 'apex' ? 'APEX spectacle (demo)' : 'BIG cascade (demo)',
    laneBUse:
      kind === 'apex'
        ? 'B-M6 apex: edge glow builds, gold wash + spark burst on the slam, oversized day total.'
        : 'B-M6 big: warmer pops + a gold wash breath on the day-total slam.',
    notes: [`Hand-authored B-M6 demo — golden trace verbatim, dailyTarget set to force ${kind}.`],
    gameState,
    scoringTrace,
  };
}

const harnessFixtures: readonly Fixture[] = [
  makeTierDemo('apex'),
  makeTierDemo('big'),
  ...goldenFixtures,
  makeCouponVanishDemo(),
];

// B-M11: an empty run-start catalog so every golden combo classifies as
// first-ever — the harness is the device-recording vehicle for a discovery moment
// (toast + stamp + jingle + slow-beat, and its reduced-motion snap).
const HARNESS_ACHIEVED_COMBOS: ReadonlySet<string> = new Set();

/**
 * Dev harness (M2 review vehicle): load any of the six golden traces and play
 * them, verbatim. This is how Fable reviews the cascade — "can I follow every
 * coin without pausing." Trace picker + play-again (the layer owns play-again
 * and the always-visible speed control). Rent-due toggle demonstrates R-18.
 */
export default function CascadeHarnessScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(makeStyles);
  const palette = usePalette();
  const [selected, setSelected] = useState(0);
  const [rentDue, setRentDue] = useState(false);

  const fixture = harnessFixtures[selected]!;

  return (
    <View style={[styles.screen, { paddingTop: insets.top + spacing.sm }]}>
      <View style={styles.topBar}>
        <Pressable accessibilityRole="button" hitSlop={12} onPress={() => router.dismissTo('/')}>
          <AppText variant="heading" color={palette.tealDark} style={styles.back}>‹ Menu</AppText>
        </Pressable>
        <AppText variant="title" color={palette.ink}>Cascade Harness</AppText>
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
            <AppText variant="label" color={index === selected ? palette.ink : palette.inkFaint}>
              DAY {f.scoringTrace.day}
            </AppText>
            <AppText
              variant="body"
              color={index === selected ? palette.ink : palette.inkSoft}
              numberOfLines={1}
              style={styles.chipTitle}
            >
              {f.title}
            </AppText>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView
        contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + spacing.xxl }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.notesCard}>
          <SectionLabel>{`TRACE · ${fixture.scoringTrace.events.length} EVENTS`}</SectionLabel>
          <AppText variant="body" color={palette.inkSoft}>{fixture.laneBUse}</AppText>
        </View>

        <View style={styles.rentRow}>
          <View style={styles.rentText}>
            <AppText variant="heading" color={palette.ink}>Rent-due day (R-18)</AppText>
            <AppText variant="body" color={palette.inkFaint} style={styles.rentHint}>Skip still lands the slam; a rent thud follows.</AppText>
          </View>
          <Toggle accessibilityLabel="Rent due" value={rentDue} onValueChange={setRentDue} />
        </View>

        <CascadeLayer
          key={fixture.fixtureId}
          gameState={fixture.gameState}
          trace={fixture.scoringTrace}
          rentDue={rentDue}
          achievedBeforeRun={HARNESS_ACHIEVED_COMBOS}
          autoPlay
        />
      </ScrollView>
    </View>
  );
}

