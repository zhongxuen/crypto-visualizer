import { memo, type ReactNode } from 'react';

import { cn } from '@/lib/cn';

/**
 * A table that grows one row per step, with the current row highlighted: extended
 * Euclid, square-and-multiply, the SHA-256 message schedule. Rows after `currentRow`
 * are not shown unless `showAll`, so the table is the trace so far.
 */

export interface NumberTraceColumn {
  key: string;
  label: string;
  /** Right-align numbers. Default true. */
  numeric?: boolean;
}

export interface NumberTraceProps {
  caption: string;
  columns: readonly NumberTraceColumn[];
  rows: readonly Record<string, ReactNode>[];
  /** Index of the row for this step, or -1 for none yet. */
  currentRow: number;
  /** Show rows after the current one too (dimmed). */
  showAll?: boolean;
  /** Cap the height and scroll. */
  maxHeight?: string;
  className?: string;
}

export const NumberTrace = memo(function NumberTrace({
  caption,
  columns,
  rows,
  currentRow,
  showAll = false,
  maxHeight,
  className,
}: NumberTraceProps) {
  const visible = showAll ? rows : rows.slice(0, Math.max(0, currentRow + 1));
  const scrolls = maxHeight !== undefined;

  return (
    <div
      className={cn('border-border overflow-auto rounded-md border', className)}
      style={scrolls ? { maxHeight } : undefined}
      // A scroll box needs a tab stop so it's reachable by keyboard.
      tabIndex={scrolls ? 0 : undefined}
      role={scrolls ? 'region' : undefined}
      aria-label={scrolls ? caption : undefined}
    >
      <table className="w-full border-collapse text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead className="bg-surface-overlay sticky top-0">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={cn(
                  'text-fg-secondary px-2 py-1 font-medium',
                  column.numeric === false ? 'text-left' : 'text-right',
                )}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {visible.map((row, index) => {
            const current = index === currentRow;
            return (
              <tr
                key={index}
                aria-current={current ? 'step' : undefined}
                className={cn(
                  'border-border border-t',
                  current && 'bg-highlight font-semibold',
                  index > currentRow && 'text-fg-muted',
                )}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={cn(
                      'px-2 py-0.5 font-mono tabular-nums',
                      column.numeric === false ? 'text-left' : 'text-right',
                    )}
                  >
                    {row[column.key]}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
      {visible.length === 0 ? (
        <p className="text-fg-muted px-2 py-1 text-sm">No rows yet.</p>
      ) : null}
    </div>
  );
});
