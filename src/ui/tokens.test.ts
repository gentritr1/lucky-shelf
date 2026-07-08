import { describe, expect, it } from 'vitest';

import {
  highContrastPalette,
  palette,
  resolvePalette,
  scaleTypeStyle,
  typeScale,
} from './tokens';

/**
 * B-M7: prove large text flows through ONE central type mapping. If these pass,
 * every AppText-rendered role scales by construction — no screen needs (or is
 * allowed) its own font math. `AppText` is the sole caller of `scaleTypeStyle`.
 */
describe('scaleTypeStyle — central large-text mapping', () => {
  it('is identity at scale 1 (default path byte-identical)', () => {
    for (const variant of Object.keys(typeScale) as (keyof typeof typeScale)[]) {
      expect(scaleTypeStyle(typeScale[variant], 1)).toBe(typeScale[variant]);
    }
  });

  it('scales fontSize and lineHeight of every role at 1.15 and 1.3', () => {
    for (const scale of [1.15, 1.3] as const) {
      for (const variant of Object.keys(typeScale) as (keyof typeof typeScale)[]) {
        const base = typeScale[variant];
        const out = scaleTypeStyle(base, scale);
        expect(out.fontSize).toBe(Math.round((base.fontSize as number) * scale));
        expect(out.lineHeight).toBe(Math.round((base.lineHeight as number) * scale));
      }
    }
  });

  it('preserves weight, family, letterSpacing and tabular-nums (only size grows)', () => {
    const coin = scaleTypeStyle(typeScale.coin, 1.3);
    expect(coin.fontFamily).toBe(typeScale.coin.fontFamily);
    expect(coin.fontWeight).toBe(typeScale.coin.fontWeight);
    expect(coin.fontVariant).toEqual(typeScale.coin.fontVariant);
    const label = scaleTypeStyle(typeScale.label, 1.3);
    expect(label.letterSpacing).toBe(typeScale.label.letterSpacing);
  });

  it('actually grows body text at 1.3 (not a silent no-op)', () => {
    expect(scaleTypeStyle(typeScale.body, 1.3).fontSize).toBeGreaterThan(
      typeScale.body.fontSize as number,
    );
  });
});

describe('resolvePalette — high-contrast token mapping', () => {
  it('returns the base palette when high contrast is off', () => {
    expect(resolvePalette(false)).toBe(palette);
  });

  it('returns the high-contrast palette when on, with a darker ink', () => {
    expect(resolvePalette(true)).toBe(highContrastPalette);
    expect(highContrastPalette.ink).not.toBe(palette.ink);
  });

  it('keeps the same key set as the base palette (no per-component fork)', () => {
    expect(Object.keys(highContrastPalette).sort()).toEqual(Object.keys(palette).sort());
  });
});
