import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';

import { MODULES } from '@/modules/registry';

import { expectNoAxeViolations } from '../testing/axe';
import { CompletionCard } from './CompletionCard';
import { GLOSSARY } from './glossary';
import { Term } from './Term';

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
afterEach(() => {
  restore?.();
  restore = null;
});

const LEARNED = ['One thing.', 'Another thing.', 'A third thing.'];

describe('CompletionCard (UIUX §2.1 P11)', () => {
  it('lists what was learned and links to the next module', async () => {
    const { container } = render(
      <CompletionCard slug="xor" learned={LEARNED}>
        Try your own messages in Free play.
      </CompletionCard>,
    );
    const card = screen.getByRole('region', { name: 'What you can now explain' });
    expect(card).toHaveTextContent('Module 01 complete');
    for (const line of LEARNED) expect(card).toHaveTextContent(line);
    expect(card).toHaveTextContent('Try your own messages in Free play.');

    const next = MODULES.find((m) => m.number === 2)!;
    expect(screen.getByRole('link', { name: new RegExp(next.title) })).toHaveAttribute(
      'href',
      next.route,
    );
    expect(screen.getByRole('link', { name: 'The learning path' })).toHaveAttribute(
      'href',
      '/learn',
    );
    await expectNoAxeViolations(container);
  });

  it('bursts twelve hex digits, hidden from assistive tech', () => {
    const { container } = render(<CompletionCard slug="aes" learned={LEARNED} />);
    const digits = container.querySelectorAll('.hex-confetti');
    expect(digits).toHaveLength(12);
    for (const digit of digits) expect(digit.textContent).toMatch(/^[0-9a-f]$/);
    expect(digits[0].closest('[aria-hidden="true"]')).not.toBeNull();
  });

  it('draws no burst under reduced motion, and the card says it all', () => {
    restore = reduceMotion();
    const { container } = render(<CompletionCard slug="aes" learned={LEARNED} />);
    expect(container.querySelectorAll('.hex-confetti')).toHaveLength(0);
    expect(screen.getByText('A third thing.')).toBeInTheDocument();
  });

  it('names a next module that is not built yet without linking to it', () => {
    const last = MODULES.filter((m) => m.status === 'ready').at(-1)!;
    const next = MODULES.find((m) => m.number === last.number + 1)!;
    expect(next.status).toBe('planned');
    render(<CompletionCard slug={last.slug} learned={LEARNED} />);
    expect(screen.getByText(/Next on the path/)).toHaveTextContent(next.title);
    expect(screen.queryByRole('link', { name: new RegExp(next.title) })).toBeNull();
  });
});

describe('Term', () => {
  it('links to its own entry on /glossary as well as its module', async () => {
    const user = userEvent.setup();
    render(
      <p>
        Text becomes <Term id="utf-8" /> bytes.
      </p>,
    );
    await user.click(screen.getByRole('button', { name: 'UTF-8' }));
    expect(await screen.findByText(GLOSSARY['utf-8'].definition)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Glossary' })).toHaveAttribute(
      'href',
      '/glossary#utf-8',
    );
    expect(screen.getByRole('link', { name: 'Learn more in module 1' })).toHaveAttribute(
      'href',
      '/xor',
    );
  });
});
