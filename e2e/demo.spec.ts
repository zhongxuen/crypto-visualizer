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

test('/about has no axe violations', async ({ page }) => {
  await page.goto('/about');
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
