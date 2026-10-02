import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

import {
  encodeState,
  linkedState,
  linkHasStep,
  MODULE_ROUTES,
  NOT_FOUND_PATH,
  openModule,
  PAGE_ROUTES,
} from './routes';

/**
 * Site-wide checks across every route (phase 10, step 3). The module specs go deep on
 * their own module; this file goes wide, so a new route or module is covered by being in
 * the registry.
 */

/**
 * The three ways a page can be dark or light: the system setting with no stored choice
 * (both ways), and the toggle's stored choice, which sets `data-theme` and must win over
 * the system.
 */
const THEMES = [
  { name: 'light', colorScheme: 'light' as const },
  { name: 'dark', colorScheme: 'dark' as const },
  {
    name: 'dark by toggle, on a light system',
    colorScheme: 'light' as const,
    stored: 'dark',
  },
];

async function applyTheme(page: Page, theme: (typeof THEMES)[number]) {
  await page.emulateMedia({ colorScheme: theme.colorScheme });
  if (theme.stored) {
    await page.addInitScript((stored) => {
      localStorage.setItem(
        'cv:v1',
        JSON.stringify({ v: 1, completed: [], prefs: { theme: stored, bytes: 'hex' } }),
      );
    }, theme.stored);
  }
}

test.describe('axe on every route, in every theme', () => {
  for (const route of PAGE_ROUTES) {
    for (const theme of THEMES) {
      test(`${route.path} (${theme.name})`, async ({ page }) => {
        await applyTheme(page, theme);
        await page.goto(route.path);
        if (theme.stored) {
          await expect(page.locator('html')).toHaveAttribute('data-theme', theme.stored);
        }
        await page.waitForLoadState('networkidle');
        expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
      });
    }
  }

  for (const theme of THEMES) {
    test(`the 404 page (${theme.name})`, async ({ page }) => {
      await applyTheme(page, theme);
      const response = await page.goto(NOT_FOUND_PATH);
      expect(response?.status()).toBe(404);
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    });
  }
});

test.describe('reduced motion', () => {
  for (const route of MODULE_ROUTES) {
    test(`${route.path} does not autoplay or tween`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await openModule(page, route.path);
      const status = page.getByRole('status');
      await expect(status).toContainText('Step 1 of');

      // Nothing moves on its own.
      await page.waitForTimeout(1500);
      await expect(status).toContainText('Step 1 of');

      // Transitions collapse to nothing (globals.css), so a step change is instant.
      const durations = await page.evaluate(() =>
        [...document.querySelectorAll('main *')]
          .map((node) => getComputedStyle(node).transitionDuration)
          .flatMap((value) => value.split(',').map((part) => parseFloat(part))),
      );
      expect(Math.max(0, ...durations)).toBeLessThan(0.02);

      await page.keyboard.press('ArrowRight');
      await expect(status).toContainText('Step 2 of');
    });
  }
});

test.describe('share links', () => {
  for (const route of MODULE_ROUTES) {
    test(`${route.path}: a link lands on the same step with the same values`, async ({
      page,
    }) => {
      await openModule(page, route.path);
      await page.keyboard.press('ArrowRight');
      await page.keyboard.press('ArrowRight');
      await expect(page.getByRole('status')).toContainText('Step 3 of');
      await linkHasStep(page, 2);
      const url = page.url();
      const state = await linkedState(page);
      // `textContent`, which `toHaveText` also reads; `innerText` adds layout newlines.
      const caption = (await page.getByRole('status').textContent()) ?? '';
      const visual =
        (await page.getByRole('region', { name: 'Visualization' }).textContent()) ?? '';

      const other = await page.context().newPage();
      await openModule(other, url);
      await expect(other.getByRole('status')).toHaveText(caption);
      await expect(other.getByRole('region', { name: 'Visualization' })).toHaveText(
        visual,
      );
      expect(await linkedState(other)).toEqual(state);
    });
  }
});

test.describe('invalid links fall back to the module’s start', () => {
  for (const route of MODULE_ROUTES) {
    const elsewhere = MODULE_ROUTES.find((r) => r.slug !== route.slug)!;
    const cases: { name: string; s: string }[] = [
      { name: 'not base64 JSON', s: 'not-a-real-state!!' },
      {
        name: 'another module’s link',
        s: encodeState({ m: elsewhere.slug, v: 1, seed: 1, step: 3, input: {} }),
      },
      {
        name: 'an unknown version',
        s: encodeState({ m: route.slug, v: 999, seed: 1, step: 3, input: {} }),
      },
      {
        name: 'a password-like key',
        s: encodeState({
          m: route.slug,
          v: 1,
          seed: 1,
          step: 3,
          input: { password: 'x' },
        }),
      },
      { name: 'over 2 KB', s: 'A'.repeat(3000) },
    ];

    for (const { name, s } of cases) {
      test(`${route.path}: ${name}`, async ({ page }) => {
        const errors: string[] = [];
        page.on('pageerror', (error) => errors.push(error.message));

        await page.goto(`${route.path}?s=${s}`);
        await expect(page.getByRole('status')).toContainText('Step 1 of');
        // The page falls back to its defaults and, since a link at the defaults is the
        // bare page (UIUX P9), drops the bad `?s=` after a short debounce: it never keeps
        // the bad one, password-like keys included.
        await expect.poll(() => new URL(page.url()).searchParams.has('s')).toBe(false);
        expect(errors).toEqual([]);
      });
    }
  }
});
