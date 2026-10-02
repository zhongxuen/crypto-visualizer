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

test.describe('the learning path, glossary and 404 (UIUX wave 3)', () => {
  test('the header links to the path and the glossary', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.goto('/');
    const header = page.getByRole('banner');
    await header.getByRole('link', { name: 'Path' }).click();
    await expect(page).toHaveURL(/\/learn$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'From one byte to a key exchange',
    );
    await header.getByRole('link', { name: 'Glossary' }).click();
    await expect(page).toHaveURL(/\/glossary$/);
  });

  test('/learn ticks finished chapters and resumes where the learner left off', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      localStorage.setItem(
        'cv:v1',
        JSON.stringify({
          v: 1,
          completed: ['xor', 'hashing/sha256'],
          resume: { slug: 'aes', chapter: 'modes' },
          prefs: { theme: 'system', bytes: 'hex' },
        }),
      );
    });
    await page.goto('/learn');
    await expect(page.getByTestId('path-progress')).toContainText('1 of 6 modules');

    const hashing = page.getByRole('navigation', { name: 'Hashing and MACs chapters' });
    await expect(hashing.getByRole('link', { name: /SHA-256/ })).toContainText('(done)');
    await expect(hashing.getByRole('link', { name: /Avalanche/ })).not.toContainText(
      '(done)',
    );

    await page.getByRole('link', { name: 'Resume module 4: Modes' }).click();
    await expect(page).toHaveURL(/\/aes\?s=/);
    await expect(page.locator('[data-share-ready="true"]')).toHaveCount(1);
    await expect(
      page
        .getByRole('navigation', { name: 'Chapters' })
        .getByRole('button', { name: /Modes/ }),
    ).toHaveAttribute('aria-current', 'step');
    // A chapter link opens the walkthrough, not free play.
    await expect(page.getByRole('button', { name: 'Walkthrough' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  test('/learn moves on to the next module once the last one is finished', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      localStorage.setItem(
        'cv:v1',
        JSON.stringify({
          v: 1,
          completed: ['xor'],
          resume: { slug: 'xor', chapter: 'ttp' },
        }),
      );
    });
    await page.goto('/learn');
    await page
      .getByRole('link', { name: 'Continue with module 2: Hashing and MACs' })
      .click();
    await expect(page).toHaveURL(/\/hashing$/);
  });

  test('a term in a walkthrough opens its definition and its glossary entry', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await openModule(page, '/xor');
    const lesson = page.getByRole('complementary', { name: 'Lesson' });
    await lesson.getByRole('button', { name: 'UTF-8', exact: true }).click();
    await expect(lesson).toContainText('The rule that turns text into bytes.');
    await lesson.getByRole('link', { name: 'Glossary' }).click();
    await expect(page).toHaveURL(/\/glossary#utf-8$/);
    await expect(page.locator('[id="utf-8"]')).toBeInViewport();
  });

  test('a first visit to /learn starts at module 1', async ({ page }) => {
    await page.goto('/learn');
    await page.getByRole('link', { name: /Start with Bits, bytes and XOR/ }).click();
    await expect(page).toHaveURL(/\/xor$/);
  });

  test('a term in a lesson links to its glossary entry', async ({ page }) => {
    await page.goto('/glossary#utf-8');
    const entry = page.locator('[id="utf-8"]');
    await expect(entry).toContainText('UTF-8');
    await expect(entry).toBeInViewport();
    await expect(
      entry.getByRole('link', { name: /Module 1: Bits, bytes and XOR/ }),
    ).toHaveAttribute('href', '/xor');
  });

  test('the 404 page leads back to the path', async ({ page }) => {
    await page.goto(NOT_FOUND_PATH);
    await expect(page.getByText('this page ⊕ this page =')).toBeVisible();
    await page.getByRole('main').getByRole('link', { name: 'The learning path' }).click();
    await expect(page).toHaveURL(/\/learn$/);
  });
});
