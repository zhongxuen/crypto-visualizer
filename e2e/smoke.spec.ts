import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

import { MODULES } from '../src/modules/registry';

test.describe('home page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('renders the title', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Crypto Visualizer');
  });

  test('renders one card per registry entry', async ({ page }) => {
    const cards = page
      .getByRole('region', { name: 'Modules' })
      .getByRole('list')
      .getByRole('listitem');
    await expect(cards).toHaveCount(MODULES.length);

    for (const entry of MODULES) {
      const card = cards.filter({
        has: page.getByRole('heading', {
          level: 3,
          name: `${entry.number}. ${entry.title}`,
          exact: true,
        }),
      });
      await expect(card).toHaveCount(1);

      // Planned modules have no route yet, so their card must not be a link.
      await expect(card.getByRole('link')).toHaveCount(entry.status === 'ready' ? 1 : 0);
    }
  });

  test('has one way in, to module 1, and a path with times and builds-on (P1)', async ({
    page,
  }) => {
    const start = page.getByRole('link', { name: 'Start with module 1' });
    await expect(start).toHaveAttribute('href', '/xor');
    const path = page.getByRole('region', { name: 'Modules' });
    await expect(path.getByText('About 10 min').first()).toBeVisible();
    await expect(path.getByText('Builds on Bits, bytes and XOR').first()).toBeVisible();
    await expect(path.locator('#module-tls')).toContainText('Coming next');
  });

  test('every fact links to how the maths is checked', async ({ page }) => {
    const facts = page
      .getByRole('region', { name: 'How we know it’s right' })
      .getByRole('link');
    await expect(facts).toHaveCount(3);
    for (const fact of await facts.all()) {
      await expect(fact).toHaveAttribute('href', '/about#how-the-maths-is-checked');
    }
  });

  test('a finished module’s ring fills in', async ({ page }) => {
    await page.evaluate(() =>
      localStorage.setItem(
        'cv:v1',
        JSON.stringify({
          v: 1,
          completed: ['xor'],
          prefs: { theme: 'system', bytes: 'hex' },
        }),
      ),
    );
    await page.reload();
    await expect(page.locator('#module-xor')).toContainText('Finished.');
    await expect(page.locator('#module-hashing')).not.toContainText('Finished.');
  });

  test('has no axe violations', async ({ page }) => {
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
});

test.describe('the home demo', () => {
  test('walks the stages, and pauses off screen', async ({ page }) => {
    await page.goto('/');
    const demo = page.locator('.xor-demo');
    await expect(demo.locator('li')).toHaveCount(7);
    await expect(demo).toContainText('48 69');
    await expect(demo).toContainText('02 5d');
    await page.locator('#facts-heading').scrollIntoViewIfNeeded();
    await expect(demo).toHaveAttribute('data-paused', '');
  });

  test('is a still diagram under reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    const running = await page.evaluate(
      () =>
        document
          .getAnimations()
          .filter(
            (a) =>
              a.playState === 'running' && (a.effect?.getTiming().iterations ?? 1) > 1,
          ).length,
    );
    expect(running).toBe(0);
    await expect(page.locator('.xor-demo')).toContainText('Text again');
  });
});
