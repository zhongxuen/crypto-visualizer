import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

/**
 * Two projects, deliberately:
 *
 * - `core` runs in **node**. `src/core/**` is framework-free step logic, so its tests
 *   must not need a DOM. If a core test ever requires jsdom, that is a signal the
 *   boundary rule in eslint.config.mjs has been violated. `tests/**` runs here too:
 *   `tests/differential/` compares core against `node:crypto` and the published test
 *   vectors, and is the only place outside a core test file allowed to import it.
 * - `ui` runs in **jsdom** for shared components, modules and UI helpers.
 */
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    projects: [
      {
        resolve: { tsconfigPaths: true },
        test: {
          name: 'core',
          environment: 'node',
          include: ['src/core/**/*.test.ts', 'tests/**/*.test.ts'],
        },
      },
      {
        resolve: { tsconfigPaths: true },
        plugins: [react()],
        test: {
          name: 'ui',
          environment: 'jsdom',
          setupFiles: ['./tests/setup.ts'],
          include: ['src/{components,modules,lib}/**/*.test.{ts,tsx}'],
        },
      },
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov', 'json-summary'],
      // `*.ts` rather than `**`: folders here carry a README, and v8 would otherwise try
      // to parse it as source and report it at 0%.
      include: ['src/core/**/*.ts', 'src/lib/**/*.ts'],
      exclude: ['**/*.test.*', '**/index.ts'],
      reportOnFailure: true,
    },
  },
});
