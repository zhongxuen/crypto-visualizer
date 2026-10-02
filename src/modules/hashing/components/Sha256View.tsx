'use client';

import { memo, type ReactNode } from 'react';

import { ByteGrid, formatByte, NumberTrace, type ByteFormat } from '@/components/blocks';
import { Flip, Pulse, Reveal } from '@/components/motion';
import { bytesToHex } from '@/core/bytes/hex';
import { WORKING_NAMES } from '@/core/sha256/constants';
import type {
  Sha256BlockEvent,
  Sha256DigestEvent,
  Sha256Event,
  Sha256RoundEvent,
  Sha256ScheduleEvent,
} from '@/core/sha256/events';
import { cn } from '@/lib/cn';

export const hex32 = (word: number) => word.toString(16).padStart(8, '0');

function Label({ children }: { children: ReactNode }) {
  return (
    <span className="text-fg-muted text-xs font-medium tracking-wide uppercase">
      {children}
    </span>
  );
}

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

/* ----------------------------------------------------------------------------------
 * A block read as sixteen 4-byte words.
 * -------------------------------------------------------------------------------- */

function BlockView({ event, format }: { event: Sha256BlockEvent; format: ByteFormat }) {
  return (
    <div className="flex flex-col gap-3">
      <Label>
        Block {event.block + 1} of {event.blocks}: every four bytes make one word, W0 to
        W15
      </Label>
      <ol
        aria-label="The block's sixteen words"
        className={cn(
          'grid gap-2',
          format === 'hex' ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-1 sm:grid-cols-2',
        )}
      >
        {event.words.map((word, t) => (
          <li key={t}>
            <Reveal trigger={event.id} index={t}>
              <span className="border-border bg-surface rounded-cell flex flex-col gap-0.5 border px-2 py-1">
                <span className="flex items-baseline justify-between gap-2">
                  <span className="text-fg-secondary font-mono text-xs">W{t}</span>
                  <span className="font-mono text-sm tabular-nums">{hex32(word)}</span>
                </span>
                <span className="text-fg-muted flex gap-1 font-mono text-[0.65rem] tabular-nums">
                  {event.bytes.slice(t * 4, t * 4 + 4).map((byte, i) => (
                    <span key={i}>{formatByte(byte, format)}</span>
                  ))}
                </span>
              </span>
            </Reveal>
          </li>
        ))}
      </ol>
    </div>
  );
}

/* ----------------------------------------------------------------------------------
 * The schedule: four earlier words converge into the new one, which drops into the
 * 64-word column.
 * -------------------------------------------------------------------------------- */

const OFFSETS = [2, 7, 15, 16] as const;

const WORD_CELL = {
  done: 'border-border bg-surface border',
  input: 'border-accent bg-highlight border-2',
  new: 'border-diff-on pattern-changed border-2',
  future: 'border-border text-fg-muted border border-dashed',
};

function ScheduleView({ event }: { event: Sha256ScheduleEvent }) {
  const { t } = event;
  const role = new Map<number, string>(
    OFFSETS.map((offset) => [t - offset, `t−${offset}`]),
  );
  const parts: { name: string; raw: number; mixed?: [string, number] }[] = [
    { name: `W${t - 2}`, raw: event.inputs[0], mixed: ['σ1', event.s1] },
    { name: `W${t - 7}`, raw: event.inputs[1] },
    { name: `W${t - 15}`, raw: event.inputs[2], mixed: ['σ0', event.s0] },
    { name: `W${t - 16}`, raw: event.inputs[3] },
  ];

  return (
    <div className="flex flex-col gap-4">
      <Label>Message schedule: W{t} from four earlier words</Label>
      <div className="flex flex-col items-center">
        <ul
          aria-label={`The four words W${t} is made from`}
          className="grid w-full max-w-xl grid-cols-2 gap-2 sm:grid-cols-4"
        >
          {parts.map((part, i) => (
            <li key={i}>
              <Reveal trigger={event.id} index={i}>
                <span className="border-accent bg-highlight rounded-cell flex flex-col items-center border-2 px-1 py-1 font-mono text-xs tabular-nums">
                  <span className="text-fg-secondary">{part.name}</span>
                  <span>{hex32(part.raw)}</span>
                  <span className="text-fg-secondary">
                    {part.mixed ? `${part.mixed[0]} → ${hex32(part.mixed[1])}` : 'as is'}
                  </span>
                </span>
              </Reveal>
            </li>
          ))}
        </ul>
        <svg
          aria-hidden="true"
          viewBox="0 0 400 40"
          preserveAspectRatio="none"
          className="text-fg-muted hidden h-8 w-full max-w-xl sm:block"
        >
          {[50, 150, 250, 350].map((x) => (
            <line
              key={x}
              x1={x}
              y1={2}
              x2={200}
              y2={38}
              stroke="currentColor"
              strokeWidth={1.5}
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>
        <span aria-hidden="true" className="text-fg-muted py-1 text-sm sm:hidden">
          ↓ add all four ↓
        </span>
        <Reveal trigger={event.id} index={4}>
          <Pulse trigger={event.id}>
            <span className="border-diff-on pattern-changed rounded-cell inline-flex items-baseline gap-2 border-2 px-3 py-1 font-mono text-sm tabular-nums">
              W{t} = {hex32(event.w)}
              <span className="text-fg-muted text-xs">(mod 2³²)</span>
            </span>
          </Pulse>
        </Reveal>
      </div>
      <ol
        aria-label="The 64-word schedule"
        className="grid grid-cols-4 gap-1 sm:grid-cols-8"
      >
        {Array.from({ length: 64 }, (_, i) => {
          const state =
            i === t ? 'new' : role.has(i) ? 'input' : i < t ? 'done' : 'future';
          return (
            <li
              key={i}
              data-word={state}
              className={cn(
                'rounded-cell flex flex-col px-1 py-0.5 font-mono text-[0.65rem] leading-tight tabular-nums',
                WORD_CELL[state],
              )}
            >
              <span className="flex justify-between gap-1">
                <span className={state === 'future' ? undefined : 'text-fg-muted'}>
                  W{i}
                </span>
                {role.has(i) ? (
                  <span className="font-semibold">{role.get(i)}</span>
                ) : null}
              </span>
              {i <= t ? (
                hex32(event.W[i])
              ) : (
                <span>
                  <span aria-hidden="true">········</span>
                  <span className="sr-only">not yet</span>
                </span>
              )}
              {state === 'new' ? <span className="sr-only"> (new)</span> : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/* ----------------------------------------------------------------------------------
 * One round: a–h, where each value glides one place to the right (<Flip>) and only a
 * and e are new.
 * -------------------------------------------------------------------------------- */

/**
 * A stable key for the value in slot `i` after round `t`: the round that made it, and
 * whether it entered as an a or an e. After round t, b holds the a made in round t − 1,
 * c the a made in t − 2, and so on, so the key follows the value as it moves along.
 */
export function valueKey(block: number, t: number, i: number): string {
  return `${block}:${t - (i % 4)}:${i < 4 ? 'a' : 'e'}`;
}

const SOURCE = ['T1 + T2', '← a', '← b', '← c', 'd + T1', '← e', '← f', '← g'];

function Registers({ event }: { event: Sha256RoundEvent }) {
  const trigger = `${event.block}:${event.t}`;
  return (
    <div className="flex flex-col gap-2">
      <Flip trigger={trigger} className="grid grid-cols-4 gap-1.5 sm:grid-cols-8">
        {event.after.map((word, i) => {
          const fresh = i === 0 || i === 4;
          return (
            <div key={i} className="flex flex-col items-center gap-0.5">
              <span className="text-fg-secondary font-mono text-xs">
                {WORKING_NAMES[i]}
              </span>
              <span
                data-flip-key={valueKey(event.block, event.t, i)}
                data-new={fresh || undefined}
                className={cn(
                  'rounded-cell w-full px-1 py-1 text-center font-mono text-xs tabular-nums',
                  fresh
                    ? 'border-diff-on pattern-changed border-2'
                    : 'border-border bg-surface border',
                )}
              >
                {fresh ? <Reveal trigger={trigger}>{hex32(word)}</Reveal> : hex32(word)}
                {fresh ? <span className="sr-only"> (new)</span> : null}
              </span>
              <span className="text-fg-muted font-mono text-[0.65rem]">{SOURCE[i]}</span>
            </div>
          );
        })}
      </Flip>
      <p className="text-fg-muted text-xs">
        Only a and e are new each round (outlined and hatched). Every other letter takes
        the value of the one before it, so the values move one place to the right, and the
        old h drops off the end.
      </p>
    </div>
  );
}

function RoundView({ event }: { event: Sha256RoundEvent }) {
  return (
    <div className="flex flex-col gap-4">
      <Label>
        Block {event.block + 1}, round {event.t + 1} of 64
      </Label>
      <Registers event={event} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium">
            T1 = h + Σ1(e) + Ch(e,f,g) + Kt + Wt
          </span>
          <Equation
            terms={[
              ['h', hex32(event.before[7])],
              ['Σ1(e)', hex32(event.S1)],
              ['Ch(e,f,g)', hex32(event.ch)],
              [`K${event.t}`, hex32(event.K)],
              [`W${event.t}`, hex32(event.W)],
              ['T1', hex32(event.T1)],
            ]}
          />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium">T2 = Σ0(a) + Maj(a,b,c)</span>
          <Equation
            terms={[
              ['Σ0(a)', hex32(event.S0)],
              ['Maj(a,b,c)', hex32(event.maj)],
              ['T2', hex32(event.T2)],
            ]}
          />
          <span className="mt-2 text-sm font-medium">Then</span>
          <Equation
            terms={[
              ['new a = T1 + T2', hex32(event.after[0])],
              ['new e = d + T1', hex32(event.after[4])],
            ]}
          />
        </div>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------------------------
 * The digest: H0–H7 slide in side by side, and read together they are the digest.
 * -------------------------------------------------------------------------------- */

function DigestView({ event, format }: { event: Sha256DigestEvent; format: ByteFormat }) {
  return (
    <div className="flex flex-col gap-3">
      <Label>SHA-256 digest: H0 to H7, side by side</Label>
      <ol aria-label="H0 to H7" className="grid grid-cols-4 gap-1 sm:grid-cols-8">
        {event.H.map((h, i) => (
          <li key={i}>
            <Reveal trigger={event.id} index={i}>
              <span className="border-border bg-surface rounded-cell flex flex-col items-center border px-1 py-0.5 font-mono text-xs tabular-nums">
                <span className="text-fg-muted">H{i}</span>
                {hex32(h)}
              </span>
            </Reveal>
          </li>
        ))}
      </ol>
      <Reveal trigger={event.id} index={9}>
        <span
          data-testid="sha256-digest"
          className="border-accent bg-surface block rounded-md border-2 px-3 py-2 font-mono text-sm break-all"
        >
          {bytesToHex(Uint8Array.from(event.digest))}
        </span>
      </Reveal>
      <ByteGrid label="Digest" bytes={event.digest} format={format} />
    </div>
  );
}

export const Sha256View = memo(function Sha256View({
  event,
  format,
}: {
  event: Sha256Event;
  format: ByteFormat;
}) {
  switch (event.kind) {
    case 'sha256.pad':
      return null;
    case 'sha256.block':
      return <BlockView event={event} format={format} />;
    case 'sha256.schedule':
      return <ScheduleView event={event} />;
    case 'sha256.round':
      return <RoundView event={event} />;
    case 'sha256.add':
      return (
        <NumberTrace
          caption="Adding the working variables into the hash value"
          columns={[
            { key: 'i', label: 'i' },
            { key: 'prev', label: 'H before', numeric: false },
            { key: 'plus', label: '+ working', numeric: false },
            { key: 'next', label: '= H after', numeric: false },
          ]}
          rows={event.H.map((h, i) => ({
            i,
            prev: hex32(event.previous[i]),
            plus: `${WORKING_NAMES[i]} = ${hex32(event.working[i])}`,
            next: hex32(h),
          }))}
          currentRow={7}
        />
      );
    case 'sha256.digest':
      return <DigestView event={event} format={format} />;
    case 'sha256.avalanche':
      return null;
  }
});
