import { Text, type StyleProp, type TextProps, type TextStyle } from 'react-native';

import { typeScale } from '../tokens';

export type TextVariant = keyof typeof typeScale; // display | title | heading | body | label | coin

interface AppTextProps extends TextProps {
  /** Type-scale role. Defaults to `body`. */
  variant?: TextVariant;
  /** Horizontal alignment. Vertical centering of BLOCK text is flexbox's job on
   *  the parent — this primitive deliberately does NOT apply the coin-adjacent
   *  `baloo2IconNudge` (see tokens.ts): a lone centered label is already centered,
   *  and nudging it would push it low. Use the helper only for a digit sitting
   *  beside a shorter coin dot / icon. */
  align?: 'left' | 'center' | 'right';
  color?: string;
  style?: StyleProp<TextStyle>;
}

/**
 * The one text primitive for block copy — titles, headings, body, labels,
 * button/eyebrow text. Applies a `typeScale` role so type stays consistent by
 * construction; `<Text>` should only survive where a coin-adjacent digit needs
 * the optical nudge (there it pairs with `baloo2IconNudge`).
 */
export function AppText({ variant = 'body', align, color, style, ...rest }: AppTextProps) {
  return (
    <Text
      {...rest}
      style={[
        typeScale[variant],
        color ? { color } : null,
        align ? { textAlign: align } : null,
        style,
      ]}
    />
  );
}
