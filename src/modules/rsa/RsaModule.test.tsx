import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { expectNoAxeViolations } from '@/components/testing/axe';

import { RsaModule } from './RsaModule';

/**
 * Renders the page and waits for what it loads after hydration: the other chapters' runs
 * (`useDeferredImport`) and free play's inputs (`next/dynamic`).
 */
async function renderLoaded() {
  const rendered = render(<RsaModule />);
  await act(async () => {
    await Promise.all([import('./runs'), import('./components/Inputs')]);
  });
  return rendered;
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

describe('RsaModule', () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.replaceState(null, '', '/rsa');
  });

  it('fills the formula panel as the key is made, ending on d = 2753', async () => {
    await renderLoaded();
    expect(screen.getByTestId('rsa-formula-n')).toHaveTextContent('?');
    next();
    next();
    expect(screen.getByTestId('rsa-formula-n')).toHaveTextContent('61 × 53 = 3233');
    end();
    expect(screen.getByTestId('rsa-formula-d')).toHaveTextContent('2753');
  });

  it('shows the extended Euclid table row by row', async () => {
    await renderLoaded();
    for (let i = 0; i < 7; i += 1) next();
    const table = screen.getByRole('region', { name: 'Extended Euclid table' });
    // Rows 0 to 2 so far: the header plus three.
    expect(within(table).getAllByRole('row')).toHaveLength(4);
    expect(within(table).getAllByRole('row')[3]).toHaveTextContent('-183');
  });

  it('encrypts 65 to 2790 with square-and-multiply', async () => {
    await renderLoaded();
    chapter('Encrypt');
    next();
    next();
    expect(screen.getByRole('status')).toHaveTextContent('Bit 1 of 5 is 1');
    expect(
      screen.getByRole('img', { name: /Running value: 1 → 65 \(mod 3233\)/ }),
    ).toBeInTheDocument();
    for (let i = 0; i < 5; i += 1) next();
    expect(screen.getByTestId('rsa-encrypt-result')).toHaveTextContent('2790');
  });

  it('gives prime feedback in free play and refuses a composite', async () => {
    await renderLoaded();
    fireEvent.click(screen.getByRole('button', { name: 'Free play' }));
    // Free play's form is behind `next/dynamic`, so it appears a moment later.
    fireEvent.change(await screen.findByLabelText(/^Prime p/), {
      target: { value: '91' },
    });
    expect(screen.getByTestId('rsa-p-feedback')).toHaveTextContent(
      'p = 91 is not prime: 7 × 13.',
    );
    fireEvent.change(screen.getByLabelText(/^Prime p/), { target: { value: '5' } });
    fireEvent.change(screen.getByLabelText(/^Prime q/), { target: { value: '11' } });
    expect(screen.getByTestId('rsa-q-feedback')).toHaveTextContent('11 is prime');
    // e = 17 is below φ = 40 and coprime to it, so the key works: n = 55.
    end();
    expect(screen.getByRole('status')).toHaveTextContent('Public key (n, e) = (55, 17)');
  });

  it('shows the three actors in the malleability chapter', async () => {
    await renderLoaded();
    chapter('Malleability');
    for (let i = 0; i < 4; i += 1) next();
    const strip = screen.getByRole('list', { name: 'Sender, attacker and receiver' });
    expect(within(strip).getAllByRole('listitem')).toHaveLength(3);
    expect(screen.getByRole('status')).toHaveTextContent('130');
  });

  it('is axe clean in every chapter', async () => {
    const { container } = await renderLoaded();
    for (const name of ['Keys', 'Encrypt', 'Sign', 'Malleability']) {
      chapter(name);
      next();
      await expectNoAxeViolations(container);
    }
    fireEvent.click(screen.getByRole('button', { name: 'Free play' }));
    await expectNoAxeViolations(container);
  }, 30_000);
});
