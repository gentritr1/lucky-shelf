import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Panel, SectionLabel, Toggle, palette, spacing, typeScale, usePrefs } from '@/ui';

/**
 * Settings shell (M1 minimum): only the toggles M1 needs to *prove* — reduced
 * motion and haptics. The full settings surface (sound, colorblind palette) lands
 * at M5; this exists so reduced-motion mode is demonstrable this milestone.
 */
export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const reducedMotion = usePrefs((s) => s.reducedMotion);
  const hapticsEnabled = usePrefs((s) => s.hapticsEnabled);
  const setReducedMotion = usePrefs((s) => s.setReducedMotion);
  const setHapticsEnabled = usePrefs((s) => s.setHapticsEnabled);

  return (
    <View style={[styles.screen, { paddingTop: insets.top + spacing.md }]}>
      <View style={styles.topBar}>
        <Pressable accessibilityRole="button" hitSlop={12} onPress={() => router.back()}>
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>
        <Text style={styles.title}>Settings</Text>
        <View style={styles.spacer} />
      </View>

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
        <SectionLabel>FEEDBACK</SectionLabel>
        <Row
          label="Haptics"
          hint="Grab, drop, and rearrange ticks (device only)."
          value={hapticsEnabled}
          onChange={setHapticsEnabled}
        />
      </Panel>
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
