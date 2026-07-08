import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  AppText,
  Panel,
  SectionLabel,
  TopBar,
  Toggle,
  borders,
  layout,
  palette,
  radii,
  spacing,
  usePrefs,
  type TextScale,
} from '@/ui';

/**
 * Settings: comfort (large text, high contrast), motion, sound, and haptics.
 * The panel list scrolls so it never clips on short screens — and the whole
 * screen is rendered through `AppText`, so it grows with the large-text pref
 * (dogfooding the B-M7 mechanism; also the device-gate screenshot surface).
 */
const TEXT_SIZE_OPTIONS: { value: TextScale; label: string }[] = [
  { value: 1, label: '100%' },
  { value: 1.15, label: '115%' },
  { value: 1.3, label: '130%' },
];

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const reducedMotion = usePrefs((s) => s.reducedMotion);
  const hapticsEnabled = usePrefs((s) => s.hapticsEnabled);
  const musicEnabled = usePrefs((s) => s.musicEnabled);
  const sfxEnabled = usePrefs((s) => s.sfxEnabled);
  const textScale = usePrefs((s) => s.textScale);
  const highContrast = usePrefs((s) => s.highContrast);
  const setReducedMotion = usePrefs((s) => s.setReducedMotion);
  const setHapticsEnabled = usePrefs((s) => s.setHapticsEnabled);
  const setMusicEnabled = usePrefs((s) => s.setMusicEnabled);
  const setSfxEnabled = usePrefs((s) => s.setSfxEnabled);
  const setTextScale = usePrefs((s) => s.setTextScale);
  const setHighContrast = usePrefs((s) => s.setHighContrast);

  return (
    <View style={[styles.screen, { paddingTop: insets.top + layout.screenTopGap }]}>
      <TopBar title="Settings" onBack={() => router.dismissTo('/')} />

      <ScrollView
        contentContainerStyle={styles.panels}
        showsVerticalScrollIndicator={false}
      >
        <Panel>
          <SectionLabel>COMFORT</SectionLabel>
          <View style={styles.row}>
            <View style={styles.rowText}>
              <AppText variant="heading" color={palette.ink}>
                Large text
              </AppText>
              <AppText variant="body" color={palette.inkFaint}>
                Grow every label. The whole game scales together.
              </AppText>
            </View>
          </View>
          <SegmentedTextSize value={textScale} onChange={setTextScale} />
          <Row
            label="High contrast"
            hint="Deepen ink and lighten the wall for easier reading."
            value={highContrast}
            onChange={setHighContrast}
          />
        </Panel>

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

/** Three-step large-text selector — textScale isn't a boolean, so not a Toggle. */
function SegmentedTextSize({
  value,
  onChange,
}: {
  value: TextScale;
  onChange: (v: TextScale) => void;
}) {
  return (
    <View style={styles.segment} accessibilityRole="radiogroup">
      {TEXT_SIZE_OPTIONS.map((opt) => {
        const selected = opt.value === value;
        return (
          <Pressable
            key={opt.label}
            style={[styles.segmentCell, selected && styles.segmentCellOn]}
            onPress={() => onChange(opt.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={`Text size ${opt.label}`}
          >
            <AppText variant="label" color={selected ? palette.creamBright : palette.inkSoft}>
              {opt.label}
            </AppText>
          </Pressable>
        );
      })}
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
        <AppText variant="heading" color={palette.ink}>
          {label}
        </AppText>
        <AppText variant="body" color={palette.inkFaint}>
          {hint}
        </AppText>
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
  segment: {
    borderColor: palette.parchmentEdge,
    borderRadius: radii.md,
    borderWidth: borders.hairline,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  segmentCell: {
    alignItems: 'center',
    flex: 1,
    paddingVertical: spacing.sm,
  },
  segmentCellOn: {
    backgroundColor: palette.tealDark,
  },
});
