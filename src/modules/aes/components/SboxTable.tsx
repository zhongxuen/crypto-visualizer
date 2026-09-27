'use client';

import { memo } from 'react';

import { SBOX } from '@/core/aes/sbox';
import { cn } from '@/lib/cn';

import { hex2 } from './parts';

const NIBBLES = Array.from({ length: 16 }, (_, i) => i);

/**
 * The S-box as the 16×16 table FIPS 197 prints (Table 4): row = high nibble of the input,
 * column = low nibble. `SBOX` is computed in core from the field inverse and the affine
 * map, not pasted. `lookup` is the byte being looked up; `used` the other inputs this step.
 */
export const SboxTable = memo(function SboxTable({
  lookup,
  used,
}: {
  lookup: number;
  used: readonly number[];
}) {
  const usedSet = new Set(used);
  const row = lookup >> 4;
  const col = lookup & 0xf;
  return (
    <div
      className="max-w-full overflow-x-auto"
      tabIndex={0}
      role="region"
      aria-label="S-box table"
    >
      <table className="border-collapse font-mono text-[0.7rem] tabular-nums">
        <caption className="text-fg-muted mb-1 text-left text-xs">
          S-box: row {row.toString(16)} (high nibble), column {col.toString(16)} (low
          nibble) gives 0x{hex2(SBOX[lookup])}.
        </caption>
        <thead>
          <tr>
            <th scope="col" className="px-1">
              <span className="sr-only">high nibble</span>
            </th>
            {NIBBLES.map((c) => (
              <th
                key={c}
                scope="col"
                className={cn('text-fg-muted px-1', c === col && 'text-accent font-bold')}
              >
                {c.toString(16)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {NIBBLES.map((r) => (
            <tr key={r}>
              <th
                scope="row"
                className={cn('text-fg-muted px-1', r === row && 'text-accent font-bold')}
              >
                {r.toString(16)}
              </th>
              {NIBBLES.map((c) => {
                const input = (r << 4) | c;
                const isLookup = input === lookup;
                const isUsed = usedSet.has(input);
                return (
                  <td
                    key={c}
                    data-lookup={isLookup || undefined}
                    className={cn(
                      'border-border border px-1 text-center',
                      (r === row || c === col) && !isLookup && 'bg-surface-overlay',
                      isUsed && !isLookup && 'text-fg font-semibold underline',
                      !isUsed && !isLookup && 'text-fg-muted',
                      isLookup && 'ring-accent bg-highlight text-fg font-bold ring-2',
                    )}
                  >
                    {hex2(SBOX[input])}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
});
