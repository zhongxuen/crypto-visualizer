'use client';

import { memo } from 'react';

import { ByteGrid, type ByteFormat } from '@/components/blocks';
import { BUTTON } from '@/components/timeline';
import { bytesToHex } from '@/core/bytes/hex';
import type { KdfEvent } from '@/core/kdf/events';
import { groupDigits } from '@/core/kdf/pbkdf2';

import type { Pbkdf2Job } from '../usePbkdf2Worker';

function Grid({
  label,
  bytes,
  format,
}: {
  label: string;
  bytes: number[];
  format: ByteFormat;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-fg-muted text-xs font-medium tracking-wide uppercase">
        {label}
      </span>
      <ByteGrid
        label={label}
        bytes={bytes}
        format={format}
        columns={format === 'hex' ? 16 : 8}
      />
    </div>
  );
}

/** The rest of the iterations, run for real in a Worker, with progress and cancel. */
export function WorkerProgress({
  job,
  onStart,
}: {
  job: Pbkdf2Job;
  onStart: () => void;
}) {
  const percent = job.total > 0 ? Math.round((job.done / job.total) * 100) : 0;
  return (
    <div className="border-border bg-surface flex flex-col gap-2 rounded-md border p-3">
      <div className="flex flex-wrap items-center gap-2">
        {job.status === 'running' ? (
          <button type="button" className={BUTTON} onClick={job.cancel}>
            Cancel
          </button>
        ) : (
          <button type="button" className={BUTTON} onClick={onStart}>
            {job.status === 'idle' ? 'Run every iteration for real' : 'Run again'}
          </button>
        )}
        <span className="text-sm" aria-live="polite">
          {job.status === 'running' &&
            `Computing: ${groupDigits(job.done)} of ${groupDigits(job.total)} iterations`}
          {job.status === 'done' &&
            `Done: ${groupDigits(job.total)} iterations in ${((job.ms ?? 0) / 1000).toFixed(1)} s, in a background thread.`}
          {job.status === 'cancelled' && 'Cancelled.'}
          {job.status === 'error' && `Failed: ${job.error}`}
          {job.status === 'unsupported' && 'This browser can’t run a background Worker.'}
        </span>
      </div>
      <progress
        max={100}
        value={percent}
        aria-label="PBKDF2 progress"
        className="accent-accent h-2 w-full"
      />
      {job.dk ? (
        <p className="font-mono text-sm break-all">
          <span className="text-fg-muted">Derived key: </span>
          {bytesToHex(Uint8Array.from(job.dk))}
        </p>
      ) : null}
    </div>
  );
}

export const Pbkdf2View = memo(function Pbkdf2View({
  event,
  format,
  job,
  onStart,
}: {
  event: KdfEvent;
  format: ByteFormat;
  job: Pbkdf2Job;
  onStart: () => void;
}) {
  switch (event.kind) {
    case 'kdf.pbkdfSetup':
      return (
        <div className="flex flex-col gap-3">
          <Grid label="Salt" bytes={event.salt} format={format} />
          <dl className="grid w-fit grid-cols-[auto_auto] gap-x-4 text-sm">
            <dt className="text-fg-muted">Iterations (c)</dt>
            <dd className="font-mono">{groupDigits(event.iterations)}</dd>
            <dt className="text-fg-muted">Key length</dt>
            <dd className="font-mono">{event.dkLen} bytes</dd>
            <dt className="text-fg-muted">Blocks (l)</dt>
            <dd className="font-mono">{event.blocks}</dd>
            <dt className="text-fg-muted">HMACs per guess</dt>
            <dd className="font-mono">{groupDigits(event.iterations * event.blocks)}</dd>
          </dl>
        </div>
      );
    case 'kdf.pbkdfU':
      return (
        <div className="flex flex-col gap-3">
          <Grid
            label={
              event.iteration === 1
                ? 'HMAC input: salt ‖ INT(1)'
                : `HMAC input: U${event.iteration - 1}`
            }
            bytes={event.input}
            format={format}
          />
          <Grid label={`U${event.iteration}`} bytes={event.u} format={format} />
          <Grid
            label={`T = U1 ⊕ … ⊕ U${event.iteration}`}
            bytes={event.t}
            format={format}
          />
        </div>
      );
    case 'kdf.pbkdfRest':
      return (
        <div className="flex flex-col gap-3">
          <p className="text-sm">
            {groupDigits(event.to - event.from + 1)} more iterations, each one HMAC like
            the last. The server pays this once per login. An attacker pays it for every
            guess.
          </p>
          {event.pending ? (
            <WorkerProgress job={job} onStart={onStart} />
          ) : event.t ? (
            <Grid
              label={`T after ${groupDigits(event.to)} iterations`}
              bytes={event.t}
              format={format}
            />
          ) : null}
        </div>
      );
    case 'kdf.pbkdfBlock':
      return <Grid label={`T${event.block}`} bytes={event.t} format={format} />;
    case 'kdf.pbkdfKey':
      return <Grid label="Derived key" bytes={event.dk} format={format} />;
    default:
      return null;
  }
});
