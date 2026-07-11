import { Text, type StyleProp, type TextProps, type TextStyle } from 'react-native';

import { resolvePalette, scaleTypeStyle, typeScale } from '../tokens';
import { useHighContrast, useTextScale } from '../prefs';

export type TextVariant = keyof typeof typeScale; // display | title | heading | body | label | coin

interface AppTextProps extends TextProps {
  /** Type-scale role. Defaults to `body`. */
  variant?: TextVariant;
  /** Horizontal alignment. Vertical centering of BLOCK text is flexbox's job on
   *  the parent. Since TYPO-1 the numeral/label/body/stat roles use the platform
   *  system face (`fonts.ui`), which centers in a constrained line box — so no
   *  optical nudge is needed here or at coin-adjacent sites (the old
   *  `baloo2IconNudge` helper is deprecated). Baloo2 survives only on the
   *  block-centered display/title/heading roles, already centered by flexbox. */
  align?: 'left' | 'center' | 'right';
  color?: string;
  style?: StyleProp<TextStyle>;
}

/**
 * The one text primitive for block copy — titles, headings, body, labels,
 * button/eyebrow text. Applies a `typeScale` role so type stays consistent by
 * construction; `<Text>` survives only for the documented raw exceptions (bespoke
 * badges, glyph icons, and coin-adjacent digits that carry a baked style object).
 *
 * B-M7 accessibility floor: this is THE central funnel for the two comfort prefs.
 * `textScale` grows the role's font/line height here (via `scaleTypeStyle`) so no
 * screen does per-screen font math; high contrast swaps the DEFAULT text color to
 * the darker ink (only when the caller passes no explicit `color`). At the default
 * prefs (scale 1, high contrast off) the output is byte-identical to before.
 */
export function AppText({ variant = 'body', align, color, style, ...rest }: AppTextProps) {
  const textScale = useTextScale();
  const highContrast = useHighContrast();
  // Only theme the default color; an explicit `color` prop is the caller's choice
  // (remapping explicit colors to high contrast is part of the deferred
  // static-StyleSheet → runtime-palette migration, not a per-component fork here).
  const resolvedColor = color ?? (highContrast ? resolvePalette(true).ink : undefined);
  return (
    <Text
      {...rest}
      style={[
        scaleTypeStyle(typeScale[variant], textScale),
        resolvedColor ? { color: resolvedColor } : null,
        align ? { textAlign: align } : null,
        style,
      ]}
    />
  );
}
