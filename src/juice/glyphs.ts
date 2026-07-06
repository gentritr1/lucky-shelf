/**
 * Placeholder item glyphs — the chunky hand-painted sprites land with the
 * Higgsfield pack at M4; until then every screen shares this one map so a given
 * item reads the same everywhere. Every item in the 36-item table gets a
 * distinct glyph (R-38) so the `📦` fallback never shows in normal play; it
 * stays only as a defensive guard for unknown ids.
 */
export const ITEM_GLYPHS: Readonly<Record<string, string>> = {
  'wine-bottle': '🍷',
  'cheese-wheel': '🧀',
  'cheese-wheel-tier-2': '🧀',
  mirror: '🪞',
  'shop-cat': '🐈',
  'honey-jar': '🍯',
  'price-gun': '🏷️',
  'lucky-bamboo': '🎍',
  'antique-clock': '🕰️',
  fishbowl: '🐠',
  'ice-box': '🧊',
  'vintage-radio': '📻',
  'coupon-stack': '🎟️',
  'soap-bar': '🧼',
  // R-38 — remaining table items (placeholder emoji; art is M4).
  'antique-register': '🧾',
  'apple-basket': '🍎',
  'bread-loaf': '🍞',
  candle: '🕯️',
  'chocolate-box': '🍫',
  'crystal-decanter': '🫗',
  'dice-cup': '🎲',
  'flower-vase': '💐',
  'golden-scale': '⚖️',
  'jam-jars': '🫙',
  lantern: '🏮',
  'maneki-neko': '😺',
  'music-box': '🎶',
  'observation-hive': '🐝',
  'oil-painting': '🖼️',
  orrery: '🪐',
  'penny-jar': '🪙',
  'postcard-rack': '✉️',
  'record-crate': '📀',
  samovar: '🫖',
  'tea-tin': '🍵',
  terrarium: '🪴',
};

export function glyphFor(itemId: string): string {
  return ITEM_GLYPHS[itemId] ?? '📦';
}
