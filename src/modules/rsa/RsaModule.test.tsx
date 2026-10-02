import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { expectNoAxeViolations } from '@/components/testing/axe';

import { RsaModule } from './RsaModule';

/**
 * Renders the page and waits for what it loads after hydration: the other chapters' runs
 * and views, their citations and free play's inputs (`./runs`, `useDeferredImport`).
 */
async function renderLoaded() {
  const rendered = render(<RsaModule />);
  await act(async () => {
    await import('./runs');
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

/** Anything mid-animation: a motion class or a pulse. */
const MOVING =
  '.motion-reveal, .motion-wave, .motion-pulse, .motion-flip-card, .motion-move, [data-pulse]';

const next = () => act(() => fireEvent.keyDown(window, { key: 'ArrowRight' }));
const back = () => act(() => fireEvent.keyDown(window, { key: 'ArrowLeft' }));
const end = () => act(() => fireEvent.keyDown(window, { key: 'End' }));

// Each test waits for code the page loads after hydration; under a loaded parallel run
// (`npm run verify` with coverage) that can pass the 5 s default.
describe('RsaModule', { timeout: 20_000 }, () => {
  let restore: (() => void) | null = null;
  beforeEach(() => {
    localStorage.clear();
    window.history.replaceState(null, '', '/rsa');
  });
  afterEach(() => {
    restore?.();
    restore = null;
  });

  it('fills the formula panel as the key is made, ending on d = 2753', async () => {
    await renderLoaded();
    // Unknowns are dashed placeholders, not "?".
    const n = () => screen.getByTestId('rsa-formula-n').querySelector('dd')!;
    expect(n()).toHaveAttribute('data-state', 'pending');
    expect(n().querySelector('[data-placeholder]')).toHaveTextContent('not yet');
    next();
    next();
    expect(n()).toHaveAttribute('data-state', 'known');
    expect(n().querySelector('[data-placeholder]')).toBeNull();
    // The digits flip in from 0; the text is the final value, once.
    expect(screen.getByTestId('rsa-formula-n').querySelector('dd')).toHaveTextContent(
      /^61 × 53 = 3233$/,
    );
    expect(
      screen.getByTestId('rsa-formula-n').querySelector('.motion-flip-card'),
    ).not.toBeNull();
    expect(screen.getByTestId('rsa-formula-n')).toHaveAttribute('data-fresh', 'true');
    end();
    expect(screen.getByTestId('rsa-formula-d')).toHaveTextContent('2753');
  });

  it('ticks off the trial divisors of p up to √p, then stamps it prime', async () => {
    await renderLoaded();
    const trial = screen.getByTestId('rsa-trial');
    const divisors = [...trial.querySelectorAll('[data-divisor]')].map((el) =>
      el.getAttribute('data-divisor'),
    );
    expect(divisors).toEqual(['2', '3', '5', '7']);
    expect(trial).toHaveTextContent('None of 2, 3, 5 or 7 divides 61, so it is prime.');
    expect(screen.getByTestId('rsa-prime-stamp')).toHaveTextContent('prime');
  });

  it('shows values on read-only cards marked secret or public, not inputs', async () => {
    await renderLoaded();
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.getByText('p (6 bits)').closest('div')).toHaveTextContent('secret');
    next();
    next();
    expect(screen.getByText('n = p × q (12 bits)').closest('div')).toHaveTextContent(
      'public',
    );
  });

  it('writes the extended Euclid table row by row, marking the rows it comes from', async () => {
    await renderLoaded();
    for (let i = 0; i < 7; i += 1) next();
    const table = screen.getByRole('region', { name: 'Extended Euclid table' });
    // Rows 0 to 2 so far: the header plus three.
    const rows = within(table).getAllByRole('row');
    expect(rows).toHaveLength(4);
    expect(rows[3]).toHaveTextContent('-183');
    expect(rows[3]).toHaveAttribute('aria-current', 'step');
    // The new row slides in on a single step.
    expect(rows[3]).toHaveClass('motion-reveal');
    expect(rows[1]).toHaveAttribute('data-source', 'two-above');
    expect(rows[2]).toHaveAttribute('data-source', 'above');
    expect(screen.getByTestId('rsa-egcd-source')).toHaveTextContent(
      'Row 2 = row 0 − 183 × row 1: r = 3120 − 183 × 17 = 9',
    );
  });

  it('encrypts 65 to 2790 on the square-and-multiply ladder', async () => {
    await renderLoaded();
    chapter('Encrypt');
    next();
    next();
    expect(screen.getByRole('status')).toHaveTextContent('Bit 1 of 5 is 1');
    expect(
      screen.getByRole('img', { name: /Running value: 1 → 65 \(mod 3233\)/ }),
    ).toBeInTheDocument();
    // One rung per bit of e = 10001: the first lit, the rest dashed.
    const ladder = screen.getByRole('region', { name: /Square-and-multiply ladder/ });
    const rungs = () => ladder.querySelectorAll('[data-rung]');
    expect(rungs()).toHaveLength(5);
    expect(rungs()[0]).toHaveAttribute('data-state', 'current');
    expect(rungs()[0]).toHaveTextContent('1² = 1');
    expect(rungs()[0]).toHaveTextContent('= 65');
    expect(rungs()[1]).toHaveAttribute('data-state', 'todo');
    expect(rungs()[1].querySelector('[data-placeholder]')).not.toBeNull();
    next();
    expect(rungs()[0]).toHaveAttribute('data-state', 'done');
    expect(rungs()[1]).toHaveTextContent('bit 0: no multiply');
    for (let i = 0; i < 4; i += 1) next();
    expect(screen.getByTestId('rsa-encrypt-result')).toHaveTextContent('2790');
  });

  it('sends the hash to the private key and back, and verification lights green', async () => {
    await renderLoaded();
    chapter('Sign');
    next(); // the hash
    next(); // the first bit of signing
    const sign = screen.getByTestId('rsa-trip-sign');
    expect(sign).toHaveTextContent('private key d');
    expect(sign.querySelector('[data-placeholder]')).not.toBeNull();
    end();
    back(); // the last step is the changed message; one back is the verification
    expect(screen.getByTestId('rsa-trip-verify')).toHaveTextContent('public key e');
    expect(screen.getByTestId('rsa-verify-check')).toHaveAttribute('data-ok', 'true');
  });

  it('gives prime feedback in free play and refuses a composite', async () => {
    await renderLoaded();
    fireEvent.click(screen.getByRole('button', { name: 'Free play' }));
    // Free play's form comes with `./runs`, so it can appear a moment later.
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

  it('morphs what the ciphertext decrypts to when the attacker multiplies it', async () => {
    await renderLoaded();
    chapter('Malleability');
    next(); // the sender's c
    const wire = () => screen.getByTestId('rsa-wire');
    expect(wire()).toHaveAttribute('data-forged', 'false');
    expect(wire()).toHaveTextContent('Decrypts to: m');
    expect(wire()).toHaveTextContent('65');
    next(); // 2ᵉ mod n
    next(); // the forgery
    expect(wire()).toHaveAttribute('data-forged', 'true');
    expect(wire()).toHaveTextContent('Decrypts to: 2 × m');
    expect(wire()).toHaveTextContent('130');
  });

  it('shows every end state at once under reduced motion', async () => {
    restore = reduceMotion();
    const { container } = await renderLoaded();
    for (let i = 0; i < 7; i += 1) next();
    expect(container.querySelectorAll(MOVING)).toHaveLength(0);
    expect(screen.getByTestId('rsa-egcd-source')).toBeInTheDocument();
    chapter('Encrypt');
    next();
    next();
    expect(container.querySelectorAll(MOVING)).toHaveLength(0);
    // No count-up: the running value is there in full, once.
    expect(screen.getByText('Running value (mod n)').closest('div')).toHaveTextContent(
      /^Running value \(mod n\)65$/,
    );
    chapter('Malleability');
    for (let i = 0; i < 3; i += 1) next();
    expect(container.querySelectorAll(MOVING)).toHaveLength(0);
    expect(screen.getByTestId('rsa-wire')).toHaveTextContent('130');
  });

  it('marks the lesson paragraph for the phase on screen', async () => {
    const { Phase, PhaseContext } = await import('./components/LessonPhase');
    render(
      <PhaseContext.Provider value="Primes">
        <Phase group="Primes">
          <p>About primes.</p>
        </Phase>
        <Phase group="Choose e">
          <p>About e.</p>
        </Phase>
      </PhaseContext.Provider>,
    );
    expect(screen.getByText('About primes.').parentElement).toHaveAttribute(
      'aria-current',
      'step',
    );
    expect(screen.getByText('About e.').parentElement).not.toHaveAttribute(
      'aria-current',
    );
  });

  it('turns a lesson word into the shared Term toggletip once it loads', async () => {
    const { LessonTerm } = await import('./components/LessonTerm');
    render(<LessonTerm id="phi">φ(n)</LessonTerm>);
    await act(async () => {
      await import('@/components/lesson/Term');
    });
    fireEvent.click(await screen.findByRole('button', { name: 'φ(n)' }));
    expect(screen.getByText(/Euler’s totient/)).toBeInTheDocument();
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
  }, 60_000);
});
