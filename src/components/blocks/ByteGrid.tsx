'use client';

import { memo, useRef, useState, type KeyboardEvent } from 'react';

import { cn } from '@/lib/cn';

/**
 * A grid of bytes, as hex or binary.
 *
 * - `highlight`: cells to draw attention to (the byte this step is about).
 * - `changed`: cells that changed since the last step, marked by colour **and** a
 *   hatched background, so the mark survives colour blindness.
 * - `columnMajor`: fill down the columns, as AES lays out its 4×4 state (FIPS 197 §3.4).
 *
 * Keyboard: the grid is one tab stop; the arrow keys, Home and End move between cells
 * (a roving tabindex). Each cell has a name like "row 2, column 3, 0x5f". The playback
 * shortcuts leave the arrows to the grid while it has focus (`data-own-arrows`).
 */

export type ByteFormat = 'hex' | 'binary';

export interface ByteGridProps {
  bytes: ArrayLike<number>;
  /** Accessible name for the grid, e.g. "Plaintext". */
  label: string;
  format?: ByteFormat;
  /** Cells per row. Default 16 (hex) or 8 (binary). Ignored in column-major mode. */
  columns?: number;
  /** Lay bytes out down the columns of a `rows`-row grid (AES state). */
  columnMajor?: boolean;
  /** Rows in column-major mode. Default 4. */
  rows?: number;
  highlight?: Iterable<number>;
  changed?: Iterable<number>;
  /** A small caption under a cell, e.g. the character a byte encodes. */
  caption?: (index: number) => string | undefined;
  /** Shown before each row. */
  rowLabels?: readonly string[];
  className?: string;
}

export function formatByte(byte: number, format: ByteFormat): string {
  return format === 'hex'
    ? byte.toString(16).padStart(2, '0')
    : byte.toString(2).padStart(8, '0');
}

export const ByteGrid = memo(function ByteGrid({
  bytes,
  label,
  format = 'hex',
  columns,
  columnMajor = false,
  rows: rowCount = 4,
  highlight,
  changed,
  caption,
  rowLabels,
  className,
}: ByteGridProps) {
  const count = bytes.length;
  const cols = columnMajor
    ? Math.max(1, Math.ceil(count / rowCount))
    : Math.max(1, columns ?? (format === 'hex' ? 16 : 8));
  const rowsTotal = columnMajor ? rowCount : Math.max(1, Math.ceil(count / cols));
  const highlighted = new Set(highlight ?? []);
  const changedSet = new Set(changed ?? []);

  /** Index into `bytes` for a (row, column) cell, or -1 past the end. */
  const indexAt = (row: number, col: number): number => {
    const index = columnMajor ? col * rowCount + row : row * cols + col;
    return index < count ? index : -1;
  };

  const [active, setActive] = useState(0);
  const activeIndex = Math.min(active, Math.max(0, count - 1));
  const cellRefs = useRef<(HTMLDivElement | null)[]>([]);

  const position = (index: number) =>
    columnMajor
      ? { row: index % rowCount, col: Math.floor(index / rowCount) }
      : { row: Math.floor(index / cols), col: index % cols };

  const focusIndex = (index: number) => {
    if (index < 0 || index >= count) return;
    setActive(index);
    cellRefs.current[index]?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const { row, col } = position(activeIndex);
    let target = -1;
    switch (event.key) {
      case 'ArrowRight':
        target = indexAt(row, col + 1);
        break;
      case 'ArrowLeft':
        target = col > 0 ? indexAt(row, col - 1) : -1;
        break;
      case 'ArrowDown':
        target = row + 1 < rowsTotal ? indexAt(row + 1, col) : -1;
        break;
      case 'ArrowUp':
        target = row > 0 ? indexAt(row - 1, col) : -1;
        break;
      case 'Home':
        target = 0;
        break;
      case 'End':
        target = count - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    focusIndex(target);
  };

  if (count === 0) {
    return (
      <p className={cn('text-fg-muted text-sm', className)}>
        {label}: <span className="font-mono">(no bytes)</span>
      </p>
    );
  }

  return (
    <div
      role="grid"
      aria-label={label}
      aria-rowcount={rowsTotal}
      aria-colcount={cols}
      data-own-arrows=""
      onKeyDown={onKeyDown}
      className={cn('flex flex-col gap-1 overflow-x-auto', className)}
    >
      {Array.from({ length: rowsTotal }, (_, row) => (
        <div role="row" key={row} className="flex items-start gap-1">
          {rowLabels?.[row] !== undefined ? (
            <span
              role="rowheader"
              className="text-fg-muted w-20 shrink-0 self-center text-right text-xs"
            >
              {rowLabels[row]}
            </span>
          ) : null}
          {Array.from({ length: cols }, (_, col) => {
            const index = indexAt(row, col);
            if (index < 0) return null;
            const byte = bytes[index];
            const text = formatByte(byte, format);
            const isChanged = changedSet.has(index);
            const isHighlighted = highlighted.has(index);
            const under = caption?.(index);
            return (
              <div
                role="gridcell"
                key={col}
                ref={(node) => {
                  cellRefs.current[index] = node;
                }}
                tabIndex={index === activeIndex ? 0 : -1}
                onFocus={() => setActive(index)}
                aria-label={`row ${row + 1}, column ${col + 1}, ${format === 'hex' ? `0x${text}` : text}${under ? `, ${under}` : ''}${isChanged ? ', changed' : ''}${isHighlighted ? ', highlighted' : ''}`}
                data-changed={isChanged || undefined}
                data-highlighted={isHighlighted || undefined}
                className={cn(
                  'focus-visible:outline-focus flex shrink-0 flex-col items-center rounded px-1 py-0.5 font-mono text-sm tabular-nums focus-visible:outline-2 focus-visible:outline-offset-1',
                  format === 'hex' ? 'min-w-8' : 'min-w-[5.5rem]',
                  isChanged
                    ? 'border-diff-on pattern-changed border-2'
                    : 'border-border border',
                  isHighlighted && 'ring-accent ring-2',
                  isHighlighted ? 'bg-highlight' : !isChanged && 'bg-surface',
                )}
              >
                <span aria-hidden="true">{text}</span>
                {under !== undefined ? (
                  <span
                    aria-hidden="true"
                    className="text-fg-muted text-[0.65rem] leading-tight"
                  >
                    {under}
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
});
