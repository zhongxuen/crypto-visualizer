import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

/** The share link is written only after hydration, so it marks "keys will work". */
async function open(page: Page, url = '/hashing') {
  await page.goto(url);
  await expect(page).toHaveURL(/\?s=/);
}

test.describe('/hashing', () => {
  test('the walkthrough completes by keyboard alone, with the right values', async ({
    page,
  }) => {
    await open(page);
    const status = page.getByRole('status');

    // SHA-256 of "abc" (FIPS 180-4 example).
    await page.keyboard.press('End');
    await expect(status).toContainText(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
    await page.getByRole('button', { name: 'Next chapter: Avalanche' }).focus();
    await page.keyboard.press('Enter');

    await page.keyboard.press('End');
    await expect(status).toContainText('of 256 output bits changed');
    await page.getByRole('button', { name: 'Next chapter: HMAC' }).focus();
    await page.keyboard.press('Enter');

    // RFC 4231 test case 2.
    await page.keyboard.press('End');
    await expect(status).toContainText(
      '5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843',
    );
    await expect(page.getByText('Walkthrough complete.')).toBeVisible();
    const stored = await page.evaluate(() => localStorage.getItem('cv:v1'));
    expect(JSON.parse(stored!).completed).toContain('hashing');
  });

  test('skip to digest, and scrubbing across all rounds', async ({ page }) => {
    await open(page);
    const slider = page.getByRole('slider', { name: 'Step' });
    for (const step of ['20', '60', '90', '114']) {
      await slider.fill(step);
      await expect(page.getByRole('status')).toContainText(
        `Step ${Number(step) + 1} of 116`,
      );
    }
    await slider.fill('3');
    await page.getByRole('button', { name: 'Skip to digest' }).click();
    await expect(page.getByRole('status')).toContainText('Step 116 of 116');
  });

  test('free play hashes your message', async ({ page }) => {
    await open(page);
    await page.getByRole('button', { name: 'Free play' }).click();
    await page.getByLabel(/Message \(up to/).fill('');
    // The text field keeps its own keys; step from the page.
    await page.getByRole('heading', { level: 1 }).click();
    await page.keyboard.press('End');
    await expect(page.getByRole('status')).toContainText(
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    );
  });

  test('a share link lands on the same chapter and step', async ({ page }) => {
    await open(page);
    await page
      .getByRole('navigation', { name: 'Chapters' })
      .getByRole('button', { name: 'HMAC' })
      .click();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('status')).toContainText('Step 3 of 7');
    await page.waitForTimeout(500);
    const other = await page.context().newPage();
    await open(other, page.url());
    await expect(other.getByRole('status')).toContainText('Step 3 of 7');
  });

  for (const theme of ['light', 'dark'] as const) {
    test(`has no axe violations (${theme})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: theme });
      await open(page);
      for (const chapter of ['SHA-256', 'Avalanche', 'HMAC']) {
        await page
          .getByRole('navigation', { name: 'Chapters' })
          .getByRole('button', { name: chapter })
          .click();
        await page.keyboard.press('End');
        expect((await new AxeBuilder({ page }).analyze()).violations, chapter).toEqual(
          [],
        );
      }
    });
  }
});
