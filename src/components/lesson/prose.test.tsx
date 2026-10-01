import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { render, screen } from '@testing-library/react';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { useMDXComponents } from '@/mdx-components';

import { expectNoAxeViolations } from '../testing/axe';

/**
 * B1 (docs/UIUX.md §3): `.prose-cv` had no table styles, so a GFM table in a walkthrough
 * rendered with no cell padding and the columns ran together. This loads the real prose
 * rules from globals.css and checks the computed style of a table rendered the way MDX
 * renders one (through `useMDXComponents`, with GFM alignment as an inline style).
 */
function proseCss(): string {
  const css = readFileSync(join(process.cwd(), 'src/app/globals.css'), 'utf8');
  // From the prose section on: plain CSS that jsdom can parse (the Tailwind directives
  // above it aren't).
  return css.slice(css.indexOf('/* Prose inside MDX walkthroughs. */'));
}

function Table() {
  const { table: MdxTable } = useMDXComponents() as {
    table: (props: React.ComponentProps<'table'>) => React.ReactNode;
  };
  return (
    <div className="prose-cv">
      <MdxTable>
        <thead>
          <tr>
            <th style={{ textAlign: 'right' }}>r</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ textAlign: 'right' }}>3120</td>
          </tr>
          <tr>
            <td style={{ textAlign: 'right' }}>17</td>
          </tr>
        </tbody>
      </MdxTable>
    </div>
  );
}

describe('.prose-cv tables', () => {
  let style: HTMLStyleElement;
  beforeAll(() => {
    style = document.createElement('style');
    style.textContent = proseCss();
    document.head.append(style);
  });
  afterAll(() => style.remove());

  it('pads, rules and uses tabular figures in every cell', () => {
    render(<Table />);
    const table = screen.getByRole('table');
    expect(getComputedStyle(table).fontVariantNumeric).toBe('tabular-nums');
    expect(getComputedStyle(table).borderCollapse).toBe('collapse');
    for (const cell of [
      screen.getByRole('columnheader'),
      screen.getByRole('cell', { name: '3120' }),
    ]) {
      const computed = getComputedStyle(cell);
      expect(computed.paddingLeft).toBe('0.75rem');
      expect(computed.paddingRight).toBe('0.75rem');
      expect(computed.paddingTop).toBe('0.375rem');
      expect(computed.textAlign).toBe('right');
      expect(computed.borderBottomStyle).toBe('solid');
      expect(computed.borderBottomWidth).toBe('1px');
    }
    // The last row has no rule under it.
    const last = getComputedStyle(screen.getByRole('cell', { name: '17' }));
    expect(last.borderBottomStyle).toBe('none');
  });

  it('wraps the table in a focusable region that scrolls on small screens', async () => {
    const { container } = render(<Table />);
    const region = screen.getByRole('region', { name: 'Table' });
    expect(region).toHaveClass('table-scroll');
    expect(region).toHaveAttribute('tabindex', '0');
    expect(proseCss()).toMatch(
      /@media \(max-width: 639\.98px\) \{\s*\.prose-cv \.table-scroll \{\s*overflow-x: auto;/,
    );
    await expectNoAxeViolations(container);
  });
});
