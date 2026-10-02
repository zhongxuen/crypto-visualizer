import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { Chapter } from '@/components/lesson';
import { expectNoAxeViolations } from '@/components/testing/axe';

import { DhModule } from './DhModule';
import { Phase } from './components/Phase';

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

function chapter(name: string) {
  fireEvent.click(
    within(screen.getByRole('navigation', { name: 'Chapters' })).getByRole('button', {
      name: new RegExp(name),
    }),
  );
}

const next = () => act(() => fireEvent.keyDown(window, { key: 'ArrowRight' }));
const end = () => act(() => fireEvent.keyDown(window, { key: 'End' }));
const steps = (n: number) => {
  for (let i = 0; i < n; i += 1) next();
};

/**
 * Renders the page and waits for what it loads after hydration: the non-paint chapters'
 * runs and views, and free play's inputs (`./runs`, `useDeferredImport`).
 */
async function renderLoaded(walkthrough?: React.ReactNode) {
  const rendered = render(<DhModule walkthrough={walkthrough} />);
  await act(async () => {
    await Promise.all([
      import('./runs'),
      import('./components/EveView'),
      import('./components/Inputs'),
      import('./components/PowView'),
      import('./components/PaintLater'),
      import('./components/SplitLanes'),
    ]);
  });
  return rendered;
}

// Each test waits for code the page loads after hydration; under a loaded parallel run
// (`npm run verify` with coverage) that can pass the 5 s default.
describe('DhModule', { timeout: 20_000 }, () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.replaceState(null, '', '/dh');
  });

  it('mixes the same paint on both sides', async () => {
    await renderLoaded();
    const lanes = screen.getByRole('list', { name: 'Alice, the public channel and Bob' });
    expect(
      within(lanes).getByRole('list', { name: 'Public channel holds' }),
    ).toHaveTextContent('Common colour');
    steps(9);
    expect(screen.getByTestId('dh-paint-same')).toHaveTextContent('The same colour');
  });

  it('steps the exchange to the shared secret 16, with a clock for p = 23', async () => {
    await renderLoaded();
    chapter('The exchange');
    expect(
      screen.getByRole('img', { name: /Numbers mod p: 2 \(mod 23\)/ }),
    ).toBeInTheDocument();
    steps(3);
    expect(screen.getByRole('status')).toHaveTextContent('Alice, bit 1 of 3 is 1');
    expect(
      await screen.findByRole('img', { name: /Running value: 1 → 2 \(mod 23\)/ }),
    ).toBeInTheDocument();
    steps(3);
    expect(await screen.findByTestId('dh-share-A')).toHaveTextContent('18');
    for (let i = 0; i < 19; i += 1) next();
    expect(await screen.findByTestId('dh-agree')).toHaveTextContent('The same number');
    const alice = screen.getByRole('list', { name: 'Alice holds' });
    expect(alice).toHaveTextContent('Secret16');
  });

  it("hides private values in Eve's view", async () => {
    await renderLoaded();
    chapter('The exchange');
    steps(2);
    const alice = () => screen.getByRole('list', { name: 'Alice holds' });
    expect(alice()).toHaveTextContent('a6');
    fireEvent.click(screen.getByRole('button', { name: /Eve’s view/ }));
    expect(alice()).not.toHaveTextContent('a6');
    expect(alice()).toHaveTextContent('hidden from Eve');
  });

  it('lets Eve brute-force a = 6 and shows how the search grows', async () => {
    await renderLoaded();
    chapter('Eve listens');
    steps(7);
    expect(screen.getByRole('status')).toHaveTextContent('That is A');
    const table = await screen.findByRole('region', { name: "Eve's guesses" });
    expect(within(table).getAllByRole('row')).toHaveLength(7);
    const eveLane = () => screen.getByRole('list', { name: 'Eve holds' });
    expect(() => eveLane()).toThrow();
    next();
    expect(await screen.findByTestId('dh-eve-a')).toHaveTextContent('6');
    expect(eveLane()).toHaveTextContent('a6');
    expect(eveLane()).toHaveTextContent('Secret16');
    expect(screen.getByTestId('dh-eve-secret')).toHaveTextContent('16');
    end();
    const growth = await screen.findByTestId('dh-growth');
    expect(within(growth).getAllByRole('row')).toHaveLength(7);
    expect(growth).toHaveTextContent('a 617-digit number');
  });

  it('shows Mallory in the middle with two different secrets', async () => {
    await renderLoaded();
    chapter('Man in the middle');
    const lanes = screen.getByRole('list', {
      name: 'Alice, Mallory in the middle, and Bob',
    });
    expect(lanes.querySelectorAll('[data-lane]')).toHaveLength(4);
    steps(11);
    expect(screen.getByTestId('dh-mitm-alice')).toHaveTextContent('58');
    expect(screen.getByTestId('dh-mitm-bob')).toHaveTextContent('7');
    end();
    expect(screen.getByRole('link', { name: 'how RSA signing works' })).toHaveAttribute(
      'href',
      '/rsa',
    );
  });

  it('takes free-play private keys and refuses one out of range', async () => {
    await renderLoaded();
    chapter('The exchange');
    fireEvent.click(screen.getByRole('button', { name: 'Free play' }));
    fireEvent.change(await screen.findByLabelText(/^Alice's private a/), {
      target: { value: '20' },
    });
    expect(screen.getByTestId('dh-a-feedback')).toHaveTextContent('between 2 and 9');
    fireEvent.change(screen.getByLabelText(/^Alice's private a/), {
      target: { value: '3' },
    });
    next();
    expect(screen.getByRole('status')).toHaveTextContent('a = 3');
  });

  it('pours two pots into a bowl and blends them, one step at a time', async () => {
    const { container } = await renderLoaded();
    steps(3);
    // Alice's mix: the common pot and her secret fly in from the lanes, then blend.
    const mix = await screen.findByTestId('dh-paint-mix');
    expect(mix.querySelectorAll('[data-travel]')).toHaveLength(2);
    const blend = mix.querySelector<HTMLElement>('[data-blend]');
    expect(blend?.style.animation).toContain('cv-fade');
    expect(
      screen.getByText(/In the pot: 1 part Alice’s secret \+ 1 part common/),
    ).toBeInTheDocument();
    // The mixture crosses the channel: it flies from Alice's lane to the public one.
    steps(2);
    const sent = container.querySelector('[data-lane="public"] [data-travel-from]');
    expect(sent?.getAttribute('data-travel-from')).toMatch(/^dh-alice-/);
    expect(
      document.getElementById(sent!.getAttribute('data-travel-from')!),
    ).not.toBeNull();
  });

  it('shows every end state at once under reduced motion', async () => {
    const restore = reduceMotion();
    try {
      await renderLoaded();
      steps(3);
      const mix = await screen.findByTestId('dh-paint-mix');
      expect(mix.querySelector('[data-blend]')).toBeNull();
      expect(mix.querySelector('[data-travel]')).toBeNull();
      // The mixed pot is painted in core's colour from the first frame.
      expect(mix.querySelectorAll('[data-pot]')).toHaveLength(3);
      steps(6);
      expect(screen.getByTestId('dh-paint-same')).toHaveTextContent('The same colour');
      const stage = screen.getByRole('region', { name: 'Visualization' });
      expect(stage.querySelector('.tick-draw')).toBeNull();
      expect(stage.querySelector('[class*="motion-"]')).toBeNull();
      expect(stage.querySelector('[class*="starting:"]')).toBeNull();
      expect(stage.querySelector('[data-pulse]')).toBeNull();
    } finally {
      restore();
    }
  });

  it('draws the shared pots facing each other with a check that draws', async () => {
    await renderLoaded();
    steps(9);
    const stage = screen.getByRole('region', { name: 'Visualization' });
    expect(screen.getByTestId('dh-paint-same')).toHaveTextContent('The same colour');
    expect(stage.querySelector('.tick-draw')).not.toBeNull();
    expect(screen.getByText(/Both pots: 1 part Alice’s secret/)).toBeInTheDocument();
    // Both final pots glow in the lanes at the same moment.
    expect(stage.querySelectorAll('[data-pulse]').length).toBeGreaterThanOrEqual(2);
    next();
    // Eve's lane slides in, and her recipe has two parts common.
    expect(screen.getByRole('list', { name: 'Eve holds' })).toBeInTheDocument();
    expect(
      screen.getByText(
        /Eve’s pot: 1 part Alice’s secret \+ 1 part Bob’s secret \+ 2 parts common/,
      ),
    ).toBeInTheDocument();
  });

  it('keeps the lesson paragraph for the current phase marked', async () => {
    await renderLoaded(
      <Chapter id="paint">
        <Phase id="pots">Pots prose</Phase>
        <Phase id="mix">Mix prose</Phase>
      </Chapter>,
    );
    const current = () =>
      screen
        .getByRole('complementary', { name: 'Lesson' })
        .querySelector('[aria-current="step"]');
    expect(current()).toHaveTextContent('Pots prose');
    steps(3);
    expect(current()).toHaveTextContent('Mix prose');
  });

  it('gives each of Mallory’s secret pairs its own colour and glyph', async () => {
    const { container } = await renderLoaded();
    chapter('Man in the middle');
    expect(screen.getByText('Mallory cuts the channel in two')).toBeInTheDocument();
    steps(11);
    expect(screen.getByRole('list', { name: 'Alice holds' })).toHaveTextContent(
      '(pair 1)',
    );
    expect(screen.getByRole('list', { name: 'Bob holds' })).toHaveTextContent('(pair 2)');
    expect(screen.getByTestId('dh-mitm-alice')).toHaveClass('border-diff-off');
    expect(screen.getByTestId('dh-mitm-bob')).toHaveClass('border-diff-on');
    // The caught share flew to Mallory from Alice's lane.
    expect(
      container.querySelectorAll('[data-lane="malloryA"] li').length,
    ).toBeGreaterThan(0);
  });

  it('is axe clean in every chapter', async () => {
    const { container } = await renderLoaded();
    for (const name of ['Paint', 'The exchange', 'Eve listens', 'Man in the middle']) {
      chapter(name);
      next();
      await expectNoAxeViolations(container);
      end();
      await expectNoAxeViolations(container);
    }
    fireEvent.click(screen.getByRole('button', { name: 'Free play' }));
    await expectNoAxeViolations(container);
    // Axe over every chapter is slow on a loaded machine; the checks are unchanged.
  }, 90_000);
});
