'use client';

import { Travel, useStepTransition, Wave } from '@/components/motion';
import { cn } from '@/lib/cn';

/**
 * One byte of `a ⊕ b`, bit column by bit column (UIUX §7.2 module 1).
 *
 * The three rows stack like a sum. Wherever the key bit is 1 its cell is outlined in the
 * diff colour, and the result bit below it is filled: that bit flipped. The fill and the
 * outline are the end state, so the meaning never depends on the motion. On a single
 * step the result bits flip in one column after another (`<Wave>`); when unmasking, the
 * key row slides down onto the masked row first and the wave runs the other way, right
 * to left, undoing the flips.
 */

function bitsOf(byte: number): number[] {
  return Array.from({ length: 8 }, (_, i) => (byte >> (7 - i)) & 1);
}

const CELL =
  'rounded-cell inline-flex size-7 shrink-0 items-center justify-center font-mono text-sm tabular-nums sm:size-9 sm:text-lg';
const ROW = 'flex items-center gap-0.5 sm:gap-1';

export function BitColumns({
  a,
  b,
  out,
  names,
  undo,
  trigger,
  resultId,
  maskedId,
}: {
  a: number;
  b: number;
  /** `a ⊕ b`, as core computed it. */
  out: number;
  names: readonly [string, string, string];
  /** The unmasking pass: the same key comes back down and the flips reverse. */
  undo: boolean;
  trigger: string;
  /** The id of the result row, which the new byte flies out of onto the tape. */
  resultId: string;
  /** The id of the first row, which the key slides down from when unmasking. */
  maskedId: string;
}) {
  const { direction } = useStepTransition();
  const aBits = bitsOf(a);
  const bBits = bitsOf(b);
  const outBits = bitsOf(out);
  const flipped = bBits.filter((bit) => bit === 1).length;
  // The wave runs left to right when masking, right to left when undoing; stepping back
  // plays it the other way again.
  const reverse = undo !== (direction === 'back');
  const order = reverse ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];

  const rowName = (text: string, sign: string) => (
    <span className="text-fg-muted w-20 shrink-0 truncate pr-1 text-right font-mono text-xs sm:w-28 sm:pr-2">
      {sign}
      {text}
    </span>
  );

  const keyRow = (
    <span className={ROW}>
      {rowName(names[1], '⊕ ')}
      {bBits.map((bit, i) => (
        <span
          key={i}
          data-key-bit={bit}
          className={cn(
            CELL,
            bit === 1
              ? 'border-diff-on text-fg border-2 font-bold'
              : 'border-border text-fg-muted border',
          )}
        >
          {bit}
        </span>
      ))}
    </span>
  );

  return (
    <figure className="flex flex-col gap-2">
      <figcaption className="text-fg-muted text-xs font-medium tracking-wide uppercase">
        This byte, bit by bit
      </figcaption>
      <div
        role="img"
        aria-label={`${names[0]} ${aBits.join('')} XOR ${names[1]} ${bBits.join('')} = ${names[2]} ${outBits.join('')}. ${flipped} of 8 bits flipped, wherever the ${names[1]} bit is 1.`}
        className="flex min-w-0 flex-col gap-1"
      >
        <span id={maskedId} className={ROW}>
          {rowName(names[0], '')}
          {aBits.map((bit, i) => (
            <span key={i} className={cn(CELL, 'border-border bg-surface border')}>
              {bit}
            </span>
          ))}
        </span>
        {undo && direction === 'forward' ? (
          <Travel from={maskedId} trigger={trigger}>
            {keyRow}
          </Travel>
        ) : (
          keyRow
        )}
        <span id={resultId} className={ROW}>
          {rowName(names[2], '= ')}
          <Wave
            trigger={trigger}
            stagger={18}
            className={cn(
              'border-border-strong flex gap-0.5 border-t-2 pt-1 sm:gap-1',
              reverse && 'flex-row-reverse',
            )}
          >
            {order.map((i) => (
              <span
                key={i}
                data-flipped={bBits[i] === 1 || undefined}
                className={cn(
                  CELL,
                  bBits[i] === 1
                    ? 'bg-diff-on text-diff-on-fg font-bold'
                    : 'border-diff-off text-fg border',
                )}
              >
                {outBits[i]}
              </span>
            ))}
          </Wave>
        </span>
      </div>
      <p className="text-fg-secondary text-sm">
        <strong className="font-semibold">{flipped} of 8</strong> bits flipped: the filled
        ones, under every 1 in the {names[1]}.
      </p>
    </figure>
  );
}
