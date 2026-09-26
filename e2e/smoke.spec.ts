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

  test('has no axe violations', async ({ page }) => {
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
});
