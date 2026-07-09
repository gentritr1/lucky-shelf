import { useMemo } from 'react';

import { resolvePalette, type Palette } from './tokens';
import { useHighContrast, useTextScale } from './prefs';

/**
 * B-M9 runtime-theme adoption. Screens that baked colors into a module-load
 * `StyleSheet.create` cannot react to the B-M7 comfort prefs, because the static
 * sheet captures `palette` once at import. This helper closes that gap without a
 * per-component color fork (the hard rule): a screen defines its sheet as a
 * module-scope factory `makeStyles(palette)` that reads every color from the
 * PASSED palette (never the module-scope `palette`), then does
 * `const styles = useThemedStyles(makeStyles)`. The helper resolves the live
 * palette for the high-contrast pref and memoizes the sheet per (textScale,
 * highContrast).
 *
 * Keyed on (textScale, highContrast) per the B-M9 brief. Colors depend only on
 * highContrast; text size is NEVER baked into a StyleSheet — it flows through
 * `AppText`/`scaleTypeStyle`, the one place font math lives. `textScale` is in the
 * key for forward-correctness (so a future scale-dependent style also invalidates)
 * and to match the brief's spec, not because a factory reads it today.
 *
 * Byte-identity at default prefs is structural: `resolvePalette(false) === palette`
 * (same object reference), so `makeStyles(resolvePalette(false))` is the exact
 * object a static `StyleSheet.create` built from `palette` would produce.
 */
export function useThemedStyles<T>(factory: (palette: Palette) => T): T {
  const highContrast = useHighContrast();
  const textScale = useTextScale();
  return useMemo(
    () => factory(resolvePalette(highContrast)),
    [factory, highContrast, textScale],
  );
}
