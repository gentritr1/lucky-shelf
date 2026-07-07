import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Panel, SectionLabel, Toggle, layout, palette, spacing, typeScale, usePrefs } from '@/ui';

/**
 * Settings: motion, sound (music + SFX), and haptics toggles. The panel list
 * scrolls so it never clips on short screens as more sections land.
 */
export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const reducedMotion = usePrefs((s) => s.reducedMotion);
  const hapticsEnabled = usePrefs((s) => s.hapticsEnabled);
  const musicEnabled = usePrefs((s) => s.musicEnabled);
  const sfxEnabled = usePrefs((s) => s.sfxEnabled);
  const setReducedMotion = usePrefs((s) => s.setReducedMotion);
  const setHapticsEnabled = usePrefs((s) => s.setHapticsEnabled);
  const setMusicEnabled = usePrefs((s) => s.setMusicEnabled);
  const setSfxEnabled = usePrefs((s) => s.setSfxEnabled);

  return (
    <View style={[styles.screen, { paddingTop: insets.top + layout.screenTopGap }]}>
      <View style={styles.topBar}>
        <Pressable accessibilityRole="button" hitSlop={12} onPress={() => router.back()}>
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>
        <Text style={styles.title}>Settings</Text>
        <View style={styles.spacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.panels}
        showsVerticalScrollIndicator={false}
      >
        <Panel>
          <SectionLabel>MOTION</SectionLabel>
          <Row
            label="Reduced motion"
            hint="Springs snap, glow steadies, breathing stops — haptics stay."
            value={reducedMotion}
            onChange={setReducedMotion}
          />
        </Panel>

        <Panel>
          <SectionLabel>SOUND</SectionLabel>
          <Row
            label="Music"
            hint="Golden-hour bed that warms into rent-week tension."
            value={musicEnabled}
            onChange={setMusicEnabled}
          />
          <Row
            label="Sound effects"
            hint="The cascade payout flourish."
            value={sfxEnabled}
            onChange={setSfxEnabled}
          />
        </Panel>

        <Panel>
          <SectionLabel>FEEDBACK</SectionLabel>
          <Row
            label="Haptics"
            hint="Grab, drop, and rearrange ticks (device only)."
            value={hapticsEnabled}
            onChange={setHapticsEnabled}
          />
        </Panel>
      </ScrollView>
    </View>
  );
}

function Row({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowHint}>{hint}</Text>
      </View>
      <Toggle accessibilityLabel={label} value={value} onValueChange={onChange} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: palette.wallCream,
    flex: 1,
    gap: spacing.lg,
    paddingHorizontal: layout.screenPadX,
  },
  panels: {
    gap: spacing.lg,
    paddingBottom: spacing.xl,
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
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  rowText: {
    flex: 1,
    gap: spacing.xxs,
  },
  rowLabel: {
    ...typeScale.heading,
    color: palette.ink,
  },
  rowHint: {
    ...typeScale.body,
    color: palette.inkFaint,
    fontSize: 13,
  },
});
