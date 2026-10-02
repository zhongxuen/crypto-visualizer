import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

/** The page marks itself once the share state is read (after hydration): keys work then. */
async function open(page: Page, url = '/xor') {
  await page.goto(url);
  await expect(page.locator('[data-share-ready="true"]')).toHaveCount(1);
}

/** Wait until the share link carries `step` (it's written after a short debounce). */
async function linkHasStep(page: Page, step: number) {
  await page.waitForFunction((want) => {
    const s = new URL(location.href).searchParams.get('s');
    if (!s) return false;
    const state = JSON.parse(atob(s.replace(/-/g, '+').replace(/_/g, '/')));
    return state.step === want;
  }, step);
}

test.describe('/xor', () => {
  test('the walkthrough completes by keyboard alone', async ({ page }) => {
    await open(page);
    const status = page.getByRole('status');
    await expect(status).toContainText('Step 1 of');

    const chapters = ['Text to bytes', 'XOR', 'One-time pad', 'Two-time pad'];
    for (const [index, title] of chapters.entries()) {
      await expect(
        page
          .getByRole('navigation', { name: 'Chapters' })
          .getByRole('button', { name: title }),
      ).toHaveAttribute('aria-current', 'step');
      await page.keyboard.press('End');
      if (index < chapters.length - 1) {
        const next = page.getByRole('button', {
          name: `Next chapter: ${chapters[index + 1]}`,
        });
        await next.focus();
        await page.keyboard.press('Enter');
        await page.locator('body').click({ position: { x: 1, y: 1 } });
      }
    }
    await expect(
      page.getByRole('region', { name: 'What you can now explain' }),
    ).toBeVisible();
    const stored = await page.evaluate(() => localStorage.getItem('cv:v1'));
    expect(JSON.parse(stored!).completed).toContain('xor');
  });

  test('the crib drag reveals the other message', async ({ page }) => {
    await open(page);
    await page.getByRole('button', { name: 'Two-time pad' }).click();
    await page.locator('body').click({ position: { x: 1, y: 1 } });
    // Groups: setup (5 steps), cancel (1), then crib offsets from 0.
    await page.keyboard.press('Shift+ArrowRight');
    await page.keyboard.press('Shift+ArrowRight');
    for (let i = 0; i < 10; i += 1) await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('status')).toContainText('Offset 10');
    await expect(page.getByRole('status')).toContainText('“hips ”');
  });

  test('the crib chip drags with the mouse and moves with the arrow keys', async ({
    page,
  }) => {
    await open(page);
    await page.getByRole('button', { name: 'Two-time pad' }).click();
    await page.locator('body').click({ position: { x: 1, y: 1 } });
    await page.keyboard.press('Shift+ArrowRight');
    await page.keyboard.press('Shift+ArrowRight');
    const crib = page.getByRole('slider', { name: /Crib/ });
    await expect(crib).toHaveAttribute('aria-valuenow', '0');

    const box = (await crib.boundingBox())!;
    await page.mouse.move(box.x + 5, box.y + box.height / 2);
    await page.mouse.down();
    // Each offset is one 24 px cell: ten cells to the right.
    for (let x = 1; x <= 10; x += 1) {
      await page.mouse.move(box.x + 5 + x * 24, box.y + box.height / 2);
    }
    await page.mouse.up();
    await expect(crib).toHaveAttribute('aria-valuenow', '10');
    await expect(page.getByRole('status')).toContainText('“hips ”');

    await crib.focus();
    await page.keyboard.press('ArrowLeft');
    await expect(crib).toHaveAttribute('aria-valuenow', '9');
    await expect(page.getByRole('status')).toContainText('Offset 9');
  });

  test('a share link lands on the same chapter and step', async ({ page }) => {
    await open(page);
    await page.getByRole('button', { name: 'One-time pad' }).click();
    await page.locator('body').click({ position: { x: 1, y: 1 } });
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('status')).toContainText('Step 3 of');
    await linkHasStep(page, 2);
    const url = page.url();

    const other = await page.context().newPage();
    await open(other, url);
    await expect(other.getByRole('status')).toContainText('Step 3 of');
    await expect(
      other
        .getByRole('navigation', { name: 'Chapters' })
        .getByRole('button', { name: 'One-time pad' }),
    ).toHaveAttribute('aria-current', 'step');
  });

  test('an invalid link falls back to the start', async ({ page }) => {
    await page.goto('/xor?s=not-a-real-state');
    await expect(page.getByRole('status')).toContainText('Step 1 of');
  });

  for (const theme of ['light', 'dark'] as const) {
    test(`has no axe violations (${theme})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: theme });
      await open(page);
      await page.keyboard.press('ArrowRight');
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
      await page.getByRole('button', { name: 'Free play' }).click();
      await page.getByRole('button', { name: 'Two-time pad' }).click();
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    });
  }
});
