import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { expectNoAxeViolations } from '@/components/testing/axe';

import { DhModule } from './DhModule';

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
async function renderLoaded() {
  const rendered = render(<DhModule />);
  await act(async () => {
    await Promise.all([
      import('./runs'),
      import('./components/EveView'),
      import('./components/Inputs'),
      import('./components/PowView'),
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
  }, 30_000);
});
