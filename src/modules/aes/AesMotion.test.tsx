import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { AesModule } from './AesModule';
import styles from './components/aes.module.css';
import { Phase } from './lesson';

/**
 * The AES animations (docs/UIUX.md §7.2, module 4) and the lesson that follows the
 * timeline. Each animation plays on one step forward only; on a seek, a step back and
 * under reduced motion the end frame is on screen at once, with nothing animating.
 */

/** Pretend the viewer asked for reduced motion. */
function reduceMotion() {
  const original = window.matchMedia;
  window.matchMedia = ((query: string) => ({
    ...original(query),
    matches: query.includes('reduce'),
  })) as typeof window.matchMedia;
  return () => {
    window.matchMedia = original;
  };
}

let restore: (() => void) | null = null;

/** A lesson with one paragraph per block phase, as walkthrough.mdx has. */
const LESSON = (
  <>
    <Phase on="input">Input paragraph</Phase>
    <Phase on="round0">Round 0 paragraph</Phase>
    <Phase on="subBytes">SubBytes paragraph</Phase>
    <Phase on="shiftRows">ShiftRows paragraph</Phase>
    <Phase on="last">Last round paragraph</Phase>
  </>
);

async function renderLoaded() {
  const rendered = render(<AesModule walkthrough={LESSON} />);
  await act(async () => {
    await import('./runs');
  });
  return rendered;
}

const press = (key: string) => act(() => fireEvent.keyDown(window, { key }));
const forward = (n = 1) => {
  for (let i = 0; i < n; i += 1) press('ArrowRight');
};

function chapter(name: string) {
  fireEvent.click(
    within(screen.getByRole('navigation', { name: 'Chapters' })).getByRole('button', {
      name: new RegExp(name),
    }),
  );
}

const afterGrid = () => screen.getByRole('grid', { name: 'State after' });

/** Row 1 of ShiftRows' result, as the cells' wrappers in display order. */
function shiftedRow(r: number) {
  const rows = within(screen.getByRole('list', { name: 'ShiftRows, row by row' }))
    .getAllByRole('listitem')
    .map((li) => li.querySelector('[data-flip-root]')!);
  return [...rows[r].children] as HTMLElement[];
}

describe('AES animations', { timeout: 20_000 }, () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.replaceState(null, '', '/aes');
  });
  afterEach(() => {
    restore?.();
    restore = null;
  });

  it('SubBytes flips the new bytes in and sweeps the S-box on a step forward', async () => {
    await renderLoaded();
    forward(2);
    expect(afterGrid()).toHaveClass(styles.flipIn);
    const region = screen.getByRole('region', { name: 'S-box table' });
    // FIPS 197 C.1 round[1].start begins 00 10 20 30: those entries take their turn.
    expect(region.querySelectorAll(`.${styles.lookup}`).length).toBeGreaterThan(0);
    expect(region.querySelector('[data-lookup]')).toHaveTextContent('63');
  });

  it('ShiftRows slides each row and wraps the bytes that fall off the left', async () => {
    await renderLoaded();
    forward(3);
    // FIPS 197 C.1 round[1]: s_box row 1 is ca 53 60 70, so s_row row 1 is 53 60 70 ca.
    const row = shiftedRow(1);
    expect(row.map((cell) => cell.textContent)).toEqual(['53', '60', '70', 'ca']);
    // The three that slide carry a FLIP key; the one that wraps fades in from the right.
    expect(row.slice(0, 3).every((cell) => cell.hasAttribute('data-flip-key'))).toBe(
      true,
    );
    expect(row[3]).not.toHaveAttribute('data-flip-key');
    expect(row[3]).toHaveClass(styles.wrapIn);
    // Row 0 stays where it is.
    expect(shiftedRow(0).some((cell) => cell.classList.contains(styles.wrapIn))).toBe(
      false,
    );
  });

  it('MixColumns works column by column with the matrix beside the state', async () => {
    await renderLoaded();
    forward(4);
    expect(afterGrid()).toHaveClass(styles.byColumn);
    expect(screen.getByText('The matrix times column 0')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Column 3' }));
    expect(screen.getByText('The matrix times column 3')).toBeVisible();
  });

  it('AddRoundKey drops the round key onto the state and pulses what changed', async () => {
    await renderLoaded();
    forward(5);
    const key = screen.getByRole('grid', { name: 'Round key 1' });
    expect(key.parentElement).toHaveClass(styles.drop);
    expect(afterGrid()).toHaveClass(styles.pulseChanged);
  });

  it('shows the end frame at once on a step back and on a seek', async () => {
    await renderLoaded();
    forward(4);
    press('ArrowLeft');
    // Back on ShiftRows: already shifted, nothing sliding in.
    expect(shiftedRow(1).map((cell) => cell.textContent)).toEqual([
      '53',
      '60',
      '70',
      'ca',
    ]);
    expect(shiftedRow(1)[3]).not.toHaveClass(styles.wrapIn);
    press('End');
    press('Home');
    forward(1);
    press('End');
    expect(screen.getByTestId('aes-ciphertext')).toHaveTextContent(
      '69c4e0d86a7b0430d8cdb78070b4c55a',
    );
  });

  it('under reduced motion every step is its end frame, with nothing animating', async () => {
    restore = reduceMotion();
    await renderLoaded();
    forward(2);
    expect(afterGrid()).not.toHaveClass(styles.flipIn);
    expect(
      screen
        .getByRole('region', { name: 'S-box table' })
        .querySelector(`.${styles.lookup}`),
    ).toBeNull();
    forward(1);
    const row = shiftedRow(3);
    // Row 3 of s_box is 04 51 e7 8c (bytes 3, 7, 11, 15), three places left: 8c 04 51 e7.
    expect(row.map((cell) => cell.textContent)).toEqual(['8c', '04', '51', 'e7']);
    expect(row.some((cell) => cell.classList.contains(styles.wrapIn))).toBe(false);
    forward(1);
    expect(afterGrid()).not.toHaveClass(styles.byColumn);
    forward(1);
    expect(
      screen.getByRole('grid', { name: 'Round key 1' }).parentElement,
    ).not.toHaveClass(styles.drop);
  });

  it('the lesson marks the paragraph for the step on screen', async () => {
    await renderLoaded();
    const current = () =>
      document.querySelector('[data-phase][aria-current="step"]')?.textContent;
    expect(current()).toBe('Input paragraph');
    forward(1);
    expect(current()).toBe('Round 0 paragraph');
    forward(1);
    expect(current()).toBe('SubBytes paragraph');
    forward(1);
    expect(current()).toBe('ShiftRows paragraph');
    press('End');
    press('ArrowLeft');
    press('ArrowLeft');
    // Round 10's ShiftRows: both its own paragraph and the last round's.
    expect(
      [...document.querySelectorAll('[data-phase][aria-current="step"]')].map(
        (p) => p.textContent,
      ),
    ).toEqual(['ShiftRows paragraph', 'Last round paragraph']);
  });

  it('the key schedule rotates, substitutes and adds Rcon byte by byte', async () => {
    await renderLoaded();
    chapter('Key schedule');
    forward(4);
    // FIPS 197 A.1: w3 = 09cf4f3c; RotWord = cf4f3c09; SubWord = 8a84eb01; Rcon 01.
    const working = screen.getByRole('list', { name: 'Working for w4, byte by byte' });
    const rot = working.querySelector('[data-flip-root]')!;
    expect([...rot.children].map((c) => c.textContent)).toEqual(['cf', '4f', '3c', '09']);
    expect(rot.lastElementChild).toHaveClass(styles.wrapIn);
    expect(working).toHaveTextContent('8a84eb01');
    expect(working.querySelectorAll(`.${styles.flipOne}`)).toHaveLength(4);
    // w4 = a0fafe17.
    expect(working).toHaveTextContent('a0fafe17');
  });

  it('CTR ticks the counter and CBC chains the previous ciphertext', async () => {
    await renderLoaded();
    chapter('Modes');
    fireEvent.click(
      within(screen.getByRole('group', { name: 'Block cipher mode' })).getByRole(
        'button',
        {
          name: 'CTR',
        },
      ),
    );
    forward(2);
    expect(screen.getByText(/^T2 \(counter block\)/)).toBeVisible();
    // Only the counter's last digits changed, and only they flip.
    expect(document.querySelectorAll('.motion-flip-card').length).toBeGreaterThan(0);
    expect(document.querySelectorAll('.motion-flip-card').length).toBeLessThan(4);

    fireEvent.click(screen.getByRole('button', { name: 'CBC' }));
    forward(3);
    expect(screen.getByText('C1')).toBeVisible();
    expect(document.querySelector('[data-travel="aes-chain-0"]')).not.toBeNull();
    expect(document.getElementById('aes-chain-0')).not.toBeNull();
  });

  it('puts the penguins side by side, locked until their step, and enlarges one', async () => {
    await renderLoaded();
    chapter('ECB penguin');
    const list = screen.getByRole('list', { name: 'The penguin, three ways' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(3);
    expect(list).toHaveTextContent('Locked until step 2');
    expect(list).toHaveTextContent('Locked until step 3');
    forward(1);
    expect(list).not.toHaveTextContent('Locked until step 2');
    expect(list.querySelector(`.${styles.sweep}`)).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Show ECB large' }));
    expect(screen.getByText('ECB, large')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByText('ECB, large')).toBeNull();
  });
});
