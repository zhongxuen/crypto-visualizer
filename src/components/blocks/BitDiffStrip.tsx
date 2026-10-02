import { memo } from 'react';

import { cn } from '@/lib/cn';

/**
 * Two byte arrays compared bit by bit. A flipped bit is a **filled** orange square, an
 * unchanged one a **hollow** blue outline: shape and colour both carry the difference,
 * so it reads under any colour-vision deficiency. The count and percentage are printed.
 *
 * Bits are numbered left to right, most significant bit of byte 0 first, as
 * `bitDiff` in `src/core/bytes/bits.ts` numbers them.
 */

export interface BitDiffStripProps {
  a: ArrayLike<number>;
  b: ArrayLike<number>;
  label: string;
  /** Print the bit of `b` inside each square. */
  showDigits?: boolean;
  /** Bits per row. Default 64. */
  perRow?: number;
  className?: string;
}

export function diffBits(
  a: ArrayLike<number>,
  b: ArrayLike<number>,
): { bits: { value: number; flipped: boolean }[]; flipped: number } {
  if (a.length !== b.length) {
    throw new RangeError(
      `BitDiffStrip needs equal lengths, got ${a.length} and ${b.length}`,
    );
  }
  const bits: { value: number; flipped: boolean }[] = [];
  let flipped = 0;
  for (let i = 0; i < a.length; i += 1) {
    for (let bit = 7; bit >= 0; bit -= 1) {
      const x = (a[i] >> bit) & 1;
      const y = (b[i] >> bit) & 1;
      if (x !== y) flipped += 1;
      bits.push({ value: y, flipped: x !== y });
    }
  }
  return { bits, flipped };
}

export const BitDiffStrip = memo(function BitDiffStrip({
  a,
  b,
  label,
  showDigits = false,
  perRow = 64,
  className,
}: BitDiffStripProps) {
  const { bits, flipped } = diffBits(a, b);
  const total = bits.length;
  const percent = total === 0 ? 0 : (flipped / total) * 100;
  const summary = `${flipped} of ${total} bits differ (${percent.toFixed(1)}%)`;
  const rows: (typeof bits)[] = [];
  for (let i = 0; i < bits.length; i += perRow) rows.push(bits.slice(i, i + perRow));

  return (
    <figure className={cn('flex flex-col gap-2', className)}>
      <figcaption className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
        <span className="font-medium">{label}</span>
        <span className="font-mono" data-testid="bit-diff-summary">
          {summary}
        </span>
      </figcaption>
      <div
        role="img"
        aria-label={`${label}: ${summary}`}
        className="flex flex-col gap-0.5"
      >
        {rows.map((row, r) => (
          <div key={r} className="flex flex-wrap gap-px">
            {row.map((bit, i) => (
              <span
                key={i}
                data-flipped={bit.flipped || undefined}
                className={cn(
                  'inline-flex items-center justify-center rounded-[2px] font-mono',
                  showDigits ? 'size-4 text-[0.6rem]' : 'size-2.5 leading-none',
                  (r * perRow + i) % 8 === 0 && i !== 0 && 'ml-0.5',
                  bit.flipped
                    ? 'bg-diff-on text-diff-on-fg'
                    : 'border-diff-off text-fg-muted border',
                )}
              >
                {showDigits ? bit.value : null}
              </span>
            ))}
          </div>
        ))}
      </div>
      <p className="text-fg-muted flex flex-wrap gap-4 text-xs" aria-hidden="true">
        <span className="inline-flex items-center gap-1">
          <span className="bg-diff-on inline-block size-2.5 rounded-[2px]" /> flipped
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="border-diff-off inline-block size-2.5 rounded-[2px] border" />{' '}
          same
        </span>
      </p>
    </figure>
  );
});
