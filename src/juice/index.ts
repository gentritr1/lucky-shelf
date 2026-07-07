/** Lane B juice surface: Skia scene, drag feel, haptics, motion. */

export { ShelfScene } from './ShelfScene';
export { ItemSprite } from './ItemSprite';
export { DuskAmbience } from './DuskAmbience';
export { DraggableItem, type SceneShared } from './DraggableItem';
// SkiaShelfFrame is intentionally NOT re-exported: importing it pulls in
// @shopify/react-native-skia, which auto-inits CanvasKit (wasm) on web. It is
// loaded native-only via a guarded require inside ShelfScene.
export { haptic, cascadeStepHaptic } from './haptics';
export { setMusicTrack, primeAudio, playCascadeSting, type MusicTrack } from './audio';
export { easings, spring, timing } from './motion';
export { ITEM_GLYPHS, glyphFor } from './glyphs';
export { ITEM_SPRITES, spriteFor, hasSprite } from './sprites';
export { goldenFixtures, stickyArrangeState } from './goldens';
export { useSkiaReady, ensureSkiaLoaded } from './skiaWeb';
export {
  CascadeLayer,
  SpeedControl,
  useCascadePlayer,
  buildKeyframes,
  type CascadeFrame,
  type CascadePlayer,
  type CascadeSpeed,
} from './cascade';
export {
  computeShelfLayout,
  slotCenter,
  slotTopLeft,
  pointToSlot,
  slotIndex,
  type ShelfLayout,
} from './layout';
