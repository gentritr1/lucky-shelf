/**
 * B-M10 — friendly seed labels. A pure, deterministic codec that turns any run
 * seed (e.g. `daily-2026-07-09`) into a cozy nickname like `CLOVER-713`, for the
 * daily share card and summary header. Players speak these labels to each other,
 * so the mapping must be STABLE FOREVER: same seed → same label across builds,
 * platforms, and JS engines. That's why the hash is a hand-rolled FNV-1a (a
 * fixed, fully-specified integer algorithm) rather than anything engine-derived.
 *
 * The label is a NICKNAME, not a key: collisions are acceptable and expected
 * (64 words × 1000 numbers = 64k labels, far fewer than the seed space). Never
 * parse a label back into a seed or use it to look a run up — it only exists to
 * be read aloud and recognised. The daily seed itself stays the source of truth.
 *
 * Word list hygiene (enforced by seedLabel.test.ts): exactly 64 unique words,
 * uppercase, cozy shop/luck/botanical theme — deliberately NO gambling language
 * (no jackpot/spin/bet/dice/chip/win), matching the anti-casino paper-and-brass
 * tone of the share surfaces.
 */

/**
 * The cozy word pool. Order is part of the codec contract — reordering or
 * removing a word changes existing labels, so only ever APPEND (and never past
 * 64 without re-checking the number split below). Shop, luck-charm, and
 * botanical/pantry words; no gambling terms.
 */
export const SEED_LABEL_WORDS: readonly string[] = [
  'CLOVER', 'ACORN', 'MAPLE', 'HONEY', 'WILLOW', 'CEDAR', 'THYME', 'SAGE',
  'FENNEL', 'HAZEL', 'IVY', 'FERN', 'MOSS', 'BIRCH', 'ASPEN', 'COCOA',
  'GINGER', 'POPPY', 'DAISY', 'TULIP', 'LILY', 'CLOVE', 'NUTMEG', 'SAFFRON',
  'BASIL', 'MINT', 'OLIVE', 'PLUM', 'PEACH', 'PEAR', 'APRICOT', 'WALNUT',
  'CHESTNUT', 'ALMOND', 'MARIGOLD', 'LANTERN', 'KETTLE', 'TEAPOT', 'BISCUIT', 'MUFFIN',
  'CINNAMON', 'PUMPKIN', 'HARVEST', 'MEADOW', 'GARDEN', 'ORCHARD', 'COTTAGE', 'HEARTH',
  'AMBER', 'COPPER', 'PEWTER', 'BRASS', 'LINEN', 'COTTON', 'WICKER', 'PEBBLE',
  'CANDLE', 'WREN', 'ROBIN', 'SPARROW', 'FINCH', 'HOLLY', 'JUNIPER', 'BRAMBLE',
];

/**
 * FNV-1a 32-bit — a fixed, engine-independent string hash. `Math.imul` keeps the
 * multiply in 32-bit space on every platform; the final `>>> 0` yields an
 * unsigned 32-bit integer. Do NOT swap this for a language-provided hash: the
 * whole point is that the bits never change.
 */
function fnv1a32(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/**
 * Map a seed to its cozy `WORD-NNN` label. The word comes from the low bits, the
 * three-digit number from the remaining bits, so the two vary independently. NNN
 * is zero-padded to a fixed width so labels line up when listed.
 */
export function seedLabel(seed: string): string {
  const hash = fnv1a32(seed);
  const word = SEED_LABEL_WORDS[hash % SEED_LABEL_WORDS.length];
  const number = Math.floor(hash / SEED_LABEL_WORDS.length) % 1000;
  return `${word}-${String(number).padStart(3, '0')}`;
}
