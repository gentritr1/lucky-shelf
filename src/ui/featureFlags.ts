/**
 * UI-level feature flags (Lane B). Distinct from `src/sim/economy.ts` flags and
 * the balance harness's `BALANCE_FLAG_ENV_KEYS`: these gate meta/cosmetic UI
 * surfaces that carry ZERO sim, economy, contract, or determinism meaning, so
 * they must never enter the balance flag world (a gallery flag flip must not
 * perturb a single scored coin).
 *
 * The env override mirrors the sim's `flagEnabled` shape (`'1'`/`'0'`) purely so
 * unit tests can exercise both flag worlds without editing the compiled default;
 * on device `process.env[...]` is undefined, so the compiled `false` default
 * holds until the deliberate one-line flip-to-ON commit.
 */

/** B-M14 Picture Gallery. Default OFF: no gallery route access, no Catalog entry,
 *  no gallery persistence read/write — the app is byte-identical when OFF. Flipped
 *  ON in a separate one-line commit after the human eyeball on the ceremony feel. */
export const PICTURE_GALLERY_ENABLED = true;
export const PICTURE_GALLERY_ENV_VAR = 'PICTURE_GALLERY_ENABLED';

function flagEnabled(compiledDefault: boolean, envVar: string): boolean {
  const env = process.env[envVar];
  if (env === '1') return true;
  if (env === '0') return false;
  return compiledDefault;
}

export function pictureGalleryEnabled(): boolean {
  return flagEnabled(PICTURE_GALLERY_ENABLED, PICTURE_GALLERY_ENV_VAR);
}
