/**
 * Static sprite registry — the Higgsfield pack (M4). Metro requires literal
 * `require()` paths, so the map is spelled out. `spriteFor` returns the bundled
 * asset for an item, or null so the caller falls back to the emoji glyph
 * (`glyphs.ts`). Mirrors `assets/sprites/manifest.json`.
 */

export const ITEM_SPRITES: Readonly<Record<string, number>> = {
  'shop-cat': require('../../assets/sprites/shop-cat.png'),
  'wine-bottle': require('../../assets/sprites/wine-bottle.png'),
  'cheese-wheel': require('../../assets/sprites/cheese-wheel.png'),
  'cheese-wheel-tier-2': require('../../assets/sprites/cheese-wheel-tier-2.png'),
  'honey-jar': require('../../assets/sprites/honey-jar.png'),
  fishbowl: require('../../assets/sprites/fishbowl.png'),
  'antique-clock': require('../../assets/sprites/antique-clock.png'),
  'lucky-bamboo': require('../../assets/sprites/lucky-bamboo.png'),
  'coupon-stack': require('../../assets/sprites/coupon-stack.png'),
  'bread-loaf': require('../../assets/sprites/bread-loaf.png'),
  candle: require('../../assets/sprites/candle.png'),
  'flower-vase': require('../../assets/sprites/flower-vase.png'),
  'penny-jar': require('../../assets/sprites/penny-jar.png'),
  'apple-basket': require('../../assets/sprites/apple-basket.png'),
  'tea-tin': require('../../assets/sprites/tea-tin.png'),
  'dice-cup': require('../../assets/sprites/dice-cup.png'),
  'postcard-rack': require('../../assets/sprites/postcard-rack.png'),
  'soap-bar': require('../../assets/sprites/soap-bar.png'),
  mirror: require('../../assets/sprites/mirror.png'),
  'price-gun': require('../../assets/sprites/price-gun.png'),
  'ice-box': require('../../assets/sprites/ice-box.png'),
  'chocolate-box': require('../../assets/sprites/chocolate-box.png'),
  'record-crate': require('../../assets/sprites/record-crate.png'),
  'music-box': require('../../assets/sprites/music-box.png'),
  'jam-jars': require('../../assets/sprites/jam-jars.png'),
  lantern: require('../../assets/sprites/lantern.png'),
  terrarium: require('../../assets/sprites/terrarium.png'),
  'vintage-radio': require('../../assets/sprites/vintage-radio.png'),
  'oil-painting': require('../../assets/sprites/oil-painting.png'),
  samovar: require('../../assets/sprites/samovar.png'),
  'crystal-decanter': require('../../assets/sprites/crystal-decanter.png'),
  'antique-register': require('../../assets/sprites/antique-register.png'),
  'observation-hive': require('../../assets/sprites/observation-hive.png'),
  'golden-scale': require('../../assets/sprites/golden-scale.png'),
  'maneki-neko': require('../../assets/sprites/maneki-neko.png'),
  orrery: require('../../assets/sprites/orrery.png'),
};

export function spriteFor(itemId: string): number | null {
  return ITEM_SPRITES[itemId] ?? null;
}

export function hasSprite(itemId: string): boolean {
  return itemId in ITEM_SPRITES;
}
