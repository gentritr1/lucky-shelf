import { useEffect } from 'react';
import { Pressable, View } from 'react-native';

import { AppText } from './components/AppText';
import { usePalette } from './prefs';
import { useThemedStyles } from './useThemedStyles';
import { makeStyles } from './OnboardingHint.styles';
import {
  useOnboardingStore,
  type OnboardingStep,
} from '../state/onboardingStore';

type ContextualStep = Exclude<OnboardingStep, 'done'>;

const COPY: Record<ContextualStep, { label: string; body: string }> = {
  supplier: {
    label: 'FIRST STEP · CHOOSE A DIRECTION',
    body: 'A supplier makes its tag appear more often. It tilts your choices; it never locks your build.',
  },
  draft: {
    label: 'NEXT · READ BEFORE YOU DRAFT',
    body: 'Tap each item to compare its rule. Pick one—the other offers leave.',
  },
  place: {
    label: 'NEXT · PLACE YOUR ITEM',
    body: 'Put it anywhere for now. Later, tap it to reread its rule and move linked items together.',
  },
  open: {
    label: 'NEXT · WATCH CAUSE AND EFFECT',
    body: 'Open Shop, then follow each rule in the caption. The full receipt stays available afterward.',
  },
};

/**
 * A small, contextual first-run note. It sits in the normal layout beside the
 * action it explains, never blocks the shelf, and advances from real game state
 * rather than a parallel tutorial simulation. Players can dismiss the whole
 * tour at any step.
 */
export function OnboardingHint({ step }: { step: ContextualStep }) {
  const currentStep = useOnboardingStore((state) => state.step);
  const loaded = useOnboardingStore((state) => state.loaded);
  const load = useOnboardingStore((state) => state.loadOnboarding);
  const dismiss = useOnboardingStore((state) => state.dismiss);
  const styles = useThemedStyles(makeStyles);
  const palette = usePalette();

  useEffect(() => {
    void load().catch(() => undefined);
  }, [load]);

  if (!loaded || currentStep !== step) return null;
  const copy = COPY[step];

  return (
    <View style={styles.card}>
      <View style={styles.copy}>
        <AppText accessibilityLiveRegion="polite" variant="label" color={palette.tealDark}>
          {copy.label}
        </AppText>
        <AppText variant="body" color={palette.ink}>{copy.body}</AppText>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Skip first-run tips"
        hitSlop={4}
        onPress={() => void dismiss().catch(() => undefined)}
        style={({ pressed }) => [styles.skip, pressed && styles.skipPressed]}
      >
        <AppText variant="label" color={palette.tealDark}>Skip</AppText>
      </Pressable>
    </View>
  );
}
