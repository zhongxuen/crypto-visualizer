import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Chapter } from '@/components/lesson';
import { expectNoAxeViolations } from '@/components/testing/axe';

import { XOR_EXAMPLE_TEXT } from '@/core/xor/scenarios';

import { BYTES_EXAMPLE_TEXT } from './bytesRun';
import { Phase } from './components/Phase';
import { XorModule } from './XorModule';

/** A stand-in for walkthrough.mdx (vitest has no MDX loader): one paragraph per phase. */
const LESSON = (
  <>
    <Chapter id="bytes">
      <Phase id="encode">
        <p>Encode each character.</p>
      </Phase>
      <Phase id="encode-done">
        <p>All the bytes.</p>
      </Phase>
    </Chapter>
    <Chapter id="xor">
      <Phase id="apply">
        <p>Mask.</p>
      </Phase>
      <Phase id="undo">
        <p>Unmask.</p>
      </Phase>
    </Chapter>
  </>
);

function chapter(name: string) {
  fireEvent.click(
    within(screen.getByRole('navigation', { name: 'Chapters' })).getByRole('button', {
      name: new RegExp(name),
    }),
  );
}

const press = (key: string, init: Partial<KeyboardEventInit> = {}) =>
  act(() => {
    fireEvent.keyDown(window, { key, ...init });
  });

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

/** Two-time pad, past the setup and the cancelling: the crib chip is on screen. */
function openCribAt() {
  chapter('Two-time pad');
  press('ArrowRight', { shiftKey: true });
  press('ArrowRight', { shiftKey: true });
}

/**
 * Renders the page and waits for what it loads after hydration: the later chapters'
 * runs and views, and free play's inputs (`./runs`, through `useDeferredImport`).
 */
async function renderLoaded() {
  const rendered = render(<XorModule walkthrough={LESSON} />);
  await act(async () => {
    await import('./runs');
  });
  return rendered;
}

describe('XorModule', { timeout: 20_000 }, () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.replaceState(null, '', '/xor');
  });
  afterEach(() => {
    restore?.();
    restore = null;
    vi.restoreAllMocks();
  });

  it('copies the first chapter’s example from core', () => {
    expect(BYTES_EXAMPLE_TEXT).toBe(XOR_EXAMPLE_TEXT);
  });

  it('puts each character over its bytes on the tape, 🔐 over four', async () => {
    const { container } = await renderLoaded();
    const tape = () => screen.getByRole('list', { name: 'Encoded so far' });
    // "Hi é 🔐" is 10 bytes: the first step has one on the tape and nine to come.
    expect(within(tape()).getAllByRole('listitem')).toHaveLength(1);
    expect(container.querySelectorAll('[data-pending]')).toHaveLength(9);
    expect(container.querySelector('[data-current]')).toHaveTextContent('H');

    press('End');
    press('ArrowLeft');
    // The last character, the lock, is four bytes under one character.
    const items = within(tape()).getAllByRole('listitem');
    expect(items).toHaveLength(6);
    expect(items[5]).toHaveTextContent('“🔐”: 0xf0 0x9f 0x94 0x90 (this step)');
    expect(items[3]).toHaveTextContent('“é”: 0xc3 0xa9');
    expect(container.querySelectorAll('[data-pending]')).toHaveLength(0);
  });

  it('flips the bit columns with a wave and drops the byte onto the tape', async () => {
    const { container } = await renderLoaded();
    chapter('XOR');
    const figure = screen.getByRole('img', { name: /bits flipped/ });
    const flipped = container.querySelectorAll('[data-flipped]').length;
    const keyOnes = container.querySelectorAll('[data-key-bit="1"]').length;
    // Every 1 in the key flips the bit under it.
    expect(flipped).toBe(keyOnes);
    expect(figure).toHaveAccessibleName(new RegExp(`${flipped} of 8 bits flipped`));

    press('ArrowRight');
    expect(container.querySelector('.motion-wave')).not.toBeNull();
    expect(container.querySelector('[data-travel]')).not.toBeNull();
    // Two of the three masked bytes are on the tape; one placeholder is left.
    expect(
      within(screen.getByRole('list', { name: 'masked' })).getAllByRole('listitem'),
    ).toHaveLength(2);
    expect(container.querySelectorAll('[data-pending]')).toHaveLength(1);
  });

  it('unmasks in reverse: the key slides down and the wave runs right to left', async () => {
    const { container } = await renderLoaded();
    chapter('XOR');
    press('ArrowRight', { shiftKey: true });
    expect(screen.getByRole('status')).toHaveTextContent('Step 5 of');
    press('ArrowRight');
    const wave = container.querySelector('.motion-wave');
    expect(wave).toHaveClass('flex-row-reverse');
    // The key row travels down from the masked row above it.
    const masked = screen.getByRole('img', { name: /bits flipped/ }).firstElementChild;
    expect(container.querySelector(`[data-travel="${masked?.id}"]`)).not.toBeNull();
  });

  it('follows the timeline in the lesson rail', async () => {
    await renderLoaded();
    const current = () =>
      screen
        .getByRole('complementary', { name: 'Lesson' })
        .querySelector('[aria-current="step"]');
    expect(current()).toHaveTextContent('Encode each character.');
    press('End');
    expect(current()).toHaveTextContent('All the bytes.');
    chapter('XOR');
    expect(current()).toHaveTextContent('Mask.');
    press('ArrowRight', { shiftKey: true });
    expect(current()).toHaveTextContent('Unmask.');
  });

  it('shows every end state at once under reduced motion', async () => {
    restore = reduceMotion();
    const { container } = await renderLoaded();
    press('ArrowRight');
    chapter('XOR');
    press('ArrowRight');
    press('ArrowRight', { shiftKey: true });
    press('ArrowRight');
    // The stage's JS-driven motion (the shell's CSS-only motion is stilled by globals.css).
    const stage = screen.getByRole('region', { name: 'Visualization' });
    const moving = [
      ...stage.querySelectorAll(
        '.motion-wave, .motion-move, .motion-reveal, .motion-fade, [data-pulse]',
      ),
    ].map((node) => node.outerHTML.slice(0, 160));
    expect(moving).toEqual([]);
    // The meaning is still all there: the flipped bits are filled, the byte is on the tape.
    expect(container.querySelectorAll('[data-flipped]').length).toBe(
      container.querySelectorAll('[data-key-bit="1"]').length,
    );
    expect(screen.getByRole('list', { name: 'message' })).toHaveTextContent('0x48');
  });

  describe('the crib drag', () => {
    function openCrib() {
      chapter('Two-time pad');
      press('ArrowRight', { shiftKey: true });
      press('ArrowRight', { shiftKey: true });
      return screen.getByRole('slider', { name: /Crib “ the ”/ });
    }

    it('moves with the arrow keys, Home and End, stepping the timeline', async () => {
      await renderLoaded();
      const crib = openCrib();
      expect(crib).toHaveAttribute('aria-valuenow', '0');
      expect(crib).toHaveAttribute('aria-valuemax', '26');

      act(() => {
        fireEvent.keyDown(crib, { key: 'ArrowRight' });
      });
      expect(crib).toHaveAttribute('aria-valuenow', '1');
      expect(screen.getByRole('status')).toHaveTextContent('Offset 1');

      act(() => {
        fireEvent.keyDown(crib, { key: 'End' });
      });
      expect(crib).toHaveAttribute('aria-valuenow', '26');
      act(() => {
        fireEvent.keyDown(crib, { key: 'Home' });
      });
      expect(crib).toHaveAttribute('aria-valuenow', '0');
      act(() => {
        fireEvent.keyDown(crib, { key: 'ArrowLeft' });
      });
      expect(crib).toHaveAttribute('aria-valuenow', '0');
    });

    it('reveals readable text under the highlighter at the right offset', async () => {
      const { container } = await renderLoaded();
      const crib = openCrib();
      act(() => {
        fireEvent.keyDown(crib, { key: 'PageUp' });
      });
      act(() => {
        fireEvent.keyDown(crib, { key: 'PageUp' });
      });
      expect(crib).toHaveAttribute('aria-valuenow', '10');
      expect(crib.getAttribute('aria-valuetext')).toBe('Offset 10: reads “hips ”');
      expect(screen.getByText('✓ reads as text')).toBeVisible();
      const revealed = container.querySelectorAll('[data-revealed]');
      expect([...revealed].map((cell) => cell.textContent).join('')).toBe('hips·');
      expect(revealed[0]).toHaveClass('highlighter');
    });

    it('follows a pointer drag', async () => {
      await renderLoaded();
      const crib = openCrib();
      // 31 cells, 24 px each, starting at x = 0.
      vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
        left: 0,
        top: 0,
        right: 744,
        bottom: 48,
        width: 744,
        height: 48,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      });
      act(() => {
        fireEvent.pointerDown(crib, { clientX: 0, pointerId: 1 });
        fireEvent.pointerMove(crib, { clientX: 72, pointerId: 1 });
      });
      expect(crib).toHaveAttribute('aria-valuenow', '3');
      act(() => {
        fireEvent.pointerUp(crib, { clientX: 72, pointerId: 1 });
        fireEvent.pointerMove(crib, { clientX: 200, pointerId: 1 });
      });
      expect(crib).toHaveAttribute('aria-valuenow', '3');
    });
  });

  // One test per state: axe runs twice (light and dark) on the whole page each time, which
  // is slow under a loaded parallel run.
  it.each(['Text to bytes', 'XOR', 'One-time pad'])(
    'is axe clean in “%s”',
    async (name) => {
      const { container } = await renderLoaded();
      chapter(name);
      press('ArrowRight');
      await expectNoAxeViolations(container);
    },
    60_000,
  );

  it('is axe clean on the crib drag and in free play', async () => {
    const { container } = await renderLoaded();
    openCribAt();
    await expectNoAxeViolations(container);
    fireEvent.click(screen.getByRole('button', { name: 'Free play' }));
    await expectNoAxeViolations(container);
  }, 60_000);
});
