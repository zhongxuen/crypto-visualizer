'use client';

import { memo } from 'react';

import { ByteGrid, NumberTrace, type ByteFormat } from '@/components/blocks';
import { bytesToHex } from '@/core/bytes/hex';
import { WORKING_NAMES } from '@/core/sha256/constants';
import type { Sha256Event } from '@/core/sha256/events';
import { cn } from '@/lib/cn';

export const hex32 = (word: number) => word.toString(16).padStart(8, '0');

function Label({ children }: { children: React.ReactNode }) {
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

/** The eight working variables as boxes, before and after one round. */
function Registers({ before, after }: { before: number[]; after: number[] }) {
  return (
    <div className="flex flex-col gap-2">
      {[
        ['before', before],
        ['after', after],
      ].map(([name, words]) => (
        <div key={name as string} className="flex flex-wrap items-center gap-1.5">
          <span className="text-fg-muted w-12 text-xs">{name as string}</span>
          {(words as number[]).map((word, i) => {
            const changed = name === 'after' && (i === 0 || i === 4);
            return (
              <span
                key={i}
                className={cn(
                  'flex flex-col items-center rounded border px-1.5 py-0.5 font-mono text-xs',
                  changed
                    ? 'border-diff-on pattern-changed border-2'
                    : 'border-border bg-surface',
                )}
              >
                <span className="text-fg-muted">{WORKING_NAMES[i]}</span>
                {hex32(word)}
                {changed ? <span className="sr-only"> (new)</span> : null}
              </span>
            );
          })}
        </div>
      ))}
      <p className="text-fg-muted text-xs">
        Only a and e are new each round (outlined and hatched); every other letter takes
        the value of the one before it.
      </p>
    </div>
  );
}

function padCaption(message: number[], padded: number[]) {
  return (index: number) => {
    if (index < message.length) {
      const byte = message[index];
      return byte >= 0x20 && byte < 0x7f ? String.fromCharCode(byte) : 'msg';
    }
    if (index === message.length) return '1 bit';
    if (index >= padded.length - 8) return 'len';
    return undefined;
  };
}

export const Sha256View = memo(function Sha256View({
  event,
  format,
}: {
  event: Sha256Event;
  format: ByteFormat;
}) {
  switch (event.kind) {
    case 'sha256.pad': {
      const lengthStart = event.padded.length - 8;
      return (
        <div className="flex flex-col gap-2">
          <Label>Padded message, {event.padded.length} bytes</Label>
          <ByteGrid
            label="Padded message"
            bytes={event.padded}
            format={format}
            columns={format === 'hex' ? 16 : 8}
            highlight={[
              event.message.length,
              ...Array.from({ length: 8 }, (_, i) => lengthStart + i),
            ]}
            caption={padCaption(event.message, event.padded)}
          />
          <p className="text-fg-muted text-sm">
            Highlighted: the <code>0x80</code> byte that starts the padding, and the last
            eight bytes, which hold the message length in bits ({event.bitLength}).
            Between them, {event.zeros} zero bytes.
          </p>
        </div>
      );
    }

    case 'sha256.block':
      return (
        <div className="flex flex-col gap-3">
          <Label>
            Block {event.block + 1} of {event.blocks}
          </Label>
          <ByteGrid
            label={`Block ${event.block + 1}`}
            bytes={event.bytes}
            format={format}
            columns={format === 'hex' ? 16 : 8}
          />
          <NumberTrace
            caption="W0 to W15"
            columns={[
              { key: 't', label: 't' },
              { key: 'w', label: 'Wt', numeric: false },
            ]}
            rows={event.words.map((w, t) => ({ t, w: hex32(w) }))}
            currentRow={15}
            maxHeight="14rem"
          />
        </div>
      );

    case 'sha256.schedule':
      return (
        <div className="flex flex-col gap-3">
          <Label>Message schedule, W{event.t}</Label>
          <Equation
            terms={[
              [`σ1(W${event.t - 2})`, hex32(event.s1)],
              [`W${event.t - 7}`, hex32(event.inputs[1])],
              [`σ0(W${event.t - 15})`, hex32(event.s0)],
              [`W${event.t - 16}`, hex32(event.inputs[3])],
              [`= W${event.t} (mod 2³²)`, hex32(event.w)],
            ]}
          />
          <NumberTrace
            caption="The schedule so far"
            columns={[
              { key: 't', label: 't' },
              { key: 'w', label: 'Wt', numeric: false },
            ]}
            rows={event.W.map((w, t) => ({ t, w: hex32(w) }))}
            currentRow={event.t}
            maxHeight="16rem"
          />
        </div>
      );

    case 'sha256.round':
      return (
        <div className="flex flex-col gap-4">
          <Label>
            Block {event.block + 1}, round {event.t + 1} of 64
          </Label>
          <Registers before={event.before} after={event.after} />
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
      return (
        <div className="flex flex-col gap-3">
          <Label>SHA-256 digest</Label>
          <p className="border-accent bg-surface rounded-md border-2 px-3 py-2 font-mono text-sm break-all">
            {bytesToHex(Uint8Array.from(event.digest))}
          </p>
          <ByteGrid label="Digest" bytes={event.digest} format={format} />
        </div>
      );

    case 'sha256.avalanche':
      return null;
  }
});
