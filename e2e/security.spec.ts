import { expect, test, type Page } from '@playwright/test';

import { MODULE_ROUTES, PAGE_ROUTES } from './routes';

/**
 * The security headers, asserted on a response from a production build (adapted from
 * Internet Visualizer's `e2e/security.spec.ts`).
 *
 * `tests/security-headers.test.ts` checks what the policy says; this checks that it is
 * sent on every route, and that no page breaks under it, including /passwords while its
 * PBKDF2 Worker runs, which is what `worker-src` is there for.
 */

const REQUIRED_HEADERS: readonly (readonly [string, RegExp])[] = [
  ['strict-transport-security', /max-age=\d{7,}/],
  ['x-content-type-options', /^nosniff$/],
  ['referrer-policy', /^strict-origin-when-cross-origin$/],
  ['permissions-policy', /camera=\(\)/],
  ['x-frame-options', /^DENY$/i],
];

function cspOf(headers: Record<string, string>): string | undefined {
  return (
    headers['content-security-policy'] ?? headers['content-security-policy-report-only']
  );
}

for (const route of [...PAGE_ROUTES, { name: '404', path: '/no-such-page' }]) {
  test(`${route.path} carries the security headers`, async ({ request }) => {
    const response = await request.get(route.path, { maxRedirects: 0 });
    const headers = response.headers();

    for (const [name, pattern] of REQUIRED_HEADERS) {
      expect(headers[name], `${route.path} is missing ${name}`).toMatch(pattern);
    }

    const csp = cspOf(headers);
    expect(csp, `${route.path} has no Content-Security-Policy`).toBeDefined();
    expect(csp).toContain("connect-src 'self'");
    expect(csp).toContain("worker-src 'self' blob:");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    // Development loosens script-src; a build that shipped it was built wrong.
    expect(csp).not.toContain("'unsafe-eval'");
  });
}

/**
 * zod probes whether it may compile validators by evaluating `Function("")` in a
 * try/catch. Under this policy that throws, zod runs interpreted, and the browser
 * reports the probe. It is the one violation the site knowingly produces; see
 * `src/lib/securityHeaders.ts`.
 */
const ZOD_JIT_PROBE = 'script-src blocked eval';

async function watchCsp(page: Page) {
  await page.addInitScript(() => {
    const violations: string[] = [];
    (window as unknown as { __csp: string[] }).__csp = violations;
    document.addEventListener('securitypolicyviolation', (event) => {
      violations.push(`${event.violatedDirective} blocked ${event.blockedURI}`);
    });
  });
  return async () =>
    page.evaluate(() => (window as unknown as { __csp?: string[] }).__csp ?? []);
}

for (const route of PAGE_ROUTES) {
  test(`${route.path} violates nothing in the policy`, async ({ page }) => {
    const violations = await watchCsp(page);
    await page.goto(route.path);
    await page.waitForLoadState('networkidle');

    const all = await violations();
    expect(all.filter((entry) => entry !== ZOD_JIT_PROBE)).toEqual([]);
    // The probe is reported at most once, and only where a link is decoded.
    const probes = all.filter((entry) => entry === ZOD_JIT_PROBE).length;
    const isModule = MODULE_ROUTES.some((m) => m.path === route.path);
    expect(probes).toBeLessThanOrEqual(isModule ? 1 : 0);
  });
}

test('the PBKDF2 Worker runs under the policy', async ({ page }) => {
  const violations = await watchCsp(page);
  const workers: string[] = [];
  page.on('worker', (worker) => workers.push(worker.url()));

  await page.goto('/passwords');
  await expect(page).toHaveURL(/\?s=/);
  await page
    .getByRole('navigation', { name: 'Chapters' })
    .getByRole('button', { name: 'PBKDF2' })
    .click();
  await page.locator('body').click({ position: { x: 1, y: 1 } });
  await page.keyboard.press('End');
  await page.getByRole('button', { name: 'Run every iteration for real' }).click();
  // node:crypto pbkdf2Sync('passwd', 'salt', 600000, 32, 'sha256'), from the Worker.
  await expect(page.locator('p', { hasText: 'Derived key:' })).toContainText(
    '1074be241b7be078a90369fae10cdc0394cf64a6780904421bd79c51fd372db0',
    { timeout: 30_000 },
  );
  expect(workers.length).toBeGreaterThan(0);

  expect((await violations()).filter((entry) => entry !== ZOD_JIT_PROBE)).toEqual([]);
});

test('a module cannot reach another origin, even if it tries', async ({
  page,
  baseURL,
}) => {
  const origin = new URL(baseURL ?? 'http://127.0.0.1:3100').origin;
  const offOrigin: string[] = [];
  page.on('request', (request) => {
    const url = request.url();
    if (!url.startsWith(origin) && !url.startsWith('data:') && !url.startsWith('blob:')) {
      offOrigin.push(url);
    }
  });

  await page.goto('/passwords');
  await page.waitForLoadState('networkidle');

  // `example.com` is reserved for documentation; the point is that no attempt connects.
  const fetched = await page.evaluate(async () => {
    try {
      await fetch('https://example.com/probe', { mode: 'no-cors' });
      return 'allowed';
    } catch {
      return 'blocked';
    }
  });
  expect(fetched).toBe('blocked');
  expect(offOrigin.filter((url) => !url.includes('example.com'))).toEqual([]);
});
