import { StyleSheet, View } from 'react-native';

import { usePalette } from './prefs';

/**
 * Tiny geometric icons built from Views — no emoji, no SVG dependency. They
 * match the chunky, rounded "Golden Hour" language: soft corners, warm ink.
 *
 * Colors come from `usePalette()` (not the static `palette` import) so the
 * icons re-theme under the high-contrast pref like the rest of the UI (B-M7).
 * At default prefs `usePalette()` returns the base palette by identity, so the
 * default render is byte-identical to the old static reads.
 */

interface IconProps {
  size?: number;
  color?: string;
}

/**
 * A rounded 8-tooth gear: two overlapping rounded squares form the toothed ring,
 * a disc unifies the body, and a hole reads it as a cog. Used for Settings.
 */
export function GearIcon({ size = 22, color, holeColor }: IconProps & { holeColor?: string }) {
  const p = usePalette();
  const bodyColor = color ?? p.ink;
  const holeFill = holeColor ?? p.creamBright;
  const tooth = size * 0.66;
  const body = size * 0.6;
  const hole = size * 0.24;
  return (
    <View style={[styles.center, { width: size, height: size }]}>
      <View style={[styles.abs, { width: tooth, height: tooth, borderRadius: size * 0.16, backgroundColor: bodyColor }]} />
      <View style={[styles.abs, { width: tooth, height: tooth, borderRadius: size * 0.16, backgroundColor: bodyColor, transform: [{ rotate: '45deg' }] }]} />
      <View style={[styles.abs, { width: body, height: body, borderRadius: body / 2, backgroundColor: bodyColor }]} />
      <View style={[styles.abs, { width: hole, height: hole, borderRadius: hole / 2, backgroundColor: holeFill }]} />
    </View>
  );
}

/**
 * A collectible medallion: filled gold coin (earned) or a hollow parchment ring
 * (undiscovered). Replaces the combo star in the Catalog.
 */
export function Medallion({ size = 26, earned = true }: { size?: number; earned?: boolean }) {
  const p = usePalette();
  const inner = size * 0.42;
  return (
    <View
      style={[
        styles.center,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: 2,
          backgroundColor: earned ? p.coinGold : p.parchment,
          borderColor: earned ? p.goldDeep : p.parchmentEdge,
        },
      ]}
    >
      <View
        style={{
          width: inner,
          height: inner,
          borderRadius: inner / 2,
          backgroundColor: earned ? p.sunlight : 'transparent',
          borderWidth: earned ? 0 : 1.5,
          borderColor: p.parchmentEdge,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  abs: { position: 'absolute' },
});
