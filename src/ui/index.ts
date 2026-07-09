/** Lane B surface: tokens + component kit. Never imports /src/sim internals. */

export * from './tokens';
export { usePrefs, useReducedMotion, useTextScale, useHighContrast, usePalette, type TextScale } from './prefs';
export { useThemedStyles } from './useThemedStyles';
export { AppText, type TextVariant } from './components/AppText';
export { Panel } from './components/Panel';
export { WoodButton } from './components/WoodButton';
export { CoinCounter } from './components/CoinCounter';
export { RentChip } from './components/RentChip';
export { OfferCard, type OfferCardData } from './components/OfferCard';
export { ShelfPreview } from './components/ShelfPreview';
export { TagChip } from './components/TagChip';
export { SectionLabel } from './components/SectionLabel';
export { Toggle } from './components/Toggle';
export { MovesPips } from './components/MovesPips';
export { TopBar } from './components/TopBar';
export { OnboardingHint } from './OnboardingHint';
export { GearIcon, Medallion } from './icons';
