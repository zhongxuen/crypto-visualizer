import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

import { expect, test, type Locator, type Page } from '@playwright/test';

import { openModule } from './routes';

/**
 * Colour-blind check (phase 10, step 3): the bit-diff strip and the AES state under
 * simulated protanopia and deuteranopia, with screenshots, and an assertion that a
 * flipped bit or changed byte differs from an unchanged one in **shape**, not only hue.
 *
 * The simulation is Machado, Oliveira & Fernandes (2009) at full severity, applied as an
 * SVG `feColorMatrix` in linear RGB (the filter default), which is what Chrome DevTools'
 * vision-deficiency emulation uses. Screenshots go to the test's output folder and the
 * report; `UPDATE_COLOUR_BLIND_SHOTS=1` also writes them to
 * `docs/screenshots/colour-blind/` to be committed.
 */

const MATRICES = {
  protanopia: [
    [0.152286, 1.052583, -0.204868],
    [0.114503, 0.786281, 0.099216],
    [-0.003882, -0.048116, 1.051998],
  ],
  deuteranopia: [
    [0.367322, 0.860646, -0.227968],
    [0.280085, 0.672501, 0.047413],
    [-0.01182, 0.04294, 0.968881],
  ],
} as const;

type Deficiency = keyof typeof MATRICES;

const SHOTS_DIR = join(process.cwd(), 'docs', 'screenshots', 'colour-blind');

async function simulate(page: Page, target: Locator, deficiency: Deficiency | null) {
  await page.evaluate(
    ({ id, rows }) => {
      document.getElementById('cvd-filter')?.remove();
      if (!rows) return;
      const values = rows.map((row) => [...row, 0, 0].join(' ')).join(' ') + ' 0 0 0 1 0';
      const holder = document.createElement('div');
      holder.id = 'cvd-filter';
      holder.innerHTML = `<svg width="0" height="0" style="position:absolute"><filter id="${id}"><feColorMatrix type="matrix" values="${values}"/></filter></svg>`;
      document.body.append(holder);
    },
    { id: `cvd-${deficiency}`, rows: deficiency ? MATRICES[deficiency] : null },
  );
  await target.evaluate(
    (node, filter) => ((node as HTMLElement).style.filter = filter),
    deficiency ? `url(#cvd-${deficiency})` : '',
  );
}

async function shoot(page: Page, target: Locator, name: string) {
  for (const deficiency of [null, 'protanopia', 'deuteranopia'] as const) {
    await simulate(page, target, deficiency);
    const file = `${name}-${deficiency ?? 'normal'}.png`;
    const shot = await target.screenshot({ path: test.info().outputPath(file) });
    await test.info().attach(file, { body: shot, contentType: 'image/png' });
    if (process.env.UPDATE_COLOUR_BLIND_SHOTS) {
      mkdirSync(SHOTS_DIR, { recursive: true });
      await target.screenshot({ path: join(SHOTS_DIR, file) });
    }
  }
  await simulate(page, target, null);
}

/** Filled vs hollow: flipped bits have a fill and no border, unchanged ones the reverse. */
async function expectBitShapes(strip: Locator) {
  const style = (cell: Locator) =>
    cell.evaluate((node) => {
      const css = getComputedStyle(node);
      return { fill: css.backgroundColor, border: parseFloat(css.borderTopWidth) };
    });
  const bits = strip.getByRole('img');
  const flipped = bits.locator('span[data-flipped]').first();
  const same = bits.locator('span:not([data-flipped])').first();
  await expect(flipped).toBeVisible();
  const on = await style(flipped);
  const off = await style(same);
  expect(on.fill).not.toBe('rgba(0, 0, 0, 0)');
  expect(on.border).toBe(0);
  expect(off.fill).toBe('rgba(0, 0, 0, 0)');
  expect(off.border).toBeGreaterThan(0);
}

/**
 * Changed bytes are hatched and carry a thicker border; unchanged ones are neither. Looks
 * across every grid in `view`, since once avalanche has spread a state may have no
 * unchanged byte left.
 */
async function expectByteShapes(view: Locator) {
  const style = (cell: Locator) =>
    cell.evaluate((node) => {
      const css = getComputedStyle(node);
      return { hatch: css.backgroundImage, border: parseFloat(css.borderTopWidth) };
    });
  const changed = await style(view.locator('[role="gridcell"][data-changed]').first());
  const same = await style(view.locator('[role="gridcell"]:not([data-changed])').first());
  expect(changed.hatch).toContain('repeating-linear-gradient');
  expect(same.hatch).toBe('none');
  expect(changed.border).toBeGreaterThan(same.border);
}

test('the AES avalanche: bit-diff strip and state, under protanopia and deuteranopia', async ({
  page,
}) => {
  await openModule(page, '/aes');
  await page
    .getByRole('navigation', { name: 'Chapters' })
    .getByRole('button', { name: 'Avalanche' })
    .click();
  await page.locator('body').click({ position: { x: 1, y: 1 } });
  // One round in: the flip has spread to some bytes and not yet to the rest.
  await page.keyboard.press('ArrowRight');

  const visual = page.getByRole('region', { name: 'Visualization' });
  const strip = visual
    .locator('figure')
    .filter({ has: page.locator('[data-flipped]') })
    .first();
  await expectBitShapes(strip);
  await expectByteShapes(visual);

  await shoot(page, visual, 'aes-avalanche');
});

test('the SHA-256 avalanche strip, under protanopia and deuteranopia', async ({
  page,
}) => {
  await openModule(page, '/hashing');
  await page
    .getByRole('navigation', { name: 'Chapters' })
    .getByRole('button', { name: 'Avalanche' })
    .click();
  await page.locator('body').click({ position: { x: 1, y: 1 } });
  await page.keyboard.press('End');

  const visual = page.getByRole('region', { name: 'Visualization' });
  const strip = visual
    .locator('figure')
    .filter({ has: page.locator('[data-flipped]') })
    .first();
  await expectBitShapes(strip);

  await shoot(page, strip, 'sha256-avalanche');
});
