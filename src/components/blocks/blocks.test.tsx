import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { expectNoAxeViolations } from '../testing/axe';
import { BitDiffStrip, diffBits } from './BitDiffStrip';
import { ByteGrid, formatByte } from './ByteGrid';
import { HexBinToggle } from './HexBinToggle';
import { ModClock } from './ModClock';
import { NumberTrace } from './NumberTrace';

describe('ByteGrid', () => {
  it('names every cell by row, column and value', () => {
    render(<ByteGrid label="Bytes" bytes={[0x00, 0x5f, 0xff]} columns={2} />);
    expect(screen.getByRole('grid', { name: 'Bytes' })).toBeInTheDocument();
    expect(
      screen.getByRole('gridcell', { name: 'row 1, column 2, 0x5f' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('gridcell', { name: 'row 2, column 1, 0xff' }),
    ).toBeInTheDocument();
  });

  it('shows binary', () => {
    render(<ByteGrid label="Bytes" bytes={[0x41]} format="binary" />);
    expect(
      screen.getByRole('gridcell', { name: 'row 1, column 1, 01000001' }),
    ).toBeInTheDocument();
    expect(formatByte(5, 'binary')).toBe('00000101');
    expect(formatByte(5, 'hex')).toBe('05');
  });

  it('fills down the columns in column-major mode (AES state)', () => {
    const bytes = Array.from({ length: 16 }, (_, i) => i);
    render(<ByteGrid label="State" bytes={bytes} columnMajor />);
    // Byte 1 is row 2, column 1; byte 4 is row 1, column 2 (FIPS 197 §3.4).
    expect(
      screen.getByRole('gridcell', { name: 'row 2, column 1, 0x01' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('gridcell', { name: 'row 1, column 2, 0x04' }),
    ).toBeInTheDocument();
  });

  it('marks changed and highlighted cells in the name, not only by colour', () => {
    render(<ByteGrid label="Bytes" bytes={[1, 2]} changed={[1]} highlight={[0]} />);
    expect(
      screen.getByRole('gridcell', { name: 'row 1, column 1, 0x01, highlighted' }),
    ).toBeInTheDocument();
    const changed = screen.getByRole('gridcell', {
      name: 'row 1, column 2, 0x02, changed',
    });
    expect(changed.className).toContain('pattern-changed');
  });

  it('is one tab stop, moved with the arrow keys', () => {
    render(<ByteGrid label="Bytes" bytes={[1, 2, 3, 4]} columns={2} />);
    const cells = screen.getAllByRole('gridcell');
    expect(cells.map((cell) => cell.tabIndex)).toEqual([0, -1, -1, -1]);
    cells[0].focus();
    fireEvent.keyDown(cells[0], { key: 'ArrowRight' });
    expect(document.activeElement).toBe(cells[1]);
    fireEvent.keyDown(cells[1], { key: 'ArrowDown' });
    expect(document.activeElement).toBe(cells[3]);
    fireEvent.keyDown(cells[3], { key: 'Home' });
    expect(document.activeElement).toBe(cells[0]);
    fireEvent.keyDown(cells[0], { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(cells[0]);
  });

  it('handles no bytes', () => {
    render(<ByteGrid label="Empty" bytes={[]} />);
    expect(screen.getByText('(no bytes)')).toBeInTheDocument();
  });

  it('is axe clean', async () => {
    const { container } = render(
      <ByteGrid
        label="Bytes"
        bytes={[1, 2, 3]}
        rowLabels={['Plain']}
        caption={() => 'a'}
        changed={[2]}
      />,
    );
    await expectNoAxeViolations(container);
  });
});

describe('BitDiffStrip', () => {
  it('counts flipped bits', () => {
    expect(diffBits([0b1010_0000], [0b0010_0001]).flipped).toBe(2);
    render(<BitDiffStrip label="Diff" a={[0x00, 0xff]} b={[0x0f, 0xff]} />);
    expect(screen.getByTestId('bit-diff-summary')).toHaveTextContent(
      '4 of 16 bits differ (25.0%)',
    );
    expect(
      screen.getByRole('img', { name: /Diff: 4 of 16 bits differ/ }),
    ).toBeInTheDocument();
  });

  it('marks flipped bits by shape (filled) as well as colour', () => {
    const { container } = render(<BitDiffStrip label="Diff" a={[0x80]} b={[0x00]} />);
    const flipped = container.querySelectorAll('[data-flipped]');
    expect(flipped).toHaveLength(1);
    expect(flipped[0].className).toContain('bg-diff-on');
  });

  it('rejects arrays of different lengths', () => {
    expect(() => diffBits([1], [1, 2])).toThrow(RangeError);
  });

  it('is axe clean', async () => {
    const { container } = render(
      <BitDiffStrip label="Diff" a={[1, 2]} b={[3, 4]} showDigits />,
    );
    await expectNoAxeViolations(container);
  });
});

describe('ModClock', () => {
  it('describes the move', () => {
    render(<ModClock label="Clock" modulus={12} value={15} from={9} />);
    expect(
      screen.getByRole('img', { name: 'Clock: 9 → 3 (mod 12)' }),
    ).toBeInTheDocument();
    expect(screen.getByText('11')).toBeInTheDocument();
  });

  it('hides position numbers above 60 and becomes a number line above 120', () => {
    const { unmount } = render(<ModClock label="Clock" modulus={100} value={5} />);
    expect(screen.queryByText('99')).not.toBeInTheDocument();
    unmount();
    render(<ModClock label="Line" modulus={10_007n} value={42n} />);
    expect(screen.getByRole('img', { name: 'Line: 42 (mod 10007)' })).toBeInTheDocument();
    expect(screen.getByText('10006')).toBeInTheDocument();
  });

  it('rejects a non-positive modulus', () => {
    expect(() => render(<ModClock label="x" modulus={0} value={0} />)).toThrow(
      RangeError,
    );
  });

  it('is axe clean', async () => {
    const { container } = render(
      <ModClock label="Clock" modulus={23} value={5} from={1} />,
    );
    await expectNoAxeViolations(container);
  });
});

describe('NumberTrace', () => {
  const columns = [
    { key: 'a', label: 'A' },
    { key: 'b', label: 'B', numeric: false },
  ];
  const rows = [
    { a: 1, b: 'x' },
    { a: 2, b: 'y' },
    { a: 3, b: 'z' },
  ];

  it('grows one row per step and marks the current row', () => {
    render(<NumberTrace caption="Trace" columns={columns} rows={rows} currentRow={1} />);
    const bodyRows = screen.getAllByRole('row').slice(1);
    expect(bodyRows).toHaveLength(2);
    expect(bodyRows[1]).toHaveAttribute('aria-current', 'step');
  });

  it('can show every row', () => {
    render(
      <NumberTrace
        caption="Trace"
        columns={columns}
        rows={rows}
        currentRow={0}
        showAll
      />,
    );
    expect(screen.getAllByRole('row')).toHaveLength(4);
  });

  it('is axe clean, including as a scroll region', async () => {
    const { container } = render(
      <NumberTrace
        caption="Trace"
        columns={columns}
        rows={rows}
        currentRow={2}
        maxHeight="10rem"
      />,
    );
    expect(screen.getByRole('region', { name: 'Trace' })).toHaveAttribute(
      'tabindex',
      '0',
    );
    await expectNoAxeViolations(container);
  });
});

describe('HexBinToggle', () => {
  it('reports the choice and marks it pressed', () => {
    let value: 'hex' | 'binary' = 'hex';
    const { rerender } = render(
      <HexBinToggle value={value} onChange={(v) => (value = v)} />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Binary' }));
    expect(value).toBe('binary');
    rerender(<HexBinToggle value={value} onChange={() => {}} />);
    expect(screen.getByRole('button', { name: 'Binary' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('is axe clean', async () => {
    const { container } = render(<HexBinToggle value="hex" onChange={() => {}} />);
    await expectNoAxeViolations(container);
  });
});
