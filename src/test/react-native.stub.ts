/**
 * Minimal `react-native` stub for the vitest node env (B-M7). The real RN entry
 * is Flow-typed source vitest can't parse, and pure token/logic modules
 * (`src/ui/tokens.ts`) import `Platform` at load. This stub provides only what
 * those modules touch at import time — it is NOT a render shim. Wired via the
 * `react-native` alias in vitest.config.ts; only modules that import RN resolve
 * to it, so sim/state tests are unaffected.
 */
export const Platform = {
  OS: 'ios' as const,
  select: <T,>(specifics: { ios?: T; android?: T; native?: T; default?: T }): T | undefined =>
    specifics.ios ?? specifics.native ?? specifics.default,
};

export const StyleSheet = {
  create: <T,>(styles: T): T => styles,
};
