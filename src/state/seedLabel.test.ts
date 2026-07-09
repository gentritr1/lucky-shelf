import { describe, expect, it } from 'vitest';

import { SEED_LABEL_WORDS, seedLabel } from './seedLabel';

describe('seedLabel — friendly seed codec (B-M10)', () => {
  it('is deterministic: same seed → same label, always', () => {
    for (const seed of ['daily-2026-07-09', 'daily-2026-01-01', 'run-abc', '']) {
      expect(seedLabel(seed)).toBe(seedLabel(seed));
    }
  });

  it('pins known seeds to frozen labels (the mapping must never drift)', () => {
    // These labels are spoken between players — hard-frozen values computed once
    // from the FNV-1a codec. If any assertion here changes, the codec has broken
    // its forever-contract; fix the codec, never "update" these to pass.
    expect(seedLabel('daily-2026-07-09')).toBe('ACORN-770');
    expect(seedLabel('daily-2026-01-01')).toBe('BRAMBLE-924');
    expect(seedLabel('lucky-shelf')).toBe('PEWTER-784');
    expect(seedLabel('')).toBe('CEDAR-879');
  });

  it('always matches the WORD-NNN format', () => {
    const format = /^[A-Z]+-\d{3}$/;
    for (let i = 0; i < 500; i += 1) {
      expect(seedLabel(`daily-2026-${String(i).padStart(4, '0')}`)).toMatch(format);
    }
  });

  it('only ever uses words from the curated list', () => {
    const known = new Set(SEED_LABEL_WORDS);
    for (let i = 0; i < 500; i += 1) {
      const [word = ''] = seedLabel(`seed-${i}`).split('-');
      expect(known.has(word)).toBe(true);
    }
  });

  it('emits a number in [000, 999]', () => {
    for (let i = 0; i < 500; i += 1) {
      const [, digits = ''] = seedLabel(`n-${i}`).split('-');
      const n = Number(digits);
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThanOrEqual(999);
    }
  });
});

describe('SEED_LABEL_WORDS — list hygiene', () => {
  it('holds exactly 64 words', () => {
    expect(SEED_LABEL_WORDS).toHaveLength(64);
  });

  it('has no duplicates', () => {
    expect(new Set(SEED_LABEL_WORDS).size).toBe(SEED_LABEL_WORDS.length);
  });

  it('is all-uppercase A–Z (no gambling glyphs, digits, or spaces)', () => {
    for (const word of SEED_LABEL_WORDS) {
      expect(word).toMatch(/^[A-Z]+$/);
    }
  });

  it('contains no gambling words', () => {
    const banned = new Set([
      'JACKPOT', 'SPIN', 'BET', 'DICE', 'CHIP', 'WIN', 'ROLL', 'ANTE',
      'CASINO', 'SLOT', 'WAGER', 'ODDS', 'POKER', 'BLACKJACK', 'ROULETTE',
    ]);
    for (const word of SEED_LABEL_WORDS) {
      expect(banned.has(word)).toBe(false);
    }
  });
});
