import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end configuration.
 *
 * ## Against a production build, not the dev server
 *
 * A dev server logs plenty that a shipped page never will -- hydration diagnostics, Fast
 * Refresh chatter -- and `next build && next start` is what Vercel serves, so a route
 * that only breaks when it is statically rendered breaks here too.
 *
 * The cost is a build per run. `reuseExistingServer` outside CI is the escape hatch:
 * start `npx next start --port 3100` yourself once and every subsequent `npx playwright
 * test` attaches to it.
 *
 * ## Port 3100
 *
 * Not 3000. `npm run dev` lives there, and an e2e run that silently attached to a dev
 * server would quietly undo the paragraph above.
 *
 * ## Browsers
 *
 * Chromium only locally, all three in CI (docs/implementation/01, step 4).
 */

const PORT = Number(process.env.PLAYWRIGHT_PORT ?? 3100);
const LOCAL_URL = `http://127.0.0.1:${PORT}`;

/**
 * `PLAYWRIGHT_BASE_URL=https://<host> npx playwright test` points the suite at something
 * already running and starts no server of its own.
 */
const DEPLOYED_URL = process.env.PLAYWRIGHT_BASE_URL?.replace(/\/+$/, '');
const BASE_URL = DEPLOYED_URL || LOCAL_URL;

const CI = !!process.env.CI;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: CI,
  retries: CI ? 2 : 0,
  workers: CI ? 1 : undefined,
  reporter: CI ? [['github'], ['html', { open: 'never' }]] : [['list']],

  timeout: 60_000,
  expect: { timeout: 15_000 },

  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'off',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    ...(CI
      ? [
          { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
          { name: 'webkit', use: { ...devices['Desktop Safari'] } },
        ]
      : []),
  ],

  webServer: DEPLOYED_URL
    ? undefined
    : {
        command: `npm run build && npx next start --port ${PORT}`,
        url: LOCAL_URL,
        reuseExistingServer: !CI,
        timeout: 300_000,
        stdout: 'pipe',
        stderr: 'pipe',
      },
});
