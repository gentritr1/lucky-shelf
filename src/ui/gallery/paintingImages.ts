/**
 * B-M14 gallery painting registry. Metro requires literal `require()` paths, so
 * the map is spelled out (mirrors `src/juice/sprites.ts`). Keyed by painting id
 * (see `PAINTINGS` in `src/state/galleryModel.ts`). Each asset is a 1024×1024
 * JPEG (q≈85) processed from `~/Desktop/lucky-shelf-images/` — paintings 3 and 4
 * cropped inside their painted paper borders (see the B-M14 packet for sizes).
 */

export const PAINTING_IMAGES: Readonly<Record<string, number>> = {
  'still-life': require('../../../assets/gallery/painting-1-still-life.jpg'),
  'counter-cat': require('../../../assets/gallery/painting-2-counter-cat.jpg'),
  stockroom: require('../../../assets/gallery/painting-3-stockroom.jpg'),
  dusk: require('../../../assets/gallery/painting-4-storefront.jpg'),
};

export function paintingImage(paintingId: string): number | null {
  return PAINTING_IMAGES[paintingId] ?? null;
}
