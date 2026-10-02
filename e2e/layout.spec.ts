import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

import { MODULE_ROUTES, openModule } from './routes';

/**
 * The shell and module workspace (docs/UIUX.md §3 B6–B11, §4.3): the header is one row
 * on a phone, the dock is one row, the visual is on the first screen, the shared
 * controls are touch-sized below `md`, the mode switch doesn't move between modules, and
 * the URL stays clean until there's something to share.
 */

const DESKTOP = { width: 1366, height: 768 };
const PHONE = { width: 390, height: 844 };

/** The box of the first element matching `selector`. */
async function box(page: Page, selector: string) {
  const found = await page.locator(selector).first().boundingBox();
  if (!found) throw new Error(`no box for ${selector}`);
  return found;
}

test.describe('on a phone (390×844)', () => {
  test.use({ viewport: PHONE });

  for (const route of MODULE_ROUTES) {
    test(`${route.path}: one-row header and dock, visual on the first screen`, async ({
      page,
    }) => {
      await openModule(page, route.path);
      // B6: the header is one row, at most 56 px.
      expect((await box(page, 'body > header')).height).toBeLessThanOrEqual(56);
      // B8: the dock is one row.
      const dock = await box(page, '[role="region"][aria-label="Timeline"]');
      expect(dock.height).toBeLessThanOrEqual(64);
      // P2: the visual starts on the first screen, above the dock and the lesson peek.
      const visual = await box(page, '[aria-label="Visualization"]');
      expect(visual.y + 80).toBeLessThan(dock.y);
    });
  }

  test('every shared control is at least 44 px tall (B7)', async ({ page }) => {
    await openModule(page, '/aes');
    const small = await page.evaluate(() => {
      const scopes = [
        'body > header',
        'main > header',
        '[role="region"][aria-label="Timeline"]',
        'aside[aria-label="Lesson"] > button',
      ];
      const controls = scopes.flatMap((scope) => [
        ...document.querySelectorAll<HTMLElement>(
          `${scope} button, ${scope} a, ${scope} select, ${scope} input, ${scope}:is(button)`,
        ),
      ]);
      return (
        controls
          // Rendered, and not a visually hidden skip link.
          .filter((node) => node.getBoundingClientRect().height > 2)
          // A link inside a sentence is exempt (WCAG 2.5.8, inline targets).
          .filter((node) => !node.closest('p'))
          .map((node) => ({
            name:
              node.getAttribute('aria-label') ?? node.textContent?.trim() ?? node.tagName,
            height: Math.round(node.getBoundingClientRect().height),
          }))
          .filter((control) => control.height < 44)
      );
    });
    expect(small).toEqual([]);
  });

  test('the menu sheet holds the modules, About and the theme', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Menu' }).click();
    const modules = page.getByRole('navigation', { name: 'Modules' });
    await expect(modules.getByRole('link', { name: /AES/ })).toBeVisible();
    await page
      .getByRole('group', { name: 'Theme' })
      .getByRole('button', { name: 'Dark' })
      .click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.keyboard.press('Escape');
    await expect(modules).toHaveCount(0);
  });

  test('the lesson opens as a bottom sheet, and the dock’s extras sit behind ⋯', async ({
    page,
  }) => {
    await openModule(page, '/xor');
    const peek = page.getByRole('button', { name: 'Lesson, why and phases' });
    await peek.click();
    await expect(page.getByRole('heading', { name: 'Why?' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('heading', { name: 'Why?' })).toBeHidden();

    await page.getByRole('button', { name: 'More playback options' }).click();
    await page.getByRole('button', { name: 'Skip this phase' }).click();
    await expect(page.getByRole('status')).not.toContainText('Step 1 of');
  });
});

test.describe('on a laptop (1366×768)', () => {
  test.use({ viewport: DESKTOP });

  for (const route of MODULE_ROUTES) {
    test(`${route.path}: the visual is on the first screen, beside the lesson`, async ({
      page,
    }) => {
      await openModule(page, route.path);
      const dock = await box(page, '[role="region"][aria-label="Timeline"]');
      const visual = await box(page, '[aria-label="Visualization"]');
      expect(visual.y + 120).toBeLessThan(dock.y);
      const rail = await box(page, 'aside[aria-label="Lesson"]');
      expect(rail.x).toBeGreaterThan(visual.x + visual.width - 1);
    });
  }

  test('the mode switch sits in the same place on every module (B9)', async ({
    page,
  }) => {
    const places = new Set<string>();
    for (const route of MODULE_ROUTES) {
      await openModule(page, route.path);
      const mode = await box(page, '[role="group"][aria-label="Mode"]');
      places.add(`${Math.round(mode.x + mode.width)}`);
    }
    expect([...places]).toHaveLength(1);
  });

  test('the shortcut sheet opens from ? and lists the keys (P6)', async ({ page }) => {
    await openModule(page, '/xor');
    await page.keyboard.press('?');
    const sheet = page.getByRole('dialog', { name: 'Keyboard shortcuts' });
    await expect(sheet).toBeVisible();
    await expect(sheet).toContainText('Play or pause');
    await page.keyboard.press('Escape');
    await expect(sheet).toBeHidden();
  });
});

test.describe('share links are deliberate (P9, B11)', () => {
  test('the URL stays clean at the defaults and grows once you step', async ({
    page,
  }) => {
    await openModule(page, '/xor');
    await page.waitForTimeout(600);
    expect(new URL(page.url()).search).toBe('');
    await page.keyboard.press('ArrowRight');
    await expect.poll(() => new URL(page.url()).searchParams.has('s')).toBe(true);
  });

  test('"Copy link to this step" copies a link that lands on the step', async ({
    page,
    context,
  }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await openModule(page, '/hashing');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await page.getByRole('button', { name: 'Copy link to this step' }).click();
    await expect(page.getByText('Link copied.')).toBeVisible();
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(copied).toContain('?s=');
    const other = await context.newPage();
    await openModule(other, copied);
    await expect(other.getByRole('status')).toContainText('Step 3 of');
  });
});
