'use client';

import { memo, type ReactNode } from 'react';

import { ByteGrid, type ByteFormat } from '@/components/blocks';
import { Pulse, Reveal, useStepTransition } from '@/components/motion';
import { BUTTON } from '@/components/timeline';
import { bytesToHex } from '@/core/bytes/hex';
import type { KdfEvent } from '@/core/kdf/events';
import { groupDigits } from '@/core/kdf/pbkdf2';

import type { Pbkdf2Job } from '../usePbkdf2Worker';
import { Odometer } from './Odometer';

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

/** The iteration counter, with what it counts towards. */
function Counter({
  value,
  total,
  smooth,
  children,
}: {
  value: number;
  total: number;
  smooth: boolean;
  children?: ReactNode;
}) {
  return (
    <div className="border-border bg-surface flex flex-col gap-1 rounded-md border p-3">
      <span className="text-fg-muted text-xs font-medium tracking-wide uppercase">
        Iterations
      </span>
      <p className="flex flex-wrap items-baseline gap-x-2">
        <Odometer
          value={value}
          max={total}
          smooth={smooth}
          label={`iterations of ${groupDigits(total)}`}
          className="text-3xl"
        />
        <span aria-hidden="true" className="text-fg-muted font-mono">
          / {groupDigits(total)}
        </span>
      </p>
      {children}
    </div>
  );
}

/** T = U1 ⊕ U2 ⊕ … ⊕ Uj, its newest term arriving on each step. */
function Fold({ upTo, step }: { upTo: number; step: number }) {
  return (
    <p className="font-mono text-sm" aria-label={`T = U1 XOR … XOR U${upTo}`}>
      T ={' '}
      {Array.from({ length: upTo }, (_, i) => (
        <span key={i}>
          {i > 0 ? ' ⊕ ' : ''}
          {i === upTo - 1 ? (
            <Reveal
              trigger={step}
              className="bg-highlight inline-block! rounded-sm px-0.5"
            >
              U{i + 1}
            </Reveal>
          ) : (
            `U${i + 1}`
          )}
        </span>
      ))}
    </p>
  );
}

/** Milliseconds as "850 ms" or "1.2 s". */
const duration = (ms: number) =>
  ms < 1000 ? `${Math.round(ms)} ms` : `${(ms / 1000).toFixed(1)} s`;

/**
 * The rest of the iterations, run for real in a Worker: the odometer follows its
 * progress (at most 10 updates a second), with this device's measured time per guess.
 */
export function WorkerProgress({
  job,
  from,
  total,
  onStart,
}: {
  job: Pbkdf2Job;
  /** Iterations already stepped through. */
  from: number;
  total: number;
  onStart: () => void;
}) {
  const percent = job.total > 0 ? Math.round((job.done / job.total) * 100) : 0;
  const count = job.status === 'idle' || job.total === 0 ? from : job.done;
  const perGuess =
    job.status === 'done'
      ? job.ms
      : job.status === 'running' && job.done > 0
        ? (job.elapsed / job.done) * job.total
        : null;
  return (
    <Counter value={count} total={total} smooth>
      <p className="text-fg-secondary min-h-5 text-sm" data-per-guess="">
        {perGuess === null
          ? 'One guess is all of these iterations.'
          : job.status === 'done'
            ? `One guess took ${duration(perGuess)} on this device. An attacker pays that for every password they try.`
            : `About ${duration(perGuess)} per guess on this device, measured so far.`}
      </p>
      <div className="mt-1 flex flex-wrap items-center gap-2">
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
            'Computing every iteration in a background thread…'}
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
    </Counter>
  );
}

export const Pbkdf2View = memo(function Pbkdf2View({
  event,
  step,
  total,
  format,
  job,
  onStart,
}: {
  event: KdfEvent;
  step: number;
  /** The run's iteration count (c). */
  total: number;
  format: ByteFormat;
  job: Pbkdf2Job;
  onStart: () => void;
}) {
  const { animate } = useStepTransition();
  switch (event.kind) {
    case 'kdf.pbkdfSetup':
      return (
        <div className="flex flex-col gap-3">
          <Counter value={0} total={event.iterations} smooth={animate} />
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
          <Counter value={event.iteration} total={total} smooth={animate} />
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
          <Fold upTo={event.iteration} step={step} />
          <Pulse trigger={step} className="p-0.5">
            <Grid
              label={`T = U1 ⊕ … ⊕ U${event.iteration}`}
              bytes={event.t}
              format={format}
            />
          </Pulse>
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
            <WorkerProgress
              job={job}
              from={event.from - 1}
              total={event.to}
              onStart={onStart}
            />
          ) : event.t ? (
            <>
              <Counter value={event.to} total={event.to} smooth={animate} />
              <Grid
                label={`T after ${groupDigits(event.to)} iterations`}
                bytes={event.t}
                format={format}
              />
            </>
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
