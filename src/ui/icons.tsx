import { StyleSheet, View } from 'react-native';

import { palette } from './tokens';

/**
 * Tiny geometric icons built from Views — no emoji, no SVG dependency. They
 * match the chunky, rounded "Golden Hour" language: soft corners, warm ink.
 */

interface IconProps {
  size?: number;
  color?: string;
}

/**
 * A rounded 8-tooth gear: two overlapping rounded squares form the toothed ring,
 * a disc unifies the body, and a hole reads it as a cog. Used for Settings.
 */
export function GearIcon({ size = 22, color = palette.ink, holeColor = palette.creamBright }: IconProps & { holeColor?: string }) {
  const tooth = size * 0.66;
  const body = size * 0.6;
  const hole = size * 0.24;
  return (
    <View style={[styles.center, { width: size, height: size }]}>
      <View style={[styles.abs, { width: tooth, height: tooth, borderRadius: size * 0.16, backgroundColor: color }]} />
      <View style={[styles.abs, { width: tooth, height: tooth, borderRadius: size * 0.16, backgroundColor: color, transform: [{ rotate: '45deg' }] }]} />
      <View style={[styles.abs, { width: body, height: body, borderRadius: body / 2, backgroundColor: color }]} />
      <View style={[styles.abs, { width: hole, height: hole, borderRadius: hole / 2, backgroundColor: holeColor }]} />
    </View>
  );
}

/**
 * A collectible medallion: filled gold coin (earned) or a hollow parchment ring
 * (undiscovered). Replaces the combo star in the Catalog.
 */
export function Medallion({ size = 26, earned = true }: { size?: number; earned?: boolean }) {
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
          backgroundColor: earned ? palette.coinGold : palette.parchment,
          borderColor: earned ? palette.goldDeep : palette.parchmentEdge,
        },
      ]}
    >
      <View
        style={{
          width: inner,
          height: inner,
          borderRadius: inner / 2,
          backgroundColor: earned ? palette.sunlight : 'transparent',
          borderWidth: earned ? 0 : 1.5,
          borderColor: palette.parchmentEdge,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  abs: { position: 'absolute' },
});
