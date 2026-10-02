'use client';

import { memo, type CSSProperties, type ReactNode } from 'react';

import type { AesKeyWordEvent } from '@/core/aes/events';
import { cn } from '@/lib/cn';

import styles from './aes.module.css';
import { useStepPlay } from './motion';
import { hex2, hex32, Label } from './parts';
import { RotatedRow } from './Rotate';

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

/** Byte k (0 = most significant) of a 32-bit word, as the standard prints it. */
const byteOf = (word: number, k: number) => (word >>> (24 - 8 * k)) & 0xff;

function ByteCell({
  value,
  className,
  style,
}: {
  value: number;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <span
      style={style}
      className={cn(
        'border-border bg-surface inline-block min-w-8 rounded border px-1 py-0.5 text-center',
        className,
      )}
    >
      {hex2(value)}
    </span>
  );
}

function WordRow({ name, children }: { name: string; children: ReactNode }) {
  return (
    <li className="contents">
      <span className="text-fg-secondary self-center">{name}</span>
      <span className="flex gap-1">{children}</span>
    </li>
  );
}

/**
 * The first word of a round key, byte by byte (UIUX §7.2): RotWord slides the bytes one
 * place left with `<Flip>`, SubWord's bytes flip in, Rcon pulses, and the new word lights.
 * Every value is the one core traced (`rot`, `sub`, `rcon`, `afterRcon`).
 */
function TwistRows({ event }: { event: AesKeyWordEvent }) {
  const { play } = useStepPlay();
  const { i } = event;
  const rot = event.rot!;
  const word = (value: number, cls?: string, after = 0) =>
    [0, 1, 2, 3].map((k) => (
      <ByteCell
        key={k}
        value={byteOf(value, k)}
        className={play ? cls : undefined}
        style={
          play ? ({ '--i': k, '--after': `${after}ms` } as CSSProperties) : undefined
        }
      />
    ));
  return (
    <ol
      aria-label={`Working for w${i}, byte by byte`}
      className="grid w-fit grid-cols-[auto_auto] gap-x-4 gap-y-1 font-mono text-sm tabular-nums"
    >
      <WordRow name={`temp = w${i - 1}`}>{word(event.temp)}</WordRow>
      <WordRow name="RotWord(temp)">
        <RotatedRow
          length={4}
          shift={1}
          cell={(from) => <ByteCell value={byteOf(rot, (from + 3) % 4)} />}
        />
      </WordRow>
      <WordRow name="SubWord(…)">{word(event.sub!, styles.flipOne, 200)}</WordRow>
      <WordRow name={`⊕ Rcon[${i / 4}]`}>
        {word(event.rcon!, styles.glowOne, 280)}
      </WordRow>
      <WordRow name="= temp′">{word(event.afterRcon!)}</WordRow>
      <WordRow name={`⊕ w${i - 4}`}>{word(event.back)}</WordRow>
      <WordRow name={`= w${i}`}>{word(event.word, styles.glowOne, 340)}</WordRow>
    </ol>
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
  const { play, fade } = useStepPlay();
  const terms: [string, string][] =
    i < 4
      ? [[`w${i} = key bytes ${4 * i}–${4 * i + 3}`, hex32(event.word)]]
      : [
          [`w${i - 4}`, hex32(event.back)],
          [`⊕ w${i - 1}`, hex32(event.temp)],
          [`= w${i}`, hex32(event.word)],
        ];

  return (
    <div className={cn('flex flex-col gap-4', fade && 'motion-fade')}>
      <div key={i} className="flex flex-col gap-1">
        <Label>Word w{i}</Label>
        {event.rot !== undefined ? (
          <TwistRows event={event} />
        ) : (
          <Equation terms={terms} />
        )}
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
                        key={w === i ? 'current' : 'still'}
                        data-current={w === i || undefined}
                        className={cn(
                          'flex flex-col items-center rounded border px-1.5 py-0.5',
                          w === i && play && styles.flipOne,
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
