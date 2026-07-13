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
  // translucent creamBright — the legibility plate behind text/controls that sit
  // over backdrop imagery (title wordmark, draft header/caption). Lets the art
  // stay vivid while bare text still reads.
  plate: 'rgba(255, 248, 235, 0.82)',

  // ink
  ink: '#3F2A1D',
  inkSoft: '#5A4534',
  inkFaint: '#735B44', // quiet secondary copy; still AA on wallCream/parchment

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
 * High-contrast palette (B-M7 accessibility floor). A TOKEN-LEVEL alternate
 * mapping — NOT a per-component color fork (the hard rule): ink goes darker,
 * cream goes lighter, chip/border edges deepen for separation. Consuming code
 * selects between this and `palette` via `resolvePalette(highContrast)`. Only the
 * text-legibility-critical entries change; decorative anchors (wood, teal, ember)
 * carry through unchanged so the store still reads as the Golden Hour General
 * Store. Measured WCAG ratios for both palettes: `scripts/contrast-check.ts`.
 *
 * NOTE (wiring): today most screens read `palette` statically inside
 * `StyleSheet.create` at module load, so flipping the pref cannot re-theme them
 * live without migrating those reads to `resolvePalette` (see the B-M7 packet's
 * "wiring reality" — staged, not a per-component fork). This mapping + its ratios
 * are the delivered token layer; the app-wide swap is the deferred follow-up.
 */
/** The palette shape with widened string values — what an alternate mapping fills. */
export type Palette = { readonly [K in keyof typeof palette]: string };

export const highContrastPalette: Palette = {
  ...palette,
  wallCream: '#FBF4E6', // lighter wall so ink pops
  creamBright: '#FFFDF9',
  parchment: '#F1E3C6', // lighter chip bed for ink-on-chip
  parchmentEdge: '#B08A50', // deeper chip edge for separation
  ink: '#241109', // near-black brown for body/heading/coin text
  inkSoft: '#3A2417',
  inkFaint: '#584028', // darkened so hints/tag text clear AA on the lighter wall
  goldDeep: '#B47C10', // deeper gold for coin-dot / accent borders on cream
};

/** Pick the live palette for the current high-contrast pref. No component fork. */
export function resolvePalette(highContrast: boolean): Palette {
  return highContrast ? highContrastPalette : palette;
}

/**
 * Colorblind-safe rule-arrow palette (Pillar 2 accessibility): four hues
 * separated in both hue and lightness; cascade arrows cycle through these.
 */
export const arrowPalette = ['#3E8E7E', '#F5B942', '#8B6FB8', '#5B87B0'] as const;

/**
 * Build-identity accents (Lane B signposting) — one warm, storybook-harmonious
 * hue per synergy-eligible tag, so a drink shelf reads distinct from a food or
 * antique shelf at a glance. Keyed by tag; fall back to `palette.goldDeep`.
 */
export const buildAccents: Record<string, string> = {
  fancy: '#D99A1B',
  food: '#7FA653',
  antique: '#9C6B3F',
  lucky: '#D9603B',
  fragile: '#5B87B0',
  utility: '#7C7A70',
  drink: '#8B5A7A',
  perishable: '#E0863C',
  sweet: '#D07AA0',
  plant: '#5B9B6A',
} as const;

/**
 * One MaterialCommunityIcons name per build/synergy tag, shared by the
 * build-identity hero, the supplier picker, and the summary recap so an
 * archetype reads the same everywhere. Rendered inside a tinted container by
 * `<TagIcon>` so iconography obeys the palette (accent-tinted) like the rest of
 * the chrome — never a bare emoji (inconsistent width, no color control). One
 * coherent FILLED set; falls back to `tagIconFallback` for unknown tags (never
 * shown in normal play — all synergy tags are mapped). Names verified against
 * the MCI glyphmap (scripts note in the ICON-2 report).
 */
export const tagIcon: Record<string, string> = {
  fancy: 'star-four-points',
  food: 'food-apple',
  antique: 'treasure-chest',
  lucky: 'clover',
  fragile: 'glass-flute',
  utility: 'wrench',
  drink: 'glass-mug-variant',
  perishable: 'fruit-cherries',
  sweet: 'candy',
  plant: 'sprout',
} as const;

/** Defensive fallback glyph for an unmapped tag (filled, matches the set). */
export const tagIconFallback = 'tag';

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

// ---------------------------------------------------------------------------
// Layout system — the ONE source for screen rhythm, border weights, and how
// rounded/bordered boxes nest. Screens and components must theme from these
// (not raw spacing/radii) so insets stay identical everywhere and nested
// borders read as one intentional system. See docs/lane-b/design-system.md.
// ---------------------------------------------------------------------------

/** Screen rhythm: every screen uses the same edge inset and stacking gaps. */
export const layout = {
  screenPadX: spacing.xl, // 20 — horizontal edge inset, EVERY screen
  screenTopGap: spacing.md, // 12 — below the safe-area top
  screenBottomGap: spacing.xl, // 20 — above the safe-area bottom
  sectionGap: spacing.lg, // 16 — between major stacked sections
  stackGap: spacing.md, // 12 — between panels / within a section
  controlGap: spacing.sm, // 8 — between small inline controls
  cardPad: spacing.lg, // 16 — inner padding of a panel/card surface
} as const;

/**
 * Border-weight ladder. A nested border is NEVER thicker than its parent's:
 * frame (shelf) → strong (selected/emphasis) → regular (recessed wells/chips)
 * → hairline (default card/plinth outline).
 */
export const borders = {
  frame: 3,
  strong: 2,
  regular: 1.5,
  hairline: 1,
} as const;

/**
 * Concentric corner rule. A child inset by `pad` inside a rounded parent keeps
 * a uniform corner gap when its radius is `parentRadius - pad`. Use this for an
 * edge-hugging child; for a *centered* child, step down one radius tier instead
 * (lg 16 → md 12 → sm 8 → xs 4).
 */
export function innerRadius(outer: number, pad: number): number {
  return Math.max(radii.xs, outer - pad);
}

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
  // Platform system face for numerals, labels, and body copy (TYPO-1). SF on iOS
  // / Roboto on Android center their glyphs correctly inside a constrained
  // lineHeight — unlike Baloo2/Nunito, whose glyphs sit high in the line box and
  // forced per-site `baloo2IconNudge` translateY hacks beside every coin dot/icon.
  // Baloo2 (display) now stays ONLY on block-centered display/title/heading
  // headlines, where the brand personality reads and the metrics don't hurt.
  // ONE central decision: swapping this one value re-faces body/label/coin/stat.
  ui: Platform.select({ ios: 'System', android: 'sans-serif', web: 'System', default: 'System' }) ?? 'System',
  // Platform typewriter face for the paper-receipt share card (B-M10). The
  // receipt body is dot-leader aligned by `formatReceipt`, which only lines up
  // in a fixed-width font. No new asset — this uses the OS monospace so it costs
  // nothing to load; the receipt is the only surface that reads as "printed".
  mono: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }) ?? 'monospace',
} as const;

export const typeScale = {
  display: { fontFamily: fonts.display, fontSize: 34, lineHeight: 42, fontWeight: '800' },
  title: { fontFamily: fonts.display, fontSize: 24, lineHeight: 30, fontWeight: '700' },
  heading: { fontFamily: fonts.display, fontSize: 18, lineHeight: 24, fontWeight: '600' },
  body: { fontFamily: fonts.ui, fontSize: 15, lineHeight: 22, fontWeight: '500' },
  label: { fontFamily: fonts.ui, fontSize: 12, lineHeight: 16, fontWeight: '700', letterSpacing: 0.6 },
  coin: { fontFamily: fonts.ui, fontSize: 20, lineHeight: 24, fontWeight: '700', fontVariant: ['tabular-nums'] },
  // Numeric VALUES (BestRow/Stat totals, previously abusing `heading`'s Baloo2).
  // System font + tabular-nums so figures align in a column and center against
  // their labels; sits between heading (18) and coin (20) in emphasis.
  stat: { fontFamily: fonts.ui, fontSize: 18, lineHeight: 24, fontWeight: '700', fontVariant: ['tabular-nums'] },
  receipt: { fontFamily: fonts.mono, fontSize: 12, lineHeight: 18, fontWeight: '400' },
} as const satisfies Record<string, TextStyle>;

/**
 * Large-text mode (B-M7 accessibility floor). Scales a type-scale role's font
 * and line height by the pref's `textScale` (1 | 1.15 | 1.3). This is THE ONE
 * place text grows — `AppText` applies it centrally so no screen does per-screen
 * font math (the hard rule). `scale === 1` returns the base object unchanged so
 * the default path is byte-identical. Only `fontSize`/`lineHeight` scale; weight,
 * family, letterSpacing, tabular-nums are preserved.
 */
export function scaleTypeStyle(base: TextStyle, scale: number): TextStyle {
  if (scale === 1) return base;
  const scaled: TextStyle = { ...base };
  if (typeof base.fontSize === 'number') scaled.fontSize = Math.round(base.fontSize * scale);
  if (typeof base.lineHeight === 'number') scaled.lineHeight = Math.round(base.lineHeight * scale);
  return scaled;
}

/**
 * @deprecated TYPO-1 moved every numeral/label role (coin/label/body/stat) to the
 * platform system face (`fonts.ui`), whose glyphs center correctly inside a
 * constrained line box — so none of the former call sites (CoinCounter, OfferCard,
 * restock) need this nudge anymore and all were removed. Baloo2 now survives only
 * on block-centered display/title/heading headlines, which are centered by flexbox
 * and must NOT use this helper. Kept exported for one release in case a future
 * Baloo2-beside-an-icon site appears; if none does, delete it.
 *
 * Optical centering for a display-font (Baloo2) number/label sitting in a ROW
 * beside a SHORTER neighbor — a coin dot, an icon. Baloo2 glyphs sit high in
 * their line box, so `alignItems:'center'` leaves the glyph above the neighbor's
 * center; this nudges it down to sit dead-center. Calibrated on the iOS simulator
 * (zoomed): dy ≈ 0.12·size (16px→2, 20px→2, 34px→4).
 *
 * Icon-adjacent ONLY. Do NOT use for block-centered text (buttons, titles): a
 * `<Text>` that is the sole centered child of a box is already centered by
 * flexbox, and this would push it low. iOS nudges via `translateY`
 * (`includeFontPadding`/`textAlignVertical` are Android no-ops); Android centers
 * within the padded line box instead. Callers with their own `transform` must
 * compose manually — spreading this replaces `transform`.
 */
export function baloo2IconNudge(fontSize: number): TextStyle {
  if (Platform.OS === 'android') {
    return { includeFontPadding: false, textAlignVertical: 'center' };
  }
  return { includeFontPadding: false, transform: [{ translateY: Math.round(fontSize * 0.12) }] };
}

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
    cascadeStep: 380, // one trace event at 1x speed. Was 260 — raised twice for
    // legibility (2026-07-11 feel-gate: the linked ruleFires read as a fast frenzy,
    // no time to follow each cause→effect beat). 2× still halves it (190ms) for
    // speed-runners.
    countUp: 120, // per-slot number tick on itemBase/ruleFire/itemTotal
    tokenTravel: 280, // ruleFire coin flight source→target; a calm, followable lob
    // that lands inside the 380ms dwell then HOLDS on the target (140ms at 2×).
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
    // Cascade "receive" squash — a scored item absorbs the landing coin and
    // springs back (Fable plan #2, completes give→travel→receive).
    impact: { damping: 12, stiffness: 320, mass: 0.7 },
  },
  // B-M11: a first-EVER combo discovery lingers on its cascade step by this
  // factor (a brief slow-beat of warm recognition). Applied only to that step's
  // dwell in the cascade player; reduced motion drops it entirely (cadence
  // unchanged, R-28). A multiplier, not a duration — it scales `cascadeStep`.
  discoverySlowBeat: 1.2,
  // Cascade ruleFire "coin travel" (Fable plan #1): a chunky gold coin lobs from
  // the source slot to the target instead of a drawn line (the line read as a
  // fast "green line" and lingered — removed entirely, 2026-07-11 feel-gate). The
  // arc is a fraction of the source→target distance (perpendicular lift). Reduced
  // motion snaps the coin onto the target (R-28) — no flight.
  cascade: {
    tokenArcFraction: 0.16, // peak lift = fraction × source→target length
    // Combo "members take a bow" (Fable plan #4): when a combo is NAMED, its
    // member items hop once in reading order — a little curtain-call on the shelf.
    hopY: 5, // peak lift of a member hop, px
    hopStaggerMs: 45, // delay between successive members (reading order)
    // Day total lands first; rent follows as its own consequence rather than a
    // second heavy impact on the exact same frame.
    rentThudDelayMs: 220,
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
  // B-M6: the apex cascade's extra celebratory punch, layered on the slam. A
  // distinct success pattern (not another heavy thud) so an apex day *feels*
  // different in the hand. Fires in reduced-motion too (haptics are that channel).
  apexSlam: 'notification-success',
} as const;

/** runningTotal thresholds that bump cascade haptic intensity one step. */
export const cascadeEscalation = { mediumAt: 25, heavyAt: 60 } as const;
