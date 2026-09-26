import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

/** The share link is written only after hydration, so it marks "keys will work". */
async function open(page: Page, url = '/passwords') {
  await page.goto(url);
  await expect(page).toHaveURL(/\?s=/);
}

const chapterButton = (page: Page, name: string) =>
  page.getByRole('navigation', { name: 'Chapters' }).getByRole('button', { name });

test.describe('/passwords', () => {
  test('the walkthrough completes by keyboard alone', async ({ page }) => {
    await open(page);
    const status = page.getByRole('status');

    await page.keyboard.press('End');
    await expect(status).toContainText('erin: no match');
    await page.getByRole('button', { name: 'Next chapter: Salts' }).focus();
    await page.keyboard.press('Enter');

    await page.keyboard.press('End');
    await expect(status).toContainText('The table was built without this salt');
    await page.getByRole('button', { name: 'Next chapter: PBKDF2' }).focus();
    await page.keyboard.press('Enter');

    await page.keyboard.press('End');
    await expect(status).toContainText('599,997 more times');
    await page.getByRole('button', { name: 'Next chapter: Guessing cost' }).focus();
    await page.keyboard.press('Enter');

    await expect(chapterButton(page, 'Guessing cost')).toHaveAttribute(
      'aria-current',
      'step',
    );
    const stored = await page.evaluate(() => localStorage.getItem('cv:v1'));
    expect(JSON.parse(stored!).completed).toContain('passwords');
  });

  test('the Worker runs 600,000 iterations, can be cancelled, and the page stays responsive', async ({
    page,
  }) => {
    await open(page);
    await chapterButton(page, 'PBKDF2').click();
    await page.keyboard.press('End');

    await page.getByRole('button', { name: 'Run every iteration for real' }).click();
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByText('Cancelled.')).toBeVisible();

    await page.getByRole('button', { name: 'Run again' }).click();
    // The main thread still answers while the Worker runs.
    await page.keyboard.press('Home');
    await expect(page.getByRole('status')).toContainText('Step 1 of 5');
    await page.keyboard.press('End');
    // node:crypto pbkdf2Sync('passwd', 'salt', 600000, 32, 'sha256').
    await expect(page.locator('p', { hasText: 'Derived key:' })).toContainText(
      '1074be241b7be078a90369fae10cdc0394cf64a6780904421bd79c51fd372db0',
      { timeout: 30_000 },
    );
  });

  test('a typed password never reaches the URL or localStorage', async ({ page }) => {
    const secret = 'Tr0ub4dor&3-not-real';
    await open(page);
    await page.getByRole('button', { name: 'Free play' }).click();
    await page.getByLabel('Try your own password').fill(secret);
    await page.getByLabel('Salt the hashes').check();
    await chapterButton(page, 'PBKDF2').click();
    await page.getByRole('heading', { level: 1 }).click();
    await page.keyboard.press('End');
    await page.waitForTimeout(800);

    await expect(page).toHaveURL(/\?s=/);
    const stored = await page.evaluate(() => {
      const url = new URL(location.href);
      const s = url.searchParams.get('s') ?? '';
      const json = atob(s.replace(/-/g, '+').replace(/_/g, '/'));
      return [
        location.href,
        json,
        JSON.stringify({ ...localStorage }),
        JSON.stringify({ ...sessionStorage }),
      ].join('\n');
    });
    expect(stored).not.toContain(secret);
    expect(stored).not.toContain('Tr0ub4dor');
  });

  for (const theme of ['light', 'dark'] as const) {
    test(`has no axe violations (${theme})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: theme });
      await open(page);
      for (const chapter of ['Unsalted hashes', 'Salts', 'PBKDF2', 'Guessing cost']) {
        await chapterButton(page, chapter).click();
        await page.keyboard.press('End');
        expect((await new AxeBuilder({ page }).analyze()).violations, chapter).toEqual(
          [],
        );
      }
      await page.getByRole('button', { name: 'Free play' }).click();
      await chapterButton(page, 'Unsalted hashes').click();
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    });
  }
});
