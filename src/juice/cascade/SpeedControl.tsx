import { Pressable, StyleSheet, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import {
  AppText,
  baloo2IconNudge,
  radii,
  shadows,
  spacing,
  usePalette,
  useThemedStyles,
  type Palette,
} from '@/ui';
import type { CascadeSpeed } from './useCascadePlayer';

/**
 * Cascade speed control — 1× / 2× / skip, always visible from run 1 (R-17). We
 * never hold the player hostage to our own animation (Pillar 4). `skip` jumps to
 * the dayTotal slam (R-18).
 *
 * B-M13: migrated off the static StyleSheet + raw `Text` to `AppText` + the themed
 * factory (high-contrast re-themes it now), and the emoji `⏭` to an MCI `skip-next`
 * icon (the emoji→MCI sweep missed this one). Centering:
 * - The 1×/2× labels are block-centered pill text, so `baloo2IconNudge`'s context
 *   trap forbids nudging them. The brief suggested a `lineHeight` layout fix, but a
 *   sim shot showed `lineHeight == fontSize` CLIPS the Baloo2 glyphs (project
 *   Gotcha 1). So they ride the platform `stat` role (system face), which centers
 *   cleanly inside a constrained line box with no nudge — the TYPO-1 resolution for
 *   pill/coin labels.
 * - The "Skip" label sits beside the MCI glyph, so it keeps the Baloo2 `heading`
 *   look with the sanctioned icon-adjacent `baloo2IconNudge`.
 */

interface SpeedControlProps {
  speed: CascadeSpeed;
  onSpeed: (speed: CascadeSpeed) => void;
  onSkip: () => void;
  disabled?: boolean;
}

const LABEL_SIZE = 18; // matches the `heading` role's fontSize

export function SpeedControl({ speed, onSpeed, onSkip, disabled = false }: SpeedControlProps) {
  const styles = useThemedStyles(makeStyles);
  const palette = usePalette();
  return (
    <View style={styles.row}>
      <View style={styles.segment}>
        <SpeedButton label="1×" active={speed === 1} onPress={() => onSpeed(1)} styles={styles} palette={palette} />
        <SpeedButton label="2×" active={speed === 2} onPress={() => onSpeed(2)} styles={styles} palette={palette} />
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={onSkip}
        style={({ pressed }) => [styles.skip, pressed && styles.pressed, disabled && styles.faded]}
      >
        <AppText variant="heading" color={palette.tealDark} style={styles.skipLabel}>
          Skip
        </AppText>
        <MaterialCommunityIcons name="skip-next" size={LABEL_SIZE} color={palette.tealDark} />
      </Pressable>
    </View>
  );
}

function SpeedButton({
  label,
  active,
  onPress,
  styles,
  palette,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  styles: ReturnType<typeof makeStyles>;
  palette: Palette;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [styles.speed, active && styles.speedActive, pressed && styles.pressed]}
    >
      <AppText variant="stat" color={active ? palette.ink : palette.inkFaint}>
        {label}
      </AppText>
    </Pressable>
  );
}

function makeStyles(palette: Palette) {
  return StyleSheet.create({
    row: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: spacing.md,
      justifyContent: 'center',
    },
    segment: {
      backgroundColor: palette.parchment,
      borderRadius: radii.pill,
      flexDirection: 'row',
      padding: 3,
      ...shadows.float,
    },
    speed: {
      alignItems: 'center',
      borderRadius: radii.pill,
      justifyContent: 'center',
      minHeight: 36,
      minWidth: 48,
      paddingHorizontal: spacing.md,
    },
    speedActive: {
      backgroundColor: palette.creamBright,
      borderColor: palette.goldDeep,
      borderWidth: 1.5,
    },
    skip: {
      alignItems: 'center',
      backgroundColor: palette.creamBright,
      borderColor: palette.parchmentEdge,
      borderRadius: radii.pill,
      borderWidth: 1.5,
      flexDirection: 'row',
      gap: spacing.xs,
      justifyContent: 'center',
      minHeight: 42,
      paddingHorizontal: spacing.lg,
      ...shadows.float,
    },
    // Icon-adjacent Baloo2 label → the sanctioned optical nudge (down onto the
    // MCI glyph's centerline; Android centers within the padded box instead).
    skipLabel: baloo2IconNudge(LABEL_SIZE),
    pressed: {
      transform: [{ scale: 0.96 }],
    },
    faded: {
      opacity: 0.4,
    },
  });
}
