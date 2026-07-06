import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// R-21 build-config note (Lane B): map the `@/*` path alias (tsconfig `paths`)
// so pure juice/ui modules that import `@/contracts` can be unit-tested under
// vitest, matching how Metro/Babel resolve it in the app bundle. Additive only.
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
