import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CITATIONS } from '@/core/citations';

import { CitationLink } from '../inspector/CitationLink';
import { CitationsProvider } from '../inspector/CitationsContext';
import { StepInspector } from '../inspector/StepInspector';
import { Term } from '../lesson/Term';
import { expectNoAxeViolations } from '../testing/axe';
import {
  DISCLAIMER_SEEN_KEY,
  DisclaimerBanner,
  resetDisclaimerVisit,
} from './DisclaimerBanner';
import { Disclosure } from './Menus';
import { ModuleLayout } from './ModuleLayout';
import { BrandMark, SiteHeader } from './SiteHeader';
import { ThemeToggle } from './ThemeToggle';

vi.mock('next/navigation', () => ({ usePathname: () => '/xor' }));

function Layout(props: Partial<React.ComponentProps<typeof ModuleLayout>>) {
  return (
    <ModuleLayout
      citations={CITATIONS}
      title="XOR"
      intro="One line."
      slug="xor"
      mode="walkthrough"
      onModeChange={() => {}}
      chapters={<nav aria-label="Chapters">tabs</nav>}
      tools={<p>tools</p>}
      lesson={<p>The lesson prose.</p>}
      inspector={<p>inspector</p>}
      timeline={<p>timeline</p>}
      share={{ ready: true, link: () => null }}
      {...props}
    >
      <p>visual</p>
    </ModuleLayout>
  );
}

describe('ModuleLayout', () => {
  beforeEach(() => {
    localStorage.clear();
    resetDisclaimerVisit();
  });

  it('has the module number, title, chapters, mode switch, disclaimer and regions', () => {
    let mode = 'walkthrough';
    render(<Layout onModeChange={(next) => (mode = next)} />);
    expect(screen.getByRole('heading', { level: 1, name: 'XOR' })).toBeInTheDocument();
    expect(screen.getByText('Module 01')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Chapters' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Visualization' })).toHaveTextContent(
      'visual',
    );
    expect(screen.getByRole('complementary', { name: 'Lesson' })).toHaveTextContent(
      'The lesson prose.',
    );
    expect(screen.getByRole('region', { name: 'Timeline' })).toBeInTheDocument();
    expect(screen.getByText('Built for teaching, not for security.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Free play' }));
    expect(mode).toBe('free');
  });

  it('marks the page ready for e2e once the share state is read', () => {
    const { container, rerender } = render(
      <Layout share={{ ready: false, link: () => null }} />,
    );
    expect(container.querySelector('[data-share-ready="false"]')).not.toBeNull();
    rerender(<Layout />);
    expect(container.querySelector('[data-share-ready="true"]')).not.toBeNull();
  });

  it('puts display options behind "More options"', () => {
    render(<Layout />);
    expect(screen.queryByText('tools')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'More options' }));
    expect(screen.getByText('tools')).toBeInTheDocument();
  });

  it('opens the lesson sheet from its peek (below lg)', () => {
    render(<Layout />);
    const peek = screen.getByRole('button', { name: 'Lesson, why and phases' });
    expect(peek).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(peek);
    expect(peek).toHaveAttribute('aria-expanded', 'true');
  });

  it('keeps the lesson in free play, folded, with the inputs above the visual (P8)', () => {
    render(<Layout mode="free" controls={<label>Your text</label>} />);
    expect(screen.getByRole('region', { name: 'Your input' })).toHaveTextContent(
      'Your text',
    );
    expect(
      screen.getByText('The lesson for this chapter').closest('details'),
    ).not.toHaveAttribute('open');
    expect(screen.getByText('The lesson prose.')).toBeInTheDocument();
  });

  it('is axe clean, in both modes', async () => {
    const { container, rerender } = render(<Layout />);
    await expectNoAxeViolations(container);
    rerender(<Layout mode="free" controls={<p>inputs</p>} />);
    await expectNoAxeViolations(container);
  });
});

describe('DisclaimerBanner', () => {
  beforeEach(() => {
    localStorage.clear();
    resetDisclaimerVisit();
  });

  it('opens by itself on the first visit and remembers only that it was seen', () => {
    render(<DisclaimerBanner />);
    const chip = screen.getByRole('button', { name: 'For learning only' });
    expect(chip).toHaveAttribute('aria-expanded', 'true');
    expect(localStorage.getItem(DISCLAIMER_SEEN_KEY)).toBe('1');
    expect(localStorage.length).toBe(1);
    fireEvent.click(chip);
    expect(chip).toHaveAttribute('aria-expanded', 'false');
  });

  it('stays closed after the first visit, and still opens on request', () => {
    localStorage.setItem(DISCLAIMER_SEEN_KEY, '1');
    render(<DisclaimerBanner />);
    const chip = screen.getByRole('button', { name: 'For learning only' });
    expect(chip).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(chip);
    expect(chip).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('link', { name: 'What this means' })).toHaveAttribute(
      'href',
      '/about',
    );
  });

  it('survives blocked storage', () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    render(<DisclaimerBanner />);
    expect(screen.getByRole('button', { name: 'For learning only' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    spy.mockRestore();
  });
});

describe('ThemeToggle', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  it('is a labelled Light / System / Dark choice that applies data-theme', () => {
    render(<ThemeToggle />);
    const group = screen.getByRole('group', { name: 'Theme' });
    expect(within(group).getByRole('button', { name: 'System' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    fireEvent.click(within(group).getByRole('button', { name: 'Dark' }));
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(within(group).getByRole('button', { name: 'Dark' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    fireEvent.click(within(group).getByRole('button', { name: 'Light' }));
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    fireEvent.click(within(group).getByRole('button', { name: 'System' }));
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
  });

  it('crossfades through a view transition when the browser has one', () => {
    const start = vi.fn((update: () => void) => update());
    Object.assign(document, { startViewTransition: start });
    render(<ThemeToggle />);
    fireEvent.click(screen.getByRole('button', { name: 'Dark' }));
    expect(start).toHaveBeenCalledOnce();
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    delete (document as { startViewTransition?: unknown }).startViewTransition;
  });
});

describe('SiteHeader', () => {
  beforeEach(() => localStorage.clear());

  it('lists the modules with a tick for each finished one', () => {
    localStorage.setItem(
      'cv:v1',
      JSON.stringify({
        v: 1,
        completed: ['xor'],
        prefs: { theme: 'system', bytes: 'hex' },
      }),
    );
    render(<SiteHeader />);
    fireEvent.click(screen.getByRole('button', { name: 'Modules' }));
    const nav = screen.getByRole('navigation', { name: 'Modules' });
    const xor = within(nav).getByRole('link', { name: /Bits, bytes and XOR/ });
    expect(xor).toHaveAttribute('aria-current', 'page');
    expect(xor).toHaveTextContent('(finished)');
    expect(
      within(nav).getByRole('link', { name: /^06 Diffie-Hellman$/ }),
    ).toBeInTheDocument();
    // A planned module is listed, but isn't a link.
    expect(within(nav).getByText('Coming next')).toBeInTheDocument();
  });

  it('closes a menu on Escape and hands focus back', () => {
    render(<SiteHeader />);
    const button = screen.getByRole('button', { name: 'Modules' });
    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(button).toHaveFocus();
  });

  it('puts everything in one menu sheet on a phone', () => {
    render(<SiteHeader />);
    fireEvent.click(screen.getByRole('button', { name: 'Menu' }));
    expect(screen.getByRole('navigation', { name: 'Modules' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Theme' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'About and accuracy' })).toBeInTheDocument();
  });

  it('is axe clean, open and closed', async () => {
    const { container } = render(<SiteHeader />);
    await expectNoAxeViolations(container);
    fireEvent.click(screen.getByRole('button', { name: 'Theme' }));
    await expectNoAxeViolations(container);
    expect(render(<BrandMark />).container.querySelector('svg')).toHaveAttribute(
      'aria-hidden',
      'true',
    );
  });
});

describe('Disclosure', () => {
  it('closes on a press outside', () => {
    render(
      <>
        <Disclosure label="Open me">{() => <p>inside</p>}</Disclosure>
        <p>outside</p>
      </>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Open me' }));
    expect(screen.getByText('inside')).toBeInTheDocument();
    fireEvent.pointerDown(screen.getByText('inside'));
    expect(screen.getByText('inside')).toBeInTheDocument();
    fireEvent.pointerDown(screen.getByText('outside'));
    expect(screen.queryByText('inside')).not.toBeInTheDocument();
  });
});

describe('Term', () => {
  it('shows the definition and where to learn more, and closes on Escape', async () => {
    const { container } = render(
      <p>
        Text is stored as <Term id="utf-8" /> bytes.
      </p>,
    );
    const term = screen.getByRole('button', { name: 'UTF-8' });
    expect(term).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(term);
    expect(term).toHaveAttribute('aria-expanded', 'true');
    // The definitions load just after hydration.
    expect(
      await screen.findByText(/The rule that turns text into bytes/),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Learn more in module 1' })).toHaveAttribute(
      'href',
      '/xor',
    );
    await expectNoAxeViolations(container);
    fireEvent.keyDown(term, { key: 'Escape' });
    expect(term).toHaveAttribute('aria-expanded', 'false');
  });

  it('keeps the module’s own wording, and closes when focus leaves', () => {
    render(
      <>
        <Term id="phi">Euler’s φ</Term>
        <button type="button">elsewhere</button>
      </>,
    );
    const term = screen.getByRole('button', { name: 'Euler’s φ' });
    fireEvent.click(term);
    act(() => {
      fireEvent.blur(term, {
        relatedTarget: screen.getByRole('button', { name: 'elsewhere' }),
      });
    });
    expect(term).toHaveAttribute('aria-expanded', 'false');
  });
});

describe('StepInspector and CitationLink', () => {
  it('links to the cited section, from the registry its page provides', () => {
    render(
      <CitationsProvider citations={CITATIONS}>
        <CitationLink id="rfc3629.3" />
      </CitationsProvider>,
    );
    const link = screen.getByRole('link', { name: /RFC 3629 §3: UTF-8 definition/ });
    expect(link).toHaveAttribute(
      'href',
      'https://www.rfc-editor.org/rfc/rfc3629#section-3',
    );
  });

  it('shows text, not a link, when the page provides no registry', () => {
    render(<CitationLink id="rfc3629.3" />);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByText('Source: rfc3629.3')).toBeInTheDocument();
  });

  it('shows an unknown id as text, not a link', () => {
    render(<CitationLink id="nope.1" />);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByText('Source: nope.1')).toBeInTheDocument();
  });

  it('is the "Why?" card: detail and source, without repeating the headline (P4)', async () => {
    const { container } = render(
      <StepInspector
        event={{
          id: 'x',
          label: 'A label',
          detail: 'Some detail',
          citation: 'rfc4648.8',
          group: 'G',
        }}
      />,
    );
    expect(screen.getByRole('heading', { name: 'Why?' })).toBeInTheDocument();
    expect(screen.getByText('Some detail')).toBeInTheDocument();
    expect(screen.queryByText('A label')).not.toBeInTheDocument();
    await expectNoAxeViolations(container);
  });

  it('handles no event', () => {
    render(<StepInspector event={undefined} />);
    expect(screen.getByText('Nothing selected.')).toBeInTheDocument();
  });
});
