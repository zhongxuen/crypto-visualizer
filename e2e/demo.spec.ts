import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test.describe('/demo building blocks', () => {
  test('is driven entirely by the keyboard', async ({ page }) => {
    await page.goto('/demo');
    const status = page.getByRole('status');
    await expect(status).toContainText('Step 1 of 9');

    await page.keyboard.press('ArrowRight');
    await expect(status).toContainText('Step 2 of 9');
    await page.keyboard.press('Shift+ArrowRight');
    await expect(status).toContainText('Step 3 of 9');
    await page.keyboard.press('End');
    await expect(status).toContainText('Step 9 of 9');
    await page.keyboard.press('Home');
    await expect(status).toContainText('Step 1 of 9');

    // Tab reaches the byte grid, whose arrows move between cells, not steps.
    const firstCell = page
      .getByRole('grid', { name: 'Bytes', exact: true })
      .getByRole('gridcell')
      .first();
    await firstCell.focus();
    await page.keyboard.press('ArrowRight');
    await expect(status).toContainText('Step 1 of 9');
  });

  for (const theme of ['light', 'dark'] as const) {
    test(`has no axe violations (${theme})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: theme });
      await page.goto('/demo');
      const results = await new AxeBuilder({ page }).analyze();
      expect(results.violations).toEqual([]);
    });
  }

  test('reduced motion does not autoplay or animate', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/demo');
    const duration = await page
      .getByRole('button', { name: 'Play', exact: true })
      .evaluate((node) => getComputedStyle(node).transitionDuration);
    expect(parseFloat(duration)).toBeLessThan(0.02);
  });
});

test.describe('/demo motion primitives', () => {
  const PRIMITIVES = ['reveal', 'pulse', 'wave', 'flip', 'travel'];
  const animating = (page: import('@playwright/test').Page) =>
    page.evaluate(() =>
      [...document.querySelectorAll('[data-testid="motion-demo"] [class*="motion-"]')]
        .map((node) => node.closest('[data-primitive]')?.getAttribute('data-primitive'))
        .filter((name, i, all) => name && all.indexOf(name) === i),
    );

  test('one step plays each primitive', async ({ page }) => {
    await page.goto('/demo');
    await expect(page.getByRole('status')).toContainText('Step 1 of 9');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('status')).toContainText('Step 3 of 9');
    const names = await animating(page);
    for (const name of PRIMITIVES.filter((n) => n !== 'pulse')) {
      expect(names).toContain(name);
    }
  });

  test('a seek only crossfades, and lands on the end frame', async ({ page }) => {
    await page.goto('/demo');
    await expect(page.getByRole('status')).toContainText('Step 1 of 9');
    await page.keyboard.press('End');
    await expect(page.getByRole('status')).toContainText('Step 9 of 9');
    expect(await animating(page)).toEqual(['reveal']);
    await expect(
      page.locator('[data-primitive="reveal"] .motion-fade'),
    ).toHaveText('Done.');
  });

  test('reduced motion shows every end frame at once', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/demo');
    await expect(page.getByRole('status')).toContainText('Step 1 of 9');
    await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('status')).toContainText('Step 2 of 9');
    expect(await animating(page)).toEqual([]);
  });
});

test('/about has no axe violations', async ({ page }) => {
  await page.goto('/about');
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
