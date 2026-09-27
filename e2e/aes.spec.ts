import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

/** FIPS 197 Appendix C.1: AES-128 of 00112233…eeff under 00010203…0e0f. */
const C1_CIPHERTEXT = '69c4e0d86a7b0430d8cdb78070b4c55a';
/** Input, round 0, rounds 1–9 × 4, round 10 × 3, output. */
const BLOCK_STEPS = 1 + 1 + 9 * 4 + 3 + 1;

/** The share link is written only after hydration, so it marks "keys will work". */
async function open(page: Page, url = '/aes') {
  await page.goto(url);
  await expect(page).toHaveURL(/\?s=/);
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

test.describe('/aes', () => {
  /**
   * The project's main e2e test: one whole AES-128 block, every sub-step, by keyboard
   * alone, ending on the ciphertext FIPS 197 prints. Then axe.
   */
  test('steps through the whole AES block by keyboard and ends on FIPS 197 C.1', async ({
    page,
  }) => {
    await open(page);
    const status = page.getByRole('status');
    const visual = page.getByRole('region', { name: 'Visualization' });
    await expect(status).toContainText(`Step 1 of ${BLOCK_STEPS}`);
    await expect(
      visual.getByText('00112233445566778899aabbccddeeff', { exact: true }),
    ).toBeVisible();

    const seen: string[] = [];
    for (let step = 2; step <= BLOCK_STEPS; step += 1) {
      await page.keyboard.press('ArrowRight');
      await expect(status).toContainText(`Step ${step} of ${BLOCK_STEPS}`);
      seen.push((await status.textContent()) ?? '');
    }

    // Every sub-step was visited, in order, with no MixColumns in the last round.
    const count = (text: string) => seen.filter((s) => s.includes(text)).length;
    expect(count('SubBytes:')).toBe(10);
    expect(count('ShiftRows:')).toBe(10);
    expect(count('MixColumns:')).toBe(9);
    expect(count('AddRoundKey:')).toBe(11);
    expect(seen.at(-2)).toContain('Round 10');

    await expect(status).toContainText(C1_CIPHERTEXT);
    await expect(page.getByTestId('aes-ciphertext')).toContainText(C1_CIPHERTEXT);

    // And back again: the stepper runs both ways.
    await page.keyboard.press('ArrowLeft');
    await expect(status).toContainText(`Step ${BLOCK_STEPS - 1} of ${BLOCK_STEPS}`);
    await page.keyboard.press('End');
    await expect(page.getByTestId('aes-ciphertext')).toContainText(C1_CIPHERTEXT);

    await axeClean(page, 'block, at the ciphertext');
  });

  test('the whole walkthrough completes by keyboard alone', async ({ page }) => {
    await open(page);
    const status = page.getByRole('status');
    const chapters = [
      ['Key schedule', 'w43 = '],
      ['Avalanche', 'After round 10:'],
      ['Modes', 'ECB ciphertext: 64 bytes, 3 distinct blocks of 4'],
      ['ECB penguin', 'CBC:'],
      ['GCM', 'Never reuse a nonce'],
    ] as const;
    await page.keyboard.press('End');
    await expect(status).toContainText(C1_CIPHERTEXT);
    for (const [title, last] of chapters) {
      await page.getByRole('button', { name: `Next chapter: ${title}` }).focus();
      await page.keyboard.press('Enter');
      await page.keyboard.press('End');
      await expect(status).toContainText(last);
    }
    await expect(page.getByText('Walkthrough complete.')).toBeVisible();
    const stored = await page.evaluate(() => localStorage.getItem('cv:v1'));
    expect(JSON.parse(stored!).completed).toContain('aes');
  });

  test('the key schedule ends on the FIPS 197 A.1 word', async ({ page }) => {
    await open(page);
    await page
      .getByRole('navigation', { name: 'Chapters' })
      .getByRole('button', { name: 'Key schedule' })
      .click();
    await page.keyboard.press('End');
    await expect(page.getByRole('status')).toContainText('b6630ca6');
  });

  test('ECB repeats a block, CBC does not', async ({ page }) => {
    await open(page);
    await page
      .getByRole('navigation', { name: 'Chapters' })
      .getByRole('button', { name: 'Modes' })
      .click();
    await page.keyboard.press('End');
    await expect(page.getByText('same as block 1')).toHaveCount(1);
    await page
      .getByRole('group', { name: 'Block cipher mode' })
      .getByRole('button', { name: 'CBC' })
      .click();
    await page.keyboard.press('End');
    await expect(page.getByRole('status')).toContainText('4 distinct blocks of 4');
    await expect(page.getByText('same as block')).toHaveCount(0);
  });

  test('the penguin is drawn on canvases with alt text', async ({ page }) => {
    await open(page);
    await page
      .getByRole('navigation', { name: 'Chapters' })
      .getByRole('button', { name: 'ECB penguin' })
      .click();
    await page.keyboard.press('End');
    const images = page.getByRole('img', { name: /penguin/ });
    await expect(images).toHaveCount(3);
    for (const canvas of await page.locator('canvas').all()) {
      // Something was drawn: the centre pixel is opaque.
      const alpha = await canvas.evaluate((node) => {
        const c = node as HTMLCanvasElement;
        return c.getContext('2d')!.getImageData(32, 32, 1, 1).data[3];
      });
      expect(alpha).toBe(255);
    }
  });

  test('free play encrypts your block, and a share link lands on the same step', async ({
    page,
  }) => {
    await open(page);
    await page.getByRole('button', { name: 'Free play' }).click();
    // FIPS 197 Appendix B: the example block under the Appendix A.1 key.
    await page.getByRole('heading', { level: 1 }).click();
    await page.keyboard.press('End');
    await expect(page.getByRole('status')).toContainText(
      '3925841d02dc09fbdc118597196a0b32',
    );
    await page.getByLabel(/^Key \(16 bytes/).fill('000102030405060708090a0b0c0d0e0f');
    await page.getByLabel(/^Plaintext block/).fill('00112233445566778899aabbccddeeff');
    await page.getByRole('heading', { level: 1 }).click();
    await page.keyboard.press('End');
    await expect(page.getByRole('status')).toContainText(C1_CIPHERTEXT);
    await page.keyboard.press('ArrowLeft');
    await linkHasStep(page, BLOCK_STEPS - 2);

    const other = await page.context().newPage();
    await open(other, page.url());
    await expect(other.getByRole('status')).toContainText(
      `Step ${BLOCK_STEPS - 1} of ${BLOCK_STEPS}`,
    );
    await expect(other.getByRole('button', { name: 'Free play' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  for (const theme of ['light', 'dark'] as const) {
    test(`has no axe violations (${theme})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: theme });
      await open(page);
      const nav = page.getByRole('navigation', { name: 'Chapters' });
      // Each block sub-step view: input, SubBytes, ShiftRows, MixColumns, AddRoundKey.
      for (let i = 0; i < 6; i += 1) {
        await axeClean(page, `block step ${i + 1}`);
        await page.keyboard.press('ArrowRight');
      }
      for (const chapter of [
        'Key schedule',
        'Avalanche',
        'Modes',
        'ECB penguin',
        'GCM',
      ]) {
        await nav.getByRole('button', { name: chapter }).click();
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
