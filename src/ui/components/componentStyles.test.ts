import { describe, expect, it } from 'vitest';

import {
  borders,
  fonts,
  highContrastPalette,
  layout,
  palette,
  radii,
  shadows,
  spacing,
  touch,
  typeScale,
  type Palette,
} from '@/ui/tokens';

import { makeStyles as coinCounterStyles } from './CoinCounter.styles';
import { makeStyles as woodButtonStyles } from './WoodButton.styles';
import { makeStyles as panelStyles } from './Panel.styles';
import { makeStyles as rentChipStyles } from './RentChip.styles';
import { makeStyles as tagChipStyles } from './TagChip.styles';
import { makeStyles as movesPipsStyles } from './MovesPips.styles';
import { makeStyles as offerCardStyles } from './OfferCard.styles';
import { makeStyles as shelfPreviewStyles } from './ShelfPreview.styles';
import { makeStyles as onboardingHintStyles } from '../OnboardingHint.styles';

/**
 * THEME-1 byte-identity proof for the shared-component themed factories (the B-M9
 * recipe). Each `expected(p)` is an INDEPENDENT transcription of the pre-conversion
 * static sheet — only its COLOR-BEARING entries, which is exactly what the factory
 * now returns — parametrized by palette. Asserting `makeStyles(p)` equals it for
 * BOTH palettes proves two things at once:
 *  - at the base palette (= default prefs, `resolvePalette(false)`): byte-identical
 *    output — no color/layout value drifted during the static→factory migration;
 *  - at the high-contrast palette: every themed prop threads the ARGUMENT — a value
 *    that leaked to the module-scope `palette` would not re-theme and would diverge.
 * `resolvePalette(false) === palette` and `resolvePalette(true) === highContrastPalette`
 * are proven in tokens.test, so the two palettes stand in for the two pref states.
 *
 * Pure-layout entries that stayed in each component's static `StyleSheet` are NOT
 * in `makeStyles` and so are (correctly) absent here.
 *
 * Toggle and TopBar are intentionally absent: they carry no color-bearing static
 * sheet (Toggle applies its one themed color inline via `usePalette()`, and its
 * track color is an animated `interpolateColor`; TopBar's colors are inline
 * `AppText color` props). Their re-theming is pattern-verified like SectionLabel.
 */

interface Case {
  name: string;
  make: (p: Palette) => unknown;
  expected: (p: Palette) => unknown;
}

const cases: Case[] = [
  {
    name: 'CoinCounter',
    make: coinCounterStyles,
    expected: (p) => ({
      pill: {
        alignItems: 'center',
        alignSelf: 'flex-start',
        backgroundColor: p.creamBright,
        borderColor: p.goldDeep,
        borderRadius: radii.pill,
        borderWidth: borders.regular,
        flexDirection: 'row',
        gap: spacing.sm,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        ...shadows.float,
      },
      coin: {
        backgroundColor: p.coinGold,
        borderColor: p.goldDeep,
        borderRadius: radii.pill,
        borderWidth: borders.strong,
        height: 18,
        width: 18,
      },
      amount: {
        ...typeScale.coin,
        color: p.ink,
      },
      amountSlam: {
        fontFamily: fonts.ui,
        fontSize: 34,
        lineHeight: 42,
        fontWeight: '800',
        fontVariant: ['tabular-nums'],
        color: p.ink,
      },
    }),
  },
  {
    name: 'WoodButton',
    make: woodButtonStyles,
    expected: (p) => ({
      primary: {
        backgroundColor: p.shelfWood,
        borderColor: p.sunlight,
        borderTopWidth: borders.strong,
      },
      secondary: {
        backgroundColor: p.parchment,
        borderColor: p.parchmentEdge,
        borderWidth: borders.hairline,
      },
      labelPrimary: {
        color: p.creamBright,
      },
      labelSecondary: {
        color: p.ink,
      },
    }),
  },
  {
    name: 'Panel',
    make: panelStyles,
    expected: (p) => ({
      panel: {
        backgroundColor: p.creamBright,
        borderColor: p.parchmentEdge,
        borderRadius: radii.lg,
        borderWidth: borders.hairline,
        gap: layout.stackGap,
        padding: layout.cardPad,
        ...shadows.card,
      },
    }),
  },
  {
    name: 'RentChip',
    make: rentChipStyles,
    expected: (p) => ({
      calm: {
        backgroundColor: p.parchment,
        borderColor: p.parchmentEdge,
      },
      warm: {
        backgroundColor: p.sunlight,
        borderColor: p.goldDeep,
      },
      alarm: {
        backgroundColor: p.rentEmber,
        borderColor: p.emberDark,
      },
      calmText: { color: p.inkSoft },
      warmText: { color: p.ink },
      alarmText: { color: p.creamBright },
      // B-M16 rent-eve ember film (opacity animated at the call site).
      emberGlow: { backgroundColor: p.emberDark, borderRadius: radii.pill },
    }),
  },
  {
    name: 'TagChip',
    make: tagChipStyles,
    expected: (p) => ({
      chip: {
        alignSelf: 'flex-start',
        backgroundColor: p.parchment,
        borderRadius: radii.pill,
        paddingHorizontal: spacing.xs,
        paddingVertical: 1,
      },
      accent: {
        backgroundColor: p.tealDark,
      },
      text: {
        color: p.inkFaint,
        fontSize: 9,
        fontWeight: '600',
      },
      accentText: {
        color: p.creamBright,
      },
    }),
  },
  {
    name: 'MovesPips',
    make: movesPipsStyles,
    expected: (p) => ({
      pipFilled: {
        backgroundColor: p.accentTeal,
        borderColor: p.tealDark,
      },
      pipSpent: {
        backgroundColor: 'transparent',
        borderColor: p.parchmentEdge,
      },
    }),
  },
  {
    name: 'OfferCard',
    make: offerCardStyles,
    expected: (p) => ({
      card: {
        alignItems: 'center',
        backgroundColor: p.creamBright,
        borderColor: p.parchmentEdge,
        borderRadius: radii.lg,
        borderWidth: borders.hairline,
        flex: 1,
        gap: spacing.xs,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.md,
        ...shadows.card,
      },
      selected: {
        borderColor: p.accentTeal,
        borderWidth: borders.strong + 1,
        ...shadows.lifted,
      },
      spriteMat: {
        alignItems: 'center',
        backgroundColor: p.wallCream,
        borderRadius: radii.md,
        height: 60,
        justifyContent: 'center',
        padding: spacing.xs,
        width: 60,
      },
      name: {
        ...typeScale.label,
        color: p.ink,
        letterSpacing: 0.2,
        textTransform: 'none',
      },
      pip: {
        backgroundColor: p.goldDeep,
        borderRadius: radii.pill,
        height: 5,
        width: 5,
      },
      coinDot: {
        backgroundColor: p.coinGold,
        borderColor: p.goldDeep,
        borderRadius: radii.pill,
        borderWidth: borders.regular,
        height: 12,
        width: 12,
      },
      value: {
        ...typeScale.coin,
        fontSize: 16,
        lineHeight: 20,
        color: p.ink,
      },
    }),
  },
  {
    name: 'ShelfPreview',
    make: shelfPreviewStyles,
    expected: (p) => ({
      frame: {
        backgroundColor: p.shelfWood,
        borderColor: p.woodDark,
        borderRadius: radii.lg,
        borderWidth: borders.frame,
        gap: spacing.sm,
        padding: spacing.md,
      },
      slot: {
        alignItems: 'center',
        aspectRatio: 1,
        backgroundColor: p.woodInset,
        borderRadius: radii.sm,
        flex: 1,
        justifyContent: 'center',
      },
      plank: {
        backgroundColor: p.woodLight,
        borderBottomColor: p.woodDark,
        borderBottomWidth: borders.strong,
        borderRadius: radii.xs,
        height: 8,
        marginTop: spacing.xs,
      },
      valueBadge: {
        backgroundColor: p.coinGold,
        borderColor: p.goldDeep,
        borderRadius: radii.pill,
        borderWidth: borders.hairline,
        marginTop: -spacing.xs,
        paddingHorizontal: spacing.sm,
      },
      valueText: {
        ...typeScale.label,
        color: p.ink,
        letterSpacing: 0,
      },
    }),
  },
  {
    name: 'OnboardingHint',
    make: onboardingHintStyles,
    expected: (p) => ({
      card: {
        alignItems: 'center',
        alignSelf: 'stretch',
        backgroundColor: p.sunlight,
        borderColor: p.goldDeep,
        borderRadius: radii.md,
        borderWidth: borders.hairline,
        flexDirection: 'row',
        gap: spacing.sm,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
      },
      copy: {
        flex: 1,
        gap: spacing.xxs,
      },
      skip: {
        alignItems: 'center',
        borderRadius: radii.pill,
        justifyContent: 'center',
        minHeight: touch.minTargetPt,
        minWidth: touch.minTargetPt,
        paddingHorizontal: spacing.xs,
      },
      skipPressed: {
        backgroundColor: p.parchment,
      },
    }),
  },
];

describe('THEME-1 shared-component themed styles', () => {
  for (const { name, make, expected } of cases) {
    describe(name, () => {
      it('is byte-identical at default prefs (base palette)', () => {
        expect(make(palette)).toEqual(expected(palette));
      });

      it('threads the palette argument under high contrast (no static leak)', () => {
        expect(make(highContrastPalette)).toEqual(expected(highContrastPalette));
      });
    });
  }
});
