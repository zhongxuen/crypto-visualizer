import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

/** Paint: three pots, two mixes, two sends, two final mixes, shared, Eve, the limit. */
const PAINT_STEPS = 12;

/** The page marks itself once the share state is read (after hydration): keys work then. */
async function open(page: Page, url = '/dh') {
  await page.goto(url);
  await expect(page.locator('[data-share-ready="true"]')).toHaveCount(1);
}

async function linkHasStep(page: Page, step: number) {
  await page.waitForFunction((want) => {
    const s = new URL(location.href).searchParams.get('s');
    if (!s) return false;
    const state = JSON.parse(atob(s.replace(/-/g, '+').replace(/_/g, '/')));
    return state.step === want;
  }, step);
}

async function axeClean(page: Page, what: string) {
  expect((await new AxeBuilder({ page }).analyze()).violations, what).toEqual([]);
}

/** Tab until `name` has focus, then press Enter: keyboard only, no clicks. */
async function tabTo(page: Page, name: string | RegExp) {
  for (let i = 0; i < 80; i += 1) {
    await page.keyboard.press('Tab');
    const focused = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      return el?.innerText?.trim() ?? '';
    });
    if (typeof name === 'string' ? focused.startsWith(name) : name.test(focused)) return;
  }
  throw new Error(`Never reached "${String(name)}" by Tab`);
}

test.describe('/dh', () => {
  test('the whole walkthrough by keyboard alone, with axe at every chapter', async ({
    page,
  }) => {
    await open(page);
    const status = page.getByRole('status');
    await expect(status).toContainText(`Step 1 of ${PAINT_STEPS}`);
    await expect(status).toContainText('A common colour everyone can see');

    for (let step = 2; step <= 10; step += 1) {
      await page.keyboard.press('ArrowRight');
      await expect(status).toContainText(`Step ${step} of ${PAINT_STEPS}`);
    }
    await expect(page.getByTestId('dh-paint-same')).toContainText('The same colour');
    await axeClean(page, 'paint, shared pot');
    await page.keyboard.press('End');
    await expect(status).toContainText('Where the analogy breaks');

    // The exchange: p = 23, a = 6, b = 8, secret 16.
    await tabTo(page, 'Next chapter: The exchange');
    await page.keyboard.press('Enter');
    await expect(status).toContainText('p = 23 = 2·11 + 1');
    await expect(
      page.getByRole('img', { name: /Numbers mod p: 2 \(mod 23\)/ }),
    ).toBeVisible();
    for (let i = 0; i < 3; i += 1) await page.keyboard.press('ArrowRight');
    await expect(status).toContainText('Alice, bit 1 of 3 is 1');
    await expect(page.getByRole('img', { name: /Running value: 1 → 2/ })).toBeVisible();
    await axeClean(page, 'exchange, square-and-multiply');
    for (let i = 0; i < 3; i += 1) await page.keyboard.press('ArrowRight');
    await expect(page.getByTestId('dh-share-A')).toHaveText('18');

    // Eve's view, by keyboard: Alice's a disappears from her lane.
    const alice = page.getByRole('list', { name: 'Alice holds' });
    await expect(alice).toContainText('a6');
    await tabTo(page, 'Eve’s view');
    await page.keyboard.press('Enter');
    await expect(page.getByRole('button', { name: 'Eve’s view' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(alice).not.toContainText('a6');
    await expect(alice).toContainText('hidden from Eve');
    await axeClean(page, "exchange, Eve's view");

    await page.keyboard.press('End');
    await expect(status).toContainText('X25519');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    await expect(page.getByTestId('dh-agree')).toContainText('The same number');

    // Eve brute-forces a = 6 and gets 16.
    await page.keyboard.press('End');
    await tabTo(page, 'Next chapter: Eve listens');
    await page.keyboard.press('Enter');
    for (let i = 0; i < 7; i += 1) await page.keyboard.press('ArrowRight');
    await expect(status).toContainText('x = 6: 2^6 mod 23 = 18. That is A.');
    await page.keyboard.press('ArrowRight');
    await expect(page.getByTestId('dh-eve-secret')).toHaveText('16');
    await expect(page.getByRole('list', { name: 'Eve holds' })).toContainText('Secret16');
    await page.keyboard.press('End');
    const growth = page.getByTestId('dh-growth');
    await expect(growth.locator('tbody tr')).toHaveCount(6);
    await expect(growth).toContainText('a 617-digit number');
    await axeClean(page, 'eve, growth table');

    // Mallory in the middle, four lanes, ending on the fix.
    await tabTo(page, 'Next chapter: Man in the middle');
    await page.keyboard.press('Enter');
    const lanes = page.getByRole('list', {
      name: 'Alice, Mallory in the middle, and Bob',
    });
    await expect(lanes.locator('[data-lane]')).toHaveCount(4);
    for (let i = 0; i < 11; i += 1) await page.keyboard.press('ArrowRight');
    await expect(page.getByTestId('dh-mitm-alice')).toHaveText('58');
    await expect(page.getByTestId('dh-mitm-bob')).toHaveText('7');
    await axeClean(page, 'mitm, two secrets');
    await page.keyboard.press('End');
    await expect(status).toContainText('The fix: prove who sent each share');
    await expect(page.getByText('Walkthrough complete.')).toBeVisible();
    await axeClean(page, 'mitm, the fix');

    // The lesson ends by pointing at RSA signatures and the TLS 1.3 card.
    const prose = page.locator('.prose-cv');
    await expect(prose.getByRole('link', { name: /RSA signing/ })).toHaveAttribute(
      'href',
      '/rsa',
    );
    await expect(prose.getByRole('link', { name: 'TLS 1.3' })).toHaveAttribute(
      'href',
      '/#module-tls',
    );
    const stored = await page.evaluate(() => localStorage.getItem('cv:v1'));
    expect(JSON.parse(stored!).completed).toContain('dh');
  });

  test('the TLS 1.3 link lands on its card', async ({ page }) => {
    await page.goto('/#module-tls');
    await expect(
      page.locator('#module-tls').getByRole('heading', { name: /TLS 1\.3/ }),
    ).toBeInViewport();
  });

  test('free play: a 2048-bit exchange, and a share link on the same step', async ({
    page,
  }) => {
    await open(page);
    await page
      .getByRole('navigation', { name: 'Chapters' })
      .getByRole('button', { name: 'The exchange' })
      .click();
    await page.getByRole('button', { name: 'Free play' }).click();
    const a = page.getByLabel(/^Alice's private a/);
    await a.fill('20');
    await expect(page.getByTestId('dh-a-feedback')).toContainText('between 2 and 9');
    await page.getByRole('button', { name: '2048-bit (RFC 3526)' }).click();
    await page.getByRole('heading', { level: 1 }).click();
    await page.keyboard.press('End');
    const status = page.getByRole('status');
    await expect(status).toContainText('X25519');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    await expect(status).toContainText('Both sides hold the same secret');
    await expect(page.getByTestId('dh-agree')).toContainText('The same number');
    await linkHasStep(page, 11);
    await axeClean(page, 'free play, 2048-bit');

    const other = await page.context().newPage();
    await open(other, page.url());
    await expect(other.getByRole('status')).toContainText(
      'Both sides hold the same secret',
    );
    await expect(other.getByRole('button', { name: 'Free play' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(
      other.getByRole('button', { name: '2048-bit (RFC 3526)' }),
    ).toHaveAttribute('aria-pressed', 'true');
  });

  for (const theme of ['light', 'dark'] as const) {
    test(`has no axe violations (${theme})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: theme });
      await open(page);
      const nav = page.getByRole('navigation', { name: 'Chapters' });
      for (const chapter of [
        'Paint',
        'The exchange',
        'Eve listens',
        'Man in the middle',
      ]) {
        await nav.getByRole('button', { name: chapter }).click();
        await page.keyboard.press('ArrowRight');
        await page.keyboard.press('ArrowRight');
        await page.keyboard.press('ArrowRight');
        await axeClean(page, chapter);
        await page.keyboard.press('End');
        await axeClean(page, `${chapter}, end`);
      }
      await page.getByRole('button', { name: 'Free play' }).click();
      await axeClean(page, 'free play');
    });
  }
});
