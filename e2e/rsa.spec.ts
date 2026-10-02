import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

/** p = 61, q = 53, e = 17: primes, n, φ, e, six Euclid rows, d, the key pair. */
const KEY_STEPS = 13;

/** The page marks itself once the share state is read (after hydration): keys work then. */
async function open(page: Page, url = '/rsa') {
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
  // Check the frame the reader is left with, not one mid-fade: a label at half opacity
  // can read below 4.5:1 for the 200 ms it takes to arrive. Infinite loops never finish.
  await page.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        .filter((a) => a.effect?.getComputedTiming().endTime !== Infinity)
        .map((a) => a.finished.catch(() => undefined)),
    ),
  );
  expect((await new AxeBuilder({ page }).analyze()).violations, what).toEqual([]);
}

async function cellsOf(rows: ReturnType<Page['locator']>) {
  return rows.evaluateAll((trs) =>
    trs.map((tr) =>
      Array.from(tr.querySelectorAll('td')).map((td) => td.textContent?.trim() ?? ''),
    ),
  );
}

test.describe('/rsa', () => {
  test('the key walkthrough by keyboard: the Euclid table matches the hand-worked one', async ({
    page,
  }) => {
    await open(page);
    const status = page.getByRole('status');
    await expect(status).toContainText(`Step 1 of ${KEY_STEPS}`);
    await expect(status).toContainText('p = 61 is prime');

    for (let step = 2; step <= KEY_STEPS - 2; step += 1) {
      await page.keyboard.press('ArrowRight');
      await expect(status).toContainText(`Step ${step} of ${KEY_STEPS}`);
    }
    // On the last Euclid row: r = 0, stop.
    await expect(status).toContainText('r = 0: stop');

    const screenRows = await cellsOf(
      page.getByRole('region', { name: 'Extended Euclid table' }).locator('tbody tr'),
    );
    const lessonRows = await cellsOf(page.locator('.prose-cv table tbody tr'));
    expect(lessonRows).toHaveLength(6);
    expect(screenRows).toEqual(lessonRows);

    await page.keyboard.press('ArrowRight');
    await expect(status).toContainText('d = t mod φ(n) = -367 + 3120 = 2753');
    await expect(page.getByTestId('rsa-d')).toHaveText('2753');
    await axeClean(page, 'keys, at d');

    // And back: the stepper runs both ways.
    await page.keyboard.press('ArrowLeft');
    await expect(status).toContainText(`Step ${KEY_STEPS - 2} of ${KEY_STEPS}`);
  });

  test('the whole walkthrough completes by keyboard alone', async ({ page }) => {
    await open(page);
    const status = page.getByRole('status');
    const chapters = [
      ['Encrypt and decrypt', 'mod 3233 = 65, the original message'],
      ['Sign and verify', 'so the same signature fails'],
      ['Malleability', 'PSS does the same for signatures'],
    ] as const;
    await page.keyboard.press('End');
    await expect(status).toContainText('Public key (n, e) = (3233, 17)');
    for (const [title, last] of chapters) {
      await page.getByRole('button', { name: `Next chapter: ${title}` }).focus();
      await page.keyboard.press('Enter');
      await page.keyboard.press('End');
      await expect(status).toContainText(last);
    }
    await expect(
      page.getByRole('region', { name: 'What you can now explain' }),
    ).toBeVisible();
    const stored = await page.evaluate(() => localStorage.getItem('cv:v1'));
    expect(JSON.parse(stored!).completed).toContain('rsa');
  });

  test('encryption steps square-and-multiply to c = 2790', async ({ page }) => {
    await open(page);
    await page
      .getByRole('navigation', { name: 'Chapters' })
      .getByRole('button', { name: 'Encrypt and decrypt' })
      .click();
    const status = page.getByRole('status');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await expect(status).toContainText('Bit 1 of 5 is 1');
    await expect(page.getByRole('img', { name: /Running value: 1 → 65/ })).toBeVisible();
    for (let i = 0; i < 5; i += 1) await page.keyboard.press('ArrowRight');
    await expect(page.getByTestId('rsa-encrypt-result')).toHaveText('2790');
  });

  test('the malleability strip shows three actors and a doubled message', async ({
    page,
  }) => {
    await open(page);
    await page
      .getByRole('navigation', { name: 'Chapters' })
      .getByRole('button', { name: 'Malleability' })
      .click();
    for (let i = 0; i < 4; i += 1) await page.keyboard.press('ArrowRight');
    const strip = page.getByRole('list', { name: 'Sender, attacker and receiver' });
    await expect(strip.getByRole('listitem')).toHaveCount(3);
    await expect(strip.locator('[aria-current="step"]')).toContainText('Receiver');
    await expect(page.getByRole('status')).toContainText('= 130, which is 2 × 65');
  });

  test('free play: prime feedback, realistic mode, and a share link on the same step', async ({
    page,
  }) => {
    await open(page);
    await page.getByRole('button', { name: 'Free play' }).click();
    const p = page.getByLabel(/^Prime p/);
    await p.fill('91');
    await expect(page.getByTestId('rsa-p-feedback')).toHaveText(
      'p = 91 is not prime: 7 × 13.',
    );
    await p.fill('61');
    await expect(page.getByTestId('rsa-p-feedback')).toContainText('61 is prime');

    await page.getByRole('button', { name: 'Realistic (big primes)' }).click();
    await page.getByRole('heading', { level: 1 }).click();
    await page.keyboard.press('End');
    await expect(page.getByRole('status')).toContainText('Public key (n, e)');
    await expect(page.getByText('n (512 bits)')).toBeVisible();

    await page
      .getByRole('navigation', { name: 'Chapters' })
      .getByRole('button', { name: 'Encrypt and decrypt' })
      .click();
    await page.getByRole('heading', { level: 1 }).click();
    await page.keyboard.press('End');
    const status = page.getByRole('status');
    await expect(status).toContainText('Step 4 of 4');
    await expect(status).toContainText('the original message');
    await expect(page.getByText(/Realistic mode does this in one step/)).toBeVisible();
    await page.keyboard.press('ArrowLeft');
    await linkHasStep(page, 2);

    const other = await page.context().newPage();
    await open(other, page.url());
    await expect(other.getByRole('status')).toContainText('Step 3 of 4');
    await expect(other.getByRole('button', { name: 'Free play' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(
      other.getByRole('button', { name: 'Realistic (big primes)' }),
    ).toHaveAttribute('aria-pressed', 'true');
  });

  for (const theme of ['light', 'dark'] as const) {
    test(`has no axe violations (${theme})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: theme });
      await open(page);
      const nav = page.getByRole('navigation', { name: 'Chapters' });
      // Prime, n, φ, e, then a Euclid row.
      for (let i = 0; i < 6; i += 1) {
        await axeClean(page, `keys step ${i + 1}`);
        await page.keyboard.press('ArrowRight');
      }
      for (const chapter of ['Encrypt and decrypt', 'Sign and verify', 'Malleability']) {
        await nav.getByRole('button', { name: chapter }).click();
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
