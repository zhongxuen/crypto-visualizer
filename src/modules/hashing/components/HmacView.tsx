'use client';

import { memo, useMemo, useState } from 'react';

import { ByteGrid, type ByteFormat } from '@/components/blocks';
import { BUTTON } from '@/components/timeline';
import { bytesToHex } from '@/core/bytes/hex';
import type { HmacEvent, HmacHashEvent } from '@/core/hmac/events';
import { sha256Run } from '@/core/sha256/run';
import { MAX_STEPPED_BYTES } from '@/core/sha256/sha256';

const hex = (bytes: readonly number[]) => bytesToHex(Uint8Array.from(bytes));

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-fg-muted text-xs font-medium tracking-wide uppercase">
      {children}
    </span>
  );
}

function Grid({
  label,
  bytes,
  format,
  highlight,
}: {
  label: string;
  bytes: readonly number[];
  format: ByteFormat;
  highlight?: number[];
}) {
  return (
    <div className="flex flex-col gap-1">
      <Label>{label}</Label>
      <ByteGrid
        label={label}
        bytes={bytes}
        format={format}
        columns={format === 'hex' ? 16 : 8}
        highlight={highlight}
      />
    </div>
  );
}

/**
 * The collapsed SHA-256, expanded on request: the hash value after each block, from the
 * same stepped core run the SHA-256 chapter shows.
 */
function ExpandHash({ event }: { event: HmacHashEvent }) {
  const [open, setOpen] = useState(false);
  const fits = event.input.length <= MAX_STEPPED_BYTES;
  const adds = useMemo(
    () =>
      open && fits
        ? sha256Run(Uint8Array.from(event.input)).events.flatMap((e) =>
            e.kind === 'sha256.add' ? [e] : [],
          )
        : [],
    [open, fits, event.input],
  );

  if (!fits) {
    return (
      <p className="text-fg-muted text-sm">
        This input is {event.input.length} bytes, more than the three blocks the SHA-256
        chapter steps through, so it stays collapsed.
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        className={`${BUTTON} self-start`}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? 'Collapse this SHA-256' : 'Expand this SHA-256'}
      </button>
      {open ? (
        <ol className="flex flex-col gap-1 font-mono text-xs">
          {adds.map((add) => (
            <li key={add.id}>
              After block {add.block + 1} (64 rounds):{' '}
              {add.H.map((w) => w.toString(16).padStart(8, '0')).join(' ')}
            </li>
          ))}
        </ol>
      ) : null}
    </div>
  );
}

export const HmacView = memo(function HmacView({
  event,
  format,
}: {
  event: HmacEvent;
  format: ByteFormat;
}) {
  switch (event.kind) {
    case 'hmac.naive': {
      const joined = [...event.key, ...event.message, ...event.glue];
      const glueStart = event.key.length + event.message.length;
      return (
        <div className="flex flex-col gap-3">
          <Grid
            label="key ‖ message ‖ SHA-256’s padding (highlighted)"
            bytes={joined}
            format={format}
            highlight={Array.from({ length: event.glue.length }, (_, i) => glueStart + i)}
          />
          <p className="font-mono text-sm break-all">
            <span className="text-fg-muted">SHA-256(key ‖ message) = </span>
            {hex(event.naiveTag)}
          </p>
          <p className="text-fg-muted text-sm">
            An attacker starts from this tag as SHA-256’s state and hashes more data. The
            forged message is key ‖ message ‖ the highlighted padding ‖ their data, and
            its tag is valid. They never needed the key.
          </p>
        </div>
      );
    }
    case 'hmac.key':
      return (
        <Grid
          label={
            event.hashed ? 'K0: SHA-256(key), then zeros' : 'K0: the key, then zeros'
          }
          bytes={event.k0}
          format={format}
          highlight={Array.from(
            { length: event.hashed ? 32 : event.key.length },
            (_, i) => i,
          )}
        />
      );
    case 'hmac.pad':
      return (
        <Grid
          label={`K0 ⊕ ${event.which} (0x${event.pad.toString(16)} repeated)`}
          bytes={event.padded}
          format={format}
        />
      );
    case 'hmac.hash':
      return (
        <div className="flex flex-col gap-3">
          <p className="text-sm">
            {event.which === 'inner' ? 'Inner' : 'Outer'} hash of {event.input.length}{' '}
            bytes:
          </p>
          <p className="border-accent rounded-md border-2 px-3 py-2 font-mono text-sm break-all">
            {hex(event.digest)}
          </p>
          <ExpandHash event={event} />
        </div>
      );
    case 'hmac.tag':
      return (
        <dl className="grid gap-2 font-mono text-sm">
          <div>
            <dt className="text-fg-muted">HMAC-SHA-256</dt>
            <dd className="border-ok rounded-md border-2 px-3 py-2 break-all">
              {hex(event.tag)}
            </dd>
          </div>
          <div>
            <dt className="text-fg-muted">SHA-256(key ‖ message), for comparison</dt>
            <dd className="break-all">{hex(event.naiveTag)}</dd>
          </div>
        </dl>
      );
  }
});
