'use client';

import { memo } from 'react';

import type { AesKeyWordEvent } from '@/core/aes/events';
import { cn } from '@/lib/cn';

import { hex32, Label } from './parts';

const ROUND_KEYS = Array.from({ length: 11 }, (_, r) => r);

function Equation({ terms }: { terms: [string, string][] }) {
  return (
    <dl className="grid w-fit grid-cols-[auto_auto] gap-x-4 gap-y-0.5 font-mono text-sm">
      {terms.map(([name, value]) => (
        <div key={name} className="contents">
          <dt className="text-fg-secondary">{name}</dt>
          <dd className="tabular-nums">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * The key schedule (FIPS 197 §5.2): the working for w[i], and all 44 words laid out as
 * the 11 round keys, filled in as far as this step.
 */
export const KeyScheduleView = memo(function KeyScheduleView({
  event,
}: {
  event: AesKeyWordEvent;
}) {
  const { i } = event;
  const terms: [string, string][] =
    i < 4
      ? [[`w${i} = key bytes ${4 * i}–${4 * i + 3}`, hex32(event.word)]]
      : event.rot !== undefined
        ? [
            [`temp = w${i - 1}`, hex32(event.temp)],
            ['RotWord(temp)', hex32(event.rot)],
            ['SubWord(…)', hex32(event.sub!)],
            [`⊕ Rcon[${i / 4}]`, hex32(event.rcon!)],
            ['= temp′', hex32(event.afterRcon!)],
            [`⊕ w${i - 4}`, hex32(event.back)],
            [`= w${i}`, hex32(event.word)],
          ]
        : [
            [`w${i - 4}`, hex32(event.back)],
            [`⊕ w${i - 1}`, hex32(event.temp)],
            [`= w${i}`, hex32(event.word)],
          ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <Label>Word w{i}</Label>
        <Equation terms={terms} />
        {event.rot !== undefined ? (
          <p className="text-fg-muted text-sm">
            The first word of each round key goes through RotWord (a one-byte rotation),
            SubWord (the S-box on each byte) and a round constant, so no two round keys
            are simple shifts of each other.
          </p>
        ) : null}
      </div>
      <div
        className="max-w-full overflow-x-auto"
        tabIndex={0}
        role="region"
        aria-label="Key schedule"
      >
        <table className="font-mono text-sm tabular-nums">
          <caption className="text-fg-muted mb-1 text-left text-xs">
            44 words, four per round key. Word w{i} is ringed; later words are not
            computed yet.
          </caption>
          <thead>
            <tr>
              <th
                scope="col"
                className="text-fg-muted pr-3 text-left text-xs font-normal"
              >
                Round key
              </th>
              {[0, 1, 2, 3].map((c) => (
                <th
                  key={c}
                  scope="col"
                  className="text-fg-muted px-1 text-xs font-normal"
                >
                  column {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROUND_KEYS.map((r) => (
              <tr key={r}>
                <th
                  scope="row"
                  className="text-fg-muted pr-3 text-left text-xs font-normal"
                >
                  {r}
                </th>
                {[0, 1, 2, 3].map((c) => {
                  const w = 4 * r + c;
                  const known = w < event.words.length;
                  return (
                    <td key={c} className="p-0.5">
                      <span
                        data-current={w === i || undefined}
                        className={cn(
                          'flex flex-col items-center rounded border px-1.5 py-0.5',
                          w === i
                            ? 'ring-accent bg-highlight border-border ring-2'
                            : 'border-border bg-surface',
                          !known && 'text-fg-muted',
                        )}
                      >
                        <span className="text-fg-muted text-[0.65rem]">w{w}</span>
                        {known ? hex32(event.words[w]) : '········'}
                        {!known ? (
                          <span className="sr-only"> not computed yet</span>
                        ) : null}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
});
