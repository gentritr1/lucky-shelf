import { useEffect } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { WoodButton } from './components/WoodButton';
import { palette, radii, shadows, spacing, typeScale } from './tokens';
import { spriteFor } from '../juice/sprites';
import { useOnboardingStore } from '../state/onboardingStore';

/**
 * One-time first-run hint (kickoff §9 — no tutorial walls). A single friendly
 * coachmark over the shelf on the very first arrange; dismiss persists it. The
 * "gif-like" animated version is a later polish — this is the token-driven,
 * one-tap seed of it.
 */
export function OnboardingHint() {
  const seen = useOnboardingStore((s) => s.seen);
  const loaded = useOnboardingStore((s) => s.loaded);
  const load = useOnboardingStore((s) => s.loadOnboarding);
  const dismiss = useOnboardingStore((s) => s.dismiss);

  useEffect(() => {
    void load().catch(() => undefined);
  }, [load]);

  const catSprite = spriteFor('shop-cat');

  if (!loaded || seen) return null;

  return (
    <View pointerEvents="box-none" style={styles.overlay}>
      <View style={styles.card}>
        {catSprite ? <Image source={catSprite} style={styles.cat} resizeMode="contain" /> : null}
        <Text style={styles.heading}>Welcome to the shop</Text>
        <Text style={styles.body}>
          Buy from the daily shop, then arrange so good neighbors touch. Stack one tag for a
          growing <Text style={styles.bodyStrong}>synergy</Text> bonus and beat the day&apos;s{' '}
          <Text style={styles.bodyStrong}>target</Text> — then Open Shop and watch the coins cascade.
        </Text>
        <WoodButton label="Got it" onPress={() => void dismiss().catch(() => undefined)} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    alignItems: 'center',
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    padding: spacing.xl,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 200,
  },
  card: {
    alignItems: 'center',
    backgroundColor: palette.creamBright,
    borderColor: palette.goldDeep,
    borderRadius: radii.lg,
    borderWidth: 2,
    gap: spacing.md,
    maxWidth: 320,
    padding: spacing.xl,
    ...shadows.lifted,
  },
  cat: { height: 84, width: 84 },
  heading: { ...typeScale.title, color: palette.ink },
  body: { ...typeScale.body, color: palette.inkSoft, textAlign: 'center' },
  bodyStrong: { color: palette.ink, fontWeight: '800' },
});
