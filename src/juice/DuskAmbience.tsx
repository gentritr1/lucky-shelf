import { StyleSheet, View } from 'react-native';

import { palette } from '@/ui/tokens';

/**
 * Rent proximity must be *felt* (kickoff §6). As the due day nears the room
 * warms and dims toward ember — a static wash (no motion, so reduced-motion is
 * a non-issue) layered behind the HUD content. Calm on a fresh cycle, an ember
 * glow on the morning rent is due. The full dusk art pass (backdrop swap) is a
 * later enhancement; this is the token-driven seed of it.
 *
 * B-M16 (human: "rent day isn't intense enough"): the final approach gets a
 * DISTINCT rent-eve stage — from dueInDays ≤ 1 the wash deepens a clear notch
 * (0.11 → 0.16 on the eve, 0.16 → 0.22 due-today) and a dusk band creeps down
 * from the CEILING too, so the room reads "the sun is going down on you" rather
 * than just warmer. Still fully static; presentation only.
 */

interface DuskAmbienceProps {
  dueInDays: number;
}

// wash opacity by how close rent is — gentle, never muddy
function washOpacity(dueInDays: number): number {
  if (dueInDays >= 3) return 0;
  if (dueInDays === 2) return 0.05;
  if (dueInDays === 1) return 0.16; // rent-eve: one visible notch past day-2
  return 0.22; // due today
}

export function DuskAmbience({ dueInDays }: DuskAmbienceProps) {
  const opacity = washOpacity(dueInDays);
  if (opacity === 0) return null;
  // The rent-eve stage: dusk also descends from the top of the room.
  const finalDay = dueInDays <= 1;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {/* even ember warmth across the room */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: palette.rentEmber, opacity }]} />
      {/* dusk creeping up from the floor — a denser ember band at the bottom */}
      <View style={[styles.floorGlow, { opacity: Math.min(0.5, opacity * 2.4) }]} />
      {/* rent-eve only: dusk descends from the ceiling too */}
      {finalDay ? <View style={[styles.ceilingDusk, { opacity: Math.min(0.32, opacity * 1.5) }]} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  ceilingDusk: {
    backgroundColor: palette.emberDark,
    height: '18%',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  floorGlow: {
    backgroundColor: palette.emberDark,
    bottom: 0,
    height: '32%',
    left: 0,
    position: 'absolute',
    right: 0,
  },
});
