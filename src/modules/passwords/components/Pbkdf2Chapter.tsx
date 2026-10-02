'use client';

import { useEffect } from 'react';

import type { ByteFormat } from '@/components/blocks';
import type { KdfEvent } from '@/core/kdf/events';
import type { SimResult } from '@/core/sim/result';

import type { Pbkdf2Request } from '../pbkdf2.worker';
import { usePbkdf2Worker } from '../usePbkdf2Worker';
import { Pbkdf2View } from './Pbkdf2View';

/**
 * The PBKDF2 chapter: its view, and the Web Worker that runs every iteration for real.
 * It comes with the page's deferred `runs` and is mounted only on this chapter, so the
 * worker code stays out of the route's first load. Leaving the chapter unmounts it,
 * which terminates any running worker.
 */
export function Pbkdf2Chapter({
  event,
  step,
  format,
  run,
  request,
}: {
  event: KdfEvent;
  step: number;
  format: ByteFormat;
  /** The run on screen: a new one forgets the last full computation. */
  run: SimResult<KdfEvent>;
  /** The full computation's inputs, read when the learner starts it. */
  request: () => Pbkdf2Request;
}) {
  const job = usePbkdf2Worker();
  const { reset } = job;
  useEffect(() => reset(), [run, reset]);
  const setup = run.events[0];
  const total = setup?.kind === 'kdf.pbkdfSetup' ? setup.iterations : 0;
  return (
    <Pbkdf2View
      event={event}
      step={step}
      total={total}
      format={format}
      job={job}
      onStart={() => job.start(request())}
    />
  );
}
