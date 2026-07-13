/**
 * WCAG 2.1 contrast-ratio measurement for the B-M7 accessibility floor.
 *
 * Reports the ratio for the text/background pairs that matter (body, coin, hints,
 * tag chips) in BOTH the normal and high-contrast palettes. Self-contained (no
 * react-native import) so it runs under plain tsx; the hex values MIRROR
 * src/ui/tokens.ts `palette` / `highContrastPalette` — keep them in sync.
 *
 *   nvm use 23.3.0 && node --import tsx scripts/contrast-check.ts
 */

// --- mirror of tokens.ts (the audited entries only) ------------------------
const palette = {
  wallCream: '#F4E8D3',
  creamBright: '#FFF8EB',
  parchment: '#EFDDBE',
  ink: '#3F2A1D',
  inkSoft: '#5A4534',
  inkFaint: '#735B44',
} as const;

const highContrastPalette = {
  wallCream: '#FBF4E6',
  creamBright: '#FFFDF9',
  parchment: '#F1E3C6',
  ink: '#241109',
  inkSoft: '#3A2417',
  inkFaint: '#584028',
} as const;

// --- WCAG relative luminance + contrast ------------------------------------
function channel(c: number): number {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}
function luminance(hex: string): number {
  const v = hex.replace('#', '');
  const r = parseInt(v.slice(0, 2), 16);
  const g = parseInt(v.slice(2, 4), 16);
  const b = parseInt(v.slice(4, 6), 16);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}
function ratio(fg: string, bg: string): number {
  const a = luminance(fg);
  const b = luminance(bg);
  const [hi, lo] = a > b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
}
function grade(r: number): string {
  if (r >= 7) return 'AAA';
  if (r >= 4.5) return 'AA';
  if (r >= 3) return 'AA-large';
  return 'FAIL';
}

interface Pair {
  name: string;
  fg: keyof typeof palette;
  bg: keyof typeof palette;
}
const pairs: Pair[] = [
  { name: 'body text (ink / wallCream)', fg: 'ink', bg: 'wallCream' },
  { name: 'coin text (ink / creamBright)', fg: 'ink', bg: 'creamBright' },
  { name: 'hint text (inkFaint / wallCream)', fg: 'inkFaint', bg: 'wallCream' },
  { name: 'tag text (inkFaint / parchment)', fg: 'inkFaint', bg: 'parchment' },
  { name: 'soft text (inkSoft / wallCream)', fg: 'inkSoft', bg: 'wallCream' },
];

function report(label: string, p: Record<string, string>) {
  console.log(`\n== ${label} ==`);
  for (const { name, fg, bg } of pairs) {
    const r = ratio(p[fg] as string, p[bg] as string);
    console.log(`  ${name.padEnd(38)} ${r.toFixed(2)}:1  ${grade(r)}`);
  }
}

report('NORMAL palette', palette);
report('HIGH-CONTRAST palette', highContrastPalette);
