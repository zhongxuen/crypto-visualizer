import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { expectNoAxeViolations } from '@/components/testing/axe';
import type { PhaseSummary } from '@/core/sim/result';

import { HashingModule } from './HashingModule';
import { Phase } from './Lesson';
import { mergeRoundPhases } from './phases';

const ABC = 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad';
const RFC4231_2 = '5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843';

const LESSON = (
  <>
    <Phase on="sha256.pad" title="Padding">
      <p>pad</p>
    </Phase>
    <Phase on="sha256.round" title="Rounds">
      <p>rounds</p>
    </Phase>
    <Phase on="hmac.opad hmac.outer" title="Outer lane">
      <p>outer</p>
    </Phase>
  </>
);

async function renderLoaded() {
  const rendered = render(<HashingModule walkthrough={LESSON} />);
  await act(async () => {
    await import('./runs');
  });
  return rendered;
}

const next = () => act(() => fireEvent.keyDown(window, { key: 'ArrowRight' }));
const end = () => act(() => fireEvent.keyDown(window, { key: 'End' }));
const visual = () => screen.getByRole('region', { name: 'Visualization' });
const map = () => screen.getByRole('navigation', { name: 'SHA-256 pipeline' });

function chapter(name: string) {
  fireEvent.click(
    within(screen.getByRole('navigation', { name: 'Chapters' })).getByRole('button', {
      name: new RegExp(name),
    }),
  );
}

/** Make `prefers-reduced-motion: reduce` match, as the viewer's setting would. */
function reduceMotion(on: boolean) {
  const original = window.matchMedia;
  window.matchMedia = ((query: string) => ({
    ...original(query),
    matches: on && query.includes('reduce'),
  })) as typeof window.matchMedia;
  return () => {
    window.matchMedia = original;
  };
}

describe('mergeRoundPhases', () => {
  const phase = (index: number, id: string, title: string): PhaseSummary => ({
    index,
    id,
    title,
    description: '',
    startMs: index * 10,
    endMs: index * 10 + 10,
  });

  it('shows each block’s eight round phases as one, and maps every phase onto it', () => {
    const phases = [
      phase(0, 'padding', 'Padding'),
      phase(1, 'block-1-rounds-1', 'Block 1 · Rounds 1–8'),
      phase(2, 'block-1-rounds-9', 'Block 1 · Rounds 9–16'),
      phase(3, 'block-2-rounds-1', 'Block 2 · Rounds 1–8'),
      phase(4, 'digest', 'Digest'),
    ];
    const merged = mergeRoundPhases(phases);
    expect(merged.phases.map((p) => p.title)).toEqual([
      'Padding',
      'Block 1 · Rounds 1–64',
      'Block 2 · Rounds 1–64',
      'Digest',
    ]);
    expect(merged.phases[1]).toMatchObject({ startMs: 10, endMs: 30, index: 1 });
    expect(merged.indexOf).toEqual([0, 1, 1, 2, 3]);
  });
});

describe('HashingModule', { timeout: 20_000 }, () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.replaceState(null, '', '/hashing');
  });

  it('starts on padding: the map, the four parts of the block, and the lesson', async () => {
    await renderLoaded();
    expect(within(map()).getByRole('button', { current: 'step' })).toHaveTextContent(
      'Padded',
    );
    const parts = screen.getByRole('list', { name: 'The parts of the padded message' });
    expect(parts).toHaveTextContent('3 message bytes');
    expect(parts).toHaveTextContent('52 zero bytes');
    expect(parts).toHaveTextContent('length bytes: 24 bits');
    expect(visual().querySelectorAll('[data-part="len"]')).toHaveLength(8);
    expect(document.querySelector('[data-lesson="sha256.pad"]')).toHaveAttribute(
      'aria-current',
      'step',
    );
  });

  it('shows the block as sixteen words, then the schedule converging into W16', async () => {
    await renderLoaded();
    next();
    const words = screen.getByRole('list', { name: "The block's sixteen words" });
    expect(within(words).getAllByRole('listitem')).toHaveLength(16);
    expect(words).toHaveTextContent('W061626380');
    next();
    expect(within(map()).getByRole('button', { current: 'step' })).toHaveTextContent(
      'W16/63',
    );
    const inputs = screen.getByRole('list', { name: 'The four words W16 is made from' });
    expect(inputs).toHaveTextContent('W14');
    expect(inputs).toHaveTextContent('W0');
    const column = screen.getByRole('list', { name: 'The 64-word schedule' });
    expect(column.querySelectorAll('[data-word="input"]')).toHaveLength(4);
    expect(column.querySelector('[data-word="new"]')).toHaveTextContent('W1661626380');
    expect(column.querySelectorAll('[data-word="future"]')).toHaveLength(47);
  });

  it('shifts a–h one place right each round, and the round slider moves through 64', async () => {
    await renderLoaded();
    fireEvent.click(within(map()).getByRole('button', { name: /Rounds/ }));
    expect(screen.getByRole('status')).toHaveTextContent('Round 1:');
    // FIPS 180-4's "abc" example: after round 1, a = 5d6aebcd and e = fa2a4622.
    const fresh = visual().querySelectorAll('[data-new]');
    expect(fresh[0]).toHaveTextContent('5d6aebcd');
    expect(fresh[1]).toHaveTextContent('fa2a4622');

    const keyOf = (slot: number) =>
      visual().querySelectorAll('[data-flip-key]')[slot].getAttribute('data-flip-key');
    const valueOf = (slot: number) =>
      visual().querySelectorAll('[data-flip-key]')[slot].textContent;
    const a = { key: keyOf(0), value: valueOf(0) };
    const e = { key: keyOf(4), value: valueOf(4) };
    next();
    // The a and e of round 1 are now b and f: same value, same key, so <Flip> moves them.
    expect(keyOf(1)).toBe(a.key);
    expect(valueOf(1)).toBe(a.value!.replace(' (new)', ''));
    expect(keyOf(5)).toBe(e.key);

    const slider = screen.getByRole('slider', { name: 'Round' });
    expect(slider).toHaveValue('2');
    fireEvent.change(slider, { target: { value: '64' } });
    expect(screen.getByRole('status')).toHaveTextContent('Round 64:');
    expect(within(map()).getByRole('button', { current: 'step' })).toHaveTextContent(
      '64/64',
    );
    expect(document.querySelector('[data-lesson="sha256.round"]')).toHaveAttribute(
      'aria-current',
      'step',
    );
  });

  it('lists the 64 rounds as one phase in the rail', async () => {
    await renderLoaded();
    const groups = screen.getByRole('list', { name: 'Groups' });
    expect(within(groups).queryByText(/Rounds 1–8/)).toBeNull();
    expect(groups).toHaveTextContent('Block 1 · 3 phases');
    fireEvent.click(within(map()).getByRole('button', { name: /Rounds/ }));
    expect(within(groups).getByRole('button', { current: 'step' })).toHaveTextContent(
      'Rounds 1–64',
    );
  });

  it('ends on the digest, H0–H7 side by side', async () => {
    await renderLoaded();
    fireEvent.click(screen.getByRole('button', { name: 'Skip to digest' }));
    expect(screen.getByTestId('sha256-digest')).toHaveTextContent(ABC);
    expect(screen.getByRole('list', { name: 'H0 to H7' })).toHaveTextContent(
      'H0ba7816bf',
    );
  });

  it('marks the differing hex characters of the two avalanche digests', async () => {
    await renderLoaded();
    chapter('Avalanche');
    end();
    const marks = visual().querySelectorAll('mark[data-diff]');
    expect(marks.length).toBeGreaterThan(40);
    expect(screen.getByTestId('hex-diff-summary')).toHaveTextContent(
      `${marks.length / 2} of 64 hex characters`,
    );
    const output = screen.getByRole('img', { name: /Output: the two digests/ });
    expect(output.querySelectorAll('[data-flipped]').length).toBeGreaterThan(80);
  });

  it('draws HMAC as two lanes, the inner hash crossing into the outer one', async () => {
    await renderLoaded();
    chapter('HMAC');
    expect(screen.queryByRole('group', { name: 'Inner lane' })).toBeNull();
    next();
    const inner = () => screen.getByRole('group', { name: 'Inner lane' });
    const outer = () => screen.getByRole('group', { name: 'Outer lane' });
    expect(outer().querySelectorAll('[data-box="future"]')).toHaveLength(3);
    next();
    next();
    const now = inner().querySelectorAll('[data-box="now"]');
    expect(now).toHaveLength(2);
    expect(now[1]).toHaveTextContent('inner hash');
    next();
    expect(outer().querySelectorAll('[data-box="now"]')).toHaveLength(2);
    expect(outer()).toHaveTextContent('inner hash');
    expect(outer().querySelector('[data-travel]')).not.toBeNull();
    expect(
      document.querySelector('[data-lesson="hmac.opad hmac.outer"]'),
    ).toHaveAttribute('aria-current', 'step');
    end();
    expect(screen.getByRole('status')).toHaveTextContent(RFC4231_2);
    expect(visual().querySelectorAll('[data-box="future"]')).toHaveLength(0);
  });

  it('animates a single step, and jumps without motion on a seek', async () => {
    await renderLoaded();
    next();
    expect(visual().querySelector('.motion-reveal')).not.toBeNull();
    end();
    expect(visual().querySelector('.motion-reveal')).toBeNull();
  });

  // Axe is slow in jsdom: the page once, then only the picture for the other states.
  it('is axe clean on the first screen', async () => {
    const { container } = await renderLoaded();
    await expectNoAxeViolations(container);
  }, 60_000);

  it('is axe clean in the schedule and the rounds', async () => {
    await renderLoaded();
    next();
    next();
    await expectNoAxeViolations(visual());
    fireEvent.click(within(map()).getByRole('button', { name: /Rounds/ }));
    await expectNoAxeViolations(visual());
  }, 60_000);

  it('is axe clean in the avalanche chapter', async () => {
    await renderLoaded();
    chapter('Avalanche');
    end();
    await expectNoAxeViolations(visual());
  }, 60_000);

  it('is axe clean in the HMAC lanes', async () => {
    await renderLoaded();
    chapter('HMAC');
    for (let i = 0; i < 4; i += 1) next();
    await expectNoAxeViolations(visual());
  }, 60_000);
});

describe('HashingModule under reduced motion', { timeout: 20_000 }, () => {
  let restore: () => void = () => {};
  beforeEach(() => {
    localStorage.clear();
    window.history.replaceState(null, '', '/hashing');
    restore = reduceMotion(true);
  });
  afterEach(() => restore());

  it('runs no animation on any step: every view is its end frame', async () => {
    await renderLoaded();
    const moving = () =>
      visual().querySelectorAll(
        '.motion-reveal, .motion-wave, .motion-pulse, .motion-move, .motion-flip-card, .motion-fade',
      );
    for (let i = 0; i < 4; i += 1) {
      expect(moving()).toHaveLength(0);
      next();
    }
    fireEvent.click(within(map()).getByRole('button', { name: /Rounds/ }));
    next();
    expect(moving()).toHaveLength(0);
    expect(visual().querySelectorAll('[data-flip-key]')).toHaveLength(8);
    chapter('Avalanche');
    end();
    expect(moving()).toHaveLength(0);
    expect(visual().querySelectorAll('mark[data-diff]').length).toBeGreaterThan(0);
    chapter('HMAC');
    for (let i = 0; i < 4; i += 1) next();
    expect(moving()).toHaveLength(0);
  });
});
