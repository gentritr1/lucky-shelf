import { Platform, type TextStyle, type ViewStyle } from 'react-native';

/**
 * Lane B design tokens — "Golden Hour General Store."
 * Values, not vibes: every screen and component themes exclusively from this
 * file so the Higgsfield art pass at M4 is a reskin, not a rework.
 */

// ---------------------------------------------------------------------------
// Palette. Kickoff §7 anchors plus derived shades. No color literals may
// appear outside this file (dev/debug screens excepted).
// ---------------------------------------------------------------------------

export const palette = {
  // anchors (kickoff §7 — do not drift)
  shelfWood: '#8A5A38',
  wallCream: '#F4E8D3',
  sunlight: '#FFD9A0',
  accentTeal: '#3E8E7E',
  coinGold: '#F5B942',
  rentEmber: '#D9603B',

  // derived wood
  woodDark: '#6B4226',
  woodLight: '#A8744C',
  woodInset: '#7A4E30',

  // derived paper/wall
  creamBright: '#FFF8EB',
  parchment: '#EFDDBE',
  parchmentEdge: '#D9B98C',

  // ink
  ink: '#3F2A1D',
  inkSoft: '#5A4534',
  inkFaint: '#8A745C',

  // accents
  tealDark: '#2F6E62',
  goldDeep: '#D99A1B',
  emberDark: '#B24325',

  // row-aura band (R-33/R-41): coin-magic gold, shown at ~0.3 opacity.
  // Purpose-named so the aura reskins independently of accentTeal.
  auraGold: '#FFD9A0',
  auraGoldEdge: '#D99A1B',

  // drag feedback
  slotLegal: '#7FBF9E',
  slotIllegal: '#E2A28F',

  shadow: '#4A2E17',

  // modal scrim (R-36/R-40): ink at ~0.55 so a cascade overlay dims the arrange
  // HUD behind it without hiding the scored-day header.
  scrim: 'rgba(63, 42, 29, 0.55)',
} as const;

/**
 * Colorblind-safe rule-arrow palette (Pillar 2 accessibility): four hues
 * separated in both hue and lightness; cascade arrows cycle through these.
 */
export const arrowPalette = ['#3E8E7E', '#F5B942', '#8B6FB8', '#5B87B0'] as const;

// ---------------------------------------------------------------------------
// Layout scales.
// ---------------------------------------------------------------------------

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  huge: 32,
  giant: 40,
} as const;

export const radii = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
} as const;

/** Accessibility floor (kickoff §6): min touch target, one-handed reach zone. */
export const touch = {
  minTargetPt: 44,
  /** Primary actions live in the bottom fraction of the screen. */
  reachZoneBottomFraction: 0.6,
} as const;

// ---------------------------------------------------------------------------
// Type scale. System font for M0; the display face lands with the art pass.
// Coins always render with tabular numerals so count-ups don't jitter.
// ---------------------------------------------------------------------------

// Cozy pairing (frontend-design: never generic system fonts). Baloo 2 — chunky,
// rounded, storybook — carries display/headings and the coin numerals, echoing
// the "chunky miniature" art. Nunito — warm, rounded, legible — carries body.
// Loaded in _layout via expo-font; these family names must match.
export const fonts = {
  display: 'Baloo2',
  body: 'Nunito',
} as const;

export const typeScale = {
  display: { fontFamily: fonts.display, fontSize: 34, lineHeight: 42, fontWeight: '800' },
  title: { fontFamily: fonts.display, fontSize: 24, lineHeight: 30, fontWeight: '700' },
  heading: { fontFamily: fonts.display, fontSize: 18, lineHeight: 24, fontWeight: '600' },
  body: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, fontWeight: '400' },
  label: { fontFamily: fonts.body, fontSize: 12, lineHeight: 16, fontWeight: '700', letterSpacing: 0.6 },
  coin: { fontFamily: fonts.display, fontSize: 20, lineHeight: 24, fontWeight: '700', fontVariant: ['tabular-nums'] },
} as const satisfies Record<string, TextStyle>;

// ---------------------------------------------------------------------------
// Shadows (iOS shadow* + Android elevation together).
//
// R-25 (Fable pre-signed): on web, react-native-web deprecates the shadow*
// props and warns on every mount. We emit an equivalent `boxShadow` string
// there instead and keep the native shadow*/elevation identical, so the depth
// is byte-for-byte the same on device and the web warning goes silent. The
// branch lives here — no component ever reasons about platform shadows.
// ---------------------------------------------------------------------------

function hexToRgba(hex: string, opacity: number): string {
  const value = hex.replace('#', '');
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

interface ShadowSpec {
  opacity: number;
  radius: number;
  offsetY: number;
  elevation: number;
}

function shadow({ opacity, radius, offsetY, elevation }: ShadowSpec): ViewStyle {
  if (Platform.OS === 'web') {
    return { boxShadow: `0px ${offsetY}px ${radius}px ${hexToRgba(palette.shadow, opacity)}` } as ViewStyle;
  }
  return {
    shadowColor: palette.shadow,
    shadowOpacity: opacity,
    shadowRadius: radius,
    shadowOffset: { width: 0, height: offsetY },
    elevation,
  };
}

export const shadows = {
  card: shadow({ opacity: 0.18, radius: 6, offsetY: 3, elevation: 3 }),
  lifted: shadow({ opacity: 0.28, radius: 14, offsetY: 8, elevation: 8 }),
  float: shadow({ opacity: 0.12, radius: 3, offsetY: 1, elevation: 1 }),
} as const satisfies Record<string, ViewStyle>;

// ---------------------------------------------------------------------------
// Motion. Durations in ms; easings as cubic-bezier control points (feed
// Easing.bezier / Reanimated); springs as Reanimated spring configs.
// Reduced-motion mode multiplies durations by 0 and swaps springs for timing.
// ---------------------------------------------------------------------------

export const motion = {
  durations: {
    tick: 80, // micro feedback (press-in)
    snap: 140, // grab lift, chip changes
    settle: 220, // drop settle, panel entrance
    drift: 320, // rubber-band return, layout shifts
    cascadeStep: 260, // one trace event at 1x speed (motion-spec §4)
    countUp: 120, // per-slot number tick on itemBase/ruleFire/itemTotal
    arrowDraw: 180, // ruleFire source→target arrow draw
    auraSweep: 240, // rowAura glow sweep left→right (then persists per R-9)
    morph: 300, // transform / vanish after totals, before dayTotal
    banner: 600, // named-combo banner moment
  },
  easings: {
    /** standard decel — entrances, count-ups */
    out: [0.22, 0.9, 0.32, 1] as const,
    /** accel — exits */
    in: [0.55, 0.06, 0.68, 0.19] as const,
    /** playful overshoot — badges, banner pop */
    overshoot: [0.34, 1.4, 0.44, 1] as const,
    /** rubber-band return for invalid drops */
    rubber: [0.2, 0.9, 0.3, 1.1] as const,
  },
  springs: {
    grab: { damping: 18, stiffness: 220, mass: 0.9 },
    settle: { damping: 14, stiffness: 260, mass: 1 },
    neighborPart: { damping: 20, stiffness: 300, mass: 0.8 },
  },
} as const;

// ---------------------------------------------------------------------------
// Haptic choreography map (expo-haptics). The juice layer reads these names;
// no component calls Haptics directly. Cascade intensity escalates with
// runningTotal thresholds (see docs/lane-b/motion-spec.md).
// ---------------------------------------------------------------------------

export const hapticMap = {
  placementTick: 'selection',
  grabLift: 'impact-light',
  dropSettle: 'impact-light',
  invalidReturn: 'notification-error',
  cascadeStepSmall: 'impact-light',
  cascadeStepMedium: 'impact-medium',
  cascadeStepBig: 'impact-heavy',
  comboBanner: 'notification-success',
  dayTotalSlam: 'impact-heavy',
  rentThud: 'impact-heavy',
} as const;

/** runningTotal thresholds that bump cascade haptic intensity one step. */
export const cascadeEscalation = { mediumAt: 25, heavyAt: 60 } as const;
