import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('home page renders and has no axe violations', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Crypto Visualizer');

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
