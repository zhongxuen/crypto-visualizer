import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { CITATIONS } from '@/core/citations';

import { CitationLink } from '../inspector/CitationLink';
import { CitationsProvider } from '../inspector/CitationsContext';
import { StepInspector } from '../inspector/StepInspector';
import { expectNoAxeViolations } from '../testing/axe';
import { ModuleLayout } from './ModuleLayout';
import { ThemeToggle } from './ThemeToggle';

describe('ModuleLayout', () => {
  it('has the title, intro, disclaimer, mode switch and regions', () => {
    let mode = 'walkthrough';
    render(
      <ModuleLayout
        citations={CITATIONS}
        title="XOR"
        intro="One line."
        mode="walkthrough"
        onModeChange={(next) => (mode = next)}
        inspector={<p>inspector</p>}
        timeline={<p>timeline</p>}
      >
        <p>visual</p>
      </ModuleLayout>,
    );
    expect(screen.getByRole('heading', { level: 1, name: 'XOR' })).toBeInTheDocument();
    expect(screen.getByText('Built for teaching, not for security.')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Timeline' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Free play' }));
    expect(mode).toBe('free');
  });

  it('is axe clean', async () => {
    const { container } = render(
      <ModuleLayout
        citations={CITATIONS}
        title="XOR"
        intro="One line."
        mode="free"
        onModeChange={() => {}}
        timeline={<p>t</p>}
      >
        <p>visual</p>
      </ModuleLayout>,
    );
    await expectNoAxeViolations(container);
  });
});

describe('ThemeToggle', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  it('cycles system → light → dark and applies data-theme', () => {
    render(<ThemeToggle />);
    fireEvent.click(screen.getByRole('button', { name: /Theme: system/ }));
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    fireEvent.click(screen.getByRole('button', { name: /Theme: light/ }));
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    fireEvent.click(screen.getByRole('button', { name: /Theme: dark/ }));
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
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

  it('shows label, detail and source, and is axe clean', async () => {
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
    expect(screen.getByText('A label')).toBeInTheDocument();
    expect(screen.getByText('Some detail')).toBeInTheDocument();
    await expectNoAxeViolations(container);
  });

  it('handles no event', () => {
    render(<StepInspector event={undefined} />);
    expect(screen.getByText('Nothing selected.')).toBeInTheDocument();
  });
});
